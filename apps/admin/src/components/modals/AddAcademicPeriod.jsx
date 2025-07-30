import {useState, useEffect} from 'react';

import { Timestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '../../../../../shared/firebase';

const AddAcademicPeriod = () => {
        const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({});

    const [periodName, setPeriodName] = useState('');
    const [type, setType] = useState('semester');
    const [mode, setMode] = useState('day-ft');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [registrationStart, setRegistrationStart] = useState('');
    const [registrationEnd, setRegistrationEnd] = useState('');

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
  
    /**
     * Handle submitting the create new Academic Period form
     */
  const handleSaveAcademicPeriod = async (e) => {
    e.preventDefault();
    setMessage({});

    if (!periodName || !type || !mode || !startDate || !endDate || !registrationStart || !registrationEnd) {
        setMessage({ type: 'error', text: 'All fields are required' });
        return;
    }


    setLoading(true);
    const currentPeriodName = periodName; // Preserve before resetting

    try {
        const normalizedId = periodName.toLowerCase().replace(/\s+/g, '_');
        const periodRef = doc(firestore, 'academicPeriod', normalizedId);
        const periodSnapshot = await getDoc(periodRef);

        if (periodSnapshot.exists()) {
        setMessage({ type: 'error', text: `Academic Period "${periodName}" already exists.` });
        return;
        }

        await setDoc(periodRef, {
        name: periodName,
        studyMode: mode,
        type: type,
        startDate: convertToFirestoreTimestamp(startDate),
        endDate: convertToFirestoreTimestamp(endDate),
        registrationStart: convertToFirestoreTimestamp(registrationStart),
        registrationEnd: convertToFirestoreTimestamp(registrationEnd),
        status: 'pending',
        });

        console.log(`Academic Period '${periodName}' created with ID '${normalizedId}'`);
        setMessage({ type: 'success', text: `"${currentPeriodName}" created successfully.` });

    } catch (err) {
        console.error(err.message);
        setMessage({ type: 'error', text: 'Something went wrong. Please try again later.' });

    } finally {
        setLoading(false);
        setTimeout(() => {
            setMode('');
            setType('');
            setPeriodName('');
            setStartDate('');
            setEndDate('');
            setRegistrationStart('');
            setRegistrationEnd('');
        }, 5000);
    }
};
    return(
        <div className="w-[780px] p-4">
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

                <p className="text-sm text-gray-500 mb-6">Fill the form below <strong>with accurate information </strong>to register an academic period</p>

            <form onSubmit={handleSaveAcademicPeriod}>

                {/* Row */}
                <div className="flex justify-between items-start gap-2">
                    <div className="input-group relative flex items-center border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        <label className="pr-2 text-gray-500 text-sm border-r border-gray-200" htmlFor="StartDate">Name</label>

                        <input 
                        type="text" 
                        value={periodName}
                        onChange={(e) => setPeriodName(e.target.value)}
                        placeholder="eg DAY S1 2025 (JAN)" 
                        name="periodName" 
                        className="text-gray-700 ml-2 w-full border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"/>
                    </div>

                    <div className="input-group relative flex items-center border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        <label className="pr-2 text-gray-500 text-sm border-r border-gray-200" htmlFor="StartDate">Type</label>

                        <select 
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="text-gray-700 ml-2 p-[.12rem] w-full border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"

                        >
                            <option value="term">Term</option>
                            <option value="semester">Semester</option>
                        </select>
                    </div>
                    <div className="input-group relative flex items-center border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        <label className="pr-2 text-gray-500 text-sm border-r border-gray-200" htmlFor="StartDate">Mode</label>

                        <select 
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                        className="text-gray-700 ml-2 p-[.12rem] w-full border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"

                        >
                            <option value="day-pt">Day (Part-time)</option>
                            <option value="day-ft">Day (Full-time)</option>
                            <option value="evening-pt">Evening (Part-time)</option>
                            <option value="evening-ft">Evening (Full-time)</option>
                            <option value="odl">ODL</option>
                        </select>
                    </div>
                </div>
                <hr className="text-gray-300 my-6" />
                <p className="text-sm text-gray-500">Academic period sessional dates</p>

                {/* Row */}
                <div className="  my-4 flex justify-between items-start gap-4">
                    <div className="w-1/2 input-group relative flex items-center justify-between border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        <label className="pr-2 text-gray-500 text-sm border-r border-gray-200" htmlFor="StartDate">Start Date</label>
                        <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        name="startDate" 
                        className="text-gray-700 ml-2 w-[60%] border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"/>
                    </div>

                    <div className="w-1/2 input-group relative flex items-center justify-between border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        <label className="pr-2 text-gray-500 text-sm border-r border-gray-200" htmlFor="endDate">End Date</label>
                        <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        name="endDate" 
                        className="text-gray-700 ml-2 w-[60%] border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"/>
                    </div>

                  
                </div>

                <hr className="text-gray-300 my-6" />
                <p className="text-sm text-gray-500">Student exam registration dates</p>

                {/* Row */}
                <div className="  my-4 flex justify-between items-start gap-4">
                    <div className="w-1/2 input-group relative flex items-center justify-between border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        <label className="pr-2 text-gray-500 text-sm border-r border-gray-200" htmlFor="StartDate">Start Date</label>
                        <input 
                        type="date" 
                        value={registrationStart}
                        onChange={(e) => setRegistrationStart(e.target.value)}
                        name="startDate" 
                        className="text-gray-700 ml-2 w-[60%] border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"/>
                    </div>

                    <div className="w-1/2 input-group relative flex items-center justify-between border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        <label className="pr-2 text-gray-500 text-sm border-r border-gray-200" htmlFor="endDate">End Date</label>
                        <input 
                        type="date" 
                        value={registrationEnd}
                        onChange={(e) => setRegistrationEnd(e.target.value)}
                        name="endDate" 
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
                        <p>Save academic period</p>
                        {/* <ArrowRight className="w-5 h-5 text-gray-50" /> */}
                        </div>
                    </button>
            </form>
            </div>
            <div className="w-1/2"></div>
        </div>
    )
}

export default AddAcademicPeriod;