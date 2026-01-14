import { auth, db, doc, getDoc, getDocs, setDoc, collection, addDoc, onSnapshot, query, where, updateDoc, deleteDoc, arrayRemove, orderBy, limit } from "./firebase-config.js";
console.log("🚀 Multiplayer Manager Loaded (UI Polish & Position Fix)");

// ===================================
// 1. DOM EVENTS & UI
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    const mpBtn = document.getElementById('mpRouteBtn');
    if (mpBtn) mpBtn.addEventListener('click', openMultiplayerModal);

    const closeBtn = document.querySelector('.mp-modal .close-btn');
    if(closeBtn) closeBtn.addEventListener('click', closeMultiplayerModal);
});

window.openMultiplayerModal = function() {
    if (!auth.currentUser) return alert("Please login first!");
    const modal = document.getElementById('multiplayerModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('myUidDisplay').innerText = window.CURRENT_USERNAME || "Loading...";
        document.getElementById('mpSearchResult').classList.add('hidden');
    }
};

window.closeMultiplayerModal = function() {
    document.getElementById('multiplayerModal').classList.add('hidden');
};

window.copyMyUid = function() {
    const txt = document.getElementById('myUidDisplay').innerText;
    navigator.clipboard.writeText(txt).then(() => alert("Copied!"));
};

// ===================================
// 2. SEARCH & CHALLENGE
// ===================================

let lastOpponentUid = null;

window.searchOpponent = async function() {
    const inputVal = document.getElementById('opponentUidInput').value.trim().toLowerCase();
    const resultBox = document.getElementById('mpSearchResult');
    const msgBox = document.getElementById('mpFeedbackMsg');

    if (!inputVal) return msgBox.innerText = "⚠️ Enter username";
    if (window.CURRENT_USERNAME && inputVal === window.CURRENT_USERNAME.toLowerCase()) return msgBox.innerText = "❌ Cannot challenge self";

    msgBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
    resultBox.classList.add('hidden');

    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("searchKeywords", "array-contains", inputVal));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0]; 
            const data = userDoc.data();
            lastOpponentUid = userDoc.id;

            document.getElementById('mpUserImg').src = data.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
            document.getElementById('mpUserName').innerHTML = `${data.displayName} <br><small style="color:#4cc9f0;">${data.username}</small>`;
            
            const btn = document.getElementById('sendChallengeBtn');
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.disabled = false;
            newBtn.innerText = "Send Request";
            newBtn.addEventListener('click', () => sendChallengeRequest(userDoc.id, data.displayName));

            resultBox.classList.remove('hidden');
            msgBox.innerText = "";
        } else {
            msgBox.innerText = "❌ User not found.";
        }
    } catch (err) { console.error(err); }
};

async function sendChallengeRequest(targetUid, targetName) {
    const btn = document.querySelector('#mpSearchResult .btn-success');
    const mode = document.getElementById('mpGameMode').value;
    const length = document.getElementById('mpGameLength').value;

    if(btn) { btn.disabled = true; btn.innerText = "Sending..."; }

    try {
        await addDoc(collection(db, "notifications"), {
            fromUid: auth.currentUser.uid,
            fromName: auth.currentUser.displayName || "Unknown",
            fromUsername: window.CURRENT_USERNAME, 
            fromPhoto: auth.currentUser.photoURL || "",
            toUid: targetUid,
            type: 'challenge',
            status: 'pending',
            gameMode: mode,      
            gameLength: length,  
            timestamp: Date.now()
        });
        document.getElementById('mpFeedbackMsg').innerText = `✅ Challenge sent!`;
        if(btn) btn.innerText = "Sent ✅";
    } catch (err) { 
        console.error(err); 
        if(btn) btn.disabled = false;
    }
}

// ===================================
// 3. TEXT GENERATOR
// ===================================

function generateGameText(mode, count) {
    let sourceArray = [];
    if (typeof window.onlineDatabase !== 'undefined') {
        sourceArray = (mode === 'bengali') ? window.onlineDatabase.bengali : window.onlineDatabase.english;
    } else {
        sourceArray = ["The quick brown fox jumps over the lazy dog."];
    }
    
    if (!sourceArray || sourceArray.length === 0) sourceArray = ["Error loading text."];

    let selectedText = "";
    for (let i = 0; i < parseInt(count); i++) {
        const rand = Math.floor(Math.random() * sourceArray.length);
        selectedText += sourceArray[rand].trim() + " "; 
    }
    return selectedText.trim();
}

