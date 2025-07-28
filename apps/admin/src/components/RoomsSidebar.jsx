import {useState, useEffect } from 'react';

const RoomsSidebar = () => {

     // sample room

    const sampleRoom = [
        { id : 1, name : 'ROOM 101', capacity : '120', status: 'active', period : 'jan-25',},
        { id : 2, name : 'ROOM 105', capacity : '110', status: null, period : 'jan-25',},
        { id : 3, name : 'ROOM 103', capacity : null, status: 'pending', period : 'jun-24',},
        { id : 4, name : 'ROOM 108', capacity : null, status: 'pending', period : 'jan-24',},
        { id : 5, name : 'ROOM 106', capacity : null, status: 'pending', period : 'jan-24',},
        { id : 6, name : 'ROOM 96', capacity : null, status: 'pending', period : 'jan-25',},
    ]

    const [listIndicator, setListIndicator] = useState(" ");
    const [rooms, setRooms] = useState(sampleRoom);

     const [selectedPeriod, setSelectedPeriod] = useState('jan-25');

  const periods = ['All', ...new Set(rooms.map(item => item.period))];
  const filteredRooms =
    selectedPeriod === 'All'
      ? rooms
      : rooms.filter(room => room.period === selectedPeriod);
   

    useEffect(() => {
        console.log("Rooms", rooms);


         // handle indicator
        if(filteredRooms.length < 1){
            setListIndicator("No Rooms to show");
        }else if (filteredRooms.length > 4){
            setListIndicator("- End of list -")
        }else{
            setListIndicator(" ")
        }
    }, [rooms]);


    return(
        <div className="overflow-hidden border border-red-600 h-full w-full max-w-full bg-gray-100 py-2 px-4">
            <p>Academic Period</p>
            <div className="bg-white input-group relative flex items-center border border-gray-300 px-3 py-2 transition-colors duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                <select 
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    name="semester" 
                    className="text-[#2F7392] ml-2 w-full border-none outline-none bg-transparent focus:ring-0 focus:outline-none placeholder:text-sm"
                >
                    <option value="jan-25">Day S1 2025 (JAN)</option>
                    <option value="jun-24">Day S2 2024 (JUN)</option>
                    <option value="jan-24">Day S1 2024 (JAN)</option>
            
                </select>
            </div>

            {/* list of all added rooms */}
            <p className="text-xs my-3">List of exam rooms</p>
            <div className=" mb-2 pt-4 pb-12 px-2  h-[90%] overflow-y-auto">
            {
                filteredRooms.map((room) => (
                    <div key={room.id} className="mb-4 bg-white p-4 flex items-center justify-between gap-2 cursor-pointer hover:shadow-sm">
                        <div >
                            <p className="text-lg font-semibold text-gray-600 uppercase">{room?.name ?? 'Unknown'}</p>
                            <p className="text-sm">Capacity: <span className="font-semibold text-gray-500">{room?.capacity ?? '-'}</span></p>
                        </div>
                        <div className="bg-green-50 text-green-600 font-medium flex justify-center items-center w-[6rem] max-w-[6rem] py-6 px-2 capitalize"> {room?.status ?? 'unknown'}</div>
                    </div>
                ))
            }
               

                {/* Indicator of end of list  */}
                <div className=" text-sm text-center">
                     {listIndicator}
                </div>
            </div>
        </div>
    )
}

export default RoomsSidebar;