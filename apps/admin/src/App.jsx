import { useEffect, useState } from 'react';
import { db } from '../../../shared/firebase';
import { ref, onValue } from 'firebase/database';

import './App.css';

function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const sessionRef = ref(db, 'test/session001');
    const unsubscribe = onValue(sessionRef, (snapshot) => {
      const value = snapshot.val();
      setData(value);
    });

    return () => unsubscribe(); // clean up on unmount
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-red-600">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-gray-400">This is the admin app ready to manage exam sessions.</p>
      <hr className="my-4" />
      <div className="mt-4 p-3 border rounded bg-gray-100">
        <p className="text-gray-800 ">
          {data ? (
            <>
              <strong>Session Data:</strong><br />
              Examiner: {data.examiner} <br />
              Course: {data.course} <br />
              Verified: {data.verified ? 'Yes' : 'No'} <br />
              Time: {data.timestamp}
            </>
          ) : (
            'Waiting for updates...'
          )}
        </p>
      </div>
    </div>
  );
}

export default App;
