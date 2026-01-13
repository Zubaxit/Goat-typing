// firebase-config.js (FULL & FIXED)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// Auth Imports
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged, 
    updateProfile 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firestore Imports (🔥 getDocs যোগ করা হয়েছে)
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs,        // <--- এই লাইনটা মিসিং ছিল
    updateDoc, 
    deleteDoc, 
    addDoc, 
    collection, 
    query, 
    where, 
    onSnapshot, 
    arrayUnion, 
    increment 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDwMK4j6DliUE396Ud1mQ6VzqSx2SvcZOc",
  authDomain: "goat-typing.firebaseapp.com",
  projectId: "goat-typing",
  storageBucket: "goat-typing.firebasestorage.app",
  messagingSenderId: "583674288538",
  appId: "1:583674288538:web:63f9ff33513a4c434bc223",
  measurementId: "G-GRDNTXQ2K0"
};

// Initialize
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// 🔥 EXPORT EVERYTHING (সহজে ব্যবহারের জন্য)
export { 
    auth, 
    db, 
    provider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged, 
    updateProfile,
    // Firestore Functions
    doc, 
    setDoc, 
    getDoc, 
    getDocs,        // <--- এখানেও এক্সপোর্ট করতে হবে
    updateDoc, 
    deleteDoc, 
    addDoc, 
    collection, 
    query, 
    where, 
    onSnapshot, 
    arrayUnion, 
    increment 
};