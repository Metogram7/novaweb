// ============================================================
// NOVA CHAT — chat.js  (Tam & Temiz Sürüm)
// ============================================================

// --------------- SABİTLER ---------------
const BACKEND_URL     = 'https://nova-chat-d50f.onrender.com/api';
const CURRENT_VERSION = '2.8 Pro';

const UPDATE_NOTES = [
    "🤓 NoVa daha çok zeki!",
    "👨‍🏫 NoVa daha çok eğitildi",
    "🪟 Arayüz güncellemesi.",
    "▶️ Play Store NoVa (çok yakında)!",
    "⬛ Koyu Tema!",
    "🟥 Nova Youtube: https://www.youtube.com/@AI_Nova_AI (gelişmeler)"
];

// --------------- GLOBAL DEĞİŞKENLER ---------------
const novaUserName = localStorage.getItem('nova_user');

let userId = localStorage.getItem('nova_user_id');
if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    localStorage.setItem('nova_user_id', userId);
}

let currentChat     = localStorage.getItem('nova_last_chat') || 'default';
let sending         = false;
let abortController = null;
let isTyping        = false;
let isResizing      = false;

let userInfo = JSON.parse(localStorage.getItem('nova_user_info_' + userId) || '{}');
userInfo.name = novaUserName;

let appSettings = JSON.parse(localStorage.getItem('nova_settings')) || {
    language: 'tr',
    primaryColor: '#00bfff',
    customInstructions: '',
    selectedVoiceURI: ''
};

// İsim yoksa girişe gönder
if (!novaUserName) { window.location.href = 'index.html'; }

// --------------- ÇEVİRİ SÖZLÜĞÜ ---------------
const translations = {
    tr: {
        settings_title: '⚙️ Nova Ayarları',
        lbl_language: 'Dil',
        lbl_instructions: 'Özel Talimatlar',
        lbl_memory: 'Kayıtlı Belleğim',
        lbl_theme_color: 'Tema Rengi',
        lbl_voice_select: 'Okuma Sesi',
        btn_save: 'Kaydet'
    },
    en: {
        settings_title: '⚙️ Nova Settings',
        lbl_language: 'Language',
        lbl_instructions: 'Custom Instructions',
        lbl_memory: 'My Memory',
        lbl_theme_color: 'Theme Color',
        lbl_voice_select: 'Voice Selection',
        btn_save: 'Save'
    }
};

// --------------- DOM REFERANSLARI (DOMContentLoaded'da doldurulur) ---------------
let sideMenu, menuToggle, dragHandle, chatsContainer, input, sendBtn, stopBtn;
let menu, novaStatus, quickBtns, emojiPicker, newChatBtn, themeToggle, toast;

// ============================================================
// GÜNCELLEME MODALI
// ============================================================
function checkAppUpdate() {
    const savedVersion  = localStorage.getItem('nova_app_version');
    const modal         = document.getElementById('updateModal');
    const listContainer = document.getElementById('updateList');
    const badge         = document.getElementById('modalVersionBadge');
    if (!modal) return;
    if (savedVersion !== CURRENT_VERSION) {
        if (badge) badge.textContent = 'V' + CURRENT_VERSION;
        if (listContainer) {
            let html = '<ul>';
            UPDATE_NOTES.forEach(note => { html += `<li>${note}</li>`; });
            html += '</ul>';
            listContainer.innerHTML = html;
        }
        modal.style.display = 'flex';
    }
}

function closeUpdateModal() {
    const m = document.getElementById('updateModal');
    if (m) m.style.display = 'none';
    localStorage.setItem('nova_app_version', CURRENT_VERSION);
}

// ============================================================
// NOVA AKTİFLİK ANİMASYONU
// ============================================================
function showNovaActivePulse() {
    const pulse = document.getElementById('nova-active-pulse');
    if (!pulse) return;
    pulse.classList.add('active');
    clearTimeout(pulse._timeout);
    pulse._timeout = setTimeout(() => pulse.classList.remove('active'), 600);
}

// ============================================================
// SPLASH EKRANI
// ============================================================
function initSplash() {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;
    setTimeout(() => {
        splash.classList.add('fade-out');
        setTimeout(() => { splash.style.display = 'none'; }, 800);
    }, 1800);
}

