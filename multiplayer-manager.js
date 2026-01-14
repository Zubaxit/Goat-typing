import { auth, db, doc, getDoc, getDocs, setDoc, collection, addDoc, onSnapshot, query, where, updateDoc, deleteDoc, arrayRemove } from "./firebase-config.js";

console.log("🚀 Multiplayer Manager Loaded (Loop & Play Again Fixed)");

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

let lastOpponentUid = null; // রিম্যাচের জন্য সেভ রাখা

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
            const targetUid = userDoc.id;
            lastOpponentUid = targetUid; // Store for rematch

            document.getElementById('mpUserImg').src = data.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
            document.getElementById('mpUserName').innerHTML = `${data.displayName} <br><small style="color:#4cc9f0;">${data.username}</small>`;
            document.getElementById('mpUserStatus').innerText = "Found";

            const btn = document.getElementById('sendChallengeBtn');
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.disabled = false;
            newBtn.innerText = "Send Request";
            newBtn.addEventListener('click', () => sendChallengeRequest(targetUid, data.displayName));

            resultBox.classList.remove('hidden');
            msgBox.innerText = "";
        } else {
            msgBox.innerText = "❌ User not found.";
        }
    } catch (err) {
        console.error(err);
        msgBox.innerText = "❌ Error searching.";
    }
};

async function sendChallengeRequest(targetUid, targetName) {
    const msgBox = document.getElementById('mpFeedbackMsg');
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
        msgBox.innerText = `✅ Challenge sent!`;
        if(btn) btn.innerText = "Sent ✅";
    } catch (err) {
        console.error(err);
        msgBox.innerText = "❌ Failed.";
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
            
            // 🔥 LOOP FIX 1: Check localStorage immediately
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

    const myUid = auth.currentUser.uid;
    const oppUid = matchData.players.find(id => id !== myUid);
    lastOpponentUid = oppUid; // Save for Play Again

    const myData = matchData.playerData[myUid];
    const oppData = oppUid ? matchData.playerData[oppUid] : null;

    document.getElementById('p1Img').src = myData.photo; document.getElementById('p1Name').innerText = myData.name;
    if (oppData) {
        document.getElementById('p2Img').src = oppData.photo; document.getElementById('p2Name').innerText = oppData.name;
        document.getElementById('mpGameStatus').innerText = "RACE STARTED! 🏁";
    }

    renderMultiplayerText(matchData.text);

    inputField.value = '';
    inputField.disabled = false;
    inputField.focus();
    inputField.onblur = () => setTimeout(() => { if(isMyMatchActive) inputField.focus(); }, 10);

    inputField.oninput = (e) => {
        e.stopPropagation();
        handleMultiplayerTyping(e, matchData.text);
    };
    
    inputField.onkeydown = (e) => e.stopPropagation();
}

function handleMultiplayerTyping(e, targetText) {
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

    const currentSpan = arrayQuote[typedVal.length];
    const container = document.getElementById('mpTextDisplay');

    if (currentSpan && container) {
        currentSpan.classList.add('current-char');
        container.scrollTop = currentSpan.offsetTop - 50; 
    }

    if(errors > mpTotalErrors) mpTotalErrors = errors;

    const timeSpent = (new Date() - mpStartTime) / 1000 / 60; 
    const wpm = timeSpent > 0 ? Math.round((correctChars / 5) / timeSpent) : 0;
    const accuracy = typedVal.length > 0 ? Math.round(((typedVal.length - errors) / typedVal.length) * 100) : 100;
    const progress = Math.min(100, Math.floor((typedVal.length / targetText.length) * 100));
    const score = Math.max(0, Math.round(wpm + (accuracy / 2) - errors));

    syncMyProgress(wpm, progress, mpTotalErrors, accuracy, score);
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

// 🔥 CRITICAL FIXES FOR BUTTONS (Back to Lobby & Play Again)
function endGameLocally(matchData) {
    isMyMatchActive = false;
    
    // Fix: ম্যানুয়ালি ভেরিয়েবল সেট করা হচ্ছে যাতে বাটন কাজ করে
    activeMatchId = matchData.matchId; 
    
    if (auth.currentUser) {
        const oppUid = matchData.players.find(id => id !== auth.currentUser.uid);
        if (oppUid) lastOpponentUid = oppUid; // Fix Play Again
    }

    const input = document.getElementById('inputField');
    if(input) { input.disabled = true; input.blur(); } 
    showResultPopup(matchData);
}

function showResultPopup(matchData) {
    // Double check loop prevention
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

// 🔥 Fix: Loop বন্ধ করা এবং Reload
window.closeResultAndQuit = function() { 
    if (activeMatchId) {
        localStorage.setItem('quitMatchId', activeMatchId);
        console.log("🚫 Match Ignored:", activeMatchId);
    }
    window.currentMode = 'normal';
    location.reload(); 
};

// 🔥 Fix: Opponent ID খুঁজে পাওয়া
window.playAgain = async function() {
    if (!lastOpponentUid) {
        console.error("Opponent ID missing!");
        return alert("Opponent not found! (Try finding from lobby)");
    }
    
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
        
        // রিম্যাচ রিকোয়েস্ট পাঠানোর পর এই ম্যাচটি ইগনোর লিস্টে দিয়ে রিলোড দেওয়া ভালো
        if (activeMatchId) localStorage.setItem('quitMatchId', activeMatchId);
        location.reload(); 

    } catch(e) { console.error(e); }
};

window.quitMultiplayerMatch = async function() {
    if(!confirm("Are you sure?")) return;
    try {
        if (activeMatchId && auth.currentUser) {
            localStorage.setItem('quitMatchId', activeMatchId);
            const matchRef = doc(db, "matches", activeMatchId);
            await updateDoc(matchRef, { players: arrayRemove(auth.currentUser.uid) });
        }
    } catch (e) { console.error(e); }
    finally { location.reload(); }
};

window.currentChallengeDocId = null;
function showChallengeToast(docId, data) {
    const toast = document.getElementById('challengeToast');
    window.currentChallengeDocId = docId; 
    if (toast) {
        document.getElementById('challengerImg').src = data.fromPhoto;
        const details = `${data.gameMode} (${data.gameLength} S)`;
        document.getElementById('challengerName').innerHTML = `${data.fromName}<br><small>${details}</small>`;
        toast.classList.remove('hidden');
        if(typeof window.playSound === 'function') window.playSound('notification');
    }
}

window.rejectChallenge = async function() {
    if(!window.currentChallengeDocId) return;
    try {
        await deleteDoc(doc(db, "notifications", window.currentChallengeDocId));
        document.getElementById('challengeToast').classList.add('hidden');
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
        // ডিফল্ট কালার
        span.style.color = '#64748b'; 
        display.appendChild(span);
    });
    window.currentText = text;
}