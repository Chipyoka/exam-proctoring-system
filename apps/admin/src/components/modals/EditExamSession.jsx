import { useState, useEffect } from 'react';
import { Timestamp, collection, query, doc, getDocs, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { firestore } from '../../../../../shared/firebase';
import { useNavigate } from 'react-router-dom';

const EditExamSession = ({ sessionData }) => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [message, setMessage] = useState({});
  const [capacity, setCapacity] = useState(0);

  const [periodNameOptions, setPeriodNameOptions] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [roomOptions, setRoomOptions] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [examDate, setExamDate] = useState('');
  const [status, setStatus] = useState('pending');

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

  // Convert "11:24 AM" to "HH:MM" for <input type="time">
  const convertTo24Hour = (time12h) => {
    if (!time12h) return '';
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}`;
  };

  const convertToFirestoreTimestamp = (rawTimeInput) => {
    if (!rawTimeInput) return null;
    const currentDate = new Date();
    const [hours, minutes] = rawTimeInput.split(':').map(num => parseInt(num, 10));
    currentDate.setHours(hours, minutes, 0, 0);
    return isNaN(currentDate.getTime()) ? null : Timestamp.fromDate(currentDate);
  };

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

        if (sessionData) {
          setSelectedPeriod(sessionData.academicPeriod?.id || '');
          setSelectedRoom(sessionData.room?.id || '');
          setCapacity(sessionData.room?.capacity || 0);
          setStartTime(convertTo24Hour(sessionData.startTime));
          setEndTime(convertTo24Hour(sessionData.endTime));
          setExamDate(sessionData.date || '');
          setStatus(sessionData.status || 'pending');
          setSelectedCourses(sessionData.courses?.map(c => c.id) || []);
        }

      } catch (err) {
        console.error('Fetch data error: ', err);
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, [sessionData]);

  const handleUpdateExamSession = async (e) => {
    e.preventDefault();
    setMessage({});

    if (!selectedPeriod) return setMessage({ type: 'error', text: 'Academic period is required' });
    if (!startTime || !endTime) return setMessage({ type: 'error', text: 'Start time and end time are required' });
    if (!examDate) return setMessage({ type: 'error', text: 'Exam date is required' });
    if (!selectedRoom) return setMessage({ type: 'error', text: 'Room is required' });
    if (selectedCourses.length < 1) return setMessage({ type: 'error', text: 'Select at least 1 course' });

    setLoading(true);

    try {
      const sessionRef = doc(firestore, 'examSessions', sessionData.id);

      await updateDoc(sessionRef, {
        academicPeriod: doc(firestore, 'academicPeriod', selectedPeriod),
        room: doc(firestore, 'rooms', selectedRoom),
        date: examDate,
        startTime: convertToFirestoreTimestamp(startTime),
        endTime: convertToFirestoreTimestamp(endTime),
        status,
      });

      setMessage({ type: 'success', text: 'Exam session updated successfully.' });

    } catch (err) {
      console.error('Error updating session:', err);
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
      setTimeout(() => {
        window.location.href = '/admin/dashboard';
      }, 2000);
    }
  };

  const handleDeleteExamSession = async () => {
    const confirmed = window.confirm('Are you sure you want to delete this exam session? All linked data will be removed.');
    if (!confirmed) return;

    setLoading(true);
    try {
      const sessionRef = doc(firestore, 'examSessions', sessionData.id);

      const escSnap = await getDocs(query(collection(firestore, 'examSessionCourses'), where('session', '==', sessionRef)));
      for (const docSnap of escSnap.docs) await deleteDoc(doc(firestore, 'examSessionCourses', docSnap.id));

      const essSnap = await getDocs(query(collection(firestore, 'examSessionStudents'), where('session', '==', sessionRef)));
      for (const docSnap of essSnap.docs) await deleteDoc(doc(firestore, 'examSessionStudents', docSnap.id));

      const invSnap = await getDocs(query(collection(firestore, 'examSessionInvigilators'), where('session', '==', sessionRef)));
      for (const docSnap of invSnap.docs) await deleteDoc(doc(firestore, 'examSessionInvigilators', docSnap.id));

      await deleteDoc(sessionRef);
      window.location.href = '/admin/dashboard';

    } catch (err) {
      console.error('Error deleting exam session:', err);
    } finally {
      setLoading(false);
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
      {message.text && (
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

      <form onSubmit={handleUpdateExamSession}>
        {/* Academic Period */}
        <div className="mb-4">
          <label className="text-gray-500 text-sm">Academic Period</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="ml-2 border border-gray-300 p-2 w-full"
          >
            <option value="">-- Select Academic Period --</option>
            {periodNameOptions.map((period) => (
              <option key={period.id} value={period.id}>
                {period.name}
              </option>
            ))}
          </select>
        </div>

        {/* Courses */}
        <div className="mb-4 relative">
          <label className="text-gray-500 text-sm mb-1 block">Courses</label>
          <div
            className="border border-gray-300 p-2 cursor-pointer flex justify-between"
            onClick={toggleDropdown}
          >
            <span>
              {selectedCourses.length > 0
                ? selectedCourses.map((v) => courseOptions.find((c) => c.id === v)?.id).join(', ')
                : 'Select courses...'}
            </span>
            <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>&#9660;</span>
          </div>
          {isOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {courseOptions.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center px-3 py-2 hover:bg-gray-100"
                  onClick={(e) => { e.stopPropagation(); handleCheckboxChange(course.id); }}
                >
                  <input
                    type="checkbox"
                    checked={selectedCourses.includes(course.id)}
                    onChange={() => handleCheckboxChange(course.id)}
                    className="mr-2"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <label className="w-full truncate text-gray-700 text-sm cursor-pointer">
                    {course.id} - {course.name}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Start & End Time */}
        <div className="flex gap-4 mb-4">
          <div className="w-1/2">
            <label className="text-gray-500 text-sm">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="border border-gray-300 p-2 w-full"
            />
          </div>
          <div className="w-1/2">
            <label className="text-gray-500 text-sm">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="border border-gray-300 p-2 w-full"
            />
          </div>
        </div>

        {/* Room & Exam Date */}
        <div className="flex gap-4 mb-4">
          <div className="w-1/2">
            <label className="text-gray-500 text-sm">Room</label>
            <select
              value={selectedRoom}
              onChange={(e) => {
                setSelectedRoom(e.target.value);
                const room = roomOptions.find((r) => r.id === e.target.value);
                setCapacity(room?.capacity || 0);
              }}
              className="border border-gray-300 p-2 w-full"
            >
              <option value="">-- Select Room --</option>
              {roomOptions.map((room) => (
                <option key={room.id} value={room.id}>{room.name}</option>
              ))}
            </select>
            {capacity > 0 && <p className="text-xs text-yellow-500 mt-1">Selected room capacity: {capacity} students</p>}
          </div>
          <div className="w-1/2">
            <label className="text-gray-500 text-sm">Exam Date</label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="border border-gray-300 p-2 w-full"
            />
          </div>
        </div>

        {/* Status */}
        <div className="mb-4">
          <label className="text-gray-500 text-sm">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="ml-2 border border-gray-300 p-2 w-full"
          >
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full mt-4 flex items-center justify-center gap-x-4 btn-primary"
          disabled={loading}
        >
          {loading && <div className="btn-loader"></div>}
          <p>Save Changes</p>
        </button>

        <button
          type="button"
          className="w-full mt-4 flex items-center justify-center gap-x-4 btn-danger-lg"
          onClick={handleDeleteExamSession}
          disabled={loading}
        >
          Delete Session
        </button>
      </form>
    </div>
  );
};

export default EditExamSession;
