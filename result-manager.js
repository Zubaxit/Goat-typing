console.log("✅ result-manager.js LOADED");

// 🔥 IMPORTS
import { auth, db, doc, updateDoc, arrayUnion, increment, getDoc, setDoc } from "./firebase-config.js";

const resultState = {
    history: JSON.parse(localStorage.getItem('typingHistory')) || [],
    lastSavedTime: 0
};

// ১. স্কোর ক্যালকুলেশন (Score Calculation Logic)
function calculateOverallScore(wpm, accuracy, errors, time) {
    let baseScore = (wpm * 0.6) + (accuracy * 0.4); 
    let penalty = errors * 2;
    let timeBonus = time >= 60 ? 5 : 0;
    let finalScore = Math.round(baseScore - penalty + timeBonus);
    return finalScore > 0 ? finalScore : 0;
}

// ২. ডাটা সেভ ফাংশন (Local Storage & Formatting)
function saveResult(wpm, accuracy, errors, time, mode, level) {
    const now = Date.now();
    // ২ সেকেন্ডের মধ্যে ডুপ্লিকেট সেভ আটকাতে
    if (now - resultState.lastSavedTime < 2000) return; 
    resultState.lastSavedTime = now;

    const overallScore = calculateOverallScore(wpm, accuracy, errors, time);

    // শর্টকাট মোড নাম তৈরি
    let modeShort = 'ENG';
    if(mode === 'bengali') modeShort = 'BN';
    else if(mode === 'coding') modeShort = 'CODE';

    let lvlShort = 'Easy';
    if(level === 'medium') lvlShort = 'Med';
    else if(level === 'hard') lvlShort = 'Hard';

    const result = {
        score: overallScore,
        wpm: wpm || 0,
        acc: accuracy || 0,
        err: errors || 0,
        time: Math.round(time) || 0,
        mode: modeShort, 
        lvl: lvlShort,   
        date: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };

    resultState.history.push(result);
    // লোকালে শেষ ২০টা সেভ রাখব
    if (resultState.history.length > 20) {
        resultState.history.shift();
    }
    
    localStorage.setItem('typingHistory', JSON.stringify(resultState.history));
    return overallScore;
}

// ৩. নাম্বার এনিমেশন (Counter Animation)
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    obj.textContent = start;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.textContent = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.textContent = end;
        }
    };
    window.requestAnimationFrame(step);
}

