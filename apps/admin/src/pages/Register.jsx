import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile, deleteUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '../../../../shared/firebase';

import { UserCircle, Lock, Phone, GraduationCap } from 'lucide-react';
import Logo from '../assets/eps-white.png';
import toast from 'react-hot-toast';

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleShowPassword = () => {
    setShowPassword(!showPassword);
    if (!showPassword) {
      setMessage({ type: 'warning', text: 'Your password is now visible' });
    } else {
      setMessage({});
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage({});

    const { fullName, phone, faculty, email, password, confirmPassword } = formData;

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

    let user = null; // Keep track of user for possible rollback

    try {
      // 🔹 Step 1: Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user = userCredential.user;

      // 🔹 Step 2: Update profile
      await updateProfile(user, { displayName: fullName });

      // 🔹 Step 3: Create Firestore document under "invigilators"
      const invigilatorRef = doc(firestore, 'invigilators', user.uid);
      const invigilatorSnap = await getDoc(invigilatorRef);

      if (invigilatorSnap.exists()) {
        throw new Error('An account already exists for this user.');
      }

      await setDoc(invigilatorRef, {
        uid: user.uid,
        fullname: fullName,
        lastname: fullName.split(' ').slice(-1)[0],
        phone,
        faculty,
        totalScans: 0,
        isActivated: false,
        createdAt: new Date().toISOString()
      });

      // 🔹 Step 4: Assign role via backend API
      const response = await fetch('http://localhost:4000/setRole', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, role: 'invigilator' }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign role on backend.');
      }

      // 🔹 Step 5: Success message and redirect
      setMessage({ type: 'success', text: 'Signup successful! Redirecting to login...' });
      toast.success('Signup successful! You can now log in.');
      setTimeout(() => navigate('/login'), 2500);

    } catch (error) {
      console.error('Signup error:', error.message);

      // 🔹 Rollback: Delete Auth user if Firestore or backend failed
      if (user) {
        try {
          await deleteUser(user);
          console.warn('Auth user deleted due to failed Firestore or backend operation.');
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError.message);
        }
      }

      setMessage({ type: 'error', text: error.message || 'Signup failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  document.title = 'EPS - Invigilator Signup';

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
                  : message.type === 'success'
                  ? 'text-green-500'
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
            <div className="input-group flex items-center border border-gray-300 px-3 py-2">
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
            <div className="input-group flex items-center border border-gray-300 px-3 py-2">
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
            <div className="input-group flex items-center border border-gray-300 px-3 py-2">
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
            <div className="input-group flex items-center border border-gray-300 px-3 py-2">
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
            <div className="input-group flex items-center border border-gray-300 px-3 py-2">
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
            <div className="input-group flex items-center border border-gray-300 px-3 py-2">
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

            <p
              onClick={handleShowPassword}
              className="hyperlink text-xs mt-2 w-fit no-select"
            >
              {showPassword ? 'Hide' : 'Show'} password
            </p>

            {/* Submit */}
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