// ===================================
// 4. GAME ENGINE
// ===================================

let activeMatchId = null;
let isMyMatchActive = false;
let mpStartTime = null;
let mpTotalErrors = 0;

// বাংলা টাইপিং ভেরিয়েবল
let banglaSequence = [];
let banglaIndex = 0;
let originalGuideParent = null;

export function initMultiplayerListener() {
    if (!auth.currentUser) return;
    
    const q = query(collection(db, "notifications"), where("toUid", "==", auth.currentUser.uid), where("status", "==", "pending"));
    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") showChallengeToast(change.doc.id, change.doc.data());
            if (change.type === "removed") document.getElementById('challengeToast').classList.add('hidden');
        });
    });

    const matchQ = query(
        collection(db, "matches"), 
        where("players", "array-contains", auth.currentUser.uid),
        where("status", "in", ["waiting", "starting", "running", "finished"])
    );

    onSnapshot(matchQ, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const matchData = change.doc.data();
            const quitMatchId = localStorage.getItem('quitMatchId');
            if (quitMatchId === matchData.matchId) return; 

            if (matchData.status === 'finished') {
                endGameLocally(matchData);
                return;
            }

            if (!isMyMatchActive && (matchData.status === 'running' || matchData.status === 'waiting')) {
                enterGameRoom(matchData);
            } else if (isMyMatchActive && matchData.matchId === activeMatchId) {
                updateOpponentProgress(matchData);
            }
        });
    });
}
window.initMultiplayerListener = initMultiplayerListener;

function enterGameRoom(matchData) {
    isMyMatchActive = true;
    activeMatchId = matchData.matchId;
    window.currentMode = 'multiplayer'; 
    window.activeMultiplayerMatchId = matchData.matchId; 

    mpStartTime = null; mpTotalErrors = 0;
    banglaIndex = 0; 

    closeMultiplayerModal();
    document.querySelector('.gt-sidebar').style.display = 'none';
    document.querySelector('.typing-section').style.display = 'none'; 
    
    const gameRoom = document.getElementById('mpGameRoom');
    gameRoom.classList.remove('hidden');

    const inputField = document.getElementById('inputField');
    gameRoom.appendChild(inputField); 
    
    inputField.style.opacity = '0'; 
    inputField.style.position = 'absolute'; 
    inputField.style.top = '0';
    inputField.style.zIndex = '999';

    // 🔥🔥 HAND GUIDE CUSTOMIZATION (Updated) 🔥🔥
    const guide = document.getElementById('instructionPanel');
    const mpTextDisplay = document.getElementById('mpTextDisplay');
    
    let guideContainer = document.getElementById('mpGuideContainer');
    if (!guideContainer) {
        guideContainer = document.createElement('div');
        guideContainer.id = 'mpGuideContainer';
        
        // ১. আরো নিচে নামানো হয়েছে (60px)
        guideContainer.style.marginTop = '60px'; 
        
        guideContainer.style.display = 'flex';
        guideContainer.style.justifyContent = 'center';
        guideContainer.style.width = '100%';
        mpTextDisplay.after(guideContainer); 
    }

    if (guide && !originalGuideParent) {
        originalGuideParent = guide.parentNode; 
        guideContainer.appendChild(guide); 
        guide.style.display = 'flex';
        
        // ২. ব্যাকগ্রাউন্ড কালার এবং স্টাইল পরিবর্তন
        guide.style.backgroundColor = '#090e19'; // গাঢ় নীল ব্যাকগ্রাউন্ড
        guide.style.padding = '15px 30px';       // একটু জায়গা দেওয়া হলো
        guide.style.borderRadius = '12px';       // কোণাগুলো গোল করা হলো
        guide.style.boxShadow = '0 8px 20px rgba(0,0,0,0.5)'; // সুন্দর শ্যাডো
        guide.style.border = '1px solid rgba(255, 255, 255, 0.1)'; // হালকা বর্ডার
    }

    // Player Data Setup
    const myUid = auth.currentUser.uid;
    const oppUid = matchData.players.find(id => id !== myUid);
    lastOpponentUid = oppUid;

    const myData = matchData.playerData[myUid];
    const oppData = oppUid ? matchData.playerData[oppUid] : null;

    document.getElementById('p1Img').src = myData.photo; document.getElementById('p1Name').innerText = myData.name;
    if (oppData) {
        document.getElementById('p2Img').src = oppData.photo; document.getElementById('p2Name').innerText = oppData.name;
        document.getElementById('mpGameStatus').innerText = "RACE STARTED! 🏁";
    }

    renderMultiplayerText(matchData.text);

    // Language Detection
    const isBengali = /[\u0980-\u09FF]/.test(matchData.text);

    if (isBengali) {
        if (window.buildBijoySequence) {
            banglaSequence = window.buildBijoySequence(matchData.text);
            if(banglaSequence.length > 0 && window.updateFingerGuide) {
                window.updateFingerGuide(banglaSequence[0].code, banglaSequence[0].shift, true);
            }
        }
        inputField.onkeydown = (e) => {
            e.stopPropagation();
            handleBengaliTyping(e, matchData.text);
        };
        inputField.oninput = (e) => e.stopPropagation(); 
    } else {
        if (matchData.text.length > 0 && window.getKeyFromChar && window.updateFingerGuide) {
            const firstKey = window.getKeyFromChar(matchData.text[0]);
            if(firstKey) window.updateFingerGuide(firstKey.code, firstKey.shift, true);
        }
        inputField.onkeydown = (e) => e.stopPropagation();
        inputField.oninput = (e) => {
            e.stopPropagation();
            handleEnglishTyping(e, matchData.text);
        };
    }

    inputField.value = '';
    inputField.disabled = false;
    inputField.focus();
    inputField.onblur = () => setTimeout(() => { if(isMyMatchActive) inputField.focus(); }, 10);
}

