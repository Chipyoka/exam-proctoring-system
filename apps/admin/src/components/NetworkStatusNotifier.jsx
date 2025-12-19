import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { Toaster } from 'react-hot-toast';

const NetworkStatusNotifier = () => {
  useNetworkStatus(); // hook handles toasts and status updates

  return <Toaster 
    position="top-center" 
    reverseOrder={false} 
    toastOptions={{
          duration: 4000, // auto-close after 4s
          style: {
            borderRadius: '8px',
            background: '#333',
            color: '#fff',
            fontSize: '14px',
          },
        }}
  />;
};

export default NetworkStatusNotifier;
