import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: 'AIzaSyCIIOuz5Vwq04LM2eTKtPlaJ5N_9Qdp-Lc',
  authDomain: 'mishkat3.firebaseapp.com',
  projectId: 'mishkat3',
  storageBucket: 'mishkat3.firebasestorage.app',
  messagingSenderId: '981973978775',
  appId: '1:981973978775:web:110f46d16af4e99e58a3d2',
};

// Singleton initialization without duplicate initializeApp
export const firebaseApp: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const firestoreDb: Firestore = getFirestore(firebaseApp);
