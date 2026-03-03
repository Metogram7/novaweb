// ============================================================
// chat.js — Nova AI Chat Frontend (Temizlenmiş & Birleştirilmiş)
// ============================================================

// ------------------------------------
// GÜNCELLEME NOTLARI SİSTEMİ
// ------------------------------------
const CURRENT_VERSION = "2.8 Pro";

const UPDATE_NOTES = [
    "🤓 NoVa daha çok zeki !",
    "👨‍🏫 NoVa daha çok eğitildi",
    "🪟 Arayüz güncellemesi.",
    "▶️ Play Store NoVa (son 11 gün!) !",
    "⬛ Koyu Tema!",
    "🟥 Nova Youtube : https://www.youtube.com/@AI_Nova_AI (gelişmeler)"
];

function checkAppUpdate() {
    const savedVersion = localStorage.getItem('nova_app_version');
    const modal = document.getElementById('updateModal');
    const listContainer = document.getElementById('updateList');
    const badge = document.getElementById('modalVersionBadge');
    if (!modal || !listContainer || !badge) return;

    if (savedVersion !== CURRENT_VERSION) {
        badge.textContent = "V" + CURRENT_VERSION;
        let htmlList = "<ul>";
        UPDATE_NOTES.forEach(note => { htmlList += `<li>${note}</li>`; });
        htmlList += "</ul>";
        listContainer.innerHTML = htmlList;
        modal.style.display = 'flex';
    }
}

function closeUpdateModal() {
    const modal = document.getElementById('updateModal');
    if (modal) modal.style.display = 'none';
    localStorage.setItem('nova_app_version', CURRENT_VERSION);
}

// ------------------------------------
// SABİTLER
// ------------------------------------
const BACKEND_URL = 'https://nova-chat-d50f.onrender.com/api';

// ------------------------------------
// KULLANICI KONTROLÜ
// ------------------------------------
const novaUserName = localStorage.getItem("nova_user");
if (!novaUserName) {
    window.location.href = "index.html";
}

let userId = localStorage.getItem("nova_user_id");
if (!userId) {
    userId = "user_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    localStorage.setItem("nova_user_id", userId);
}

// ------------------------------------
// UYGULAMA AYARLARI
// ------------------------------------
let appSettings = JSON.parse(localStorage.getItem("nova_settings")) || {
    language: "tr",
    primaryColor: "#00bfff",
    customInstructions: "",
    selectedVoiceURI: ""
};

let userInfo = JSON.parse(localStorage.getItem("nova_user_info_" + userId) || "{}");
userInfo.name = novaUserName;

// ------------------------------------
// ÇEVIRI SÖZLÜKlÜ
// ------------------------------------
const translations = {
    tr: { settings_title: "⚙️ Nova Ayarları", lbl_language: "Dil", lbl_instructions: "Özel Talimatlar", lbl_memory: "Kayıtlı Belleğim", lbl_theme_color: "Tema Rengi", lbl_voice_select: "Okuma Sesi", btn_save: "Kaydet" },
    en: { settings_title: "⚙️ Nova Settings", lbl_language: "Language", lbl_instructions: "Custom Instructions", lbl_memory: "My Memory", lbl_theme_color: "Theme Color", lbl_voice_select: "Voice Selection", btn_save: "Save" }
};

// ------------------------------------
// UYGULAMA DEĞİŞKENLERİ
// ------------------------------------
let currentChat = localStorage.getItem("nova_last_chat") || "default";
let sending = false;
let abortController = null;
let isTyping = false;
let isResizing = false;

// ------------------------------------
// TOAST BİLDİRİM
// ------------------------------------
function showToast(message, duration = 2500) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove("visible"), duration);
}

// ------------------------------------
// NOVA AKTİFLİK ANİMASYONU
// ------------------------------------
function showNovaActivePulse() {
    const pulse = document.getElementById("nova-active-pulse");
    if (!pulse) return;
    pulse.classList.add("active");
    clearTimeout(pulse._timeout);
    pulse._timeout = setTimeout(() => pulse.classList.remove("active"), 600);
}

