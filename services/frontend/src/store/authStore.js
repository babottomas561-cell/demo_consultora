import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      activeCompany: null,
      
      login: (userData, token) => set({ user: userData, token }),
      
      logout: () => set({ user: null, token: null, activeCompany: null }),
      
      setActiveCompany: (company) => set({ activeCompany: company }),

      clearActiveCompany: () => set({ activeCompany: null }),
    }),
    {
      name: 'auth-storage', // key in localStorage
    }
  )
);

export default useAuthStore;
