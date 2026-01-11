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

// অবতার কালেকশন
const avatars = [
    "https://cdn-icons-png.flaticon.com/512/4140/4140048.png",
    "https://cdn-icons-png.flaticon.com/512/4140/4140047.png",
    "https://cdn-icons-png.flaticon.com/512/4140/4140037.png",
    "https://cdn-icons-png.flaticon.com/512/1999/1999625.png",
    "https://cdn-icons-png.flaticon.com/512/4140/4140051.png"
];
let currentAvatarIndex = 0;

// ১. লগিন বাটন হ্যান্ডলার
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

// ২. প্রোফাইল ওপেন এবং ডাটা লোড
async function openProfileModal(user) {
    modal.classList.remove('hidden');
    
    // বেসিক ইনফো সেট করা
    modalImg.src = user.photoURL || avatars[0];
    modalNameInput.value = user.displayName;
    
    // ডাটাবেস থেকে লেটেস্ট স্ট্যাটাস আনা
    try {
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

            // 🔥 গ্রাফ রেন্ডার করা (হিস্টোরি থেকে)
            if(data.history && Array.isArray(data.history)) {
                renderProfileHistory(data.history);
            } else {
                document.getElementById('profileChart').innerHTML = '<p style="color:#555; font-size:12px; margin:auto;">No history found yet.</p>';
            }
        }
    } catch (err) {
        console.error("Profile Load Error:", err);
    }
}

// ৩. প্রোফাইল চার্ট রেন্ডার ফাংশন (রেজাল্ট পপআপের হুবহু কপি)
function renderProfileHistory(fullHistory) {
    const container = document.getElementById('profileChart');
    if(!container) return;
    container.innerHTML = '';

    // ৩০ দিনের ফিল্টার এবং সর্টিং
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    // ডাটা ফিল্টার করা (যাতে শুধু লাস্ট ৩০ দিনের ডাটা থাকে)
    const recentData = fullHistory.filter(item => {
        // পুরনো ডাটাতে timestamp নাও থাকতে পারে, তাই date চেক
        const itemTime = item.timestamp || new Date().getTime(); 
        return itemTime >= thirtyDaysAgo;
    });

    // রিভার্স করা যাতে লেটেস্ট ডানে থাকে (অপশনাল)
    // recentData.reverse(); 

    if(recentData.length === 0) {
        container.innerHTML = '<p style="color:#555; margin:auto;">No recent activity (30 Days)</p>';
        return;
    }

    // স্কেলিং ভ্যালু (Result Manager এর মতোই)
    const MAX_WPM = 100;
    const MAX_TIME = 60;
    const MAX_ERR = 10;

    recentData.forEach(data => {
        const wrapper = document.createElement('div');
        wrapper.className = 'bar-wrapper';

        const group = document.createElement('div');
        group.className = 'bar-group';
        // স্টাইল ফিক্স (যেহেতু CSS ক্লাসগুলো result-manager এ আছে)
        group.style.display = 'flex';
        group.style.gap = '2px';
        group.style.alignItems = 'flex-end';
        group.style.height = '80px'; // গ্রাফের হাইট

        // --- WPM Bar ---
        const wpmBar = document.createElement('div');
        let wpmH = (data.wpm / MAX_WPM) * 100;
        if(wpmH > 100) wpmH = 100; if(wpmH < 5) wpmH = 5;
        
        wpmBar.style.height = `${wpmH}%`;
        wpmBar.style.width = '6px';
        wpmBar.style.background = data.wpm > 50 ? '#ffd700' : '#007AFF'; // গোল্ড বা ব্লু
        wpmBar.style.borderRadius = '2px';
        wpmBar.title = `${data.wpm} WPM`;

        // --- Time Bar ---
        const timeBar = document.createElement('div');
        let tVal = data.time || 0;
        let timeH = (tVal / MAX_TIME) * 100;
        if(timeH > 100) timeH = 100; if(timeH < 5 && tVal > 0) timeH = 5;

        timeBar.style.height = `${timeH}%`;
        timeBar.style.width = '6px';
        timeBar.style.background = '#444';
        timeBar.style.borderRadius = '2px';
        timeBar.title = `${tVal}s`;

        // --- Error Bar ---
        const errBar = document.createElement('div');
        let errH = (data.err / MAX_ERR) * 100;
        if(errH > 100) errH = 100; 
        if(data.err === 0) errH = 0; else if(errH < 5) errH = 5;

        errBar.style.height = `${errH}%`;
        errBar.style.width = '6px';
        errBar.style.background = '#ff4444';
        errBar.style.borderRadius = '2px';
        errBar.title = `${data.err} Errors`;

        // গ্রাফে বার যোগ করা
        group.appendChild(wpmBar);
        group.appendChild(timeBar);
        group.appendChild(errBar);

        // লেবেল (তারিখ বা স্কোর)
        const label = document.createElement('div');
        label.className = 'bar-label';
        // শুধু ছোট তারিখ দেখাবো জায়গার অভাবে
        const shortDate = data.date ? data.date.split(',')[0] : ''; 
        label.innerHTML = `<span style="font-weight:bold;">${data.wpm}</span><br><span style="font-size:7px; opacity:0.6;">${data.mode}</span>`;

        wrapper.appendChild(group);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
    });

    // অটোমেটিক স্ক্রল করে শেষে নিয়ে যাওয়া
    setTimeout(() => {
        container.scrollLeft = container.scrollWidth;
    }, 100);
}

// ৪. ছবি চেঞ্জ
modalImg.addEventListener('click', () => {
    currentAvatarIndex = (currentAvatarIndex + 1) % avatars.length;
    modalImg.src = avatars[currentAvatarIndex];
});

// ৫. প্রোফাইল সেভ
saveBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    const newName = modalNameInput.value;
    const newPhoto = modalImg.src;

    try {
        await updateProfile(user, { displayName: newName, photoURL: newPhoto });
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { displayName: newName, photoURL: newPhoto });

        alert("Profile Updated Successfully!");
        modal.classList.add('hidden');
        loginBtn.innerHTML = `<img src="${newPhoto}" style="width:25px;border-radius:50%;margin-right:5px;"> ${newName}`;

    } catch (error) {
        console.error("Update Error:", error);
        alert("Update Failed: " + error.message);
    }
});

// ৬. ক্লোজ এবং লগআউট
closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => location.reload());
});

// ৭. অথ স্টেট
onAuthStateChanged(auth, (user) => {
    if (user && loginBtn) {
        loginBtn.innerHTML = `<img src="${user.photoURL}" style="width:25px;border-radius:50%;margin-right:5px;"> ${user.displayName}`;
    }
});