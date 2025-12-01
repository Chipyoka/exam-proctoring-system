import { useEffect, useState } from 'react';
import { User, Activity } from 'lucide-react';
import { useNavStore } from '../store/navStore';
import dayjs from 'dayjs';

import useModalStore from '../store/useModalStore';

import Modal from './modals/Modal';
import ViewLiveAlerts from './modals/ViewLiveAlerts';


const NAV_TITLES = {
  '/': { title: 'Dashboard', description: 'List of all exam rooms registered' },
  '/admin/dashboard': { title: 'Dashboard', description: 'List of all exam rooms registered' },
  '/admin/dashboard/students': { title: 'Students - All Registered students & courses', description: 'List of all courses registered and students' },
  '/admin/dashboard/invigilators': { title: 'Invigilators - All Registered Personnel', description: 'Manage lectures and instructors who are invigilators' },
  // Add more as needed
};

const Topbar = () => {
   
  const { activeTab,isLive} = useNavStore();
  const [time, setTime] = useState(dayjs().format('HH:mm:ss'));

 const { openModal } = useModalStore();
  

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(dayjs().format('HH:mm:ss A'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { title, description } = NAV_TITLES[activeTab] || {
    title: 'Unknown',
    description: '',
  };


 function getFirebaseEmail() {
  try {
    const raw = localStorage.getItem('auth-storage'); // adjust key
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed?.state?.user?.email || null;
  } catch (e) {
    console.error('Failed to parse user email from localStorage', e);
    return null;
  }
}

const userEmail = getFirebaseEmail();

  return (
    <div className="w-full bg-white px-6 py-3 flex items-center justify-between border-b border-gray-200">
      <div>
        <h1 className="text-xl text-gray-500 font-semibold">{title}</h1>
        <p className="text-sm">{description}</p>
      </div>

      <div className="flex items-center gap-x-2">
        {/* date and time */}
        <div className="text-sm text-gray-600 border-r-2 border-gray-200 pr-4 mr-4">
            <p className="text-xs text-gray-400">Date & Time</p>
          {dayjs().format('MMM DD, YYYY')} | <span className="font-medium">{time}</span>
        </div>

        {/* live stream alerts */}

        <div className="text-sm text-gray-600 border-r-2 border-gray-200 pr-4 mr-4">
            <div 
                onClick={() => openModal('viewLiveAlerts', {
                      title: 'Alerts Stream',
                      closeOnClickOutside: false,
                      // width: 'md',
                      children: <ViewLiveAlerts />
                    })}
              className={isLive ? `p-2 bg-green-100 text-green-500 flex items-center justify-center cursor-pointer`: `p-2 bg-gray-100 flex items-center justify-center cursor-pointer`}
            >
              <Activity className="w-5 h-5" />
              <span className="font-medium text-xs ml-2">
                {isLive ? "View live alerts" : "Alerts Off"}
              </span>

            <div>

            </div>
          </div>

        </div>

        {/* admin user */}
        <div className="flex items-center gap-x-2 text-gray-600  ">
            <div className="p-2 bg-gray-100 flex items-center justify-center">
                 <User className="w-5 h-5 " />
            </div>
            <div className="w-[150px] truncate">
                <p className="text-sm font-semibold ">Admin</p>
                <p className="text-sm text-gray-400 ">{userEmail || 'Not Logged In'}</p>
            </div>
        </div>
      </div>
      {/* Render the modal portal once */}
          {/* <Modal /> */}
    </div>
  );
};

export default Topbar;
