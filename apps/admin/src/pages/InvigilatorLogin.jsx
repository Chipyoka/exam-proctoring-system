import { useNavigate } from 'react-router-dom';
import {useState, useEffect} from 'react';
import useAuthStore from '../store/authStore';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { getIdTokenResult } from 'firebase/auth';
import { auth } from '../../../../shared/firebase';


import { ArrowRight } from 'lucide-react';
import { UserCircle } from 'lucide-react'
import { Lock } from 'lucide-react';


import Logo from '../assets/eps-white.png'; 
const Login = () => {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState({});


//   handle show password
  const handleShowPassword = () =>{
    setShowPassword(!showPassword);
    console.log("Show Password: ", showPassword);

    if(showPassword === false){

        const msg = {
            type : "warning",
            text : "Your password is now visible"
        }

        setMessage(msg);
    }else{
        setMessage({});
    }

  }

//  handle login
const handleLogin = async (e) => {
  e.preventDefault();
  setMessage({});

  if (!email || !password) {
    setMessage({ type: 'error', text: 'All fields are required' });
    return;
  }

  if (password.length < 8) {
    setMessage({ type: 'error', text: 'Password must be longer than 8 characters' });
    return;
  }

  setLoading(true);

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    //  Fetch custom claims
    const idTokenResult = await getIdTokenResult(user);
    const role = idTokenResult.claims.role;

    //  Check if role matches the app
    if (role !== 'invigilator'){
      navigate("/invigilator/unauthorised");
      return;
    }

    //  Proceed to app
    login(user); // set user context
    navigate('/invigilator/home'); // or dashboard route
  } catch (err) {
    console.error(err.message);
    setMessage({ type: 'error', text: 'Invalid credentials. Please try again.' });
  } finally {
    setLoading(false);
  }
};

 document.title = "EPS - Exam Proctoring System";


  return (
    <div className="text-gray-500 flex flex-col items-center justify-center w-full max-w-full h-screen bg-[url('../assets/classroom-bg-min.webp')] bg-no-repeat bg-cover bg-center">
      <div className="absolute inset-0 bg-black/40  z-0"></div>

      <div className="bg-white shadow-lg z-10 md:w-md md:max-w-md w-sm max-w-full">
        <div className="bg-primary flex items-center justify-center p-4 mb-4">
            <img src={Logo} alt="Exam proctoring system" className="h-[33px]" />
        </div>
       {message && <div className="w-full text-center text-xs font-semibold">
            <p className={
                message.type === 'warning' ? 'text-yellow-500' :
                message.type === 'info'    ? 'text-blue-500'   :
                message.type === 'error'   ? 'text-red-500'    :
                'text-gray-700'
                }>
                {message.text}
            </p>
        </div>}

        <div className="p-8 flex flex-col items-center justify-center">

            <h2 className="text-gray-700 text-2xl font-semibold ">Invigilator Login</h2>
            <p className="text-sm text-gray-500 mb-6 text-center">To continue, provide your login credentials below.</p>

            <form onSubmit={handleLogin} className="w-full">
                <div className="input-group relative flex items-center border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                    <div className="bg-gray-100 p-2">
                        <UserCircle className="w-6 h-6 text-gray-500" />
                    </div>
                    <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    
                    placeholder="Email" 
                    name="email" 
                    className="text-gray-700 ml-2 w-full border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"/>
                </div>

                {/* Password input */}
                <div className="input-group relative flex items-center border border-gray-300 mt-4 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                    <div className="bg-gray-100 p-2">
                        <Lock className="w-6 h-6 text-gray-500" />
                    </div>
                    <input 
                    type={showPassword ? 'text' : 'password'} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    
                    min="8" 
                    placeholder="Password" 
                    name="password" 
                    className="text-gray-700 ml-2 w-full border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm" title="Required with minmum of 8 characters"/>
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
                    disabled={loading} // optional: disables button while loading
                >
                    {/* Show loader only if loading is true */}
                    {loading && <div className="btn-loader"></div>}

                    <div className="flex justify-center items-center gap-x-2">
                    <p>Login</p>
                    {/* <ArrowRight className="w-5 h-5 text-gray-50" /> */}
                    </div>
                </button>

                {/* <p className="w-full mt-4 text-center">Forgot password? <span className="hyperlink">Reset</span></p> */}
                <p className="w-full mt-4 text-center">Don't have an account? <span className="hyperlink" onClick={() => navigate('/register')  }>Register</span></p>
                <div className="mt-4 flex justify-center items-center"> <button onClick={() => navigate('/')} className="btn-primary-outlined-2 w-full">Return Home</button></div>
            </form>
        </div>

      </div>
    </div>
  );
};

export default Login;