// ------------------------------------
// HOŞGELDİN EKRANI KONTROLÜ
// ------------------------------------
function toggleWelcomeScreen() {
    const chat = document.getElementById(currentChat);
    const welcome = document.getElementById("welcome-screen");
    if (!chat || !welcome) return;

    if (chat.children.length === 0) {
        welcome.style.display = "flex";
        requestAnimationFrame(() => welcome.classList.add("visible"));
    } else {
        welcome.classList.remove("visible");
        setTimeout(() => {
            if (!welcome.classList.contains("visible")) welcome.style.display = "none";
        }, 400);
    }
}

// ------------------------------------
// METİN TEMİZLEME (Sesli okuma için)
// ------------------------------------
function cleanTextForSpeech(text) {
    return text
        .replace(/[\p{Emoji_Presentation}\p{Emoji}\p{Extended_Pictographic}]/gu, "")
        .replace(/[^0-9a-zA-ZğüşıöçĞÜŞİÖÇ\s.,!?]/g, "")
        .replace(/,/g, ", ")
        .replace(/\./g, ". ")
        .trim();
}

// ------------------------------------
// SESLİ OKUMA
// ------------------------------------
function speakText(text) {
    const cleanText = cleanTextForSpeech(text);
    if (!cleanText) return;
    const synth = window.speechSynthesis;
    if (synth.speaking) synth.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "tr-TR";
    utterance.rate = 1;
    utterance.pitch = 1;
    const speakNow = () => {
        let voices = synth.getVoices();
        const trVoice = voices.find(v => v.lang === "tr-TR" || v.lang.startsWith("tr"));
        if (trVoice) utterance.voice = trVoice;
        synth.speak(utterance);
    };
    if (!synth.getVoices().length) { synth.onvoiceschanged = () => speakNow(); } else { speakNow(); }
}

function addSpeechButton(div, text) {
    const btn = document.createElement("button");
    btn.textContent = "🔉";
    btn.className = "speak-btn";
    btn.title = "Mesajı sesli oku";
    const synth = window.speechSynthesis;
    let isSpeaking = false;
    btn.addEventListener("click", () => {
        if (isSpeaking) { synth.cancel(); isSpeaking = false; btn.textContent = "🔉"; showToast("⏸️ Okuma durduruldu"); return; }
        const cleanText = cleanTextForSpeech(text);
        if (!cleanText) return showToast("⚠️ Okunacak metin yok");
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "tr-TR";
        const voices = synth.getVoices();
        const trVoice = voices.find(v => v.lang === "tr-TR" || v.lang.startsWith("tr"));
        if (trVoice) utterance.voice = trVoice;
        synth.cancel(); synth.speak(utterance);
        btn.textContent = "⏸️"; isSpeaking = true; showToast("🔊 Nova konuşuyor...");
        utterance.onend = () => { isSpeaking = false; btn.textContent = "🔉"; showToast("✅ Okuma tamamlandı"); };
        utterance.onerror = () => { isSpeaking = false; btn.textContent = "🔉"; showToast("⚠️ Sesli okuma hatası"); };
    });
    div.appendChild(btn);
}

