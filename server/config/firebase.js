// Simple Firestore REST API wrapper
// No authentication needed for public Firestore databases in test mode

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/**
 * Gets a document from Firestore using REST API
 */
export async function getDoc(collectionPath, docId) {
  const url = `${BASE_URL}/${collectionPath}/${docId}`;
  
  try {
    const response = await fetch(url);
    
    if (response.status === 404) {
      return { exists: false, data: () => null };
    }
    
    if (!response.ok) {
      throw new Error(`Firestore error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      exists: true,
      data: () => convertFirestoreData(data.fields),
      id: docId
    };
  } catch (error) {
    console.error('Error getting document:', error);
    throw error;
  }
}

/**
 * Sets/updates a document in Firestore
 */
export async function setDoc(collectionPath, docId, data, options = {}) {
  const url = `${BASE_URL}/${collectionPath}/${docId}`;
  const firestoreData = convertToFirestoreFormat(data);
  
  try {
    const response = await fetch(url, {
      method: options.merge ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: firestoreData })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Firestore error: ${error.error?.message || response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error setting document:', error);
    throw error;
  }
}

/**
 * Updates specific fields in a document
 */
export async function updateDoc(collectionPath, docId, data) {
  return setDoc(collectionPath, docId, data, { merge: true });
}

/**
 * Gets all documents from a collection
 */
export async function getDocs(collectionPath, whereClause = null) {
  let url = `${BASE_URL}/${collectionPath}`;
  
  // Simple where clause support (field == value)
  if (whereClause) {
    const { field, value } = whereClause;
    // Note: REST API filtering is limited, consider using composite indexes
    console.warn('WHERE clause filtering in REST API is limited. Consider upgrading to Admin SDK.');
  }
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Firestore error: ${response.statusText}`);
    }
    
    const data = await response.json();
    const docs = (data.documents || []).map(doc => {
      const docId = doc.name.split('/').pop();
      return {
        id: docId,
        data: () => convertFirestoreData(doc.fields),
        exists: true
      };
    });
    
    return {
      docs,
      empty: docs.length === 0
    };
  } catch (error) {
    console.error('Error getting documents:', error);
    throw error;
  }
}

/**
 * Helper: Convert Firestore REST format to plain object
 */
function convertFirestoreData(fields) {
  if (!fields) return null;
  
  const result = {};
  for (const [key, value] of Object.entries(fields)) {
    // Firestore REST API uses typed values like { stringValue: "foo" }
    if (value.stringValue !== undefined) result[key] = value.stringValue;
    else if (value.integerValue !== undefined) result[key] = parseInt(value.integerValue);
    else if (value.doubleValue !== undefined) result[key] = value.doubleValue;
    else if (value.booleanValue !== undefined) result[key] = value.booleanValue;
    else if (value.nullValue !== undefined) result[key] = null;
    else if (value.mapValue) result[key] = convertFirestoreData(value.mapValue.fields);
    else if (value.arrayValue) {
      result[key] = (value.arrayValue.values || []).map(v => 
        v.mapValue ? convertFirestoreData(v.mapValue.fields) : v
      );
    }
  }
  return result;
}

/**
 * Helper: Convert plain object to Firestore REST format
 */
function convertToFirestoreFormat(obj) {
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null) {
      result[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      result[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      result[key] = Number.isInteger(value) 
        ? { integerValue: value.toString() }
        : { doubleValue: value };
    } else if (typeof value === 'boolean') {
      result[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      result[key] = {
        arrayValue: {
          values: value.map(v => 
            typeof v === 'object' 
              ? { mapValue: { fields: convertToFirestoreFormat(v) } }
              : convertToFirestoreFormat({ v })[0]
          )
        }
      };
    } else if (typeof value === 'object') {
      result[key] = {
        mapValue: {
          fields: convertToFirestoreFormat(value)
        }
      };
    }
  }
  
  return result;
}

// Simple DB reference object for compatibility
export const db = {
  collection: (name) => ({
    doc: (id) => ({
      get: () => getDoc(name, id),
      set: (data, options) => setDoc(name, id, data, options),
      update: (data) => updateDoc(name, id, data)
    }),
    where: (field, op, value) => ({
      get: () => getDocs(name, { field, op, value })
    })
  })
};

export function getDB() {
  return db;
}