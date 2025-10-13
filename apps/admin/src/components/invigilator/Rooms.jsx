import { useState, useEffect } from 'react';
import { firestore } from '../../../../../shared/firebase';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import useScannerStore from '../../store/useScannerStore';
import { useNavigate } from 'react-router-dom';

const Rooms = ({ uid }) => {
  const [examSessions, setExamSessions] = useState([]);
  const [listIndicator, setListIndicator] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const { selectedExamSessionId, setSelectedExamSessionId } = useScannerStore();

  // Helper to load session details
  const fetchSessionData = async (sessionRef) => {
    try {
      const sessionSnap = await getDoc(sessionRef);
      if (!sessionSnap.exists()) return null;
      const sessionData = sessionSnap.data();

      const roomId = sessionData.room?.id || '';
      const [roomSnap] = await Promise.all([
        getDoc(doc(firestore, 'rooms', roomId))
      ]);

      return {
        id: sessionSnap.id,
        status: sessionData.status || 'pending',
        date: sessionData.date || '-',
        room: {
          name: roomSnap.exists() ? roomSnap.data().name : 'unknown',
          capacity: roomSnap.exists() ? roomSnap.data().capacity : 0
        }
      };
    } catch (err) {
      console.error('Error fetching session details:', err);
      return null;
    }
  };

  // Fetch sessions where invigilator is assigned
  useEffect(() => {
    const fetchInvigilatorSessions = async () => {
      setIsLoading(true);
      try {
        // Step 1: Find invigilator record
        const invigilatorRef = doc(firestore, 'invigilators', uid);

        // Step 2: Query assignments for this invigilator
        const invAssignmentsQuery = query(
          collection(firestore, 'examSessionInvigilators'),
          where('invigilator', '==', invigilatorRef)
        );
        const invAssignmentsSnap = await getDocs(invAssignmentsQuery);

        if (invAssignmentsSnap.empty) {
          setExamSessions([]);
          setListIndicator('No rooms assigned');
          setIsLoading(false);
          return;
        }

        // Step 3: Load the linked sessions
        const sessions = [];
        for (const assignmentDoc of invAssignmentsSnap.docs) {
          const data = assignmentDoc.data();
          if (data.session) {
            const sessionData = await fetchSessionData(data.session);
            if (sessionData) sessions.push(sessionData);
          }
        }

        setExamSessions(sessions);
        setListIndicator(sessions.length ? '- End of list -' : 'No rooms assigned');
        setError(null);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to load assigned sessions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvigilatorSessions();
  }, [uid]);

  const handleRoomCardClick = (sessionId) => {
    setSelectedExamSessionId(sessionId);
    navigate('/invigilator/verification');
  };

  if (isLoading)
    return (
      <div className="overflow-hidden h-full w-full max-w-full bg-gray-100 p-6 flex flex-col justify-center items-center">
        <div className="loader"></div>
        <p className="mt-4">Loading assigned rooms...</p>
      </div>
    );

  if (error)
    return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="overflow-hidden h-full w-full max-w-full bg-gray-100 py-2 px-4">
      <div className="mb-2 pt-4 pb-12 px-2 h-[90%] overflow-y-auto">
        {examSessions.map((session) => (
          <div
            key={`session-${session.id}`}
            onClick={() => handleRoomCardClick(session.id)}
            className="mb-4 bg-white p-4 flex items-center justify-between gap-2 cursor-pointer hover:shadow-sm"
          >
            <div>
              <p className="text-lg font-semibold text-gray-600 uppercase">
                {session.room.name}
              </p>
              <p className="text-sm">
                Capacity:{' '}
                <span className="font-semibold text-gray-500">
                  {session.room.capacity}
                </span>
              </p>
              <p className="text-sm">
                Date:{' '}
                <span className="text-gray-500 capitalize">{session.date}</span>
              </p>
            </div>
            <div
              className={`
                font-medium flex justify-center items-center 
                w-[6rem] max-w-[6rem] py-6 px-2 capitalize
                ${
                  session.status === 'active' || session.status === 'in progress'
                    ? 'bg-green-50 text-green-600'
                    : session.status === 'pending'
                    ? 'bg-gray-50 text-gray-600'
                    : 'bg-yellow-50 text-yellow-600'
                }
              `}
            >
              {session.status}
            </div>
          </div>
        ))}

        {listIndicator && (
          <div className="text-sm text-center">{listIndicator}</div>
        )}
      </div>
    </div>
  );
};

export default Rooms;
