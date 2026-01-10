// bengali-utils.js - Logic for Bijoy Mapping & Helpers

// --- 1. KEY MAPPING (Bijoy 52 Standard) ---
const bengaliKeys = {
    'Digit1': { n: '১', s: '!' }, 'Digit2': { n: '২', s: '@' }, 'Digit3': { n: '৩', s: '#' }, 'Digit4': { n: '৪', s: '৳' },
    'Digit5': { n: '৫', s: '%' }, 'Digit6': { n: '৬', s: '^' }, 'Digit7': { n: '৭', s: '&' }, 'Digit8': { n: '৮', s: '*' },
    'Digit9': { n: '৯', s: '(' }, 'Digit0': { n: '০', s: ')' }, 'Minus': { n: '-', s: '_' }, 'Equal': { n: '=', s: '+' },
    
    'KeyQ': { n: 'ঙ', s: 'ং' }, 
    'KeyW': { n: 'য', s: 'য়' }, 
    'KeyE': { n: 'ড', s: 'ঢ' }, 'KeyR': { n: 'প', s: 'ফ' },
    'KeyT': { n: 'ট', s: 'ঠ' }, 'KeyY': { n: 'চ', s: 'ছ' }, 'KeyU': { n: 'জ', s: 'ঝ' }, 'KeyI': { n: 'হ', s: 'ঞ' },
    'KeyO': { n: 'গ', s: 'ঘ' }, 
    'KeyP': { n: 'ড়', s: 'ঢ়' }, 
    
    'BracketLeft': { n: '[', s: '{' }, 'BracketRight': { n: ']', s: '}' }, 
    'Backslash': { n: 'ৎ', s: 'ঃ' }, 
    
    'KeyA': { n: 'ৃ', s: 'র্' }, 'KeyS': { n: 'ু', s: 'ূ' }, 'KeyD': { n: 'ি', s: 'ী' }, 'KeyF': { n: 'া', s: 'অ' },
    'KeyG': { n: '্', s: '।' }, 'KeyH': { n: 'ব', s: 'ভ' }, 'KeyJ': { n: 'ক', s: 'খ' }, 'KeyK': { n: 'ত', s: 'থ' },
    'KeyL': { n: 'দ', s: 'ধ' }, 'Semicolon': { n: 'ঃ', s: ':' }, 'Quote': { n: 'ঁ', s: '"' },
    
    'KeyZ': { n: '্র', s: '্য' }, 'KeyX': { n: 'ও', s: 'ৗ' }, 'KeyC': { n: 'ে', s: 'ৈ' }, 'KeyV': { n: 'র', s: 'ল' },
    'KeyB': { n: 'ন', s: 'ণ' }, 'KeyN': { n: 'স', s: 'ষ' }, 'KeyM': { n: 'ম', s: 'শ' },
    'Comma': { n: ',', s: '<' }, 'Period': { n: '.', s: '>' }, 'Slash': { n: '/', s: '?' }, 'Backquote': { n: '', s: '' }, 'Space': { n: ' ', s: ' ' }
};

// --- 2. INDEPENDENT VOWELS ---
const independentVowels = {
    'অ': [{code:'KeyF', shift:true}], 
    'আ': [{code:'KeyG', shift:false}, {code:'KeyF', shift:false}],
    'ই': [{code:'KeyG', shift:false}, {code:'KeyD', shift:false}], 
    'ঈ': [{code:'KeyG', shift:false}, {code:'KeyD', shift:true}],  
    'উ': [{code:'KeyG', shift:false}, {code:'KeyS', shift:false}], 
    'ঊ': [{code:'KeyG', shift:false}, {code:'KeyS', shift:true}],  
    'ঋ': [{code:'KeyG', shift:false}, {code:'KeyA', shift:false}], 
    'এ': [{code:'KeyG', shift:false}, {code:'KeyC', shift:false}], 
    'ঐ': [{code:'KeyG', shift:false}, {code:'KeyC', shift:true}],  
    'ও': [{code:'KeyX', shift:false}], 
    'ঔ': [{code:'KeyG', shift:false}, {code:'KeyX', shift:true}]   
};

