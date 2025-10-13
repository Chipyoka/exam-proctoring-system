import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '../../../../shared/firebase';
import useCourseStore from '../store/useCourseStore';

import useModalStore from '../store/useModalStore';

import Modal from './modals/Modal';
import AddConfig from './modals/AddConfig';
import StudentLookup from './modals/StudentLookup';

import { Settings, Search } from 'lucide-react';
import StudentCard from './StudentCard';


const RegisteredStudentsView = () => {
   const { openModal } = useModalStore();
  // State management
  const { selectedCourseId, clearSelectedCourseId } = useCourseStore();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  // Search functionality
  const handleSearch = () => {
    if (!searchInput.trim() || !sessionData?.allStudents) {
      setSearchResults(null);
      return;
    }

    const query = searchInput.trim().toLowerCase();
    const results = sessionData.allStudents.filter(student => 
      student.id.toLowerCase().includes(query) || 
      student.firstname?.toLowerCase().includes(query) ||
      student.lastname?.toLowerCase().includes(query) ||
      student.program?.toLowerCase().includes(query)
    );

    setSearchResults(results);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchResults(null);
  };

  // Data fetching
  useEffect(() => {
    const fetchCourseDetails = async () => {
      if (!selectedCourseId) {
        setSessionData(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Fetch course document
        const courseRef = doc(firestore, 'courses', selectedCourseId);
        const courseSnap = await getDoc(courseRef);
        
        if (!courseSnap.exists()) throw new Error('Course not found');
        const course = { id: courseSnap.id, ...courseSnap.data() };

        // 2. Find all exam sessions for this course
        const examSessionCoursesQuery = query(
          collection(firestore, 'examSessionCourses'),
          where('course', '==', courseRef)
        );
        const examSessionCoursesSnap = await getDocs(examSessionCoursesQuery);

        // 3. Get all related session data
        const sessionsData = await Promise.all(
          examSessionCoursesSnap.docs.map(async (escDoc) => {
            const sessionRef = escDoc.data().session;
            const sessionSnap = await getDoc(sessionRef);
            if (!sessionSnap.exists()) return null;

            const sessionData = sessionSnap.data();
            
            // Fetch related data in parallel
            const [roomSnap, academicPeriodSnap, studentsSnap, invigilatorsSnap] = await Promise.all([
              sessionData.room ? getDoc(sessionData.room) : null,
              sessionData.academicPeriod ? getDoc(sessionData.academicPeriod) : null,
              getDocs(query(
                collection(firestore, 'examSessionStudents'),
                where('session', '==', sessionRef)
              )),
              getDocs(query(
                collection(firestore, 'examSessionInvigilators'),
                where('session', '==', sessionRef)
              ))
            ]);

            // Process students
            const students = await Promise.all(
              studentsSnap.docs.map(async (studentDoc) => {
                const studentRef = studentDoc.data().student;
                const studentSnap = await getDoc(studentRef);
                return studentSnap.exists() ? {
                  id: studentSnap.id,
                  ...studentSnap.data(),
                  scanTime: studentDoc.data().scanTime || 'Not scanned',
                  status: studentDoc.data().status || 'pending'
                } : null;
              })
            ).then(results => results.filter(Boolean));

            return {
              sessionId: sessionSnap.id,
              date: sessionData.date,
              startTime: sessionData.startTime,
              endTime: sessionData.endTime,
              room: roomSnap?.exists() ? { id: roomSnap.id, ...roomSnap.data() } : null,
              academicPeriod: academicPeriodSnap?.exists() ? { 
                id: academicPeriodSnap.id, 
                ...academicPeriodSnap.data() 
              } : null,
              students,
              invigilators: invigilatorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            };
          })
        ).then(results => results.filter(Boolean));

        // Combine all students from all sessions
        const allStudents = sessionsData.flatMap(session => session.students);
        const uniqueStudents = [...new Map(
            allStudents.map(
                student => [student.id, student]
            ))].map(
                ([_, student]) => student);

        setSessionData({
          course,
          sessions: sessionsData,
          allStudents: uniqueStudents,
          primarySession: sessionsData[0] || null
        });

        

      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
        setSessionData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseDetails();
    
  }, [selectedCourseId]);

  console.log("RSV: ", sessionData);

  // Helper functions
  const formatFirestoreTime = (timestampObj) => {
    if (!timestampObj?.seconds) return 'Time not set';
    const date = new Date(timestampObj.seconds * 1000 + timestampObj.nanoseconds / 1000000);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Determine which students to display
  const studentsToDisplay = searchResults || sessionData?.allStudents || [];

  // Render states
  if (!selectedCourseId) {
    return (
      <div className="p-12 w-full h-full text-center">
        <h4 className="text-3xl">Get started</h4>
        <p>Select a course to view registered students</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 flex flex-col justify-center items-center h-full">
        <div className="loader"></div>
        <p className="mt-4">Loading student data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 font-medium">Error loading data</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button
          onClick={clearSelectedCourseId}
          className="mt-2 px-3 py-1 bg-red-100 text-red-600 rounded text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 text-center">
        <p className="text-yellow-700">No student data available</p>
      </div>
    );
  }

  return (
    <div className="h-full p-4 bg-white">
      {/* Header section */}
      <div className="w-full flex justify-between items-center mb-4">
        <div className="flex items-center justify-end gap-4">
            <button 
            className="btn-primary-outlined-sm flex items-center gap-2"
              title="Configurations"
              onClick={() => openModal('addCourse', {
                title: 'SMS Configuration',
                closeOnClickOutside: false,
                // width: 'md',
                children: <AddConfig />
              })}
            >
            <Settings className="w-4 h-4" />
            
          </button>
          <button 
            className="btn-primary-sm flex items-center gap-2"
              title="Student lookup"
              onClick={() => openModal('addCourse', {
                title: 'SMS Student Lookup',
                closeOnClickOutside: false,
                // width: 'md',
                children: <StudentLookup />
              })}
            >
              <Search className="w-4 h-4" />
              SMS student lookup
          </button>
        
        </div>

        <div className="w-[60%] max-w-[70%] flex items-center justify-end gap-4">
             {/* Search bar */}
            <div className="flex items-center gap-2 w-[70%]">
                <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by ID, or name"
                className="flex-1 border border-gray-300 px-3 py-2 text-sm"
                />
                <button 
                onClick={handleSearch}
                className="btn-primary-sm flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Search
                </button>
                {searchResults && (
                <button
                    onClick={clearSearch}
                    className="bg-red-50 p-2 text-red-500 hover:text-red-700 text-sm hover:bg-red-100"
                >
                    Clear
                </button>
                )}
            </div>
          
        </div>

        
      </div>

        {/* Brief course data */}
        <div className="flex justify-between items-center p-2 my-2 bg-gray-100 border border-gray-200">
           
            <div>
                <p className="text-xs">Code:</p>
                <p className="font-medium capitalize">{sessionData?.course.id}</p>
            </div>
            <div>
                <p className="text-xs">Course Name:</p>
                <p className="font-medium capitalize">{sessionData?.course.name}</p>
            </div>
            <div>
                <p className="text-xs">Exam Date:</p>
                <p className="font-medium capitalize">{sessionData?.primarySession?.date ?? 'Not Scheduled'}</p>
            </div>
            <div></div>
            <div>
                <p className="text-xs">Total Registered:</p>
                <p className="font-medium capitalize">0{sessionData?.allStudents.length}</p>
            </div>
        </div>


      {/* Student list */}
      <div className="overflow-y-auto h-[88%] p-2">
        <p className="text-sm my-2">
          {searchResults ? (
            `Search Results (${searchResults.length})`
          ) : (
            `List of all eligible students sitting for this course`
          )}
        </p>

        {studentsToDisplay.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {studentsToDisplay.map(student => (
              <StudentCard key={student.id} student={student} />
            ))}
          </div>
        ) : searchResults ? (
          <div className="text-center py-8 text-gray-500">
            No students match your search
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No students registered for this course
          </div>
        )}
      </div>
      <Modal />
    </div>
  );
};

export default RegisteredStudentsView;