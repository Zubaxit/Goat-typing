// settings-manager.js - Ultimate Theme & Pro Features Controller (Fixed Dark Mode Toggle)

/* ==============================
   🔰 SAFETY POLYFILL: canUse Helper
   ============================== */
if (typeof window.canUse === 'undefined') {
    window.canUse = function(feature) {
        // 🔥 TESTING FIX: Uncomment below to force enable PRO for testing
        // return true; 
        
        return window.IS_PRO_USER === true || window.IS_ADMIN === true;
    };
}

/* ==============================
   GLOBAL STATE & VARIABLES
   ============================== */
const settingsState = {
    ghost: { 
        active: false, 
        mode: 'none', 
        wpm: 40, 
        interval: null, 
        startTime: null, 
        el: null 
    },
    sound: { profile: 'none' },
    visual: { particles: false, combo: false, comboCount: 0 },
    pro: { heatmap: false, spotlight: false, suddenDeath: false },
    theme: {
        bgType: 'solid',      
        bgValue: '#f0f2f5',   // Stores Color/Gradient
        animType: 'leaves',   // Stores Animation Type separately
        kbStyle: 'default',   // Stores Keyboard Style ID
        textColor: '#333333',
        mainColor: '#4361ee',
        cardColor: '#ffffff'
    }
};

const audioCtxSettings = new (window.AudioContext || window.webkitAudioContext)();
let canvas, ctx, particles = [];
let animInterval = null; 

