import { NextRequest, NextResponse } from 'next/server';

// ── Tiny XML helpers (no external dependency) ─────────────────────────────────

/** Return the inner content of the first matching tag (namespaced or plain). */
function tagContent(xml: string, name: string): string | null {
  const re = new RegExp(`<(?:[a-zA-Z0-9_-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${name}>`, 'i');
  return xml.match(re)?.[1]?.trim() ?? null;
}

/** Return inner content of all matching tags. */
function allTagContents(xml: string, name: string): string[] {
  const re = new RegExp(`<(?:[a-zA-Z0-9_-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${name}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
  return out;
}

/** Extract first bare <href> value from an XML blob. */
function extractHref(xml: string): string | null {
  return tagContent(xml, 'href');
}

// ── CalDAV step helpers ───────────────────────────────────────────────────────

async function propfind(url: string, auth: string, depth: string, body: string): Promise<string> {
  const res = await fetch(url, {
    method: 'PROPFIND',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/xml; charset=utf-8',
      Depth: depth,
    },
    body,
    // Follow redirects
    redirect: 'follow',
  });
  if (res.status === 401) throw new Error('AUTH_FAILED');
  if (!res.ok && res.status !== 207) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.text();
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { username, password } = (await req.json()) as { username: string; password: string };
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }

    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    // ── Step 1: Discover the current-user-principal URL ────────────────────
    const xml1 = await propfind(
      'https://caldav.icloud.com/',
      auth,
      '0',
      `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop><d:current-user-principal/></d:prop>
</d:propfind>`,
    );

    // <current-user-principal><href>…</href></current-user-principal>
    const principalBlock = tagContent(xml1, 'current-user-principal');
    const principalUrl = principalBlock ? extractHref(principalBlock) : null;
    if (!principalUrl) {
      return NextResponse.json({ error: 'Could not discover principal URL. Check credentials.' }, { status: 502 });
    }

    // ── Step 2: Get calendar-home-set ──────────────────────────────────────
    const xml2 = await propfind(
      principalUrl,
      auth,
      '0',
      `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><c:calendar-home-set/></d:prop>
</d:propfind>`,
    );

    const homeBlock = tagContent(xml2, 'calendar-home-set');
    let homeUrl = homeBlock ? extractHref(homeBlock) : null;
    if (!homeUrl) {
      return NextResponse.json({ error: 'Could not find calendar home set.' }, { status: 502 });
    }
    // Ensure absolute URL
    if (!homeUrl.startsWith('http')) {
      const base = new URL(principalUrl);
      homeUrl = `${base.protocol}//${base.host}${homeUrl}`;
    }

    // ── Step 3: List calendars, keep only VTODO-capable ones ──────────────
    const xml3 = await propfind(
      homeUrl,
      auth,
      '1',
      `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:displayname/>
    <d:resourcetype/>
    <c:supported-calendar-component-set/>
  </d:prop>
</d:propfind>`,
    );

    const responses = allTagContents(xml3, 'response');
    const lists: { name: string; url: string }[] = [];

    for (const resp of responses) {
      if (!resp.includes('VTODO')) continue;
      const href = extractHref(resp);
      const name = tagContent(resp, 'displayname');
      if (!href || !name) continue;
      const url = href.startsWith('http') ? href : (() => {
        const base = new URL(homeUrl!);
        return `${base.protocol}//${base.host}${href}`;
      })();
      lists.push({ name, url });
    }

    return NextResponse.json({ lists });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'AUTH_FAILED') {
      return NextResponse.json({ error: 'Invalid Apple ID or app-specific password.' }, { status: 401 });
    }
    console.error('[reminders/lists]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
