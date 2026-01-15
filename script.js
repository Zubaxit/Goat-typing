// script.js - Core Game Logic & Controller (FIXED)

/* =========================================
   🔥 LOADER JS (PERCENTAGE FIX & QUANTUM CORE)
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {
    const loader = document.getElementById('loaderOverlay');
    const barFill = document.getElementById('loaderBarFill');
    const percentNum = document.getElementById('loadingPercentage');
    
    let progress = 0;
    let isFinished = false;

    // Loader bondho korar function
    function closeLoader() {
        if(isFinished) return;
        isFinished = true;

        if (loader) {
            loader.classList.add('fade-out');
            setTimeout(() => {
                loader.style.display = 'none';
            }, 600);
        }
    }

    // Animation Loop
    const interval = setInterval(() => {
        // Randomly increase progress
        progress += Math.floor(Math.random() * 5) + 2; 

        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            
            // Final Update
            if(barFill) barFill.style.width = '100%';
            if(percentNum) percentNum.innerText = '100';
            
            // 0.5s por bondho hobe
            setTimeout(closeLoader, 500);
        } else {
            // Running Update
            if(barFill) barFill.style.width = `${progress}%`;
            if(percentNum) percentNum.innerText = progress;
        }
    }, 80); // Speed: 80ms

    // Real Window Load Override (Safety)
    window.onload = () => {
        progress = 100;
    };

    // Backup Safety (6 sec por auto close)
    setTimeout(() => {
        if(!isFinished) {
            progress = 100;
            if(percentNum) percentNum.innerText = '100';
            closeLoader();
        }
    }, 6000);
});

/* =========================================
   🌐 OFFLINE/ONLINE DETECTION
   ========================================= */
const offlineScreen = document.getElementById('offlineOverlay');

function updateOnlineStatus() {
    if(!offlineScreen) return;
    
    if (navigator.onLine) {
        offlineScreen.classList.add('hidden');
        console.log("🟢 Back Online - System Restored");
    } else {
        offlineScreen.classList.remove('hidden');
        console.log("🔴 Connection Lost - System Failure");
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
// Initial check
updateOnlineStatus();


/* ==========================================
   ⚡ SECURITY FLASH FIX
   ========================================== */
(function() {
    if (sessionStorage.getItem('isUnlocked') === 'true') {
        const style = document.createElement('style');
        style.innerHTML = '#securityOverlay { display: none !important; }';
        document.head.appendChild(style);
    }
})();

/* ==========================================
   🌍 GLOBAL VARIABLES
   ========================================== */
// Audio Context Setup
let audioCtxMain; 
function initAudio() {
    if (!audioCtxMain) {
        audioCtxMain = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxMain.state === 'suspended') {
        audioCtxMain.resume();
    }
}

let currentMode = 'normal';
let isCustomSource = false; 
let currentText = "";
let timeLeft = 0;
let sentenceTimeLimit = 0; 
let timer = null;
let isTyping = false;
let isFocusMode = false;
let isCountUpMode = false;
let charIndex = 0; 
let gameSequence = [];
let sequenceIndex = 0;
let sessionSentencesCompleted = 0;
const SESSION_LIMIT = 10; 
let sessionTotalCorrect = 0;
let sessionTotalErrors = 0;
let sessionTotalTimeElapsed = 0; 
let currentWPM = 0; 

/* ==========================================
   🚀 INITIAL SETUP
   ========================================== */
window.addEventListener('DOMContentLoaded', function() {
    // Tab initialize
    if(typeof switchTab === 'function') switchTab('normal'); 
   
    const typingSection = document.getElementById('typingSection');
    if(typingSection) {
        const bar = document.createElement('div');
        bar.id = 'timerProgressBar';
        typingSection.appendChild(bar);
    }
    
    const checkCaps = (e) => {
        if (e.getModifierState("CapsLock")) {
            const warning = document.getElementById('capsLockWarning');
            if(warning) warning.style.display = 'block';
        } else {
            const warning = document.getElementById('capsLockWarning');
            if(warning) warning.style.display = 'none';
        }
    };
    
    document.addEventListener('keydown', checkCaps);
    document.addEventListener('keyup', checkCaps);
    document.addEventListener('click', checkCaps);
    
    // AI Analyst Timer Start
    if (typeof timerProfile !== 'undefined') clearInterval(timerProfile);
    // timerProfile is global, assume declared or auto-global
    window.timerProfile = setInterval(updateTypingProfile, 1500);
});

/* ==========================================
   🔊 SOUND LOGIC
   ========================================== */
function playSound(type) {
    initAudio(); // Ensure AudioContext is ready
    if (!audioCtxMain) return;

    if (audioCtxMain.state === 'suspended') audioCtxMain.resume();
    const osc = audioCtxMain.createOscillator();
    const gain = audioCtxMain.createGain();
    osc.connect(gain);
    gain.connect(audioCtxMain.destination);
    
    if (type === 'click') {
        osc.frequency.setValueAtTime(600, audioCtxMain.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtxMain.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtxMain.currentTime + 0.05);
        osc.start(); osc.stop(audioCtxMain.currentTime + 0.05);
    } else if (type === 'success') {
        osc.frequency.setValueAtTime(800, audioCtxMain.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtxMain.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtxMain.currentTime + 0.1);
        osc.start(); osc.stop(audioCtxMain.currentTime + 0.1);
    } else if (type === 'timeout') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, audioCtxMain.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtxMain.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, audioCtxMain.currentTime + 0.3);
        osc.start(); osc.stop(audioCtxMain.currentTime + 0.3);
    } else {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, audioCtxMain.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtxMain.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtxMain.currentTime + 0.1);
        osc.start(); osc.stop(audioCtxMain.currentTime + 0.1);
    }
}

