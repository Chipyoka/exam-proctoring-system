import { useEffect, useRef, useState } from 'react';
import useScannerStore from "../../store/useScannerStore";
import { useNavigate } from 'react-router-dom';

import { auth, firestore } from "../../../../../shared/firebase";
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc } from "firebase/firestore";

import Human from '@vladmandic/human'; 
import { openDB } from 'idb';

import Logo from '../../assets/eps-white.png'; 

const StudentVerification = () => {
  const sessionId = useScannerStore((state) => state.selectedExamSessionId);
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

  const [verificationPopup, setVerificationPopup] = useState(null);

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
        pushMessage("⚠️ No courses assigned for this session");
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
      pushMessage("❌ Failed to load registered students");
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

  /** Initialize Human.js */
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
      pushMessage(`✅ Synced ${syncedCount} verification logs.`);
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
    if (!human) return pushMessage("❗ Human.js not initialized");

    try {
      // Start camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      await new Promise(res => (videoRef.current.onloadedmetadata = res));
      await videoRef.current.play();

      // Detect face
      const result = await human.detect(videoRef.current);
      if (!result.face?.length) return pushMessage("⚠️ No face detected");

      const newEmbedding = result.face[0].embedding;
      let bestMatch = { score: 0, student: null };

      let studentsToCompare = students;
      if (attemptStudentId) {
        studentsToCompare = students.filter(s => s.id === attemptStudentId);
        if (!studentsToCompare.length) {
          pushMessage(`❌ Student ID not found`);
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
        // Success
        await updateDoc(doc(firestore, 'students', bestMatch.student.id), { isVerified: true });
        await logVerification({ studentId: bestMatch.student.id, scannedBy, result: 'success' });
        showVerificationPopup('success', bestMatch.student, () => scanAndVerify());

      } else {
        if (!attemptStudentId) {
          // First attempt failed, prompt for student ID
          const inputId = prompt("Face not recognized. Enter Student ID for second attempt:");
          if (inputId) return scanAndVerify(inputId);
        }

        // Second attempt failed
        await logVerification({ studentId: attemptStudentId || 'unknown', scannedBy, result: 'failure' });
        showVerificationPopup('failure');
      }

    } catch (err) {
      console.error("Scan error:", err);
      pushMessage(`❌ Scan failed: ${err.message}`);
    } finally {
      // Stop camera
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  };

  /** Initialization flow */
  useEffect(() => {
    const init = async () => {
      try {
        pushMessage("⏳ Initializing...");
        await initHuman();

        const user = auth.currentUser;
        if (!user) throw new Error("No logged in user");

        const inv = await fetchAssignedInvigilator(sessionId, user.uid);
        if (!inv) return pushMessage("❌ You are not assigned to this session.");
        setCurrentInvigilator(inv);
        pushMessage("✅ Invigilator verified, preparing scanner...");

        await fetchSessionData(sessionId);
        const regs = await fetchRegisteredStudents(sessionId);
        setStudents(regs);
        pushMessage(`✅ Loaded ${regs.length} registered students`);

        setLoading(false);
      } catch (err) {
        console.error(err);
        pushMessage(`❌ Initialization failed: ${err.message}`);
      }
    };

    init();
    window.addEventListener('online', syncStagedData);
    return () => window.removeEventListener('online', syncStagedData);
  }, []);

  /** UI */
  if (!sessionId) return (
    <div className="flex flex-col gap-2 items-center justify-center h-screen p-4">
      <h2 className="text-2xl text-red-400 font-bold">No session found</h2>
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
      <img src={Logo} alt="EPS" className="h-12 mb-2" />
      <div className="mx-auto max-w-md w-full">
        <div className="h-16 overflow-y-auto bg-gray-50 border border-gray-200 p-3 text-sm rounded">
          {messages.map((m, idx) => <p key={idx} className="mb-2 text-center">{m}</p>)}
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
        <button
          onClick={() => scanAndVerify()}
          className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Scan Face
        </button>
      </div>

      {verificationPopup}
    </div>
  );
};

export default StudentVerification;