// Bangla Typing Logic
function handleBengaliTyping(e, targetText) {
    if (e.key === 'Shift' || e.key === 'Alt' || e.key === 'Control') return;
    
    const spans = document.querySelectorAll('#mpTextDisplay span');
    
    if (e.key === 'Backspace') {
        if (banglaIndex > 0) {
            banglaIndex--;
            const prev = banglaSequence[banglaIndex];
            let start = prev.startIndex !== undefined ? prev.startIndex : prev.charIndex;
            let end = prev.charIndex;

            for (let k = start; k <= end; k++) {
                if(spans[k]) spans[k].classList.remove('correct', 'incorrect', 'current-char');
            }
            if(spans[start]) spans[start].classList.add('current-char');
            if (window.updateFingerGuide) window.updateFingerGuide(prev.code, prev.shift, true);
        }
        return;
    }

    if (!mpStartTime) mpStartTime = new Date();
    e.preventDefault();

    if (banglaIndex >= banglaSequence.length) return;

    const target = banglaSequence[banglaIndex];
    let start = target.startIndex !== undefined ? target.startIndex : target.charIndex;
    let end = target.charIndex;

    if (e.code === target.code && e.shiftKey === target.shift) {
        for (let k = start; k <= end; k++) {
            if(spans[k]) {
                spans[k].classList.add('correct');
                spans[k].classList.remove('current-char');
            }
        }
    } else {
        mpTotalErrors++;
        for (let k = start; k <= end; k++) {
            if(spans[k]) {
                spans[k].classList.add('incorrect');
                spans[k].classList.remove('current-char');
            }
        }
    }

    banglaIndex++;

    if (banglaIndex < banglaSequence.length) {
        const next = banglaSequence[banglaIndex];
        if (window.updateFingerGuide) window.updateFingerGuide(next.code, next.shift, true);
        
        let nextStart = next.startIndex !== undefined ? next.startIndex : next.charIndex;
        if(spans[nextStart]) {
            spans[nextStart].classList.add('current-char');
            const container = document.getElementById('mpTextDisplay');
            container.scrollTop = spans[nextStart].offsetTop - 50;
        }
    } else {
        syncMyProgress(calculateWPM(targetText.length), 100, mpTotalErrors, 100, calculateScore(targetText.length));
    }

    const progress = Math.min(100, Math.floor((banglaIndex / banglaSequence.length) * 100));
    const wpm = calculateWPM(banglaIndex); 
    syncMyProgress(wpm, progress, mpTotalErrors, 100, calculateScore(banglaIndex)); 
}

