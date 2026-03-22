import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { isStrongPassword } from '@/lib/validate';

export async function POST(req: Request) {
  // ── Rate limit: 10 registration attempts per IP per 15 minutes ───────────
  const ip = getClientIp(req);
  if (!checkRateLimit(`register:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 },
    );
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { username, password } = body as { username?: unknown; password?: unknown };

    if (typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const trimmedUsername = username.trim();

    // ── Username rules ────────────────────────────────────────────────────
    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      return NextResponse.json(
        { error: 'Username must be between 3 and 30 characters' },
        { status: 400 },
      );
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(trimmedUsername)) {
      return NextResponse.json(
        { error: 'Username may only contain letters, numbers, _, . or -' },
        { status: 400 },
      );
    }

    // ── Password strength ─────────────────────────────────────────────────
    const pwCheck = isStrongPassword(password);
    if (!pwCheck.ok) {
      return NextResponse.json({ error: pwCheck.message }, { status: 400 });
    }

    // ── Check uniqueness — use generic message to prevent enumeration ─────
    const existing = await prisma.user.findUnique({ where: { username: trimmedUsername } });
    if (existing) {
      // Generic message — don't reveal whether username exists
      return NextResponse.json(
        { error: 'Could not create account. Please try a different username.' },
        { status: 409 },
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { username: trimmedUsername, password: hashed },
    });

    return NextResponse.json({ id: user.id, username: user.username }, { status: 201 });
  } catch (err) {
    console.error('[register]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
