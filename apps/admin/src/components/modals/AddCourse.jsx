import {useState} from 'react';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '../../../../../shared/firebase';

const AddCourse = () => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({});

    const [courseName, setCourseName] = useState('');
    const [courseCode, setCourseCode] = useState('');
    const [credit, setCredit] = useState('');
    const [level, setLevel] = useState('');
    const [faculty, setFaculty] = useState('');


    /**
     * Handle submitting the create new course form
     */
  const handleRegisterCourse = async (e) => {
    e.preventDefault();
    setMessage({});

    if (!courseName || !courseCode || !level || !credit || !faculty ) {
        setMessage({ type: 'error', text: 'All fields are required' });
        return;
    }


    setLoading(true);
    const currentCourseName = courseName; // Preserve before resetting

    try {
        const normalizedId = courseCode.toUpperCase().replace(/\s+/g, '_');
        const courseRef = doc(firestore, 'courses', normalizedId);
        const courseSnapshot = await getDoc(courseRef);

        if (courseSnapshot.exists()) {
        setMessage({ type: 'error', text: `course "${courseName}" already exists.` });
        return;
        }

        await setDoc(courseRef, {
        name: courseName,
        credit: parseFloat(credit),
        level: parseInt(level, 10),
        department: faculty,
        status: 'active',
        });

        console.log(`course '${courseName}' created with ID '${normalizedId}'`);
        setMessage({ type: 'success', text: `"${currentCourseName}" created successfully.` });

    } catch (err) {
        console.error(err.message);
        setMessage({ type: 'error', text: 'Something went wrong. Please try again later.' });

    } finally {
        setLoading(false);
        setTimeout(() => {
            setCourseName('');
            setCredit('');
            setLevel('');
            setFaculty('');
            setCourseCode('');
            setCourseName('');
        
        }, 5000);
    }
};
    return(
        <div className="w-[500px] p-4">
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

                <p className="text-sm text-gray-500 mb-6">Fill the form below <strong>with accurate information </strong>to register a course</p>

            <form onSubmit={handleRegisterCourse}>

                {/* Row */}
                <div className="flex justify-between items-start gap-2">
                    <div className="input-group relative flex items-center border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        <label className="pr-2 text-gray-500 text-sm border-r border-gray-200" htmlFor="courseName">Name</label>

                        <input 
                        type="text" 
                        value={courseName}
                        onChange={(e) => setCourseName(e.target.value)}
                        placeholder="eg Introduction to IT" 
                        name="courseName" 
                        className="text-gray-700 ml-2 w-full border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"/>
                    </div>

                    <div className="input-group relative flex items-center border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        <label className="pr-2 text-gray-500 text-sm border-r border-gray-200" htmlFor="courseCode">Code</label>

                        <input 
                        type="text" 
                        value={courseCode}
                        onChange={(e) => setCourseCode(e.target.value)}
                        placeholder="eg BIT1100" 
                        name="courseCode" 
                        className="text-gray-700 ml-2 w-full border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"/>
                  
                    </div>
                 
                </div>
                <hr className="text-gray-300 my-6" />
                <p className="text-sm text-gray-500">Coures level (Year of study) and Course credits</p>

                {/* Row */}
                <div className="  my-4 flex justify-between items-start gap-4">
                    <div className="input-group relative flex items-center border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        <label className="pr-2 text-gray-500 text-sm border-r border-gray-200" htmlFor="level">Level</label>

                         <input 
                        type="number" 
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        placeholder="eg 3" 
                        max="10"
                        name="level" 
                        className="text-gray-700 ml-2 w-full border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"/>
                  
                    </div>

                    <div className=" input-group relative flex items-center justify-between border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        <label className="pr-2 text-gray-500 text-sm border-r border-gray-200" htmlFor="credit">Credit</label>
                        <input 
                        type="number" 
                        value={credit}
                        onChange={(e) => setCredit(e.target.value)}
                        placeholder="eg 5"
                        max="10"
                        name="credit" 
                        className="text-gray-700 ml-2 w-full border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"/>
                    </div>

                  

                  
                </div>

                <hr className="text-gray-300 my-6" />
                <p className="text-sm text-gray-500">Faculty of the course</p>

                {/* Row */}
                <div className="  my-4 flex justify-between items-start gap-4">
                

                    <div className=" input-group relative flex items-center justify-between border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        <label className="pr-2 text-gray-500 text-sm border-r border-gray-200" htmlFor="faculty">Faculty</label>
                        <input 
                        type="text" 
                        value={faculty}
                        onChange={(e) => setFaculty(e.target.value)}
                        placeholder="eg ICT"
                        name="faculty" 
                        className="text-gray-700 ml-2 w-full border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"/>
                    </div>

                  
                </div>

            


              {/* Save course button */}
                    <button 
                        type="submit"
                        className="w-full mt-8 flex items-center justify-center gap-x-4 btn-primary transition-colors duration-300"
                        disabled={loading} // optional: disables button while loading
                    >
                        {/* Show loader only if loading is true */}
                        {loading && <div className="btn-loader"></div>}

                        <div className="flex justify-center items-center gap-x-2">
                        <p>register course</p>
                        {/* <ArrowRight className="w-5 h-5 text-gray-50" /> */}
                        </div>
                    </button>
            </form>
            </div>
            <div className="w-1/2"></div>
        </div>
    )
}

export default AddCourse;