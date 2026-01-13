// multiplayer-manager.js - Username Based Search & Matchmaking

// 🔥 getDocs ইমপোর্ট করা হয়েছে সার্চের জন্য
import { auth, db, doc, getDoc, getDocs, collection, addDoc, onSnapshot, query, where, updateDoc, deleteDoc } from "./firebase-config.js";

console.log("🚀 Multiplayer Manager Loaded!");

// ===================================
// 🔥 1. DOM EVENT LISTENERS
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // হেডারের বাটন কানেক্ট করা
    const mpBtn = document.getElementById('mpRouteBtn');
    if (mpBtn) {
        mpBtn.addEventListener('click', openMultiplayerModal);
        console.log("✅ Multiplayer Button Connected");
    }

    // ক্লোজ বাটন
    const closeBtn = document.querySelector('.mp-modal .close-btn');
    if(closeBtn) {
        closeBtn.addEventListener('click', closeMultiplayerModal);
    }
});

// ===================================
// 2. UI FUNCTIONS (Window Bound)
// ===================================

window.openMultiplayerModal = function() {
    if (!auth.currentUser) {
        alert("মাল্টিপ্লেয়ার খেলতে দয়া করে আগে লগিন করুন!");
        return;
    }

    const modal = document.getElementById('multiplayerModal');
    if (modal) {
        modal.classList.remove('hidden');
        
        // 🔥 UID এর বদলে Username দেখাচ্ছি
        const uidEl = document.getElementById('myUidDisplay');
        if(uidEl) {
            uidEl.innerText = window.CURRENT_USERNAME || "Loading...";
            uidEl.style.color = "#4cc9f0";
        }
        
        // ইনপুট ফিল্ড ক্লিয়ার করা
        const resultBox = document.getElementById('mpSearchResult');
        const inputField = document.getElementById('opponentUidInput');
        const msgBox = document.getElementById('mpFeedbackMsg');

        if(resultBox) resultBox.classList.add('hidden');
        if(inputField) {
            inputField.value = '';
            inputField.placeholder = "Enter friend's username (e.g. rahim#1234)";
        }
        if(msgBox) msgBox.innerText = '';
    }
};

window.closeMultiplayerModal = function() {
    const modal = document.getElementById('multiplayerModal');
    if(modal) modal.classList.add('hidden');
};

window.copyMyUid = function() {
    const txt = document.getElementById('myUidDisplay').innerText;
    navigator.clipboard.writeText(txt).then(() => alert("Username Copied!"));
};

// ===================================
// 3. SEARCH SYSTEM (By Username)
// ===================================

// multiplayer-manager.js (Only searchOpponent updated)

// ===================================
// 3. SEARCH SYSTEM (By Name OR Username)
// ===================================

window.searchOpponent = async function() {
    const inputRaw = document.getElementById('opponentUidInput').value.trim();
    // 🔥 ইনপুটকে ছোট হাতের করে ফেলা, কারণ আমরা কিওয়ার্ডগুলো ছোট হাতে সেভ করেছি
    const inputVal = inputRaw.toLowerCase();
    
    const resultBox = document.getElementById('mpSearchResult');
    const msgBox = document.getElementById('mpFeedbackMsg');

    if (!inputVal || inputVal.length < 3) {
        msgBox.innerText = "⚠️ দয়া করে অন্তত ৩ অক্ষরের নাম লিখুন।";
        return;
    }

    if (window.CURRENT_USERNAME && inputVal === window.CURRENT_USERNAME.toLowerCase()) {
        msgBox.innerText = "❌ নিজেকে চ্যালেঞ্জ করা যাবে না!";
        resultBox.classList.add('hidden');
        return;
    }

    msgBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
    resultBox.classList.add('hidden');

    try {
        // 🔥 কুয়েরি আপডেট: 'array-contains' ব্যবহার করা হচ্ছে
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("searchKeywords", "array-contains", inputVal));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // 🔥 আপাতত প্রথম রেজাল্টটা দেখাচ্ছি (Simplest approach)
            // পরে চাইলে আমরা লিস্ট আকারে দেখাতে পারি যদি একাধিক মানুষ পাওয়া যায়
            const userDoc = querySnapshot.docs[0]; 
            const data = userDoc.data();
            const targetUid = userDoc.id;

            // UI আপডেট
            document.getElementById('mpUserImg').src = data.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
            
            // নাম এবং ইউজারনেম সুন্দর করে দেখানো
            const displayName = data.displayName ? data.displayName.split(' ')[0] : "Unknown";
            document.getElementById('mpUserName').innerHTML = `${displayName} <br><small style="color:#4cc9f0; opacity:0.8;">${data.username}</small>`;
            
            const statusBadge = document.getElementById('mpUserStatus');
            statusBadge.innerText = "Found";
            statusBadge.className = "status-badge online";

            const btn = document.getElementById('sendChallengeBtn');
            btn.disabled = false;
            btn.innerText = "Send Request";
            btn.classList.remove('btn-sent'); // পুরনো স্টাইল রিমুভ
            
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', () => sendChallengeRequest(targetUid, data.displayName));

            resultBox.classList.remove('hidden');
            msgBox.innerText = "";
        } else {
            msgBox.innerText = "❌ এই নামে কাউকে পাওয়া যায়নি।";
        }
    } catch (err) {
        console.error("Search Error:", err);
        msgBox.innerText = "❌ খোঁজার সময় সমস্যা হয়েছে।";
    }
};