// ============================================================
// TEMA
// ============================================================
function initTheme() {
    const saved = localStorage.getItem('nova_theme');
    if (saved === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// ============================================================
// AYARLAR
// ============================================================
function openSettings() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    modal.style.display = 'flex';

    document.getElementById('customInstructions').value = appSettings.customInstructions || '';
    document.getElementById('primaryColorPicker').value = appSettings.primaryColor || '#00bfff';
    document.getElementById('languageSelect').value     = appSettings.language || 'tr';

    const mv = document.getElementById('memoryViewer');
    if (mv) {
        try {
            const raw = localStorage.getItem('nova_user_info_' + userId) || '{}';
            mv.value = JSON.stringify(JSON.parse(raw), null, 2);
        } catch(e) { mv.value = '{}'; }
    }

    loadVoices();
}

function closeSettings() {
    const m = document.getElementById('settingsModal');
    if (m) m.style.display = 'none';
}

function saveSettings() {
    appSettings.language           = document.getElementById('languageSelect').value;
    appSettings.customInstructions = document.getElementById('customInstructions').value;
    appSettings.primaryColor       = document.getElementById('primaryColorPicker').value;

    const vs = document.getElementById('voiceSelect');
    if (vs) appSettings.selectedVoiceURI = vs.value;

    const mv = document.getElementById('memoryViewer');
    if (mv) {
        try {
            const updatedMemory = JSON.parse(mv.value);
            localStorage.setItem('nova_user_info_' + userId, JSON.stringify(updatedMemory));
        } catch(e) {
            alert('Bellek formatı hatalı!');
            return;
        }
    }

    localStorage.setItem('nova_settings', JSON.stringify(appSettings));
    applySettings();
    closeSettings();
    showToast('Ayarlar kaydedildi ✅');
}

function applySettings() {
    document.documentElement.style.setProperty('--accent-color', appSettings.primaryColor);
    document.documentElement.style.setProperty('--primary-color', appSettings.primaryColor);

    const lang = appSettings.language;
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (translations[lang] && translations[lang][key]) el.textContent = translations[lang][key];
    });
}

function loadVoices() {
    const voiceSelect = document.getElementById('voiceSelect');
    if (!voiceSelect) return;
    const voices = window.speechSynthesis.getVoices();
    voiceSelect.innerHTML = voices.map(v =>
        `<option value="${v.voiceURI}" ${v.voiceURI === appSettings.selectedVoiceURI ? 'selected' : ''}>${v.name} (${v.lang})</option>`
    ).join('');
}

function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(v => v.voiceURI === appSettings.selectedVoiceURI);
    window.speechSynthesis.speak(utterance);
}

// ============================================================
// TOAST BİLDİRİM
// ============================================================
function showToast(msg, duration = 2800) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show', 'visible');
    clearTimeout(t._to);
    t._to = setTimeout(() => t.classList.remove('show', 'visible'), duration);
}

// ============================================================
// TARİH / ZAMAN FORMATLAMA
// ============================================================
function getFormattedDate() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function formatDate(d) {
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0') + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0');
}

// ============================================================
// SOHBET MENÜSÜ
// ============================================================
function renderMenu() {
    if (!document.querySelector(`button[data-id="${currentChat}"]`)) {
        addChatToMenu(currentChat, 'Mevcut Sohbet');
    }
}

