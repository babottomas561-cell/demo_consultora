import { create } from "zustand";

const storedToken = localStorage.getItem("demo_consultora_token");
const storedEmail = localStorage.getItem("demo_consultora_email");

export const useAuthStore = create((set) => ({
  token: storedToken,
  email: storedEmail,
  isAuthenticated: Boolean(storedToken),
  setSession: ({ token, email }) => {
    localStorage.setItem("demo_consultora_token", token);
    localStorage.setItem("demo_consultora_email", email);
    set({ token, email, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem("demo_consultora_token");
    localStorage.removeItem("demo_consultora_email");
    set({ token: null, email: null, isAuthenticated: false });
  },
}));
