import PropTypes from 'prop-types';

const StudentCard = ({ student }) => {
  const getInitials = (firstname = '', lastname = '') => {
    return `${firstname.charAt(0)}${lastname.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="cursor-default hover:shadow-md w-[9em] bg-gray-100 border border-gray-300 flex flex-col justify-center items-center transition delay-150 duration-300 ease-in-out hover:-translate-y-1 hover:scale-100">
      <div className="rounded-full w-16 h-16 mt-2 overflow-hidden">
        <img 
          src={`https://placehold.co/500x500/0b445f/FFF?text=${getInitials(student.firstname, student.lastname)}`} 
          alt={`${student.firstname} ${student.lastname}`}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="text-center mt-2 w-full">
        <p className="text-md text-gray-500 font-bold">{student.id}</p>
        <p className="text-sm">{student.firstname} {student.lastname}</p>
        <p className="text-xs mb-2 text-gray-500">
          {student.program} - Year {student.studyYear}
        </p>
        <p className={`
          font-medium text-xs p-2 border-t border-gray-300 uppercase w-full
          ${student.isVerified ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-600'}
        `}>
          {student.isVerified ? 'verified' : 'not verified'}
        </p>
      </div>
    </div>
  );
};

StudentCard.propTypes = {
  student: PropTypes.shape({
    id: PropTypes.string.isRequired,
    firstname: PropTypes.string,
    lastname: PropTypes.string,
    program: PropTypes.string,
    studyYear: PropTypes.string,
    isVerified: PropTypes.bool,
  }).isRequired,
};

export default StudentCard;