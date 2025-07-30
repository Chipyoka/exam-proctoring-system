// stores/useModalStore.js
import { create } from 'zustand';

const useModalStore = create((set) => ({
  activeModal: null,
  modalProps: {},
  
  openModal: (modalName, props = {}) => set({ 
    activeModal: modalName,
    modalProps: props,
    closeOnClickOutside: props.closeOnClickOutside !== false,
  }),
  
  closeModal: () => set({ 
    activeModal: null,
    modalProps: {} 
  }),
}));

export default useModalStore;