// ------------------------------------
// KOD BLOĞU VE METİN FORMATLAMA
// ------------------------------------
function formatTextWithCodeBlocks(text) {
    return text.replace(/```(\w*)?([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang || 'text';
        const safeCode = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
    navigator.clipboard.writeText(codeElement.innerText).then(() => {
        const originalText = btn.textContent;
        btn.textContent = "✅ Kopyalandı";
        btn.style.background = "#2e7d32";
        setTimeout(() => { btn.textContent = originalText; btn.style.background = "#3a3f4b"; }, 2000);
    }).catch(err => console.error('Kopyalama hatası:', err));
}

// ------------------------------------
// LİNKLERİ AKTİFLEŞTİRME
// ------------------------------------
function linkifyElementOpenExternally(element) {
    if (!element) return;
    const urlRegex = /(?:(?:https?:\/\/)|(?:www\.))[\w\-\._~:\/?#[\]@!$&'()*+,;=%]+/gi;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    for (const textNode of textNodes) {
        const text = textNode.nodeValue;
        if (!text) continue;
        if (!urlRegex.test(text)) { urlRegex.lastIndex = 0; continue; }
        urlRegex.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let lastIndex = 0, match;
        while ((match = urlRegex.exec(text)) !== null) {
            const urlText = match[0], start = match.index, end = urlRegex.lastIndex;
            if (start > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, start)));
            let href = urlText;
            if (/^www\./i.test(href)) href = 'http://' + href;
            const trailingPunctMatch = href.match(/([)\]\.,;:!?]+)$/);
            let trailing = '';
            if (trailingPunctMatch) { trailing = trailingPunctMatch[1]; href = href.slice(0, -trailing.length); }
            const a = document.createElement('a');
            a.href = href;
            a.textContent = urlText.replace(/([)\]\.,;:!?]+)$/, '');
            a.setAttribute('rel', 'noopener noreferrer');
            a.addEventListener('click', function (ev) {
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
    } catch (e) { /* ignore */ }
    const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    if (isStandalone) { window.location.href = url; return; }
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
        try {
            const intentUrl = 'intent://' + url.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end';
            window.location.href = intentUrl;
            return;
        } catch (e) { /* ignore */ }
    }
    window.top.location.href = url;
}

// ------------------------------------
// MESAJ EKLEME
// ------------------------------------
function addMessage(text, sender, container = null) {
    const parent = container || document.getElementById(currentChat);
    if (!parent) return;
    const div = document.createElement("div");
    div.className = "msg " + sender;
    const welcome = document.getElementById("welcome-screen");
    if (welcome) { welcome.style.display = "none"; welcome.classList.remove("visible"); }
    const messageDiv = document.createElement("div");
    messageDiv.className = "message-content";
    messageDiv.textContent = text;
    div.appendChild(messageDiv);
    const timestamp = document.createElement("div");
    timestamp.className = "timestamp";
    timestamp.textContent = formatDate(new Date());
    div.appendChild(timestamp);
    parent.appendChild(div);
    parent.scroll({ top: parent.scrollHeight, behavior: "smooth" });
    requestAnimationFrame(() => { toggleWelcomeScreen(); showNovaActivePulse(); });
    return div;
}

// ------------------------------------
// YAZMA EFEKTİ (TYPEWRITER)
// ------------------------------------
async function addTypingMessage(text, sender, container = null, delay = 5) {
    const parent = container || document.getElementById(currentChat);
    if (!parent) return;
    const div = document.createElement("div");
    div.className = "msg " + sender;
    parent.appendChild(div);
    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    div.appendChild(contentDiv);
    parent.scroll({ top: parent.scrollHeight, behavior: "smooth" });
    isTyping = true;
    let tempText = '';
    const dynamicDelay = text.length > 500 ? 1 : delay;
    for (let i = 0; i < text.length; i++) {
        if (!isTyping) break;
        tempText += text[i];
        contentDiv.textContent = tempText;
        if (i % 5 === 0) parent.scroll({ top: parent.scrollHeight, behavior: "smooth" });
        await new Promise(r => setTimeout(r, dynamicDelay));
    }
    contentDiv.innerHTML = formatTextWithCodeBlocks(text);
    contentDiv.querySelectorAll('pre code').forEach(block => { if (typeof hljs !== 'undefined') hljs.highlightElement(block); });
    linkifyElementOpenExternally(contentDiv);
    const timestamp = document.createElement("div");
    timestamp.className = "timestamp";
    timestamp.textContent = formatDate(new Date());
    div.appendChild(timestamp);
    if (sender === "nova") { addSpeechButton(div, text); addDownloadButton(div); }
    parent.scroll({ top: parent.scrollHeight, behavior: "smooth" });
    isTyping = false;
    return div;
}

// ------------------------------------
// İNDİR BUTONU
// ------------------------------------
function addDownloadButton(div) {
    const downloadBtn = document.createElement("button");
    downloadBtn.textContent = "💾 TXT indir";
    downloadBtn.className = "download-btn";
    downloadBtn.style.cssText = "margin-top:5px;font-size:12px;padding:2px 6px;cursor:pointer;";
    downloadBtn.onclick = () => {
        const txt = [...div.querySelectorAll(".message-content")].map(m => m.textContent).join("\n\n");
        if (!txt) return;
        const blob = new Blob([txt], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "nova_message.txt";
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };
    div.appendChild(downloadBtn);
}

// ------------------------------------
// HATA MESAJI
// ------------------------------------
function showErrorMessage(errorText, lastUserMessage) {
    const chatDiv = document.getElementById(currentChat);
    if (!chatDiv) return;
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.innerHTML = `<div class="error-text">⚠️ ${errorText}</div><button class="retry-btn">🔄 Yeniden Dene</button>`;
    const retryBtn = errorDiv.querySelector(".retry-btn");
    if (retryBtn) {
        retryBtn.addEventListener("click", () => { errorDiv.remove(); if (lastUserMessage) sendMessage(lastUserMessage); });
    }
    chatDiv.appendChild(errorDiv);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

// ------------------------------------
// YARDIMCI FONKSİYONLAR
// ------------------------------------
function formatDate(d) {
    return String(d.getHours()).padStart(2,'0') + ":" + String(d.getMinutes()).padStart(2,'0');
}

function sanitize(str) {
    const temp = document.createElement("div");
    temp.innerHTML = str;
    temp.querySelectorAll('a').forEach(a => { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer'); });
    return temp.innerHTML;
}

// ------------------------------------
// SOHBET YÖNETİMİ
// ------------------------------------
function addChatToMenu(chatId, lastMessage = "Yeni Sohbet") {
    const menu = document.getElementById("menu");
    if (!menu) return;
    if ([...menu.querySelectorAll(".chatBtn")].some(b => b.dataset.id === chatId)) return;
    const row = document.createElement("div"); row.className = "chatRow";
    const chatBtn = document.createElement("button"); chatBtn.className = "chatBtn"; chatBtn.dataset.id = chatId;
    chatBtn.onclick = () => { loadChat(chatId); document.getElementById("sideMenu")?.classList.remove("active"); };
    const deleteBtn = document.createElement("button"); deleteBtn.className = "deleteBtn"; deleteBtn.textContent = "❌";
    deleteBtn.onclick = async () => {
        if (!confirm("Bu sohbeti silmek istediğine emin misin?")) return;
        try {
            const res = await fetch(`${BACKEND_URL}/delete_chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, chatId }) });
            const data = await res.json();
            if (data.success || true) { row.remove(); const div = document.getElementById(chatId); if (div) div.remove(); if (currentChat === chatId) startNewChat(); showToast("Sohbet silindi"); }
        } catch (err) { row.remove(); showToast("Silme hatası (Yerel silindi)"); }
    };
    row.appendChild(chatBtn); row.appendChild(deleteBtn); menu.appendChild(row);
    updateChatBtnLabel(chatBtn, lastMessage);
}