// ===================================
// 4. SEND REQUEST LOGIC
// ===================================

async function sendChallengeRequest(targetUid, targetName) {
    const msgBox = document.getElementById('mpFeedbackMsg');
    const btn = document.getElementById('sendChallengeBtn'); // Note: This grabs the btn in DOM, which is now newBtn
    
    // UI Feedback immediately
    // We query select again to be safe after replaceChild
    const activeBtn = document.querySelector('#mpSearchResult .btn-success'); 
    
    if(activeBtn) {
        activeBtn.disabled = true;
        activeBtn.innerText = "Sending...";
    }

    try {
        await addDoc(collection(db, "notifications"), {
            fromUid: auth.currentUser.uid,
            fromName: auth.currentUser.displayName || "Unknown",
            fromUsername: window.CURRENT_USERNAME, // এটাও পাঠানো হলো
            fromPhoto: auth.currentUser.photoURL || "",
            toUid: targetUid,
            type: 'challenge',
            status: 'pending',
            timestamp: Date.now()
        });

        msgBox.style.color = "#2ecc71";
        msgBox.innerText = `✅ ${targetName}-কে রিকোয়েস্ট পাঠানো হয়েছে!`;
        
        if(activeBtn) activeBtn.innerText = "Sent ✅";
        
    } catch (err) {
        console.error("Challenge Error:", err);
        msgBox.style.color = "red";
        msgBox.innerText = "❌ ফেইলড!";
        if(activeBtn) {
            activeBtn.disabled = false;
            activeBtn.innerText = "Try Again";
        }
    }
}

// ===================================
// 5. LISTENER & TOAST LOGIC
// ===================================

// এই ভেরিয়েবল উইন্ডো লেভেলে রাখলাম যাতে accept/reject এক্সেস পায়
window.currentChallengeDocId = null;

// এটাকে গ্লোবাল করা হলো যাতে auth-manager.js কল করতে পারে
window.initMultiplayerListener = function() {
    if (!auth.currentUser) return;
    console.log("🎧 Multiplayer Listener Active for: " + window.CURRENT_USERNAME);

    const q = query(
        collection(db, "notifications"),
        where("toUid", "==", auth.currentUser.uid),
        where("status", "==", "pending")
    );

    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const data = change.doc.data();
                showChallengeToast(change.doc.id, data);
            }
        });
    });
};

function showChallengeToast(docId, data) {
    const toast = document.getElementById('challengeToast');
    window.currentChallengeDocId = docId; // স্টোর করা হলো

    if (toast) {
        const imgEl = document.getElementById('challengerImg');
        const nameEl = document.getElementById('challengerName'); // h4 tag

        if(imgEl) imgEl.src = data.fromPhoto || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        
        // নাম এবং ইউজারনেম দেখানো
        if(nameEl) {
            nameEl.innerHTML = `${data.fromName} <br><span style="font-size:0.75rem; color:#aaa; font-weight:normal;">${data.fromUsername || 'User'}</span>`;
        }
        
        toast.classList.remove('hidden');
        
        if(typeof window.playSound === 'function') {
            window.playSound('success'); // নোটিফিকেশন সাউন্ড
        }
    }
}

// ===================================
// 6. ACCEPT / REJECT HANDLERS
// ===================================

window.rejectChallenge = async function() {
    const docId = window.currentChallengeDocId;
    if (!docId) return;
    
    const toast = document.getElementById('challengeToast');
    try {
        await deleteDoc(doc(db, "notifications", docId));
        toast.classList.add('hidden');
        window.currentChallengeDocId = null;
    } catch (err) { console.error(err); }
};

window.acceptChallenge = async function() {
    const docId = window.currentChallengeDocId;
    if (!docId) return;
    
    const toast = document.getElementById('challengeToast');
    try {
        const notifRef = doc(db, "notifications", docId);
        await updateDoc(notifRef, { status: 'accepted' });
        
        alert("🎉 Challenge Accepted! Match Room Loading...");
        toast.classList.add('hidden');
        
        // TODO: Next step - Redirect to Match Room
    } catch (err) { console.error(err); }
};