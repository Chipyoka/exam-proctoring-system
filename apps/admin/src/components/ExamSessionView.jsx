import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '../../../../shared/firebase';
import useExamSessionStore from '../store/useRoomStore';

import { PlusCircle } from 'lucide-react';

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

    /**
     * Get user initials from first and last names
     * @param firstname the first name
     * @param lastname the lastname
     * @return an initial fl
     */
    function getInitials(firstName, lastName) {
        const first = (firstName || '').trim()[0]?.toUpperCase() ?? '';
        const last = (lastName || '').trim()[0]?.toUpperCase() ?? '';
        return `${first}${last}`;
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
      <div className="p-12 w-full h-full text-center">
        <h4 className="text-3xl">Get started</h4>
        <p>Select an exam session to view details</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 flex flex-col justify-center items-center h-full">
        <div className="loader"></div>
        <p className="mt-4">Loading session details...</p>
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
    <div className="h-full capitalize p-4 bg-white">
        {/* top row */}
        <div className="w-full flex justify-between items-center">
              {/* Academic Period */}
                {sessionData?.academicPeriod && (
                    <div className="">
                    <p className="text-sm text-gray-500">Academic Period</p>
                    <h4 className="text-lg text-gray-500 ">{sessionData.academicPeriod.name}</h4>
                    </div>
                )}
          

            {/* buttons for creating exam sessions, and adding rooms or academic periods*/}
            <div className="flex items-center justify-end gap-4">
                <button 
                    className="btn-primary-sm flex justify-center items-center gap-2 " 
                    title="Add new room"
                >
                    <PlusCircle className="w-4 h-4 " />
                    room
                </button>
                <button 
                    className="btn-primary-sm flex justify-center items-center gap-2" 
                    title="Register new academic period"
                >
                    <PlusCircle className="w-4 h-4 " />
                    Academic Period
                </button>
                <button 
                    className="btn-primary-sm flex justify-center items-center gap-2" 
                    title="Add new exam session">
                    <PlusCircle className="w-4 h-4 " />
                    exam session
                </button>
            </div>
        </div>

       <div className="overflow-y-auto h-[94%] p-2">
            {/* Exam sessions details card */}
            <div className="bg-gray-50 border border-gray-200 w-full max-w-full mt-4 px-4 py-2">
            <div className="flex justify-between items-center">
                <div>
                    {/* room numbers */}
                    <h4 className="text-2xl text-primary uppercase"> {sessionData?.room?.name || 'Unknown Room'}</h4>
                    <p>Capacity: <span className="font-semibold text-gray-500">{sessionData?.room?.capacity || '0'}</span> </p>
                </div>

                {/* Exam session status */}
                <div className="bg-white p-2" title="Exam Session Status">
                    <div className={`
                    font-medium flex justify-center items-center 
                    w-[8rem] max-w-[8rem] py-6 px-2 capitalize
                    ${
                        sessionData?.status === 'active' || sessionData?.status === 'in progress' 
                        ? 'bg-green-100 text-green-600'  // Green for success/completed
                        : sessionData?.status === 'pending'
                            ? 'bg-gray-100 text-gray-600'  // Gray for pending
                            : 'bg-yellow-100 text-yellow-600' // Yellow for unknown/others
                    }
                    `}>
                    {sessionData?.status}
                    </div>
                </div>
            </div>

                
                {/* session times and status */}
                <div className="flex items-center justify-between gap-4 my-2 border-y border-gray-300 py-4">
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

                {/* Courses and Invigilatoes */}
                <div className="flex justify-between items-center">
                    {/* Courses Section */}
                    <div>
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
                    </div>

                    {/* Invigilators Section */}
                    <div>
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
                </div>
            </div>

        {/* Students Section */}
            <div>
                <p className="text-sm my-2">List of scanned students <span>({sessionData?.students?.length || 0})</span></p>
            </div>
    
            {/* Student list */}
            <div className="mb-4">
                <div className="flex justify-start items-center gap-4">
                {sessionData?.students?.map(student => (
                    <div key={student.id} className="cursor-default hover:shadow-md student-card w-[9em] bg-gray-100 border border-gray-300 flex flex-col justify-center items-center transition delay-150 duration-300 ease-in-out hover:-translate-y-1 hover:scale-100">
                        {/* Update to use registered/stored image of student */}
                        <div className="rounded-full w-16 h-16 mt-2 overflow-hidden">
                            <img src={`https://placehold.co/500x500/0b445f/FFF?text=${getInitials(student.firstname,student.lastname)}`} alt={student.firstname} />
                        </div>
                        <div className="text-center mt-2 w-full">
                            <p className="text-md text-gray-500 font-bold"> {student.id}</p>
                            <p className="text-sm ">{student.firstname} {student.lastname}</p>
                            <p className="text-xs mb-2 text-gray-500">{student.program} - Year {student.studyYear}</p>
                            <p className={`
                                font-medium text-xs p-2 border-t border-gray-300 uppercase w-full
                                ${
                                    student.isVerified 
                                    ? 'bg-green-100 text-green-600'  // Green for success/completed
                                    : 'bg-gray-200 text-gray-600'  // Gray for pending
                                    
                                }
                                `}>{student.isVerified ? 'verified' : 'not verified'}</p>
                        </div>
                    
                    </div>
                ))}
                </div>
            </div>
       </div>

   
    </div>
  );
};

export default ExamSessionView;