function updateChatBtnLabel(button, lastMessage) {
    if (lastMessage.length > 20) lastMessage = lastMessage.slice(0, 20) + "...";
    button.textContent = lastMessage;
}

function loadChat(cid) {
    currentChat = cid;
    localStorage.setItem("nova_last_chat", cid);
    const chatsContainer = document.getElementById("chatsContainer");
    if (!chatsContainer) return;
    Array.from(chatsContainer.children).forEach(c => c.style.display = "none");
    let div = document.getElementById(cid);
    if (!div) { div = document.createElement("div"); div.className = "chatDiv"; div.id = cid; chatsContainer.appendChild(div); }
    div.style.display = "flex";
    fetch(`${BACKEND_URL}/history?userId=${userId}`)
        .then(r => r.json())
        .then(data => {
            const msgs = data[cid] || [];
            if (div.innerHTML === "") { msgs.forEach(m => addMessage(m.message || m.text, m.sender, div)); }
            toggleWelcomeScreen();
        })
        .catch(() => { toggleWelcomeScreen(); });
}

function startNewChat() {
    const newId = "chat_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    addChatToMenu(newId, "Yeni Sohbet");
    loadChat(newId);
    showToast("Yeni sohbet başlatıldı 🚀");
}

function renderMenu() {
    if (!document.querySelector(`button[data-id="${currentChat}"]`)) {
        addChatToMenu(currentChat, "Mevcut Sohbet");
    }
}

