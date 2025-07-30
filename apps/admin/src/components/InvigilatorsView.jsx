import { useEffect, useState } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { firestore } from '../../../../shared/firebase';

import { Search, PlusCircle } from 'lucide-react';

const InvigilatorsView = () => {
    const [invigilators, setInvigilators] = useState(null);
    const [filteredInvigilators, setFilteredInvigilators] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchInput, setSearchInput] = useState('');

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
                setFilteredInvigilators(invigilatorsArray); // Initialize filtered list
            } catch (err) {
                console.error('Fetch error:', err);
                setError(err.message);
                setInvigilators(null);
                setFilteredInvigilators(null);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSearch = () => {
        if (!searchInput.trim()) {
            setFilteredInvigilators(invigilators);
            return;
        }

        const query = searchInput.trim().toLowerCase();
        const results = invigilators.filter(inv => 
            inv.firstname?.toLowerCase().includes(query) ||
            inv.lastname?.toLowerCase().includes(query) ||
            inv.employeeId?.toLowerCase().includes(query) ||
            inv.faculty?.toLowerCase().includes(query) ||
            inv.phone?.includes(query)
        );

        setFilteredInvigilators(results);
    };

    const clearSearch = () => {
        setSearchInput('');
        setFilteredInvigilators(invigilators);
    };

    const formatScans = (scans) => {
        if (!scans && scans !== 0) return '0000';
        if (scans < 10) return `000${scans}`;
        if (scans < 100) return `00${scans}`;
        if (scans < 1000) return `0${scans}`;
        return `${scans}`;
    };

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

    if (!invigilators) {
        return (
            <div className="p-4 bg-yellow-50 border border-yellow-200 text-center">
                <p className="text-yellow-700">No invigilators available</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col">
              <div className="w-full flex justify-between items-center px-4 my-4 border-b border-gray-200 pb-4">
                <div className="flex items-center justify-end gap-4">
                <button className="btn-primary-sm flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" />
                    add invigilator
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
                        placeholder="Search by name, ID, faculty or phone"
                        className="flex-1 border border-gray-300 px-3 py-2 text-sm"
                        />
                        <button 
                        onClick={handleSearch}
                        className="btn-primary-sm flex items-center gap-2">
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

            {/* Invigilators Table Header */}
            <div className="w-full mt-4 px-4">
                <div className="text-gray-400 font-medium flex justify-between items-center h-[2em] p-4">
                    <div className="flex justify-between items-center gap-4">
                        <p className="w-[12em] truncate">Full name</p>
                        <p className="w-[10em]">Faculty</p>
                        <p className="w-[10em]">Employee #</p>
                        <p className="w-[10em]">Phone Number</p>
                        <p className="w-[10em] text-center">Total Scans</p>
                    </div>
                    
                    <div className="w-[15em] flex justify-between items-center gap-6">
                        <p>Actions</p>
                    </div>
                </div>
            </div>

            {/* Invigilators List */}
            <div className="w-full flex-1 overflow-y-auto my-2 px-4">
                {filteredInvigilators?.length ? (
                    filteredInvigilators.map(inv => (
                        <div
                            key={inv.id}
                            className="card mb-2 flex justify-between items-center bg-gray-100 h-[3em] hover:shadow-sm border border-gray-300 p-2 overflow-hidden"
                        >
                            <div className="flex justify-between items-center gap-4 capitalize">
                                <p className="w-[12em] truncate font-semibold">{inv?.firstname} {inv?.lastname}</p>
                                <p className="w-[10em] truncate uppercase">{inv?.faculty}</p>
                                <p className="w-[10em] truncate">{inv?.employeeId}</p>
                                <p className="w-[10em] truncate">{inv?.phone}</p>
                                <p className="w-[10em] truncate text-blue-400 font-semibold text-center">{formatScans(inv?.totalScans)}</p>
                            </div>
                            
                            <div className="w-[15em] flex justify-between items-center gap-6">
                                <button className="btn-primary-outlined-sm">Make Admin</button>
                                <button className="btn-danger">Block</button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        {searchInput ? 'No invigilators match your search' : 'No invigilators available'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvigilatorsView;