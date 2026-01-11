// firebase-config.js (Full & Updated)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
// 👇 এখানে updateProfile যোগ করা হয়েছে
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDwMK4j6DliUE396Ud1mQ6VzqSx2SvcZOc",
  authDomain: "goat-typing.firebaseapp.com",
  projectId: "goat-typing",
  storageBucket: "goat-typing.firebasestorage.app",
  messagingSenderId: "583674288538",
  appId: "1:583674288538:web:63f9ff33513a4c434bc223",
  measurementId: "G-GRDNTXQ2K0"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// 👇 এখানেও updateProfile এক্সপোর্ট করা হয়েছে
export { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, updateProfile, doc, setDoc, getDoc, updateDoc, arrayUnion, increment };

console.log("🔥 Firebase Config Loaded (With Profile Update)");