// Helper for Toggle Logic
function capitalize(s) {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ==============================
   🔥 SMART THEME & CONTRAST SYSTEM (FIXED)
   ============================== */

// 1. Theme Mode Updater (Auto-Detects Dark/Light)
function updateThemeMode(colorOrType) {
    const root = document.documentElement;
    let isDark = false;

    // A. Check Preset Names
    const darkPresets = ['dark', 'midnight', 'hacker', 'space', 'rgb-gamer', 'fire'];
    if (darkPresets.includes(colorOrType)) {
        isDark = true;
    } 
    // B. Check Hex Color Brightness
    else if (colorOrType.startsWith('#')) {
        const rgb = hexToRgb(colorOrType);
        if (rgb) {
            // Brightness formula (standard)
            const brightness = Math.round(((parseInt(rgb.r) * 299) + (parseInt(rgb.g) * 587) + (parseInt(rgb.b) * 114)) / 1000);
            if (brightness < 125) isDark = true;
        }
    }
    // C. Check Text Color (Fallback)
    else if (settingsState.theme.textColor.toLowerCase() === '#ffffff' || settingsState.theme.textColor.toLowerCase() === '#e0e0e0') {
         isDark = true;
    }

    // 🔥 Force Apply Theme Attribute to HTML tag (Better than body)
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    
    // Update Toggle Icon if exists
    const themeIcon = document.querySelector('.theme-btn i');
    if(themeIcon) {
        themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// 2. Toggle Theme Manually
window.toggleTheme = function() {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme');
    
    // যদি বর্তমানে ডার্ক থাকে, তবে লাইট (ডিফল্ট) করো
    if (currentTheme === 'dark') {
        applyPreset('default'); 
    } 
    // অন্যথায় ডার্ক করো
    else {
        applyPreset('dark'); 
    }
};

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/* ==============================
   1. PRESETS SYSTEM
   ============================== */
/* ==============================
   1. UNIQUE PRESETS SYSTEM (UPDATED)
   ============================== */
const presets = {
    // 1. Classic Light
    default: { 
        id: 'default',
        bgType: 'solid', bgValue: '#f3f4f6', 
        text: '#1f2937', main: '#3b82f6', card: '#ffffff',
        animType: 'leaves',
        correct: '#10b981', error: '#ef4444'
    },
    // 2. Deep Dark (Improved)
    dark: { 
        id: 'dark',
        bgType: 'solid', bgValue: '#121212', 
        text: '#e5e7eb', main: '#8b5cf6', card: '#1f2937',
        animType: 'snow',
        correct: '#34d399', error: '#f87171'
    },
    // 3. Midnight Blue (Professional)
    midnight: { 
        id: 'midnight',
        bgType: 'gradient', bgValue: 'linear-gradient(to right, #0f2027, #203a43, #2c5364)', 
        text: '#f1f5f9', main: '#00d4ff', card: '#1e293b',
        animType: 'rain',
        correct: '#22d3ee', error: '#ff4757'
    },
    // 4. Dracula (Coding Favorite)
    dracula: { 
        id: 'dracula',
        bgType: 'solid', bgValue: '#282a36', 
        text: '#f8f8f2', main: '#bd93f9', card: '#44475a',
        animType: 'fireflies',
        correct: '#50fa7b', error: '#ff5555'
    },
    // 5. Cyberpunk (High Contrast)
    cyberpunk: { 
        id: 'cyberpunk',
        bgType: 'solid', bgValue: '#000000', 
        text: '#fcee0a', main: '#00ff00', card: '#111111',
        animType: 'rain',
        correct: '#00ff00', error: '#ff0099'
    },
    // 6. Cherry Blossom (Soft & Unique)
    cherry: { 
        id: 'cherry',
        bgType: 'gradient', bgValue: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)', 
        text: '#5e2a2a', main: '#ff6b81', card: '#fff0f5',
        animType: 'leaves',
        correct: '#2ecc71', error: '#ff4757'
    },
    // 7. Forest (Calm Green)
    forest: { 
        id: 'forest',
        bgType: 'gradient', bgValue: 'linear-gradient(135deg, #134e5e, #71b280)', 
        text: '#e0f2f1', main: '#4db6ac', card: '#004d40',
        animType: 'fireflies',
        correct: '#a7ffeb', error: '#ffab91'
    }
};
window.applyPreset = function(name) {
    const p = presets[name];
    if(!p) return;

    settingsState.theme.bgType = p.bgType;
    settingsState.theme.bgValue = p.bgValue;
    settingsState.theme.textColor = p.text;
    settingsState.theme.mainColor = p.main;
    settingsState.theme.cardColor = p.card;

    // Update Selectors
    const bgSel = document.getElementById('bgTypeSelector');
    if(bgSel) bgSel.value = p.bgType;
    
    toggleBgControls(p.bgType, false);
    
    // Update Custom Inputs
    const custText = document.getElementById('customText');
    const custMain = document.getElementById('customMain');
    const custCard = document.getElementById('customCard');
    
    if(custText) custText.value = p.text;
    if(custMain) custMain.value = p.main;
    if(custCard) custCard.value = p.card;

    // Update CSS Vars
    const root = document.documentElement;
    root.style.setProperty('--correct-color', p.correct || '#00b894');
    root.style.setProperty('--error-color', p.error || '#ff7675');

    updateCustomColors();
    
    // 🔥 Apply Background & Theme Mode
    if(p.bgType === 'solid') {
        const solidPicker = document.getElementById('bgSolidColor');
        if(solidPicker) solidPicker.value = p.bgValue;
        document.body.style.background = p.bgValue;
        updateThemeMode(p.bgValue); // Auto-set Dark/Light
    } else if (p.bgType === 'gradient') {
        document.body.style.background = p.bgValue;
        stopBackgroundAnimation();
        updateThemeMode(name); // Preset name based check
    }
    
    saveSettings();
};

/* ==============================
   2. BACKGROUND SYSTEM
   ============================== */
window.toggleBgControls = function(type, apply = true) {
    ['solid', 'gradient', 'image', 'animated'].forEach(t => {
        const el = document.getElementById(`bgControl-${t}`);
        if(el) el.style.display = 'none';
    });
    
    const selectedEl = document.getElementById(`bgControl-${type}`);
    if(selectedEl) selectedEl.style.display = 'block';
    
    settingsState.theme.bgType = type;
    
    if (apply) {
        if(type === 'solid') applyBackground('solid');
        else if(type === 'gradient') applyBackground('gradient');
        else if(type === 'animated') applyBackground('animated');
    }
};

window.applyBackground = function(type) {
    const root = document.body;
    if (type !== 'animated') stopBackgroundAnimation(); 
    
    if (type === 'solid') {
        const colEl = document.getElementById('bgSolidColor');
        const col = colEl ? colEl.value : '#ffffff';
        root.style.background = col;
        settingsState.theme.bgValue = col;
        updateThemeMode(col); // 🔥 Auto Dark
        
    } else if (type === 'gradient') {
        const c1 = document.getElementById('bgGrad1')?.value || '#ffffff';
        const c2 = document.getElementById('bgGrad2')?.value || '#000000';
        const deg = document.getElementById('bgGradDeg')?.value || '135';
        const val = `linear-gradient(${deg}deg, ${c1}, ${c2})`;
        root.style.background = val;
        settingsState.theme.bgValue = val;
        updateThemeMode(c1); // Check first color brightness
        
    } else if (type === 'animated') {
        const animSel = document.getElementById('animTypeSelector');
        const animType = animSel ? animSel.value : 'leaves';
        startBackgroundAnimation(animType);
        settingsState.theme.animType = animType;
    }
    saveSettings();
};

window.handleImageUpload = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.body.style.background = `url(${e.target.result}) no-repeat center center fixed`;
            document.body.style.backgroundSize = 'cover';
            settingsState.theme.bgValue = 'image-uploaded'; 
            settingsState.theme.bgType = 'image';
            try { localStorage.setItem('customBgImage', e.target.result); } catch(err) {}
            
            // Assume Dark Mode for Images for better contrast
            document.documentElement.setAttribute('data-theme', 'dark'); 
            saveSettings();
        }
        reader.readAsDataURL(input.files[0]);
    }
};

/* ==============================
   3. ANIMATED BACKGROUNDS
   ============================== */
function stopBackgroundAnimation() {
    const container = document.getElementById('animatedBgContainer');
    if(container) container.innerHTML = '';
    if(animInterval) clearInterval(animInterval);
}

