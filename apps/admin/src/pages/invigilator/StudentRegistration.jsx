import { useEffect, useRef, useState } from 'react';
import { firestore } from '../../../../../shared/firebase';
import {writeBatch, doc, setDoc, collection, getDocs,getDoc, query, where } from 'firebase/firestore';
import Human from '@vladmandic/human'; // assuming Human.js is installed
import { openDB } from 'idb';
import {useNavigate} from 'react-router-dom';

import Logo from '../../assets/eps-white.png'; 
import { LogOut } from 'lucide-react';

const StudentRegistration = () => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [human, setHuman] = useState(null);

  const [activePeriod, setActivePeriod] = useState(null);
  const [registrationClosed, setRegistrationClosed] = useState(false);
  const [step, setStep] = useState(1);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');

  const [studentData, setStudentData] = useState({
    firstname: '',
    lastname: '',
    studentId: '',
    program: '',
  });

  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate(); 

/** IndexedDB for staging */
const initDB = async () => {
return openDB('studentRegistration', 1, {
    upgrade(db) {
    if (!db.objectStoreNames.contains('stagedData')) {
        db.createObjectStore('stagedData');
    }
    },
});
};


/** Helper for updating UI messages */
const pushMessage = (msg) => {
  setMessages(prev => [...prev, msg]);
  // Auto-scroll to bottom after message is added
  setTimeout(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, 100);
};

/** Get available video devices */
const getVideoDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    setAvailableDevices(videoDevices);
    
    if (videoDevices.length > 0 && !selectedDevice) {
      setSelectedDevice(videoDevices[0].deviceId);
    }
    
    console.log('Available video devices:', videoDevices);
  } catch (err) {
    console.error('Error enumerating devices:', err);
  }
};

/** Fetch active academic period */
useEffect(() => {
  const fetchActivePeriod = async () => {
    try {
      console.log(" Fetching academic periods...");
      const periodSnap = await getDocs(collection(firestore, "academicPeriod"));
      console.log(" Fetched documents:", periodSnap.docs.length);

      const periods = periodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(" Periods data:", periods);

      const active = periods.find(p => p.status?.toLowerCase() === "active");
      console.log(" Active period found:", active);

      if (!active) {
        console.warn(" No active academic period found.");
        setRegistrationClosed(true);
        pushMessage("No active academic period.");
        setLoading(false);
        return;
      }

      setActivePeriod(active);

      const now = new Date();
      const regEnd = active.registrationEnd?.toDate?.() || new Date(active.registrationEnd);
      console.log(" Current time:", now.toISOString());
      console.log(" registrationEnd (raw):", active.registrationEnd);
      console.log(" registrationEnd (converted):", regEnd);

      if (!regEnd || regEnd < now) {
        console.warn(" Registration closed for this academic period.");
        setRegistrationClosed(true);
        pushMessage("Registration closed for this academic period.");
        return;
      }

      setActivePeriod(active);
      pushMessage("Please wait...");

      console.log("Fetching courses for period:", active.id);
      const apcSnap = await getDocs(collection(firestore, "academicPeriodCourses"));
      console.log("academicPeriodCourses count:", apcSnap.docs.length);

      const coursesData = await Promise.all(
        apcSnap.docs.map(async docSnap => {
          const data = docSnap.data();
          let apRef = data.academicPeriod;
          let apId = null;

          if (typeof apRef === "string") {
            apId = apRef.replace(/^\/+/, "").split("/").pop();
          } else if (apRef?.id) {
            apId = apRef.id;
          }

          if (apId === active.id) {
            const courseRef = data.course;
            let courseId;

            if (typeof courseRef === "string") {
              courseId = courseRef.replace(/^\/+/, "").split("/").pop();
            } else if (courseRef?.id) {
              courseId = courseRef.id;
            }

            if (courseId) {
              const courseSnap = await getDoc(doc(firestore, "courses", courseId));
              if (courseSnap.exists()) {
                return { id: courseSnap.id, ...courseSnap.data() };
              }
            }
          }

          return null;
        })
      );

      const validCourses = coursesData.filter(Boolean);
      console.log(" Available courses:", validCourses);

      setAvailableCourses(validCourses);
      pushMessage("Scanner Ready");
      setLoading(false);

    } catch (err) {
      setLoading(false);
      console.error("Error fetching academic period:", err);
      setError("Failed to fetch academic period.");
    }
  };

  fetchActivePeriod();
}, []);

