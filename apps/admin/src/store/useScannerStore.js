import { create } from 'zustand';

// Helper to load initial value from localStorage
const loadFromStorage = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (err) {
    console.error('Error loading from localStorage:', err);
    return defaultValue;
  }
};

// Helper to save value to localStorage
const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Error saving to localStorage:', err);
  }
};

const STORAGE_KEY = 'scannerStore';

const useScannerStore = create((set, get) => ({
  selectedExamSessionId: loadFromStorage(STORAGE_KEY, null),

  setSelectedExamSessionId: (id) => {
    set({ selectedExamSessionId: id });
    saveToStorage(STORAGE_KEY, id);
  },

  clearSelectedExamSessionId: () => {
    set({ selectedExamSessionId: null });
    saveToStorage(STORAGE_KEY, null);
  },
}));

export default useScannerStore;
