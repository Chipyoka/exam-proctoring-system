// store/navStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useNavStore = create(
  persist(
    (set) => ({
      activeTab: '/',
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: 'nav-storage', // localStorage key
      partialize: (state) => ({ activeTab: state.activeTab }), // only store activeTab
    }
  )
);
