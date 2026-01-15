import { auth, provider, signInWithPopup, signOut, onAuthStateChanged, db, doc, getDoc, updateDoc, updateProfile } from "./firebase-config.js";

/* ==============================
   GLOBAL VARIABLES & DOM ELEMENTS
   ============================== */
const loginBtn = document.getElementById('login-btn');
const modal = document.getElementById('profileModal');
const modalNameInput = document.getElementById('nicknameInput');
const modalImg = document.getElementById('modalProfilePic');
const modalStatus = document.getElementById('memberStatus');
const closeBtn = document.getElementById('closeProfileBtn');
const saveBtn = document.getElementById('saveProfileBtn');
const logoutBtn = document.getElementById('modalLogoutBtn');

const avatars = [
    "https://cdn-icons-png.flaticon.com/512/4140/4140048.png",
    "https://cdn-icons-png.flaticon.com/512/4140/4140047.png",
    "https://cdn-icons-png.flaticon.com/512/4140/4140037.png",
    "https://cdn-icons-png.flaticon.com/512/1999/1999625.png",
    "https://cdn-icons-png.flaticon.com/512/4140/4140051.png"
];
let currentAvatarIndex = 0;

// 🔥 Smart Save: অরিজিনাল ডাটা স্টোর করার ভেরিয়েবল
let originalName = "";
let originalPhoto = "";

/* ==============================
   🌍 GLOBAL STATE INITIALIZATION
   ============================== */
window.SITE_CONFIG = null;
window.USER_USAGE = { banglaWords: 0, englishWords: 0 };
window.IS_PRO_USER = false;
window.IS_ADMIN = false;
window.USER_ROLE = 'guest'; // Default role

/* ==============================
   🛠️ CONFIG & USAGE LOADERS
   ============================== */

// A. Load Site Config (Feature Flags)
async function loadSiteConfig() {
    try {
        const ref = doc(db, "siteConfig", "main");
        const snap = await getDoc(ref);

        if (snap.exists()) {
            window.SITE_CONFIG = snap.data();
            console.log("✅ Site config loaded:", window.SITE_CONFIG);
        } else {
            console.warn("⚠ siteConfig/main not found, using defaults.");
            // Default Fallback
            window.SITE_CONFIG = { features: { proKeyboard: { free: true }, proFeatures: { free: false } } };
        }
    } catch (err) {
        console.error("❌ Failed to load site config:", err);
    }
}
// Load immediately
loadSiteConfig();

/// auth-manager.js - loadUserUsage UPDATE

async function loadUserUsage(uid) {
    try {
        const ref = doc(db, "users", uid);
        const snap = await getDoc(ref);
        
        // ডিফল্ট ভ্যালু
        window.USER_USAGE = { banglaWords: 0, englishWords: 0 };
        window.USER_LOCKS = { banglaUntil: 0, englishUntil: 0 }; // নতুন ভ্যারিয়েবল

        if (snap.exists()) {
            const data = snap.data();
            
            // Usage লোড
            if (data.usage) {
                window.USER_USAGE = data.usage;
            }

            // Lock Time লোড (যদি থাকে)
            if (data.lockUntil) {
                window.USER_LOCKS = {
                    banglaUntil: data.lockUntil.bangla || 0,
                    englishUntil: data.lockUntil.english || 0
                };
            }

            // 🔥 অটো রিসেট চেক: যদি লকের সময় শেষ হয়ে যায়, তাহলে Usage ০ করে দাও
            const now = Date.now();
            let needUpdate = false;

            // ইংরেজির সময় শেষ হলে রিসেট
            if (window.USER_LOCKS.englishUntil > 0 && now > window.USER_LOCKS.englishUntil) {
                window.USER_USAGE.englishWords = 0;
                window.USER_LOCKS.englishUntil = 0;
                needUpdate = true;
            }

            // বাংলার সময় শেষ হলে রিসেট
            if (window.USER_LOCKS.banglaUntil > 0 && now > window.USER_LOCKS.banglaUntil) {
                window.USER_USAGE.banglaWords = 0;
                window.USER_LOCKS.banglaUntil = 0;
                needUpdate = true;
            }

            // যদি রিসেট হয়, তাহলে ডাটাবেসেও আপডেট করে দাও
            if (needUpdate) {
                await updateDoc(ref, {
                    usage: window.USER_USAGE,
                    lockUntil: window.USER_LOCKS
                });
                console.log("♻️ Limit expired! Usage reset successfully.");
            }
        }
    } catch (e) {
        console.error("Error loading usage/locks:", e);
    }
}

