import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../../../../shared/firebase';
import { useNavStore } from '../../store/navStore';
import { CheckCircle, XCircle, AlertCircle, TrendingUp, Clock } from 'lucide-react';

const ViewLiveAlerts = () => {
  const { isLive, setIsLive } = useNavStore();
  const [liveLoading, setLiveLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLiveToggle = () => {
    setLiveLoading(true);
    try {
      setTimeout(() => {
        setLiveLoading(false);
        setIsLive(!isLive);
      }, 600);
    } catch (error) {
      console.error("Failed to live stream alerts");
      setLiveLoading(false);
    }
  };

  // Calculate aggregations
  const calculateAggregations = () => {
    const total = alerts.length;
    const successes = alerts.filter(alert => alert.result === 'success').length;
    const failures = alerts.filter(alert => alert.result === 'failure').length;
    
    const successRate = total > 0 ? (successes / total) * 100 : 0;
    const failureRate = total > 0 ? (failures / total) * 100 : 0;

    return {
      total,
      successes,
      failures,
      successRate: Math.round(successRate),
      failureRate: Math.round(failureRate)
    };
  };

  const aggregations = calculateAggregations();

  // Format timestamp for display with date
  const formatAlertTimestamp = (timestampObj) => {
    if (!timestampObj) return 'Unknown time';
    
    try {
      const date = new Date(
        timestampObj.seconds * 1000 + timestampObj.nanoseconds / 1000000
      );
      
      // Format: "Oct 13, 8:27:09 PM"
      const datePart = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      
      const timePart = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      
      return `${datePart}, ${timePart}`;
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid time';
    }
  };

  // Fetch room name from sessionId string - SIMPLIFIED AND FIXED
 const fetchRoomName = async (sessionId) => {
  if (!sessionId) return 'Unknown Room';

  try {
    const sessionRef = doc(firestore, 'examSessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) return 'Session Not Found';

    const sessionData = sessionSnap.data();

    // CASE 1 — room is a DocumentReference
    if (sessionData.room && typeof sessionData.room === 'object') {
      const roomSnap = await getDoc(sessionData.room);
      return roomSnap.exists() ? (roomSnap.data().name || 'Unnamed Room') : 'Room Not Found';
    }

    // CASE 2 — room is a string ID
    if (sessionData.room && typeof sessionData.room === 'string') {
      const roomRef = doc(firestore, 'rooms', sessionData.room);
      const roomSnap = await getDoc(roomRef);
      return roomSnap.exists() ? (roomSnap.data().name || 'Unnamed Room') : 'Room Not Found';
    }

    return 'No Room Assigned';
  } catch (err) {
    console.error('Error fetching room:', err);
    return 'Error Loading Room';
  }
};


  // Process log document and enrich with room data
  const processLogDocument = async (doc) => {
    const logData = doc.data();
    const baseAlert = {
      id: doc.id,
      result: logData.result,
      reason: logData.reason || '-',
      studentId: logData.studentId,
      scannedBy: logData.scannedBy,
      sessionId: logData.sessionId,
      timestamp: logData.timestamp,
      displayTime: formatAlertTimestamp(logData.timestamp),
      roomName: 'Loading...' // Placeholder while we fetch room data
    };

    // Fetch room name asynchronously using the string sessionId
    if (logData.sessionId) {
      try {
        const roomName = await fetchRoomName(logData.sessionId);
        return { ...baseAlert, roomName };
      } catch (error) {
        console.error('Error processing room name:', error);
        return { ...baseAlert, roomName: 'Error Loading Room' };
      }
    }
    
    return { ...baseAlert, roomName: 'No Session' };
  };

  // Real-time listener for logs
  useEffect(() => {
    if (!isLive) {
      // Clean up alerts when not in live mode
      setAlerts([]);
      return;
    }

    setLoading(true);
    setError(null);

    // Create query for logs collection, ordered by timestamp descending
    const logsQuery = query(
      collection(firestore, 'logs'),
      orderBy('timestamp', 'desc')
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(logsQuery, 
      async (snapshot) => {
        try {
          // Process new documents
          const newAlerts = await Promise.all(
            snapshot.docs.map(processLogDocument)
          );
          
          setAlerts(newAlerts);
          console.log('Live alerts updated:', newAlerts);
          setLoading(false);
        } catch (err) {
          console.error('Error processing alerts:', err);
          setError('Failed to load alerts');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error in real-time listener:', err);
        setError('Real-time connection failed');
        setLoading(false);
      }
    );

    // Cleanup function
    return () => unsubscribe();
  }, [isLive]);

  if (liveLoading) {
    return (
      <div className="p-4 w-lg flex flex-col justify-center items-center h-full text-gray-600">
        <div className="loader"></div>
        <p className="mt-4">Switching live mode...</p>
      </div>
    );
  }

  return (
    <>
        <div className="max-w-2xl">

            <div className="flex justify-between">

                <div className="w-lg text-gray-600 cursor-pointer h-fit">
                    <p className="text-xs my-2">Toggle live mode:</p>
                    <button 
                    className={`p-2 flex items-center gap-2 ${
                        isLive 
                        ? "bg-green-100 text-green-600 border border-green-300" 
                        : "bg-gray-100 text-gray-600 border border-gray-300"
                    }  transition-colors hover:shadow-sm`}
                    onClick={handleLiveToggle}
                    disabled={liveLoading}
                    >
                    {isLive ? "Go offline" : "Switch to live"}
                    </button>
                    
                    {isLive && (
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                        <span className="h-2 w-2 bg-green-500 rounded-full animate-ping mr-2"></span>
                        Live mode active - streaming alerts in real-time
                    </p>
                    )}
                </div>

                {/* Aggregation Metrics */}
                {isLive && alerts.length > 0 && (
                    <div className="flex justify-end items-center">

                    {/* Success Rate */}
                    <div className="bg-gray-50 border border-gray-200  p-3 flex items-center gap-4">
                        <div>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <div>
                              <p className="text-lg font-bold text-green-500">
                            {aggregations.successRate}%
                            </p>
                        </div>
                    </div>

                    {/* Failure Rate */}
                    <div className="bbg-gray-50 border border-gray-200  p-3 flex items-center gap-4">
                        <div>
                            <XCircle className="w-4 h-4 text-red-500" />
                        </div>
                        <div>
                            <p className="text-lg font-bold text-red-500">
                            {aggregations.failureRate}%
                            </p>
                        </div>
                    </div>

                    
                    
                    </div>
                )}
            </div>

        {/* Live alerts container */}
        <div className="border border-gray-200 h-lg mt-4 overflow-auto max-h-[400px] text-gray-600 ">
            <p className="px-4 py-2 w-full flex justify-between items-center my-1 bg-gray-100 capitalize text-xs font-medium sticky top-0">
            <span className="w-2/5">Timestamp</span>
            <span className="w-2/5">Room</span>
            <span className="w-1/5">Result</span>
            </p>
            
            {loading && isLive && (
            <div className="p-4 text-center text-sm text-gray-500">
                <div className="loader-small mx-auto"></div>
                <p className="mt-2">Loading alerts...</p>
            </div>
            )}

            {error && (
            <div className="p-4 text-center text-sm text-red-500 bg-red-50 flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
            </div>
            )}

            {!isLive && (
            <div className="p-8 text-center text-sm text-gray-500">
                <p>Live mode is currently offline</p>
                <p className="text-xs mt-1">Switch to live mode to see real-time alerts</p>
            </div>
            )}

            {isLive && alerts.length === 0 && !loading && (
            <div className="p-8 text-center text-sm text-gray-500">
                <p>No alerts yet</p>
                <p className="text-xs mt-1">Alerts will appear here as they occur</p>
            </div>
            )}

            {isLive && alerts.map((alert) => (
            <div 
                key={alert.id} 
                className={`px-4 py-3 w-full flex justify-between items-center border-b border-gray-100 text-xs transition-colors ${
                alert.result === 'success' 
                    ? 'bg-green-50 hover:bg-green-100' 
                    : 'bg-red-50 hover:bg-red-100'
                }`}
            >
                <span className="w-2/5 font-mono text-xs" title={alert.displayTime}>
                {alert.displayTime}
                </span>
                
                <span className="w-2/5 truncate capitalize" title={alert.roomName}>
                {alert.roomName}
                </span>
                <span className="w-2/5 truncate capitalize" title={alert.roomName}>
                {alert.reason}
                </span>
                
                <span className={`w-1/5 font-medium capitalize flex items-center gap-1 ${
                alert.result === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                {alert.result === 'success' ? (
                    <CheckCircle className="w-3 h-3" />
                ) : (
                    <XCircle className="w-3 h-3" />
                )}
                {alert.result}
                </span>
            </div>
            ))}
        </div>
        </div>
    </>
  );
};

export default ViewLiveAlerts;