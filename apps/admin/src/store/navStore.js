// store/navStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useNavStore = create(
  persist(
    (set) => ({
      activeTab: '/',
      isLive: false,
      setActiveTab: (tab) => set({ activeTab: tab }),
      setIsLive: (status)=> set({isLive: status})
    }),
    {
      name: 'nav-storage', // localStorage key
    }
  )
);
