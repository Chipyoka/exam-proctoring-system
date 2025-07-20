import { useNavigate } from 'react-router-dom';
import {useState} from 'react';
import useAuthStore from '../store/authStore';


import { ArrowRight } from 'lucide-react';
import { UserCircle } from 'lucide-react'
import { Lock } from 'lucide-react';


import Logo from '../assets/eps-white.png'; // Adjust the path as necessary

const Login = () => {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(true);


//   handle show password
  const handleShowPassword = () =>{
    setShowPassword(!showPassword);
    console.log("Show Password: ", showPassword);
  }

//  handle login
  const handleLogin = () => {

    // Set loading state
    setLoading(true);
    setTimeout(() => {
      setLoading(false);

      // Simulate a login request
        const dummyUser = { id: 1, name: 'Admin' }; // Replace with real logic
        login(dummyUser);
        navigate('/');
    }, 2000); // Simulate a delay for the login process

    
  };

  return (
    <div className="text-gray-500 flex flex-col items-center justify-center w-full max-w-full h-screen bg-[url('../assets/classroom-bg-min.png')] bg-no-repeat bg-cover bg-center">
      <div className="absolute inset-0 bg-black/40  z-0"></div>

      <div className="bg-white shadow-lg z-10 w-md">
        <div className="bg-primary flex items-center justify-center p-4 mb-4">
            <img src={Logo} alt="Exam proctoring system" className="h-[33px]" />
        </div>

        <div className="p-8 flex flex-col items-center justify-center">

            <h2 className="text-gray-700 text-2xl font-semibold">Admin Login</h2>
            <p className="text-sm text-gray-500 mb-6">To continue, provide you login credentials below.</p>

            <form action="" className="w-full">
                <div className="input-group relative flex items-center border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                    <div className="bg-gray-100 p-2">
                        <UserCircle className="w-6 h-6 text-gray-500" />
                    </div>
                    <input type="text" placeholder="Username" name="username" className="text-gray-700 ml-2 w-full border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"/>
                </div>

                {/* Password input */}
                <div className="input-group relative flex items-center border border-gray-300 mt-4 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                    <div className="bg-gray-100 p-2">
                        <Lock className="w-6 h-6 text-gray-500" />
                    </div>
                    <input type={showPassword ? 'text' : 'password'} placeholder="Password" name="password" className="text-gray-700 ml-2 w-full border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"/>
                </div>
                <p  
                    onClick={handleShowPassword} 
                    className="hyperlink text-xs mt-2 w-fit no-select"
                    >
                        {showPassword ? 'Hide' : 'Show'} password
                    </p>


                {/* Login button */}
                <button 
                    type="submit"
                    className="w-full mt-6 flex items-center justify-center gap-x-4 btn-primary transition-colors duration-300"
                    onClick={handleLogin}
                    disabled={loading} // optional: disables button while loading
                >
                    {/* Show loader only if loading is true */}
                    {loading && <div className="btn-loader"></div>}

                    <div className="flex justify-center items-center gap-x-2">
                    <p>Login</p>
                    {/* <ArrowRight className="w-5 h-5 text-gray-50" /> */}
                    </div>
                </button>

                <p className="w-full mt-4 text-center">Forgot password? <span className="hyperlink">Reset</span></p>
            </form>
        </div>

      </div>
    </div>
  );
};

export default Login;