// ------------------------------------
// SUNUCU UYANDIRMA (Render cold start)
// ------------------------------------
async function warmUpServer() {
    try {
        await fetch(`${BACKEND_URL.replace('/api', '/')}`, { method: "GET", mode: "no-cors" });
    } catch (e) { /* sessizce hata al */ }
}

// ------------------------------------
// MESAJ GÖNDERME (retry + cold start destekli)
// ------------------------------------
async function sendMessage(msg = null) {
    if (sending) return;
    const text = msg || document.getElementById("input")?.value.trim();
    if (!text) return;
    sending = true;
    const inputEl = document.getElementById("input");
    if (inputEl) { inputEl.value = ""; inputEl.style.height = "auto"; }
    const chatDiv = document.getElementById(currentChat);
    if (!chatDiv) { sending = false; return; }
    addMessage(text, "user", chatDiv);
    updateChatBtnLabel(document.querySelector(`button[data-id="${currentChat}"]`), text);

    const typingDiv = document.createElement("div");
    typingDiv.className = "msg nova typing-indicator";
    typingDiv.innerHTML = '<div class="message-content">Nova düşünüyor... <span class="loader"></span></div>';
    chatDiv.appendChild(typingDiv);
    chatDiv.scrollTop = chatDiv.scrollHeight;

    const novaStatus = document.getElementById("novaStatus");
    if (novaStatus) novaStatus.textContent = "Nova düşünüyor...";

    abortController = new AbortController();

    const payload = {
        userId, currentChat, message: text, userInfo,
        systemPrompt: appSettings.customInstructions || "",
        settings: appSettings
    };

    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 70000; // Render cold start için 70 saniye

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        // Her denemede yeni bir AbortController + timeout oluştur
        const timeoutId = setTimeout(() => abortController.abort(), TIMEOUT_MS);

        try {
            if (attempt === 2) {
                typingDiv.querySelector(".message-content").textContent = "⏳ Sunucu uyandırılıyor, lütfen bekle...";
            } else if (attempt === 3) {
                typingDiv.querySelector(".message-content").textContent = "🔄 Son deneme yapılıyor...";
            }

            const res = await fetch(`${BACKEND_URL}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                signal: abortController.signal
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();
            typingDiv.remove();

            if (data.response) {
                await addTypingMessage(data.response, "nova", chatDiv);
            } else {
                showErrorMessage("Boş yanıt alındı.", text);
            }

            if (data.updatedUserInfo) {
                userInfo = data.updatedUserInfo;
                localStorage.setItem("nova_user_info_" + userId, JSON.stringify(userInfo));
            }

            // Başarılı — döngüden çık
            break;

        } catch (err) {
            clearTimeout(timeoutId);

            if (err.name === 'AbortError' && attempt < MAX_RETRIES) {
                abortController = new AbortController();
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            typingDiv.remove();

            if (err.name === 'AbortError' && !sending) {
                showToast("⚠️ İşlem durduruldu.");
                addMessage("🛑 İşlem durduruldu.", "nova", chatDiv);
            } else {
                // Hata tipini teşhis et
                let diagnosis = "";
                if (err.message === "Failed to fetch" || err.message === "Load failed" || err.message === "NetworkError when attempting to fetch resource.") {
                    diagnosis = "🔴 CORS veya ağ hatası — tarayıcı sunucuya bağlanamıyor. F12 → Console'a bak, kırmızı hata satırını paylaş.";
                } else if (err.name === 'AbortError') {
                    diagnosis = "⏱️ Sunucu 70 saniyede cevap vermedi (timeout).";
                } else if (err.message.includes("JSON")) {
                    diagnosis = "📄 Sunucu cevap verdi ama JSON formatı bozuk.";
                } else {
                    diagnosis = `❓ ${err.name}: ${err.message}`;
                }
                console.error(`[Nova] Deneme ${attempt}:`, err);
                showErrorMessage(diagnosis, text);
            }
            break;
        }
    }

    sending = false;
    if (novaStatus) novaStatus.textContent = "Hazır";
    abortController = null;
}

// ------------------------------------
// AYARLAR
// ------------------------------------
function loadVoices() {
    const voiceSelect = document.getElementById("voiceSelect");
    if (!voiceSelect) return;
    const voices = window.speechSynthesis.getVoices();
    voiceSelect.innerHTML = voices.map(v => `<option value="${v.voiceURI}" ${v.voiceURI === appSettings.selectedVoiceURI ? 'selected' : ''}>${v.name} (${v.lang})</option>`).join('');
}

function openSettings() {
    const modal = document.getElementById("settingsModal");
    if (!modal) return;
    modal.style.display = "flex";
    if (document.getElementById("customInstructions")) document.getElementById("customInstructions").value = appSettings.customInstructions || "";
    if (document.getElementById("primaryColorPicker")) document.getElementById("primaryColorPicker").value = appSettings.primaryColor || "#00bfff";
    if (document.getElementById("languageSelect")) document.getElementById("languageSelect").value = appSettings.language || "tr";
    const memoryViewer = document.getElementById("memoryViewer");
    if (memoryViewer) {
        const mem = localStorage.getItem("nova_user_info_" + userId) || "{}";
        try { memoryViewer.value = JSON.stringify(JSON.parse(mem), null, 2); } catch(e) { memoryViewer.value = "{}"; }
    }
    loadVoices();
}

function closeSettings() {
    const modal = document.getElementById("settingsModal");
    if (modal) modal.style.display = "none";
}

function saveSettings() {
    if (document.getElementById("languageSelect")) appSettings.language = document.getElementById("languageSelect").value;
    if (document.getElementById("customInstructions")) appSettings.customInstructions = document.getElementById("customInstructions").value;
    if (document.getElementById("primaryColorPicker")) appSettings.primaryColor = document.getElementById("primaryColorPicker").value;
    if (document.getElementById("voiceSelect")) appSettings.selectedVoiceURI = document.getElementById("voiceSelect").value;
    const memoryViewer = document.getElementById("memoryViewer");
    if (memoryViewer) {
        try {
            const updatedMemory = JSON.parse(memoryViewer.value);
            localStorage.setItem("nova_user_info_" + userId, JSON.stringify(updatedMemory));
        } catch(e) { alert("Bellek formatı hatalı!"); return; }
    }
    localStorage.setItem("nova_settings", JSON.stringify(appSettings));
    applySettings();
    closeSettings();
    showToast("Ayarlar kaydedildi ✅");
}

function applySettings() {
    document.documentElement.style.setProperty('--primary-color', appSettings.primaryColor);
    document.documentElement.style.setProperty('--accent-color', appSettings.primaryColor);
    const lang = appSettings.language;
    document.querySelectorAll("[data-lang]").forEach(el => {
        const key = el.getAttribute("data-lang");
        if (translations[lang] && translations[lang][key]) el.textContent = translations[lang][key];
    });
}

// Global erişim için
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.saveSettings = saveSettings;
window.closeUpdateModal = closeUpdateModal;
window.copyCodeToClipboard = copyCodeToClipboard;

// ------------------------------------
// FİREBASE BİLDİRİMLER
// ------------------------------------
async function initNovaNotifications() {
    try {
        if (typeof firebase === 'undefined') return;
        const firebaseConfig = {
            apiKey: "AIzaSyDqQAHCB2MizgN5Id5Ezfr3UPE1P3UlSS8",
            authDomain: "nova-329c7.firebaseapp.com",
            projectId: "nova-329c7",
            storageBucket: "nova-329c7.firebasestorage.app",
            messagingSenderId: "284547967902",
            appId: "1:284547967902:web:7dd2e64d1a643a30e5c48f"
        };
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        const messaging = firebase.messaging();
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            const token = await messaging.getToken({ serviceWorkerRegistration: reg, vapidKey: "BDMDVEtUfabWh6LAnM15zLGcK2R-1kxuSvjwegdx0q-I46l9GnBSSKimwAoIxUhOxh5QtRxAtt0Hj9PBl19qlxU" });
            if (token) {
                await fetch(`${BACKEND_URL}/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
            }
        }
    } catch (error) { console.error('Bildirim hatası:', error); }
}