function addChatToMenu(chatId, lastMessage = 'Yeni Sohbet') {
    if (!menu) return;
    if ([...menu.querySelectorAll('.chatBtn')].some(b => b.dataset.id === chatId)) return;

    const row = document.createElement('div');
    row.className = 'chatRow';

    const chatBtn = document.createElement('button');
    chatBtn.className = 'chatBtn';
    chatBtn.dataset.id = chatId;
    chatBtn.onclick = () => {
        loadChat(chatId);
        if (sideMenu) sideMenu.classList.remove('active');
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'deleteBtn';
    deleteBtn.textContent = '❌';
    deleteBtn.onclick = async () => {
        if (!confirm('Bu sohbeti silmek istediğine emin misin?')) return;
        try {
            const res  = await fetch(`${BACKEND_URL}/delete_chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, chatId })
            });
            const data = await res.json();
            if (data.success || true) {
                row.remove();
                const div = document.getElementById(chatId);
                if (div) div.remove();
                if (currentChat === chatId) startNewChat();
                showToast('Sohbet silindi');
            } else {
                showToast('Silme başarısız: ' + (data.error || ''));
            }
        } catch (err) {
            console.error(err);
            showToast('Silme hatası (Yerel siliniyor)');
            row.remove();
        }
    };

    row.appendChild(chatBtn);
    row.appendChild(deleteBtn);
    menu.appendChild(row);
    updateChatBtnLabel(chatBtn, lastMessage);
}

function updateChatBtnLabel(button, lastMessage) {
    if (!button) return;
    if (lastMessage.length > 20) lastMessage = lastMessage.slice(0, 20) + '...';
    button.textContent = lastMessage;
}

function loadChat(cid) {
    currentChat = cid;
    localStorage.setItem('nova_last_chat', cid);

    if (chatsContainer) Array.from(chatsContainer.children).forEach(c => c.style.display = 'none');

    let div = document.getElementById(cid);
    if (!div) {
        div = document.createElement('div');
        div.className = 'chatDiv';
        div.id = cid;
        if (chatsContainer) chatsContainer.appendChild(div);
    }
    div.style.display = 'flex';

    fetch(`${BACKEND_URL}/history?userId=${userId}`)
        .then(r => r.json())
        .then(data => {
            const msgs = data[cid] || [];
            if (div.innerHTML === '') {
                msgs.forEach(m => {
                    const text   = m.message || m.text || '';
                    const msgDiv = addMessage(text, m.sender, div);
                    if (msgDiv) {
                        const content = msgDiv.querySelector('.message-content');
                        if (content) {
                            content.innerHTML = formatTextWithCodeBlocks(text);
                            content.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
                        }
                    }
                });
            }
            toggleWelcomeScreen();
        })
        .catch(() => {
            console.log('Geçmiş yüklenemedi veya boş.');
            toggleWelcomeScreen();
        });
}

function startNewChat() {
    const newId = 'chat_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    addChatToMenu(newId, 'Yeni Sohbet');
    loadChat(newId);
    showToast('Yeni sohbet başlatıldı 🚀');
}

function toggleWelcomeScreen() {
    const chat    = document.getElementById(currentChat);
    const welcome = document.getElementById('welcome-screen');
    if (!chat || !welcome) return;

    const isChatEmpty = chat.children.length === 0;
    const isVisible   = welcome.classList.contains('visible');

    if ((isChatEmpty && isVisible) || (!isChatEmpty && !isVisible)) return;

    if (isChatEmpty) {
        welcome.style.display = 'flex';
        requestAnimationFrame(() => welcome.classList.add('visible'));
    } else {
        welcome.classList.remove('visible');
        setTimeout(() => {
            if (!welcome.classList.contains('visible')) welcome.style.display = 'none';
        }, 400);
    }
}

// ============================================================
// MESAJ EKLEME
// ============================================================
function addMessage(text, sender, container = null) {
    const parent = container || document.getElementById(currentChat);
    if (!parent) return null;

    const div = document.createElement('div');
    div.className = 'msg ' + sender;

    // Hoşgeldin ekranını gizle
    const welcome = document.getElementById('welcome-screen-' + currentChat) || document.getElementById('welcome-screen');
    if (welcome) {
        welcome.style.display = 'none';
        welcome.classList.remove('visible');
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-content';
    messageDiv.textContent = text;
    div.appendChild(messageDiv);

    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = formatDate(new Date());
    div.appendChild(timestamp);

    parent.appendChild(div);
    parent.scroll({ top: parent.scrollHeight, behavior: 'smooth' });

    requestAnimationFrame(() => {
        toggleWelcomeScreen();
        showNovaActivePulse();
    });

    return div;
}

// ============================================================
// YAZMA EFEKTİ (TYPEWRITER) — Renklendirme Destekli
// ============================================================
async function addTypingMessage(text, sender, container = null, delay = 5) {
    const parent = container || document.getElementById(currentChat);
    if (!parent) return;

    const div = document.createElement('div');
    div.className = 'msg ' + sender;
    parent.appendChild(div);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    div.appendChild(contentDiv);

    parent.scroll({ top: parent.scrollHeight, behavior: 'smooth' });

    isTyping = true;
    let tempText = '';
    const dynamicDelay = text.length > 500 ? 1 : delay;

    for (let i = 0; i < text.length; i++) {
        if (!isTyping) break;
        tempText += text[i];
        contentDiv.textContent = tempText;
        if (i % 5 === 0) parent.scroll({ top: parent.scrollHeight, behavior: 'smooth' });
        await new Promise(r => setTimeout(r, dynamicDelay));
    }

    // Yazma bitti → formatla ve renklendir
    contentDiv.innerHTML = formatTextWithCodeBlocks(text);
    contentDiv.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));

    if (typeof linkifyElementOpenExternally === 'function') {
        linkifyElementOpenExternally(contentDiv);
    }

    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = formatDate(new Date());
    div.appendChild(timestamp);

    if (sender === 'nova') {
        addSpeechButton(div, text);
        addDownloadButton(div);
    }

    parent.scroll({ top: parent.scrollHeight, behavior: 'smooth' });
    isTyping = false;
    return div;
}

// ============================================================
// SESLİ OKUMA
// ============================================================
function speakText(text) {
    const cleanText = cleanTextForSpeech(text);
    if (!cleanText) return;

    const synth = window.speechSynthesis;
    if (synth.speaking) synth.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang  = 'tr-TR';
    utterance.rate  = 1;
    utterance.pitch = 1;

    const speakNow = () => {
        const voices  = synth.getVoices();
        const trVoice = voices.find(v => v.lang === 'tr-TR' || v.lang.startsWith('tr'));
        if (trVoice) utterance.voice = trVoice;
        synth.speak(utterance);
    };

    if (!synth.getVoices().length) {
        synth.onvoiceschanged = () => speakNow();
    } else {
        speakNow();
    }
}

function addSpeechButton(div, text) {
    const btn   = document.createElement('button');
    btn.textContent = '🔉';
    btn.className   = 'speak-btn';
    btn.title       = 'Mesajı sesli oku';

    const synth  = window.speechSynthesis;
    let isSpeaking = false;
    let utterance  = null;

    btn.addEventListener('click', () => {
        if (isSpeaking) {
            synth.cancel();
            isSpeaking = false;
            btn.textContent = '🔉';
            showToast('⏸️ Okuma durduruldu');
            return;
        }

        const cleanText = cleanTextForSpeech(text);
        if (!cleanText) { showToast('⚠️ Okunacak metin yok'); return; }

        utterance       = new SpeechSynthesisUtterance(cleanText);
        utterance.lang  = 'tr-TR';
        utterance.rate  = 1;
        utterance.pitch = 1;

        const voices  = synth.getVoices();
        const trVoice = voices.find(v => v.lang === 'tr-TR' || v.lang.startsWith('tr'));
        if (trVoice) utterance.voice = trVoice;

        synth.cancel();
        synth.speak(utterance);

        btn.textContent = '⏸️';
        isSpeaking      = true;
        showToast('🔊 Nova konuşuyor...');

        utterance.onend = () => {
            isSpeaking = false;
            btn.textContent = '🔉';
            showToast('✅ Okuma tamamlandı');
        };
        utterance.onerror = () => {
            isSpeaking = false;
            btn.textContent = '🔉';
            showToast('⚠️ Sesli okuma hatası');
        };
    });

    div.appendChild(btn);
}

// ============================================================
// TXT İNDİR BUTONU
// ============================================================
function addDownloadButton(div) {
    const downloadBtn       = document.createElement('button');
    downloadBtn.textContent = '💾 TXT indir';
    downloadBtn.className   = 'download-btn';
    downloadBtn.style.marginTop = '5px';
    downloadBtn.style.fontSize  = '12px';
    downloadBtn.style.padding   = '2px 6px';
    downloadBtn.style.cursor    = 'pointer';

    downloadBtn.onclick = () => {
        const txt = [...div.querySelectorAll('.message-content')].map(m => m.textContent).join('\n\n');
        if (!txt) return;
        const blob = new Blob([txt], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href     = URL.createObjectURL(blob);
        link.download = 'nova_message.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    div.appendChild(downloadBtn);
}

// ============================================================
// HATA MESAJI
// ============================================================
function showErrorMessage(errorText, lastUserMessage) {
    const chatDiv = document.getElementById(currentChat);
    if (!chatDiv) { console.error('Chat elementi bulunamadı.'); return; }

    const errorDiv       = document.createElement('div');
    errorDiv.className   = 'error-message';
    errorDiv.innerHTML   = `
        <div class="error-text">⚠️ ${errorText}</div>
        <button class="retry-btn">🔄 Yeniden Dene</button>
    `;

    const retryBtn = errorDiv.querySelector('.retry-btn');
    retryBtn.addEventListener('click', () => {
        errorDiv.remove();
        if (lastUserMessage && typeof sendMessage === 'function') sendMessage(lastUserMessage);
    });

    chatDiv.appendChild(errorDiv);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

// ============================================================
// METİN FORMATLAMA
// ============================================================
function formatTextWithCodeBlocks(text) {
    return text
        .replace(/```(\w*)?\n?([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'text';
            const safeCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `
        <div class="code-window">
            <div class="code-header">
                <span>${language}</span>
                <button class="copy-btn-code" onclick="copyCodeToClipboard(this)">📋 Kopyala</button>
            </div>
            <pre><code class="language-${language}">${safeCode}</code></pre>
        </div>`;
        });
}

function copyCodeToClipboard(btn) {
    const codeElement = btn.parentElement.nextElementSibling.querySelector('code');
    const codeText    = codeElement.innerText;

    navigator.clipboard.writeText(codeText).then(() => {
        const originalText = btn.textContent;
        btn.textContent    = '✅ Kopyalandı';
        btn.style.background = '#2e7d32';
        setTimeout(() => {
            btn.textContent      = originalText;
            btn.style.background = '#3a3f4b';
        }, 2000);
    }).catch(err => console.error('Kopyalama hatası:', err));
}

// ============================================================
// METİN TEMİZLEME (ses için)
// ============================================================
function cleanTextForSpeech(text) {
    return text
        .replace(/[\p{Emoji_Presentation}\p{Emoji}\p{Extended_Pictographic}]/gu, '')
        .replace(/[^0-9a-zA-ZğüşıöçĞÜŞİÖÇ\s.,!?]/g, '')
        .replace(/,/g, ', ')
        .replace(/\./g, '. ')
        .trim();
}

// ============================================================
// SANİTİZE
// ============================================================
function sanitize(str) {
    const temp = document.createElement('div');
    temp.innerHTML = str;
    temp.querySelectorAll('a').forEach(a => {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
    });
    return temp.innerHTML;
}

// ============================================================
// LİNKİFY (PWA + Android fallback'li tam sürüm)
// ============================================================
function linkifyElementOpenExternally(element) {
    if (!element) return;

    const urlRegex = /(?:(?:https?:\/\/)|(?:www\.))[\w\-._~:/?#[\]@!$&'()*+,;=%]+/gi;

    const walker    = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    for (const textNode of textNodes) {
        const text = textNode.nodeValue;
        if (!text) continue;
        if (!urlRegex.test(text)) { urlRegex.lastIndex = 0; continue; }
        urlRegex.lastIndex = 0;

        const frag = document.createDocumentFragment();
        let lastIndex = 0;
        let match;

        while ((match = urlRegex.exec(text)) !== null) {
            const urlText = match[0];
            const start   = match.index;
            const end     = urlRegex.lastIndex;

            if (start > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, start)));

            let href = urlText;
            if (/^www\./i.test(href)) href = 'http://' + href;

            const trailingPunctMatch = href.match(/([)\].,;:!?]+)$/);
            let trailing = '';
            if (trailingPunctMatch) {
                trailing = trailingPunctMatch[1];
                href     = href.slice(0, -trailing.length);
            }

            const a = document.createElement('a');
            a.href        = href;
            a.textContent = urlText.replace(/([)\].,;:!?]+)$/, '');
            a.setAttribute('rel', 'noopener noreferrer');
            a.addEventListener('click', function(ev) {
                if (ev.ctrlKey || ev.metaKey || ev.button === 1) return;
                ev.preventDefault();
                openExternally(href);
            }, { passive: false });

            frag.appendChild(a);
            if (trailing) frag.appendChild(document.createTextNode(trailing));
            lastIndex = end;
        }

        if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)));
        textNode.parentNode.replaceChild(frag, textNode);
        urlRegex.lastIndex = 0;
    }
}

