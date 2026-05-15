
import { InterestRecord } from '../types';
import { auth } from '../lib/firebase';
import { saveRecordToFirestore, deleteRecordFromFirestore } from './firebaseService';

const STORAGE_KEY = 'interestRecords';
const DELETED_KEY = 'deletedRecords';
const LAST_SYNC_KEY = 'lastSyncTime';

export const getRecords = (): InterestRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error parsing records", e);
    return [];
  }
};

export const getDeletedIds = (): number[] => {
  try {
    const data = localStorage.getItem(DELETED_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const clearDeletedIds = () => {
  localStorage.removeItem(DELETED_KEY);
};

export const getLastSyncTime = (): string => {
  return localStorage.getItem(LAST_SYNC_KEY) || '1970-01-01T00:00:00.000Z';
};

export const setLastSyncTime = (time: string) => {
  localStorage.setItem(LAST_SYNC_KEY, time);
};

export const saveRecords = (records: InterestRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    // Trigger a custom event so other components know data changed
    window.dispatchEvent(new Event('storage-updated'));
  } catch (e) {
    console.error("Error saving records", e);
  }
};

export const addRecord = (record: InterestRecord) => {
  const records = getRecords();
  record.updatedAt = new Date().toISOString();
  records.push(record);
  saveRecords(records);

  // Firestore Sync
  if (auth.currentUser) {
    saveRecordToFirestore(auth.currentUser.uid, record);
  }
};

export const updateRecord = (record: InterestRecord) => {
  const records = getRecords();
  record.updatedAt = new Date().toISOString();
  // Find index using loose equality to handle potential string/number id mismatches
  const index = records.findIndex(r => r.id == record.id);
  
  if (index !== -1) {
    records[index] = record;
  } else {
    // Fallback if not found, though shouldn't happen in edit mode
    records.push(record);
  }
  saveRecords(records);

  // Firestore Sync
  if (auth.currentUser) {
    saveRecordToFirestore(auth.currentUser.uid, record);
  }
};

export const deleteRecord = (id: number) => {
  console.log('Attempting to delete record with ID:', id, typeof id);
  const records = getRecords();
  console.log('Current records count:', records.length);
  
  // Track deleted ID for incremental sync
  const deletedIds = getDeletedIds();
  if (!deletedIds.includes(id)) {
    deletedIds.push(id);
    localStorage.setItem(DELETED_KEY, JSON.stringify(deletedIds));
  }

  // Use .filter() to remove ALL instances that match the ID. 
  const updatedRecords = records.filter(r => r.id != id);
  console.log('Updated records count:', updatedRecords.length);
  
  saveRecords(updatedRecords);

  // Firestore Sync
  if (auth.currentUser) {
    console.log('Syncing delete to Firestore for user:', auth.currentUser.uid);
    deleteRecordFromFirestore(auth.currentUser.uid, id);
  }

  return updatedRecords;
};

export const toggleFavorite = (id: number) => {
  const records = getRecords();
  // Use loose equality here too for consistency
  const record = records.find(r => r.id == id);
  if (record) {
    record.isFavorite = !record.isFavorite;
    record.updatedAt = new Date().toISOString();
    saveRecords(records);

    // Firestore Sync
    if (auth.currentUser) {
      saveRecordToFirestore(auth.currentUser.uid, record);
    }
  }
  return records;
};
