
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import RoomsSidebar from '../components/RoomsSidebar';
import ExamSessionView from '../components/ExamSessionView';


const Dashboard = () => {




  return (
    <>
        <div className="w-full flex items-start text-gray-600">
            <Sidebar/>
        
            <div className=" w-full">
                <Topbar/>

              <div className="flex justify-between items-center gap-2 h-[88dvh]">
                {/* component to handle exam sessions */}
                <aside className="w-1/4 h-[100%] overflow-hidden">
                  <RoomsSidebar/>
                </aside>
                <aside className="w-3/4  h-[100%] overflow-hidden">
                  <ExamSessionView/>
                </aside>
              </div>
       
            </div>
        </div>

         
    </>
  );
};

export default Dashboard;
