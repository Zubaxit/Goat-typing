// result-manager.js - Fixed Popup + Cloud Save

// ১. ইম্পোর্ট (Firebase এর জন্য)
import { db, auth, doc, updateDoc, arrayUnion, getDoc, increment } from "./firebase-config.js";

const resultState = {
    history: JSON.parse(localStorage.getItem('typingHistory')) || [],
    lastSavedTime: 0
};

// স্কোর ক্যালকুলেশন
function calculateOverallScore(wpm, accuracy, errors, time) {
    let baseScore = (wpm * 0.6) + (accuracy * 0.4); 
    let penalty = errors * 2;
    let timeBonus = time >= 60 ? 5 : 0;
    let finalScore = Math.round(baseScore - penalty + timeBonus);
    return finalScore > 0 ? finalScore : 0;
}

// ২. ডাটা সেভ ফাংশন (Cloud + Local)
// এটাকে async করা হয়েছে যাতে ডাটাবেসে সেভ করতে পারে
async function saveResult(wpm, accuracy, errors, time, mode, level) {
    const now = Date.now();
    // ২ সেকেন্ডের মধ্যে ডাবল সেভ আটকাতে
    if (now - resultState.lastSavedTime < 2000) return 0; 
    resultState.lastSavedTime = now;

    const overallScore = calculateOverallScore(wpm, accuracy, errors, time);

    // শর্টকাট নাম তৈরি
    let modeShort = 'ENG';
    if(mode === 'bengali') modeShort = 'BN';
    else if(mode === 'coding') modeShort = 'CODE';

    let lvlShort = 'Easy';
    if(level === 'medium') lvlShort = 'Med';
    else if(level === 'hard') lvlShort = 'Hard';

    const resultData = {
        score: overallScore,
        wpm: wpm || 0,
        acc: accuracy || 0,
        err: errors || 0,
        time: Math.round(time) || 0,
        mode: modeShort, 
        lvl: lvlShort,   
        date: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        fullDate: new Date().toLocaleDateString() // প্রোফাইলের গ্রাফের জন্য তারিখ
    };

    // --- A. লোকাল স্টোরেজ (আপনার আগের কোড) ---
    resultState.history.push(resultData);
    if (resultState.history.length > 20) {
        resultState.history.shift();
    }
    localStorage.setItem('typingHistory', JSON.stringify(resultState.history));

    // --- B. ক্লাউড সেভ (Firebase) - নতুন অংশ ---
    const user = auth.currentUser;
    if (user) {
        try {
            const userRef = doc(db, "users", user.uid);
            
            // বর্তমান ডাটা আনা (গড় হিসাব করার জন্য)
            const userSnap = await getDoc(userRef);
            let newAvgWPM = wpm;
            let newAvgAcc = accuracy;

            if (userSnap.exists()) {
                const data = userSnap.data();
                const currentTests = data.totalTests || 0;
                const currentAvgWPM = data.avgWPM || 0;
                const currentAvgAcc = data.avgAcc || 0;

                // নতুন গড় বের করার সূত্র
                if (currentTests > 0) {
                    newAvgWPM = Math.round(((currentAvgWPM * currentTests) + wpm) / (currentTests + 1));
                    newAvgAcc = Math.round(((currentAvgAcc * currentTests) + accuracy) / (currentTests + 1));
                }
            }

            // ডাটাবেসে আপডেট পাঠানো
            await updateDoc(userRef, {
                history: arrayUnion(resultData),
                totalTests: increment(1),
                totalWords: increment(wpm),
                avgWPM: newAvgWPM,
                avgAcc: newAvgAcc,
                lastActive: new Date()
            });
            console.log("☁️ Saved to Cloud!");
        } catch (err) {
            console.error("Cloud Save Error:", err);
        }
    }

    return overallScore;
}

// ৩. এনিমেশন (আপনার আগের কোড)
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

// ৪. মডাল ওপেন (এখানে await যোগ করা হয়েছে)
async function openResultModal(wpm, accuracy, errors, time, mode, level) {
    // আগে স্কোর ক্যালকুলেট করে নিচ্ছি এনিমেশনের জন্য
    const score = calculateOverallScore(wpm, accuracy, errors, time);
    
    // ব্যাকগ্রাউন্ডে সেভ প্রসেস শুরু (await দিচ্ছি না যাতে পপআপ আসতে দেরি না হয়)
    saveResult(wpm, accuracy, errors, time, mode, level);

    const modal = document.getElementById('iosResultModal');
    if(!modal) return;

    animateValue("resWpm", 0, score, 1000); 

    const scoreLabel = document.querySelector('.score-label');
    if(scoreLabel) scoreLabel.innerText = "Overall";

    document.getElementById('resAcc').textContent = accuracy + '%';
    document.getElementById('resErr').textContent = errors;
    document.getElementById('resTime').textContent = Math.round(time) + 's';

    const circle = document.querySelector('.circular-chart .circle');
    if(circle) {
        const percent = Math.min(score, 100);
        circle.style.strokeDasharray = `0, 100`; 
        
        if(score >= 80) circle.style.stroke = '#2ecc71'; 
        else if(score >= 50) circle.style.stroke = '#007AFF'; 
        else circle.style.stroke = '#ff4757'; 

        setTimeout(() => {
            circle.style.strokeDasharray = `${percent}, 100`;
        }, 100);
    }

    renderOfflineGraph();

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

// ৫. গ্রাফ রেন্ডার (আপনার আগের কোড)
function renderOfflineGraph() {
    const container = document.getElementById('chartBars');
    if(!container) return;
    container.innerHTML = '';

    const MAX_WPM = 100; 
    const MAX_TIME = 60; 
    const MAX_ERR = 10; 

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

    setTimeout(() => {
        const scrollWrap = document.querySelector('.chart-scroll-wrapper');
        if(scrollWrap) scrollWrap.scrollLeft = scrollWrap.scrollWidth;
    }, 100);
}

// ৬. মডাল ক্লোজ (আপনার আগের কোড)
function closeResultModal() {
    const modal = document.getElementById('iosResultModal');
    if(modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
            if(typeof resetTest === 'function') resetTest(true);
        }, 300);
    }
}

// গ্লোবাল এক্সপোর্ট
window.saveResult = saveResult;
window.openResultModal = openResultModal;
window.renderOfflineGraph = renderOfflineGraph;
window.closeResultModal = closeResultModal;