// ৪. মডাল ওপেন ফাংশন (Open Result Popup)
function openResultModal(wpm, accuracy, errors, time, mode, level) {
    // আগে লোকাল ক্যালকুলেশন এবং সেভ
    const score = saveResult(wpm, accuracy, errors, time, mode, level);
    
    // তারপর ফায়ারবেসে সম্পূর্ণ ডাটা প্রসেসিং ও সেভ
    saveResultToFirebase(wpm, accuracy, errors, time, mode, level, score);

    const modal = document.getElementById('iosResultModal');
    if(!modal) return;

    // UI আপডেট
    animateValue("resWpm", 0, score, 1000); 

    const scoreLabel = document.querySelector('.score-label');
    if(scoreLabel) scoreLabel.innerText = "Overall";

    document.getElementById('resAcc').textContent = accuracy + '%';
    document.getElementById('resErr').textContent = errors;
    document.getElementById('resTime').textContent = Math.round(time) + 's';

    // সার্কেল চার্ট এনিমেশন
    const circle = document.querySelector('.circular-chart .circle');
    if(circle) {
        const percent = Math.min(score, 100);
        circle.style.strokeDasharray = `0, 100`; 
        
        // স্কোরের ওপর কালার চেঞ্জ
        if(score >= 80) circle.style.stroke = '#2ecc71'; 
        else if(score >= 50) circle.style.stroke = '#007AFF'; 
        else circle.style.stroke = '#ff4757'; 

        setTimeout(() => {
            circle.style.strokeDasharray = `${percent}, 100`;
        }, 100);
    }

    // গ্রাফ রেন্ডার
    renderOfflineGraph();

    // মডাল দেখানো
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

// ৫. গ্রাফ রেন্ডার (Result Popup Graph)
function renderOfflineGraph() {
    const container = document.getElementById('chartBars');
    if(!container) return;
    container.innerHTML = '';
    
    container.style.paddingTop = "35px"; 
    container.style.alignItems = "flex-end"; 

    const MAX_WPM = 100; 
    const MAX_TIME = 60; 
    const MAX_ERR = 10; 

    // সব ডাটা লুপ করে বার তৈরি
    resultState.history.forEach((data) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'bar-wrapper';

        const group = document.createElement('div');
        group.className = 'bar-group';

        // WPM Bar
        const wpmBar = document.createElement('div');
        wpmBar.className = 'sub-bar bar-wpm';
        let wpmH = (data.wpm / MAX_WPM) * 100;
        if(wpmH > 100) wpmH = 100; if(wpmH < 5) wpmH = 5;
        wpmBar.style.height = `${wpmH}%`;
        wpmBar.setAttribute('data-val', `${data.wpm} WPM`);

        // Time Bar
        const timeBar = document.createElement('div');
        timeBar.className = 'sub-bar bar-time';
        let tVal = data.time !== undefined ? data.time : 0; 
        let timeH = (tVal / MAX_TIME) * 100;
        if(timeH > 100) timeH = 100; if(timeH < 5 && tVal > 0) timeH = 5;
        timeBar.style.height = `${timeH}%`;
        timeBar.setAttribute('data-val', `${tVal}s`);

        // Error Bar
        const errBar = document.createElement('div');
        errBar.className = 'sub-bar bar-err';
        let errH = (data.err / MAX_ERR) * 100;
        if(errH > 100) errH = 100; 
        if(data.err === 0) errH = 0; else if(errH < 5) errH = 5;
        errBar.style.height = `${errH}%`;
        errBar.setAttribute('data-val', `${data.err} Err`);

        group.appendChild(wpmBar);
        group.appendChild(timeBar);
        group.appendChild(errBar);

        const label = document.createElement('div');
        label.className = 'bar-label';
        label.innerHTML = `
            <span style="font-weight:bold; font-size:0.7rem;">${data.date}</span><br>
            <span style="font-size:0.55rem; opacity:0.7;">Score: ${data.score} <br> ${data.mode}-${data.lvl}</span>
        `;

        wrapper.appendChild(group);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
    });

    // স্ক্রল শেষে নিয়ে যাওয়া
    setTimeout(() => {
        const scrollWrap = document.querySelector('.chart-scroll-wrapper');
        if(scrollWrap) scrollWrap.scrollLeft = scrollWrap.scrollWidth;
    }, 100);
}

// ৬. ক্লোজ ফাংশন (Close Popup & Reset)
function closeResultModal() {
    const modal = document.getElementById('iosResultModal');
    if(modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
            // রিসেট টেস্ট কল
            if(window.resetTest) window.resetTest(true);
            else if(typeof resetTest === 'function') resetTest(true);
        }, 300);
    }
}

// 🔥 ৭. FIREBASE SAVE (Lifetime Avg, Hard Level, Badges, Username, Usage Tracking)
async function saveResultToFirebase(wpm, accuracy, errors, time, mode, level, score) {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        let newAvgWPM = wpm;
        let newAvgAcc = accuracy;
        let totalTests = 0;
        let totalWords = 0;
        let username = user.displayName;
        let currentBadges = [];

        if (snap.exists()) {
            const data = snap.data();
            totalTests = data.totalTests || 0;
            totalWords = data.totalWords || 0;
            const currentAvgWPM = data.avgWPM || 0;
            const currentAvgAcc = data.avgAcc || 0;

            // Lifetime Weighted Average
            newAvgWPM = ((currentAvgWPM * totalTests) + wpm) / (totalTests + 1);
            newAvgAcc = ((currentAvgAcc * totalTests) + accuracy) / (totalTests + 1);
            
            username = data.username || generateUsername(user.displayName);
            currentBadges = data.badges || [];
        } else {
            username = generateUsername(user.displayName);
            await setDoc(userRef, {
                totalTests: 0, totalWords: 0, avgWPM: 0, avgAcc: 0, history: []
            });
        }

        const approxWords = Math.max(1, Math.round(wpm));
        const newTotalWords = totalWords + approxWords;

        // Level Calc
        let ovr = Math.round((newAvgWPM * 1.5) + (newAvgAcc * 0.5) + (totalTests * 0.2));
        let playerLevel = Math.floor(ovr / 300) + 1;

        // Badge Logic
        let newBadges = [...currentBadges];
        if (wpm >= 20 && !newBadges.includes("Rookie")) newBadges.push("Rookie");
        if (wpm >= 40 && !newBadges.includes("Speedster")) newBadges.push("Speedster");
        if (wpm >= 60 && !newBadges.includes("Ninja")) newBadges.push("Ninja");
        if (wpm >= 80 && !newBadges.includes("God")) newBadges.push("God");
        if (accuracy === 100 && totalTests >= 10 && !newBadges.includes("Perfectionist")) newBadges.push("Perfectionist");

        // Formatting
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        let modeShort = mode === 'bengali' ? 'BN' : (mode === 'coding' ? 'CODE' : 'ENG');
        let lvlShort = level === 'medium' ? 'Med' : (level === 'hard' ? 'Hard' : 'Easy');

        // Firestore Update
        await updateDoc(userRef, {
            totalTests: increment(1),
            totalWords: increment(approxWords),
            avgWPM: newAvgWPM,
            avgAcc: newAvgAcc,
            username: username,
            level: playerLevel,
            ovr: ovr,
            badges: newBadges,
            history: arrayUnion({
                wpm: wpm,
                accuracy: accuracy,
                errors: errors,
                time: Math.round(time),
                score: score,
                mode: modeShort,
                lvl: lvlShort,
                dateDisplay: dateStr,
                timestamp: Date.now()
            })
        });

        // ✅ STEP: Call new usage increment function
        // Calculating exact words typed from Input if available
        const inputField = document.getElementById('inputField');
        let wordsTyped = approxWords;
        
        if (inputField && inputField.value) {
            wordsTyped = inputField.value.trim().split(/\s+/).length;
        }

        await incrementUsage(wordsTyped, mode);

        // ✅ STEP: Refresh Sidebar immediately after usage update
        if (typeof updateSidebarAccess === "function") {
            updateSidebarAccess();
        }

    } catch (err) {
        console.error("🔥 Firebase Result Save Error:", err);
    }
}

