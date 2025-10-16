// 1. Import Firebase app and Firestore
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

// 2. Firebase config
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// 3. Initialize app
const app = initializeApp(firebaseConfig);

// 4. Initialize Firestore
const db = getFirestore(app);

// 5. Export Firestore and functions to use in backend routes
export { db, collection, doc, getDoc, setDoc, updateDoc };