/* ==============================
   🔐 PERMISSION GATES & LIMITS
   ============================== */

// ✅ CENTRAL PERMISSION CHECK
window.canUse = function (featureKey) {
    // 1. If config not loaded yet, default block unless simple check
    if (!window.SITE_CONFIG || !window.SITE_CONFIG.features) {
        // Fallback: If just checking pro status
        if (featureKey === 'isPro') return window.IS_PRO_USER;
        return false;
    }

    const rules = window.SITE_CONFIG.features[featureKey];
    if (!rules) return false; // Unknown feature = block

    // 2. Admin Bypass
    if (window.IS_ADMIN) return true;

    // 3. Guest Check
    if (!auth.currentUser) {
        return rules.guest === true;
    }

    // 4. Pro User Check
    if (window.IS_PRO_USER) {
        return rules.pro === true;
    }

    // 5. Free User Check
    return rules.free === true;
};

// ✅ LIMIT CHECKER FUNCTION
window.hasExceededLimit = function (mode) {
    // Pro & Admin have no limits
    if (window.IS_PRO_USER || window.IS_ADMIN) return false;
  
    if (mode === "bengali") {
        return window.USER_USAGE.banglaWords >= 200;
    }
  
    if (mode === "english" || mode === "coding") {
        // Coding counts as English limit for now
        return window.USER_USAGE.englishWords >= 300;
    }
  
    return false;
};

/* ==============================
   🔐 CORE AUTH LISTENER (UPDATED)
   ============================== */
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // ১. ইউজার লগিন আছে
        console.log("🟢 User Logged In:", user.displayName);

        // UI আপডেট
        updateProfileUI(user);

        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();

                // 🔥 PRO STATUS & EXPIRY CHECK (UPDATED)
                let isPro = data.isPro === true || data.subscription === 'premium';
                
                // যদি Expiry Date থাকে, চেক করো সময় আছে কিনা
                if (data.proExpiresAt) {
                    const now = Date.now();
                    if (now > data.proExpiresAt) {
                        // সময় শেষ! মেম্বারশিপ বাতিল করো
                        isPro = false;
                        if (data.isPro) {
                            await updateDoc(userRef, { isPro: false, proExpiresAt: 0, subscription: 'free' });
                            console.log("⚠️ Pro membership expired. Downgraded to Free.");
                        }
                    } else {
                        isPro = true; // সময় এখনো আছে
                    }
                }

                // গ্লোবাল ভেরিয়েবল সেট
                window.IS_PRO_USER = isPro;
                window.IS_ADMIN = data.isAdmin === true;
                window.USER_ROLE = isPro || window.IS_ADMIN ? 'pro' : 'free';

                // 🔥 SIDEBAR UPDATE (ADS vs PRO)
                if (typeof window.updateSidebarLayout === 'function') {
                    window.updateSidebarLayout(isPro);
                }

                // ইউজারনেম এবং সার্চ কি-ওয়ার্ড লজিক
                const baseName = (user.displayName || "user").replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 10);
                let finalUsername = data.username;
                let updateData = {};
                let needsUpdate = false;

                // ১. যদি ইউজারনেম না থাকে, নতুন বানাও
                if (!finalUsername) {
                    const rnd = Math.floor(1000 + Math.random() * 9000);
                    finalUsername = `${baseName}#${rnd}`;
                    updateData.username = finalUsername;
                    needsUpdate = true;
                    console.log("✅ Username Generated:", finalUsername);
                }

                // ২. 🔥 সার্চ কি-ওয়ার্ড তৈরি করা (যাতে নাম বা পুরো আইডি দিয়ে খোঁজা যায়)
                if (!data.searchKeywords) {
                    const keywords = [
                        baseName,                 // শুধু নাম (যেমন: "rahim")
                        finalUsername.toLowerCase() // পুরো আইডি (যেমন: "rahim#1234")
                    ];
                    // ডুপ্লিকেট রিমুভ করা
                    updateData.searchKeywords = [...new Set(keywords)];
                    needsUpdate = true;
                    console.log("🔍 Search Keywords Added");
                }

                // যদি কোনো আপডেট লাগে, ডাটাবেসে সেভ করো
                if (needsUpdate) {
                    await updateDoc(userRef, updateData);
                }

                window.CURRENT_USERNAME = finalUsername;

                // Usage লোড করা
                await loadUserUsage(user.uid);
                
                // UI আপডেট করো
                updateProfileUI(user);
            } else {
                // নতুন ইউজার (ডাটাবেসে নেই) -> ফ্রি মোড
                console.log("⚠️ User doc not found, treating as Free.");
                window.IS_PRO_USER = false;
                if (typeof window.updateSidebarLayout === 'function') window.updateSidebarLayout(false);
            }

        } catch (e) {
            console.error("Auth Data Error:", e);
        }

        // সাইডবার আপডেট
        if (typeof window.updateSidebarAccess === 'function') {
            window.updateSidebarAccess();
        }

        // 🔥 মাল্টিপ্লেয়ার লিসেনার চালু করা
        if (typeof window.initMultiplayerListener === 'function') {
            window.initMultiplayerListener();
        }

    } else {
        // ২. ইউজার লগআউট (Guest) অবস্থায় আছে
        console.log("👤 User is Guest");
        
        // গ্লোবাল রিসেট
        window.USER_ROLE = 'guest';
        window.IS_PRO_USER = false;
        window.IS_ADMIN = false;
        window.CURRENT_USERNAME = null;
        window.USER_USAGE = { banglaWords: 0, englishWords: 0 };
        
        // UI রিসেট
        updateProfileUI(null);

        // 🔥 SIDEBAR RESET TO FREE MODE (Ads Visible)
        if (typeof window.updateSidebarLayout === 'function') {
            window.updateSidebarLayout(false);
        }

        // সাইডবার আপডেট
        if (typeof window.updateSidebarAccess === 'function') {
            window.updateSidebarAccess();
        }
    }
});