/** Initialize Human.js and get video devices */
useEffect(() => {
  const humanConfig = {
    backend: 'webgl',
    modelBasePath: '/models/',
    face: { enabled: true, detector: { rotation: true }, mesh: { enabled: true }, emotion: { enabled: true } },
    filter: { enabled: false },
    body: { enabled: false },
    hand: { enabled: false },
  };

  const initHuman = async () => {
    try {
      console.log('Initializing Human.js...');
      const h = new Human(humanConfig);
      await h.load();
      setHuman(h);
      console.log('Human.js initialized successfully');
      
      // Get available video devices
      await getVideoDevices();
    } catch (err) {
      console.error('Human.js initialization failed:', err);
      pushMessage(' Face scanner initialization failed: ' + err.message);
    }
  };

  initHuman();

  return () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };
}, []);

/** Start camera with selected device */
const startCameraWithDevice = async (deviceId) => {
  setShowVideo(true);
  await new Promise(resolve => setTimeout(resolve, 100));
  
  try {
    if (!videoRef.current) {
      throw new Error('Video element not found');
    }

    console.log('Requesting camera access...');
    pushMessage('Starting camera...');
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera access not supported in this browser');
    }

    const constraints = { 
      video: deviceId 
        ? { deviceId: { exact: deviceId } }
        : { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    console.log('Camera access granted');
    streamRef.current = stream;

    if (!videoRef.current) {
      stream.getTracks().forEach(track => track.stop());
      throw new Error('Video element disappeared');
    }

    videoRef.current.srcObject = stream;
    
    await new Promise((resolve, reject) => {
      if (!videoRef.current) return reject('Video element not found');
      
      videoRef.current.onloadedmetadata = () => {
        console.log('Video metadata loaded');
        resolve();
      };
      
      videoRef.current.onerror = () => {
        reject('Video playback error');
      };
      
      setTimeout(() => {
        reject('Video loading timeout');
      }, 5000);
    });

    await videoRef.current.play();
    console.log('Video playback started successfully');
    setCameraStarted(true);
    pushMessage(' Camera ready for face scanning');

  } catch (err) {
    console.error('Video initialization failed:', err);
    setShowVideo(false);
    
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      pushMessage('Camera access denied. Please allow camera permissions and refresh the page.');
    } else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
      pushMessage('No camera found or camera not compatible.');
    } else if (err.name === 'NotSupportedError') {
      pushMessage('Camera not supported in this browser.');
    } else {
      pushMessage('Failed to start camera: ' + err.message);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }
};

/** Start camera */
const handleStartCamera = async () => {
  await startCameraWithDevice(selectedDevice);
};

/** Stop camera */
const handleStopCamera = () => {
  if (streamRef.current) {
    streamRef.current.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }
  if (videoRef.current) {
    videoRef.current.srcObject = null;
  }
  setShowVideo(false);
  setCameraStarted(false);
  pushMessage('Camera stopped');
};

/** Switch camera device */
const handleSwitchCamera = async (deviceId) => {
  setSelectedDevice(deviceId);
  
  if (cameraStarted) {
    handleStopCamera();
    await new Promise(resolve => setTimeout(resolve, 300));
    await startCameraWithDevice(deviceId);
  }
};

/** Face scan */
const handleScanFace = async () => {
  pushMessage('Scanning face...');
  try {
    if (!human || !videoRef.current) throw new Error('Face scanner not ready');
    
    const result = await human.detect(videoRef.current);
    if (result.face.length === 0) {
      pushMessage('No face detected. Try again.');
      return;
    }

    const embedding = generateFaceEmbedding(result.face[0]);
    
    setStudentData(prev => ({
      ...prev,
      embedding: embedding
    }));

    pushMessage('Face scan successful! Embedding generated.');
    
    handleStopCamera();
    
    setStep(2);
  } catch (err) {
    console.error(err);
    pushMessage('Face scan failed: ' + err.message);
  }
};

