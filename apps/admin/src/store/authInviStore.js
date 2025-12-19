// stores/useInvigilatorAuthStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      inviUser: null,

      login: (userData) => {
        set({ inviUser: userData });
      },

      logout: () => {
        set({ inviUser: null });
      },
    }),
    {
      name: 'invigilator-auth-storage',
      partialize: (state) => ({ inviUser: state.inviUser }),
    }
  )
);

export default useAuthStore;
