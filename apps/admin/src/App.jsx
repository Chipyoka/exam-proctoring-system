import { BrowserRouter as Router, Routes, Route,  Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import ScannerHome from './pages/invigilator/ScannerHome';
import Scanner from './pages/invigilator/Scanner';
import StudentRegistration from './pages/invigilator/StudentRegistration';
import Students from './pages/Students';
import Invigilators from './pages/Invigilators';
import InvigilatorLogin from './pages/InvigilatorLogin';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import NotAuthorised from './pages/NotAuthorised';


import './styles/App.css'; // Ensure styles are imported
import './styles/loader.css'; // Ensure styles are imported

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<InvigilatorLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/registration" element={<StudentRegistration />} />

        {/* Not found URLs - 404 */}
        <Route path="/*" element={<NotFound />} />

         <Route path="/invigilator/unauthorised" element={<NotAuthorised />} />
         <Route path="/admin/unauthorised" element={<NotAuthorised />} />


          <Route path="/" element={<Home />} />
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/dashboard/students" element={<Students />} />
          <Route path="/admin/dashboard/invigilators" element={<Invigilators />} />
          
          <Route path="/invigilator/scanner" element={<Scanner />} />
          <Route path="/invigilator/home" element={<ScannerHome />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
