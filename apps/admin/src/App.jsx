import { BrowserRouter as Router, Routes, Route,  Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Invigilators from './pages/Invigilators';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import NotAuthorised from './pages/NotAuthorised';


import './styles/App.css'; // Ensure styles are imported
import './styles/loader.css'; // Ensure styles are imported

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Not found URLs - 404 */}
        <Route path="/*" element={<NotFound />} />

         <Route path="/admin/unauthorised" element={<NotAuthorised />} />


        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/dashboard/students" element={<Students />} />
          <Route path="/admin/dashboard/invigilators" element={<Invigilators />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
