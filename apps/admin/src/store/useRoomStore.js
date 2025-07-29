import { create } from 'zustand';

const useRoomStore = create((set) => ({
  selectedRoom: null,
  setSelectedRoom: (roomData) => set({ selectedRoom: roomData }),
  clearSelectedRoom: () => set({ selectedRoom: null }),
}));

export default useRoomStore;