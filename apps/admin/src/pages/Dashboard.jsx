
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import RoomsSidebar from '../components/RoomsSidebar';
import ExamSessionView from '../components/ExamSessionView';

const Dashboard = () => {




  return (
    <>
        <div className="w-full flex items-start text-gray-400">
            <Sidebar/>
        
            <div className=" w-full">
                <Topbar/>

              <div className="flex justify-between items-center gap-2 border border-green-600 h-[86dvh]">
                {/* component to handle exam sessions */}
                <aside className="w-1/4 h-[100%] overflow-hidden border border-cyan-600">
                  <RoomsSidebar/>
                </aside>
                <aside className="w-3/4  h-[100%] border border-yellow-600">
                  <ExamSessionView/>
                </aside>
              </div>
       
            </div>
        </div>
    </>
  );
};

export default Dashboard;
