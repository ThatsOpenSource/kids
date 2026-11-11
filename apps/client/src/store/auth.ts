import { create } from "zustand";

interface AuthState {
  token: string | null;
  setToken: (t: string | null) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem("accessToken"),
  setToken: (t) => {
    if (t) localStorage.setItem("accessToken", t);
    else localStorage.removeItem("accessToken");
    set({ token: t });
  },
  logout: () => {
    localStorage.removeItem("accessToken");
    set({ token: null });
  },
}));