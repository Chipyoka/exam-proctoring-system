import { useState, useEffect } from 'react';
import { Timestamp, collection, query, doc, getDocs, setDoc, where } from 'firebase/firestore';
import { firestore } from '../../../../../shared/firebase';

const AddExamSession = () => {
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [message, setMessage] = useState({});
  const [capacity, setCapacity] = useState(0);

  // Academic periods and rooms
  const [periodNameOptions, setPeriodNameOptions] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [roomOptions, setRoomOptions] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');

  // Exam session details
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [examDate, setExamDate] = useState('');

  // Courses
  const [courseOptions, setCourseOptions] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleCheckboxChange = (courseValue) => {
    if (selectedCourses.includes(courseValue)) {
      setSelectedCourses(selectedCourses.filter(c => c !== courseValue));
    } else {
      setSelectedCourses([...selectedCourses, courseValue]);
    }
  };

  // Convert HH:MM to Firestore timestamp
  const convertToFirestoreTimestamp = (rawTimeInput) => {
    if (!rawTimeInput) return null;
    const currentDate = new Date();
    const [hours, minutes] = rawTimeInput.split(':').map(num => parseInt(num, 10));
    currentDate.setHours(hours, minutes, 0, 0);
    return isNaN(currentDate.getTime()) ? null : Timestamp.fromDate(currentDate);
  };

  // Get next document ID for a collection
  const getNextDocId = async (prefix, collectionName) => {
    const querySnapshot = await getDocs(collection(firestore, collectionName));
    let max = 0;
    querySnapshot.forEach(doc => {
      const id = doc.id;
      if (id.startsWith(prefix)) {
        const number = parseInt(id.split('_')[1], 10);
        if (!isNaN(number) && number > max) max = number;
      }
    });
    return `${prefix}${max + 1}`;
  };

  // Fetch courses, rooms, periods
  useEffect(() => {
    const fetchData = async () => {
      setDataLoading(true);
      try {
        const [coursesSnap, roomsSnap, periodsSnap] = await Promise.all([
          getDocs(collection(firestore, 'courses')),
          getDocs(collection(firestore, 'rooms')),
          getDocs(collection(firestore, 'academicPeriod')),
        ]);

        const coursesArray = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const roomsArray = roomsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const periodsArray = periodsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setCourseOptions(coursesArray);
        setRoomOptions(roomsArray);
        setPeriodNameOptions(periodsArray);

        // Auto-select first period and first room if available
        if (periodsArray.length > 0) setSelectedPeriod(periodsArray[0].id);
        if (roomsArray.length > 0) {
          setSelectedRoom(roomsArray[0].id);
          setCapacity(roomsArray[0].capacity);
        }
      } catch (err) {
        console.error('Fetch data error: ', err);
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, []);

const handleSaveExamSession = async (e) => {
  e.preventDefault();
  setMessage({});

  // --- Validation ---
  if (!selectedPeriod) return setMessage({ type: 'error', text: 'Academic period is required' });
  if (!startTime || !endTime) return setMessage({ type: 'error', text: 'Start time and end time are required' });
  if (!examDate) return setMessage({ type: 'error', text: 'Exam date is required' });
  if (!selectedRoom) return setMessage({ type: 'error', text: 'Room is required' });
  if (selectedCourses.length < 1) return setMessage({ type: 'error', text: 'Select at least 1 course' });

  setLoading(true);

  try {
    // --- Create exam session ---
    const newSessionId = await getNextDocId('session_', 'examSessions', firestore);
    const sessionRef = doc(firestore, 'examSessions', newSessionId);

    await setDoc(sessionRef, {
      academicPeriod: doc(firestore, 'academicPeriod', selectedPeriod), // reference
      room: doc(firestore, 'rooms', selectedRoom), // reference
      date: examDate,
      startTime: convertToFirestoreTimestamp(startTime),
      endTime: convertToFirestoreTimestamp(endTime),
      createdAt: new Date().toISOString(),
      status: 'pending',
    });

    console.log(`Exam session created with ID: ${newSessionId}`);

    // --- Handle examSessionCourses ---
    let escCounter = 0;
    const existingEscDocs = await getDocs(collection(firestore, 'examSessionCourses'));
    existingEscDocs.forEach(doc => {
      const id = doc.id;
      if (id.startsWith('esc_')) {
        const num = parseInt(id.split('_')[1], 10);
        if (!isNaN(num) && num > escCounter) escCounter = num;
      }
    });

    // --- Handle examSessionStudents ---
    let essCounter = 0;
    const existingEssDocs = await getDocs(collection(firestore, 'examSessionStudents'));
    existingEssDocs.forEach(doc => {
      const id = doc.id;
      if (id.startsWith('ESS-')) {
        const num = parseInt(id.split('-')[1], 10);
        if (!isNaN(num) && num > essCounter) essCounter = num;
      }
    });

    // --- Loop through selected courses ---
    for (const courseId of selectedCourses) {
      // Create examSessionCourse
      escCounter++;
      const newEscId = `esc_${escCounter}`;
      const escRef = doc(firestore, 'examSessionCourses', newEscId);
      await setDoc(escRef, {
        session: sessionRef,
        course: doc(firestore, 'courses', courseId), // reference
      });
      console.log(`Linked course ${courseId} to session ${newSessionId} as ${newEscId}`);

      // Link students enrolled in this course
      const studentRegsQuery = query(
        collection(firestore, 'studentCourseRegistrations'),
        where('courseId', '==', courseId) // filter by string field
      );
      const studentRegsSnap = await getDocs(studentRegsQuery);

      for (const regDoc of studentRegsSnap.docs) {
        essCounter++;
        const essId = `ESS-${essCounter}`;
        const essRef = doc(firestore, 'examSessionStudents', essId);
        const studentData = regDoc.data();

        await setDoc(essRef, {
          session: sessionRef,
          student: studentData.student || null, // Firestore reference to student
          course: doc(firestore, 'courses', courseId), // optional: reference to course
          registeredAt: studentData.registeredAt || null,
        });

        console.log(`Added student ${studentData.studentId} to exam session ${newSessionId} as ${essId}`);
      }
    }

    setMessage({ type: 'success', text: 'Exam session recorded successfully.' });

  } catch (err) {
    console.error('Error creating exam session:', err);
    setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
  } finally {
    setLoading(false);

    // --- Reset form after 5 seconds ---
    setTimeout(() => {
      setSelectedRoom('');
      setSelectedPeriod('');
      setStartTime('');
      setEndTime('');
      setExamDate('');
      setCapacity(0);
      setSelectedCourses([]);
    }, 5000);
  }
};

  if (dataLoading) {
    return (
      <div className="w-[650px] p-4 flex flex-col justify-center items-center h-[65dvh]">
        <div className="loader"></div>
        <p className="mt-4">Please wait...</p>
      </div>
    );
  }

  return (
    <div className="w-[650px] p-4">
      <div>
        {message && (
          <div className="cursor-default w-full text-center text-xs font-semibold mb-2 truncate">
            <p
              className={
                message.type === 'warning'
                  ? 'p-2 bg-yellow-50 text-yellow-500'
                  : message.type === 'info'
                  ? 'p-2 bg-blue-100 text-blue-500'
                  : message.type === 'success'
                  ? 'p-2 bg-green-100 text-green-500'
                  : message.type === 'error'
                  ? 'p-2 bg-red-100 text-red-500'
                  : 'text-white'
              }
              title={message.type}
            >
              {message.text}
            </p>
          </div>
        )}

        <p className="text-sm text-gray-500 mb-6">
          Fill the form below <strong>with accurate information</strong> to add an exam session
        </p>

        <form onSubmit={handleSaveExamSession}>
          {/* Academic Period */}
          <div className="flex justify-between items-start gap-2 mb-4">
            <div className="w-full input-group relative flex items-center border border-gray-300 px-3 py-2">
              <label className="pr-2 text-gray-500 text-sm border-r border-gray-200">Academic Period</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="uppercase text-gray-700 ml-2 p-[.12rem] w-[60%] border-none outline-none bg-transparent"
              >
                <option value="">-- Select Academic Period --</option>
                {periodNameOptions.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Courses dropdown */}
            <div className="w-1/2 relative">
              <div
                className="input-group flex items-center justify-between border border-gray-300 px-3 py-2 cursor-pointer"
                onClick={toggleDropdown}
              >
                <label className="pr-2 text-gray-500 text-sm border-r border-gray-200">Courses</label>
                <div className="ml-2 flex-1 p-[.11rem] text-gray-700 text-sm truncate">
                  {selectedCourses.length > 0
                    ? selectedCourses.map((v) => courseOptions.find((c) => c.id === v)?.id.toUpperCase()).join(', ')
                    : 'Select courses...'}
                </div>
                <svg
                  className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {courseOptions.map((course) => (
                    <div
                      key={course.id}
                      title={course.name}
                      className="flex items-center px-3 py-2 hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheckboxChange(course.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCourses.includes(course.id)}
                        onChange={() => handleCheckboxChange(course.id)}
                        className="mr-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <label className="w-full truncate text-gray-700 text-sm cursor-pointer">
                        {course.id}-{course.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <hr className="text-gray-300 my-6" />
          <p className="text-sm text-gray-500">Session start and end times</p>

          {/* Start & End time */}
          <div className="my-4 flex justify-between items-start gap-4">
            <div className="w-1/2 input-group relative flex items-center justify-between border border-gray-300 px-3 py-2">
              <label className="pr-2 text-gray-500 text-sm border-r border-gray-200">Start time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="text-gray-700 ml-2 w-[60%] border-none outline-none bg-transparent"
              />
            </div>

            <div className="w-1/2 input-group relative flex items-center justify-between border border-gray-300 px-3 py-2">
              <label className="pr-2 text-gray-500 text-sm border-r border-gray-200">End time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="text-gray-700 ml-2 w-[60%] border-none outline-none bg-transparent"
              />
            </div>
          </div>

          <hr className="text-gray-300 my-6" />
          <p className="text-sm text-gray-500">
            Venue and Date of examination
            <span className={capacity > 0 ? 'text-xs text-yellow-500' : 'hidden'}>
              {' '}
              | Selected room capacity is <span className="font-semibold">{capacity}</span> students
            </span>
          </p>

          {/* Room & Exam Date */}
          <div className="my-4 flex justify-between items-start gap-4">
            <div className="w-1/2 input-group relative flex items-center border border-gray-300 px-3 py-2">
              <label className="pr-2 text-gray-500 text-sm border-r border-gray-200">Room</label>
              <select
                value={selectedRoom}
                onChange={(e) => {
                  setSelectedRoom(e.target.value);
                  const room = roomOptions.find((r) => r.id === e.target.value);
                  setCapacity(room?.capacity || 0);
                }}
                className="text-gray-700 ml-2 p-[.12rem] w-full border-none outline-none bg-transparent"
              >
                <option value="">-- Select Room --</option>
                {roomOptions.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-1/2 input-group relative flex items-center justify-between border border-gray-300 px-3 py-2">
              <label className="pr-2 text-gray-500 text-sm border-r border-gray-200">Exam Date</label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="text-gray-700 ml-2 w-[60%] border-none outline-none bg-transparent"
              />
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="w-full mt-8 flex items-center justify-center gap-x-4 btn-primary"
            disabled={loading}
          >
            {loading && <div className="btn-loader"></div>}
            <p>Save exam session</p>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddExamSession;
