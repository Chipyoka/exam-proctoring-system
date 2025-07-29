import { create } from 'zustand';

const useRoomStore = create((set) => ({
 selectedExamSessionId: null,
  setSelectedExamSessionId: (id) => set({ selectedExamSessionId: id }),
  clearSelectedExamSessionId: () => set({ selectedExamSessionId: null }),
}));

export default useRoomStore;