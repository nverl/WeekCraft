import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/account — change username or password
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { type } = body;

  // ── Change defaultPeople ─────────────────────────────────────────────────
  if (type === 'defaultPeople') {
    const { defaultPeople } = body;
    if (typeof defaultPeople !== 'number' || defaultPeople < 1 || defaultPeople > 12) {
      return NextResponse.json({ error: 'Must be between 1 and 12' }, { status: 400 });
    }
    await prisma.user.update({ where: { id: session.user.id }, data: { defaultPeople } });
    return NextResponse.json({ defaultPeople });
  }

  // ── Change username ───────────────────────────────────────────────────────
  if (type === 'username') {
    const { username } = body;
    if (!username || username.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists && exists.id !== session.user.id) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { username },
    });
    return NextResponse.json({ username: updated.username });
  }

  // ── Change password ───────────────────────────────────────────────────────
  if (type === 'password') {
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: session.user.id }, data: { password: hashed } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

// DELETE /api/account — delete account and all data
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.user.delete({ where: { id: session.user.id } });
  return NextResponse.json({ ok: true });
}
