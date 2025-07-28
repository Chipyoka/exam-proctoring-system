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

// Endpoint to get user role by UID
app.get('/user-role/:uid', async (req, res) => {
  const { uid } = req.params;

  try {
    const user = await admin.auth().getUser(uid);
    const customClaims = user.customClaims || {};

    if (!customClaims.role) {
      return res.status(404).json({ error: 'Role not set for this user.' });
    }

    return res.json({ uid, role: customClaims.role });
  } catch (error) {
    console.error('Error fetching user data:', error.message);
    return res.status(500).json({ error: 'Failed to fetch user role.' });
  }
});





const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Role management server running on http://localhost:${PORT}`);
});