// 🔐 USAGE TRACKER (New Logic)
// result-manager.js

// result-manager.js - incrementUsage UPDATE

async function incrementUsage(words, mode) {
    if (!auth.currentUser) return; // গেস্টদের সেভ হয় না
    if (window.IS_PRO_USER || window.IS_ADMIN) return; // প্রোদের লিমিট নেই

    const ref = doc(db, "users", auth.currentUser.uid);
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000; // ২৪ ঘন্টা

    // লোকাল ভ্যারিয়েবল আপডেট
    if (!window.USER_USAGE) window.USER_USAGE = { banglaWords: 0, englishWords: 0 };
    if (!window.USER_LOCKS) window.USER_LOCKS = { banglaUntil: 0, englishUntil: 0 };

    let updateData = {};
    let newLockSet = false;

    if (mode === "bengali") {
        window.USER_USAGE.banglaWords += words;
        updateData["usage.banglaWords"] = increment(words);

        // বাংলা লিমিট ক্রস এবং আগে থেকে লক না থাকলে
        if (window.USER_USAGE.banglaWords >= 200 && window.USER_LOCKS.banglaUntil === 0) {
            const unlockTime = now + ONE_DAY_MS;
            window.USER_LOCKS.banglaUntil = unlockTime;
            updateData["lockUntil.bangla"] = unlockTime;
            newLockSet = true;
        }
    } else {
        window.USER_USAGE.englishWords += words;
        updateData["usage.englishWords"] = increment(words);

        // ইংরেজি লিমিট ক্রস এবং আগে থেকে লক না থাকলে
        if (window.USER_USAGE.englishWords >= 300 && window.USER_LOCKS.englishUntil === 0) {
            const unlockTime = now + ONE_DAY_MS;
            window.USER_LOCKS.englishUntil = unlockTime;
            updateData["lockUntil.english"] = unlockTime;
            newLockSet = true;
        }
    }
    
    try {
        // ডাটাবেস আপডেট
        await updateDoc(ref, updateData);
        console.log(`📊 Usage: +${words} | Lock Updated: ${newLockSet}`);

        // UI আপডেট কল করা
        if(typeof window.updateSidebarAccess === 'function') {
            window.updateSidebarAccess();
        }
    } catch (err) {
        console.error("🔥 Usage Save Error:", err);
    }
}
// হেল্পার: র‍্যান্ডম ইউজারনেম জেনারেটর
function generateUsername(displayName) {
    const base = displayName ? displayName.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '') : "User";
    const random = Math.floor(1000 + Math.random() * 9000); 
    return `@${base}_${random}`;
}

// 🔥 GLOBAL EXPORT
window.openResultModal = openResultModal;
window.saveResultToFirebase = saveResultToFirebase;
window.closeResultModal = closeResultModal;
window.incrementUsage = incrementUsage;