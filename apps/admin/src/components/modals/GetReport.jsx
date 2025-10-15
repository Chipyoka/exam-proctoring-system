import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../../../../../shared/firebase';
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import useAuthStore from '../../store/authStore';

const stylesPDF = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
  },
  header: {
    fontSize: 18,
    marginBottom: 5,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  subheader: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
    color: '#34495e',
    fontWeight: 'bold',
  },
  description: {
    fontSize: 10,
    marginBottom: 15,
    textAlign: 'center',
    color: '#7f8c8d',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#2c3e50',
    backgroundColor: '#ecf0f1',
    padding: 5,
    borderLeft: '3pt solid #3498db',
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bdc3c7',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableRowAlt: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
  },
  tableColHeader: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bdc3c7',
    backgroundColor: '#34495e',
    color: 'white',
    fontWeight: 'bold',
    padding: 6,
    fontSize: 9,
  },
  tableCol: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bdc3c7',
    padding: 5,
    fontSize: 8,
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  summaryBox: {
    width: '48%',
    margin: '1%',
    padding: 8,
    backgroundColor: '#f8f9fa',
    border: '1pt solid #bdc3c7',
    borderRadius: 3,
  },
  summaryTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  footer: {
    marginTop: 25,
    fontSize: 8,
    textAlign: 'center',
    color: '#95a5a6',
    borderTop: '1pt solid #bdc3c7',
    paddingTop: 8,
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 8,
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#95a5a6',
  },
});

