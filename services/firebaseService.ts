
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where,
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import { InterestRecord } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

const getRecordsPath = (userId: string) => `users/${userId}/records`;

function cleanObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(v => (v && typeof v === 'object') ? cleanObject(v) : v)
              .filter(v => v !== undefined);
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const newObj: any = {};
    Object.keys(obj).forEach((key) => {
      const val = obj[key];
      if (val !== undefined) {
        newObj[key] = (val && typeof val === 'object') ? cleanObject(val) : val;
      }
    });
    return newObj;
  }
  return obj;
}

export const syncUserToFirestore = async (user: any) => {
  const userDoc = doc(db, 'users', user.uid);
  try {
    const data = cleanObject({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLogin: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await setDoc(userDoc, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
};

export const saveRecordToFirestore = async (userId: string, record: InterestRecord) => {
  const path = `${getRecordsPath(userId)}/${record.id}`;
  try {
    // Ensure updatedAt is present even if not in the original record
    const dataToSave = { 
      ...record, 
      userId,
      updatedAt: record.updatedAt || new Date().toISOString()
    };
    const cleanedData = cleanObject(dataToSave);
    console.log('Sending to Firestore:', JSON.stringify(cleanedData));
    await setDoc(doc(db, getRecordsPath(userId), record.id.toString()), cleanedData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteRecordFromFirestore = async (userId: string, recordId: number) => {
  const path = `${getRecordsPath(userId)}/${recordId}`;
  try {
    await deleteDoc(doc(db, getRecordsPath(userId), recordId.toString()));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const subscribeToRecords = (userId: string, callback: (records: InterestRecord[]) => void) => {
  const path = getRecordsPath(userId);
  const q = collection(db, path);
  
  return onSnapshot(q, (snapshot) => {
    const records: InterestRecord[] = [];
    snapshot.forEach((doc) => {
      records.push(doc.data() as InterestRecord);
    });
    callback(records);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};
