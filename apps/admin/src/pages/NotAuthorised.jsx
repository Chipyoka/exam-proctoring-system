import {useState} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import useAuthStore from '../store/authStore';

import Logo from '../assets/eps-white.png'; 
import { LogOut } from 'lucide-react';


const NotAuthorised = () => {

    const [loading, setLoading] = useState(false); 
    const location = useLocation();
    const navigate = useNavigate();
    const logout = useAuthStore((state) => state.logout);

    // set page title

    document.title = "Unauthorised | Exam Proctoring System";

    const handleLogout = () => {
    setLoading(true);
    setTimeout(() => {
        logout();
        navigate('/login');
    }, 3500);
  };

  const handleContact = () =>{
     window.location.href = 'https://mail.google.com';
  }

    return(
        <div className="w-full h-[90dvh] max-w-full max-h-full flex justify-center items-center">
            <div className="text-gray-500 w-sm md:w-md bg-gray-50 shadow-sm">
                <div className="bg-primary flex justify-center items-center"><img src={Logo} alt="exam proctoring system" className="h-[33px]  my-4"/></div>
                <div className="p-4 my-2">
                    <h1 className="text-3xl text-gray-500 font-semibold text-center">Unauthorised Access</h1>
                    <p className="mt-2 mb-6 text-center">You do not have permission to access the admin portal for the Exam Proctoring System.</p>

                    <div>
                        <button 
                            onClick={handleLogout}
                            className="w-full mb-2 py-2 flex items-center justify-center gap-x-4 bg-red-400 text-gray-50 hover:bg-[#FF5252] transition-colors duration-300"
                            disabled={loading} // optional: disables button while loading
                        >
                            {/* Show loader only if loading is true */}
                            {loading && <div className="btn-loader"></div>}

                            <div className="flex justify-center items-center gap-x-2">
                            <p>Leave</p>
                            <LogOut className="w-5 h-5 text-gray-50" />
                            </div>
                        </button>
                    </div>

                    <hr className="my-6"/>
                    <p className="mt-2 text-sm text-center">Contact your <span className="hyperlink" onClick={handleContact}>Tech Support</span></p>
                </div>
            </div>
        </div>
    )
}

export default NotAuthorised;