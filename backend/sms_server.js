// index.js
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// === Predefined configuration for testing ===
const VALID_API_KEY = 'test-api-key-123'; // This should match what user enters in AddConfig
const presetConfig = {
  contentType: 'application/json',
  timeout: 30000,
  method: 'GET',
  sslVerify: true,
};

// === Predefined student data as a list of eligible students  from SMS===
const students = [
  {
    id: '111111',
    firstname: 'Dalitso',
    lastname: 'Phiri',
    program: 'BBA',
    studyYear: 3,
    phone: '+263771234567',
  },
  {
    id: '222222',
    firstname: 'Jane',
    lastname: 'Doe',
    program: 'BSc ICT',
    studyYear: 2,
    phone: '+263778765432',
  },
];

// === Health check endpoint (for Test Connection) ===
app.get('/', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Missing or invalid API key' });
  }

  const apiKey = authHeader.split(' ')[1];
  if (apiKey !== VALID_API_KEY) {
    return res.status(403).json({ status: 'error', message: 'Invalid API key' });
  }

  res.status(200).json({ status: 'ok', message: 'Connection successful' });
});

// === Student lookup endpoint ===
app.get('/student', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Missing or invalid API key' });
  }

  const apiKey = authHeader.split(' ')[1];
  if (apiKey !== VALID_API_KEY) {
    return res.status(403).json({ status: 'error', message: 'Invalid API key' });
  }

  const studentId = req.query.studentId;
  if (!studentId) {
    return res.status(400).json({ status: 'error', message: 'studentId query parameter is required' });
  }

  const student = students.find((s) => s.id === studentId);

  if (!student) {
    return res.status(404).json({ status: 'error', message: 'Student not found in Student Management System' });
  }

  // Return student details
  res.status(200).json({
    status: 'ok',
    student: {
      id: student.id || 'N/A',
      firstname: student.firstname || 'N/A',
      lastname: student.lastname || 'N/A',
      program: student.program || 'N/A',
      studyYear: student.studyYear || 'N/A',
      phone: student.phone || 'N/A',
    },
  });
});

// === Start server ===
app.listen(PORT, () => {
  console.log(`✅ SMS MOCK SERVER RUNNING SUCCESSFULLY`);
  console.log(`✅ http://localhost:${PORT}`);
});