/* ==============================
   UI HELPER FUNCTIONS
   ============================== */
function updateProfileUI(user) {
    if (user) {
        if (loginBtn) {
            loginBtn.innerHTML = `
                <img src="${user.photoURL || avatars[0]}" style="width:25px;border-radius:50%;margin-right:5px;">
                ${user.displayName || 'User'}
            `;
        }
        const badge = document.getElementById('proBadgeDisplay');
        if (badge) badge.style.display = window.IS_PRO_USER ? 'inline-block' : 'none';
    } else {
        if (loginBtn) loginBtn.innerHTML = '<i class="fab fa-google"></i> G Login';
        const badge = document.getElementById('proBadgeDisplay');
        if (badge) badge.style.display = 'none';
    }
}

/* ==============================
   PROFILE MODAL LOGIC & LISTENERS
   ============================== */
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

function checkChanges() {
    const currentName = modalNameInput.value.trim();
    const currentPhoto = modalImg.src;

    if (currentName !== originalName || currentPhoto !== originalPhoto) {
        saveBtn.classList.add('show-save'); // বাটন দেখাও
    } else {
        saveBtn.classList.remove('show-save'); // বাটন লুকাও
    }
}

if(modalImg) modalImg.addEventListener('click', () => {
    currentAvatarIndex = (currentAvatarIndex + 1) % avatars.length;
    modalImg.src = avatars[currentAvatarIndex];
    checkChanges(); 
});

if(modalNameInput) modalNameInput.addEventListener('input', checkChanges); 

if(saveBtn) saveBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    const newName = modalNameInput.value;
    const newPhoto = modalImg.src;

    try {
        await updateProfile(user, { displayName: newName, photoURL: newPhoto });
        await updateDoc(doc(db, "users", user.uid), { displayName: newName, photoURL: newPhoto });

        alert("Profile Updated Successfully!");
        
        // আপডেট হওয়ার পর নতুন ভ্যালু অরিজিনাল হয়ে যাবে
        originalName = newName;
        originalPhoto = newPhoto;
        checkChanges(); // বাটন আবার হাইড হবে

        // UI Update
        updateProfileUI(user);

    } catch (error) {
        console.error("Update Error:", error);
        alert("Update Failed: " + error.message);
    }
});

if(closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

if(logoutBtn) logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => location.reload());
});

