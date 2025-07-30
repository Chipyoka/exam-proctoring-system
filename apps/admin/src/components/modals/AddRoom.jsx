import {useState, useEffect} from 'react';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '../../../../../shared/firebase';

const AddRoom = () => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({});

    const [roomName, setRoomName] = useState('');
    const [capacity, setCapacity] = useState('');
    const [location, setLocation] = useState('');


    // warning messages
    useEffect(()=>{
        const handleWarnings = () =>{
            if(capacity > 500){
                setMessage({
                    type: 'warning',
                    text: `Make sure this hall holds more than ${capacity} students`
                });
            }else{
                setMessage({});
            }
        }

        handleWarnings();
    },[capacity]);
  
    /**
     * Handle submitting the create new room form
     */
  const handleSaveRoom = async (e) => {
    e.preventDefault();
    setMessage({});

    if (!roomName || !capacity || !location) {
        setMessage({ type: 'error', text: 'All fields are required' });
        return;
    }

    if (capacity < 5) {
        setMessage({ type: 'error', text: 'Room capacity must be at least 5' });
        return;
    }

    setLoading(true);
    const currentRoomName = roomName; // Preserve before resetting

    try {
        const normalizedId = roomName.toLowerCase().replace(/\s+/g, '_');
        const roomRef = doc(firestore, 'rooms', normalizedId);
        const roomSnapshot = await getDoc(roomRef);

        if (roomSnapshot.exists()) {
        setMessage({ type: 'error', text: `Room "${roomName}" already exists.` });
        return;
        }

        await setDoc(roomRef, {
        name: roomName,
        createdAt: new Date().toISOString(),
        capacity,
        location,
        status: 'available',
        });

        console.log(`Room '${roomName}' created with ID '${normalizedId}'`);
        setMessage({ type: 'success', text: `"${currentRoomName}" created successfully.` });

    } catch (err) {
        console.error(err.message);
        setMessage({ type: 'error', text: 'Something went wrong. Please try again later.' });

    } finally {
        setLoading(false);
        setTimeout(() => {
            setCapacity('');
            setLocation('');
            setRoomName('');
        }, 5000);
    }
};


    return(
        <div>
            <div className="p-4">
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

                <p className="text-sm text-gray-500 mb-4">Fill the form below <strong>with accurate information </strong>to add a new examination room</p>

                <form onSubmit={handleSaveRoom} className="w-full">
                    <div className="input-group relative flex items-center border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        
                        <input 
                        type="text" 
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="Room name (eg Room 106)" 
                        name="roomName" 
                        className="text-gray-700 ml-2 w-full border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"/>
                    </div>

                    <div className="mt-4 input-group relative flex items-center border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        
                        <input 
                        type="number" 
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        placeholder="Capacity (eg 100)" 
                        name="capacity" 
                        className="text-gray-700 ml-2 w-full border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"/>
                    </div>

                    <hr className="my-6 text-gray-200" />

                    <div className="input-group relative flex items-center border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        
                        <input 
                        type="text" 
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Location (eg Main Campus)" 
                        name="location" 
                        className="text-gray-700 ml-2 w-full border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"/>
                    </div>



                    {/* Login button */}
                    <button 
                        type="submit"
                        className="w-full mt-6 flex items-center justify-center gap-x-4 btn-primary transition-colors duration-300"
                        disabled={loading} // optional: disables button while loading
                    >
                        {/* Show loader only if loading is true */}
                        {loading && <div className="btn-loader"></div>}

                        <div className="flex justify-center items-center gap-x-2">
                        <p>Save room</p>
                        {/* <ArrowRight className="w-5 h-5 text-gray-50" /> */}
                        </div>
                    </button>
                </form>
            </div>
        </div>
    )
}

export default AddRoom;