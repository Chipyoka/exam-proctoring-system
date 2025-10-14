import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
} from "firebase/firestore";
import { firestore } from "../../../../../shared/firebase";

const AssignInvigilator = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({});
  const [invigilators, setInvigilators] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionCourses, setSessionCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedInvigilator, setSelectedInvigilator] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [activePeriod, setActivePeriod] = useState(null);
  const [filteredInvigilators, setFilteredInvigilators] = useState([]);

  // --- Fetch invigilators ---
  useEffect(() => {
    const fetchInvigilators = async () => {
      try {
        const snap = await getDocs(collection(firestore, "invigilators"));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setInvigilators(list);
      } catch (err) {
        console.error("Error fetching invigilators:", err);
      }
    };
    fetchInvigilators();
  }, []);

  // --- Fetch active academic period ---
  useEffect(() => {
    const fetchActivePeriod = async () => {
      try {
        const q = query(
          collection(firestore, "academicPeriod"),
          where("status", "==", "active")
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const period = { id: snap.docs[0].id, ...snap.docs[0].data() };
          setActivePeriod(period);
        } else {
          setMessage({ type: "error", text: "No active academic period found." });
        }
      } catch (err) {
        console.error("Error fetching active period:", err);
      }
    };
    fetchActivePeriod();
  }, []);

  // --- Fetch exam sessions under active academic period ---
  useEffect(() => {
    const fetchSessions = async () => {
      if (!activePeriod) return;
      try {
        const q = query(
          collection(firestore, "examSessions"),
          where("academicPeriod", "==", doc(firestore, "academicPeriod", activePeriod.id))
        );
        const snap = await getDocs(q);
        const sessionsArr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSessions(sessionsArr);

        const escSnap = await getDocs(collection(firestore, "examSessionCourses"));
        const escArr = escSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setSessionCourses(escArr);

        const assignedSnap = await getDocs(collection(firestore, "examSessionInvigilators"));
        const assignedArr = assignedSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setAssignments(assignedArr);
      } catch (err) {
        console.error("Error fetching exam sessions:", err);
      }
    };
    fetchSessions();
  }, [activePeriod]);

  // --- Helper: get course ID + faculty for a session ---
  const getCourseForSession = (sessionId) => {
    const match = sessionCourses.find((esc) => esc.session?.id === sessionId);
    if (!match) return { courseId: null, faculty: null };
    return {
      courseId: match.course?.id || "Unknown",
      faculty: match.course?.faculty || null,
    };
  };

  // --- Filter invigilators by faculty and unassigned ---
  useEffect(() => {
    if (!selectedSession) {
      setFilteredInvigilators(invigilators);
      return;
    }

    const { faculty } = getCourseForSession(selectedSession);
    if (!faculty) {
      setFilteredInvigilators(invigilators);
      return;
    }

    // Get IDs of already assigned invigilators for this session
    const assignedIds = assignments
      .filter((a) => a.session?.id === selectedSession)
      .map((a) => a.invigilator?.id);

    const filtered = invigilators.filter(
      (inv) => inv.faculty === faculty && !assignedIds.includes(inv.id)
    );
    setFilteredInvigilators(filtered);
  }, [selectedSession, invigilators, assignments]);

  // --- Get next doc ID ---
  const getNextDocId = async (prefix, collectionName) => {
    const snap = await getDocs(collection(firestore, collectionName));
    let max = 0;
    snap.forEach((docSnap) => {
      const id = docSnap.id;
      if (id.startsWith(prefix)) {
        const num = parseInt(id.split("_")[1], 10);
        if (!isNaN(num) && num > max) max = num;
      }
    });
    return `${prefix}${max + 1}`;
  };

  // --- Check user role from backend ---
  const checkUserRole = async (uid) => {
    try {
      const response = await fetch(`http://localhost:4000/user-role/${uid}`);
      if (!response.ok) throw new Error("Failed to fetch role");
      const data = await response.json();
      return data.role;
    } catch (err) {
      console.error("Error checking role:", err);
      return null;
    }
  };

  // --- Assign invigilator to session ---
  const handleAssign = async (e) => {
    e.preventDefault();
    setMessage({});

    if (!selectedInvigilator)
      return setMessage({ type: "error", text: "Select an invigilator." });
    if (!selectedSession)
      return setMessage({ type: "error", text: "Select a session." });

    setLoading(true);

    try {
      const invDoc = invigilators.find(
        (i) => i.fullname === selectedInvigilator
      );
      if (!invDoc) throw new Error("Invigilator not found.");

      // --- Check role ---
      const role = await checkUserRole(invDoc.uid);
      if (role === null)
        throw new Error("Unable to determine role.");
      if (role === "admin") {
        setMessage({
          type: "error",
          text: "Admin users cannot be assigned as invigilators.",
        });
        setLoading(false);
        return;
      }

      const { faculty } = getCourseForSession(selectedSession);
      if (faculty && invDoc.faculty !== faculty) {
        setMessage({
          type: "error",
          text: "Invigilator faculty does not match course faculty.",
        });
        setLoading(false);
        return;
      }

      // --- Check if already assigned ---
      const alreadyAssigned = assignments.some(
        (a) =>
          a.session?.id === selectedSession &&
          a.invigilator?.id === invDoc.id
      );
      if (alreadyAssigned) {
        setMessage({
          type: "error",
          text: "This invigilator is already assigned to the selected session.",
        });
        setLoading(false);
        return;
      }

      const invigilatorRef = doc(firestore, "invigilators", invDoc.id);
      const sessionRef = doc(firestore, "examSessions", selectedSession);

      const newId = await getNextDocId("esi_", "examSessionInvigilators");
      const newRef = doc(firestore, "examSessionInvigilators", newId);

      await setDoc(newRef, {
        session: sessionRef,
        invigilator: invigilatorRef,
        assignedAt: new Date().toISOString(),
      });

      setMessage({ type: "success", text: "Invigilator assigned successfully!" });
      setSelectedInvigilator("");
      setSelectedSession("");
    } catch (err) {
      console.error("Error assigning invigilator:", err);
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-[650px] p-4">
      {message?.text && (
        <div
          className={`text-center text-xs font-semibold mb-2 p-2 ${
            message.type === "error"
              ? "bg-red-100 text-red-500"
              : message.type === "success"
              ? "bg-green-100 text-green-500"
              : "bg-yellow-100 text-yellow-500"
          }`}
        >
          {message.text}
        </div>
      )}

      <p className="text-sm text-gray-500 mb-6">
        Assign an <strong>invigilator</strong> to an active exam session.
      </p>

      <form onSubmit={handleAssign}>
        {/* Session selection using datalist */}
        <div className="input-group relative flex items-center border border-gray-300 px-3 py-2 mb-4">
          <label className="pr-2 text-gray-500 text-sm border-r border-gray-200">
            Exam Session
          </label>
          <input
            type="text"
            list="sessionList"
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            placeholder="Type course ID..."
            className="ml-2 text-gray-700 text-sm border-none outline-none bg-transparent w-full"
          />
          <datalist id="sessionList">
            {sessions.map((session) => {
              const { courseId } = getCourseForSession(session.id);
              return (
                <option key={session.id} value={session.id}>
                  {courseId}
                </option>
              );
            })}
          </datalist>
        </div>

        {/* Invigilator selection */}
        <div className="input-group relative flex items-center border border-gray-300 px-3 py-2 mb-4">
          <label className="pr-2 text-gray-500 text-sm border-r border-gray-200">
            Invigilator
          </label>
          <input
            type="text"
            list="invigilatorList"
            value={selectedInvigilator}
            onChange={(e) => setSelectedInvigilator(e.target.value)}
            placeholder="Type to search..."
            className="ml-2 text-gray-700 text-sm border-none outline-none bg-transparent w-full"
          />
          <datalist id="invigilatorList">
            {filteredInvigilators.map((inv) => (
              <option key={inv.id} value={inv.fullname} />
            ))}
          </datalist>
        </div>

        <button
          type="submit"
          className="w-full mt-6 btn-primary flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading && <div className="btn-loader"></div>}
          <p>Assign Invigilator</p>
        </button>
      </form>
    </div>
  );
};

export default AssignInvigilator;
