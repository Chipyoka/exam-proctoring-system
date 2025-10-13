// components/Sidebar.jsx
import React, { useEffect, useState } from 'react';
import { useNavStore } from '../store/navStore';
import useAuthStore from '../store/authStore';
import { useLocation, useNavigate } from 'react-router-dom';

import Logo from '../assets/eps-white.png'; 
import { LogOut, File } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', path: '/admin/dashboard' },
  { label: 'Students', path: '/admin/dashboard/students' },
  { label: 'Invigilators', path: '/admin/dashboard/invigilators' },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeTab, setActiveTab } = useNavStore();

  const [loading, setLoading] = useState(false);

const logout = useAuthStore((state) => state.logout);

  // Sync Zustand with current URL on refresh
  useEffect(() => {
    if (location.pathname !== activeTab) {
      setActiveTab(location.pathname);
    }
  }, [location.pathname]);

  const handleClick = (path) => {
    setActiveTab(path);
    navigate(path);
  };

const handleLogout = () => {
    setLoading(true);
    setTimeout(() => {
        logout();
        navigate('/admin/login');
    }, 3500);
  };

  return (
    <aside className="w-64 bg-primary text-white min-h-screen p-4 flex flex-col justify-between">
        <div className="">
            <img src={Logo} alt="Exam proctoring system" className="h-[33px] mb-8 mt-2" />
        
            <ul>
                {navItems.map((item) => (
                <li
                    key={item.path}
                    className={`p-3 cursor-pointer ${
                    activeTab === item.path ? 'bg-[#2F7392]' : 'hover:bg-[#2B6783]'
                    }`}
                    onClick={() => handleClick(item.path)}
                >
                    {item.label}
                </li>
                ))}
            </ul>
        </div>

      <div>
        <div className="bg-[#2F7392] p-2">
          <p className="font-bold text-white text-lg">Generate Reports</p>
          <p className="text-sm text-white mb-2">
            Click the button below to generate reports and analytics
          </p>
          <button className="btn-primary-outlined-sm w-full hover:shadow-sm flex items-center justify-center gap-x-2">
            <File className="w-5 h-5 " />
            Generate
          </button>
        </div>
        <hr className="my-6 text-gray-400" />
           <button 
                    onClick={handleLogout}
                    className="w-full mb-2 py-2 flex items-center justify-center gap-x-4 bg-red-400 text-gray-50 hover:bg-[#FF5252] transition-colors duration-300"
                    disabled={loading} // optional: disables button while loading
                >
                    {/* Show loader only if loading is true */}
                    {loading && <div className="btn-loader"></div>}

                    <div className="flex justify-center items-center gap-x-2">
                    <p>Logout</p>
                    <LogOut className="w-5 h-5 text-gray-50" />
                    </div>
            </button>
      </div>
    </aside>
  );
};

export default Sidebar;