// English Typing Logic
function handleEnglishTyping(e, targetText) {
    const inputField = document.getElementById('inputField');
    const typedVal = inputField.value;
    const arrayQuote = document.querySelectorAll('#mpTextDisplay span');
    
    if (!mpStartTime) mpStartTime = new Date();

    let correctChars = 0; let errors = 0;

    arrayQuote.forEach((charSpan, index) => {
        const char = typedVal[index];
        if (char == null) {
            charSpan.classList.remove('correct', 'incorrect', 'current-char');
            charSpan.style.color = '#64748b'; 
        } else if (char === charSpan.innerText) {
            charSpan.classList.add('correct');
            charSpan.classList.remove('incorrect', 'current-char');
            correctChars++;
        } else {
            charSpan.classList.add('incorrect');
            charSpan.classList.remove('correct', 'current-char');
            errors++;
        }
    });

    const currentIndex = typedVal.length;
    if (currentIndex < targetText.length) {
        const currentSpan = arrayQuote[currentIndex];
        const container = document.getElementById('mpTextDisplay');
        
        if (currentSpan) {
            currentSpan.classList.add('current-char');
            container.scrollTop = currentSpan.offsetTop - 50;
        }

        const nextChar = targetText[currentIndex];
        if (window.getKeyFromChar && window.updateFingerGuide) {
            const keyData = window.getKeyFromChar(nextChar);
            if (keyData) window.updateFingerGuide(keyData.code, keyData.shift, true);
        }
    }

    if(errors > mpTotalErrors) mpTotalErrors = errors;

    const wpm = calculateWPM(correctChars);
    const accuracy = typedVal.length > 0 ? Math.round(((typedVal.length - errors) / typedVal.length) * 100) : 100;
    const progress = Math.min(100, Math.floor((typedVal.length / targetText.length) * 100));
    
    syncMyProgress(wpm, progress, mpTotalErrors, accuracy, calculateScore(wpm, accuracy, errors));
}

function calculateWPM(chars) {
    const timeSpent = (new Date() - mpStartTime) / 1000 / 60; 
    return timeSpent > 0 ? Math.round((chars / 5) / timeSpent) : 0;
}

function calculateScore(wpm, accuracy = 100, errors = 0) {
    return Math.max(0, Math.round(wpm + (accuracy / 2) - errors));
}

function updateOpponentProgress(matchData) {
    const myUid = auth.currentUser.uid;
    const oppUid = matchData.players.find(id => id !== myUid);
    if (!oppUid || !matchData.playerData[oppUid]) return;
    
    const oppData = matchData.playerData[oppUid];
    document.getElementById('p2Wpm').innerText = `${oppData.wpm} WPM`;
    document.getElementById('p2Err').innerText = `${oppData.errors || 0} Err`;
    const progress = oppData.progress || 0;
    document.getElementById('oppCar').style.left = `${progress}%`;
    document.getElementById('oppProgressLine').style.width = `${progress}%`;
}

function endGameLocally(matchData) {
    isMyMatchActive = false;
    activeMatchId = matchData.matchId;
    if (auth.currentUser) {
        const oppUid = matchData.players.find(id => id !== auth.currentUser.uid);
        if (oppUid) lastOpponentUid = oppUid;
    }

    const input = document.getElementById('inputField');
    if(input) { input.disabled = true; input.blur(); } 
    showResultPopup(matchData);
}

function showResultPopup(matchData) {
    if (localStorage.getItem('quitMatchId') === matchData.matchId) return;

    const modal = document.getElementById('mpResultModal');
    modal.classList.remove('hidden');

    const myUid = auth.currentUser.uid;
    const oppUid = matchData.players.find(id => id !== myUid);
    const myData = matchData.playerData[myUid];
    const oppData = oppUid ? matchData.playerData[oppUid] : { wpm:0, accuracy:0, errors:0, score:0, photo:'' };
    
    const isWinner = matchData.winner === myUid;
    const resultText = document.getElementById('winnerDisplay');
    resultText.innerText = isWinner ? "YOU WON! 🎉" : "YOU LOST 😞";
    resultText.style.color = isWinner ? "#2ecc71" : "#ef4444";

    document.getElementById('resMyImg').src = myData.photo;
    document.getElementById('resMyWpm').innerText = `${myData.wpm} (Score: ${myData.score || 0})`;
    document.getElementById('resMyAcc').innerText = myData.accuracy + "%";
    document.getElementById('resMyErr').innerText = myData.errors;

    document.getElementById('resOppImg').src = oppData.photo;
    document.getElementById('resOppWpm').innerText = `${oppData.wpm} (Score: ${oppData.score || 0})`;
    document.getElementById('resOppAcc').innerText = oppData.accuracy + "%";
    document.getElementById('resOppErr').innerText = oppData.errors;
}

