import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
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
  section: { marginBottom: 20 },
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
  tableRow: { flexDirection: 'row' },
  tableRowAlt: { flexDirection: 'row', backgroundColor: '#f8f9fa' },
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
  summaryContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  summaryBox: {
    width: '48%',
    margin: '1%',
    padding: 8,
    backgroundColor: '#f8f9fa',
    border: '1pt solid #bdc3c7',
    borderRadius: 3,
  },
  summaryTitle: { fontSize: 9, fontWeight: 'bold', color: '#2c3e50', marginBottom: 3 },
  summaryValue: { fontSize: 10, fontWeight: 'bold', color: '#27ae60' },
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

  // --- Load academic periods ---
  useEffect(() => {
    const fetchPeriods = async () => {
      setDataLoading(true);
      try {
        const periodsSnap = await getDocs(collection(firestore, 'academicPeriod'));
        const periods = periodsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        console.log('Academic periods fetched:', periods);
        setPeriodOptions(periods);
        if (periods.length > 0) setSelectedPeriod(periods[0].id);
      } catch (err) {
        console.error('Error loading periods:', err);
        setMessage({ type: 'error', text: 'Failed to load academic periods' });
      } finally {
        setDataLoading(false);
      }
    };
    fetchPeriods();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000).toLocaleDateString();
    if (typeof timestamp === 'string') return timestamp.split('T')[0];
    return 'N/A';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.seconds)
      return new Date(timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (typeof timestamp === 'string') return timestamp;
    return 'N/A';
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    if (!selectedPeriod) return setMessage({ type: 'error', text: 'Please select an academic period' });

    setLoading(true);
    setMessage({});
    console.clear();
    console.log('Generating report for period:', selectedPeriod);

    try {
      // --- Fetch all collections in parallel ---
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
        studentsSnap,
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
        getDocs(collection(firestore, 'students')),
      ]);

      console.log('All data fetched from Firestore');

      // --- Convert snapshots to arrays ---
      const academicPeriods = academicPeriodsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const selectedPeriodData = academicPeriods.find((p) => p.id === selectedPeriod);
      const courses = coursesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const students = studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const rooms = roomsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const invigilators = invigilatorsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const sessions = examSessionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const periodCourses = academicPeriodCoursesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const sessionCourses = examSessionCoursesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const sessionInvigs = examSessionInvigilatorsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const sessionStudents = examSessionStudentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const registrations = studentCourseRegistrationsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      console.log('Parsed documents:', {
        courses, students, rooms, invigilators, sessions, periodCourses, sessionCourses,
        sessionInvigs, sessionStudents, registrations
      });

      // --- Filter sessions by academic period ---
      const periodSessions = sessions.filter(
        (s) => s.academicPeriod?.path?.split('/').pop() === selectedPeriod
      );
      console.log('Filtered period sessions:', periodSessions);

      // --- Map relationships using IDs ---
      const coursesWithDetails = courses
        .filter((c) =>
          periodCourses.some(
            (apc) => apc.course?.path?.split('/').pop() === c.id && apc.academicPeriod?.path?.split('/').pop() === selectedPeriod
          )
        )
        .map((c) => {
          const regForCourse = registrations.filter((r) => r.courseId === c.id);
          const studentsRegistered = regForCourse.length;
          const verifiedStudents = regForCourse.filter((r) => {
            const st = students.find((s) => s.id === r.studentId);
            return st?.isVerified;
          }).length;

          const courseSessions = sessionCourses.filter((sc) => sc.course?.path?.split('/').pop() === c.id);
          return {
            ...c,
            studentsRegistered,
            studentsVerified: verifiedStudents,
            examSessionsCount: courseSessions.length,
          };
        });

      const studentsWithDetails = students.map((s) => {
        const regs = registrations.filter((r) => r.studentId === s.id);
        const sessionsAttended = sessionStudents.filter((ss) => ss.student?.path?.split('/').pop() === s.id);
        return {
          ...s,
          coursesCount: regs.length,
          sessionsAttended: sessionsAttended.length,
        };
      });

      const roomsWithDetails = rooms.map((r) => {
        const usedSessions = periodSessions.filter(
          (s) => s.room?.path?.split('/').pop() === r.id
        );
        const invigs = sessionInvigs.filter((si) =>
          usedSessions.some((us) => si.session?.path?.split('/').pop() === us.id)
        );
        return {
          ...r,
          examSessionsAssigned: usedSessions.length,
          totalInvigilators: new Set(invigs.map((i) => i.invigilator?.path?.split('/').pop())).size,
          isUsed: usedSessions.length > 0,
        };
      }).filter(r => r.isUsed);

      const invigilatorsWithDetails = invigilators.map((i) => {
        const assigned = sessionInvigs.filter(
          (si) => si.invigilator?.path?.split('/').pop() === i.id &&
            periodSessions.some((s) => si.session?.path?.split('/').pop() === s.id)
        );
        return {
          ...i,
          sessionsAssigned: new Set(assigned.map((a) => a.session?.path?.split('/').pop())).size,
          isActive: i.isActivated || false,
        };
      }).filter(i => i.sessionsAssigned > 0);

      const sessionsWithDetails = periodSessions.map((s) => {
        const sStudents = sessionStudents.filter((ss) => ss.session?.path?.split('/').pop() === s.id);
        const sCourses = sessionCourses.filter((sc) => sc.session?.path?.split('/').pop() === s.id);
        const sInvigs = sessionInvigs.filter((si) => si.session?.path?.split('/').pop() === s.id);
        const room = rooms.find((r) => r.id === s.room?.path?.split('/').pop());
        return {
          ...s,
          room,
          studentsCount: sStudents.length,
          coursesCount: sCourses.length,
          invigilatorsCount: sInvigs.length,
        };
      });

      // --- Summaries ---
      const totalStudents = studentsWithDetails.length;
      const verifiedStudents = studentsWithDetails.filter((s) => s.isVerified).length;
      const totalCourses = coursesWithDetails.length;
      const totalRooms = roomsWithDetails.length;
      const totalInvigs = invigilatorsWithDetails.filter((i) => i.isActive).length;
      const totalSessions = periodSessions.length;
      const totalRegistrations = registrations.length;

      console.log('Summary stats:', {
        totalStudents,
        verifiedStudents,
        totalCourses,
        totalRooms,
        totalInvigs,
        totalSessions,
        totalRegistrations,
      });

      // --- PDF Generation ---
    // Generate PDF
