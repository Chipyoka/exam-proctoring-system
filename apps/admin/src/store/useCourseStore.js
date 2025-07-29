import { create } from 'zustand';

const useCourseStore = create((set) => ({
  selectedCourseId: null,
  setSelectedCourseId: (id) => set({ selectedCourseId: id }),
  clearSelectedCourseId: () => set({ selectedCourseId: null }),
}));

export default useCourseStore;