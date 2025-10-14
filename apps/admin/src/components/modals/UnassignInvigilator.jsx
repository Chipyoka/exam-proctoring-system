import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { firestore } from "../../../../../shared/firebase";

const UnassignInvigilator = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({});
  const [invigilators, setInvigilators] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionCourses, setSessionCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedInvigilator, setSelectedInvigilator] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [activePeriod, setActivePeriod] = useState(null);

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

  // --- Fetch exam sessions and assignments ---
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

  // --- Helper: get course ID for a session ---
  const getCourseForSession = (sessionId) => {
    const match = sessionCourses.find((esc) => esc.session?.id === sessionId);
    if (!match) return { courseId: null };
    return { courseId: match.course?.id || "Unknown" };
  };

  // --- Unassign invigilator from session ---
  const handleUnassign = async (e) => {
    e.preventDefault();
    setMessage({});

    if (!selectedInvigilator)
      return setMessage({ type: "error", text: "Select an invigilator." });
    if (!selectedSession)
      return setMessage({ type: "error", text: "Select a session." });

    setLoading(true);

    try {
      const invDoc = invigilators.find((i) => i.fullname === selectedInvigilator);
      if (!invDoc) throw new Error("Invigilator not found.");

      const existingAssignment = assignments.find(
        (a) =>
          a.session?.id === selectedSession &&
          a.invigilator?.id === invDoc.id
      );

      if (!existingAssignment) {
        setMessage({
          type: "error",
          text: "No assignment record found for this invigilator and session.",
        });
        setLoading(false);
        return;
      }

      await deleteDoc(doc(firestore, "examSessionInvigilators", existingAssignment.id));

      setMessage({
        type: "success",
        text: "Invigilator removed successfully.",
      });

      setSelectedInvigilator("");
      setSelectedSession("");
    } catch (err) {
      console.error("Error removing invigilator:", err);
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
        Unassign an <strong>invigilator</strong> from an active exam session.
      </p>

      <form onSubmit={handleUnassign}>
        {/* Session selection (datalist with course ID) */}
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
            {invigilators.map((inv) => (
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
          <p>Remove Invigilator</p>
        </button>
      </form>
    </div>
  );
};

export default UnassignInvigilator;
