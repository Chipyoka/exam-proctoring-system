import { useEffect, useState } from "react";
import { auth, firestore } from "../../../../../shared/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import useAuthStore from "../../store/authStore";

import { useNavigate } from 'react-router-dom';

import Logo from '../../assets/eps-white.png'; 
import { LogOut } from 'lucide-react';

const ScannerHome = () => {
  const { logout } = useAuthStore();
  const [userName, setUserName] = useState("-");
  const [userRole, setUserRole] = useState("-");
  const [isActivated, setIsActivated] = useState(false);
  const [academicPeriod, setAcademicPeriod] = useState(null);
  const [registrationClosed, setRegistrationClosed] = useState(false);
  const [error, setError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

  // 🔹 Listen for auth session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setSessionExpired(true);
        setUserName("-");
        setUserRole("-");
        logout();
        return;
      }

      setUserName(firebaseUser.displayName);
      await Promise.all([fetchUserRole(firebaseUser), fetchInvigilatorData(firebaseUser.uid)]);
    });

    return () => unsubscribe();
  }, []);

  // 🔹 Fetch role from backend
  const fetchUserRole = async (firebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch(`http://localhost:4000/user-role/${firebaseUser.uid}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch role");
      const data = await response.json();
      setUserRole(data.role || "none");
    } catch (err) {
      console.error("Error fetching role:", err);
      setError("Could not load user role. Check internet");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Fetch invigilator info from Firestore
  const fetchInvigilatorData = async (uid) => {
    try {
      const ref = doc(firestore, "invigilators", uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setIsActivated(data.isActivated === true || data.isActivated === "true");
      } else {
        setIsActivated(null);
      }

      // After invigilator fetch, also fetch academic period
      await fetchCurrentAcademicPeriod();

    } catch (err) {
      console.error("Error fetching invigilator:", err);
      setError("Failed to fetch account data.");
    }
  };

  // 🔹 Fetch the current academic period
  const fetchCurrentAcademicPeriod = async () => {
    try {
      const q = query(collection(firestore, "academicPeriod"), where("status", "==", "active"));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        setAcademicPeriod(data);

        const regEnd = data.registrationEnd?.toDate ? data.registrationEnd.toDate() : new Date(data.registrationEnd);
        const now = new Date();
        setRegistrationClosed(now > regEnd);
      } else {
        setAcademicPeriod(null);
      }
    } catch (err) {
      console.error("Error fetching academic period:", err);
    }
  };

  // 🔹 Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      logout();
    } catch (err) {
      console.error("Logout failed:", err);
      setError("Logout failed. Try again.");
    }
  };

  // --- UI ---
  if (loading)
    return (
      <div className="p-4 flex flex-col justify-center items-center h-full mt-6">
        <div className="loader"></div>
        <p className="mt-4">Loading...</p>
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
      {/* Header */}
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

      {/* Content */}
      <div className="bg-white py-6 px-4 w-full text-center">
        <h2 className="text-2xl font-semibold text-primary">
          Welcome, {userName}
        </h2>
        {academicPeriod && (
         <div className="mt-4 bg-gray-100 p-4 border border-gray-300 max-w-md mx-auto">
            <p>Current Academic Period</p>
             <p className="text-gray-600 mb-4 text-md">
              <strong>{academicPeriod.name || "N/A"}</strong>
            </p>
         </div>
        )}

        {error && <p className="text-red-500 mt-3">{error}</p>}

        {isActivated == false ? (
          <p className="text-red-500 font-medium mt-6">
            Your account is not activated. Please contact the administrator for access.
          </p>
        ) : (
          <div className="flex flex-col md:flex-row justify-center gap-4 mt-6">
            <button
              onClick={()=>{navigate('/invigilator/scanner')}}
              className="bg-primary text-white px-8 py-4 hover:bg-blue-700 transition-colors duration-300"
            >
              Scan Student
            </button>


            {registrationClosed && ( 
              <p className=" md:hidden text-yellow-500">Student registration is closed</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScannerHome;
