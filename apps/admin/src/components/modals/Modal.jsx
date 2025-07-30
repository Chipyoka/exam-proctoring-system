// components/Modal.jsx
import { X } from 'lucide-react';
import useModalStore from '../../store/useModalStore';

const Modal = () => {
   const { activeModal, modalProps, closeModal, closeOnClickOutside } = useModalStore();
  
  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={() => {
          if (closeOnClickOutside && modalProps.closeOnClickOutside !== false) {
            closeModal();
          }
        }}
        aria-hidden="true"
      />
      
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div 
          className={`relative transform overflow-hidden bg-white text-left shadow-xl transition-all w-full max-w-${modalProps.width || 'md'}`}
        >
          {modalProps.title && (
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-medium text-gray-900">
                {modalProps.title}
              </h3>
              <button
                type="button"
                className="text-gray-400 w-8 h-8 bg-gray-50 flex justify-center items-center rounded-full p-2 hover:text-gray-500 hover:bg-gray-100"
                onClick={closeModal}
                aria-label="Close"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
          
          <div className="p-4">
            {modalProps.children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;