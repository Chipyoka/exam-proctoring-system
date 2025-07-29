import { useState, useEffect } from 'react';
import { firestore } from '../../../../shared/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

import useRoomStore from '../store/useRoomStore';

const RoomsSidebar = () => {
  const [examSessions, setExamSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('All');
  const [listIndicator, setListIndicator] = useState('');
  const [periods, setPeriods] = useState(['All']);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

 // Get Zustand actions
  const { setSelectedRoom } = useRoomStore();

  // Safe data fetcher
 const fetchSessionData = async (sessionDoc) => {
  try {
    const sessionData = sessionDoc.data();
    if (!sessionData) return null;

    // Get the ID from DocumentReference objects
    const roomId = sessionData.room?.id || '';
    const periodId = sessionData.academicPeriod?.id || '';

    const [roomSnap, periodSnap] = await Promise.all([
      getDoc(doc(firestore, 'rooms', roomId)),
      getDoc(doc(firestore, 'academicPeriod', periodId))
    ]);

    return {
      id: sessionDoc.id,
      status: sessionData.status || 'pending',
      date: sessionData.date || '-',
      periodName: periodSnap.exists() ? periodSnap.data().name : 'unknown',
      room: {
        name: roomSnap.exists() ? roomSnap.data().name : 'unknown',
        capacity: roomSnap.exists() ? roomSnap.data().capacity : 0
      }
    };
  } catch (err) {
    console.error('Error processing session:', err);
    return null;
  }
};

  // Fetch examSessions from Firestore
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const sessionsSnapshot = await getDocs(collection(firestore, 'examSessions'));
        const sessions = [];

        console.log ("sessions", sessions);

        for (const sessionDoc of sessionsSnapshot.docs) {
          const session = await fetchSessionData(sessionDoc);
          if (session) sessions.push(session);
        }

        setExamSessions(sessions);
        setPeriods(['All', ...new Set(sessions.map(s => s.periodName).filter(Boolean))]);
        setError(null);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to load sessions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter sessions safely
  useEffect(() => {
    try {
      const filtered = selectedPeriod === 'All'
        ? [...examSessions]
        : examSessions.filter(s => String(s.periodName) === String(selectedPeriod));

      setFilteredSessions(filtered);

      if (filtered.length === 0) {
        setListIndicator('No Sessions to show');
      } else if (filtered.length > 4) {
        setListIndicator('- End of list -');
      } else {
        setListIndicator('');
      }
    } catch (err) {
      console.error('Filter error:', err);
      setFilteredSessions([]);
      setListIndicator('Error filtering sessions');
    }
  }, [examSessions, selectedPeriod]);

  if (isLoading) return <div className="p-4 text-center">Loading sessions...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

/**
 * Handle room card clicks
 */
const handleRoomCardClick = (session) => {
    alert(`you have clicked ${session.id}`);
    setSelectedRoom({
      id: session.id,
      roomName: session.room.name,
      capacity: session.room.capacity,
      date: session.date,
      status: session.status,
      periodName: session.periodName
      // Add any other relevant data
    });
  };

  return (
    <div className="overflow-hidden border border-red-600 h-full w-full max-w-full bg-gray-100 py-2 px-4">
      <p>Academic Period</p>
      <div className="bg-white input-group relative flex items-center border border-gray-300 px-3 py-2">
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(String(e.target.value))}
          className="text-[#2F7392] ml-2 w-full border-none outline-none bg-transparent"
        >
          {periods.map(period => (
            <option key={String(period)} value={String(period)}>
              {period}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs my-3">List of exam sessions</p>
      <div className="mb-2 pt-4 pb-12 px-2 h-[90%] overflow-y-auto">
        {filteredSessions.map((session) => (
          <div 
            key={`session-${session.id}`}
             onClick={() => handleRoomCardClick(session)}
            className="mb-4 bg-white p-4 flex items-center justify-between gap-2 cursor-pointer hover:shadow-sm"
          >
            <div>
              <p className="text-lg font-semibold text-gray-600 uppercase">
                {session.room.name}
              </p>
              <p className="text-sm">
                Capacity: <span className="font-semibold text-gray-500">{session.room.capacity}</span>
              </p>
              <p className="text-sm">
                Date: <span className="text-gray-500 capitalize">{session.date}</span>
              </p>
            </div>
                <div className={`
                font-medium flex justify-center items-center 
                w-[6rem] max-w-[6rem] py-6 px-2 capitalize
                ${
                    session.status === 'active' || session.status === 'in progress' 
                    ? 'bg-green-50 text-green-600'  // Green for success/completed
                    : session.status === 'pending'
                        ? 'bg-gray-50 text-gray-600'  // Gray for pending
                        : 'bg-yellow-50 text-yellow-600' // Yellow for unknown/others
                }
                `}>
                {session.status}
                </div>
          </div>
        ))}

        {listIndicator && (
          <div className="text-sm text-center">
            {listIndicator}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomsSidebar;