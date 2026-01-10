// firebase-config.js (UPDATED & FIXED)

// 1. CDN থেকে Firebase ইম্পোর্ট (ব্রাউজারের জন্য এটি জরুরি)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. তোমার কনফিগারেশন (সঠিক API Key সহ)
const firebaseConfig = {
  apiKey: "AIzaSyDwMK4j6DliUE396Ud1mQ6VzqSx2SvcZOc", // ✅ তোমার দেওয়া সঠিক কি
  authDomain: "goat-typing.firebaseapp.com",
  projectId: "goat-typing",
  storageBucket: "goat-typing.firebasestorage.app",
  messagingSenderId: "583674288538",
  appId: "1:583674288538:web:63f9ff33513a4c434bc223",
  measurementId: "G-GRDNTXQ2K0"
};

// 3. অ্যাপ ইনিশিয়ালাইজ করা
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// 4. এক্সপোর্ট (যাতে auth-manager.js এটি ব্যবহার করতে পারে)
export { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc, updateDoc };

console.log("🔥 Firebase Config Loaded Correctly");