// 🔥🔥 RESTORE STYLE (Reset) 🔥🔥
function restoreHandGuide() {
    const guide = document.getElementById('instructionPanel');
    if(guide && originalGuideParent) {
        originalGuideParent.appendChild(guide); 
        originalGuideParent = null;
        
        // রিসেট স্টাইল
        guide.style.backgroundColor = ''; 
        guide.style.padding = '';
        guide.style.borderRadius = '';
        guide.style.boxShadow = '';
        guide.style.border = '';
    }
}

window.closeResultAndQuit = function() { 
    restoreHandGuide();
    if (activeMatchId) localStorage.setItem('quitMatchId', activeMatchId);
    window.currentMode = 'normal';
    location.reload(); 
};

window.quitMultiplayerMatch = async function() {
    if(!confirm("Are you sure?")) return;
    restoreHandGuide();
    try {
        if (activeMatchId && auth.currentUser) {
            localStorage.setItem('quitMatchId', activeMatchId);
            const matchRef = doc(db, "matches", activeMatchId);
            await updateDoc(matchRef, { players: arrayRemove(auth.currentUser.uid) });
        }
    } catch (e) { console.error(e); }
    finally { location.reload(); }
};

// ... Play Again & Others ...
window.playAgain = async function() {
    if (!lastOpponentUid) return alert("Opponent not found!");
    const btn = document.querySelector('.mp-result-grid button') || document.querySelector('.btn-success');
    if(btn) btn.innerText = "Sending...";
    try {
        await addDoc(collection(db, "notifications"), {
            fromUid: auth.currentUser.uid,
            fromName: auth.currentUser.displayName,
            fromUsername: window.CURRENT_USERNAME, 
            fromPhoto: auth.currentUser.photoURL,
            toUid: lastOpponentUid,
            type: 'challenge',
            status: 'pending',
            gameMode: 'english', 
            gameLength: '2',
            timestamp: Date.now()
        });
        alert("🔄 Rematch Request Sent!");
        if (activeMatchId) localStorage.setItem('quitMatchId', activeMatchId);
        restoreHandGuide();
        location.reload(); 
    } catch(e) { console.error(e); }
};

window.acceptChallenge = async function() {
    if(!window.currentChallengeDocId) return;
    const toast = document.getElementById('challengeToast');
    const docId = window.currentChallengeDocId;
    try {
        const acceptBtn = document.querySelector('.btn-accept');
        if(acceptBtn) acceptBtn.innerText = "Starting...";
        const notifSnap = await getDoc(doc(db, "notifications", docId));
        if(!notifSnap.exists()) return alert("Expired!");
        
        const data = notifSnap.data();
        const matchId = `match_${Date.now()}`;
        const gameText = generateGameText(data.gameMode, data.gameLength);

        await setDoc(doc(db, "matches", matchId), {
            matchId: matchId,
            status: 'running', 
            text: gameText,
            winner: null,
            players: [auth.currentUser.uid, data.fromUid],
            playerData: {
                [auth.currentUser.uid]: { name: auth.currentUser.displayName, photo: auth.currentUser.photoURL, wpm: 0, score: 0, progress: 0, errors: 0, accuracy: 100 },
                [data.fromUid]: { name: data.fromName, photo: data.fromPhoto, wpm: 0, score: 0, progress: 0, errors: 0, accuracy: 100 }
            },
            createdAt: Date.now()
        });
        await deleteDoc(doc(db, "notifications", docId));
        toast.classList.add('hidden');
    } catch(e) { console.error(e); alert("Failed!"); toast.classList.add('hidden'); }
};