/* ==========================================
   ⌨️ KEYBOARD LISTENERS
   ========================================== */
document.addEventListener('keydown', (e) => {
    // 🔥 MULTIPLAYER CONFLICT FIX
    if (window.currentMode === 'multiplayer') {
        const input = document.getElementById('inputField');
        if(input && document.activeElement !== input) {
            input.focus();
        }
        return; 
    }

    if (isTyping) return;
    if (['Shift', 'Alt', 'Control', 'CapsLock', 'Tab', 'Meta'].includes(e.key)) return;
    if (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.id === 'customTimeInput' || document.activeElement.tagName === 'SELECT') return;

    if (!isFocusMode) {
        const warningModal = document.getElementById('warningModal');
        if(warningModal) warningModal.style.display = 'flex';
    } else {
        if(!isTyping) startTest();
    }
});

function scrollToGameView() {
    const aiBox = document.getElementById('profilePanel'); 
    
    if (aiBox) {
        const elementPosition = aiBox.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - 10; // 10px Gap

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

function closeWarningAndStart() {
    document.getElementById('warningModal').style.display = 'none';
    startTest();
}

/* ==========================================
   🎮 GAME CONTROL
   ========================================== */
function startTest(previewOnly = false) {
    if (window.currentMode === 'multiplayer') return;

    if (isTyping && !previewOnly) return;
    if (!previewOnly) {
        sessionSentencesCompleted = 0; sessionTotalCorrect = 0; sessionTotalErrors = 0; sessionTotalTimeElapsed = 0; window.keyMistakes = {};
    }
    if (!isCustomSource && currentMode !== 'custom' && currentText === "") {
        loadRandomText();
    }
    if(previewOnly) {
        renderText(currentText);
        if (currentMode === 'bengali') {
            const seq = buildBijoySequence(currentText);
            if(seq.length > 0) updateFingerGuide(seq[0].code, seq[0].shift, false);
        } else {
            if(currentText.length > 0) {
                const firstKey = getKeyFromChar(currentText[0]);
                updateFingerGuide(firstKey.code, firstKey.shift, false);
            }
        }
    } else {
        sessionStorage.setItem("typing_started", "true");
        setupTestUI(true); 
        scrollToGameView();
    }
}

function loadRandomText() {
    const lvl = document.getElementById('levelSelector').value;
    if(typeof textDatabase !== 'undefined' && textDatabase[currentMode]) {
        const texts = textDatabase[currentMode][lvl];
        currentText = texts[Math.floor(Math.random() * texts.length)];
    } else {
        currentText = "Sample text placeholder.";
    }
}

function setupTestUI(resetSentenceTimer = true) {
    isTyping = true;
    if (!isCustomSource && currentMode !== 'custom') {
        const lvl = document.getElementById('levelSelector').value;
        const timeLabel = document.querySelector('.stat-card:nth-child(3) .stat-label');
        const wpmLabel = document.querySelector('.stat-card:nth-child(1) .stat-label');
        if (lvl === 'hard') { if(wpmLabel) wpmLabel.innerText = "WPM"; } else { if(wpmLabel) wpmLabel.innerText = "Completed"; }
        if (lvl === 'easy' || lvl === 'medium') {
            sentenceTimeLimit = lvl === 'easy' ? 35 : 30; isCountUpMode = false; if(timeLabel) timeLabel.innerText = "Time Left";
        } else if (lvl === 'hard') {
            sentenceTimeLimit = 0; isCountUpMode = true; if(timeLabel) timeLabel.innerText = "Time";
        }
    }
    if (resetSentenceTimer) timeLeft = isCountUpMode ? 0 : sentenceTimeLimit;
    if(sb.time) sb.time.innerText = timeLeft;
    updateProgressBar(); 
    renderText(currentText);
    
    if (currentMode === 'bengali') {
        gameSequence = buildBijoySequence(currentText); sequenceIndex = 0;
        if(gameSequence.length > 0) {
            highlightChar(gameSequence[0].charIndex);
            updateFingerGuide(gameSequence[0].code, gameSequence[0].shift, true);
        }
    } else {
        charIndex = 0;
        const chars = document.getElementById('quoteDisplay').querySelectorAll('span');
        if(chars.length > 0) {
            chars[0].classList.add('current');
            const firstKey = getKeyFromChar(chars[0].innerText);
            updateFingerGuide(firstKey.code, firstKey.shift, true);
        }
    }
    const input = document.getElementById('inputField');
    input.value = ''; input.disabled = false; input.focus();
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('resetBtn').style.display = 'inline-flex';
    document.getElementById('certBtn').style.display = 'none';
    if(timer) clearInterval(timer);
    timer = setInterval(updateTimer, 1000);
    updateStats(); 
}

/* ==========================================
   📝 INPUT LOGIC
   ========================================== */
document.getElementById('inputField').addEventListener('keydown', (e) => {
    if (window.currentMode === 'multiplayer') return;

    if (!isTyping) return;
    if (['F5', 'F11', 'Tab', 'Alt', 'Control', 'CapsLock'].includes(e.key)) return;
    scrollToGameView(); 

    // BACKSPACE
    if (e.key === 'Backspace') {
        if (currentMode === 'bengali') {
            if (sequenceIndex > 0) {
                sequenceIndex--;
                const prev = gameSequence[sequenceIndex];
                const chars = document.getElementById('quoteDisplay').querySelectorAll('span');
                let start = prev.startIndex !== undefined ? prev.startIndex : prev.charIndex;
                for (let k = start; k <= prev.charIndex; k++) {
                      if(chars[k]) chars[k].classList.remove('correct', 'incorrect', 'partially-correct', 'current');
                }
                if (chars[prev.charIndex]) chars[prev.charIndex].classList.add('current');
                if (sessionTotalCorrect > 0) sessionTotalCorrect--; 
                if(sequenceIndex + 1 < gameSequence.length) {
                    const curr = gameSequence[sequenceIndex + 1];
                    if(chars[curr.charIndex]) chars[curr.charIndex].classList.remove('current');
                }
                highlightChar(prev.charIndex);
                updateFingerGuide(prev.code, prev.shift, true);
            }
        } else {
            if (charIndex > 0) {
                charIndex--;
                const chars = document.getElementById('quoteDisplay').querySelectorAll('span');
                chars[charIndex].classList.remove('correct', 'incorrect', 'current');
                if (sessionTotalCorrect > 0) sessionTotalCorrect--;
                if(chars[charIndex+1]) chars[charIndex+1].classList.remove('current');
                chars[charIndex].classList.add('current');
                const prevChar = chars[charIndex].innerText;
                const prevKey = getKeyFromChar(prevChar);
                updateFingerGuide(prevKey.code, prevKey.shift, true);
            }
        }
        updateStats();
        return;
    }

    if (e.key === 'Shift') return;

    // BENGALI TYPING
    if (currentMode === 'bengali') {
        e.preventDefault(); 
        if (sequenceIndex >= gameSequence.length) { triggerSuccessAndNext(); return; }
        const target = gameSequence[sequenceIndex];
        const chars = document.getElementById('quoteDisplay').querySelectorAll('span');
        let start = target.startIndex !== undefined ? target.startIndex : target.charIndex;
        let end = target.charIndex;

        if (e.code === target.code && e.shiftKey === target.shift) {
            if(window.triggerGlobalEffects) window.triggerGlobalEffects(true);
            sessionTotalCorrect++; 
            let isFullCharComplete = true;
            if (sequenceIndex + 1 < gameSequence.length) {
                if (gameSequence[sequenceIndex + 1].charIndex === target.charIndex) { isFullCharComplete = false; }
            }
            if (isFullCharComplete) {
                for (let k = start; k <= end; k++) { if(chars[k]) { chars[k].classList.remove('current', 'incorrect', 'partially-correct'); chars[k].classList.add('correct'); } }
            } else {
                for (let k = start; k <= end; k++) { if(chars[k]) { chars[k].classList.remove('current', 'incorrect'); chars[k].classList.add('partially-correct'); } }
            }
        } else {
            if(window.triggerGlobalEffects) window.triggerGlobalEffects(false);
            sessionTotalErrors++; 
            for (let k = start; k <= end; k++) { if(chars[k]) { chars[k].classList.remove('current', 'partially-correct'); chars[k].classList.add('incorrect'); } }
            const expectedKeyChar = target.code.replace(/^Key|^Digit/, '').toLowerCase();
            window.keyMistakes = window.keyMistakes || {};
            window.keyMistakes[expectedKeyChar] = (window.keyMistakes[expectedKeyChar] || 0) + 1;
        }
        sequenceIndex++;
        if (sequenceIndex >= gameSequence.length) { setTimeout(triggerSuccessAndNext, 100); } 
        else {
            const next = gameSequence[sequenceIndex];
            if (next.charIndex !== target.charIndex) { highlightChar(next.charIndex); }
            updateFingerGuide(next.code, next.shift, true);
        }
    }
    updateStats();
});

document.getElementById('inputField').addEventListener('input', (e) => {
    if (window.currentMode === 'multiplayer') return;

    if (!isTyping || currentMode === 'bengali') return;
    scrollToGameView();
    const chars = document.getElementById('quoteDisplay').querySelectorAll('span');
    const val = e.target.value;
    
    if (val.length > charIndex) {
        const typed = val[val.length - 1];
        if (typed === chars[charIndex].innerText) {
            chars[charIndex].classList.add('correct'); sessionTotalCorrect++; 
        } else {
            chars[charIndex].classList.add('incorrect'); sessionTotalErrors++; 
            const expectedChar = chars[charIndex].innerText.toLowerCase();
            window.keyMistakes = window.keyMistakes || {};
            window.keyMistakes[expectedChar] = (window.keyMistakes[expectedChar] || 0) + 1;
        }
        chars[charIndex].classList.remove('current');
        charIndex++;
        if (charIndex < chars.length) {
            chars[charIndex].classList.add('current');
            const nextKey = getKeyFromChar(chars[charIndex].innerText);
            updateFingerGuide(nextKey.code, nextKey.shift, true);
            const display = document.getElementById('quoteDisplay');
            const prevSpan = chars[charIndex - 1];
            const currSpan = chars[charIndex];
            if (prevSpan && currSpan && currSpan.offsetTop > prevSpan.offsetTop) {
                display.style.top = `-${currSpan.offsetTop}px`;
            }
        } else { triggerSuccessAndNext(); }
    }
    updateStats();
});

function triggerSuccessAndNext() {
    const typingBox = document.querySelector('.typing-section');
    const input = document.getElementById('inputField');
    input.disabled = true;
    const hasError = document.querySelector('#quoteDisplay span.incorrect') !== null;
    if (hasError) { playSound('timeout'); typingBox.classList.add('shake-box-yellow'); } 
    else { playSound('success'); typingBox.classList.add('shake-box-green'); }
    setTimeout(() => {
        typingBox.classList.remove('shake-box-green', 'shake-box-yellow');
        input.disabled = false; input.focus();
        prepareNextSentence();
    }, 500);
}

function prepareNextSentence() {
    sessionSentencesCompleted++;
    if (isCustomSource || currentMode === 'custom') { finishSession(); return; }
    if (sessionSentencesCompleted >= SESSION_LIMIT) { finishSession(); } 
    else { loadNextParagraph(); }
}

function loadNextParagraph() {
    loadRandomText(); gameSequence = []; sequenceIndex = 0; charIndex = 0;
    setupTestUI(true); scrollToGameView();
}

function finishSession() {
    clearInterval(timer); isTyping = false;
    document.getElementById('inputField').disabled = true;
    if (typeof stopGhost === 'function') stopGhost();
    
    const lvl = document.getElementById('levelSelector').value;
    const timeSec = sessionTotalTimeElapsed > 0 ? sessionTotalTimeElapsed : 1;
    const timeInMinutes = timeSec / 60;
    let finalWPM = Math.round((sessionTotalCorrect / 5) / timeInMinutes);
    if (isNaN(finalWPM) || finalWPM < 0) finalWPM = 0;
    const totalTyped = sessionTotalCorrect + sessionTotalErrors;
    const accuracy = totalTyped > 0 ? Math.round((sessionTotalCorrect / totalTyped) * 100) : 0;

    // 🔥 FIX: এখন WPM এর বদলে Total Characters ডাটাবেসে যাবে
    if (typeof incrementUsage === 'function') {
        incrementUsage(totalTyped, currentMode);
        console.log(`📊 Usage Update Sent: ${totalTyped} characters`);
    }

    // 🔥🔥 WEEKLY STATS UPDATE (REAL DATA) 🔥🔥
    if (typeof window.updateWeeklyStats === 'function') {
        window.updateWeeklyStats(totalTyped, finalWPM || 0, sessionTotalErrors);
    }

    if (typeof openResultModal === 'function') {
        openResultModal(finalWPM, accuracy, sessionTotalErrors, sessionTotalTimeElapsed, currentMode, lvl);
    } else {
        document.getElementById('startBtn').style.display = 'flex';
        alert(`Score: ${finalWPM} WPM\nAccuracy: ${accuracy}%`);
    }
}

function updateTimer() {
    sessionTotalTimeElapsed++; 
    if (isCountUpMode) { timeLeft++; if(sb.time) sb.time.innerText = timeLeft; } 
    else {
        if (timeLeft > 0) { timeLeft--; if(sb.time) sb.time.innerText = timeLeft; updateProgressBar(); } 
        else { clearInterval(timer); triggerShakeAndNext(); }
    }
    updateStats();
}

function updateProgressBar() {
    const bar = document.getElementById('timerProgressBar');
    if (!bar) return;
    if (isCountUpMode) { bar.style.width = '100%'; } 
    else {
        const percentage = (timeLeft / sentenceTimeLimit) * 100;
        bar.style.width = `${percentage}%`;
        if(percentage < 30) bar.style.background = 'linear-gradient(90deg, #ff4757, #ff6b81)';
        else bar.style.background = 'linear-gradient(90deg, #4361ee, #4cc9f0)';
    }
}

function triggerShakeAndNext() {
    playSound('timeout');
    const typingBox = document.querySelector('.typing-section');
    typingBox.classList.add('shake-box-red'); 
    const input = document.getElementById('inputField');
    input.disabled = true;
    setTimeout(() => {
        typingBox.classList.remove('shake-box-red'); input.disabled = false; input.focus(); prepareNextSentence(); 
    }, 500);
}

function updateStats() {
    const lvl = document.getElementById('levelSelector').value;
    let wpm = 0;
    if (lvl === 'hard') {
        const timeInMinutes = sessionTotalTimeElapsed / 60 || 1/60;
        wpm = Math.round((sessionTotalCorrect / 5) / timeInMinutes);
        if (wpm < 0) wpm = 0;
        if(sb.wpm) sb.wpm.innerText = wpm;
    } else {
        wpm = sessionSentencesCompleted;
        if(sb.wpm) sb.wpm.innerText = wpm;
    }
    const totalTyped = sessionTotalCorrect + sessionTotalErrors;
    const acc = totalTyped > 0 ? Math.round((sessionTotalCorrect / totalTyped) * 100) : 100;
    currentWPM = wpm;
    if(sb.accuracy) sb.accuracy.innerText = acc + '%';
    if(sb.errors) sb.errors.innerText = sessionTotalErrors;
    updateSidebarStats({ wpm: wpm, accuracy: acc, errors: sessionTotalErrors, time: timeLeft });

    if (window.currentMode === 'multiplayer' && typeof window.syncMultiplayerProgress === 'function') {
        const progress = Math.min(100, Math.floor((charIndex / currentText.length) * 100));
        const accuracy = totalTyped > 0 ? Math.round((sessionTotalCorrect / totalTyped) * 100) : 100;
        window.syncMultiplayerProgress(currentWPM, progress, sessionTotalErrors, accuracy);
    }
}

function resetTest(fullReset = false) {
    if (typeof stopGhost === 'function') stopGhost(); 

    clearInterval(timer); isTyping = false; currentText = ""; 
    
    if (fullReset) {
        sessionSentencesCompleted = 0; sessionTotalCorrect = 0; sessionTotalErrors = 0; sessionTotalTimeElapsed = 0; window.keyMistakes = {};
        if(sb.wpm) sb.wpm.innerText = '0'; if(sb.errors) sb.errors.innerText = '0'; if(sb.accuracy) sb.accuracy.innerText = '100%';
    }
    document.getElementById('quoteDisplay').innerHTML = '';
    document.getElementById('inputField').value = '';
    document.getElementById('startBtn').style.display = 'flex';
    document.getElementById('resetBtn').style.display = 'none';
    document.getElementById('certBtn').style.display = 'none';
    
    const bar = document.getElementById('timerProgressBar');
    if(bar) bar.style.width = '100%'; 
    
    startTest(true); 
    if(typeof scrollToTopView === 'function') scrollToTopView(); 
}

/* ==========================================
   🛠 SYSTEM STATUS & FEATURE RANDOMIZER
   ========================================== */
document.addEventListener('click', (e) => {
    const popup = document.getElementById('creatorPopup');
    const fab = document.getElementById('contactFab');
    if(popup && popup.classList.contains('show') && !popup.contains(e.target) && !fab.contains(e.target)) { popup.classList.remove('show'); }
    if (isTyping && !e.target.closest('button') && !e.target.closest('select') && !e.target.closest('textarea') && !e.target.closest('.modal-content') && !e.target.closest('.messenger-popup')) {
        const input = document.getElementById('inputField');
        if(input && !input.disabled) input.focus();
    }
    const guideModal = document.getElementById('guideModal');
    const warningModal = document.getElementById('warningModal');
    if (e.target === guideModal || e.target === warningModal) closeModal();
});

window.addEventListener('click', function(e) {
    if (!e.target.closest('.reset-dropdown-wrapper')) {
        const menu = document.getElementById('resetDropdown');
        if (menu && menu.classList.contains('show-reset-menu')) menu.classList.remove('show-reset-menu');
    }
});

/* ==========================================
   🔥 ULTIMATE AI TYPING ANALYST
   ========================================== */
const fingerMapDb = {
    'q': 'Left Pinky', 'a': 'Left Pinky', 'z': 'Left Pinky', '1': 'Left Pinky',
    'w': 'Left Ring', 's': 'Left Ring', 'x': 'Left Ring', '2': 'Left Ring',
    'e': 'Left Middle', 'd': 'Left Middle', 'c': 'Left Middle', '3': 'Left Middle',
    'r': 'Left Index', 'f': 'Left Index', 'v': 'Left Index', '4': 'Left Index', '5': 'Left Index', 't': 'Left Index', 'g': 'Left Index', 'b': 'Left Index',
    'y': 'Right Index', 'h': 'Right Index', 'n': 'Right Index', '6': 'Right Index', '7': 'Right Index', 'u': 'Right Index', 'j': 'Right Index', 'm': 'Right Index',
    'i': 'Right Middle', 'k': 'Right Middle', '8': 'Right Middle', ',': 'Right Middle',
    'o': 'Right Ring', 'l': 'Right Ring', '9': 'Right Ring', '.': 'Right Ring',
    'p': 'Right Pinky', '0': 'Right Pinky', ';': 'Right Pinky', '/': 'Right Pinky', '[': 'Right Pinky', ']': 'Right Pinky', "'": 'Right Pinky'
};

let lastRankIndex = -1;

function updateTypingProfile() {
    const badgesContainer = document.getElementById("typingBadges");
    const summaryEl = document.getElementById("typingSummary");
    
    if (!badgesContainer || !summaryEl) return;

    if (!isTyping && sessionSentencesCompleted === 0) {
        lastRankIndex = -1; 
        badgesContainer.innerHTML = `<span class="rank-badge rank-neutral"><i class="fas fa-robot"></i> AI Analysis Ready</span>`;
        summaryEl.innerHTML = "টাইপিং শুরু করুন। আমি আপনার প্রতিটি আঙুলের মুভমেন্ট ট্র্যাক করছি...";
        return;
    }

    const wpm = currentWPM || 0;
    const total = sessionTotalCorrect + sessionTotalErrors;
    const acc = total > 0 ? Math.round((sessionTotalCorrect / total) * 100) : 100;
    const errors = sessionTotalErrors;

    let weakFingerName = "";
    let maxMistakes = 0;
    let problematicKeys = [];

    if (window.keyMistakes) {
        let fingerCounts = {};
        for (let keyChar in window.keyMistakes) {
            let count = window.keyMistakes[keyChar];
            let finger = (typeof fingerMapDb !== 'undefined' && fingerMapDb[keyChar.toLowerCase()]) ? fingerMapDb[keyChar.toLowerCase()] : "Unknown";
            
            if (finger !== "Unknown") {
                fingerCounts[finger] = (fingerCounts[finger] || 0) + count;
                if (fingerCounts[finger] > maxMistakes) {
                    maxMistakes = fingerCounts[finger];
                    weakFingerName = finger;
                }
            }
            if (count > 1) problematicKeys.push(keyChar.toUpperCase());
        }
    }

    let rankTitle = "";
    let rankClass = "";
    let rankIcon = "";
    let currentRankIndex = 0; 

    if (wpm < 10) { currentRankIndex = 0; rankTitle = "Snail Pace"; rankClass = "rank-beginner"; rankIcon = "fa-scroll"; }
    else if (wpm < 20) { currentRankIndex = 1; rankTitle = "Turtle Power"; rankClass = "rank-beginner"; rankIcon = "fa-otter"; }
    else if (wpm < 30) { currentRankIndex = 2; rankTitle = "Steady Walker"; rankClass = "rank-rookie"; rankIcon = "fa-person-walking"; }
    else if (wpm < 40) { currentRankIndex = 3; rankTitle = "Amateur Runner"; rankClass = "rank-rookie"; rankIcon = "fa-person-running"; }
    else if (wpm < 50) { currentRankIndex = 4; rankTitle = "Pro Racer"; rankClass = "rank-pro"; rankIcon = "fa-car"; }
    else if (wpm < 60) { currentRankIndex = 5; rankTitle = "Speedster"; rankClass = "rank-pro"; rankIcon = "fa-bolt"; }
    else if (wpm < 70) { currentRankIndex = 6; rankTitle = "Storm Breaker"; rankClass = "rank-master"; rankIcon = "fa-wind"; }
    else if (wpm < 80) { currentRankIndex = 7; rankTitle = "Keyboard Ninja"; rankClass = "rank-master"; rankIcon = "fa-user-ninja"; }
    else if (wpm < 90) { currentRankIndex = 8; rankTitle = "Rocket Fingers"; rankClass = "rank-god"; rankIcon = "fa-rocket"; }
    else if (wpm < 100) { currentRankIndex = 9; rankTitle = "Cyber Machine"; rankClass = "rank-god"; rankIcon = "fa-robot"; }
    else { currentRankIndex = 10; rankTitle = "Alien God"; rankClass = "rank-god"; rankIcon = "fa-reddit-alien"; }

    let animClass = "";
    if (lastRankIndex !== -1) {
        if (currentRankIndex > lastRankIndex) {
            animClass = "rank-up"; // Pop Effect
            if(typeof playSound === 'function') playSound('success'); 
        } else if (currentRankIndex < lastRankIndex) {
            animClass = "rank-down"; // Shake Effect
        }
    }
    lastRankIndex = currentRankIndex; 

    let suggestion = "";
    let feedbackClass = "";

    if (acc < 85) {
        feedbackClass = "acc-warning";
        if (weakFingerName) {
            suggestion = `⚠️ <b>সাবধান!</b> আপনার <b>${weakFingerName}</b> আঙুলটি দুর্বল। এটি দিয়ে টাইপ করার সময় তাড়াহুড়ো করবেন না। স্পিড কমান।`;
        } else {
            suggestion = `⚠️ <b>অনেক ভুল হচ্ছে!</b> (${errors} টি)। গতি কমান এবং প্রতিটি অক্ষর নিশ্চিত হয়ে চাপুন। অ্যাকুরেসি আগে, গতি পরে।`;
        }
    } 
    else if (acc >= 85 && acc < 95) {
        feedbackClass = "";
        if (problematicKeys.length > 0) {
            let keysStr = problematicKeys.slice(0, 3).join(", ");
            suggestion = `💡 <b>পরামর্শ:</b> আপনি <b>'${keysStr}'</b> কি-গুলোতে বারবার ভুল করছেন। এই অক্ষরগুলো টাইপ করার সময় একটু সতর্ক থাকুন।`;
        } else {
            suggestion = `📊 <b>চলছে...</b> গতি ঠিক আছে, তবে নির্ভুলতার দিকে আরেকটু নজর দিন। কনসিস্টেন্সি বজায় রাখুন।`;
        }
    }
    else if (acc >= 95) {
        feedbackClass = "";
        if (wpm < 30) {
            suggestion = `🎯 <b>চমৎকার অ্যাকুরেসি!</b> আপনার হাত এখন সেট হয়ে গেছে। এবার একটু একটু করে আঙুলের গতি বাড়ানোর চেষ্টা করুন।`;
        } else if (wpm > 60) {
            suggestion = `🔥 <b>অসাধারন!</b> আপনি গতি এবং নির্ভুলতা দুটোরই দারুণ ব্যালেন্স করেছেন। এই রিদম ধরে রাখুন!`;
        } else {
            suggestion = `✅ <b>খুব ভালো!</b> ভুল করছেন না বললেই চলে। এখন ফোকাস করুন পরবর্তী শব্দের দিকে তাকানোর উপর।`;
        }
    }

    let badgesHtml = `<span class="rank-badge ${rankClass} ${animClass}"><i class="fas ${rankIcon}"></i> ${rankTitle}</span>`;
    
    if (weakFingerName && errors > 2) {
        badgesHtml += `<span class="rank-badge acc-warning" style="border:1px solid #ff7675"><i class="fas fa-hand-paper"></i> Fix: ${weakFingerName}</span>`;
    }
    if (acc === 100 && total > 10) {
        badgesHtml += `<span class="rank-badge rank-gold"><i class="fas fa-gem"></i> Flawless</span>`;
    }

    badgesContainer.innerHTML = badgesHtml;
    summaryEl.className = feedbackClass;
    summaryEl.innerHTML = suggestion;
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof updateSidebarAccess === 'function') {
            updateSidebarAccess();
        }
    }, 300);
});

