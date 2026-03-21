import { NextRequest, NextResponse } from 'next/server';

interface ItemToAdd {
  name: string;
  scaledAmount: number;
  unit: string;
}

/** Escape special iCalendar characters in a text value. */
function escapeIcal(str: string): string {
  return str.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
}

/** Minimal UUID v4 generator (no dependency). */
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Format a Date as iCal UTC timestamp: 20240101T120000Z */
function icalNow(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
}

export async function POST(req: NextRequest) {
  try {
    const { username, password, listUrl, items } = (await req.json()) as {
      username: string;
      password: string;
      listUrl: string;
      items: ItemToAdd[];
    };

    if (!username || !password || !listUrl || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    const stamp = icalNow();
    const base = listUrl.endsWith('/') ? listUrl : `${listUrl}/`;

    const results = await Promise.all(
      items.map(async (item) => {
        const id = uuid();
        const title = escapeIcal(
          `${item.name}${item.scaledAmount ? ` — ${item.scaledAmount} ${item.unit}` : ''}`,
        );
        const ics = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//KitchenFlow//EN',
          'BEGIN:VTODO',
          `UID:${id}@kitchenflow`,
          `DTSTAMP:${stamp}`,
          `SUMMARY:${title}`,
          'END:VTODO',
          'END:VCALENDAR',
        ].join('\r\n');

        const res = await fetch(`${base}${id}.ics`, {
          method: 'PUT',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'text/calendar; charset=utf-8',
            'If-None-Match': '*',
          },
          body: ics,
          redirect: 'follow',
        });

        return { name: item.name, ok: res.ok || res.status === 201, status: res.status };
      }),
    );

    const added = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).map((r) => `${r.name} (${r.status})`);

    return NextResponse.json({ added, failed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[reminders/add]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
