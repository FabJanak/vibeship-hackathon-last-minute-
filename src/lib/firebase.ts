import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
  signInAnonymously
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  setDoc,
  getDocs
} from 'firebase/firestore';
import firebaseConfigDefault from '../../firebase-applet-config.json';
import { Task } from '../types';

// Support overriding Firebase configuration dynamically via environment variables
// This allows developers/owners to connect their own production Google Cloud & Firebase project so that any external user can sign in!
const env = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfigDefault.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigDefault.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfigDefault.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigDefault.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigDefault.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfigDefault.appId,
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Setup Google Auth Provider (Standard login, no Workspace/Calendar permissions to prevent Testing Mode blockages for external users)
const provider = new GoogleAuthProvider();

// In-memory access token cache
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize auth listener
export const initAuth = (
  onAuthSuccess: (user: User, token: string | null) => void,
  onAuthFailure: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // If we don't have a cached token but we have a user,
      // it means they refreshed. They might need to sign in again to get a fresh accessToken
      // since Firebase Auth doesn't persist the provider's OAuth token.
      // We will still pass the user.
      onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      onAuthFailure();
    }
  });
};

// Sign in with Google (Standard login)
export const googleSignIn = async (): Promise<{ user: User; accessToken: string | null } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    // credential?.accessToken might be present but has no Calendar scopes
    return { user: result.user, accessToken: credential?.accessToken || null };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Connect Google Calendar (Requests sensitive scopes dynamically when clicked)
export const connectCalendar = async (): Promise<string | null> => {
  const calendarProvider = new GoogleAuthProvider();
  calendarProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');
  calendarProvider.addScope('https://www.googleapis.com/auth/calendar.events');
  calendarProvider.setCustomParameters({
    prompt: 'consent'
  });

  try {
    const result = await signInWithPopup(auth, calendarProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No access token returned for Google Calendar scopes');
    }
    cachedAccessToken = credential.accessToken;
    return cachedAccessToken;
  } catch (error: any) {
    console.error('Calendar connection error:', error);
    throw error;
  }
};

// Sign in anonymously as guest
export const guestSignIn = async (): Promise<{ user: User } | null> => {
  try {
    const result = await signInAnonymously(auth);
    return { user: result.user };
  } catch (error: any) {
    console.error('Guest sign in error:', error);
    throw error;
  }
};

// Log out
export const logoutUser = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Get cached access token
export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

// --- Firestore CRUD for Tasks ---

const TASKS_COLLECTION = 'tasks';

// Add Task
export const dbAddTask = async (task: Omit<Task, 'id' | 'createdAt'>): Promise<string> => {
  const colRef = collection(db, TASKS_COLLECTION);
  const docRef = await addDoc(colRef, {
    ...task,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
};

// Update Task
export const dbUpdateTask = async (taskId: string, updates: Partial<Task>): Promise<void> => {
  const docRef = doc(db, TASKS_COLLECTION, taskId);
  await updateDoc(docRef, updates);
};

// Delete Task
export const dbDeleteTask = async (taskId: string): Promise<void> => {
  const docRef = doc(db, TASKS_COLLECTION, taskId);
  await deleteDoc(docRef);
};

// Subscribe to Tasks for a User
export const subscribeToTasks = (
  userId: string,
  onUpdate: (tasks: Task[]) => void
) => {
  const colRef = collection(db, TASKS_COLLECTION);
  const q = query(
    colRef,
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const tasks: Task[] = [];
      snapshot.forEach((doc) => {
        tasks.push({ id: doc.id, ...doc.data() } as Task);
      });
      
      // Sort tasks by deadline ascending on client side to avoid Firestore composite index requirement
      tasks.sort((a, b) => {
        const dateA = a.deadline ? new Date(a.deadline).getTime() : 0;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : 0;
        return dateA - dateB;
      });

      onUpdate(tasks);
    },
    (error) => {
      console.error('Error fetching tasks from Firestore:', error);
    }
  );
};
