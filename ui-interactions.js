// ui-interactions.js - UI, Charts & Visuals (FIXED CONFLICTS)

// Sidebar References
const sb = {
    wpm: document.getElementById("wpm"),
    accuracy: document.getElementById("accuracy"),
    errors: document.getElementById("errors"),
    time: document.getElementById("time") || document.getElementById("timeLeft"), 
    wrongKey: document.getElementById("wrongKey"),
    weakFinger: document.getElementById("weakFinger")
};

// ==========================================
// 🕒 REALTIME FLOATING TIMER LOGIC
// ==========================================
let limitTimerInterval = null;

function initFloatingTimer() {
    let floatBar = document.getElementById('limitFloatingBar');
    if (!floatBar) {
        floatBar = document.createElement('div');
        floatBar.id = 'limitFloatingBar';
        
        floatBar.innerHTML = `
            <div class="limit-content-wrapper" id="limitContent">
                </div>
            <button class="limit-toggle-btn" id="limitToggleBtn" title="Hide/Show">
                <i class="fas fa-chevron-up"></i>
            </button>
        `;
        document.body.appendChild(floatBar);

        const toggleBtn = document.getElementById('limitToggleBtn');
        toggleBtn.onclick = () => {
            floatBar.classList.toggle('minimized');
            const icon = toggleBtn.querySelector('i');
            if (floatBar.classList.contains('minimized')) {
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
                toggleBtn.title = "Show Timer";
            } else {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
                toggleBtn.title = "Hide Timer";
            }
        };
    }

    if (!limitTimerInterval) {
        limitTimerInterval = setInterval(updateLimitTimeUI, 1000);
    }
    updateLimitTimeUI();
}

function updateLimitTimeUI() {
    const floatBar = document.getElementById('limitFloatingBar');
    const contentDiv = document.getElementById('limitContent');
    
    if (!floatBar || !contentDiv) return;

    const locks = window.USER_LOCKS || { banglaUntil: 0, englishUntil: 0 };
    const now = Date.now();
    let hasActiveLock = false;
    let html = '';

    if (locks.englishUntil > now) {
        hasActiveLock = true;
        const diff = locks.englishUntil - now;
        html += `
            <div class="limit-timer-item">
                <small>English Wait</small>
                <span>${msToTime(diff)}</span>
            </div>
        `;
    }

    if (locks.englishUntil > now && locks.banglaUntil > now) {
        html += `<div class="limit-divider"></div>`;
    }

    if (locks.banglaUntil > now) {
        hasActiveLock = true;
        const diff = locks.banglaUntil - now;
        html += `
            <div class="limit-timer-item">
                <small>Bangla Wait</small>
                <span>${msToTime(diff)}</span>
            </div>
        `;
    }

    if (hasActiveLock) {
        contentDiv.innerHTML = html;
        floatBar.classList.add('visible');
    } else {
        floatBar.classList.remove('visible');
    }
}

function msToTime(duration) {
    let seconds = Math.floor((duration / 1000) % 60);
    let minutes = Math.floor((duration / (1000 * 60)) % 60);
    let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return hours + ":" + minutes + ":" + seconds;
}