function openExternally(url) {
    if (!/^((https?:)|(mailto:)|(tel:))/.test(url)) url = 'https://' + url;

    try {
        const newWin = window.open(url, '_blank', 'noopener,noreferrer');
        if (newWin) return;
    } catch(e) {}

    const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
                         || window.navigator.standalone === true;
    if (isStandalone) { window.location.href = url; return; }

    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
        try {
            const intentUrl = 'intent://' + url.replace(/^https?:\/\//, '') +
                              '#Intent;scheme=https;package=com.android.chrome;end';
            window.location.href = intentUrl;
            return;
        } catch(e) {}
    }

    window.top.location.href = url;
}

// ============================================================
// MESAJ GÖNDERME
// ============================================================
async function sendMessage(msg = null) {
    if (sending) return;

    const text = msg || (input ? input.value.trim() : '');
    if (!text) return;

    sending = true;
    if (input) { input.value = ''; input.style.height = 'auto'; }

    const chatDiv = document.getElementById(currentChat);
    if (!chatDiv) { sending = false; return; }

    addMessage(text, 'user', chatDiv);

    const menuBtn = document.querySelector(`button[data-id="${currentChat}"]`);
    if (menuBtn) updateChatBtnLabel(menuBtn, text);

    const typingDiv       = document.createElement('div');
    typingDiv.className   = 'msg nova typing-indicator';
    typingDiv.innerHTML   = '<div class="message-content">Nova düşünüyor... <span class="loader"></span></div>';
    chatDiv.appendChild(typingDiv);
    chatDiv.scrollTop = chatDiv.scrollHeight;

    if (novaStatus) novaStatus.textContent = 'Nova düşünüyor...';

    abortController = new AbortController();

    try {
        const payload = {
            userId,
            currentChat,
            message: text,
            userInfo,
            systemPrompt:      appSettings.customInstructions || '',
            systemInstruction: appSettings.customInstructions || '',
            settings: appSettings
        };

        const res = await fetch(`${BACKEND_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: abortController.signal
        });

        typingDiv.remove();

        if (!res.ok) { showErrorMessage('Sunucu hatası: ' + res.status, text); return; }

        const data = await res.json();

        if (data.response) {
            await addTypingMessage(data.response, 'nova', chatDiv);
        } else {
            showErrorMessage('Boş yanıt alındı.', text);
        }

        if (data.updatedUserInfo) {
            userInfo = data.updatedUserInfo;
            localStorage.setItem('nova_user_info_' + userId, JSON.stringify(userInfo));
        }

    } catch(err) {
        typingDiv.remove();
        if (err.name === 'AbortError') {
            showToast('⚠️ İşlem kullanıcı tarafından durduruldu.');
            addMessage('🛑 İşlem durduruldu.', 'nova', chatDiv);
        } else {
            console.error(err);
            showErrorMessage('Bağlantı hatası: ' + err.message, text);
        }
    } finally {
        sending = false;
        if (novaStatus) novaStatus.textContent = 'Hazır';
        abortController = null;
    }
}

// ============================================================
// FİREBASE BİLDİRİM
// ============================================================
async function initNovaNotifications() {
    try {
        if (typeof firebase === 'undefined') return;

        const firebaseConfig = {
            apiKey:            'AIzaSyDqQAHCB2MizgN5Id5Ezfr3UPE1P3UlSS8',
            authDomain:        'nova-329c7.firebaseapp.com',
            projectId:         'nova-329c7',
            storageBucket:     'nova-329c7.firebasestorage.app',
            messagingSenderId: '284547967902',
            appId:             '1:284547967902:web:7dd2e64d1a643a30e5c48f'
        };

        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

        const messaging    = firebase.messaging();
        const permission   = await Notification.requestPermission();
        if (permission !== 'granted') { console.log('Bildirim izni reddedildi.'); return; }

        console.log('Bildirim izni verildi.');

        const reg   = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const token = await messaging.getToken({
            serviceWorkerRegistration: reg,
            vapidKey: 'BDMDVEtUfabWh6LAnM15zLGcK2R-1kxuSvjwegdx0q-I46l9GnBSSKimwAoIxUhOxh5QtRxAtt0Hj9PBl19qlxU'
        });

        if (token) {
            await fetch(`${BACKEND_URL}/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            console.log('Nova Token kaydedildi.');
        }
    } catch(error) {
        console.error('Bildirim hatası:', error);
    }
}

