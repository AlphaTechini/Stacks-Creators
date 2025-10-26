import { cvToJSON } from '@stacks/transactions';
import { getDB } from '../config/firebase.js';

/**
 * Updates a user's profile information based on a 'set-username' transaction.
 * This function is called by the chain event listener.
 *
 * @param {object} tx - The transaction object from the chain event listener.
 */
export async function updateUserProfile(tx) {
  const db = getDB();
  const senderAddress = tx.sender_address;

  // The username is the first argument in the 'set-username' function call
  const usernameCV = tx.contract_call.function_args[0];
  const username = cvToJSON(usernameCV).value;

  // Update the user document in Firestore
  const userRef = db.collection('users').doc(senderAddress);
  await userRef.update({ username });
  console.log(`[UserService] Updated username for ${senderAddress} to "${username}"`);
}