function startBackgroundAnimation(type) {
    const container = document.getElementById('animatedBgContainer');
    if(!container) return;
    stopBackgroundAnimation(); // Clear existing
    
    // 1. FALLING LEAVES
    if (type === 'leaves') {
        animInterval = setInterval(() => {
            const leaf = document.createElement('div');
            leaf.className = 'leaf';
            leaf.innerHTML = Math.random() > 0.5 ? '🍃' : '🍁'; 
            leaf.style.position = 'absolute';
            leaf.style.left = Math.random() * 100 + 'vw';
            leaf.style.top = '-50px';
            leaf.style.fontSize = (Math.random() * 20 + 10) + 'px';
            leaf.style.opacity = Math.random() * 0.5 + 0.5;
            leaf.style.zIndex = -1;
            
            const duration = Math.random() * 5 + 5;
            leaf.style.transition = `top ${duration}s linear, transform ${duration}s ease-in-out`;
            
            container.appendChild(leaf);
            requestAnimationFrame(() => {
                leaf.style.top = '110vh';
                leaf.style.transform = `rotate(${Math.random() * 360}deg) translateX(${Math.random()*100 - 50}px)`;
            });
            setTimeout(() => leaf.remove(), duration * 1000);
        }, 300);
    } 
    
    // 2. MATRIX RAIN
    else if (type === 'rain') {
         document.body.style.background = '#000'; 
         updateThemeMode('#000000'); // Force Dark

         animInterval = setInterval(() => {
            const drop = document.createElement('div');
            drop.style.position = 'absolute';
            drop.style.top = '-20px';
            drop.style.left = Math.random() * 100 + 'vw';
            drop.style.color = '#0f0';
            drop.style.fontFamily = 'monospace';
            drop.style.fontWeight = 'bold';
            drop.innerText = Math.random() > 0.5 ? '1' : '0';
            drop.style.fontSize = (Math.random() * 12 + 10) + 'px';
            drop.style.opacity = 0.6;
            drop.style.zIndex = -1;
            
            const duration = Math.random() * 1 + 1;
            drop.style.transition = `top ${duration}s linear`;
            container.appendChild(drop);
            requestAnimationFrame(() => { drop.style.top = '110vh'; });
            setTimeout(() => drop.remove(), duration * 1000);
        }, 40); 
    } 
    
    // 3. SNOW STORM
    else if (type === 'snow') {
        if(settingsState.theme.bgType === 'animated') {
             document.body.style.background = '#1e293b';
             updateThemeMode('#1e293b');
        }

        animInterval = setInterval(() => {
            const flake = document.createElement('div');
            flake.style.position = 'absolute';
            flake.style.top = '-10px';
            flake.style.left = Math.random() * 100 + 'vw';
            flake.style.width = (Math.random() * 4 + 2) + 'px';
            flake.style.height = flake.style.width;
            flake.style.background = 'white';
            flake.style.borderRadius = '50%';
            flake.style.opacity = Math.random() * 0.8 + 0.2;
            flake.style.filter = 'blur(1px)';
            flake.style.zIndex = -1;
            
            const duration = Math.random() * 3 + 2;
            flake.style.transition = `top ${duration}s linear, left ${duration}s ease-in-out`;
            container.appendChild(flake);
            requestAnimationFrame(() => {
                flake.style.top = '110vh';
                flake.style.left = (parseFloat(flake.style.left) + (Math.random()*20 - 10)) + 'vw';
            });
            setTimeout(() => flake.remove(), duration * 1000);
        }, 50);
    } 
    
    // 4. GOLDEN FIREFLIES
    else if (type === 'fireflies') {
        animInterval = setInterval(() => {
            const fly = document.createElement('div');
            const size = Math.random() * 4 + 2;
            fly.style.position = 'absolute';
            fly.style.bottom = '-10px';
            fly.style.left = Math.random() * 100 + 'vw';
            fly.style.width = size + 'px';
            fly.style.height = size + 'px';
            fly.style.background = '#ffd700'; 
            fly.style.borderRadius = '50%';
            fly.style.boxShadow = `0 0 ${size*2}px #ffd700`;
            fly.style.opacity = 0;
            fly.style.zIndex = -1;
            
            const duration = Math.random() * 6 + 4;
            fly.style.transition = `bottom ${duration}s linear, opacity 1s, left ${duration}s ease`;
            container.appendChild(fly);
            requestAnimationFrame(() => {
                fly.style.bottom = '110vh';
                fly.style.opacity = Math.random();
                fly.style.left = (Math.random() * 100) + 'vw';
            });
            setTimeout(() => fly.remove(), duration * 1000);
        }, 100);
    }
    
    // 5. EMOJI FUN
    else if (type === 'emojis') {
        const emojis = ['😎', '🔥', '💻', '🚀', '🐱', '🍕', '🎮', '💡','😒','😂','🤐','🤷‍♂️','🥶','☠️'];
        animInterval = setInterval(() => {
            const e = document.createElement('div');
            e.innerText = emojis[Math.floor(Math.random() * emojis.length)];
            e.style.position = 'absolute';
            e.style.top = '-30px';
            e.style.left = Math.random() * 100 + 'vw';
            e.style.fontSize = (Math.random() * 20 + 15) + 'px';
            e.style.opacity = 0.7;
            e.style.zIndex = -1;
            
            const duration = Math.random() * 4 + 3;
            e.style.transition = `top ${duration}s linear, transform ${duration}s ease`;
            container.appendChild(e);
            requestAnimationFrame(() => {
                e.style.top = '110vh';
                e.style.transform = `rotate(${Math.random()*360}deg)`;
            });
            setTimeout(() => e.remove(), duration * 1000);
        }, 300);
    }
    
    // 6. BURNING EMBERS
    else if (type === 'embers') {
        document.body.style.background = '#1a0500';
        updateThemeMode('#000000'); // Force Dark
        
        animInterval = setInterval(() => {
            const ember = document.createElement('div');
            ember.style.position = 'absolute';
            ember.style.bottom = '-10px';
            ember.style.left = Math.random() * 100 + 'vw';
            ember.style.width = (Math.random() * 6 + 2) + 'px';
            ember.style.height = ember.style.width;
            ember.style.background = 'linear-gradient(to top, #ff4500, #ff8c00)';
            ember.style.borderRadius = '50%';
            ember.style.boxShadow = '0 0 10px #ff4500';
            ember.style.opacity = 1;
            ember.style.zIndex = -1;
            
            const duration = Math.random() * 3 + 2;
            ember.style.transition = `bottom ${duration}s linear, opacity ${duration}s ease-in, left ${duration}s ease-in-out`;
            container.appendChild(ember);
            requestAnimationFrame(() => {
                ember.style.bottom = (Math.random() * 50 + 50) + 'vh'; 
                ember.style.opacity = 0;
                ember.style.left = (Math.random() * 100) + 'vw';
            });
            setTimeout(() => ember.remove(), duration * 1000);
        }, 50);
    }
}

