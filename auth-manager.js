console.log("Auth Script Loaded");
const checkBtn = document.getElementById('login-btn'); // এখানে আপনার আইডি দিন
console.log("Button Found?", checkBtn);



import { auth, provider, signInWithPopup, signOut, onAuthStateChanged, db, doc, getDoc, updateDoc } from "./firebase-config.js";

const loginBtn = document.getElementById('login-btn'); // আপনার লগিন বাটনের সঠিক ID দিন
const userImg = document.getElementById('user-img'); // যদি থাকে
const userName = document.getElementById('user-name'); // যদি থাকে

// Modal Elements
const modal = document.getElementById('profileModal');
const modalNameInput = document.getElementById('nicknameInput');
const modalImg = document.getElementById('modalProfilePic');
const modalStatus = document.getElementById('memberStatus');
const closeBtn = document.getElementById('closeProfileBtn');
const saveBtn = document.getElementById('saveProfileBtn');
const logoutBtn = document.getElementById('modalLogoutBtn');

// 1. লগিন হ্যান্ডলার
loginBtn.addEventListener('click', () => {
    const user = auth.currentUser;
    if (user) {
        // লগিন করা থাকলে এখন প্রোফাইল ওপেন হবে (লগআউট হবে না)
        openProfileModal(user);
    } else {
        // লগিন না থাকলে গুগল পপ-আপ আসবে
        signInWithPopup(auth, provider)
            .then(async (result) => {
                console.log("Logged in:", result.user);
                // নতুন ইউজার হলে ডাটাবেসে এন্ট্রি চেক করা হবে এখানে...
            })
            .catch((error) => console.error("Login Failed", error));
    }
});

// 2. প্রোফাইল মডাল ওপেন করার ফাংশন
async function openProfileModal(user) {
    modal.classList.remove('hidden');
    modalImg.src = user.photoURL;
    modalNameInput.value = user.displayName;
    
    // ডাটাবেস থেকে স্ট্যাটাস আনা
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById('totalTests').innerText = data.totalTests || 0;
        document.getElementById('bestWPM').innerText = data.bestWPM || 0;
        
        if(data.isPro) {
            modalStatus.innerText = "PRO MEMBER 👑";
            modalStatus.style.background = "gold";
            modalStatus.style.color = "black";
        }
    }
}

// 3. মডাল বন্ধ করা
closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

// 4. লগআউট (এখন মডালের ভেতর থেকে হবে)
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        modal.classList.add('hidden');
        console.log("Signed Out");
        location.reload(); // পেজ রিফ্রেশ
    });
});

// 5. নাম সেভ করা (Update Profile)
saveBtn.addEventListener('click', () => {
    const user = auth.currentUser;
    // এখানে নাম আপডেটের কোড বসবে (আপাতত কনসোল লগ)
    console.log("Saving name:", modalNameInput.value);
    alert("Profile Updated!");
    modal.classList.add('hidden');
});

// 6. অথেনটিকেশন স্টেট চেঞ্জ (UI আপডেট)
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginBtn.innerHTML = `<img src="${user.photoURL}" style="width:30px;border-radius:50%;margin-right:5px;"> ${user.displayName}`;
        // স্টাইল ঠিক করা
        loginBtn.style.display = 'flex';
        loginBtn.style.alignItems = 'center';
    } else {
        loginBtn.innerHTML = 'G Login';
    }
});