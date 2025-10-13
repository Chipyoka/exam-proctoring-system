import { create } from 'zustand';

const useScannerStore = create((set) => ({
  selectedExamSessionId: null,
  setSelectedExamSessionId: (id) => set({ selectedExamSessionId: id }),
  clearSelectedExamSessionId: () => set({ selectedExamSessionId: null }),
}));

export default useScannerStore;