/* ==============================
   2. PROFILE DATA RENDERERS
   ============================== */

async function openProfileModal(user) {
    modal.classList.remove('hidden');
    saveBtn.classList.remove('show-save'); // শুরুতে বাটন হাইড
    
    // লোডিং স্টেট
    const container = document.getElementById('profileChart');
    if(container) container.innerHTML = '<p style="color:#888;font-size:12px;text-align:center;">Loading Data...</p>';

    // ডাটা সেট এবং অরিজিনাল ভ্যালু স্টোর
    modalImg.src = user.photoURL || avatars[0];
    modalNameInput.value = user.displayName;
    
    originalName = user.displayName;
    originalPhoto = user.photoURL || avatars[0];

    try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Stats
            document.getElementById('statTotalTests').innerText = data.totalTests || 0;
            document.getElementById('statTotalWords').innerText = data.totalWords || 0;
            document.getElementById('statAvgWPM').innerText = Math.round(data.avgWPM || 0);
            document.getElementById('statAccuracy').innerText = Math.round(data.avgAcc || 0) + "%";

            // Username Tag
            let usernameTag = document.getElementById('modalUsernameDisplay');
            if(!usernameTag) {
                usernameTag = document.createElement('span');
                usernameTag.id = 'modalUsernameDisplay';
                usernameTag.className = 'username-tag';
                modalNameInput.parentNode.appendChild(usernameTag);
            }
            
            let displayUser = data.username;
            if(!displayUser) {
                const rnd = Math.floor(1000 + Math.random() * 9000);
                const cleanName = user.displayName ? user.displayName.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '') : "User";
                displayUser = `@${cleanName}_${rnd}`;
            }
            usernameTag.innerText = displayUser;

            // Badges & Level
            renderBadges(data.badges || []);
            renderLevelBar(data.level || 1, data.ovr || 0);

            // 🔥 PRO STATUS DISPLAY (UPDATED FOR TIME LEFT)
            if(data.isPro) {
                let timeLeftHtml = "";
                // যদি এক্সপায়ার ডেট থাকে, তাহলে কত দিন বাকি তা বের করো
                if (data.proExpiresAt) {
                    const now = Date.now();
                    const diff = data.proExpiresAt - now;
                    if (diff > 0) {
                        const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
                        timeLeftHtml = `<br><span style="font-size:0.7rem; color:#333; font-weight:normal;">(${daysLeft} days left)</span>`;
                    }
                }
                
                modalStatus.innerHTML = `PRO MEMBER 👑${timeLeftHtml}`;
                modalStatus.style.background = "gold";
                modalStatus.style.color = "black";
            } else {
                // Free Member হলে Upgrade লিংক দেখাও
                modalStatus.innerHTML = `Free Member <br> <a href="pro.html" style="font-size:0.75rem; color:#4cc9f0; text-decoration:underline; font-weight:bold;">Upgrade to Pro</a>`;
                modalStatus.style.background = "rgba(255,255,255,0.1)";
                modalStatus.style.color = "#ccc";
            }

            // Chart (10 Days)
            if(data.history && Array.isArray(data.history)) {
                renderProfileHistory(data.history);
            } else {
                container.innerHTML = '<p style="color:#555; font-size:12px; margin:auto;">No history found yet.</p>';
            }
        }
    } catch (err) {
        console.error("Profile Load Error:", err);
        if(container) container.innerHTML = '<p style="color:red; font-size:12px;">Error loading data.</p>';
    }
}

// 1. Badges Renderer
function renderBadges(badges) {
    const existingBadges = document.querySelector('.badges-section');
    if(existingBadges) existingBadges.remove();

    const allBadges = [
        { name: "Rookie", icon: "fa-seedling" },
        { name: "Speedster", icon: "fa-bolt" },
        { name: "Ninja", icon: "fa-user-ninja" },
        { name: "God", icon: "fa-dragon" },
        { name: "Perfectionist", icon: "fa-gem" }
    ];

    let badgeHtml = `<div class="badges-section"><h5><i class="fas fa-medal"></i> Achievements (${badges.length})</h5><div class="badges-grid">`;
    
    allBadges.forEach(b => {
        const isUnlocked = badges.includes(b.name);
        badgeHtml += `
            <div class="mini-badge ${isUnlocked ? 'unlocked' : ''}" style="opacity: ${isUnlocked ? 1 : 0.4}">
                <i class="fas ${b.icon}"></i> ${b.name}
            </div>
        `;
    });
    badgeHtml += `</div></div>`;

    const topGrid = document.querySelector('.profile-top-grid');
    if(topGrid) topGrid.insertAdjacentHTML('afterend', badgeHtml);
}

