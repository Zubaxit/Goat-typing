import { auth, provider, signInWithPopup, signOut, onAuthStateChanged, db, doc, getDoc, updateDoc, updateProfile } from "./firebase-config.js";

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const modal = document.getElementById('profileModal');
const modalNameInput = document.getElementById('nicknameInput');
const modalImg = document.getElementById('modalProfilePic');
const modalStatus = document.getElementById('memberStatus');
const closeBtn = document.getElementById('closeProfileBtn');
const saveBtn = document.getElementById('saveProfileBtn');
const logoutBtn = document.getElementById('modalLogoutBtn');

// অবতার কালেকশন (সিম্পল সমাধানের জন্য)
const avatars = [
    "https://cdn-icons-png.flaticon.com/512/4140/4140048.png", // Boy
    "https://cdn-icons-png.flaticon.com/512/4140/4140047.png", // Girl
    "https://cdn-icons-png.flaticon.com/512/4140/4140037.png", // Man
    "https://cdn-icons-png.flaticon.com/512/1999/1999625.png", // Gamer
    "https://cdn-icons-png.flaticon.com/512/4140/4140051.png"  // Cool
];
let currentAvatarIndex = 0;

// 1. লগিন বাটন হ্যান্ডলার
if(loginBtn) {
    loginBtn.addEventListener('click', () => {
        const user = auth.currentUser;
        if (user) {
            openProfileModal(user);
        } else {
            signInWithPopup(auth, provider).catch((error) => console.error("Login Error:", error));
        }
    });
}

// 2. প্রোফাইল ওপেন এবং ডাটা লোড
async function openProfileModal(user) {
    modal.classList.remove('hidden');
    modalImg.src = user.photoURL || avatars[0];
    modalNameInput.value = user.displayName;
    
    // ডাটাবেস থেকে স্ট্যাটাস আনা
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        const data = docSnap.data();
        
        // লাইফটাইম স্ট্যাটাস আপডেট
        document.getElementById('statTotalTests').innerText = data.totalTests || 0;
        document.getElementById('statTotalWords').innerText = data.totalWords || 0;
        document.getElementById('statAvgWPM').innerText = Math.round(data.avgWPM || 0);
        document.getElementById('statAccuracy').innerText = (data.avgAcc || 0) + "%";

        // প্রো স্ট্যাটাস চেক
        if(data.isPro) {
            modalStatus.innerText = "PRO MEMBER 👑";
            modalStatus.style.background = "gold";
            modalStatus.style.color = "black";
        }

        // গ্রাফ রেন্ডার করা (হিস্টোরি থেকে)
        if(data.history) {
            renderProfileGraph(data.history);
        }
    }
}

// 3. গ্রাফ বানানোর ফাংশন (Profile এর জন্য)
function renderProfileGraph(history) {
    const container = document.getElementById('profileChart');
    container.innerHTML = '';
    
    // লাস্ট ২০টা ডাটা নেওয়া
    const recentData = history.slice(-30); 

    recentData.forEach(d => {
        const bar = document.createElement('div');
        bar.style.width = '15px';
        bar.style.height = `${Math.min(d.wpm, 100)}%`; // Max 100px height
        bar.style.background = d.wpm > 50 ? '#ffd700' : '#444';
        bar.style.marginRight = '2px';
        bar.title = `${d.wpm} WPM | ${d.date}`;
        container.appendChild(bar);
    });
}

// 4. ছবি চেঞ্জ (ক্লিক করলে পরের ছবিতে যাবে)
modalImg.addEventListener('click', () => {
    currentAvatarIndex = (currentAvatarIndex + 1) % avatars.length;
    modalImg.src = avatars[currentAvatarIndex];
});

// 5. সেভ (নিকনেম এবং ছবি আপডেট)
saveBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    const newName = modalNameInput.value;
    const newPhoto = modalImg.src;

    try {
        // A. Firebase Auth প্রোফাইল আপডেট
        await updateProfile(user, {
            displayName: newName,
            photoURL: newPhoto
        });

        // B. Firestore ডাটাবেস আপডেট (যাতে পারমানেন্ট থাকে)
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
            displayName: newName,
            photoURL: newPhoto
        });

        alert("Profile Updated Successfully!");
        modal.classList.add('hidden');
        
        // UI রিফ্রেশ (বাটনের নাম/ছবি)
        loginBtn.innerHTML = `<img src="${newPhoto}" style="width:25px;border-radius:50%;margin-right:5px;"> ${newName}`;

    } catch (error) {
        console.error("Update Error:", error);
        alert("Update Failed: " + error.message);
    }
});

// 6. সাধারণ ক্লোজ এবং লগআউট
closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => location.reload());
});

// 7. অথ স্টেট চেঞ্জ
onAuthStateChanged(auth, (user) => {
    if (user && loginBtn) {
        loginBtn.innerHTML = `<img src="${user.photoURL}" style="width:25px;border-radius:50%;margin-right:5px;"> ${user.displayName}`;
    }
});