// ------------------------------------
// SAYFA YÜKLENDİĞİNDE (TEK DOMContentLoaded)
// ------------------------------------
window.addEventListener("DOMContentLoaded", () => {
    // Splash ekranı
    const splash = document.getElementById("splash-screen");
    if (splash) {
        setTimeout(() => { splash.classList.add("fade-out"); setTimeout(() => (splash.style.display = "none"), 800); }, 1800);
    }

    // Tema yükle
    const savedTheme = localStorage.getItem("nova_theme");
    if (savedTheme === "dark") document.body.classList.add("dark-mode");
    else document.body.classList.remove("dark-mode");

    // Renk uygula
    document.documentElement.style.setProperty('--primary-color', appSettings.primaryColor);

    // Sohbeti yükle ve menüyü oluştur
    loadChat(currentChat);
    renderMenu();

    // Hoşgeldin ekranı
    setTimeout(toggleWelcomeScreen, 500);

    // Güncelleme notu kontrolü
    setTimeout(checkAppUpdate, 1000);

    // Bildirim izni
    window.addEventListener('load', initNovaNotifications);

    // Render sunucusunu önceden uyandır (cold start önleme)
    warmUpServer();

    // --- DOM Elemanları ---
    const sideMenu = document.getElementById("sideMenu");
    const menuToggle = document.getElementById("menuToggle");
    const dragHandle = document.getElementById("dragHandle");
    const input = document.getElementById("input");
    const sendBtn = document.getElementById("sendBtn");
    const stopBtn = document.getElementById("stopBtn");
    const newChatBtn = document.getElementById("newChatBtn");
    const themeToggle = document.getElementById("themeToggle");
    const quickBtns = document.getElementById("quickBtns");
    const emojiPicker = document.getElementById("emojiPicker");

    // Tema toggle
    if (themeToggle) {
        themeToggle.onclick = () => {
            document.body.classList.toggle("dark-mode");
            const isDark = document.body.classList.contains("dark-mode");
            localStorage.setItem("nova_theme", isDark ? "dark" : "light");
            showToast(isDark ? "🌙 Karanlık Mod Açık" : "☀️ Aydınlık Mod Açık");
        };
    }

    // Menü toggle
    if (menuToggle && sideMenu) menuToggle.onclick = () => sideMenu.classList.toggle("active");

    // Sürükleme (Drag Handle)
    if (dragHandle && sideMenu) {
        dragHandle.addEventListener("mousedown", () => { isResizing = true; document.body.style.cursor = "col-resize"; });
        document.addEventListener("mousemove", e => {
            if (!isResizing) return;
            let newWidth = e.clientX;
            if (newWidth < 150) newWidth = 150;
            if (newWidth > 500) newWidth = 500;
            sideMenu.style.width = newWidth + "px";
        });
        document.addEventListener("mouseup", () => { if (isResizing) { isResizing = false; document.body.style.cursor = "default"; } });
    }

    // Yeni sohbet butonu
    if (newChatBtn) newChatBtn.addEventListener("click", e => { e.preventDefault(); startNewChat(); });

    // Gönder butonu
    if (sendBtn) sendBtn.addEventListener("click", e => { e.preventDefault(); sendMessage(); });

    // Enter tuşu
    if (input) {
        input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
        input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = input.scrollHeight + "px"; });
    }

    // Durdur butonu
    if (stopBtn) {
        stopBtn.addEventListener("click", e => {
            e.preventDefault();
            if (abortController) { abortController.abort(); abortController = null; }
            isTyping = false;
            showToast("Durduruluyor...");
        });
    }

    // Emoji picker
    if (emojiPicker) {
        emojiPicker.innerHTML = "";
        "😀😂😍😎🤔😢❤️🤖".split("").forEach(emoji => {
            const span = document.createElement("span");
            span.textContent = emoji;
            span.onclick = () => { if (input) { input.value += emoji; input.focus(); } };
            emojiPicker.appendChild(span);
        });
    }

    // Hızlı butonlar
    if (quickBtns) {
        quickBtns.querySelectorAll("button").forEach(b => {
            b.addEventListener("click", e => { e.preventDefault(); sendMessage(b.textContent); });
        });
    }

    // Linkleri aktifleştir (mevcut mesajlar için)
    document.querySelectorAll('.message-content').forEach(el => linkifyElementOpenExternally(el));
});