
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import InvigilatorsView from '../components/InvigilatorsView'

const Invigilators = () => {

    return(
           <>
        <div className="w-full flex items-start text-gray-600">
            <Sidebar/>
        
            <div className=" w-full">
                <Topbar/>
              

                <div className="w-full h-[88dvh] overflow-hidden">
                    <InvigilatorsView />
                </div>
       
            </div>
        </div>
    </>
    )
}

export default Invigilators;