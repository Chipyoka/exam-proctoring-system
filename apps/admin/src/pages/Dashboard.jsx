import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div>
      <h1 className="text-gray-600 text-2xl">Dashboard</h1>
      <button
      className="btn-primary mt-4"
       onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default Dashboard;
