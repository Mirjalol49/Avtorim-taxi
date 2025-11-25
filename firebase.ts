// Firebase Configuration
// IMPORTANT: Replace these values with your actual Firebase project credentials
// Get these from: Firebase Console > Project Settings > General > Your apps > SDK setup and configuration

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your Firebase project configuration
// You can get these values from Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyDMteL-XNVEkVcvpQxU9p0wlGc6zIaY02M",
    authDomain: "avtorim-taxi.firebaseapp.com",
    projectId: "avtorim-taxi",
    storageBucket: "avtorim-taxi.firebasestorage.app",
    messagingSenderId: "964002518354",
    appId: "1:964002518354:web:4468e48fb9564cb6c3168b",
    measurementId: "G-0JTYLPW7SX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

export default app;
