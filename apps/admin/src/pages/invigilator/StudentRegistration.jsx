import { useEffect, useRef, useState } from 'react';
import { firestore } from '../../../../../shared/firebase';
import {writeBatch, doc, setDoc, collection, getDocs,getDoc, query, where } from 'firebase/firestore';
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

/** Face scan simulation - generates embedding as string */
const handleScanFace = async () => {
  pushMessage('Scanning face...');
  try {
    if (!human || !videoRef.current) throw new Error('Face scanner not ready');
    
    const result = await human.detect(videoRef.current);
    if (result.face.length === 0) {
      pushMessage('No face detected. Try again.');
      return;
    }

    // Generate embedding and ensure it's stored as a string
    const embedding = generateFaceEmbedding(result.face[0]);
    
    // Update studentData with embedding as string
    setStudentData(prev => ({
      ...prev,
      embedding: embedding
    }));

    pushMessage('Face scan successful! Embedding generated.');
    setStep(2); // proceed to form input
  } catch (err) {
    console.error(err);
    pushMessage('Face scan failed: ' + err.message);
  }
};

/** Generate face embedding and convert to string representation */
const generateFaceEmbedding = (faceData) => {
  try {
    // Safe number conversion function
    const safeNumber = (value) => {
      if (typeof value === 'number') return Number(value.toFixed(6));
      if (typeof value === 'string') return Number(parseFloat(value).toFixed(6));
      return 0;
    };

    // Extract facial features safely
    const embeddingArray = [
      safeNumber(faceData.rotation?.angle?.roll),
      safeNumber(faceData.rotation?.angle?.pitch),
      safeNumber(faceData.rotation?.angle?.yaw),
      safeNumber(faceData.box?.[0]), // x
      safeNumber(faceData.box?.[1]), // y
      safeNumber(faceData.box?.[2]), // width
      safeNumber(faceData.box?.[3]), // height
      safeNumber(faceData.confidence),
    ];

    // Add emotion scores if available
    if (faceData.emotion && typeof faceData.emotion === 'object') {
      Object.values(faceData.emotion).forEach(score => {
        embeddingArray.push(safeNumber(score));
      });
    }

    // Add mesh points if available (take first few key points safely)
    if (faceData.mesh && Array.isArray(faceData.mesh)) {
      faceData.mesh.flat().slice(0, 50).forEach(point => {
        if (Array.isArray(point)) {
          point.forEach(coord => embeddingArray.push(safeNumber(coord)));
        } else {
          embeddingArray.push(safeNumber(point));
        }
      });
    }

    // Convert to string representation
    const embeddingString = embeddingArray.join(',');

    console.log('Generated embedding string length:', embeddingString.length);
    return embeddingString;
  } catch (error) {
    console.error('Error generating embedding:', error);
    // Return a fallback embedding string
    return `fallback_${Date.now()}`;
  }
};

/** Save registration transactionally with batch write - DEBUGGED VERSION */
const handleSave = async () => {
  setSaving(true);
  pushMessage('Starting registration...');

  const db = await initDB();
  try {
    // Stage data in IndexedDB
    await db.put('stagedData', studentData, 'studentData');
    await db.put('stagedData', selectedCourses, 'selectedCourses');
    pushMessage('Data staged in IndexedDB.');

    // Validation
    if (!studentData.firstname || !studentData.lastname || !studentData.studentId) {
      throw new Error('Incomplete student information.');
    }
    if (!selectedCourses.length) throw new Error('No courses selected.');

    console.log('Student Data:', studentData);
    console.log('Selected Courses:', selectedCourses);

    // Create batch
    const batch = writeBatch(firestore);
    pushMessage('Initializing batch write...');

    // 1️⃣ Save student data
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
    pushMessage('✓ Student data added to batch');

    // 2️⃣ Save all course registrations in batch
    const registrationDocs = [];
    
    for (const course of selectedCourses) {
      try {
        const regRef = doc(collection(firestore, 'studentCourseRegistrations'));
        const courseRef = doc(firestore, 'courses', course.id);
        
        const registrationData = {
          student: studentRef,
          course: courseRef,
          studentId: studentData.studentId, // Add direct ID for querying
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

    // 3️⃣ Execute all operations atomically
    pushMessage('Committing batch to Firestore...');
    console.log('Batch operations:', {
      student: studentRef.path,
      registrations: registrationDocs.map(doc => ({
        course: doc.course,
        ref: doc.ref.path
      }))
    });

    await batch.commit();
    
    // Verify the writes
    pushMessage('Batch committed. Verifying writes...');
    
    // Check if student document was created
    const studentDoc = await getDoc(studentRef);
    if (!studentDoc.exists()) {
      throw new Error('Student document was not created');
    }
    pushMessage('✓ Student document verified');
    
    // Check if registration documents were created
    for (const regDoc of registrationDocs) {
      const docSnapshot = await getDoc(regDoc.ref);
      if (!docSnapshot.exists()) {
        throw new Error(`Registration document for ${regDoc.course} was not created`);
      }
      pushMessage(`✓ Registration for ${regDoc.course} verified`);
    }
    
    pushMessage(`✅ Successfully registered for ${selectedCourses.length} courses!`);
    setStep(3);

  } catch (err) {
    console.error('Batch registration failed:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      studentId: studentData.studentId,
      courseCount: selectedCourses.length
    });
    pushMessage('❌ Registration failed: ' + err.message);
    
    // Additional error information
    if (err.message.includes('permission') || err.message.includes('Permission')) {
      pushMessage('⚠️ Check Firestore security rules');
    }
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
          <input
            type="number"
            max="7"
            min="1"
            placeholder="Study Year"
            value={studentData.studyYear}
            onChange={e => setStudentData({ ...studentData, studyYear: e.target.value })}
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