// --- FINGER MAP ---
const keyInfoMap = {
    'Backquote': { hand: 'l', digit: 'pinky' }, 'Digit1': { hand: 'l', digit: 'pinky' }, 'KeyQ': { hand: 'l', digit: 'pinky' }, 'KeyA': { hand: 'l', digit: 'pinky' }, 'KeyZ': { hand: 'l', digit: 'pinky' },
    'Digit2': { hand: 'l', digit: 'ring' }, 'KeyW': { hand: 'l', digit: 'ring' }, 'KeyS': { hand: 'l', digit: 'ring' }, 'KeyX': { hand: 'l', digit: 'ring' },
    'Digit3': { hand: 'l', digit: 'middle' }, 'KeyE': { hand: 'l', digit: 'middle' }, 'KeyD': { hand: 'l', digit: 'middle' }, 'KeyC': { hand: 'l', digit: 'middle' },
    'Digit4': { hand: 'l', digit: 'index' }, 'KeyR': { hand: 'l', digit: 'index' }, 'KeyF': { hand: 'l', digit: 'index' }, 'KeyV': { hand: 'l', digit: 'index' },
    'Digit5': { hand: 'l', digit: 'index' }, 'KeyT': { hand: 'l', digit: 'index' }, 'KeyG': { hand: 'l', digit: 'index' }, 'KeyB': { hand: 'l', digit: 'index' },
    'Space': { hand: 'l', digit: 'thumb' },
    'Digit6': { hand: 'r', digit: 'index' }, 'KeyY': { hand: 'r', digit: 'index' }, 'KeyH': { hand: 'r', digit: 'index' }, 'KeyN': { hand: 'r', digit: 'index' },
    'Digit7': { hand: 'r', digit: 'index' }, 'KeyU': { hand: 'r', digit: 'index' }, 'KeyJ': { hand: 'r', digit: 'index' }, 'KeyM': { hand: 'r', digit: 'index' },
    'Digit8': { hand: 'r', digit: 'middle' }, 'KeyI': { hand: 'r', digit: 'middle' }, 'KeyK': { hand: 'r', digit: 'middle' }, 'Comma': { hand: 'r', digit: 'middle' },
    'Digit9': { hand: 'r', digit: 'ring' }, 'KeyO': { hand: 'r', digit: 'ring' }, 'KeyL': { hand: 'r', digit: 'ring' }, 'Period': { hand: 'r', digit: 'ring' },
    'Digit0': { hand: 'r', digit: 'pinky' }, 'KeyP': { hand: 'r', digit: 'pinky' }, 'Semicolon': { hand: 'r', digit: 'pinky' }, 'Slash': { hand: 'r', digit: 'pinky' }, 
    'Minus': { hand: 'r', digit: 'pinky' }, 'Equal': { hand: 'r', digit: 'pinky' }, 'Quote': { hand: 'r', digit: 'pinky' }, 'BracketLeft': { hand: 'r', digit: 'pinky' }, 
    'BracketRight': { hand: 'r', digit: 'pinky' }, 'Enter': { hand: 'r', digit: 'pinky' }, 'Backslash': { hand: 'r', digit: 'pinky' }
};

// --- HELPER FUNCTIONS ---
function isConsonant(char) { return /^[ক-হড়ঢ়য়]$/.test(char); }
function isPreBaseVowel(char) { return ['ি', 'ে', 'ৈ', 'ো', 'ৌ'].includes(char); }
function isPostBaseVowel(char) { return ['া', 'ী', 'ু', 'ূ', 'ৃ'].includes(char); }

function getBijoyKeyForChar(char, index) {
    if (char === ' ') return { found: true, key: { code: 'Space', shift: false, charIndex: index } };
    
    // ম্যানুয়াল চেক (Security)
    if (char === 'ড়') return { found: true, key: { code: 'KeyP', shift: false, charIndex: index } };
    if (char === 'ঢ়') return { found: true, key: { code: 'KeyP', shift: true, charIndex: index } };
    if (char === 'য়') return { found: true, key: { code: 'KeyW', shift: true, charIndex: index } };
    if (char === 'ৎ') return { found: true, key: { code: 'Backslash', shift: false, charIndex: index } };

    for (const [key, val] of Object.entries(bengaliKeys)) {
        if (val.n === char) return { found: true, key: { code: key, shift: false, charIndex: index } };
        if (val.s === char) return { found: true, key: { code: key, shift: true, charIndex: index } };
    }
    return { found: false, key: null }; 
}

function getKeyFromChar(char) {
    if(/[0-9]/.test(char)) return { code: 'Digit' + char, shift: false };
    if(/[a-z]/.test(char)) return { code: 'Key' + char.toUpperCase(), shift: false };
    if(/[A-Z]/.test(char)) return { code: 'Key' + char, shift: true };
    if(char === ' ') return { code: 'Space', shift: false };
    const syms = {'!':'Digit1','@':'Digit2','#':'Digit3','$':'Digit4','%':'Digit5','^':'Digit6','&':'Digit7','*':'Digit8','(':'Digit9',')':'Digit0','-':'Minus','_':'Minus','=':'Equal','+':'Equal','[':'BracketLeft','{':'BracketLeft',']':'BracketRight','}':'BracketRight',';':'Semicolon',':':'Semicolon',"'":'Quote','"':'Quote',',':'Comma','<':'Comma','.':'Period','>':'Period','/':'Slash','?':'Slash'};
    if(syms[char]) return { code: syms[char], shift: ['!','@','#','$','%','^','&','*','(',')','_','+','{','}',':','"','<','>','?'].includes(char) };
    return { code: 'KeyA', shift: false };
}