/** Generate face embedding as array of numbers for Firestore */
const generateFaceEmbedding = (faceData) => {
  try {
    const safeNumber = (value) => {
      if (typeof value === 'number') return Number(value.toFixed(6));
      if (typeof value === 'string') return Number(parseFloat(value).toFixed(6));
      return 0;
    };

    const embeddingArray = [
      safeNumber(faceData.rotation?.angle?.roll),
      safeNumber(faceData.rotation?.angle?.pitch),
      safeNumber(faceData.rotation?.angle?.yaw),
      safeNumber(faceData.box?.[0]),
      safeNumber(faceData.box?.[1]),
      safeNumber(faceData.box?.[2]),
      safeNumber(faceData.box?.[3]),
      safeNumber(faceData.confidence),
    ];

    if (faceData.emotion && typeof faceData.emotion === 'object') {
      Object.values(faceData.emotion).forEach(score => {
        embeddingArray.push(safeNumber(score));
      });
    }

    if (faceData.mesh && Array.isArray(faceData.mesh)) {
      faceData.mesh.flat().slice(0, 50).forEach(point => {
        if (Array.isArray(point)) {
          point.forEach(coord => embeddingArray.push(safeNumber(coord)));
        } else {
          embeddingArray.push(safeNumber(point));
        }
      });
    }

    console.log('Generated embedding array length:', embeddingArray.length);
    return embeddingArray; // <--- RETURN THE ARRAY DIRECTLY
  } catch (error) {
    console.error('Error generating embedding:', error);
    return []; // fallback as empty array
  }
};


/** Save registration */
const handleSave = async () => {
  setSaving(true);
  pushMessage('Starting registration...');

  const db = await initDB();
  try {
    await db.put('stagedData', studentData, 'studentData');
    await db.put('stagedData', selectedCourses, 'selectedCourses');
    pushMessage('Data staged in IndexedDB.');

    if (!studentData.firstname || !studentData.lastname || !studentData.studentId) {
      throw new Error('Incomplete student information.');
    }
    if (!selectedCourses.length) throw new Error('No courses selected.');

    console.log('Student Data:', studentData);
    console.log('Selected Courses:', selectedCourses);

    const batch = writeBatch(firestore);
    pushMessage('Initializing batch write...');

    const studentRef = doc(firestore, 'students', studentData.studentId);
    const studentDataToSave = {
      firstname: studentData.firstname,
      lastname: studentData.lastname,
      program: studentData.program,
      studyYear: studentData.studyYear,
      isVerified: studentData.isVerified ?? false,
      embedding: studentData.embedding || "",
      createdAt: new Date().toISOString(),
    };
    
    console.log('Saving student data:', studentDataToSave);
    batch.set(studentRef, studentDataToSave);
    pushMessage('Student data added to batch');

    const registrationDocs = [];
    
    for (const course of selectedCourses) {
      try {
        const regRef = doc(collection(firestore, 'studentCourseRegistrations'));
        const courseRef = doc(firestore, 'courses', course.id);
        
        const registrationData = {
          student: studentRef,
          course: courseRef,
          studentId: studentData.studentId,
          courseId: course.id,
          registeredAt: new Date().toISOString(),
        };
        
        console.log(`Registration data for ${course.name}:`, registrationData);
        batch.set(regRef, registrationData);
        registrationDocs.push({ ref: regRef, course: course.name });
        
        pushMessage(`✓ Added registration for: ${course.name}`);
      } catch (courseErr) {
        console.error(`Error preparing registration for ${course.name}:`, courseErr);
        throw new Error(`Failed to prepare registration for ${course.name}`);
      }
    }

    pushMessage(`Prepared ${registrationDocs.length} course registrations`);

    console.log('Batch operations:', {
      student: studentRef.path,
      registrations: registrationDocs.map(doc => ({
        course: doc.course,
        ref: doc.ref.path
      }))
    });

    await batch.commit();
    
    const studentDoc = await getDoc(studentRef);
    if (!studentDoc.exists()) {
      throw new Error('Student document was not created');
    }
    pushMessage('Student document verified');
    
    for (const regDoc of registrationDocs) {
      const docSnapshot = await getDoc(regDoc.ref);
      if (!docSnapshot.exists()) {
        throw new Error(`Registration document for ${regDoc.course} was not created`);
      }
      console.log(`✓ Registration for ${regDoc.course} verified`);
    }
    
    pushMessage(` Successfully registered for ${selectedCourses.length} courses!`);
    setStep(3);

  } catch (err) {
    console.error('Batch registration failed:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      studentId: studentData.studentId,
      courseCount: selectedCourses.length
    });
    pushMessage(' Registration failed: ' + err.message);
    
    if (err.message.includes('permission') || err.message.includes('Permission')) {
      console.log('Check Firestore security rules');
    }
  } finally {
    setSaving(false);
  }
};



