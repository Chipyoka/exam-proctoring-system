import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../../../shared/firebase';

import { UserCircle, Lock, Phone, GraduationCap } from 'lucide-react';
import Logo from '../assets/eps-white.png';

const Signup = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    faculty: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState({});

  // 🔁 Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 👁️ Toggle password visibility
  const handleShowPassword = () => {
    setShowPassword(!showPassword);
    if (!showPassword) {
      setMessage({ type: 'warning', text: 'Your password is now visible' });
    } else {
      setMessage({});
    }
  };

  // 🧠 Handle signup
  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage({});

    const { fullName, phone, faculty, email, password, confirmPassword } = formData;

    // ✅ Validation
    if (!fullName || !phone || !faculty || !email || !password || !confirmPassword) {
      setMessage({ type: 'error', text: 'All fields are required' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }

    setLoading(true);

    try {
      // 🔹 Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 🔹 Update display name
      await updateProfile(user, { displayName: fullName });

      // 🔹 Assign 'invigilator' role via Express API
      await fetch('http://localhost:4000/setRole', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, role: 'invigilator' })
      });

      setMessage({ type: 'info', text: 'Signup successful! Redirecting to login...' });

      // ⏩ Redirect to login
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      console.error('Signup error:', error.message);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  document.title = "EPS - Invigilator Signup";

  return (
    <div className="text-gray-500 flex flex-col items-center justify-center w-full max-w-full h-screen overflow-y-auto py-12 bg-[url('../assets/classroom-bg-min.webp')] bg-no-repeat bg-cover bg-center">
      <div className="absolute inset-0 bg-black/40 z-0"></div>

      <div className="bg-white shadow-lg z-10 md:w-md w-sm mt-16">
        <div className="bg-primary flex items-center justify-center p-4 mb-4">
          <img src={Logo} alt="Exam proctoring system" className="h-[33px]" />
        </div>

        {message && (
          <div className="w-full text-center text-xs font-semibold">
            <p
              className={
                message.type === 'warning'
                  ? 'text-yellow-500'
                  : message.type === 'info'
                  ? 'text-blue-500'
                  : message.type === 'error'
                  ? 'text-red-500'
                  : 'text-gray-700'
              }
            >
              {message.text}
            </p>
          </div>
        )}

        <div className="p-8 flex flex-col items-center justify-center">
          <h2 className="text-gray-700 text-2xl font-semibold">Invigilator Signup</h2>
          <p className="text-sm text-gray-500 mb-6 text-center">
            Create your account below to continue.
          </p>

          <form onSubmit={handleSignup} className="w-full space-y-3">
            {/* Full Name */}
            <div className="input-group flex items-center border border-gray-300 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <div className="bg-gray-100 p-2">
                <UserCircle className="w-6 h-6 text-gray-500" />
              </div>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Full Name"
                className="text-gray-700 ml-2 w-full bg-transparent border-none outline-none placeholder:text-sm"
              />
            </div>

            {/* Phone */}
            <div className="input-group flex items-center border border-gray-300 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <div className="bg-gray-100 p-2">
                <Phone className="w-6 h-6 text-gray-500" />
              </div>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone Number"
                className="text-gray-700 ml-2 w-full bg-transparent border-none outline-none placeholder:text-sm"
              />
            </div>

            {/* Faculty */}
            <div className="input-group flex items-center border border-gray-300 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <div className="bg-gray-100 p-2">
                <GraduationCap className="w-6 h-6 text-gray-500" />
              </div>
              <input
                type="text"
                name="faculty"
                value={formData.faculty}
                onChange={handleChange}
                placeholder="Faculty"
                className="text-gray-700 ml-2 w-full bg-transparent border-none outline-none placeholder:text-sm"
              />
            </div>

            {/* Email */}
            <div className="input-group flex items-center border border-gray-300 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <div className="bg-gray-100 p-2">
                <UserCircle className="w-6 h-6 text-gray-500" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                className="text-gray-700 ml-2 w-full bg-transparent border-none outline-none placeholder:text-sm"
              />
            </div>

            {/* Password */}
            <div className="input-group flex items-center border border-gray-300 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <div className="bg-gray-100 p-2">
                <Lock className="w-6 h-6 text-gray-500" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                className="text-gray-700 ml-2 w-full bg-transparent border-none outline-none placeholder:text-sm"
              />
            </div>

            {/* Confirm Password */}
            <div className="input-group flex items-center border border-gray-300 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <div className="bg-gray-100 p-2">
                <Lock className="w-6 h-6 text-gray-500" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm Password"
                className="text-gray-700 ml-2 w-full bg-transparent border-none outline-none placeholder:text-sm"
              />
            </div>

            <p onClick={handleShowPassword} className="hyperlink text-xs mt-2 w-fit no-select">
              {showPassword ? 'Hide' : 'Show'} password
            </p>

            {/* Signup button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-x-4 btn-primary transition-colors duration-300"
            >
              {loading && <div className="btn-loader"></div>}
              <p>Sign Up</p>
            </button>

            <p className="w-full mt-4 text-center text-sm">
              Already have an account?{' '}
              <span className="hyperlink" onClick={() => navigate('/login')}>
                Login
              </span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
