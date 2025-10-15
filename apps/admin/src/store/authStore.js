import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      inviUser: null,
      login: (userData) => set({ user: userData }),
      logout: () => set({ user: null }),
      inviLogin: (userData) => set({ inviUser: userData }),
      inviLogout: () => set({ inviUser: null }),
    }),
    {
      name: 'auth-storage', // stores in localStorage
    }
  )
);

export default useAuthStore;
