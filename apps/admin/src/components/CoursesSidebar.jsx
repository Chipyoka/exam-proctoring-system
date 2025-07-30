import { useState, useEffect } from 'react';
import { firestore } from '../../../../shared/firebase';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import useCourseStore from '../store/useCourseStore';

const CoursesSidebar = () => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('All');
  const [listIndicator, setListIndicator] = useState('');
  const [periods, setPeriods] = useState(['All']);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { setSelectedCourseId } = useCourseStore();

  // Parse date string in "MMM DD, YYYY" format (e.g., "Jul 29, 2025")
  const parseDateString = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr);
    } catch (e) {
      console.warn('Failed to parse date:', dateStr);
      return null;
    }
  };

  // Get session status based on date
  const getSessionStatus = (date) => {
    if (!date) return 'not-scheduled';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sessionDate = new Date(date);
    sessionDate.setHours(0, 0, 0, 0);
    
    if (sessionDate.getTime() === today.getTime()) return 'today';
    return sessionDate > today ? 'upcoming' : ' ';
  };

  // Compare dates for sorting (handles null values)
  const compareDates = (a, b) => {
    if (!a && !b) return 0;
    if (!a) return 1;  // Put null dates last
    if (!b) return -1; // Put null dates last
    return a.getTime() - b.getTime();
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch academic periods
        const periodsSnapshot = await getDocs(collection(firestore, 'academicPeriod'));
        const periodsData = periodsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // 2. Fetch exam sessions with date parsing
        const sessionsSnapshot = await getDocs(collection(firestore, 'examSessions'));
        const sessionsData = sessionsSnapshot.docs.map(doc => {
          const data = doc.data();
          const parsedDate = parseDateString(data.date);
          return {
            id: doc.id,
            ...data,
            parsedDate,
            status: getSessionStatus(data.date),
            academicPeriodId: data.academicPeriod?.id
          };
        });

        // 3. Fetch examSessionCourses
        const examSessionCoursesSnapshot = await getDocs(collection(firestore, 'examSessionCourses'));
        const examSessionCoursesData = examSessionCoursesSnapshot.docs.map(doc => ({
          id: doc.id,
          sessionId: doc.data().session.id,
          courseId: doc.data().course.id
        }));

        // 4. Fetch and process courses
        const coursesSnapshot = await getDocs(collection(firestore, 'courses'));
        
        const coursesData = await Promise.all(
          coursesSnapshot.docs.map(async (courseDoc) => {
            const courseData = courseDoc.data();
            
            // Find all sessions for this course
            const courseSessions = examSessionCoursesData
              .filter(esc => esc.courseId === courseDoc.id)
              .map(esc => {
                const session = sessionsData.find(s => s.id === esc.sessionId);
                return session ? {
                  id: session.id,
                  dateString: session.date,
                  date: session.parsedDate,
                  status: session.status,
                  academicPeriodId: session.academicPeriodId
                } : null;
              })
              .filter(Boolean);

            // Get academic periods
            const coursePeriods = [
              ...new Set(
                courseSessions
                  .map(s => {
                    const period = periodsData.find(p => p.id === s.academicPeriodId);
                    return period ? period.name : null;
                  })
                  .filter(Boolean)
              )
            ];

            // Find most relevant session (prioritize upcoming, then in-progress, then passed)
            const sortedSessions = [...courseSessions].sort((a, b) => {
              const statusPriority = {
                'upcoming': 1,
                'in-progress': 2,
                'passed': 3,
                'not-scheduled': 4
              };
              if (statusPriority[a.status] !== statusPriority[b.status]) {
                return statusPriority[a.status] - statusPriority[b.status];
              }
              return compareDates(a.date, b.date);
            });

            const primarySession = sortedSessions[0] || null;

            return {
              id: courseDoc.id,
              code: courseData.code || courseDoc.id,
              name: courseData.name || 'Unnamed Course',
              periods: coursePeriods,
              sessionDate: primarySession?.dateString || 'Not scheduled',
              sessionStatus: primarySession?.status || 'not-scheduled',
              sessionId: primarySession?.id
            };
          })
        );

        // Sort courses by status and date
        const sortedCourses = [...coursesData].sort((a, b) => {
          const statusPriority = {
            'upcoming': 1,
            'in-progress': 2,
            'passed': 3,
            'not-scheduled': 4
          };
          
          if (statusPriority[a.sessionStatus] !== statusPriority[b.sessionStatus]) {
            return statusPriority[a.sessionStatus] - statusPriority[b.sessionStatus];
          }
          
          // For same status, sort by date
          const dateA = parseDateString(a.sessionDate);
          const dateB = parseDateString(b.sessionDate);
          return compareDates(dateA, dateB);
        });

        setCourses(sortedCourses);
        setPeriods(['All', ...periodsData.map(p => p.name).filter(Boolean)]);
        setError(null);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to load courses');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get status display text and color
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'upcoming':
        return { text: 'Upcoming', color: 'text-blue-600 bg-blue-50' };
      case 'in-progress':
        return { text: 'In Progress', color: 'text-green-600 bg-green-50' };
      case 'passed':
        return { text: 'Passed', color: 'text-gray-600 bg-gray-50' };
      default:
        return { text: 'Not Scheduled', color: 'text-gray-500 bg-gray-50' };
    }
  };

  useEffect(() => {
    try {
      const filtered = selectedPeriod === 'All'
        ? [...courses]
        : courses.filter(course => 
            course.periods.includes(selectedPeriod)
          );

      setFilteredCourses(filtered);

      if (filtered.length === 0) {
        setListIndicator('No Courses to show');
      } else if (filtered.length > 4) {
        setListIndicator('- End of list -');
      } else {
        setListIndicator('');
      }
    } catch (err) {
      console.error('Filter error:', err);
      setFilteredCourses([]);
      setListIndicator('Error filtering courses');
    }
  }, [courses, selectedPeriod]);

  const handleCourseClick = (courseId) => {
    setSelectedCourseId(courseId);
  };

  if (isLoading) return (
    <div className="overflow-hidden h-full w-full max-w-full bg-gray-100 p-6 flex flex-col justify-center items-center">
      <div className="loader"></div>
      <p className="mt-4">Loading courses...</p>
    </div>
  );

  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="overflow-hidden h-full w-full max-w-full bg-gray-100 py-2 px-4">
      <p>Academic Period</p>
      <div className="bg-white input-group relative flex items-center border border-gray-300 px-3 py-2">
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(String(e.target.value))}
          className="uppercase text-[#2F7392] ml-2 w-full border-none outline-none bg-transparent"
        >
          {periods.map(period => (
            <option  key={String(period)} value={String(period)}>
              {period}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs my-3">List of courses (sorted by nearest exam date)</p>
      <div className="mb-2 pt-4 pb-12 px-2 h-[90%] overflow-y-auto">
        {filteredCourses.map((course) => {
        const statusDisplay = getStatusDisplay(course.sessionStatus);
        
        return (
          <div 
            key={`course-${course.id}`}
            onClick={() => handleCourseClick(course.id)}
            className="mb-4 bg-white p-4 cursor-pointer hover:shadow-sm"
          >
            <div className="flex-1">
                <p className="text-xs flex justify-between items-center  w-full ">
                 <span className="font-semibold text-gray-500 bg-gray-200 px-3 py-2 w-fit" title="Course code">{course.code}</span>
                 <span className={`${statusDisplay.color} font-medium flex justify-center items-center py-2 px-2 rounded text-sm`}>{statusDisplay.text}</span>
              </p>
              <p className="text-lg font-semibold text-gray-600 mt-2 w-[100%] truncate">
                {course.name}
              </p>
              
              <p className="text-sm capitalize">
                Exam Date: <span className="font-medium">
                  {course.sessionDate}
                </span>
              </p>

            </div>
            
          </div>
        );
      })}


        {listIndicator && (
          <div className="text-sm text-center">
            {listIndicator}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursesSidebar;