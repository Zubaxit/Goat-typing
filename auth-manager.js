// auth-manager.js
import { auth, provider, signInWithPopup, signOut, onAuthStateChanged, db, doc, setDoc, getDoc } from "./firebase-config.js";

// ১. লগিন বাটন হ্যান্ডলার
window.handleLogin = async function() {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        console.log("User Logged In:", user.displayName);
        
        // ইউজারের ডাটাবেস চেক করা বা তৈরি করা
        await checkAndCreateUserProfile(user);
        
    } catch (error) {
        console.error("Login Error:", error.message);
        alert("লগিন ব্যর্থ হয়েছে: " + error.message);
    }
};

// ২. লগআউট হ্যান্ডলার
window.handleLogout = async function() {
    try {
        await signOut(auth);
        console.log("User Logged Out");
        location.reload(); // পেজ রিফ্রেশ
    } catch (error) {
        console.error("Logout Error:", error);
    }
};

// ৩. ইউজার প্রোফাইল তৈরি (যদি না থাকে)
async function checkAndCreateUserProfile(user) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        // নতুন ইউজার! ডাটাবেসে এন্ট্রি তৈরি করো
        await setDoc(userRef, {
            name: user.displayName,
            email: user.email,
            photo: user.photoURL,
            role: 'free', // ডিফল্ট প্ল্যান
            joinedAt: new Date(),
            totalTests: 0,
            bestWPM: 0
        });
        alert(`স্বাগতম ${user.displayName}! আপনার ফ্রি একাউন্ট তৈরি হয়েছে।`);
    } else {
        alert(`স্বাগতম ফিরে আসার জন্য, ${user.displayName}!`);
    }
    updateUI(user);
}

// ৪. UI আপডেট করা (লগিন থাকলে ছবি দেখাবে)
function updateUI(user) {
    const loginBtn = document.getElementById('loginBtn');
    const userProfile = document.getElementById('userProfileArea');
    const userName = document.getElementById('userNameDisplay');
    const userImg = document.getElementById('userImgDisplay');
    const proBadge = document.getElementById('proBadgeDisplay');

    if (user) {
        if(loginBtn) loginBtn.style.display = 'none';
        if(userProfile) userProfile.style.display = 'flex';
        if(userName) userName.innerText = user.displayName.split(' ')[0]; // শুধু প্রথম নাম
        if(userImg) userImg.src = user.photoURL;
        
        // এখানে আমরা পরে ডাটাবেস থেকে চেক করে 'PRO' ব্যাজ দেখাবো
        // আপাতত ডিফল্ট
        if(proBadge) proBadge.style.display = 'none'; 
    } else {
        if(loginBtn) loginBtn.style.display = 'block';
        if(userProfile) userProfile.style.display = 'none';
    }
}

// ৫. সব সময় চেক করা ইউজার লগিন আছে কিনা
onAuthStateChanged(auth, (user) => {
    if (user) {
        updateUI(user);
    } else {
        updateUI(null);
    }
});