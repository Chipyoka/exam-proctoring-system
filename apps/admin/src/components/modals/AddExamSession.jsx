import {useState, useEffect} from 'react';

import { Timestamp, collection, query, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { firestore } from '../../../../../shared/firebase';

const AddExamSession = () => {
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);
    const [message, setMessage] = useState({});
    const [capacity, setCapacity] = useState(0);

    const [periodNameOptions, setPeriodNameOptions] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [roomOptions, setRoomOptions] = useState(null);
    const [selectedRoom, setSelectedRoom] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [examDate, setExamDate] = useState('');

    // All available course options
    const [courseOptions, setCourseOptions] = useState(null);
    
    // Currently selected courses (array of values)
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


    /**
     * Converts a raw time input (HH:mm) string into a Firestore Timestamp object.
     * @param {string} rawTimeInput - e.g. '10:30'
     * @returns {Timestamp|null} Firestore Timestamp or null if invalid
     */
    const convertToFirestoreTimestamp = (rawTimeInput) => {
    if (!rawTimeInput) return null;

    // Get the current date for consistency (so we keep the date part intact)
    const currentDate = new Date();
    const [hours, minutes] = rawTimeInput.split(':').map(num => parseInt(num, 10));

    // Set the date object with the current date, and the time from the input
    currentDate.setHours(hours, minutes, 0, 0); // Set hours, minutes, and reset seconds and milliseconds

    if (isNaN(currentDate.getTime())) return null;

    return Timestamp.fromDate(currentDate); // Return as Firestore Timestamp
    };


    // console.log("Date Test", convertToFirestoreTimestamp('2025-08-05'));
  
    /**
         * Computes the next sequential document ID for a given collection and prefix.
         * @param {string} prefix - The fixed prefix of the document IDs (e.g., 'session_', 'esc_')
         * @param {string} collectionName - The name of the Firestore collection
         * @param {object} db - Firestore instance
         * @returns {Promise<string>} The next available document ID
         */
        const getNextDocId = async (prefix, collectionName, db) => {
        const querySnapshot = await getDocs(collection(db, collectionName));
        let max = 0;

        querySnapshot.forEach(doc => {
            const id = doc.id;
            if (id.startsWith(prefix)) {
            const number = parseInt(id.split('_')[1], 10);
            if (!isNaN(number) && number > max) {
                max = number;
            }
            }
        });

        return `${prefix}${max + 1}`;
        };


    // Fetch related data
    useEffect(()=>{
        const fetchData = async () =>{
            setDataLoading(true);
            try {
                // fetch data
                const coursesQuery = query(collection(firestore, 'courses'));
                const coursesSnap = await getDocs(coursesQuery);
                const coursesArray = coursesSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                console.log('courses: ', coursesArray);

                // get rooms
                const roomsQuery = query(collection(firestore, 'rooms'));
                const roomsSnap = await getDocs(roomsQuery);
                const roomsArray = roomsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                console.log('rooms: ', roomsArray);

                // get periods
                const periodsQuery = query(collection(firestore, 'academicPeriod'));
                const periodsSnap = await getDocs(periodsQuery);
                const periodsArray = periodsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                console.log('periods: ', periodsArray);

                // set options
                setCourseOptions(coursesArray);
                setRoomOptions(roomsArray);
                setPeriodNameOptions(periodsArray);
            } catch (err) {
                console.error('Fetch Courses Error: ', err);
                setCourseOptions(null);
            }finally{
                setDataLoading(false);
            }
        }
        fetchData();
    },[]);


    /**
     * Handle submitting the create new exam sesssion form
     */
    const handleSaveExamSession = async (e) => {
        e.preventDefault();
        setMessage({});

        if (!selectedPeriod || !startTime || !endTime || !selectedRoom || !examDate) {
            setMessage({ type: 'error', text: 'All fields are required' });
            return;
        }

        if(selectedCourses.length < 1){
            setMessage({ type: 'error', text: 'You need to select at least 1 course' });
            return;
        }


        setLoading(true);

        try {
                // Step 1: Generate new session ID
                const newSessionId = await getNextDocId('session_', 'examSessions', firestore);

                // Step 2: Create examSession document
                const sessionRef = doc(firestore, 'examSessions', newSessionId);
                await setDoc(sessionRef, {
                    academicPeriod : doc(firestore, 'academicPeriod', selectedPeriod),
                    room : doc(firestore, 'rooms', selectedRoom),
                    date : examDate,
                    startTime: convertToFirestoreTimestamp(startTime),
                    endTime: convertToFirestoreTimestamp(endTime),
                    createdAt: new Date().toISOString(),
                    status: 'pending',
                });

                console.log(`Exam session created with ID: ${newSessionId}`);

                // Step 3: Generate new examSessionCourses ID
               if (Array.isArray(selectedCourses) && selectedCourses.length > 0) {
                    let escCounter = 0;

                    // Get all current ESC IDs to compute once and reduce reads
                    const existingEscDocs = await getDocs(collection(firestore, 'examSessionCourses'));

                    existingEscDocs.forEach(doc => {
                    const id = doc.id;
                    if (id.startsWith('esc_')) {
                        const num = parseInt(id.split('_')[1], 10);
                        if (!isNaN(num) && num > escCounter) {
                        escCounter = num;
                        }
                    }
                    });

                    // Now create one document per selected course
                    for (const courseId of selectedCourses) {
                        escCounter++; // Increment for each course document
                        const newEscId = `esc_${escCounter}`;
                        const escRef = doc(firestore, 'examSessionCourses', newEscId);

                        await setDoc(escRef, {
                            session: doc(firestore, 'examSessions', newSessionId),
                            course: doc(firestore, 'courses', courseId),
                        });

                        console.log(`Linked course ${courseId} to session ${newSessionId} as ${newEscId}`);
                    }
                }



            setMessage({ type: 'success', text: 'Exam session recorded successfully.' });

        } catch (err) {
            console.error('Error creating exam session or join document:', err.message);
            setMessage({ type: 'error', text: 'Something went wrong. Please try again later.' });

        } finally {
            setLoading(false);
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

    return(
        <div className="w-[650px] p-4" >
            <div className=" ">
                  {message && <div className="cursor-default w-full text-center text-xs font-semibold mb-2 truncate">
                    <p className={
                        message.type === 'warning' ? 'p-2 bg-yellow-50 text-yellow-500' :
                        message.type === 'info'    ? 'p-2 bg-blue-100 text-blue-500'   :
                        message.type === 'success' ? 'p-2 bg-green-100 text-green-500'   :
                        message.type === 'error'   ? 'p-2 bg-red-100 text-red-500'    :
                        'text-white'
                        }
                        title={message.type}
                        >
                        {message.text}
                    </p>
                </div>}

                <p className="text-sm text-gray-500 mb-6">Fill the form below <strong>with accurate information </strong>to add an exam session</p>
                       
            <form onSubmit={handleSaveExamSession}>

                {/* Row */}
                <div className="flex justify-between items-start gap-2">
                    <div className="w-full input-group relative flex items-center border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        <label className="pr-2 text-gray-500 text-sm border-r border-gray-200" htmlFor="StartDate">Academic Period</label>

                        <select 
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="uppercase text-gray-700 ml-2 p-[.12rem] w-[60%] border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"

                        >
                            {periodNameOptions ? (
                                periodNameOptions.map((period) => (
                                    <option key={period.id} value={period.id}>{period.name}</option>
                                ))
                            ) : (
                                <option value=""> No academic periods</option>
                            )}
                        </select>
                    </div>


                       <div className="w-1/2 relative">
                    <div 
                        className="input-group flex items-center justify-between border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 cursor-pointer"
                        onClick={toggleDropdown}
                    >
                        <label className="pr-2 text-gray-500 text-sm border-r border-gray-200">Courses</label>
                        <div className="ml-2 flex-1 p-[.11rem] text-gray-700 text-sm truncate">
                        {selectedCourses.length > 0 
                            ? selectedCourses.map(v => courseOptions.find(c => c.id === v)?.id.toUpperCase()).join(', ')
                            : 'Select courses...'}
                        </div>
                        <svg 
                        className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        xmlns="http://www.w3.org/2000/svg"
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
                            <label className=" w-full truncate text-gray-700 text-sm cursor-pointer">
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

                {/* Row */}
                <div className="  my-4 flex justify-between items-start gap-4">
                     
                    <div className="w-1/2 input-group relative flex items-center justify-between border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        <label className="pr-2 text-gray-500 text-sm border-r border-gray-200" htmlFor="StartTime">Start time</label>
                        <input 
                        type="time" 
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        name="startTime" 
                        className="text-gray-700 ml-2 w-[60%] border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"/>
                    </div>

                    <div className="w-1/2 input-group relative flex items-center justify-between border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        <label className="pr-2 text-gray-500 text-sm border-r border-gray-200" htmlFor="endDate">End Time</label>
                        <input 
                        type="time" 
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        name="endTime" 
                        className="text-gray-700 ml-2 w-[60%] border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"/>
                    </div>

                  
                </div>

                <hr className="text-gray-300 my-6" />
                <p className="text-sm text-gray-500">
                    Venue and Date of examination
                    <span className={capacity > 0 ? 'text-xs text-yellow-500' : 'hidden'}> | Selected room capacity is <span className="font-semibold">{capacity}</span> students</span>

                </p>
                {/* Row */}
                <div className="  my-4 flex justify-between items-start gap-4">
               
                    <div className=" w-1/2 input-group relative flex items-center border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        <label className="pr-2 text-gray-500 text-sm border-r border-gray-200" htmlFor="StartDate">Room</label>

                        <select 
                        value={selectedRoom}
                        onChange={(e) => setSelectedRoom(e.target.value)}
                        className=" text-gray-700 ml-2 p-[.12rem] w-full border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"

                        >
                             {roomOptions ? (
                                roomOptions.map((room) => (
                                    <option key={room.id} value={room.id} onClick = {(e) => setCapacity(room.capacity)}>
                                        {room.name.toUpperCase()} 
                                    </option>
                                ))
                            ) : (
                                <option value=""> No academic rooms</option>
                            )}
                        </select>
                    </div>

                    <div className="w-1/2 input-group relative flex items-center justify-between border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        <label className="pr-2 text-gray-500 text-sm border-r border-gray-200" htmlFor="examDate">Start Date</label>
                        <input 
                        type="date" 
                        value={examDate}
                        onChange={(e) => setExamDate(e.target.value)}
                        name="examDate" 
                        className="text-gray-700 ml-2 w-[60%] border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"/>
                    </div>

                  
                </div>


              {/* Save academic period button */}
                    <button 
                        type="submit"
                        className="w-full mt-8 flex items-center justify-center gap-x-4 btn-primary transition-colors duration-300"
                        disabled={loading} // optional: disables button while loading
                    >
                        {/* Show loader only if loading is true */}
                        {loading && <div className="btn-loader"></div>}

                        <div className="flex justify-center items-center gap-x-2">
                        <p>Save exam session</p>
                        {/* <ArrowRight className="w-5 h-5 text-gray-50" /> */}
                        </div>
                    </button>
            </form>
            </div>
            <div className="w-1/2"></div>
        </div>
    )
}

export default AddExamSession;