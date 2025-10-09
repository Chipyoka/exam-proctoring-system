import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <div className="flex justify-center mb-6">
          <AlertTriangle className="text-yellow-500" size={64} />
        </div>
        <h2 className="text-2xl text-gray-600 mb-2">Page Not Found - 404</h2>
        <p className="text-sm text-gray-500 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-block btn-primary transition duration-200"
        >
          Return
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
