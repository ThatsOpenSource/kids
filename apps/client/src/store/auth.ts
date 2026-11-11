import { create } from "zustand";

interface AuthState {
  token: string | null;
  user: any | null;
  setToken: (t: string | null) => void;
  setUser: (u: any) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem("accessToken"),
  user: null,
  setToken: (t) => { if (t) localStorage.setItem("accessToken", t); else localStorage.removeItem("accessToken"); set({ token: t }); },
  setUser: (u) => set({ user: u }),
  logout: () => { localStorage.removeItem("accessToken"); localStorage.removeItem("refreshToken"); set({ token: null, user: null }); },
}));