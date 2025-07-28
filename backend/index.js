const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const serviceAccount = require('./firebase/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://eps-web-441d4-default-rtdb.firebaseio.com"

});

// API endpoint to assign role
app.post('/setRole', async (req, res) => {
  const { uid, role } = req.body;

  if (!uid || !['admin', 'invigilator'].includes(role)) {
    return res.status(400).json({ error: 'Missing or invalid uid/role' });
  }

  try {
    await admin.auth().setCustomUserClaims(uid, { role });
    return res.status(200).json({ message: `Role '${role}' assigned to user with UID: ${uid}` });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Role management server running on http://localhost:${PORT}`);
});
