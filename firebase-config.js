// firebase-config.js (FINAL FIXED VERSION)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// তোমার কনফিগারেশন
const firebaseConfig = {
  apiKey: "AIzaSyDwMK4j6DliUE396Ud1mQ6VzqSx2SvcZOc",
  authDomain: "goat-typing.firebaseapp.com",
  projectId: "goat-typing",
  storageBucket: "goat-typing.firebasestorage.app",
  messagingSenderId: "583674288538",
  appId: "1:583674288538:web:63f9ff33513a4c434bc223",
  measurementId: "G-GRDNTXQ2K0"
};

// অ্যাপ ইনিশিয়ালাইজ করা (একবারই)
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// এক্সপোর্ট
export { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc, updateDoc, arrayUnion, increment };

console.log("🔥 Firebase Config Loaded Correctly");