/** Escape special iCalendar text characters. */
export function escapeIcal(str: string): string {
  return str.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
}

export interface IcalItem {
  name: string;
  scaledAmount: number;
  unit: string;
}

/** Build an ICS VCALENDAR string with one VTODO per shopping item. */
export function buildICS(items: IcalItem[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const todos = items.map((item) => {
    const uid = Math.random().toString(36).slice(2, 10) + '@kitchenflow';
    const title = escapeIcal(`${item.name} — ${item.scaledAmount} ${item.unit}`);
    return ['BEGIN:VTODO', `UID:${uid}`, `DTSTAMP:${stamp}`, `SUMMARY:${title}`, 'END:VTODO'].join('\r\n');
  });
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KitchenFlow//Shopping List//EN',
    ...todos,
    'END:VCALENDAR',
  ].join('\r\n');
}

/** Build a plain-text shopping list for clipboard copy.
 *  One item per line, no bullet characters — paste directly into iOS Reminders
 *  (in list view, not inside an item) to create one reminder per line. */
export function buildPlainText(items: IcalItem[]): string {
  return items.map((i) => `${i.name} — ${i.scaledAmount} ${i.unit}`).join('\n');
}

/** Trigger a browser download of an ICS file. */
export function downloadICS(items: IcalItem[], filename = 'shopping-list.ics') {
  const content = buildICS(items);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