/* =========================================
   🎵 SIDEBAR MANAGER (FREE vs PRO)
   ========================================= */

// ১. প্রো স্ট্যাটাস চেক করে UI আপডেট করা
window.updateSidebarLayout = function(isProUser) {
    const body = document.body;
    
    if (isProUser) {
        console.log("💎 Pro Mode Activated");
        body.classList.add('pro-active'); 
    } else {
        console.log("👤 Free Mode Activated");
        body.classList.remove('pro-active'); 
    }
};

// ২. মিউজিক প্লেয়ার লজিক
const audio = document.getElementById('bgAudio');
let isPlaying = false;

window.togglePlay = function() {
    const btn = document.getElementById('playPauseBtn');
    if(!audio || !btn) return;

    if (isPlaying) {
        audio.pause();
        btn.innerHTML = '<i class="fas fa-play"></i>';
    } else {
        audio.play();
        btn.innerHTML = '<i class="fas fa-pause"></i>';
    }
    isPlaying = !isPlaying;
};

window.nextTrack = function() {
    alert("Next track loading...");
};

window.prevTrack = function() {
    alert("Previous track loading...");
};

/* =========================================
   🔒 SECURE PRO FEATURE GUARD (GOLDEN)
   ========================================= */

// পপআপ বন্ধ করার ফাংশন
window.closeProLock = function() {
    const modal = document.getElementById('proLockModal');
    if(modal) modal.style.display = 'none';
}

// মেইন চেকিং ফাংশন
window.checkProFeature = function(featureName) {
    // ১. প্রথমে চেক করো ইউজার অ্যাডমিন বা প্রো কিনা
    if (window.IS_PRO_USER === true || window.IS_ADMIN === true) {
        return true; // ✅ সব ঠিক আছে, এক্সেস দাও
    } 
    
    // ২. যদি প্রো না হয়, তাহলে গোল্ডেন পপআপ দেখাও
    const modal = document.getElementById('proLockModal');
    const msg = document.getElementById('lockMsg');
    
    if(modal && msg) {
        msg.innerHTML = `The <b>'${featureName}'</b> feature is locked.<br>Upgrade to PRO to unlock limitlessness.`;
        modal.style.display = 'flex'; // পপআপ শো
    }
    
    // ৩. ❌ মিথ্যা রিটার্ন করো যাতে মূল ফাংশন কাজ না করে
    return false; 
}