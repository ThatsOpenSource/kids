const API_BASE = '/api';

export function getDeviceFingerprint(): string {
  const key = 'kids_device_fp';
  let fp = localStorage.getItem(key);
  if (!fp) {
    fp = crypto.randomUUID() + '-' + (navigator.userAgent.length % 997);
    localStorage.setItem(key, fp);
  }
  return fp;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('kids_access');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Device-Fingerprint': getDeviceFingerprint(),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });
  if (res.status === 401) {
    const refresh = localStorage.getItem('kids_refresh');
    if (refresh && !path.includes('/auth/login')) {
      const r = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Device-Fingerprint': getDeviceFingerprint() },
        body: JSON.stringify({ refreshToken: refresh, deviceFingerprint: getDeviceFingerprint() }),
      });
      if (r.ok) {
        const data = await r.json();
        localStorage.setItem('kids_access', data.accessToken);
        return request(path, options);
      }
    }
    localStorage.removeItem('kids_access');
    localStorage.removeItem('kids_refresh');
    if (!window.location.pathname.includes('/login')) window.location.href = '/login';
    throw new Error('Session abgelaufen');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || res.statusText) as Error & { code?: string };
    err.code = data.code;
    throw err;
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, deviceFingerprint: getDeviceFingerprint() }),
    }),
  loginTotp: (preAuthToken: string, totpCode: string) =>
    request<any>('/auth/login/totp', {
      method: 'POST',
      body: JSON.stringify({
        preAuthToken,
        totpCode,
        deviceFingerprint: getDeviceFingerprint(),
      }),
    }),
  loginSetup2fa: (setupToken: string, totpCode: string) =>
    request<any>('/auth/login/setup-2fa', {
      method: 'POST',
      body: JSON.stringify({
        setupToken,
        totpCode,
        deviceFingerprint: getDeviceFingerprint(),
      }),
    }),
  me: () => request<{ user: any; totpEnabled: boolean }>('/auth/me'),
  logout: (refreshToken?: string) =>
    request('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  setup2fa: () => request<{ qrDataUrl: string; secret: string }>('/auth/2fa/setup', { method: 'POST' }),
  confirm2fa: (totpCode: string) =>
    request('/auth/2fa/confirm', { method: 'POST', body: JSON.stringify({ totpCode }) }),
  disable2fa: (totpCode: string) =>
    request('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ totpCode }) }),

  importPreview: (filename: string, contentBase64: string) =>
    request<any>('/import/preview', {
      method: 'POST',
      body: JSON.stringify({ filename, contentBase64 }),
    }),
  importCommit: (persons: any[], generatePasswords = true) =>
    request<any>('/import/commit', {
      method: 'POST',
      body: JSON.stringify({ persons, generatePasswords }),
    }),
  listPersons: (opts?: { schulId?: string; q?: string; klasse?: string; rolle?: string; kontentyp?: string }) => {
    const params = new URLSearchParams();
    if (opts?.schulId) params.set('schulId', opts.schulId);
    if (opts?.q) params.set('q', opts.q);
    if (opts?.klasse) params.set('klasse', opts.klasse);
    if (opts?.rolle) params.set('rolle', opts.rolle);
    if (opts?.kontentyp) params.set('kontentyp', opts.kontentyp);
    return request<{ persons: any[]; total: number; facets: { klassen: string[]; schulIds: string[]; rollen: string[] } }>(`/persons?${params}`);
  },
  patchPerson: (lkid: string, body: Record<string, unknown>) =>
    request<{ person: any }>(`/persons/${encodeURIComponent(lkid)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  listSchools: () => request<{ schools: any[] }>('/schools'),
  updateSchoolConfig: (id: string, config: Record<string, unknown>) =>
    request(`/schools/${id}/config`, { method: 'PUT', body: JSON.stringify({ config }) }),
  createSchool: (school: Record<string, unknown>) =>
    request('/schools', { method: 'POST', body: JSON.stringify(school) }),
  updateSchool: (id: string, school: Record<string, unknown>) =>
    request(`/schools/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(school) }),
  amsExport: (schoolId?: string) =>
    request<any>('/ams/export', {
      method: 'POST',
      body: JSON.stringify({ schoolId, ensureAppleIdsFirst: true }),
    }),
  generateAppleIds: (schoolId?: string) =>
    request<{ generated: number }>('/ams/apple-ids', {
      method: 'POST',
      body: JSON.stringify({ schoolId }),
    }),
  generatePasswords: (body: Record<string, unknown>) =>
    request<{ count: number; passwords: any[] }>('/passwords/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  revealPasswords: (body: Record<string, unknown>) =>
    request<{ count: number; passwords: any[] }>('/passwords/reveal', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  exportCsv: (body: Record<string, unknown>) =>
    request<{ filename: string; count: number; csv: string }>('/export/csv', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: JSON.stringify(body),
    }),
};
