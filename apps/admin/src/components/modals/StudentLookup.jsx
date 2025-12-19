import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../../../../shared/firebase';

const StudentLookup = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({});
  const [studentId, setStudentId] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [config, setConfig] = useState(null);

  // Fetch SMS configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configRef = doc(firestore, 'configs', 'sms_config');
        const configSnap = await getDoc(configRef);

        if (configSnap.exists()) {
          setConfig(configSnap.data());
        } else {
          setMessage({ type: 'error', text: 'SMS configuration not found. Please configure first.' });
        }
      } catch (err) {
        console.error('Error fetching config:', err);
        setMessage({ type: 'error', text: 'Failed to load SMS configuration.' });
      }
    };

    fetchConfig();
  }, []);

// Handle student lookup
// Handle student lookup
const handleLookup = async () => {
  setMessage({});
  setStudentData(null);

  if (!studentId) {
    setMessage({ type: 'error', text: 'Student ID is required.' });
    return;
  }

  if (!config || !config.endpoint || !config.apiKey) {
    setMessage({ type: 'error', text: 'Cannot perform lookup without proper configuration.' });
    return;
  }

  setLoading(true);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || 30000);

    // Use '/student' endpoint explicitly
    const url = new URL('/student', config.endpoint);
    url.searchParams.append('studentId', studentId);

    const response = await fetch(url.toString(), {
      method: config.method || 'GET',
      headers: {
        'Content-Type': config.contentType || 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        setMessage({ type: 'error', text: 'Student not found in Student Management System.' });
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log("Data: ", data);
    if (!data || Object.keys(data).length === 0) {
      setMessage({ type: 'error', text: 'Student not found in Student Management System.' });
      return;
    }

    // Map fields safely
    const student = {
      id: data.student.id ?? 'N/A',
      firstName: data.student.firstname ?? 'N/A',
      lastName: data.student.lastname ?? 'N/A',
      program: data.student.program ?? 'N/A',
      studyYear: data.student.studyYear ?? 'N/A',
      phone: data.student.phone ?? 'N/A',
    };

    setStudentData(student);
    setMessage({ type: 'success', text: 'Student data retrieved successfully.' });

  } catch (err) {
    console.error('Lookup failed:', err);
    if (err.name === 'AbortError') {
      setMessage({ type: 'error', text: 'Lookup request timed out.' });
    } else {
      setMessage({ type: 'error', text: `Lookup failed: ${err.message}` });
    }
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="p-4 w-[500px]">
      {message.text && (
        <div className="cursor-default w-full text-center text-xs font-semibold mb-2 truncate">
          <p
            className={
              message.type === 'warning'
                ? 'p-2 bg-yellow-50 text-yellow-500'
                : message.type === 'info'
                ? 'p-2 bg-blue-100 text-blue-500'
                : message.type === 'success'
                ? 'p-2 bg-green-100 text-green-500'
                : message.type === 'error'
                ? 'p-2 bg-red-100 text-red-500'
                : 'text-white'
            }
            title={message.type}
          >
            {message.text}
          </p>
        </div>
      )}

      <p className="text-sm text-gray-500 mb-4">
        Enter a student ID to lookup details from the Student Management System
      </p>

    <div className="input-group relative my-8 flex items-center border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <label className="pr-2 text-gray-500 text-sm border-r border-gray-200" htmlFor="StartDate">SID</label>

        <input 
        type="text" 
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
         placeholder="e.g 2200888" 
        name="roomName" 
        className="text-gray-700 ml-2 w-full border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"/>
    </div>

      <button
        type="button"
        onClick={handleLookup}
        className="w-full flex items-center justify-center gap-x-2 btn-primary disabled:opacity-50"
        disabled={loading || !config}
      >
        {loading && <div className="btn-loader"></div>}
        Lookup Student
      </button>

      {studentData && (
        <div className="mt-6 p-4 border border-gray-300 rounded bg-gray-50">
          <p className="text-lg mb-2 text-green-400 font-bold">Student is Eligible</p>
          <p><strong>ID:</strong> {studentData.id}</p>
          <p><strong>First Name:</strong> {studentData.firstName}</p>
          <p><strong>Last Name:</strong> {studentData.lastName}</p>
          <p><strong>Program:</strong> {studentData.program}</p>
          <p><strong>Year of Study:</strong> {studentData.studyYear}</p>
          {/* <p><strong>Phone:</strong> {studentData.phone}</p> */}
        </div>
      )}
    </div>
  );
};

export default StudentLookup;
