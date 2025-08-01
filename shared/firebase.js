// shared/firebase.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB3iA9M5PUPVjyQYfSUlCFEI5ahPbnwVak",
  authDomain: "eps-web-441d4.firebaseapp.com",
  databaseURL: "https://eps-web-441d4-default-rtdb.firebaseio.com", // Ensure this is included
  projectId: "eps-web-441d4",
  storageBucket: "eps-web-441d4.appspot.com",
  messagingSenderId: "633499193553",
  appId: "1:633499193553:web:d2af8d7bc0cd4f9a90f5f0"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app); 
const firestore = getFirestore(app);


export { auth, db, firestore }; // Make sure this is exported