const GetReport = () => {
  const currentUser = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [message, setMessage] = useState({});
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [periodOptions, setPeriodOptions] = useState([]);

  useEffect(() => {
    const fetchPeriods = async () => {
      setDataLoading(true);
      try {
        const periodsSnap = await getDocs(collection(firestore, 'academicPeriod'));
        const periodsArray = periodsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setPeriodOptions(periodsArray);
        if (periodsArray.length > 0) setSelectedPeriod(periodsArray[0].id);
      } catch (err) {
        console.error(err);
        setMessage({ type: 'error', text: 'Failed to load academic periods' });
      } finally {
        setDataLoading(false);
      }
    };
    fetchPeriods();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  const formatTime = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    if (!selectedPeriod) return setMessage({ type: 'error', text: 'Please select an academic period' });

    setLoading(true);
    setMessage({});

    try {
      // Fetch all collections
      const [
        academicPeriodsSnap,
        academicPeriodCoursesSnap,
        coursesSnap,
        examSessionCoursesSnap,
        examSessionInvigilatorsSnap,
        examSessionStudentsSnap,
        examSessionsSnap,
        invigilatorsSnap,
        roomsSnap,
        studentCourseRegistrationsSnap,
        studentsSnap
      ] = await Promise.all([
        getDocs(collection(firestore, 'academicPeriod')),
        getDocs(collection(firestore, 'academicPeriodCourses')),
        getDocs(collection(firestore, 'courses')),
        getDocs(collection(firestore, 'examSessionCourses')),
        getDocs(collection(firestore, 'examSessionInvigilators')),
        getDocs(collection(firestore, 'examSessionStudents')),
        getDocs(collection(firestore, 'examSessions')),
        getDocs(collection(firestore, 'invigilators')),
        getDocs(collection(firestore, 'rooms')),
        getDocs(collection(firestore, 'studentCourseRegistrations')),
        getDocs(collection(firestore, 'students'))
      ]);

      // Process base data
      const academicPeriod = academicPeriodsSnap.docs.find(d => d.id === selectedPeriod)?.data();
      const allAcademicPeriodCourses = academicPeriodCoursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allCourses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allExamSessionCourses = examSessionCoursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allExamSessionInvigilators = examSessionInvigilatorsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allExamSessionStudents = examSessionStudentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allExamSessions = examSessionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allInvigilators = invigilatorsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allRooms = roomsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allStudentCourseRegistrations = studentCourseRegistrationsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allStudents = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Filter data for selected academic period
      const periodCourses = allAcademicPeriodCourses.filter(apc => apc.academicPeriod?.id === selectedPeriod);
      const periodExamSessions = allExamSessions.filter(es => es.academicPeriod?.id === selectedPeriod);
      const periodStudentRegistrations = allStudentCourseRegistrations.filter(scr => scr.academicPeriod?.id === selectedPeriod);

      // Process Students with detailed information
      const studentsWithDetails = allStudents.map(student => {
        const studentRegistrations = periodStudentRegistrations.filter(scr => scr.student?.id === student.id);
        const registeredCourses = allCourses.filter(course => 
          studentRegistrations.some(scr => scr.course?.id === course.id)
        );
        const examSessionsAttended = periodExamSessions.filter(session =>
          allExamSessionStudents.some(ess => ess.examSession?.id === session.id && ess.student?.id === student.id)
        );

        return {
          ...student,
          coursesRegistered: registeredCourses.map(c => c.name).join(', '),
          coursesCount: registeredCourses.length,
          sessionsAttended: examSessionsAttended.length,
          isVerified: student.verified || false,
        };
      });

      // Process Courses with detailed information
      const coursesWithDetails = allCourses.map(course => {
        const courseRegistrations = periodStudentRegistrations.filter(scr => scr.course?.id === course.id);
        const registeredStudents = allStudents.filter(student =>
          courseRegistrations.some(scr => scr.student?.id === student.id)
        );
        const verifiedStudents = registeredStudents.filter(student => student.verified).length;
        const courseExamSessions = periodExamSessions.filter(session =>
          allExamSessionCourses.some(esc => esc.examSession?.id === session.id && esc.course?.id === course.id)
        );

        return {
          ...course,
          studentsRegistered: registeredStudents.length,
          studentsVerified: verifiedStudents,
          examSessionsCount: courseExamSessions.length,
          isInPeriod: periodCourses.some(pc => pc.course?.id === course.id),
        };
      }).filter(course => course.isInPeriod);

      // Process Rooms with detailed information
      const roomsWithDetails = allRooms.map(room => {
        const roomSessions = periodExamSessions.filter(session => session.room?.id === room.id);
        const roomInvigilators = allExamSessionInvigilators.filter(esi =>
          roomSessions.some(session => session.id === esi.examSession?.id)
        );
        const uniqueInvigilators = [...new Set(roomInvigilators.map(ri => ri.invigilator?.id))].length;

        return {
          ...room,
          examSessionsAssigned: roomSessions.length,
          totalInvigilators: uniqueInvigilators,
          isUsed: roomSessions.length > 0,
        };
      }).filter(room => room.isUsed);

      // Process Invigilators with detailed information
      const invigilatorsWithDetails = allInvigilators.map(invigilator => {
        const assignedSessions = allExamSessionInvigilators.filter(esi => 
          esi.invigilator?.id === invigilator.id && 
          periodExamSessions.some(session => session.id === esi.examSession?.id)
        );
        const uniqueSessions = [...new Set(assignedSessions.map(as => as.examSession?.id))].length;

        return {
          ...invigilator,
          sessionsAssigned: uniqueSessions,
          isActive: invigilator.activated || false,
        };
      }).filter(inv => inv.sessionsAssigned > 0);

      // Process Exam Sessions with detailed information
      const examSessionsWithDetails = periodExamSessions.map(session => {
        const sessionStudents = allExamSessionStudents.filter(ess => ess.examSession?.id === session.id);
        const sessionCourses = allExamSessionCourses.filter(esc => esc.examSession?.id === session.id);
        const sessionInvigilators = allExamSessionInvigilators.filter(esi => esi.examSession?.id === session.id);
        
        const room = allRooms.find(r => r.id === session.room?.id);
        const students = allStudents.filter(student => 
          sessionStudents.some(ss => ss.student?.id === student.id)
        );
        const courses = allCourses.filter(course =>
          sessionCourses.some(sc => sc.course?.id === course.id)
        );
        const invigilators = allInvigilators.filter(inv =>
          sessionInvigilators.some(si => si.invigilator?.id === inv.id)
        );

        return {
          ...session,
          room,
          studentsCount: students.length,
          coursesCount: courses.length,
          invigilatorsCount: invigilators.length,
          coursesNames: courses.map(c => c.name).join(', '),
          invigilatorsNames: invigilators.map(i => i.fullName || i.name).join(', '),
        };
      });

      // Calculate summary statistics
      const totalStudents = studentsWithDetails.length;
      const verifiedStudents = studentsWithDetails.filter(s => s.isVerified).length;
      const totalCourses = coursesWithDetails.length;
      const totalRooms = roomsWithDetails.length;
      const totalInvigilators = invigilatorsWithDetails.length;
      const totalSessions = periodExamSessions.length;
      const totalRegistrations = periodStudentRegistrations.length;

      // Generate PDF
      const blob = await pdf(
        <Document>
          {/* Page 1: Header, Summary, Academic Period, and Exam Sessions */}
          <Page size="A4" style={stylesPDF.page}>
            {/* Header Section */}
            <Text style={stylesPDF.header}>Comprehensive Attendance & Exam Report</Text>
            <Text style={stylesPDF.subheader}>{academicPeriod?.name || 'Academic Period'}</Text>
            <Text style={stylesPDF.description}>
              This report provides a comprehensive overview of all exam sessions, rooms, students, courses, and invigilators for the selected academic period.
            </Text>

            {/* Summary Section */}
            <View style={stylesPDF.section}>
              <Text style={stylesPDF.sectionTitle}>SUMMARY OVERVIEW</Text>
              <View style={stylesPDF.summaryContainer}>
                <View style={stylesPDF.summaryBox}>
                  <Text style={stylesPDF.summaryTitle}>Total Students</Text>
                  <Text style={stylesPDF.summaryValue}>{totalStudents}</Text>
                </View>
                <View style={stylesPDF.summaryBox}>
                  <Text style={stylesPDF.summaryTitle}>Verified Students</Text>
                  <Text style={stylesPDF.summaryValue}>{verifiedStudents} ({totalStudents > 0 ? Math.round((verifiedStudents/totalStudents)*100) : 0}%)</Text>
                </View>
                <View style={stylesPDF.summaryBox}>
                  <Text style={stylesPDF.summaryTitle}>Total Courses</Text>
                  <Text style={stylesPDF.summaryValue}>{totalCourses}</Text>
                </View>
                <View style={stylesPDF.summaryBox}>
                  <Text style={stylesPDF.summaryTitle}>Course Registrations</Text>
                  <Text style={stylesPDF.summaryValue}>{totalRegistrations}</Text>
                </View>
                <View style={stylesPDF.summaryBox}>
                  <Text style={stylesPDF.summaryTitle}>Total Exam Sessions</Text>
                  <Text style={stylesPDF.summaryValue}>{totalSessions}</Text>
                </View>
                <View style={stylesPDF.summaryBox}>
                  <Text style={stylesPDF.summaryTitle}>Rooms Utilized</Text>
                  <Text style={stylesPDF.summaryValue}>{totalRooms}</Text>
                </View>
                <View style={stylesPDF.summaryBox}>
                  <Text style={stylesPDF.summaryTitle}>Active Invigilators</Text>
                  <Text style={stylesPDF.summaryValue}>{totalInvigilators}</Text>
                </View>
                <View style={stylesPDF.summaryBox}>
                  <Text style={stylesPDF.summaryTitle}>Avg Students per Course</Text>
                  <Text style={stylesPDF.summaryValue}>{totalCourses > 0 ? Math.round(totalRegistrations/totalCourses) : 0}</Text>
                </View>
              </View>
            </View>

            {/* Academic Period Details */}
            <View style={stylesPDF.section}>
              <Text style={stylesPDF.sectionTitle}>ACADEMIC PERIOD DETAILS</Text>
              <View style={stylesPDF.table}>
                <View style={stylesPDF.tableRow}>
                  <Text style={[stylesPDF.tableColHeader, { width: '20%' }]}>Name</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '15%' }]}>Start Date</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '15%' }]}>End Date</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '15%' }]}>Registration Start</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '15%' }]}>Registration End</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '10%' }]}>Status</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '10%' }]}>Type</Text>
                </View>
                <View style={stylesPDF.tableRow}>
                  <Text style={[stylesPDF.tableCol, { width: '20%' }]}>{academicPeriod?.name || 'N/A'}</Text>
                  <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{formatDate(academicPeriod?.startDate)}</Text>
                  <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{formatDate(academicPeriod?.endDate)}</Text>
                  <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{formatDate(academicPeriod?.registrationStart)}</Text>
                  <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{formatDate(academicPeriod?.registrationEnd)}</Text>
                  <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{academicPeriod?.status || 'N/A'}</Text>
                  <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{academicPeriod?.type || 'N/A'}</Text>
                </View>
              </View>
            </View>

            {/* Exam Sessions Table */}
            <View style={stylesPDF.section}>
              <Text style={stylesPDF.sectionTitle}>EXAM SESSIONS</Text>
              <View style={stylesPDF.table}>
                <View style={stylesPDF.tableRow}>
                  <Text style={[stylesPDF.tableColHeader, { width: '12%' }]}>Session ID</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '10%' }]}>Date</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '12%' }]}>Start Time</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '12%' }]}>End Time</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '12%' }]}>Room</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '10%' }]}>Students</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '10%' }]}>Courses</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '12%' }]}>Invigilators</Text>
                </View>
                {examSessionsWithDetails.map((session, index) => (
                  <View style={index % 2 === 0 ? stylesPDF.tableRow : stylesPDF.tableRowAlt} key={session.id}>
                    <Text style={[stylesPDF.tableCol, { width: '12%' }]}>{session.id.substring(0, 8)}...</Text>
                    <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{session.date || formatDate(session.sessionDate)}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '12%' }]}>{formatTime(session.startTime)}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '12%' }]}>{formatTime(session.endTime)}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '12%' }]}>{session.room?.name || 'N/A'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{session.studentsCount}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{session.coursesCount}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '12%' }]}>{session.invigilatorsCount}</Text>
                  </View>
                ))}
              </View>
            </View>
            
            <Text style={stylesPDF.pageNumber} render={({ pageNumber, totalPages }) => (
              `Page ${pageNumber} of ${totalPages}`
            )} fixed />
          </Page>

          {/* Page 2: Students and Courses */}
          <Page size="A4" style={stylesPDF.page}>
            {/* Students Table */}
            <View style={stylesPDF.section}>
              <Text style={stylesPDF.sectionTitle}>STUDENTS REGISTERED</Text>
              <View style={stylesPDF.table}>
                <View style={stylesPDF.tableRow}>
                  <Text style={[stylesPDF.tableColHeader, { width: '15%' }]}>First Name</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '15%' }]}>Last Name</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '15%' }]}>Student ID</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '15%' }]}>Program</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '10%' }]}>Study Year</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '10%' }]}>Verified</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '10%' }]}>Courses</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '10%' }]}>Sessions</Text>
                </View>
                {studentsWithDetails.map((student, index) => (
                  <View style={index % 2 === 0 ? stylesPDF.tableRow : stylesPDF.tableRowAlt} key={student.id}>
                    <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{student.firstName || 'N/A'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{student.lastName || 'N/A'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{student.studentId || student.idNumber || 'N/A'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{student.program || 'N/A'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{student.studyYear || 'N/A'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{student.isVerified ? 'Yes' : 'No'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{student.coursesCount}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{student.sessionsAttended}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Courses Table */}
            <View style={stylesPDF.section}>
              <Text style={stylesPDF.sectionTitle}>COURSES OFFERED</Text>
              <View style={stylesPDF.table}>
                <View style={stylesPDF.tableRow}>
                  <Text style={[stylesPDF.tableColHeader, { width: '20%' }]}>Course Name</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '15%' }]}>Course Code</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '15%' }]}>Department</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '10%' }]}>Level</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '10%' }]}>Credit</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '15%' }]}>Students Reg.</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '15%' }]}>Students Verified</Text>
                </View>
                {coursesWithDetails.map((course, index) => (
                  <View style={index % 2 === 0 ? stylesPDF.tableRow : stylesPDF.tableRowAlt} key={course.id}>
                    <Text style={[stylesPDF.tableCol, { width: '20%' }]}>{course.name || 'N/A'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{course.code || course.courseCode || 'N/A'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{course.department || 'N/A'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{course.level || 'N/A'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{course.credit || course.credits || 'N/A'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{course.studentsRegistered}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{course.studentsVerified}</Text>
                  </View>
                ))}
              </View>
            </View>
            
            <Text style={stylesPDF.pageNumber} render={({ pageNumber, totalPages }) => (
              `Page ${pageNumber} of ${totalPages}`
            )} fixed />
          </Page>

          {/* Page 3: Rooms and Invigilators */}
          <Page size="A4" style={stylesPDF.page}>
            {/* Rooms Table */}
            <View style={stylesPDF.section}>
              <Text style={stylesPDF.sectionTitle}>ROOMS UTILIZED</Text>
              <View style={stylesPDF.table}>
                <View style={stylesPDF.tableRow}>
                  <Text style={[stylesPDF.tableColHeader, { width: '15%' }]}>Room Name</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '20%' }]}>Location</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '10%' }]}>Capacity</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '15%' }]}>Room Type</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '10%' }]}>Status</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '15%' }]}>Exam Sessions</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '15%' }]}>Total Invigilators</Text>
                </View>
                {roomsWithDetails.map((room, index) => (
                  <View style={index % 2 === 0 ? stylesPDF.tableRow : stylesPDF.tableRowAlt} key={room.id}>
                    <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{room.name || 'N/A'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '20%' }]}>{room.location || 'N/A'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{room.capacity || 'N/A'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{room.type || room.roomType || 'N/A'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{room.status || 'N/A'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{room.examSessionsAssigned}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{room.totalInvigilators}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Invigilators Table */}
            <View style={stylesPDF.section}>
              <Text style={stylesPDF.sectionTitle}>INVIGILATORS ASSIGNED</Text>
              <View style={stylesPDF.table}>
                <View style={stylesPDF.tableRow}>
                  <Text style={[stylesPDF.tableColHeader, { width: '25%' }]}>Full Name</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '20%' }]}>Staff ID</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '20%' }]}>Faculty</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '15%' }]}>Phone</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '10%' }]}>Activated</Text>
                  <Text style={[stylesPDF.tableColHeader, { width: '10%' }]}>Sessions</Text>
                </View>
                {invigilatorsWithDetails.map((invigilator, index) => (
                  <View style={index % 2 === 0 ? stylesPDF.tableRow : stylesPDF.tableRowAlt} key={invigilator.id}>
                    <Text style={[stylesPDF.tableCol, { width: '25%' }]}>{invigilator.fullName || invigilator.name || 'N/A'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '20%' }]}>{invigilator.staffId || invigilator.idNumber || 'N/A'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '20%' }]}>{invigilator.faculty || 'N/A'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{invigilator.phone || 'N/A'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{invigilator.isActive ? 'Yes' : 'No'}</Text>
                    <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{invigilator.sessionsAssigned}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Footer */}
            <Text style={stylesPDF.footer}>
              Report generated by: {currentUser?.email || 'Unknown'} | {new Date().toLocaleString()}
            </Text>
            
            <Text style={stylesPDF.pageNumber} render={({ pageNumber, totalPages }) => (
              `Page ${pageNumber} of ${totalPages}`
            )} fixed />
          </Page>
        </Document>
      ).toBlob();

      // Download PDF
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Comprehensive_Report_${academicPeriod?.name?.replace(/\s+/g, '_') || selectedPeriod}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Comprehensive report generated successfully' });
    } catch (err) {
      console.error('Error generating report:', err);
      setMessage({ type: 'error', text: 'Error generating comprehensive report: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="w-[650px] p-4 flex flex-col justify-center items-center h-[65dvh]">
        <div className="loader"></div>
        <p className="mt-4">Loading academic periods...</p>
      </div>
    );
  }

  return (
    <div className="w-[650px] p-4">
      {message && (
        <div className="cursor-default w-full text-center text-xs font-semibold mb-2 truncate">
          <p
            className={
              message.type === 'warning'
                ? 'p-2 bg-yellow-50 text-yellow-500'
                : message.type === 'info'
                ? 'p-2 bg-blue-100 text-blue-500'
                : message.type === 'success'
                ? 'p-2 bg-green-100 text-green-500'
                : message.type === 'error'
                ? 'p-2 bg-red-100 text-red-500'
                : 'text-white'
            }
            title={message.type}
          >
            {message.text}
          </p>
        </div>
      )}

      <form onSubmit={handleGenerateReport}>
        <div className="flex justify-between items-start gap-2 mb-4">
          <div className="w-full input-group relative flex items-center border border-gray-300 px-3 py-2">
            <label className="pr-2 text-gray-500 text-sm border-r border-gray-200">Academic Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="uppercase text-gray-700 ml-2 p-[.12rem] w-[60%] border-none outline-none bg-transparent"
            >
              {periodOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full mt-8 flex items-center justify-center gap-x-4 btn-primary"
          disabled={loading}
        >
          {loading && <div className="btn-loader"></div>}
          <p>Generate Comprehensive Report</p>
        </button>
      </form>
    </div>
  );
};

export default GetReport;