// ==========================================
// ✅ BIJOY SEQUENCE BUILDER
// ==========================================
function buildBijoySequence(text) {
    text = text.normalize('NFC')
                .replace(/ড\u09BC/g, 'ড়')  
                .replace(/ঢ\u09BC/g, 'ঢ়')  
                .replace(/য\u09BC/g, 'য়'); 

    let sequence = [];
    let i = 0;

    while (i < text.length) {
        let char = text[i];
        let startIdx = i;

        if (independentVowels[char]) {
            independentVowels[char].forEach(step => 
                sequence.push({ ...step, charIndex: i, startIndex: i })
            );
            i++; continue;
        }

        if (isConsonant(char) || (char === 'র' && text[i+1] === '্')) {
            let hasRef = false;
            
            if (char === 'র' && text[i+1] === '্' && text[i+2] && isConsonant(text[i+2])) {
                hasRef = true;
                i += 2; char = text[i]; 
            }

            let clusterEnd = i;
            let tempIdx = i;
            while ((text[tempIdx+1] === '্' && text[tempIdx+2] && isConsonant(text[tempIdx+2]))) {
                tempIdx += 2; clusterEnd = tempIdx;
            }

            let vowelChar = text[clusterEnd + 1];
            let preVowelKey = null;
            let postVowelKey = null;
            let hasVowel = false;

            if (vowelChar && isPreBaseVowel(vowelChar)) {
                hasVowel = true;
                if (vowelChar === 'ো') {
                    preVowelKey = { code: 'KeyC', shift: false }; 
                    postVowelKey = { code: 'KeyF', shift: false };
                } else if (vowelChar === 'ৌ') {
                    preVowelKey = { code: 'KeyC', shift: false }; 
                    postVowelKey = { code: 'KeyX', shift: true }; 
                } else {
                    let vKey = getBijoyKeyForChar(vowelChar, clusterEnd + 1);
                    if (vKey.found) preVowelKey = vKey.key;
                }
            } 
            else if (vowelChar && isPostBaseVowel(vowelChar)) {
                hasVowel = true;
                let vKey = getBijoyKeyForChar(vowelChar, clusterEnd + 1);
                if (vKey.found) postVowelKey = vKey.key;
            }

            let commonIndex = hasVowel ? (clusterEnd + 1) : clusterEnd;

            if (preVowelKey) sequence.push({ ...preVowelKey, charIndex: commonIndex, startIndex: startIdx });

            let curr = i;
            while (curr <= clusterEnd) {
                let c = text[curr];
                let n = text[curr+1]; 
                let nn = text[curr+2]; 

                if (n === '্' && nn === 'র') {
                    let base = getBijoyKeyForChar(c, curr);
                    if(base.found) sequence.push({...base.key, charIndex: commonIndex, startIndex: startIdx});
                    sequence.push({ code: 'KeyZ', shift: false, charIndex: commonIndex, startIndex: startIdx }); 
                    curr += 3; continue;
                }
                if (n === '্' && nn === 'য') {
                    let base = getBijoyKeyForChar(c, curr);
                    if(base.found) sequence.push({...base.key, charIndex: commonIndex, startIndex: startIdx});
                    sequence.push({ code: 'KeyZ', shift: true, charIndex: commonIndex, startIndex: startIdx }); 
                    curr += 3; continue;
                }
                if (n === '্' && nn && isConsonant(nn)) {
                    let base = getBijoyKeyForChar(c, curr);
                    if(base.found) sequence.push({...base.key, charIndex: commonIndex, startIndex: startIdx});
                    sequence.push({ code: 'KeyG', shift: false, charIndex: commonIndex, startIndex: startIdx });
                    curr += 2; continue; 
                }
                let base = getBijoyKeyForChar(c, curr);
                if(base.found) sequence.push({...base.key, charIndex: commonIndex, startIndex: startIdx});
                curr++;
            }

            if (hasRef) sequence.push({ code: 'KeyA', shift: true, charIndex: commonIndex, startIndex: startIdx });
            if (postVowelKey) sequence.push({ ...postVowelKey, charIndex: commonIndex, startIndex: startIdx });

            i = clusterEnd + 1;
            if (hasVowel) i++; 
            continue;
        }

        let mapping = getBijoyKeyForChar(char, i);
        if (mapping.found && mapping.key) {
            sequence.push({ ...mapping.key, charIndex: i, startIndex: startIdx });
        }
        i++;
    }
    return sequence;
}