// --- TAB SWITCHING (With Confirm Box for PRO) ---
function switchTab(mode) {
    if (window.USER_ROLE === 'free') {
        const usage = window.USER_USAGE || { banglaWords: 0, englishWords: 0 };
        const locks = window.USER_LOCKS || { banglaUntil: 0, englishUntil: 0 };
        const now = Date.now();
        
        if (mode === 'bengali') {
            if (locks.banglaUntil > now) {
                alert("⚠️ বাংলা লিমিট লকড!\n\nখুলবে: " + msToTime(locks.banglaUntil - now));
                return;
            }
            if (usage.banglaWords >= 200) {
                const goPro = confirm("⚠️ আজকের বাংলা লিমিট (২০০ অক্ষর) শেষ!\n\nআনলক করতে PRO ভার্সন কিনুন। আপনি কি PRO পেজে যেতে চান?");
                if (goPro) window.open('pro.html', '_blank');
                return;
            }
        }

        if (mode === 'custom') {
            if (locks.englishUntil > now) {
                alert("⚠️ কাস্টম মোড লকড!\n\nখুলবে: " + msToTime(locks.englishUntil - now));
                return;
            }
            if (usage.englishWords >= 300) {
                const goPro = confirm("⚠️ কাস্টম মোড লকড! ইংরেজি লিমিট শেষ।\n\nআনলক করতে PRO ভার্সন কিনুন। আপনি কি PRO পেজে যেতে চান?");
                if (goPro) window.open('pro.html', '_blank');
                return; 
            }
        }
    }

    if (typeof stopGhost === 'function') stopGhost();
    currentMode = mode;
    currentText = ""; 
    isCustomSource = false;
    isTyping = false;
    if(timer) clearInterval(timer);
    
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    buttons.forEach(btn => {
        if (btn.getAttribute('onclick').includes(mode)) btn.classList.add('active');
    });
    
    const gameSettings = document.getElementById('gameSettings');
    const customArea = document.getElementById('customInputArea');
    const display = document.getElementById('quoteDisplay');
    const timeSelector = document.getElementById('timeSelector'); 
    
    if (mode === 'custom') {
        gameSettings.style.display = 'none';
        customArea.style.display = 'block';
        document.body.classList.remove('coding-mode');
        display.innerHTML = ''; 
        document.getElementById('guideText').innerHTML = "প্রস্তুত...";
        document.querySelectorAll('.key').forEach(k => k.classList.remove('key-glow'));
        updateKeyboardLabels('normal'); 
    } else {
        gameSettings.style.display = 'flex';
        customArea.style.display = 'none';
        if(timeSelector) timeSelector.style.display = 'none';
        
        if(mode === 'coding') document.body.classList.add('coding-mode');
        else document.body.classList.remove('coding-mode');
        updateKeyboardLabels(mode);
        resetTest(true); 
    }

    if(typeof window.updateSidebarAccess === 'function') {
        window.updateSidebarAccess();
    }
}

function updateCustomKeyboardPreview(mode) {
    updateKeyboardLabels(mode);
    if(mode === 'coding') document.body.classList.add('coding-mode');
    else document.body.classList.remove('coding-mode');
}

function startCustomTest() { 
    const textVal = document.getElementById('customTextSrc').value.trim();
    if(!textVal) return alert("অনুগ্রহ করে বক্সে কিছু টেক্সট লিখুন!");

    const selectedMode = document.getElementById('customModeSelector').value;
    const hasBanglaChar = /[\u0980-\u09FF]/.test(textVal);
    const hasEnglishChar = /[a-zA-Z]/.test(textVal);

    if (selectedMode === 'bengali' && !hasBanglaChar && hasEnglishChar) {
        return alert("⚠️ এরর: বাংলা মোডে ইংরেজি টেক্সট!");
    }
    if (selectedMode === 'normal' && hasBanglaChar) {
        return alert("⚠️ এরর: ইংলিশ মোডে বাংলা টেক্সট!");
    }

    sentenceTimeLimit = parseInt(document.getElementById('customTimeSelector').value);
    isCountUpMode = false;
    
    currentText = textVal;
    currentMode = selectedMode; 
    isCustomSource = true;      

    document.getElementById('customInputArea').style.display = 'none';
    
    updateKeyboardLabels(selectedMode);
    if(selectedMode === 'coding') document.body.classList.add('coding-mode');
    
    sessionSentencesCompleted = 0; 
    setupTestUI(true); 
    scrollToGameView();
}

function renderText(text) {
    const display = document.getElementById('quoteDisplay');
    display.innerHTML = '';
    display.style.top = '0px'; 
    document.querySelector('.typing-section').classList.remove('shake-box-red', 'shake-box-green');

    display.classList.remove('txt-small', 'txt-medium', 'txt-large');
    if (text.length < 50) display.classList.add('txt-large');
    else if (text.length < 150) display.classList.add('txt-medium');
    else display.classList.add('txt-small');

    text.split('').forEach(char => {
        const span = document.createElement('span');
        span.innerText = char;
        display.appendChild(span);
    });
}