/* ==============================
   4. COLOR SYSTEM
   ============================== */
window.updateCustomColors = function() {
    const textEl = document.getElementById('customText');
    const mainEl = document.getElementById('customMain');
    const cardEl = document.getElementById('customCard');
    
    const text = textEl ? textEl.value : settingsState.theme.textColor;
    const main = mainEl ? mainEl.value : settingsState.theme.mainColor;
    const card = cardEl ? cardEl.value : settingsState.theme.cardColor;
    
    const root = document.documentElement;
    root.style.setProperty('--text-color', text);
    root.style.setProperty('--active-tab-bg', main);
    root.style.setProperty('--card-bg', card);
    root.style.setProperty('--modal-bg', card);

    const darkerMain = adjustColor(main, -40);
    root.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${main}, ${darkerMain})`);
    
    settingsState.theme.textColor = text;
    settingsState.theme.mainColor = main;
    settingsState.theme.cardColor = card;
    
    saveSettings();
};

function adjustColor(col, amt) {
    let usePound = false;
    if (col[0] == "#") { col = col.slice(1); usePound = true; }
    let num = parseInt(col,16);
    let r = (num >> 16) + amt; if (r > 255) r = 255; else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amt; if (b > 255) b = 255; else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amt; if (g > 255) g = 255; else if (g < 0) g = 0;
    return (usePound?"#":"") + (g | (b << 8) | (r << 16)).toString(16);
}

/* ==============================
   🔥 5. KEYBOARD LAYOUT STYLE SYSTEM (GUARDED)
   ============================== */
const keyboardThemes = [
    { 
        id: 'default', name: 'Default', pro: false, 
        preview: 'background: #ececec; color: #444; border-bottom: 2px solid #a8a8a8;' 
    },
    { 
        id: 'dark-classic', name: 'Dark', pro: false, 
        preview: 'background: #333; color: #fff; border-bottom: 2px solid #111;' 
    },
    { 
        id: 'minimal-white', name: 'Minimal', pro: false, 
        preview: 'background: #fff; color: #333; border: 1px solid #ddd;' 
    },
    { 
        id: 'ocean', name: 'Ocean', pro: false, 
        preview: 'background: linear-gradient(180deg, #4facfe 0%, #00f2fe 100%); color: #fff;' 
    },
    { 
        id: 'soft-3d', name: 'Soft 3D', pro: true, 
        preview: 'background: #e0e5ec; color: #555; box-shadow: 2px 2px 5px #a3b1c6, -2px -2px 5px #ffffff;' 
    }, 
    { 
        id: 'glass', name: 'Glassy', pro: true, 
        preview: 'background: rgba(100, 100, 255, 0.3); border: 1px solid rgba(255,255,255,0.5); backdrop-filter: blur(2px);' 
    },      
    { 
        id: 'retro', name: 'Retro', pro: true, 
        preview: 'background: #fdf5e6; color: #333; border: 2px solid #8b4513; border-radius: 50%;' 
    },
    { 
        id: 'rgb-gamer', name: 'RGB', pro: true, anim: true, 
        preview: 'background: #000; color: #fff; border: 2px solid red; box-shadow: 0 0 5px red;' 
    },
    { 
        id: 'snake', name: 'Snake', pro: true, anim: true, 
        preview: 'background: #111; color: #0f0; border: 1px solid #0f0;' 
    },  
    { 
        id: 'cyberpunk', name: 'Cyber', pro: true, 
        preview: 'background: #fcee0a; color: #000; border: 2px solid #000; transform: skew(-5deg);' 
    },
    { 
        id: 'fire', name: 'Magma', pro: true, anim: true, 
        preview: 'background: #220000; color: #ff4500; border: 1px solid #ff4500;' 
    }
];

function setKeyboardStyle(styleId) {
    const theme = keyboardThemes.find(t => t.id === styleId);
    if (!theme) return;

    if (theme.pro && !canUse('proKeyboard')) {
        return;
    }

    settingsState.theme.kbStyle = styleId;
    document.body.setAttribute('data-kb-theme', styleId);
    saveSettings();
}

function initKeyboardStyles() {
    const grid = document.getElementById('kbStyleGrid');
    if (!grid) return;
    
    grid.innerHTML = ''; 

    keyboardThemes.forEach(theme => {
        const card = document.createElement('div');
        card.className = 'kb-theme-card';
        if (settingsState.theme.kbStyle === theme.id) {
            card.classList.add('active');
        }

        const isLocked = theme.pro && !canUse('proKeyboard');

        let html = `
            <div class="kb-preview-box" style="${theme.preview}">A</div>
            <span class="kb-name">${theme.name}</span>
        `;
        
        if (theme.pro) {
            html += `<span class="pro-badge">${isLocked ? '🔒' : '👑'}</span>`;
        }

        card.innerHTML = html;

        card.onclick = () => {
            if (theme.pro && !canUse('proKeyboard')) {
                if(window.openProSettings) window.openProSettings(); 
                else alert("Upgrade to PRO to unlock this theme!");
                return;
            }
            setKeyboardStyle(theme.id);
            document.querySelectorAll('.kb-theme-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        };

        grid.appendChild(card);
    });
}

window.setKeyboardStyle = setKeyboardStyle;
window.initKeyboardStyles = initKeyboardStyles;


/* ==============================
   6. SAVE & LOAD SYSTEM
   ============================== */
function saveSettings() {
    const data = {
        ...settingsState,
        visualParticles: document.getElementById('toggleParticles')?.checked,
        visualCombo: document.getElementById('toggleCombo')?.checked,
        proHeatmap: document.getElementById('toggleHeatmap')?.checked,
        proSpotlight: document.getElementById('toggleSpotlight')?.checked,
        proSuddenDeath: document.getElementById('toggleSuddenDeath')?.checked,
        ghostWpm: document.getElementById('ghostSpeed')?.value,
        paceWpm: document.getElementById('paceSpeed')?.value,
        ghostEnabled: document.getElementById('toggleGhost')?.checked,
        paceEnabled: document.getElementById('togglePace')?.checked
    };
    localStorage.setItem('ultimateSettings_v4', JSON.stringify(data)); 
}

function loadSettings() {
    const saved = localStorage.getItem('ultimateSettings_v4');
    const savedImg = localStorage.getItem('customBgImage');
    
    if (saved) {
        const data = JSON.parse(saved);
        
        if(data.sound && data.sound.profile) {
            settingsState.sound.profile = data.sound.profile;
            const sel = document.getElementById('soundSelect');
            if(sel) sel.value = data.sound.profile;
        }

        if(data.theme) {
            Object.assign(settingsState.theme, data.theme);
            const tEl = document.getElementById('customText'); if(tEl) tEl.value = data.theme.textColor;
            const mEl = document.getElementById('customMain'); if(mEl) mEl.value = data.theme.mainColor;
            const cEl = document.getElementById('customCard'); if(cEl) cEl.value = data.theme.cardColor;

            updateCustomColors(); 

            const bgSel = document.getElementById('bgTypeSelector');
            if(bgSel) bgSel.value = data.theme.bgType;
            
            toggleBgControls(data.theme.bgType, false);
            
            // Restore BG Color & Ensure Theme Mode is Correct
            if(data.theme.bgValue && !data.theme.bgValue.includes('rain') && !data.theme.bgValue.includes('leaves')) {
                 if (data.theme.bgType === 'solid' || data.theme.bgType === 'animated') {
                      document.body.style.background = data.theme.bgValue;
                      const bsEl = document.getElementById('bgSolidColor'); 
                      if(bsEl) bsEl.value = data.theme.bgValue;
                      updateThemeMode(data.theme.bgValue); // 🔥 Restore Dark/Light mode
                 } else if (data.theme.bgType === 'gradient') {
                      document.body.style.background = data.theme.bgValue;
                      updateThemeMode('gradient');
                 }
            } else {
                 document.body.style.background = '#f0f2f5'; 
                 updateThemeMode('light');
            }

            if (data.theme.bgType === 'image' && savedImg) {
                document.body.style.background = `url(${savedImg}) no-repeat center center fixed`;
                document.body.style.backgroundSize = 'cover';
                updateThemeMode('image');
            }

            if (data.theme.bgType === 'animated') {
                const animSel = document.getElementById('animTypeSelector');
                const animType = data.theme.animType || 'leaves'; 
                if(animSel) animSel.value = animType;
                startBackgroundAnimation(animType);
            }
            
            if (data.theme.kbStyle) {
                const theme = keyboardThemes.find(t => t.id === data.theme.kbStyle);
                if (typeof window.IS_PRO_USER === 'undefined') { }
                else if (!theme || !theme.pro || canUse('proKeyboard')) {
                    setKeyboardStyle(data.theme.kbStyle);
                } else {
                    setKeyboardStyle('default');
                }
            }
        }
        
        if(data.visualParticles) { settingsState.visual.particles = true; setChecked('toggleParticles', true); }
        if(data.visualCombo) { settingsState.visual.combo = true; setChecked('toggleCombo', true); }
        
        if(data.proHeatmap) { settingsState.pro.heatmap = true; setChecked('toggleHeatmap', true); }
        if(data.proSpotlight) { 
            settingsState.pro.spotlight = true; 
            setChecked('toggleSpotlight', true);
            document.body.classList.add('pro-spotlight');
        }
        if(data.proSuddenDeath) { settingsState.pro.suddenDeath = true; setChecked('toggleSuddenDeath', true); }
        
        if(data.ghostEnabled) {
             settingsState.ghost.active = true;
             settingsState.ghost.mode = 'ghost';
             setChecked('toggleGhost', true);
             if(data.ghostWpm) settingsState.ghost.wpm = parseInt(data.ghostWpm);
             const gInput = document.getElementById('ghostSpeed');
             if(gInput) gInput.value = settingsState.ghost.wpm;
        } else if (data.paceEnabled) {
             settingsState.ghost.active = true;
             settingsState.ghost.mode = 'pace';
             setChecked('togglePace', true);
             if(data.paceWpm) settingsState.ghost.wpm = parseInt(data.paceWpm);
             const pInput = document.getElementById('paceSpeed');
             if(pInput) pInput.value = settingsState.ghost.wpm;
        }
        
    } else {
        applyPreset('default');
    }
    
    initKeyboardStyles();
}

function setChecked(id, val) {
    const el = document.getElementById(id);
    if(el) el.checked = val;
}

/* ==============================
   7. SOUND ENGINE
   ============================== */
window.changeSoundProfile = function(val) {
    settingsState.sound.profile = val;
    saveSettings();
    if(val !== 'none') playKeySound();
};

function playKeySound() {
    if(settingsState.sound.profile === 'none') return;
    if(audioCtxSettings.state === 'suspended') audioCtxSettings.resume();
    
    const t = audioCtxSettings.currentTime;
    const osc = audioCtxSettings.createOscillator();
    const gain = audioCtxSettings.createGain();
    
    if(settingsState.sound.profile === 'mechanical') {
        osc.frequency.setValueAtTime(2000, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);
        gain.gain.setValueAtTime(0.2, t);
    } else if (settingsState.sound.profile === 'typewriter') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, t);
        gain.gain.setValueAtTime(0.3, t);
    } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, t);
        gain.gain.setValueAtTime(0.1, t);
    }
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    osc.connect(gain);
    gain.connect(audioCtxSettings.destination);
    osc.start(t);
    osc.stop(t + 0.05);
}

/* ==============================
   8. VISUAL EFFECTS
   ============================== */
window.toggleVisualEffect = function(type) {
    const el = document.getElementById(type === 'particles' ? 'toggleParticles' : 'toggleCombo');
    if(el) {
        settingsState.visual[type] = el.checked;
        saveSettings();
        if(type === 'particles' && el.checked) initCanvas();
    }
};

function initCanvas() {
    canvas = document.getElementById('effectCanvas');
    if(canvas) {
        ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.zIndex = "9999"; 
        canvas.style.pointerEvents = "none";
        canvas.style.position = "fixed";
        animateParticles();
    }
}

function spawnParticles(x, y) {
    if(!settingsState.visual.particles) return;
    const colors = ['#4361ee', '#e74c3c', '#f1c40f', '#2ecc71', '#00d2d3'];
    for(let i=0; i<10; i++) { 
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 1, size: Math.random() * 5 + 2,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
}

function animateParticles() {
    if(!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for(let i=0; i<particles.length; i++) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.life -= 0.03;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        if(p.life <= 0) { particles.splice(i, 1); i--; }
    }
    requestAnimationFrame(animateParticles);
}

function showComboPopup(x, y, count) {
    if(!settingsState.visual.combo) return;
    if(count < 5 || count % 5 !== 0) return;
    const el = document.createElement('div');
    el.className = 'combo-popup';
    el.innerText = `${count}x Combo!`;
    el.style.left = (x + 20) + 'px';
    el.style.top = (y - 40) + 'px';
    el.style.zIndex = "10000";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

/* ==============================
   9. GHOST & PACE LOGIC
   ============================== */
window.toggleGhostMode = function(mode) {
    const isChecked = document.getElementById(mode === 'ghost' ? 'toggleGhost' : 'togglePace').checked;
    settingsState.ghost.active = false; 
    stopGhost();
    
    if (isChecked) {
        settingsState.ghost.active = true;
        settingsState.ghost.mode = mode;
        const speedId = mode === 'ghost' ? 'ghostSpeed' : 'paceSpeed';
        const rawVal = document.getElementById(speedId).value;
        settingsState.ghost.wpm = parseInt(rawVal) || 40; 
        
        const otherId = mode === 'ghost' ? 'togglePace' : 'toggleGhost';
        document.getElementById(otherId).checked = false;
    }
    saveSettings();
};

function startGhost() {
    stopGhost();
    if(!settingsState.ghost.active) return;

    const container = document.getElementById('typingSection');
    if(!container) return;

    const el = document.createElement('div');
    el.className = settingsState.ghost.mode === 'ghost' ? 'ghost-cursor' : 'pace-caret';
    
    const firstSpan = document.querySelector('#quoteDisplay span');
    if(firstSpan) {
        const adjustX = settingsState.ghost.mode === 'ghost' ? -30 : -2; 
        const adjustY = settingsState.ghost.mode === 'ghost' ? 5 : 0;
        el.style.left = (firstSpan.offsetLeft + adjustX) + 'px';
        el.style.top = (firstSpan.offsetTop + adjustY) + 'px';
    }
    
    container.appendChild(el);
    settingsState.ghost.el = el;
    settingsState.ghost.startTime = Date.now();
    
    const charInterval = 60000 / (settingsState.ghost.wpm * 5);
    
    settingsState.ghost.interval = setInterval(() => {
        const input = document.getElementById('inputField');
        if(!input || input.disabled) { stopGhost(); return; }

        const elapsed = Date.now() - settingsState.ghost.startTime;
        const ghostCharIndex = Math.floor(elapsed / charInterval);

        let userCharIndex;
        if (typeof currentMode !== 'undefined' && currentMode === 'bengali') {
            userCharIndex = (typeof sequenceIndex !== 'undefined') ? sequenceIndex : 0;
        } else {
            userCharIndex = input.value.length;
        }

        const spans = document.querySelectorAll('#quoteDisplay span');
        const totalChars = spans.length;

        if (ghostCharIndex >= totalChars) {
            const lastSpan = spans[totalChars - 1];
            if(settingsState.ghost.el && lastSpan) {
                const adjustX = settingsState.ghost.mode === 'ghost' ? -30 : -2;
                const adjustY = settingsState.ghost.mode === 'ghost' ? 5 : 0;
                settingsState.ghost.el.style.left = (lastSpan.offsetLeft + lastSpan.offsetWidth + adjustX) + 'px';
                settingsState.ghost.el.style.top = (lastSpan.offsetTop + adjustY) + 'px';
                clearInterval(settingsState.ghost.interval); 
                settingsState.ghost.interval = null;
            }
            return;
        }

        if(ghostCharIndex < spans.length) {
            const targetSpan = spans[ghostCharIndex];
            const adjustX = settingsState.ghost.mode === 'ghost' ? -30 : -2;
            const adjustY = settingsState.ghost.mode === 'ghost' ? 5 : 0;

            if(settingsState.ghost.el) {
                settingsState.ghost.el.style.left = (targetSpan.offsetLeft + adjustX) + 'px';
                settingsState.ghost.el.style.top = (targetSpan.offsetTop + adjustY) + 'px';
                
                if (settingsState.ghost.mode === 'ghost') {
                    if (userCharIndex > ghostCharIndex) settingsState.ghost.el.classList.add('winning');
                    else settingsState.ghost.el.classList.remove('winning');
                } else if (settingsState.ghost.mode === 'pace') {
                    if (ghostCharIndex > userCharIndex) {
                        settingsState.ghost.el.style.boxShadow = "0 0 10px #ff4757, 0 0 20px #ff4757";
                        settingsState.ghost.el.style.background = "#ff4757";
                    } else {
                        settingsState.ghost.el.style.boxShadow = "0 0 10px #f1c40f, 0 0 20px #f1c40f";
                        settingsState.ghost.el.style.background = "#f1c40f";
                    }
                }
            }
        }
    }, 100); 
}

function stopGhost() {
    if(settingsState.ghost.interval) clearInterval(settingsState.ghost.interval);
    if(settingsState.ghost.el) settingsState.ghost.el.remove();
    settingsState.ghost.el = null; settingsState.ghost.interval = null;
}

/* ==============================
   10. PRO FEATURES (GUARDED)
   ============================== */
window.toggleProFeature = function(feature) {
    const checkbox = document.getElementById('toggle' + capitalize(feature));
    const isChecked = checkbox.checked;

    if (!settingsState.pro) settingsState.pro = {};
    settingsState.pro[feature] = isChecked;
    saveSettings();

    if (feature === 'spotlight') {
        if (isChecked) {
            document.body.classList.add('spotlight-mode');
        } else {
            document.body.classList.remove('spotlight-mode');
        }
    } 
    else if (feature === 'heatmap') {
        if (isChecked) {
            renderHeatmap();
        } else {
            if(typeof clearHeatmap === 'function') clearHeatmap();
            document.querySelectorAll('.key').forEach(k => k.classList.remove('heat-hot', 'heat-cold'));
        }
    }
    else if (feature === 'suddenDeath') {
        console.log("💀 Sudden Death Mode:", isChecked ? "ON" : "OFF");
        if(isChecked) alert("💀 Sudden Death ON: One mistake and game over!");
    }
}
function triggerSuddenDeath() {
    const input = document.getElementById('inputField');
    input.disabled = true;
    input.value = "";
    
    if(document.querySelector('.sudden-death-overlay')) return;

    const div = document.createElement('div');
    div.className = 'sudden-death-overlay';
    div.innerHTML = `
        <div class="sd-card">
            <span class="sd-icon">☠️</span>
            <h2 class="sd-title">Sudden Death</h2>
            <p class="sd-text">You made a mistake! In this mode, perfection is required.</p>
            <button class="sd-btn" onclick="location.reload()">Try Again</button>
        </div>
    `;
    document.body.appendChild(div);
    playKeySound(); 
}

// Global Effect Trigger
window.triggerGlobalEffects = function(isCorrect) {
    if(typeof playKeySound === 'function') playKeySound();
    
    if(settingsState.ghost.active && !settingsState.ghost.interval) {
         startGhost();
    }

    if(settingsState.pro.suddenDeath && !isCorrect) {
        triggerSuddenDeath();
        return; 
    }

    const spans = document.querySelectorAll('#quoteDisplay span');
    let idx;
    const val = document.getElementById('inputField').value;
    idx = val.length - 1;

    if(idx >= 0 && spans[idx]) {
        const span = spans[idx];
        
        if(isCorrect) {
            const rect = span.getBoundingClientRect();
            const x = rect.left + (rect.width / 2);
            const y = rect.top + (rect.height / 2);
            
            spawnParticles(x, y); 
            
            settingsState.visual.comboCount++;
            showComboPopup(x, y, settingsState.visual.comboCount);
        } else {
            settingsState.visual.comboCount = 0;
        }
        
        if(settingsState.pro.heatmap) {
            const char = span.innerText; 
            const code = getKeyFromCharSimple(char); 
            if(code) {
                const keyEl = document.querySelector(`.key[data-key="${code}"]`);
                if(keyEl) {
                    const colorClass = isCorrect ? 'heat-cold' : 'heat-hot'; 
                    keyEl.classList.add(colorClass);
                    setTimeout(() => keyEl.classList.remove(colorClass), 400);
                }
            }
        }
    }
};

function getKeyFromCharSimple(char) {
    if(!char) return null;
    if(char === ' ') return 'Space';
    if(/[0-9]/.test(char)) return 'Digit'+char;
    if(/[a-zA-Z]/.test(char)) return 'Key'+char.toUpperCase();
    return null; 
}
/* ==============================
   11. NEW UI & EVENTS
   ============================== */

window.switchSettingsTab = function(tabName) {
    document.querySelectorAll('.tab-section').forEach(el => el.style.display = 'none');
    const target = document.getElementById('tab-' + tabName);
    if(target) target.style.display = 'block';
    
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.nav-item[onclick*="${tabName}"]`);
    if(activeBtn) activeBtn.classList.add('active');
};

