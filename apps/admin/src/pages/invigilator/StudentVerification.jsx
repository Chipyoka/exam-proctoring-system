import { useEffect, useRef, useState } from 'react';
import useScannerStore from "../../store/useScannerStore";
import useAuthStore from "../../store/authInviStore";
import { useNavigate } from 'react-router-dom';

import { auth, firestore } from "../../../../../shared/firebase";
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc } from "firebase/firestore";

import Human from '@vladmandic/human'; 
import { openDB } from 'idb';
import toast from 'react-hot-toast';

import Logo from '../../assets/eps-white.png'; 
import { LogOut} from 'lucide-react';

const StudentVerification = () => {
  const sessionId = useScannerStore((state) => state.selectedExamSessionId);
  const { logout, inviUser } = useAuthStore();
  const navigate = useNavigate();

  const messagesEndRef = useRef(null);
  const videoRef = useRef(null);

  const [human, setHuman] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [currentInvigilator, setCurrentInvigilator] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [selectedCamera, setSelectedCamera] = useState(null);

  const [verificationPopup, setVerificationPopup] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // 🎥 Camera states
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  document.title = "EPS - Invigilator Student Verification";

  /** IndexedDB setup */
  const initDB = async () => openDB('studentVerification', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('stagedData')) db.createObjectStore('stagedData');
    },
  });

  const pushMessage = (msg) => {
    setMessages(prev => [...prev, msg]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  /** Fetch session data */
  const fetchSessionData = async (sessionId) => {
    const sessionSnap = await getDoc(doc(firestore, 'examSessions', sessionId));
    if (!sessionSnap.exists()) throw new Error("Session not found");
    return sessionSnap.data();
  };

  /** Fetch registered students with academic period check */
  const fetchRegisteredStudents = async (sessionId) => {
    try {
      // Get session to find its academic period
      const sessionDoc = await getDoc(doc(firestore, 'examSessions', sessionId));
      if (!sessionDoc.exists()) {
        pushMessage("Session not found");
        return [];
      }

      const sessionData = sessionDoc.data();
      const academicPeriodRef = sessionData.academicPeriod;
      
      if (!academicPeriodRef) {
        pushMessage("Session has no academic period assigned");
        return [];
      }

      // Get academic period ID for querying
      let academicPeriodId;
      if (typeof academicPeriodRef === 'string') {
        academicPeriodId = academicPeriodRef.split('/').pop();
      } else if (academicPeriodRef.id) {
        academicPeriodId = academicPeriodRef.id;
      } else {
        pushMessage("Invalid academic period reference");
        return [];
      }

      const escSnap = await getDocs(
        query(
          collection(firestore, "examSessionCourses"),
          where("session", "==", doc(firestore, "examSessions", sessionId))
        )
      );

      const courseRefs = escSnap.docs.map(d => d.data().course);
      if (!courseRefs.length) {
        pushMessage("No courses assigned for this session");
        return [];
      }

      // Get students registered for this academic period and courses
      const studentSnap = await getDocs(
        query(
          collection(firestore, "studentCourseRegistrations"),
          where("course", "in", courseRefs),
          where("academicPeriodId", "==", academicPeriodId)
        )
      );

      const students = [];
      for (const docSnap of studentSnap.docs) {
        const studentRef = docSnap.data().student;
        const studentDoc = await getDoc(studentRef);
        if (studentDoc.exists()) {
          const studentData = studentDoc.data();
          students.push({ 
            id: studentDoc.id, 
            ...studentData,
            // Add registration context
            isRegisteredForPeriod: true
          });
        }
      }
      console.log("TT", students);
      return students;
    } catch (err) {
      console.error("Error fetching registered students:", err);
      pushMessage("Failed to load registered students");
      return [];
    }
  };

  /** Check assigned invigilator */
  const fetchAssignedInvigilator = async (sessionId, uid) => {
    const invSnap = await getDocs(
      query(
        collection(firestore, 'examSessionInvigilators'),
        where('session', '==', doc(firestore, 'examSessions', sessionId))
      )
    );
    const assigned = invSnap.docs.find(d => d.data().invigilator?.id?.includes(uid));
    return assigned ? assigned.data() : null;
  };

  /** 
   * Initialize Human.js the model responsible for facial scan.
   * powering accurate face detection, embedding extraction, and consistent vector outputs
   * */
  const initHuman = async () => {
    const humanConfig = {
      backend: 'webgl',
      modelBasePath: '/models/',
      face: { enabled: true, detector: { rotation: true }, mesh: { enabled: true }, emotion: { enabled: true } },
      filter: { enabled: false },
      body: { enabled: false },
      hand: { enabled: false },
    };

    const h = new Human(humanConfig);
    await h.load();
    setHuman(h);
  };

  /** Sync staged data */
  const syncStagedData = async () => {
    const db = await initDB();
    const allKeys = await db.getAllKeys('stagedData');
    if (!allKeys.length) return;

    setSyncing(true);
    setSyncProgress(0);
    let syncedCount = 0;

    for (const key of allKeys) {
      const record = await db.get('stagedData', key);
      try {
        await addDoc(collection(firestore, 'verificationLogs'), { ...record, syncedAt: new Date() });
        await db.delete('stagedData', key);
        syncedCount++;
        setSyncProgress(Math.round((syncedCount / allKeys.length) * 100));
       
      } catch (err) {
        console.error("Sync failed for record:", key, err);
      }
    }


    setTimeout(() => {
      setSyncing(false);
      setSyncProgress(0);
      pushMessage(`Synced ${syncedCount} verification logs.`);
       toast.success(`Cloud Synced`);
    }, 800);
  };

  /** Compare embeddings using cosine similarity */
  const compareEmbeddings = (a, b) => {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;

    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
  };

  /** Log verification attempt */
const logVerification = async ({ studentId, scannedBy, result }) => {
  const record = {
    studentId,
    scannedBy,
    result,
    sessionId,
    timestamp: new Date(),
  };

  try {
    if (navigator.onLine) {
      await addDoc(collection(firestore, 'logs'), record);
    } else {
      // Store offline for later sync
      const db = await initDB();
      const key = `${studentId}_${Date.now()}`; // unique key
      await db.put('stagedData', record, key);
      console.log('Verification attempt stored offline:', record);
    }
  } catch (err) {
    console.error('Error logging verification:', err);
  }
};
const isStudentAlreadyVerified = async (studentId) => {
  const db = await initDB();
  const allRecords = await db.getAll('stagedData');
  // Check if a success record exists for this student in stagedData
  const offlineSuccess = allRecords.some(r => r.studentId === studentId && r.result === 'success');
  return offlineSuccess;
};


  /** Show popup for success or failure */
  const showVerificationPopup = (type, student = null, message = null) => {
    setVerificationPopup(
      <div className="fixed inset-0 bg-black/50 bg-opacity-70 flex flex-col items-center justify-center z-50">
        <div className={`bg-white rounded-lg p-6 text-center w-80 ${type === 'failure' ? 'border-4 border-red-500' : type === 'success' ? 'border-4 border-green-500' : 'border-4 border-blue-500'}`}>
          <h2 className="text-xl font-bold mb-2">
            {type === 'success' ? 'Student Verified' : 
             type === 'failure' ? 'Verification Failed' : 
             'Already Verified'}
          </h2>
          {student ? (
            <>
              <p><strong>ID:</strong> {student.id}</p>
              <p><strong>Name:</strong> {student.lastname} {student.firstname}</p>
              <p><strong>Program:</strong> {student.program}</p>
              {message && <p className="text-blue-600 font-semibold mt-2">{message}</p>}
            </>
          ) : (
            <p className="text-red-600 font-semibold">{message || 'Face did not match registered student'}</p>
          )}
          <button
            onClick={() => { 
              setVerificationPopup(null); 
              setCameraReady(true); // Keep camera ready for next student
            }}
            className={`mt-4 px-4 py-2 rounded text-white ${
              type === 'success' ? 'bg-green-600 hover:bg-green-700' : 
              type === 'failure' ? 'bg-red-600 hover:bg-red-700' : 
              'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  /** Start camera only - no scanning yet */
  const startCamera = async () => {
    if (!selectedDeviceId) {
      pushMessage("Please select a camera first");
      return;
    }

    try {
      pushMessage("Starting camera...");
      
      // Stop any existing camera stream
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selectedDeviceId } }
      });
      
      videoRef.current.srcObject = stream;
      await new Promise(res => (videoRef.current.onloadedmetadata = res));
      await videoRef.current.play();
      
      setCameraReady(true);
      pushMessage("Camera ready - position student and click 'Detect Face'");
      
    } catch (err) {
      console.error("Camera error:", err);
      pushMessage(`Camera failed to start: ${err.message}`);
      setCameraReady(false);
    }
  };

  /** Detect face with smart retries - NO AUTO LOGGING ON FAILURE */
  const detectFaceWithRetry = async (retryCount = 0) => {
    if (!human) {
      pushMessage("Human.js not initialized");
      return null;
    }
    if (!cameraReady) {
      pushMessage("Camera not ready");
      return null;
    }
    
    setIsScanning(true);
    pushMessage(retryCount === 0 ? "Detecting face..." : `Retrying detection... (${retryCount}/2)`);

    try {
      const result = await human.detect(videoRef.current);
      
      if (!result.face?.length) {
        if (retryCount < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return detectFaceWithRetry(retryCount + 1);
        } else {
          pushMessage("No face detected after 3 attempts");
          return null;
        }
      }

      pushMessage("Face detected - processing...");
      return result.face[0].embedding;
      
    } catch (err) {
      console.error("Detection error:", err);
      pushMessage(`Detection failed: ${err.message}`);
      return null;
    } finally {
      setIsScanning(false);
    }
  };

  /** Manual ID fallback with proper failure logging */
  const handleManualIdFallback = async () => {
    const inputId = prompt("Face not recognized. Enter Student ID for manual verification:");
    
    if (!inputId) {
      pushMessage("Manual verification cancelled");
      return;
    }

    pushMessage(`Manual ID entered: ${inputId}`);
    
    // Find student by ID
    const student = students.find(s => s.id === inputId);
    if (!student) {
      pushMessage(`Student ID ${inputId} not found in registered students`);
      // LOG FAILURE - manual ID failed
      await logVerification({ 
        studentId: inputId, 
        scannedBy: auth.currentUser.uid, 
        result: 'failure' 
      });
      showVerificationPopup('failure', null, 'Student not registered for this academic period');
      return;
    }

    const alreadyVerifiedOffline = await isStudentAlreadyVerified(student.id);

    if (student.isVerified || alreadyVerifiedOffline) {
      pushMessage(`Student ${student.id} is already verified`);
      showVerificationPopup('info', student, 'Student has already been verified - no action needed');
      return; // do not log
    }

    // Try face detection again with specific student
    pushMessage("Verifying face against manual ID...");
    const embedding = await detectFaceWithRetry();
    
    if (!embedding) {
      pushMessage("Could not detect face for manual verification");
      // LOG FAILURE - face detection failed after manual ID
      await logVerification({ 
        studentId: inputId, 
        scannedBy: auth.currentUser.uid, 
        result: 'failure' 
      });
      showVerificationPopup('failure');
      return;
    }

    // Compare with specific student's embedding
    if (!student.embedding || !Array.isArray(student.embedding)) {
      pushMessage("No facial data available for this student");
      // LOG FAILURE - no embedding data
      await logVerification({ 
        studentId: inputId, 
        scannedBy: auth.currentUser.uid, 
        result: 'failure' 
      });
      showVerificationPopup('failure');
      return;
    }

    console.log("captured embedding:", embedding.slice(0, 60));
    const score = compareEmbeddings(embedding.slice(0, 60), student.embedding);
    const scannedBy = auth.currentUser?.uid;
    console.log("Manual ID match score:", score);

    if (score >= 0.30) {
      await updateDoc(doc(firestore, 'students', student.id), { isVerified: true });
      await logVerification({ studentId: student.id, scannedBy, result: 'success' });
      showVerificationPopup('success', student);
    } else {
      pushMessage(`Face match score too low: ${score.toFixed(3)}`);
      // LOG FAILURE - face doesn't match manual ID
      await logVerification({ 
        studentId: inputId, 
        scannedBy: auth.currentUser.uid, 
        result: 'failure' 
      });
      showVerificationPopup('failure');
    }
  };

  /** Main detection and verification flow */
  const detectAndVerify = async () => {
    // Step 1: Detect face with retries
    const embedding = await detectFaceWithRetry();
    
    if (!embedding) {
      // Face detection failed - offer manual ID input
      await handleManualIdFallback();
      return;
    }

    // Step 2: Find best match among all students
    let bestMatch = { score: 0, student: null };
    
    students.forEach(student => {
      if (!student.embedding || !Array.isArray(student.embedding)) return;
      const score = compareEmbeddings(embedding.slice(0, 60), student.embedding);
      if (score > bestMatch.score) bestMatch = { score, student };
      console.log(`Compared with ${student.id}, score: ${score.toFixed(3)}`);
    });

    const scannedBy = auth.currentUser?.uid;

    // Step 3: Handle verification result
    if (bestMatch.score >= 0.30) {
        const alreadyVerifiedOffline = await isStudentAlreadyVerified(bestMatch.student.id);

        if (bestMatch.student.isVerified || alreadyVerifiedOffline) {
          // Blue popup: already verified, do NOT log as success
          pushMessage(`Student ${bestMatch.student.id} is already verified`);
          showVerificationPopup('info', bestMatch.student, 'Student has already been verified - no action needed');
          return; // exit early, do NOT update Firestore or log as success
        }

        // First-time verification
        const scannedBy = auth.currentUser?.uid;
        await updateDoc(doc(firestore, 'students', bestMatch.student.id), { 
          isVerified: true,
          lastVerifiedAt: new Date(),
          verifiedBy: scannedBy
        });

        // Log verification (online or offline)
        await logVerification({ studentId: bestMatch.student.id, scannedBy, result: 'success' });

        showVerificationPopup('success', bestMatch.student);

    } else {
      pushMessage(`Best match score too low: ${bestMatch.score.toFixed(3)}`);
      // Face detection succeeded but no good match - offer manual ID
      await handleManualIdFallback();
    }
  };

  /** Initialize everything */
  useEffect(() => {
    const init = async () => {
      try {
        pushMessage("Initializing...");
        await initHuman();

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);

        if (!inviUser) throw new Error("No logged in user");

        const inv = await fetchAssignedInvigilator(sessionId, inviUser.uid);
        if (!inv) return pushMessage("You are not assigned to this session.");
        setCurrentInvigilator(inv);
        pushMessage("Invigilator verified, preparing scanner...");

        await fetchSessionData(sessionId);
        const regs = await fetchRegisteredStudents(sessionId);
        setStudents(regs);
        pushMessage(`Loaded ${regs.length} registered students for this academic period`);

        setLoading(false);
      } catch (err) {
        console.error(err);
        pushMessage(`Initialization failed: ${err.message}`);
      }
    };

    init();
    window.addEventListener('online', syncStagedData);
    return () => window.removeEventListener('online', syncStagedData);
  }, []);

  /** Restart scanner */
  const restartScanner = async () => {
    try {
      pushMessage("Restarting scanner...");
      setCameraReady(false);
      setIsScanning(false);

      // Stop any existing camera stream
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }

      await startCamera();
      
    } catch (err) {
      console.error("Restart scanner failed:", err);
      pushMessage(`Failed to restart scanner: ${err.message}`);
    }
  };

  /** Stop scanner and return to scanner selection screen */
  const stopScanner = () => {
    try {
      pushMessage("Stopping scanner...");

      // Stop any running camera stream
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }

      // Reset states
      setVerificationPopup(null);
      setMessages([]);
      setStudents([]);
      setCameraReady(false);
      setIsScanning(false);

      // Navigate back to main scanner page
      navigate('/invigilator/scanner');
    } catch (err) {
      console.error("Error stopping scanner:", err);
      pushMessage(`Failed to stop scanner: ${err.message}`);
    }
  };

  /** Handle camera selection change */
  const handleCameraChange = (deviceId) => {
    setSelectedDeviceId(deviceId);
    setCameraReady(false); // Reset camera ready state when camera changes
  };

  /** UI */
  if (!sessionId) return (
    <div className="flex flex-col gap-2 items-center justify-center h-screen p-4">
      <h2 className="text-2xl text-red-400 font-bold">No session found</h2>
      <p className="text-red-400">Go back and select a room to scan</p>
      <button className="btn-primary mt-4" onClick={() => navigate('/invigilator/scanner')}>Go Back</button>
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen text-center">
      <div className="loader mb-3"></div>
      <p>Preparing Scanner...</p>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-start h-screen bg-gray-100 p-4">
      <div className="bg-primary flex items-start justify-between p-4 mb-4 w-full">
        <img src={Logo} alt="Exam proctoring system" className="h-[33px]" />
        <button
          onClick={stopScanner}
          className="w-28 mb-2 py-2 flex items-center justify-center gap-x-4 bg-red-400 text-gray-50 hover:bg-[#FF5252] transition-colors duration-300"
        >
          <div className="flex justify-center items-center gap-x-2">
            <p>Stop Scanner</p>
          </div>
        </button>
      </div>

      <div className="flex flex-col md:flex-row justify-center mt-4 p-4 gap-4">
        <button
          onClick={restartScanner}
          className="btn-primary-outlined-2 transition-colors duration-300"
        >
          Restart Scanner
        </button>
      </div>

      {/* push messages */}
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

      {syncing && (
        <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5 mt-3">
          <div className="bg-green-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${syncProgress}%` }} />
        </div>
      )}

      <div className="mt-6 flex flex-col items-center">
        <video 
          ref={videoRef} 
          className="w-[360px] h-[260px] bg-black rounded-xl shadow-md"
        ></video>

        {/* 🎥 Camera selection dropdown */}
        {!selectedDeviceId && (
          <div>
            <p className="hidden md:block text-xs text-yellow-600 font-bold px-4 py-2 bg-yellow-50 w-fit border border-yellow-400 mt-4">
              You have to select a camera to proceed
            </p>
            <p className="md:hidden text-xs text-yellow-600 mt-4 font-bold px-4 py-2 bg-yellow-50 w-fit border border-yellow-400">
              You must select a back camera
            </p>
          </div>
        )}
        
        <select
          className="mt-4 border border-gray-300 px-6 py-4 text-sm w-full md:max-w-md"
          value={selectedDeviceId}
          onChange={e => handleCameraChange(e.target.value)}
        >
          <option value="">-- Select Camera --</option>
          {availableDevices.map((device, i) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${i + 1}`}
            </option>
          ))}
        </select>

        {/* Two-button approach */}
        <div className="flex flex-col gap-2 mt-4 w-full md:max-w-md">
          {!cameraReady ? (
            <button
              onClick={startCamera}
              disabled={!selectedDeviceId || isScanning}
              className={`btn-primary ${!selectedDeviceId ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Start Camera
            </button>
          ) : (
            <button
              onClick={detectAndVerify}
              disabled={isScanning}
              className={`btn-primary ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isScanning ? 'Scanning...' : 'Detect Face'}
            </button>
          )}
        </div>
      </div>

      {verificationPopup}
    </div>
  );
};

export default StudentVerification;