window.rejectChallenge = async function() {
    if(!window.currentChallengeDocId) return;
    try { await deleteDoc(doc(db, "notifications", window.currentChallengeDocId)); document.getElementById('challengeToast').classList.add('hidden'); } catch(e) {}
};
window.currentChallengeDocId = null;
function showChallengeToast(docId, data) {
    const toast = document.getElementById('challengeToast');
    window.currentChallengeDocId = docId; 
    if (toast) {
        document.getElementById('challengerImg').src = data.fromPhoto;
        document.getElementById('challengerName').innerHTML = `${data.fromName}<br><small>${data.gameMode}</small>`;
        toast.classList.remove('hidden');
    }
}
export async function syncMyProgress(wpm, progress, errors, accuracy, score) {
    if (!activeMatchId || !auth.currentUser) return;
    const matchRef = doc(db, "matches", activeMatchId);
    let updates = {
        [`playerData.${auth.currentUser.uid}.wpm`]: wpm,
        [`playerData.${auth.currentUser.uid}.progress`]: progress,
        [`playerData.${auth.currentUser.uid}.errors`]: errors,
        [`playerData.${auth.currentUser.uid}.accuracy`]: accuracy,
        [`playerData.${auth.currentUser.uid}.score`]: score
    };
    if (progress >= 100) {
        updates.status = 'finished';
        updates.winner = auth.currentUser.uid;
    }
    await updateDoc(matchRef, updates);
    document.getElementById('p1Wpm').innerText = `${wpm} WPM`;
    document.getElementById('p1Err').innerText = `${errors} Err`;
    document.getElementById('myCar').style.left = `${progress}%`;
    document.getElementById('myProgressLine').style.width = `${progress}%`;
}
window.syncMultiplayerProgress = syncMyProgress;
function renderMultiplayerText(text) {
    const display = document.getElementById('mpTextDisplay');
    display.innerHTML = '';
    text.split('').forEach(char => {
        const span = document.createElement('span');
        span.innerText = char;
        span.style.color = '#64748b'; 
        display.appendChild(span);
    });
    window.currentText = text;
}

// =========================================
// 🏆 REAL-TIME WEEKLY LEADERBOARD SYSTEM
// =========================================

// ১. বর্তমান সপ্তাহের আইডি বের করা (যেমন: 2024-W05)
function getWeekID() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo}`;
}

// ২. গেম শেষে স্কোর আপডেট করা (Global Function)
window.updateWeeklyStats = async function(totalChars, wpm, errors) {
    if (!auth.currentUser) return;

    const userRef = doc(db, "users", auth.currentUser.uid);
    const currentWeek = getWeekID();

    try {
        const userSnap = await getDoc(userRef);
        let userData = userSnap.exists() ? userSnap.data() : {};
        let weeklyData = userData.weeklyStats || { weekId: "", totalWords: 0, totalWPM: 0, gamesPlayed: 0, errors: 0, score: 0 };

        // নতুন সপ্তাহ শুরু হলে সব রিসেট
        if (weeklyData.weekId !== currentWeek) {
            weeklyData = { weekId: currentWeek, totalWords: 0, totalWPM: 0, gamesPlayed: 0, errors: 0, score: 0 };
        }

        // ডাটা যোগ করা
        const words = Math.round(totalChars / 5);
        weeklyData.totalWords += words;
        weeklyData.totalWPM += wpm;
        weeklyData.gamesPlayed += 1;
        weeklyData.errors += errors;

        // স্কোরিং ফর্মুলা (Words + Avg WPM - Errors)
        const avgWPM = Math.round(weeklyData.totalWPM / weeklyData.gamesPlayed);
        // ভুল করলে পয়েন্ট কাটা যাবে (Error * 5)
        weeklyData.score = Math.max(0, weeklyData.totalWords + (avgWPM * 10) - (weeklyData.errors * 5));

        // ফায়ারবেসে সেভ
        await updateDoc(userRef, {
            weeklyStats: weeklyData,
            currentWeeklyScore: weeklyData.score // সার্চের জন্য আলাদা ফিল্ড
        });

        console.log("✅ Weekly Stats Updated:", weeklyData.score);
        loadLeaderboard(); // সাথে সাথে রিফ্রেশ

    } catch (e) {
        console.error("Stats Update Error:", e);
    }
};

// ৩. লিডারবোর্ড লোড করা
// ৩. লিডারবোর্ড লোড করা (আপডেটেড)
async function loadLeaderboard() {
    const list = document.getElementById('weeklyLeaderboardList');
    const loading = document.getElementById('lbLoading');
    if (!list) return;

    try {
        const q = query(collection(db, "users"), orderBy("currentWeeklyScore", "desc"), limit(5));
        const querySnapshot = await getDocs(q);

        let html = '';
        let rank = 1;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const score = data.currentWeeklyScore || 0;
            const wpm = data.weeklyStats ? Math.round(data.weeklyStats.totalWPM / data.weeklyStats.gamesPlayed) : 0;
            
            let rankClass = rank === 1 ? 'top-1' : (rank === 2 ? 'top-2' : (rank === 3 ? 'top-3' : ''));
            let rankIcon = rank === 1 ? '👑' : `#${rank}`;

            // 🔥 আপডেটেড: onclick ইভেন্ট যোগ করা হয়েছে
            html += `
                <li class="lb-item" onclick="openPublicProfile('${doc.id}', ${rank})">
                    <span class="lb-rank ${rankClass}">${rankIcon}</span>
                    <img src="${data.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" class="lb-avatar">
                    <div class="lb-info">
                        <span class="lb-name">${data.displayName || 'Unknown'}</span>
                        <span class="lb-stats">Avg WPM: ${wpm} | Pts: ${score}</span>
                    </div>
                </li>
            `;
            rank++;
        });

        if (html === '') {
            html = '<li style="text-align:center; padding:10px; font-size:0.8rem; color:#888;">No players this week yet!</li>';
        }

        list.innerHTML = html;
        if(loading) loading.style.display = 'none';

    } catch (error) {
        console.error("LB Error:", error);
    }
}