function subscribeUserToTopic(token) {
    console.log('Kullanıcı bildirim havuzuna dahil edildi.');
}

// ============================================================
// SAYFA BAŞLATMA — DOMContentLoaded
// ============================================================
window.addEventListener('DOMContentLoaded', () => {

    // --- DOM referanslarını al ---
    sideMenu       = document.getElementById('sideMenu');
    menuToggle     = document.getElementById('menuToggle');
    dragHandle     = document.getElementById('dragHandle');
    chatsContainer = document.getElementById('chatsContainer');
    input          = document.getElementById('input');
    sendBtn        = document.getElementById('sendBtn');
    stopBtn        = document.getElementById('stopBtn');
    menu           = document.getElementById('menu');
    novaStatus     = document.getElementById('novaStatus');
    quickBtns      = document.getElementById('quickBtns');
    emojiPicker    = document.getElementById('emojiPicker');
    newChatBtn     = document.getElementById('newChatBtn');
    themeToggle    = document.getElementById('themeToggle');
    toast          = document.getElementById('toast');

    // --- Başlangıç işlemleri ---
    initSplash();
    initTheme();
    applySettings();
    setTimeout(checkAppUpdate, 1000);
    window.addEventListener('load', initNovaNotifications);
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Sohbeti ve menüyü yükle
    renderMenu();
    loadChat(currentChat);
    setTimeout(toggleWelcomeScreen, 500);

    // Mevcut mesajları linkify et
    document.querySelectorAll('.message-content').forEach(el => linkifyElementOpenExternally(el));

    // --- Tema toggle ---
    if (themeToggle) {
        themeToggle.onclick = () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('nova_theme', isDark ? 'dark' : 'light');
            showToast(isDark ? '🌙 Karanlık Mod Açık' : '☀️ Aydınlık Mod Açık');
        };
    }

    // --- Menü aç/kapat ---
    if (menuToggle) menuToggle.onclick = () => { if (sideMenu) sideMenu.classList.toggle('active'); };

    // --- Drag handle (yan menü boyutu) ---
    if (dragHandle) {
        dragHandle.addEventListener('mousedown', () => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
        });
        document.addEventListener('mousemove', e => {
            if (!isResizing) return;
            let newWidth = e.clientX;
            if (newWidth < 150) newWidth = 150;
            if (newWidth > 500) newWidth = 500;
            if (sideMenu) sideMenu.style.width = newWidth + 'px';
        });
        document.addEventListener('mouseup', () => {
            if (isResizing) { isResizing = false; document.body.style.cursor = 'default'; }
        });
    }

    // --- Yeni sohbet ---
    if (newChatBtn) newChatBtn.addEventListener('click', e => { e.preventDefault(); startNewChat(); });

    // --- Gönder ---
    if (sendBtn) sendBtn.addEventListener('click', e => { e.preventDefault(); sendMessage(); });

    // --- Durdur ---
    if (stopBtn) stopBtn.addEventListener('click', e => {
        e.preventDefault();
        if (abortController) { abortController.abort(); abortController = null; }
        isTyping = false;
        showToast('Durduruluyor...');
    });

    // --- Input (Enter & auto-resize) ---
    if (input) {
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
        });
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = input.scrollHeight + 'px';
        });
    }

    // --- Hızlı butonlar ---
    if (quickBtns) {
        quickBtns.querySelectorAll('button').forEach(b => {
            b.addEventListener('click', e => { e.preventDefault(); sendMessage(b.textContent); });
        });
    }

    // --- Emoji picker ---
    if (emojiPicker) {
        emojiPicker.innerHTML = '';
        '😀😂😍😎🤔😢❤️🤖'.split('').forEach(e => {
            const span       = document.createElement('span');
            span.textContent = e;
            span.onclick     = () => { if (input) { input.value += e; input.focus(); } };
            emojiPicker.appendChild(span);
        });
    }
});