import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const Invigilators = () => {
    return(
           <>
        <div className="w-full flex items-start text-gray-400">
            <Sidebar/>
        
            <div className=" w-full">
                <Topbar/>
       
            </div>
        </div>
    </>
    )
}

export default Invigilators;