function highlightChar(index) {
    const chars = document.querySelectorAll('#quoteDisplay span');
    chars.forEach(c => c.classList.remove('current'));
    
    if(chars[index]) {
        chars[index].classList.add('current');
        const display = document.getElementById('quoteDisplay');
        const prev = chars[index - 1];
        if (prev && chars[index].offsetTop > prev.offsetTop) {
            display.style.top = `-${chars[index].offsetTop}px`;
        }
    }
}

function updateFingerGuide(keyCode, shift, isActive = true) {
    const guideText = document.getElementById('guideText');
    document.querySelectorAll('.mini-finger').forEach(el => el.classList.remove('active-finger-svg'));
    document.querySelectorAll('.key').forEach(k => k.classList.remove('key-glow'));

    let engKeyName = keyCode.replace('Key','').replace('Digit','');
    const niceNames = {
        'Semicolon': ';', 'Quote': "'", 'Comma': ',', 'Period': '.', 'Slash': '/', 
        'BracketLeft': '[', 'BracketRight': ']', 'Backslash': '\\', 'Space': 'Space',
        'Minus': '-', 'Equal': '=', 'Backquote': '`'
    };
    if(niceNames[keyCode]) engKeyName = niceNames[keyCode];
    let instruction = shift ? `Shift + ${engKeyName}` : engKeyName;
    
    if (isActive) {
        const mainKeyEl = document.querySelector(`.key[data-key="${keyCode}"]`);
        if(mainKeyEl) mainKeyEl.classList.add('key-glow');
    }

    let info = keyInfoMap[keyCode];
    if (info) {
        if (isActive) {
            let svgId = `svg-${info.hand}-${info.digit}`;
            let el = document.getElementById(svgId);
            if(el) el.classList.add('active-finger-svg');
            
            if(shift) {
                let shiftHand = info.hand === 'r' ? 'l' : 'r';
                let shiftEl = document.getElementById(`svg-${shiftHand}-pinky`);
                if(shiftEl) shiftEl.classList.add('active-finger-svg');
                const shiftKeyCode = shiftHand === 'l' ? 'ShiftLeft' : 'ShiftRight';
                const shiftKeyEl = document.querySelector(`.key[data-key="${shiftKeyCode}"]`);
                if(shiftKeyEl) shiftKeyEl.classList.add('key-glow');
            }
        }
    }
    guideText.innerHTML = `চাপুন: <b style="color: #e84118; font-size: 1.4rem;">${instruction}</b>`;
}

// 🔥 FIX: REMOVED CONFLICTING toggleTheme() FUNCTION FROM HERE
// The toggleTheme() function in settings-manager.js will now be used automatically.

function updateKeyboardLabels(mode) {
    const keys = document.querySelectorAll('.key');
    keys.forEach(key => {
        const code = key.getAttribute('data-key');
        if (!code) return;
        let defaultChar = code.replace('Key', '').replace('Digit', '');
        const map = {'Backquote':'`', 'Minus':'-', 'Equal':'=', 'Semicolon':';', 'Quote':"'", 'Comma':',', 'Period':'.', 'Slash':'/', 'BracketLeft':'[', 'BracketRight':']', 'Backslash':'\\'};
        if(map[code]) defaultChar = map[code];

        if (mode === 'bengali') {
            if (bengaliKeys[code]) {
                key.innerHTML = `<span class="key-eng">${defaultChar}</span><span class="key-ban-shift">${bengaliKeys[code].s}</span><span class="key-ban-norm">${bengaliKeys[code].n}</span>`;
            } else if(!['Tab','Caps','Shift','Enter','Space','Backspace'].some(x => key.innerText.includes(x))) {
                key.innerHTML = `<span class="key-eng" style="top:50%;left:50%;transform:translate(-50%,-50%)">${defaultChar}</span>`;
            }
        } else {
            key.innerHTML = defaultChar;
            if(code.includes('Shift')) key.innerText = 'Shift';
            else if(code === 'Backspace') key.innerText = '⌫';
            else if(code === 'CapsLock') key.innerText = 'Caps';
            else if(code === 'Enter') key.innerText = 'Enter';
            else if(code === 'Space') key.innerText = 'Space';
            else if(code === 'Tab') key.innerText = 'Tab';
        }
    });
}

function changeLevel() { resetTest(true); }
function changeTime() { resetTest(true); }

