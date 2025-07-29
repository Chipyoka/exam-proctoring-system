import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import CoursesSidebar from '../components/CoursesSidebar';
import RegisteredStudentsView from '../components/RegisteredStudentsView';

const Students = () => {
    return(
            <>
        <div className="w-full flex items-start text-gray-600">
            <Sidebar/>
        
            <div className=" w-full">
                <Topbar/>

              <div className="flex justify-between items-center gap-2 h-[88dvh]">
                {/* component to handle exam sessions */}
                <aside className="w-1/4 h-[100%] overflow-hidden">
                    <CoursesSidebar/>
                </aside>
                <aside className="w-3/4  h-[100%] overflow-hidden">
                 <RegisteredStudentsView/>
                </aside>
              </div>
       
            </div>
        </div>
    </>
    )
}

export default Students;