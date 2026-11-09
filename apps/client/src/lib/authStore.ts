import { create } from 'zustand';
import { api } from './api';

interface User {
  id: string;
  email: string;
  role: string;
  displayName?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  totpEnabled: boolean;
  loginPassword: (email: string, password: string) => Promise<{
    requiresTotp?: boolean;
    preAuthToken?: string;
    requiresTotpSetup?: boolean;
    setupToken?: string;
    qrDataUrl?: string;
    secret?: string;
  }>;
  finishTotp: (preAuthToken: string, code: string) => Promise<void>;
  finishSetup: (setupToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  setTotpEnabled: (v: boolean) => void;
}

function storeSession(res: { accessToken: string; refreshToken: string; user: User }) {
  localStorage.setItem('kids_access', res.accessToken);
  localStorage.setItem('kids_refresh', res.refreshToken);
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  totpEnabled: false,

  loginPassword: async (email, password) => {
    const res = await api.login(email, password);
    // Never stores tokens here – only challenge data
    if (res.requiresTotp) {
      return { requiresTotp: true, preAuthToken: res.preAuthToken };
    }
    if (res.requiresTotpSetup) {
      return {
        requiresTotpSetup: true,
        setupToken: res.setupToken,
        qrDataUrl: res.qrDataUrl,
        secret: res.secret,
      };
    }
    throw new Error('Unerwartete Login-Antwort');
  },

  finishTotp: async (preAuthToken, code) => {
    const res = await api.loginTotp(preAuthToken, code);
    storeSession(res);
    set({ user: res.user, totpEnabled: true });
  },

  finishSetup: async (setupToken, code) => {
    const res = await api.loginSetup2fa(setupToken, code);
    storeSession(res);
    set({ user: res.user, totpEnabled: true });
  },

  logout: async () => {
    const rt = localStorage.getItem('kids_refresh') || undefined;
    try {
      await api.logout(rt);
    } catch {
      /* ignore */
    }
    localStorage.removeItem('kids_access');
    localStorage.removeItem('kids_refresh');
    set({ user: null, totpEnabled: false });
  },

  setTotpEnabled: (v) => set({ totpEnabled: v }),

  hydrate: async () => {
    const token = localStorage.getItem('kids_access');
    if (!token) {
      set({ loading: false, user: null });
      return;
    }
    try {
      const { user, totpEnabled } = await api.me();
      if (!totpEnabled) {
        localStorage.removeItem('kids_access');
        localStorage.removeItem('kids_refresh');
        set({ user: null, loading: false, totpEnabled: false });
        return;
      }
      set({ user: user as any, totpEnabled: true, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
}));