function downloadCertificate() {
    const canvas = document.getElementById('certCanvas');
    const ctx = canvas.getContext('2d');
    const wpm = document.getElementById('wpm').innerText;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 15; ctx.strokeStyle = "#4361ee"; ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    ctx.fillStyle = "#333"; ctx.textAlign = "center";
    ctx.font = "bold 45px Arial"; ctx.fillText("Typing Master Certificate", canvas.width / 2, 120);
    ctx.font = "80px Arial"; ctx.fillStyle = "#4361ee"; ctx.fillText(`${wpm} WPM`, canvas.width / 2, 320);
    const link = document.createElement('a'); link.download = 'certificate.png'; link.href = canvas.toDataURL(); link.click();
}

// Modals & Popups
function openModal() { document.getElementById('guideModal').style.display = 'flex'; showSlides(slideIndex); }
function closeModal() { 
    document.getElementById('guideModal').style.display = 'none';
    document.getElementById('warningModal').style.display = 'none';
    document.getElementById('inputField').focus();
}

function toggleFullScreen() {
    if (currentMode === 'custom') {
        const customTextVal = document.getElementById('customTextSrc').value.trim();
        if (!isTyping && customTextVal === "") {
            alert("ফুল স্ক্রিন মোড অন করার আগে দয়া করে বক্সে কিছু টেক্সট লিখুন!");
            return;
        }
    }
    if (!document.fullscreenElement) {
        document.body.classList.add('focus-mode');
        isFocusMode = true;
        document.documentElement.requestFullscreen().catch(err => console.log(err));
        setTimeout(() => document.getElementById('inputField').focus(), 100);
    } else {
        document.exitFullscreen();
    }
}
document.addEventListener('fullscreenchange', () => {
    if(!document.fullscreenElement) {
        document.body.classList.remove('focus-mode');
        isFocusMode = false;
    }
});

// Slider Logic
let slideIndex = 1;
function changeSlide(n) { showSlides(slideIndex += n); }
function showSlides(n) {
    let i;
    let slides = document.getElementsByClassName("slide");
    if (n > slides.length) {slideIndex = 1}     
    if (n < 1) {slideIndex = slides.length}
    for (i = 0; i < slides.length; i++) { slides[i].style.display = "none"; }
    if(slides[slideIndex-1]) slides[slideIndex-1].style.display = "block";  
}

function toggleResetMenu() { document.getElementById('resetDropdown').classList.toggle('show-reset-menu'); }
function softReset() { location.reload(); }
function hardReset() {
    const confirmAction = confirm("আপনি কি নিশ্চিত আপনি 'হার্ড রিসেট' করতে চান?\n\nএতে আপনার সব সেটিংস, থিম এবং হাইস্কোর মুছে যাবে এবং অ্যাপটি নতুনের মতো হয়ে যাবে।");
    if (confirmAction) { localStorage.clear(); location.reload(); }
}

function toggleContactPopup() {
    const popup = document.getElementById('creatorPopup');
    if(popup.classList.contains('show')) {
        popup.classList.remove('show');
    } else {
        popup.classList.add('show');
        if(typeof playSound === 'function') playSound('click');
    }
}

// Stats Update & Charts
function updateSidebarStats(stats) {
    if (sb.wpm) sb.wpm.textContent = stats.wpm || 0;
    if (sb.errors) sb.errors.textContent = stats.errors || 0;
    if (sb.time) sb.time.textContent = stats.time || 0;
    if (sb.accuracy) sb.accuracy.textContent = stats.accuracy + "%";

    if (window.keyMistakes && sb.wrongKey) {
        let worstKey = "-"; let max = 0;
        for (let k in window.keyMistakes) {
            if (window.keyMistakes[k] > max) { max = window.keyMistakes[k]; worstKey = k; }
        }
        sb.wrongKey.textContent = worstKey;
    }
    if (sb.weakFinger && window.keyMistakes) sb.weakFinger.textContent = detectWeakFinger();
}

