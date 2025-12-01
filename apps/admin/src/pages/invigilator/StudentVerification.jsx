import { useEffect, useRef, useState } from 'react';
import useScannerStore from "../../store/useScannerStore";
import useAuthStore from "../../store/authStore";
import { useNavigate } from 'react-router-dom';

import { auth, firestore } from "../../../../../shared/firebase";
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc } from "firebase/firestore";

import Human from '@vladmandic/human'; 
import { openDB } from 'idb';

import Logo from '../../assets/eps-white.png'; 
import { LogOut} from 'lucide-react';

const StudentVerification = () => {
  const sessionId = useScannerStore((state) => state.selectedExamSessionId);
  const { inviLogout, inviUser } = useAuthStore();
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

  // 🎥 Camera states
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  document.title = "EPS - Student Verification";

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

  /** Fetch registered students */
  const fetchRegisteredStudents = async (sessionId) => {
    try {
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

      const studentSnap = await getDocs(
        query(
          collection(firestore, "studentCourseRegistrations"),
          where("course", "in", courseRefs)
        )
      );

      const students = [];
      for (const docSnap of studentSnap.docs) {
        const studentRef = docSnap.data().student;
        const studentDoc = await getDoc(studentRef);
        if (studentDoc.exists()) students.push({ id: studentDoc.id, ...studentDoc.data() });
      }

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
    try {
      await addDoc(collection(firestore, 'logs'), {
        studentId,
        scannedBy,
        result,
        sessionId,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error('Error logging verification:', err);
    }
  };

  /** Show popup for success or failure */
  const showVerificationPopup = (type, student = null, onNext = null) => {
    setVerificationPopup(
      <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
        <div className={`bg-white rounded-lg p-6 text-center w-80 ${type === 'failure' ? 'border-4 border-red-500' : 'border-4 border-green-500'}`}>
          <h2 className="text-xl font-bold mb-2">{type === 'success' ? 'Student Verified' : 'Verification Failed'}</h2>
          {student ? (
            <>
              <p><strong>ID:</strong> {student.id}</p>
              <p><strong>Name:</strong> {student.lastname} {student.firstname}</p>
              <p><strong>Program:</strong> {student.program}</p>
            </>
          ) : (
            <p className="text-red-600 font-semibold">Face did not match registered student</p>
          )}
          <button
            onClick={() => { setVerificationPopup(null); if(onNext) onNext(); }}
            className={`mt-4 px-4 py-2 rounded text-white ${type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  /** Scan and verify */
  const scanAndVerify = async (attemptStudentId = null) => {
    if (!human) return pushMessage("Human.js not initialized");
    if (!selectedDeviceId) return pushMessage("Please select a camera before scanning.");

    try {
      // Start selected camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selectedDeviceId } }
      });
      videoRef.current.srcObject = stream;
      await new Promise(res => (videoRef.current.onloadedmetadata = res));
      await videoRef.current.play();

      // Detect face
      const result = await human.detect(videoRef.current);
      if (!result.face?.length) return pushMessage("No face detected");

      const newEmbedding = result.face[0].embedding;
      let bestMatch = { score: 0, student: null };

      let studentsToCompare = students;
      if (attemptStudentId) {
        studentsToCompare = students.filter(s => s.id === attemptStudentId);
        if (!studentsToCompare.length) {
          pushMessage(`Student ID not found`);
          await logVerification({ studentId: attemptStudentId, scannedBy: auth.currentUser.uid, result: 'failure' });
          showVerificationPopup('failure');
          return;
        }
      }

      studentsToCompare.forEach(student => {
        if (!student.embedding || !Array.isArray(student.embedding)) return;
        const score = compareEmbeddings(newEmbedding.slice(0, 60), student.embedding);
        if (score > bestMatch.score) bestMatch = { score, student };
      });

      const scannedBy = auth.currentUser?.uid;

      if (bestMatch.score >= 0.45) {
        await updateDoc(doc(firestore, 'students', bestMatch.student.id), { isVerified: true });
        await logVerification({ studentId: bestMatch.student.id, scannedBy, result: 'success' });
        showVerificationPopup('success', bestMatch.student, () => scanAndVerify());
      } else {
        if (!attemptStudentId) {
          const inputId = prompt("Face not recognized. Enter Student ID for second attempt:");
          if (inputId) return scanAndVerify(inputId);
        }
        await logVerification({ studentId: attemptStudentId || 'unknown', scannedBy, result: 'failure' });
        showVerificationPopup('failure');
      }

    } catch (err) {
      console.error("Scan error:", err);
      pushMessage(`Scan failed: ${err.message}`);
    } finally {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
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

        // const user = auth.currentUser;
        if (!inviUser) throw new Error("No logged in user");

        const inv = await fetchAssignedInvigilator(sessionId, inviUser.uid);
        if (!inv) return pushMessage("You are not assigned to this session.");
        setCurrentInvigilator(inv);
        pushMessage("Invigilator verified, preparing scanner...");

        await fetchSessionData(sessionId);
        const regs = await fetchRegisteredStudents(sessionId);
        setStudents(regs);
        pushMessage(`Loaded ${regs.length} registered students`);

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

  /** Restart scanner (stop and reinitialize camera feed) */
const restartScanner = async () => {
  try {
    pushMessage("Restarting scanner...");

    // Stop any existing camera stream
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    // Request the same camera device again if user selected one
    const selectedCameraId = selectedCamera; // assuming you used selectedCamera state from camera selector
    const constraints = selectedCameraId
      ? { video: { deviceId: { exact: selectedCameraId } } }
      : { video: true };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoRef.current.srcObject = stream;

    await new Promise((resolve) => {
      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play();
        resolve();
      };
    });

    pushMessage("Scanner restarted successfully.");
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

    // Optional: reset states if needed
    setVerificationPopup(null);
    setMessages([]);
    setStudents([]);

    // Navigate back to main scanner page
    navigate('/invigilator/scanner');
  } catch (err) {
    console.error("Error stopping scanner:", err);
    pushMessage(`Failed to stop scanner: ${err.message}`);
  }
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
                 onClick={() => {stopScanner()}}
                className="w-28 mb-2 py-2 flex items-center justify-center gap-x-4 bg-red-400 text-gray-50 hover:bg-[#FF5252] transition-colors duration-300"
            >

             <div className="flex justify-center items-center gap-x-2">
                    <p>Stop Scanner</p>
            </div>
            </button>
        </div>

        <div className="flex flex-col md:flex-row justify-center mt-4 p-4">
            <button
            onClick={()=>{restartScanner()}}
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
        <video ref={videoRef} className="w-[360px] h-[260px] bg-black rounded-xl shadow-md"></video>

        {/* 🎥 Camera selection dropdown */}
        {!selectedDeviceId &&(
            <div>
                <p className=" hidden md:block text-xs text-yellow-600 font-bold px-4 py-2 bg-yellow-50 w-fit border border-yellow-400 mt-4">You have to select a camera to proceed</p>
                <p className="md:hidden text-xs text-yellow-600 mt-4 font-bold px-4 py-2 bg-yellow-50 w-fit border border-yellow-400">You must select a back camera</p>
            </div>
        )}
        <select
          className="mt-4 border border-gray-300 px-6 py-4 text-sm w-full md:max-w-md"
          value={selectedDeviceId}
          onChange={e => setSelectedDeviceId(e.target.value)}
        >
          <option value="">-- Select Camera --</option>
          {availableDevices.map((device, i) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${i + 1}`}
            </option>
          ))}
        </select>

        <button
          onClick={() => scanAndVerify()}
          disabled={!selectedDeviceId}
          className={`mt-4 transition ${selectedDeviceId ? 'btn-primary' : ' hidden'}`}
        >
          Scan Face
        </button>
      </div>

      {verificationPopup}
    </div>
  );
};

export default StudentVerification;
