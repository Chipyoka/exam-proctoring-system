import { db } from '../../../shared/firebase';
import { ref, set } from 'firebase/database';
import './App.css';

function App() {
  const handleTestWrite = () => {
    console.log("Writing to Firebase...");
    set(ref(db, 'test/session001'), {
      examiner: 'Invigilator001',
      course: 'CSC101',
      verified: true,
      timestamp: new Date().toISOString(),
    })
      .then(() => {
        console.log("Write successful");
      })
      .catch((error) => {
        console.error("Write failed:", error.message);
      });
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-blue-600">Invigilator App</h1>
      <button
        onClick={handleTestWrite}
        className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
      >
        Send Test to Firebase
      </button>
    </div>
  );
}


export default App;