if (!activePeriod) return (
  <>
    <div className="bg-primary flex items-center justify-between p-4 mb-4 w-full">
      <img src={Logo} alt="Exam proctoring system" className="h-[33px]" />
      <p className="text-white">Self Registration</p>
    </div>
    <div className="px-4 py-12 mt-8 text-center text-red-600 bg-red-50 max-w-md mx-auto">
      <h3 className="text-2xl font-bold">Oops Error</h3>
      <p className="text-sm mb-2">Failed to load academic period</p>
      <p className="text-xs">Check your internet or contact support for assistance</p>
    </div>
    <div className="mx-auto max-w-md mt-4">
      <p onClick={() => navigate('/')} className="hyperlink text-center">Return home</p>
    </div>
  </>
);

if (registrationClosed) return (
  <>
    <div className="bg-primary flex items-center justify-between p-4 mb-4 w-full">
      <img src={Logo} alt="Exam proctoring system" className="h-[33px]" />
      <p className="text-white hidden md:block">Self Registration</p>
    </div>
    <div className="px-4 py-12 mt-8 text-center text-red-600 bg-red-50 max-w-md mx-auto">
      <h3 className="text-2xl font-bold">Registration unavailable.</h3>
      <p className="text-xs">Kindly contact support for assistance</p>
    </div>
    <div className="mx-auto max-w-md mt-4">
      <p onClick={() => navigate('/')} className="hyperlink text-center">Return home</p>
    </div>
  </>
);

if(loading) return (
  <div className="flex flex-col items-center justify-center h-screen text-gray-700">
    <div className="p-4 flex flex-col justify-center items-center h-full mt-6">
      <div className="loader"></div>
      <p className="mt-4">Loading Scanner...</p>
    </div>
  </div>
);

if (error) return <div className="p-4 text-center text-red-600">{error}</div>;