const blob = await pdf(
  <Document>
    {/* Page 1: Header, Summary, Academic Period, and Exam Sessions */}
    <Page size="A4" style={stylesPDF.page}>
      {/* Header Section */}
      <Text style={stylesPDF.header}>Comprehensive Attendance & Exam Report</Text>
      <Text style={stylesPDF.subheader}>{selectedPeriodData?.name || 'Academic Period'}</Text>
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
            <Text style={stylesPDF.summaryValue}>
              {verifiedStudents} ({totalStudents > 0 ? Math.round((verifiedStudents / totalStudents) * 100) : 0}%)
            </Text>
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
            <Text style={stylesPDF.summaryValue}>{totalInvigs}</Text>
          </View>
          <View style={stylesPDF.summaryBox}>
            <Text style={stylesPDF.summaryTitle}>Avg Students per Course</Text>
            <Text style={stylesPDF.summaryValue}>
              {totalCourses > 0 ? Math.round(totalRegistrations / totalCourses) : 0}
            </Text>
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
            <Text style={[stylesPDF.tableCol, { width: '20%' }]}>{selectedPeriodData?.name || 'N/A'}</Text>
            <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{formatDate(selectedPeriodData?.startDate)}</Text>
            <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{formatDate(selectedPeriodData?.endDate)}</Text>
            <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{formatDate(selectedPeriodData?.registrationStart)}</Text>
            <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{formatDate(selectedPeriodData?.registrationEnd)}</Text>
            <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{selectedPeriodData?.status || 'N/A'}</Text>
            <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{selectedPeriodData?.type || 'N/A'}</Text>
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
          {sessionsWithDetails.map((session, index) => (
            <View key={session.id} style={index % 2 === 0 ? stylesPDF.tableRow : stylesPDF.tableRowAlt}>
              <Text style={[stylesPDF.tableCol, { width: '12%' }]}>{session.id.substring(0, 8)}...</Text>
              <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{session.date || 'N/A'}</Text>
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

      <Text style={stylesPDF.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
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
            <View key={student.id} style={index % 2 === 0 ? stylesPDF.tableRow : stylesPDF.tableRowAlt}>
              <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{student.firstname || 'N/A'}</Text>
              <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{student.lastname || 'N/A'}</Text>
              <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{student.id}</Text>
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
            <View key={course.id} style={index % 2 === 0 ? stylesPDF.tableRow : stylesPDF.tableRowAlt}>
              <Text style={[stylesPDF.tableCol, { width: '20%' }]}>{course.name || 'N/A'}</Text>
              <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{course.id}</Text>
              <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{course.department || 'N/A'}</Text>
              <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{course.level || 'N/A'}</Text>
              <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{course.credit || 'N/A'}</Text>
              <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{course.studentsRegistered}</Text>
              <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{course.studentsVerified}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={stylesPDF.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
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
            <Text style={[stylesPDF.tableColHeader, { width: '15%' }]}>Status</Text>
            <Text style={[stylesPDF.tableColHeader, { width: '15%' }]}>Exam Sessions</Text>
            <Text style={[stylesPDF.tableColHeader, { width: '15%' }]}>Total Invigilators</Text>
          </View>
          {roomsWithDetails.map((room, index) => (
            <View key={room.id} style={index % 2 === 0 ? stylesPDF.tableRow : stylesPDF.tableRowAlt}>
              <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{room.name}</Text>
              <Text style={[stylesPDF.tableCol, { width: '20%' }]}>{room.location}</Text>
              <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{room.capacity}</Text>
              <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{room.status}</Text>
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
            <Text style={[stylesPDF.tableColHeader, { width: '20%' }]}>Faculty</Text>
            <Text style={[stylesPDF.tableColHeader, { width: '15%' }]}>Phone</Text>
            <Text style={[stylesPDF.tableColHeader, { width: '10%' }]}>Activated</Text>
            <Text style={[stylesPDF.tableColHeader, { width: '10%' }]}>Sessions</Text>
          </View>
          {invigilatorsWithDetails.map((inv, index) => (
            <View key={inv.id} style={index % 2 === 0 ? stylesPDF.tableRow : stylesPDF.tableRowAlt}>
              <Text style={[stylesPDF.tableCol, { width: '25%' }]}>{inv.fullname || 'N/A'}</Text>
              <Text style={[stylesPDF.tableCol, { width: '20%' }]}>{inv.faculty || 'N/A'}</Text>
              <Text style={[stylesPDF.tableCol, { width: '15%' }]}>{inv.phone || 'N/A'}</Text>
              <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{inv.isActive ? 'Yes' : 'No'}</Text>
              <Text style={[stylesPDF.tableCol, { width: '10%' }]}>{inv.sessionsAssigned}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={stylesPDF.footer}>
        Report generated by: {currentUser?.email || 'Unknown'} | {new Date().toLocaleString()}
      </Text>

      <Text style={stylesPDF.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
    </Page>
  </Document>
).toBlob();


      // --- Download PDF ---
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Comprehensive_Report_${selectedPeriodData?.name?.replace(/\s+/g, '_') || selectedPeriod}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Report generated successfully.' });
    } catch (err) {
      console.error('Error generating report:', err);
      setMessage({ type: 'error', text: 'Error generating report: ' + err.message });
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
      {message.text && (
        <div className="cursor-default w-full text-center text-xs font-semibold mb-2 truncate">
          <p
            className={
              message.type === 'success'
                ? 'p-2 bg-green-100 text-green-500'
                : message.type === 'error'
                ? 'p-2 bg-red-100 text-red-500'
                : 'p-2 bg-gray-100 text-gray-600'
            }
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
        <button type="submit" className="w-full mt-8 flex items-center justify-center gap-x-4 btn-primary" disabled={loading}>
          {loading && <div className="btn-loader"></div>}
          <p>Generate Comprehensive Report</p>
        </button>
      </form>
    </div>
  );
};

export default GetReport;
