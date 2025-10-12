
import { useNavigate } from 'react-router-dom';
import {useState, useEffect} from 'react';

import Logo from '../assets/eps-white.png'; 



const Home = () => {

    document.title = "EPS - Exam Proctoring System";

    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleInvigilatorLogin = () => {
        setLoading(true);

        try {
            setTimeout(() => {
                navigate('/login');
                setLoading(false);
            }, 2000);
        } catch (error) {
            console.error("Error during invigilator login:", error);
        }
    }

    const handleAdminLogin = () => {
        navigate('/admin/login');
    }

  return (
    <div className="text-gray-500 flex flex-col items-center justify-center w-full max-w-full h-screen bg-[url('../assets/classroom-bg-min.webp')] bg-no-repeat bg-cover bg-center">
      <div className="absolute inset-0 bg-black/40  z-0"></div>

      <div className="bg-white shadow-lg z-10 md:w-md w-sm">
        <div className="bg-primary flex items-center justify-center p-4 mb-4">
            <img src={Logo} alt="Exam proctoring system" className="h-[33px]" />
        </div>


        <div className="p-8 flex flex-col items-center justify-center">

            <h2 className="text-gray-700 text-2xl font-semibold ">Welcome</h2>
            <p className="text-sm text-gray-500 mb-6 text-center">Select how you wish to proceed and login.</p>


            {/* Login button */}
                <button 
                    type="button"
                    className="w-full mt-6 flex items-center justify-center gap-x-4 btn-primary transition-colors duration-300"
                    disabled={loading} // optional: disables button while loading
                    onClick={() => {navigate('/registration')}}
                >
                    {/* Show loader only if loading is true */}
                    {loading && <div className="btn-loader"></div>}

                    <div className="flex justify-center items-center gap-x-2">
                    <p>Student Self-Registration</p>
                    {/* <ArrowRight className="w-5 h-5 text-gray-50" /> */}
                    </div>
                </button>
            {/* Login button */}
                <button 
                    type="button"
                    className="w-full mt-6 flex items-center justify-center gap-x-4 btn-primary transition-colors duration-300"
                    disabled={loading} // optional: disables button while loading
                    onClick={() => {handleInvigilatorLogin()}}
                >
                    {/* Show loader only if loading is true */}
                    {loading && <div className="btn-loader"></div>}

                    <div className="flex justify-center items-center gap-x-2">
                    <p>Invigilator Login</p>
                    {/* <ArrowRight className="w-5 h-5 text-gray-50" /> */}
                    </div>
                </button>

              
                

                <p className="hyperlink mt-4"  onClick={() => {handleAdminLogin()}}>Login as Admin</p>
        </div>

      </div>
    </div>
  );
};

export default Home;
