import { useEffect, useRef, useState } from 'react';
import { firestore } from '../../../../../shared/firebase';
import { doc, setDoc, collection, getDocs,getDoc, query, where } from 'firebase/firestore';
import Human from '@vladmandic/human'; // assuming Human.js is installed
import { openDB } from 'idb';

const StudentRegistration = () => {
  const videoRef = useRef(null);
  const [human, setHuman] = useState(null);

  const [activePeriod, setActivePeriod] = useState(null);
  const [registrationClosed, setRegistrationClosed] = useState(false);
  const [step, setStep] = useState(1);
  const [messages, setMessages] = useState([]);

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
  const pushMessage = (msg) => setMessages(prev => [...prev, msg]);

  /** Fetch active academic period */
/** Fetch active academic period */
useEffect(() => {
  const fetchActivePeriod = async () => {
    try {
      console.log("🔥 Fetching academic periods...");
      const periodSnap = await getDocs(collection(firestore, "academicPeriod")); // ✅ plural
      console.log("✅ Fetched documents:", periodSnap.docs.length);

      const periods = periodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("📘 Periods data:", periods);

      // Find active period
      const active = periods.find(p => p.status?.toLowerCase() === "active");
      console.log("🎯 Active period found:", active);

      if (!active) {
        console.warn("⚠️ No active academic period found.");
        setRegistrationClosed(true);
        pushMessage("No active academic period.");
        return;
      }

      // Check registration end date
      const now = new Date();
      const regEnd = active.registrationEnd?.toDate?.() || new Date(active.registrationEnd);
      console.log("🕒 Current time:", now.toISOString());
      console.log("📅 registrationEnd (raw):", active.registrationEnd);
      console.log("📅 registrationEnd (converted):", regEnd);

      if (!regEnd || regEnd < now) {
        console.warn("🚫 Registration closed for this academic period.");
        setRegistrationClosed(true);
        pushMessage("Registration closed for this academic period.");
        return;
      }

      setActivePeriod(active);
      pushMessage(`Active academic period loaded: ${active.id}`);

      // 🔹 Fetch courses for this active period
      console.log("📘 Fetching courses for period:", active.id);
      const apcSnap = await getDocs(collection(firestore, "academicPeriodCourses"));
      console.log("✅ academicPeriodCourses count:", apcSnap.docs.length);

    const coursesData = await Promise.all(
        apcSnap.docs.map(async docSnap => {
            const data = docSnap.data();

            // 🧩 Normalize academicPeriod for comparison
            let apRef = data.academicPeriod;
            let apId = null;

            if (typeof apRef === "string") {
            // Strip any leading slashes and split
            apId = apRef.replace(/^\/+/, "").split("/").pop();
            } else if (apRef?.id) {
            // Handle DocumentReference
            apId = apRef.id;
            }

            if (apId === active.id) {
            // 🔹 Extract courseId and fetch its data
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
      console.log("📚 Available courses:", validCourses);

      setAvailableCourses(validCourses);
      pushMessage("Courses for active academic period loaded.");
    } catch (err) {
      console.error("❌ Error fetching academic period:", err);
      setError("Failed to fetch academic period.");
    }
  };

  fetchActivePeriod();
}, []);



  /** Initialize Human.js and start video */
  useEffect(() => {
    const humanConfig = {
        backend: 'webgl',
        modelBasePath: '/models/',  // ✅ must start with / if models are in public/
        face: { enabled: true, detector: { rotation: true }, mesh: { enabled: true }, emotion: { enabled: true } },
        filter: { enabled: false },
        body: { enabled: false },
        hand: { enabled: false },
        };

    const initHuman = async () => {
      const h = new Human(humanConfig);
      await h.load();
      setHuman(h);

      if (videoRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    };
    initHuman();
  }, []);

  /** Face scan simulation */
  const handleScanFace = async () => {
    pushMessage('Scanning face...');
    try {
      if (!human || !videoRef.current) throw new Error('Face scanner not ready');
      const result = await human.detect(videoRef.current);
      if (result.face.length === 0) {
        pushMessage('No face detected. Try again.');
        return;
      }
      pushMessage('Face scan successful!');
      setStep(2); // proceed to form input
    } catch (err) {
      console.error(err);
      pushMessage('Face scan failed: ' + err.message);
    }
  };

  /** Save registration transactionally */
  const handleSave = async () => {
    setSaving(true);
    pushMessage('Starting registration...');

    const db = await initDB();
    try {
      await db.put('stagedData', studentData, 'studentData');
      await db.put('stagedData', selectedCourses, 'selectedCourses');
      pushMessage('Data staged in IndexedDB.');

      // Validation
      if (!studentData.firstname || !studentData.lastname || !studentData.studentId) {
        throw new Error('Incomplete student information.');
      }
      if (!selectedCourses.length) throw new Error('No courses selected.');

      // Commit to Firestore
      const studentRef = doc(firestore, 'students', studentData.studentId);
      await setDoc(studentRef, studentData);
      pushMessage('Student data saved.');

      for (const course of selectedCourses) {
        const regRef = doc(collection(firestore, 'studentCourseRegistration'));
        await setDoc(regRef, {
          student: studentRef,
          course: doc(firestore, 'courses', course.id),
        });
        pushMessage(`Registered for course: ${course.name}`);
      }

      pushMessage('All registration steps completed successfully!');
      setStep(3);
    } catch (err) {
      console.error(err);
      pushMessage('Registration failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (registrationClosed) return <div className="p-4 text-center text-red-600">Registration is closed.</div>;
  if (error) return <div className="p-4 text-center text-red-600">{error}</div>;

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-xl font-bold">Student Self-Registration</h2>

      {/* Step-wise messages */}
      <div className="mb-4">
        {messages.map((m, idx) => (
          <p key={idx} className="text-sm">{m}</p>
        ))}
      </div>

      {/* Step 1: Face Scan */}
      {step === 1 && (
        <div className="flex flex-col items-center gap-2">
          <video ref={videoRef} width={320} height={240} className="border border-gray-300" />
          <button className="btn-primary-sm" onClick={handleScanFace}>Scan Face</button>
        </div>
      )}

      {/* Step 2: Student Info Form */}
      {step === 2 && (
        <div className="flex flex-col gap-2 max-w-md">
          <input
            type="text"
            placeholder="First Name"
            value={studentData.firstname}
            onChange={e => setStudentData({ ...studentData, firstname: e.target.value })}
            className="border px-2 py-1"
          />
          <input
            type="text"
            placeholder="Last Name"
            value={studentData.lastname}
            onChange={e => setStudentData({ ...studentData, lastname: e.target.value })}
            className="border px-2 py-1"
          />
          <input
            type="text"
            placeholder="Student ID"
            value={studentData.studentId}
            onChange={e => setStudentData({ ...studentData, studentId: e.target.value })}
            className="border px-2 py-1"
          />
          <input
            type="text"
            placeholder="Program"
            value={studentData.program}
            onChange={e => setStudentData({ ...studentData, program: e.target.value })}
            className="border px-2 py-1"
          />

          <div className="mt-2">
            <p className="font-medium mb-1">Select Courses:</p>
            {availableCourses.map(course => (
              <label key={course.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  value={course.id}
                  checked={selectedCourses.some(c => c.id === course.id)}
                  onChange={e => {
                    if (e.target.checked) setSelectedCourses(prev => [...prev, course]);
                    else setSelectedCourses(prev => prev.filter(c => c.id !== course.id));
                  }}
                />
                {course.name} ({course.id})
              </label>
            ))}
          </div>

          <button className="btn-primary-sm mt-2" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Submit Registration'}
          </button>
        </div>
      )}

      {/* Step 3: Completion */}
      {step === 3 && (
        <div className="text-green-600 font-medium text-center">
          Registration completed successfully!
        </div>
      )}
    </div>
  );
};

export default StudentRegistration;
