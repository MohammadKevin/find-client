const LS_KEY = 'leads_chatted_phones';

export function normalizePhone(phone?: string | null): string {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 5) return '';
  let n = digits;
  if (n.startsWith('0')) n = '62' + n.slice(1);
  else if (n.startsWith('8')) n = '62' + n;
  else if (n.startsWith('620')) n = '62' + n.slice(3);
  return n;
}

export function toLocal08(phone: string): string {
  const n = normalizePhone(phone);
  if (n.startsWith('62')) return '0' + n.slice(2);
  return n;
}

function readLocalCache(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return new Set<string>(JSON.parse(raw));
  } catch {}
  return new Set();
}

function writeLocalCache(phones: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(Array.from(phones)));
  } catch {}
}

function getApiUrl(): string {
  return (
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_LEADS_SHEET_API) || ''
  );
}

export async function fetchChattedPhones(): Promise<Set<string>> {
  const local = readLocalCache();
  const url = getApiUrl();
  if (!url) return local;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return local;
    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.chatted)) {
      const merged = new Set(local);
      for (const p of json.chatted) {
        const norm = normalizePhone(p);
        if (norm) merged.add(norm);
      }
      writeLocalCache(merged);
      return merged;
    }
  } catch {}
  return local;
}

export async function markPhoneChatted(rawPhone: string): Promise<boolean> {
  const norm = normalizePhone(rawPhone);
  if (!norm) return false;

  const local = readLocalCache();
  local.add(norm);
  writeLocalCache(local);

  const url = getApiUrl();
  if (!url) return true;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: rawPhone }),
    });
    if (res.ok) {
      const json = await res.json();
      return json.status === 'success';
    }
  } catch {}
  return true;
}

export function isPhoneChatted(phone: string, chattedSet: Set<string>): boolean {
  const norm = normalizePhone(phone);
  if (!norm) return false;
  return chattedSet.has(norm);
}

export function removePhoneFromChatted(rawPhone: string): void {
  const norm = normalizePhone(rawPhone);
  if (!norm) return;
  const local = readLocalCache();
  local.delete(norm);
  writeLocalCache(local);
}
