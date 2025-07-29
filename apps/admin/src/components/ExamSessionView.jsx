import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '../../../../shared/firebase';
import useExamSessionStore from '../store/useRoomStore';

const ExamSessionView = () => {
  const { selectedExamSessionId, clearSelectedExamSessionId } = useExamSessionStore();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

    //   format timestamps

    /**
     * Format timestamp objects from firestore
     */
    function formatFirestoreTime(timestampObj) {
    // Convert Firestore timestamp to JavaScript Date
    const date = new Date(
        timestampObj.seconds * 1000 + timestampObj.nanoseconds / 1000000
    );

    // Format the time in 12-hour format with AM/PM
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
    }

    /**
     * Get duration from start and end times
     * @param time1Str
     * @param time3Str
     * @return duration as string
     */
    function getDuration( time1Str, time2Str) {
        // Parse time strings into Date objects (using arbitrary same date)
        const today = new Date();
        const date1 = parseTimeString(time1Str, today);
        const date2 = parseTimeString(time2Str, today);

        // Calculate difference in milliseconds
        const diffMs = date2 - date1;
        if (diffMs < 0) {
            throw new Error("time2 must be later than time1");
        }

        // Convert to hours and minutes
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        return `${diffHours}h ${diffMinutes}mins`;
        }

        // Helper function to parse '09:00 AM' into a Date
        function parseTimeString(timeStr, refDate) {
        const [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);

        // Convert 12-hour to 24-hour format
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        // Create a new Date using reference date (but override time)
        const date = new Date(refDate);
        date.setHours(hours, minutes, 0, 0);
        return date;
        }


  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (!selectedExamSessionId) {
        setSessionData(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Fetch main session document
        const sessionRef = doc(firestore, 'examSessions', selectedExamSessionId);
        const sessionSnap = await getDoc(sessionRef);
        
        if (!sessionSnap.exists()) {
          throw new Error('Exam session not found');
        }

        const session = sessionSnap.data();

        // 2. Fetch all related data using your schema relationships
        const [
          academicPeriod,
          room,
          sessionCourses,
          sessionStudents,
          sessionInvigilators
        ] = await Promise.all([
          // Academic Period
          session.academicPeriod ? getDoc(session.academicPeriod) : null,
          
          // Room
          session.room ? getDoc(session.room) : null,
          
          // Courses through examSessionCourses
          getDocs(query(
            collection(firestore, 'examSessionCourses'),
            where('session', '==', sessionRef)
          )),
          
          // Students through examSessionStudents
          getDocs(query(
            collection(firestore, 'examSessionStudents'),
            where('session', '==', sessionRef)
          )),
          
          // Invigilators through examSessionInvigilators
          getDocs(query(
            collection(firestore, 'examSessionInvigilators'),
            where('session', '==', sessionRef)
          ))
        ]);

        // 3. Process course data
        const courses = await Promise.all(
          sessionCourses.docs.map(async doc => {
            const courseRef = doc.data().course;
            const courseSnap = await getDoc(courseRef);
            return courseSnap.exists() ? {
              id: courseSnap.id,
              ...courseSnap.data()
            } : null;
          })
        ).then(results => results.filter(Boolean));

        // 4. Process student data
        const students = await Promise.all(
          sessionStudents.docs.map(async doc => {
            const studentRef = doc.data().student;
            const studentSnap = await getDoc(studentRef);
            return studentSnap.exists() ? {
              id: studentSnap.id,
              ...studentSnap.data(),
            //   status: doc.data().isVerified || 'pending',
              scanTime: doc.data().scanTime?.toDate()?.toLocaleString() || 'Not scanned'
            } : null;
          })
        ).then(results => results.filter(Boolean));

        // 5. Process invigilator data
        const invigilators = await Promise.all(
          sessionInvigilators.docs.map(async doc => {
            const invigilatorRef = doc.data().invigilator;
            const invigilatorSnap = await getDoc(invigilatorRef);
            return invigilatorSnap.exists() ? {
              id: invigilatorSnap.id,
              ...invigilatorSnap.data()
            } : null;
          })
        ).then(results => results.filter(Boolean));

        // 6. Compile all data
        setSessionData({
          id: sessionSnap.id,
          ...session,
          academicPeriod: academicPeriod?.exists() ? {
            id: academicPeriod.id,
            ...academicPeriod.data()
          } : null,
          room: room?.exists() ? {
            id: room.id,
            ...room.data()
          } : null,
          courses,
          students,
          invigilators,
          date: session.date || 'Date not set',
          startTime: formatFirestoreTime(session.startTime) || 'Time not set',
          endTime: formatFirestoreTime(session.endTime) || 'Time not set',
        });

        

      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
        setSessionData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [selectedExamSessionId]);

  console.log("full data:", sessionData);
  // Render states remain the same as previous solution
  // ... (loading, error, and empty states)
  // Render states
  if (!selectedExamSessionId) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p>Select an exam session to view details</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p>Loading session details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 font-medium">Error loading session</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button
          onClick={clearSelectedExamSessionId}
          className="mt-2 px-3 py-1 bg-red-100 text-red-600 rounded text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-700">No session data available</p>
      </div>
    );
  }
  // Main render with your schema data
  return (
    <div className="capitalize p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          {sessionData?.room?.name || 'Unknown Room'} - Exam Details
        </h2>
        <button onClick={clearSelectedExamSessionId}>×</button>
      </div>

      {/* Academic Period */}
      {sessionData?.academicPeriod && (
        <div className="mb-4">
          <p className="text-sm text-gray-500">Academic Period</p>
          <p className="font-medium">{sessionData.academicPeriod.name}</p>
        </div>
      )}

      {/* Date and Time */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500">Date</p>
          <p className="font-medium">{sessionData?.date}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Start Time</p>
          <p className="font-medium">{sessionData?.startTime}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">End Time</p>
          <p className="font-medium">{sessionData?.endTime}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Duration</p>
          <p className="font-medium">{getDuration(sessionData?.startTime, sessionData?.endTime)}</p>
        </div>
      </div>

      {/* Courses Section */}
      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-2">Courses ({sessionData?.courses?.length || 0})</p>
        <div className="flex flex-wrap gap-2">
          {sessionData?.courses?.map(course => (
            <span key={course.id} className="badge">
              {course.id} - {course.name}
            </span>
          ))}
        </div>
      </div>

      {/* Students Section */}
      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-2">Students ({sessionData?.students?.length || 0})</p>
        <div className="space-y-2">
          {sessionData?.students?.map(student => (
            <div key={student.id} className="student-card">
              {student.id} - {student.firstname} {student.lastname} - {student.isVerified ? 'verified' : 'not verified'}
            </div>
          ))}
        </div>
      </div>

      {/* Invigilators Section */}
      {sessionData?.invigilators?.length > 0 && (
        <div>
          <p className="text-sm text-gray-500 mb-2">Invigilators ({sessionData?.invigilators?.length || 0})</p>
          <ul>
            {sessionData.invigilators.map(inv => (
              <li key={inv.id}>{inv.firstname} {inv.lastname} - {inv.phone}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ExamSessionView;