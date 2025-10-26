import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let db;

/**
 * Initializes the Firestore database connection using service account credentials
 * from environment variables.
 */
function initializeDB() {
  if (db) return;

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

  initializeApp({
    credential: cert(serviceAccount),
  });

  db = getFirestore();
}

/**
 * @returns {import('firebase-admin/firestore').Firestore} The Firestore database instance.
 */
export function getDB() {
  if (!db) {
    initializeDB();
  }
  return db;
}