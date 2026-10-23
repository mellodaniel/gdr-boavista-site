export type SharedAccess = { key: string; scope: string };

export async function accessFromLink(): Promise<SharedAccess | null> {
  const key = new URLSearchParams(window.location.hash.slice(1)).get('acesso');
  if (!key || !/^[A-Za-z0-9_-]{43,128}$/.test(key)) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return { key, scope: 'shared-' + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('') };
}

export async function workspaceRequest<T>(access: SharedAccess, input: object): Promise<T> {
  const response = await fetch('/api/match-sheet-workspace', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Match-Sheet-Key': access.key },
    body: JSON.stringify(input), cache: 'no-store', referrerPolicy: 'no-referrer',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || 'Não foi possível concluir. Verifica a ligação.'), { code: data.code });
  return data;
}
