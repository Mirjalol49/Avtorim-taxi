// Firebase Configuration
// IMPORTANT: Replace these values with your actual Firebase project credentials
// Get these from: Firebase Console > Project Settings > General > Your apps > SDK setup and configuration

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your Firebase project configuration
// You can get these values from Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyAce_xYPwb5IAV_r2U4QTskIkeK25PnxQk",
    authDomain: "taksapark-3e375.firebaseapp.com",
    projectId: "taksapark-3e375",
    storageBucket: "taksapark-3e375.firebasestorage.app",
    messagingSenderId: "119121883252",
    appId: "1:119121883252:web:8786ec719650c1e94ea121",
    measurementId: "G-L33RLZNEEG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app, 'default');

export default app;