window.openProSettings = function() { 
    document.getElementById('proSettingsModal').style.display = 'flex';
    loadSettings();
};

window.closeProSettings = function() { 
    document.getElementById('proSettingsModal').style.display = 'none'; 
    document.getElementById('inputField').focus(); 
};

// Stop ghost on tab switch
document.addEventListener("visibilitychange", function() {
    if (document.hidden) {
        stopGhost();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    initCanvas();
    switchSettingsTab('gameplay');

    window.addEventListener('resize', () => { 
        if (canvas) { 
            canvas.width = window.innerWidth; 
            canvas.height = window.innerHeight; 
        }
    });

    // 🔥 FIX: Remove duplicate event listener for .theme-btn
    // The button already has onclick="toggleTheme()" in HTML.
    
    const waitForPro = setInterval(() => {
        if (typeof window.IS_PRO_USER !== 'undefined') {
            clearInterval(waitForPro);
            if (typeof initKeyboardStyles === 'function') {
                initKeyboardStyles();
            }
            if (settingsState?.theme?.kbStyle) {
                const theme = keyboardThemes.find(t => t.id === settingsState.theme.kbStyle);
                if (!theme || !theme.pro || canUse('proKeyboard')) {
                    setKeyboardStyle(settingsState.theme.kbStyle);
                } else {
                    setKeyboardStyle('default');
                }
            }
        }
    }, 50); 
});