import { useEffect, useState } from "react";
import { auth } from "../../../../../shared/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import useAuthStore from "../../store/authStore";
import { useNavigate } from 'react-router-dom';
import Logo from '../../assets/eps-white.png'; 
import { LogOut} from 'lucide-react';

import Rooms from '../../components/invigilator/Rooms';

const Scanner = () => {
  const { user, logout } = useAuthStore();
  const [myUid, setMyUid] = useState(null);
  const [userRole, setUserRole] = useState("-");
  const [userEmail, setUserEmail] = useState("-");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

    const navigate = useNavigate();

  useEffect(() => {
    // Listen for auth state changes (login/logout/session expiry)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setSessionExpired(true);
        setUserEmail("-");
        setUserRole("-");
        setLoading(false);
        logout(); // Zustand logout
        return;
      }

      setUserEmail(firebaseUser.email);
        setMyUid(firebaseUser.uid);
      await fetchUserRole(firebaseUser);
    });

    return () => unsubscribe();
  }, []);

  // Function to fetch user role from backend
  const fetchUserRole = async (firebaseUser) => {
    try {
      setLoading(true);
      const token = await firebaseUser.getIdToken();

      const response = await fetch(
        `http://localhost:4000/user-role/${firebaseUser.uid}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch role");
      }

      const data = await response.json();
      setUserRole(data.role || "none");
    } catch (err) {
      console.error("Error fetching role:", err);
      setError("Check your internet");
    } finally {
      setLoading(false);
    }
  };

  // Handle logout manually
  const handleLogout = async () => {
    try {
      await signOut(auth);
      logout(); // Zustand logout
    } catch (err) {
      console.error("Logout failed:", err);
      setError("Logout failed. Try again.");
    }
  };

  // --- UI Rendering ---
  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-700">
           <div className="p-4 flex flex-col justify-center items-center h-full mt-6">
                <div className="loader"></div>
                <p className="mt-4">Loading...</p>
            </div>
      </div>
    );

  if (sessionExpired)
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-700">
        <p className="text-lg font-semibold text-red-600">Session expired</p>
        <p className="text-sm mt-2">Please log in again to continue.</p>
        <button
          onClick={handleLogout}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Go to Login
        </button>
      </div>
    );

  return (
    <div className="text-gray-700 h-screen bg-gray-50">
        <div className="bg-primary flex items-start justify-between p-4 mb-4 w-full">
            <img src={Logo} alt="Exam proctoring system" className="h-[33px]" />
            <button
                 onClick={handleLogout}
                className="w-28 mb-2 py-2 flex items-center justify-center gap-x-4 bg-red-400 text-gray-50 hover:bg-[#FF5252] transition-colors duration-300"
            >

             <div className="flex justify-center items-center gap-x-2">
                    <p>Logout</p>
                    <LogOut className="w-5 h-5 text-gray-50" />
            </div>
            </button>
        </div>

        <div className="flex flex-col md:flex-row justify-center mt-4 p-4">
            <button
            onClick={()=>{navigate('/invigilator/home')}}
            className="bg-primary text-white px-8 py-4 hover:bg-blue-700 transition-colors duration-300"
            
            >
                Return Home
            </button>
        </div>

      <div className="bg-white shadow-md py-6 px-4 w-full w-full text-center">
      <h2 className="text-2xl font-semibold text-primary">
        Assigned Rooms
      </h2>

        {error && <p className="text-red-500 mt-3">{error}</p>}

      </div>
      <div className="w-ful">
        
      </div>
      <div>
        {myUid && <Rooms uid={myUid} />}
      </div>
    </div>
  );
};

export default Scanner;
