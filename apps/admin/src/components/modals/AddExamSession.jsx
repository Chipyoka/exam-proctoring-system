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
     * Converts a raw input date string into a Firestore Timestamp object.
     * @param {string} rawDateInput - e.g. '2025-08-05' or '2025-08-05T10:30'
     * @returns {Timestamp|null} Firestore Timestamp or null if invalid
     */
    const convertToFirestoreTimestamp = (rawDateInput) => {
        if (!rawDateInput) return null;

        const dateObj = new Date(rawDateInput);
        if (isNaN(dateObj.getTime())) return null;

        return Timestamp.fromDate(dateObj);
    };

    // console.log("Date Test", convertToFirestoreTimestamp('2025-08-05'));
  
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

        if (!periodNameOptions || !type || !mode || !startDate || !endDate || !registrationStart || !registrationEnd) {
            setMessage({ type: 'error', text: 'All fields are required' });
            return;
        }


        setLoading(true);
        const currentperiodNameOptions = periodNameOptions; // Preserve before resetting

        try {
            const normalizedId = periodNameOptions.toLowerCase().replace(/\s+/g, '_');
            const periodRef = doc(firestore, 'academicPeriod', normalizedId);
            const periodSnapshot = await getDoc(periodRef);

            if (periodSnapshot.exists()) {
            setMessage({ type: 'error', text: `Academic Period "${periodNameOptions}" already exists.` });
            return;
            }

            await setDoc(periodRef, {
            name: periodNameOptions,
            studyMode: mode,
            type: type,
            startDate: convertToFirestoreTimestamp(startDate),
            endDate: convertToFirestoreTimestamp(endDate),
            registrationStart: convertToFirestoreTimestamp(registrationStart),
            registrationEnd: convertToFirestoreTimestamp(registrationEnd),
            status: 'pending',
            });

            console.log(`Academic Period '${periodNameOptions}' created with ID '${normalizedId}'`);
            setMessage({ type: 'success', text: `"${currentperiodNameOptions}" created successfully.` });

        } catch (err) {
            console.error(err.message);
            setMessage({ type: 'error', text: 'Something went wrong. Please try again later.' });

        } finally {
            setLoading(false);
            setTimeout(() => {
                setMode('');
                setType('');
                setPeriodNameOptions('');
                setStartDate('');
                setEndDate('');
                setRegistrationStart('');
                setRegistrationEnd('');
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