// ৪. পাবলিক প্রোফাইল ওপেন করা (নতুন ফাংশন)
window.openPublicProfile = async function(uid, rank) {
    const modal = document.getElementById('publicProfileModal');
    if(!modal) return;

    // লোডিং দেখানোর জন্য
    document.getElementById('pubName').innerText = "Loading...";
    modal.classList.remove('hidden');

    try {
        const userSnap = await getDoc(doc(db, "users", uid));
        
        if (userSnap.exists()) {
            const data = userSnap.data();
            const weekly = data.weeklyStats || {};

            // ডাটা সেট করা
            document.getElementById('pubPic').src = data.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
            document.getElementById('pubName').innerText = data.displayName || "Unknown";
           // 🔥 FIX: ডবল '@' সমস্যা সমাধান
            let handle = data.username || "user";
            // যদি নামের শুরুতে ইতিমধ্যে '@' থাকে, তাহলে আর বসাবো না
            if (!handle.startsWith('@')) {
                handle = '@' + handle;
            }
            document.getElementById('pubUsername').innerText = handle;
            
            // ব্যাজ সেট করা
            const badge = document.getElementById('pubRankBadge');
            badge.innerText = `#${rank}`;
            badge.style.background = rank === 1 ? '#facc15' : (rank === 2 ? '#bdc3c7' : (rank === 3 ? '#d35400' : '#333'));
            badge.style.color = rank > 3 ? '#fff' : '#000';

            // স্ট্যাটস সেট করা
            document.getElementById('pubScore').innerText = data.currentWeeklyScore || 0;
            
            const avgWpm = weekly.gamesPlayed > 0 ? Math.round(weekly.totalWPM / weekly.gamesPlayed) : 0;
            document.getElementById('pubWPM').innerText = avgWpm;
            document.getElementById('pubGames').innerText = weekly.gamesPlayed || 0;

            // চ্যালেঞ্জ বাটন সেটআপ
            const challengeBtn = document.getElementById('pubChallengeBtn');
            
            // নিজেকে চ্যালেঞ্জ করা যাবে না
            if (auth.currentUser && auth.currentUser.uid === uid) {
                challengeBtn.style.display = 'none';
            } else {
                challengeBtn.style.display = 'flex';
                // বাটন ক্লিক করলে সরাসরি চ্যালেঞ্জ মডাল খুলবে এবং ইউজার সার্চ হয়ে যাবে
                challengeBtn.onclick = function() {
                    closePublicProfile();
                    openMultiplayerModal();
                    // সার্চ বক্সে নাম বসিয়ে সার্চ ট্রিগার করা
                    const searchInput = document.getElementById('opponentUidInput');
                    if (searchInput && data.username) {
                        searchInput.value = data.username; // ইউজারনেম দিয়ে সার্চ
                        searchOpponent(); // অটো সার্চ
                    }
                };
            }
        }
    } catch (e) {
        console.error("Profile Load Error:", e);
        alert("Failed to load profile.");
        closePublicProfile();
    }
};

// মডাল বন্ধ করা
window.closePublicProfile = function() {
    document.getElementById('publicProfileModal').classList.add('hidden');
};

// পেজ লোড হলে লিডারবোর্ড আনবে
document.addEventListener('DOMContentLoaded', loadLeaderboard);