function detectWeakFinger() {
    const fingerMap = {
        'q':'Left Pinky','a':'Left Pinky','z':'Left Pinky','w':'Left Ring','s':'Left Ring','x':'Left Ring',
        'e':'Left Middle','d':'Left Middle','c':'Left Middle','r':'Left Index','f':'Left Index','v':'Left Index','t':'Left Index','g':'Left Index','b':'Left Index',
        'y':'Right Index','h':'Right Index','n':'Right Index','u':'Right Index','j':'Right Index','m':'Right Index','i':'Right Middle','k':'Right Middle',
        'o':'Right Ring','l':'Right Ring','p':'Right Pinky'
    };
    let max = 0; let weak = "-";
    for (let key in window.keyMistakes) {
        if (window.keyMistakes[key] > max && fingerMap[key]) { max = window.keyMistakes[key]; weak = fingerMap[key]; }
    }
    return weak;
}

// Security UI
function togglePassVisibility() {
    const input = document.getElementById('accessPass');
    const icon = document.getElementById('passEye');
    if (input.type === "password") { input.type = "text"; icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); } 
    else { input.type = "password"; icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
}
function hideError() { document.getElementById('passError').innerText = ""; document.getElementById('requestAccessDiv').style.display = 'none'; }

// Pace Chart (Bottom Left)
const STORAGE_KEY = "goatTyping_paceHistory_v1";
const MAX_POINTS = 60;
function loadPaceHistory() { try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) return JSON.parse(saved); } catch {} return { wpm: [], accuracy: [], errors: [] }; }
function savePaceHistory(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
const paceHistory = loadPaceHistory();

function drawProgressLine(ctx, data, color, maxValue) {
  if (data.length < 2) return;
  const w = ctx.canvas.width; const h = ctx.canvas.height;
  const padLeft = 14; const padBottom = 12;
  const usableH = h * 0.7; const baseY = h - padBottom;
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.shadowBlur = 10; ctx.shadowColor = color;
  ctx.beginPath();
  data.forEach((val, i) => {
    const x = padLeft + (i / (MAX_POINTS - 1)) * (w - padLeft - 8);
    const n = Math.min(Math.max(val / maxValue, 0), 1);
    const targetY = baseY - n * usableH;
    if (!data._y) data._y = [];
    data._y[i] = data._y[i] ?? targetY;
    data._y[i] += (targetY - data._y[i]) * 0.15;
    if (i === 0) ctx.moveTo(x, data._y[i]); else ctx.lineTo(x, data._y[i]);
  });
  ctx.stroke(); ctx.shadowBlur = 0;
}

function renderPaceChart() {
  const canvas = document.getElementById("paceChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  for (let i = 0; i <= 6; i++) { const y = (i / 6) * canvas.height; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
  drawProgressLine(ctx, paceHistory.wpm, "#22c55e", 120);
  drawProgressLine(ctx, paceHistory.accuracy, "#38bdf8", 100);
  drawProgressLine(ctx, paceHistory.errors, "#ef4444", 20);
}
function animateChart() { renderPaceChart(); requestAnimationFrame(animateChart); }
animateChart();

setInterval(() => {
  if (typeof currentWPM !== "number") return;
  const total = sessionTotalCorrect + sessionTotalErrors;
  const acc = total > 0 ? Math.round((sessionTotalCorrect / total) * 100) : 100;
  paceHistory.wpm.push(currentWPM); paceHistory.accuracy.push(acc); paceHistory.errors.push(sessionTotalErrors);
  if (paceHistory.wpm.length > MAX_POINTS) { paceHistory.wpm.shift(); paceHistory.accuracy.shift(); paceHistory.errors.shift(); }
  savePaceHistory(paceHistory);
}, 500);

// Chart Tooltip
const tooltip = document.getElementById("chartTooltip");
const chartCanvas = document.getElementById("paceChart");
if(chartCanvas && tooltip) {
    tooltip.style.position = "absolute";
    chartCanvas.addEventListener("mousemove", e => {
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const index = Math.floor(((x - rect.width * 0.35) / (rect.width * 0.65)) * paceHistory.wpm.length);
      if (index >= 0 && index < paceHistory.wpm.length) {
        tooltip.style.display = "block";
        tooltip.style.left = e.pageX + 10 + "px";
        tooltip.style.top = e.pageY + 10 + "px";
        tooltip.innerHTML = `<strong>WPM:</strong> ${paceHistory.wpm[index]}<br><strong>Accuracy:</strong> ${paceHistory.accuracy[index]}%<br><strong>Errors:</strong> ${paceHistory.errors[index]}`;
      } else { tooltip.style.display = "none"; }
    });
    chartCanvas.addEventListener("mouseleave", () => { tooltip.style.display = "none"; });
}

// =========================================================
// 🔥 FINAL SMART SIDEBAR & MODE LOCK (TIME BASED 24H)
// =========================================================

window.updateSidebarAccess = function () {
    const sidebar = document.querySelector('.gt-sidebar');
    const aiBar = document.getElementById('profilePanel'); 
    const lockOverlay = document.getElementById('sidebarLock');
    const lockMsg = document.getElementById('lockMessage');
    const lockBtn = document.getElementById('lockActionBtn');

    const banglaTab = document.querySelector("button[onclick*='bengali']");
    const customTab = document.querySelector("button[onclick*='custom']");

    if (!sidebar || !lockOverlay) return;

    const blurAI = (shouldBlur) => {
        if (aiBar) {
            aiBar.style.filter = shouldBlur ? "blur(2.5px)" : "none";
            aiBar.style.pointerEvents = shouldBlur ? "none" : "auto";
            aiBar.style.opacity = shouldBlur ? "0.6" : "1";
        }
    };

    initFloatingTimer(); 

    const locks = window.USER_LOCKS || { banglaUntil: 0, englishUntil: 0 };
    const now = Date.now();

    if (window.USER_ROLE === 'guest') {
        sidebar.classList.add('locked');
        blurAI(true); 
        lockOverlay.classList.remove('hidden');
        if(lockMsg) lockMsg.innerHTML = "Sidebar আনলক করতে <br>লগিন করুন";
        if(lockBtn) {
            lockBtn.style.display = 'block';
            lockBtn.innerText = "Login";
            lockBtn.onclick = () => document.getElementById('login-btn')?.click();
        }
        
        if(banglaTab) { banglaTab.style.opacity = "0.5"; banglaTab.style.cursor = "not-allowed"; }
        if(customTab) { customTab.style.opacity = "0.5"; customTab.style.cursor = "not-allowed"; }
        return;
    }

    if (window.USER_ROLE === 'pro') {
        sidebar.classList.remove('locked');
        blurAI(false);
        lockOverlay.classList.add('hidden');
        if(banglaTab) { banglaTab.style.opacity = "1"; banglaTab.style.cursor = "pointer"; }
        if(customTab) { customTab.style.opacity = "1"; customTab.style.cursor = "pointer"; }
        return;
    }

    if (window.USER_ROLE === 'free') {
        const isEngLocked = locks.englishUntil > now;
        const isBanLocked = locks.banglaUntil > now;

        sidebar.classList.remove('locked');
        blurAI(false);
        lockOverlay.classList.add('hidden');
        if(banglaTab) { banglaTab.style.opacity = "1"; banglaTab.style.cursor = "pointer"; }
        if(customTab) { customTab.style.opacity = "1"; customTab.style.cursor = "pointer"; }

        if (isEngLocked) {
            sidebar.classList.add('locked');
            blurAI(true);
            lockOverlay.classList.remove('hidden');
            
            if(lockMsg) lockMsg.innerHTML = "Daily Limit Reached!<br>Sidebar Locked.";
            
            if(lockBtn) {
                lockBtn.style.display = 'block';
                lockBtn.innerText = "Get PRO 🚀";
                lockBtn.onclick = () => window.open('pro.html', '_blank');
            }

            if(customTab) { 
                customTab.style.opacity = "0.5"; 
                customTab.style.cursor = "not-allowed";
            }
        }

        if (isBanLocked) {
            if(banglaTab) { 
                banglaTab.style.opacity = "0.5"; 
                banglaTab.style.cursor = "not-allowed";
            }

            if (currentMode === 'bengali') {
                switchTab('normal');
                const goPro = confirm("⚠️ বাংলা ডেইলি লিমিট শেষ।\nআগামীকাল পর্যন্ত অপেক্ষা করুন বা PRO কিনুন।\n\nPRO পেজে যেতে চান?");
                if(goPro) window.open('pro.html', '_blank');
            }
        }
    }
};