// 2. Level Bar Renderer
function renderLevelBar(level, ovr) {
    const existingBar = document.querySelector('.level-container');
    if(existingBar) existingBar.remove();

    const levelHtml = `
    <div class="level-container">
        <div class="level-info">
            <span>LVL ${level}</span>
            <span>OVR ${ovr}</span>
        </div>
        <div class="level-bar-bg">
            <div class="level-progress" style="width: 0%"></div>
            <div class="ovr-tooltip">XP: ${ovr} / ${(level * 300)}</div>
        </div>
    </div>`;
    
    const statsGrid = document.querySelector('.stats-grid');
    if(statsGrid) statsGrid.insertAdjacentHTML('beforebegin', levelHtml);

    setTimeout(() => {
        const progress = Math.min((ovr % 300) / 300 * 100, 100); 
        const bar = document.querySelector('.level-progress');
        if(bar) bar.style.width = `${progress}%`;
    }, 100);
}

// 3. Chart Renderer
function renderProfileHistory(fullHistory) {
    const container = document.getElementById('profileChart');
    if(!container) return;
    container.innerHTML = '';
    container.style.paddingTop = "35px";
    container.style.alignItems = "flex-end"; 

    const tenDaysAgo = Date.now() - (10 * 24 * 60 * 60 * 1000);
    const recentData = fullHistory.filter(item => (item.timestamp || 0) >= tenDaysAgo);

    if(recentData.length === 0) {
        container.innerHTML = '<p style="color:#555; margin:auto;">No activity in last 10 days</p>';
        return;
    }

    const MAX_WPM = 100; const MAX_TIME = 60; const MAX_ERR = 10;

    recentData.forEach(data => {
        const wrapper = document.createElement('div');
        wrapper.className = 'bar-wrapper';

        const group = document.createElement('div');
        group.className = 'bar-group';

        const wpmBar = document.createElement('div');
        wpmBar.className = 'sub-bar bar-wpm';
        let wpmH = (data.wpm / MAX_WPM) * 100; if(wpmH > 100) wpmH = 100; if(wpmH < 5) wpmH = 5;
        wpmBar.style.height = `${wpmH}%`; wpmBar.setAttribute('data-val', `${data.wpm} WPM`);

        const timeBar = document.createElement('div');
        timeBar.className = 'sub-bar bar-time';
        let tVal = data.time || 0; let timeH = (tVal / MAX_TIME) * 100; if(timeH > 100) timeH = 100; if(timeH < 5 && tVal > 0) timeH = 5;
        timeBar.style.height = `${timeH}%`; timeBar.setAttribute('data-val', `${tVal}s`);

        const errBar = document.createElement('div');
        errBar.className = 'sub-bar bar-err';
        let errCount = (data.err !== undefined) ? data.err : (data.errors || 0);
        let errH = (errCount / MAX_ERR) * 100; if(errH > 100) errH = 100; if(errCount === 0) errH = 0; else if(errH < 5) errH = 5;
        errBar.style.height = `${errH}%`; errBar.setAttribute('data-val', `${errCount} Err`);

        group.appendChild(wpmBar); group.appendChild(timeBar); group.appendChild(errBar);

        const label = document.createElement('div');
        label.className = 'bar-label';
        const displayDate = data.dateDisplay || new Date(data.timestamp).toLocaleDateString('en-US', {month:'short', day:'numeric'});
        const displayScore = data.score || 0;
        const displayMode = (data.mode || 'ENG') + '-' + (data.lvl || 'Easy');

        label.innerHTML = `<span style="font-weight:bold; font-size:0.7rem;">${displayDate}</span><br><span style="font-size:0.55rem; opacity:0.7;">Score: ${displayScore} <br> ${displayMode}</span>`;

        wrapper.appendChild(group); wrapper.appendChild(label);
        container.appendChild(wrapper);
    });

    setTimeout(() => { container.scrollLeft = container.scrollWidth; }, 100);
}