return (
  <>
    <div className="bg-primary flex items-center justify-between p-4 mb-4 w-full">
      <img src={Logo} alt="Exam proctoring system" className="h-[33px]" />
      <p className="text-white hidden md:block">Self Registration</p>
            <button
          onClick={() => {navigate('/')}}
          className="w-28 mb-2 py-2 flex items-center justify-center gap-x-4 bg-red-400 text-gray-50 hover:bg-[#FF5252] transition-colors duration-300"
        >
          <div className="flex justify-center items-center gap-x-2">
            <p>Logout</p>
            <LogOut className="w-5 h-5 text-gray-50" />
          </div>
        </button>
    </div>
    
    <div className="p-4 flex flex-col gap-4">
      {/* Messages Display - Fixed Height with Auto-scroll */}
        <div className="message-container">
          <div className="message-box">
              {messages.map((m, idx) => (
              <p key={idx} className={`message ${idx === messages.length - 1 ? 'active' : ''}`}>
                  {m}
              </p>
              ))}
              <div ref={messagesEndRef} />
            </div>
        </div>

      {/* Step 1: Face Scan */}
      {step === 1 && (
        <div className="flex flex-col items-center gap-3 ">
          {/* Camera Selection Dropdown */}
          {availableDevices.length > 1 && (
            <div className="w-full max-w-md">
              <label className="block text-sm font-medium mb-1">Select Camera:</label>
              <select
                value={selectedDevice}
                onChange={(e) => handleSwitchCamera(e.target.value)}
                className="w-full border border-gray-300  px-3 py-2 text-sm"
              >
                {availableDevices.map((device, idx) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>

              <div className="mt-2 mx-auto w-full md:max-w-md text-center flex flex-col items-center justify-center">
                  <p className=" hidden md:block text-xs text-yellow-600 font-bold px-4 py-2 bg-yellow-50 w-fit border border-yellow-400 mt-4">You have to select a camera to proceed</p>
                  <p className="md:hidden text-xs text-yellow-600 mt-4 font-bold px-4 py-2 bg-yellow-50 w-fit border border-yellow-400">You must select a front camera</p>
              </div>
            </div>
          )}

          {!showVideo ? (
            <button className="btn-primary-sm w-full md:max-w-md" onClick={handleStartCamera}>
              Start Camera
            </button>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                width={320} 
                height={240} 
                className="border border-gray-300 " 
              />
              <div className="flex flex-wrap gap-4">
                {cameraStarted && (
                  <button className="btn-primary-sm w-full md:max-w-md" onClick={handleScanFace}>
                    Scan Face
                  </button>
                )}
                <button 
                  className="px-4 py-2 bg-red-500 text-white text-xs hover:bg-red-600 w-full md:max-w-md uppercase"
                  onClick={handleStopCamera}
                >
                  Stop Camera
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Student Info Form */}
      {step === 2 && (
        <div className="flex flex-col gap-2 max-w-md mx-auto w-full">
          <input
            type="text"
            placeholder="First Name"
            value={studentData.firstname}
            onChange={e => setStudentData({ ...studentData, firstname: e.target.value })}
            className="border px-3 py-2 "
          />
          <input
            type="text"
            placeholder="Last Name"
            value={studentData.lastname}
            onChange={e => setStudentData({ ...studentData, lastname: e.target.value })}
            className="border px-3 py-2 "
          />
          <input
            type="text"
            placeholder="Student ID"
            value={studentData.studentId}
            onChange={e => setStudentData({ ...studentData, studentId: e.target.value })}
            className="border px-3 py-2 "
          />
          <input
            type="text"
            placeholder="Program"
            value={studentData.program}
            onChange={e => setStudentData({ ...studentData, program: e.target.value })}
            className="border px-3 py-2 "
          />
          <input
            type="number"
            max="7"
            min="1"
            placeholder="Study Year"
            value={studentData.studyYear}
            onChange={e => setStudentData({ ...studentData, studyYear: e.target.value })}
            className="border px-3 py-2 "
          />

          <div className="mt-2">
            <p className="font-medium mb-2">Select Courses:</p>
            <div className="max-h-48 overflow-y-auto border border-gray-200  p-2">
              {availableCourses.map(course => (
                <label key={course.id} className="flex items-center gap-2 mb-2 cursor-pointer hover:bg-gray-50 p-2 ">
                  <input
                    type="checkbox"
                    value={course.id}
                    checked={selectedCourses.some(c => c.id === course.id)}
                    onChange={e => {
                      if (e.target.checked) setSelectedCourses(prev => [...prev, course]);
                      else setSelectedCourses(prev => prev.filter(c => c.id !== course.id));
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{course.name} ({course.id})</span>
                </label>
              ))}
            </div>
          </div>

          <button className="btn-primary-sm mt-3" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Submit Registration'}
          </button>
        </div>
      )}

      {/* Step 3: Completion */}
      {step === 3 && (
        <div className="text-green-600 font-medium text-center max-w-md mx-auto">
          <div className="bg-green-50 border border-green-200  p-6">
            <p className="text-lg">Registration completed successfully!</p>
            <button 
              onClick={() => navigate('/')} 
              className="mt-4 btn-primary-sm"
            >
              Return Home
            </button>
          </div>
        </div>
      )}
    </div>
  </>
);
};

export default StudentRegistration;