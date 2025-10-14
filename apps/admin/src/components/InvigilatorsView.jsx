import { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../../../../shared/firebase';
import useModalStore from '../store/useModalStore';

import Modal from './modals/Modal';
import AssignInvigilator from './modals/AssignInvigilator';

import { Search, PlusCircle } from 'lucide-react';

const InvigilatorsView = () => {
  const [invigilators, setInvigilators] = useState([]);
  const [filteredInvigilators, setFilteredInvigilators] = useState([]);
  const [roles, setRoles] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState('');
    const { openModal } = useModalStore();

  // Fetch all invigilators from Firestore
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const invigilatorsQuery = query(collection(firestore, 'invigilators'));
        const invigilatorsSnap = await getDocs(invigilatorsQuery);
        const invigilatorsArray = invigilatorsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setInvigilators(invigilatorsArray);
        setFilteredInvigilators(invigilatorsArray);

        // Fetch roles from backend for each invigilator
        const rolesData = {};
        await Promise.all(
          invigilatorsArray.map(async inv => {
            if (!inv.uid) return;
            try {
              const res = await fetch(`http://localhost:4000/user-role/${inv.uid}`);
              if (res.ok) {
                const data = await res.json();
                rolesData[inv.uid] = data.role;
              }
            } catch (err) {
              console.warn(`Failed to fetch role for ${inv.fullname}:`, err.message);
            }
          })
        );
        setRoles(rolesData);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle making or removing admin
  const handleToggleAdmin = async (uid) => {
    if (!uid) {
      alert('User UID is missing.');
      return;
    }

    const currentRole = roles[uid] || 'invigilator';
    const newRole = currentRole === 'admin' ? 'invigilator' : 'admin';
    const action = newRole === 'admin' ? 'Make Admin' : 'Remove Admin';

    if (!window.confirm(`Are you sure you want to ${action.toLowerCase()} for this user?`)) return;

    try {
      const response = await fetch('http://localhost:4000/setRole', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, role: newRole }),
      });

      if (!response.ok) {
        throw new Error(`Failed to set role (${newRole}).`);
      }

      alert(`User has been successfully updated to role: ${newRole}.`);
      setRoles(prev => ({ ...prev, [uid]: newRole }));
    } catch (err) {
      console.error('Error assigning role:', err);
      alert(`Error: ${err.message}`);
    }
  };

  // Handle toggle activation (Block / Activate)
  const handleBlock = async (invigilator) => {
    const { id, isActivated } = invigilator;
    const action = isActivated ? 'block' : 'activate';

    if (!window.confirm(`Are you sure you want to ${action} this invigilator?`)) return;

    try {
      const invigilatorRef = doc(firestore, 'invigilators', id);
      await updateDoc(invigilatorRef, { isActivated: !isActivated });

      // Update state locally
      setInvigilators(prev =>
        prev.map(inv =>
          inv.id === id ? { ...inv, isActivated: !isActivated } : inv
        )
      );
      setFilteredInvigilators(prev =>
        prev.map(inv =>
          inv.id === id ? { ...inv, isActivated: !isActivated } : inv
        )
      );

      alert(`Invigilator has been ${isActivated ? 'blocked' : 'activated'}.`);
    } catch (err) {
      console.error('Error updating activation:', err);
      alert('Failed to update activation status.');
    }
  };

  // Search handling
  const handleSearch = () => {
    if (!searchInput.trim()) {
      setFilteredInvigilators(invigilators);
      return;
    }

    const query = searchInput.trim().toLowerCase();
    const results = invigilators.filter(inv =>
      inv.fullname?.toLowerCase().includes(query) ||
      inv.faculty?.toLowerCase().includes(query) ||
      inv.phone?.includes(query)
    );

    setFilteredInvigilators(results);
  };

  const clearSearch = () => {
    setSearchInput('');
    setFilteredInvigilators(invigilators);
  };

  // UI States
  if (loading) {
    return (
      <div className="p-4 flex flex-col justify-center items-center h-full">
        <div className="loader"></div>
        <p className="mt-4">Loading invigilators...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 font-medium">Error loading invigilators</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-3 py-1 bg-red-100 text-red-600 rounded text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!invigilators.length) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 text-center">
        <p className="text-yellow-700">No invigilators available</p>
      </div>
    );
  }

  // Main Render
  return (
    <div className="w-full h-full flex flex-col">
      {/* Header Bar */}
      <div className="w-full flex justify-between items-center px-4 my-4 border-b border-gray-200 pb-4">
        <div className="flex items-center justify-end gap-4">
          <button 
            className="btn-primary-sm flex items-center gap-2"
            title="Assign Invigilator"
            onClick={() => openModal('assignInvigilator', {
                title: 'Assign Invigilator',
                closeOnClickOutside: false,
                // width: 'md',
                children: <AssignInvigilator />
            })}
            >
            <PlusCircle className="w-4 h-4" />
            assign invigilator
          </button>
        </div>

        <div className="w-[60%] max-w-[60%]">
          {/* Search bar */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name, faculty or phone"
              className="flex-1 border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              onClick={handleSearch}
              className="btn-primary-sm flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
            {filteredInvigilators?.length !== invigilators?.length && (
              <button
                onClick={clearSearch}
                className="bg-red-50 p-2 text-red-500 hover:text-red-700 text-sm hover:bg-red-100"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="w-full mt-4 px-4">
        <div className="text-gray-400 font-medium flex justify-between items-center h-[2em] p-4">
          <div className="flex justify-between items-center gap-4">
            <p className="w-[12em] truncate">Full name</p>
            <p className="w-[10em]">Faculty</p>
            <p className="w-[10em]">Phone Number</p>
          </div>
          <div className="w-[20em] flex justify-between items-center gap-6">
            <p>Actions</p>
          </div>
        </div>
      </div>

      {/* Table Rows */}
      <div className="w-full flex-1 overflow-y-auto my-2 px-4">
        {filteredInvigilators?.length ? (
          filteredInvigilators.map(inv => {
            const role = roles[inv.uid] || 'invigilator';
            return (
              <div
                key={inv.id}
                className="card mb-2 flex justify-between items-center bg-gray-100 h-[3em] hover:shadow-sm border border-gray-300 p-2 overflow-hidden"
              >
                <div className="flex justify-between items-center gap-4 capitalize">
                  <p className="w-[12em] truncate font-semibold">{inv?.fullname}</p>
                  <p className="w-[10em] truncate uppercase">{inv?.faculty}</p>
                  <p className="w-[10em] truncate">{inv?.phone}</p>
                </div>

                <div className="w-[20em] flex justify-between items-center gap-6">
                  <button
                    className="btn-primary-outlined-sm"
                    onClick={() => handleToggleAdmin(inv.uid)}
                  >
                    {role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                  </button>

                  <button
                    className={inv.isActivated ? 'btn-danger' : 'btn-primary-sm'}
                    onClick={() => handleBlock(inv)}
                  >
                    {inv.isActivated ? 'Block' : 'Activate'}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-500">
            {searchInput
              ? 'No invigilators match your search'
              : 'No invigilators available'}
          </div>
        )}
      </div>
        {/* Render the modal portal once */}
          <Modal />
    </div>
  );
};

export default InvigilatorsView;
