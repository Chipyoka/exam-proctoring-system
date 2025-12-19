import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authInviStore';

const InviProtectedRoute = () => {
  const { inviUser } = useAuthStore();

  return inviUser ? <Outlet /> : <Navigate to="/login" replace />;
};

export default InviProtectedRoute;
