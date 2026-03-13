// ============================================================
// NOVA CHAT — chat.js  v3.2
// Auth sistemi · Düzeltmeler · Yeni özellikler
// ============================================================

// ============================================================
// GÜNCELLEME NOTLARI
// ============================================================
const CURRENT_VERSION = "3.2";
const UPDATE_NOTES = [
    "🔐 Giriş sistemi eklendi (Google & E-posta)",
    "🌟 Giriş yapınca 35 günlük mesaj hakkı",
    "📁 Giriş yapınca sohbetler buluta kaydedilir",
    "🖼️ Görsel gönderme artık sadece giriş yapanlara",
    "💡 Misafir limiti: 10 mesaj/gün",
    "⌨️ Yazma hızı ayarlanabilir (Ayarlar'dan)",
    "🤔 1.5sn bekleyince 'düşünüyor' göstergesi",
    "🗑️ Sohbet silme düzeltildi",
    "🔊 Sesli okuma düzeltildi",
    "🎨 Flutter-inspired yeni arayüz",
];

function checkAppUpdate() {
    if (localStorage.getItem("nova_version_seen") === CURRENT_VERSION) return;
    const modal  = document.getElementById("updateModal");
    const listEl = document.getElementById("updateList");
    const badge  = document.getElementById("modalVersionBadge");
    if (!modal || !listEl || !badge) return;
    badge.textContent = "v" + CURRENT_VERSION;
    listEl.innerHTML  = "<ul>" + UPDATE_NOTES.map(n => `<li>${n}</li>`).join("") + "</ul>";
    modal.style.display = "flex";
}

function closeUpdateModal() {
    const m = document.getElementById("updateModal");
    if (m) m.style.display = "none";
    localStorage.setItem("nova_version_seen", CURRENT_VERSION);
}
window.closeUpdateModal = closeUpdateModal;

// ============================================================
// SABİTLER
// ============================================================
const BACKEND_URL     = "https://nova-chat-d50f.onrender.com/api";
const LIMIT_GUEST     = 10;
const LIMIT_AUTH      = 35;

// ============================================================
// KULLANICI KONTROLÜ
// ============================================================
const novaUserName = localStorage.getItem("nova_user");
if (!novaUserName) window.location.href = "index.html";

let userId = localStorage.getItem("nova_user_id");
if (!userId) {
    userId = "guest_" + Date.now() + "_" + Math.floor(Math.random() * 9999);
    localStorage.setItem("nova_user_id", userId);
}

// ============================================================
// UYGULAMA AYARLARI
// ============================================================
let appSettings = JSON.parse(localStorage.getItem("nova_settings_v3")) || {
    language:           "tr",
    seedColor:          "#38bdf8",
    customInstructions: "Sen zeki bir asistansın.",
    selectedVoiceURI:   "",
    ttsSpeed:           0.9,
    ttsPitch:           1.0,
    theme:              "dark",
    bubbleStyle:        "default",
    fontSize:           15,
    messageDensity:     "normal",
    typewriterSpeed:    6,   // ms / karakter (1=hızlı, 40=yavaş)
};

let userInfo = JSON.parse(localStorage.getItem("nova_user_info_" + userId) || "{}");
userInfo.name = novaUserName;

// ============================================================
// UYGULAMA DEĞİŞKENLERİ
// ============================================================
let currentChat        = localStorage.getItem("nova_last_chat") || "default";
let sending            = false;
let abortController    = null;
let isTyping           = false;
let isResizing         = false;
let selectedBase64Image = null;

// Mesaj içerik kayıt defteri (sesli okuma için güvenli referans)
const msgRegistry = {};

// ============================================================
// ÇEVIRI SÖZLÜKlÜ
// ============================================================
const translations = {
    tr: { settings_title:"⚙️ Nova Ayarları", lbl_language:"Dil", lbl_instructions:"Özel Talimatlar", lbl_theme_color:"Tema Rengi", lbl_voice_select:"Okuma Sesi", btn_save:"Kaydet" },
    en: { settings_title:"⚙️ Nova Settings",  lbl_language:"Language", lbl_instructions:"Custom Instructions", lbl_theme_color:"Theme Color", lbl_voice_select:"Voice Selection", btn_save:"Save" },
};

// ============================================================
// FIREBASE YAPILANDIRMASI
// ============================================================
const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyDqQAHCB2MizgN5Id5Ezfr3UPE1P3UlSS8",
    authDomain:        "nova-329c7.firebaseapp.com",
    projectId:         "nova-329c7",
    storageBucket:     "nova-329c7.firebasestorage.app",
    messagingSenderId: "284547967902",
    appId:             "1:284547967902:web:7dd2e64d1a643a30e5c48f",
};

// ============================================================
// AUTH SİSTEMİ
// ============================================================
const Auth = {
    user:        null,
    initialized: false,
    _firebaseReady: false,

    init() {
        if (typeof firebase === "undefined") {
            console.warn("[Nova Auth] Firebase yüklenemedi, misafir modunda devam ediliyor.");
            this.initialized = true;
            this._onStateChange(null);
            return;
        }
        try {
            if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
            this._firebaseReady = true;
            firebase.auth().onAuthStateChanged(user => {
                this.user        = user;
                this.initialized = true;
                this._onStateChange(user);
            });
        } catch (err) {
            console.error("[Nova Auth] init hatası:", err);
            this.initialized = true;
            this._onStateChange(null);
        }
    },

    isLoggedIn()    { return !!this.user; },
    getLimit()      { return this.isLoggedIn() ? LIMIT_AUTH : LIMIT_GUEST; },
    canUseImages()  { return this.isLoggedIn(); },
    keepHistory()   { return this.isLoggedIn(); },
    getDisplayName(){ return this.user?.displayName || this.user?.email?.split("@")[0] || novaUserName; },
    getEmail()      { return this.user?.email || null; },
    getPhotoURL()   { return this.user?.photoURL || null; },

    _onStateChange(user) {
        if (user) {
            // Giriş yapıldı
            userId = "fb_" + user.uid;
            localStorage.setItem("nova_user_id", userId);
            userInfo.name = this.getDisplayName();
        } else {
            // Misafir
            if (!userId || !userId.startsWith("guest_")) {
                userId = "guest_" + Date.now() + "_" + Math.floor(Math.random() * 9999);
                localStorage.setItem("nova_user_id", userId);
            }
        }
        LimitSystem.currentLimit = this.getLimit();
        LimitSystem.updateUI();
        updateAuthUI(user);
    },

    async loginGoogle() {
        if (!this._firebaseReady) { showLoginError("Firebase yüklenemedi."); return; }
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await firebase.auth().signInWithPopup(provider);
            closeLoginModal();
            showToast("✅ Google ile giriş yapıldı!");
        } catch (err) {
            showLoginError(_authErrMsg(err));
        }
    },

    async loginEmailPass() {
        const email    = document.getElementById("loginEmail")?.value.trim();
        const password = document.getElementById("loginPassword")?.value;
        if (!email || !password) { showLoginError("E-posta ve şifre gerekli."); return; }
        if (!this._firebaseReady) { showLoginError("Firebase yüklenemedi."); return; }
        try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
            closeLoginModal();
            showToast("✅ Giriş yapıldı!");
        } catch (err) {
            if (["auth/user-not-found", "auth/invalid-credential", "auth/invalid-email"].includes(err.code) ||
                err.message.includes("user-not-found") || err.message.includes("invalid-credential")) {
                // Hesap yoksa oluştur
                try {
                    await firebase.auth().createUserWithEmailAndPassword(email, password);
                    closeLoginModal();
                    showToast("✅ Hesap oluşturuldu, giriş yapıldı!");
                } catch (regErr) {
                    showLoginError(_authErrMsg(regErr));
                }
            } else {
                showLoginError(_authErrMsg(err));
            }
        }
    },

    async logout() {
        if (!this._firebaseReady) return;
        try {
            await firebase.auth().signOut();
            this.user = null;
            userId = "guest_" + Date.now() + "_" + Math.floor(Math.random() * 9999);
            localStorage.setItem("nova_user_id", userId);
            showToast("👋 Çıkış yapıldı");
            this._onStateChange(null);
            // Mevcut sohbeti temizle
            startNewChat();
        } catch (err) {
            showToast("⚠️ Çıkış hatası");
        }
    },
};
window.Auth = Auth;

function _authErrMsg(err) {
    const map = {
        "auth/wrong-password":       "Şifre yanlış.",
        "auth/weak-password":        "Şifre en az 6 karakter olmalı.",
        "auth/email-already-in-use": "Bu e-posta zaten kayıtlı, giriş yapmayı dene.",
        "auth/invalid-email":        "Geçersiz e-posta adresi.",
        "auth/too-many-requests":    "Çok fazla deneme. Biraz bekle.",
        "auth/popup-closed-by-user": "Popup kapatıldı.",
        "auth/network-request-failed": "Ağ hatası. İnternet bağlantını kontrol et.",
    };
    return map[err.code] || err.message || "Bilinmeyen hata.";
}

function showLoginError(msg) {
    const el = document.getElementById("loginError");
    if (el) el.textContent = msg;
}

function openLoginModal() {
    const m = document.getElementById("loginModal");
    if (m) m.classList.add("open");
    const errEl = document.getElementById("loginError");
    if (errEl) errEl.textContent = "";
}

function closeLoginModal() {
    const m = document.getElementById("loginModal");
    if (m) m.classList.remove("open");
}
window.openLoginModal  = openLoginModal;
window.closeLoginModal = closeLoginModal;

// Auth UI güncelle
function updateAuthUI(user) {
    const authArea  = document.getElementById("sidebarAuthArea");
    const guestBanner = document.getElementById("guestBanner");
    const imgBtn    = document.getElementById("imgPickBtn");

    if (!authArea) return;

    if (user) {
        // Giriş yapılmış: kullanıcı kartı göster
        const photo   = Auth.getPhotoURL();
        const name    = Auth.getDisplayName();
        const email   = Auth.getEmail();
        authArea.innerHTML = `
            <div class="sidebar-user-card">
                <div class="sidebar-user-avatar">
                    ${photo ? `<img src="${photo}" alt="">` : "👤"}
                </div>
                <div class="sidebar-user-info">
                    <div class="sidebar-user-name">${name}</div>
                    <div class="sidebar-user-badge">✓ Üye · 35 hak/gün</div>
                </div>
                <button class="sidebar-logout-btn" onclick="Auth.logout()" title="Çıkış Yap">↩</button>
            </div>`;
        if (guestBanner) guestBanner.style.display = "none";
        if (imgBtn) { imgBtn.disabled = false; imgBtn.style.opacity = "1"; imgBtn.title = "Görsel Ekle"; }
        const headerName = document.getElementById("headerUserName");
        if (headerName) headerName.textContent = "· " + name;
    } else {
        // Misafir: giriş butonu
        authArea.innerHTML = `<button class="sidebar-login-btn" onclick="openLoginModal()">🔐 Giriş Yap / Kayıt Ol</button>`;
        if (guestBanner) guestBanner.style.display = "block";
        // Görsel butonu devre dışı
        if (imgBtn) {
            imgBtn.disabled = true;
            imgBtn.style.opacity = "0.35";
            imgBtn.title = "Görsel göndermek için giriş yap";
        }
    }
}

// ============================================================
// LİMİT SİSTEMİ
// ============================================================
const LimitSystem = {
    KEY:          "nova_daily_limit_v3",
    currentLimit: LIMIT_GUEST,   // Auth init'ten önce misafir limiti

    getData() {
        const today = new Date().toDateString();
        let d = null;
        try { d = JSON.parse(localStorage.getItem(this.KEY)); } catch (_) {}
        if (!d || d.date !== today) { d = { date: today, used: 0 }; this.save(d); }
        return d;
    },
    save(d)         { localStorage.setItem(this.KEY, JSON.stringify(d)); },
    getRemaining()  { return Math.max(0, this.currentLimit - this.getData().used); },
    isBlocked()     { return this.getData().used >= this.currentLimit; },

    increment() {
        const d = this.getData();
        d.used = Math.min(d.used + 1, this.currentLimit);
        this.save(d);
        this.updateUI();
    },

    secondsUntilReset() {
        const m = new Date(); m.setHours(24, 0, 0, 0);
        return Math.floor((m - new Date()) / 1000);
    },
    fmt(s) {
        return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
            .map(v => String(v).padStart(2, "0")).join(":");
    },

    updateUI() {
        const used = this.getData().used;
        const lim  = this.currentLimit;
        const pct  = Math.min((used / lim) * 100, 100);
        const rem  = this.getRemaining();

        const fill = document.getElementById("limitFill");
        if (fill) {
            fill.style.width = pct + "%";
            fill.style.background = pct >= 90
                ? "linear-gradient(90deg,#ef4444,#dc2626)"
                : pct >= 60
                    ? "linear-gradient(90deg,#f59e0b,#d97706)"
                    : "linear-gradient(90deg,#22c55e,#38bdf8)";
        }

        const badge = document.getElementById("limitCountBadge");
        if (badge) {
            badge.textContent = rem + " mesaj";
            badge.style.color      = pct >= 90 ? "#ef4444" : pct >= 60 ? "#f59e0b" : "#22c55e";
            badge.style.background = pct >= 90 ? "rgba(239,68,68,0.1)" : pct >= 60 ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)";
            badge.style.borderColor= pct >= 90 ? "rgba(239,68,68,0.25)" : pct >= 60 ? "rgba(245,158,11,0.25)" : "rgba(34,197,94,0.25)";
        }

        const hBadge = document.getElementById("headerLimitBadge");
        if (hBadge) {
            hBadge.innerHTML  = "💬 " + rem;
            hBadge.className  = "header-icon-btn" + (pct >= 80 ? " limit-low" : "");
        }

        const warn = document.getElementById("limitWarningBar");
        if (warn) {
            warn.style.display = (pct >= 80 && pct < 100) ? "block" : "none";
            if (pct >= 80 && pct < 100) warn.textContent = "⚠️ Limitin %" + Math.round(pct) + "'ini kullandın";
        }

        const inp    = document.getElementById("input");
        const sndBtn = document.getElementById("sendBtn");
        const wrap   = document.querySelector(".input-field-wrap");
        const imgBtn = document.getElementById("imgPickBtn");

        if (this.isBlocked()) {
            if (inp)   { inp.disabled = true; inp.placeholder = "⛔ Günlük limit doldu. Gece yarısı yenilenir."; }
            if (sndBtn) sndBtn.disabled = true;
            if (wrap)   wrap.classList.add("limit-reached");
            if (imgBtn && !Auth.isLoggedIn()) imgBtn.disabled = true;
            this.showBlockOverlay();
        } else {
            if (inp)   { inp.disabled = false; inp.placeholder = "Nova'ya yaz..."; }
            if (sndBtn) sndBtn.disabled = false;
            if (wrap)   wrap.classList.remove("limit-reached");
        }
    },

    _timer: null,
    showBlockOverlay() {
        const o = document.getElementById("limitBlockOverlay");
        if (o) o.classList.add("visible");
        if (!this._timer) this.startCountdown();
    },
    startCountdown() {
        const el = document.getElementById("limitCountdown");
        const tick = () => {
            const s = this.secondsUntilReset();
            if (el) el.textContent = this.fmt(s);
            if (s <= 0) {
                clearInterval(this._timer); this._timer = null;
                this.save({ date: new Date().toDateString(), used: 0 });
                const o = document.getElementById("limitBlockOverlay");
                if (o) o.classList.remove("visible");
                this.updateUI();
            }
        };
        tick();
        this._timer = setInterval(tick, 1000);
    },
};

// ============================================================
// ÖZEL ONAY DİYALOĞU (confirm() yerine)
// ============================================================
function showConfirm(message, okLabel = "Sil") {
    return new Promise(resolve => {
        const overlay  = document.getElementById("confirmOverlay");
        const msgEl    = document.getElementById("confirmMsg");
        const okBtn    = document.getElementById("confirmOk");
        const cancelBtn= document.getElementById("confirmCancel");
        if (!overlay) { resolve(window.confirm(message)); return; }
        if (msgEl)  msgEl.textContent = message;
        if (okBtn)  okBtn.textContent = okLabel;
        overlay.classList.add("open");
        const cleanup = (result) => {
            overlay.classList.remove("open");
            okBtn.replaceWith(okBtn.cloneNode(true));
            cancelBtn.replaceWith(cancelBtn.cloneNode(true));
            resolve(result);
        };
        document.getElementById("confirmOk").onclick     = () => cleanup(true);
        document.getElementById("confirmCancel").onclick = () => cleanup(false);
    });
}

// ============================================================
// THINKING OVERLAY (1.5s bekleyince çıkar)
// ============================================================
let _thinkingTimer = null;

function showThinkingOverlay() {
    clearTimeout(_thinkingTimer);
    _thinkingTimer = setTimeout(() => {
        const el = document.getElementById("thinkingOverlay");
        if (el) el.classList.add("visible");
    }, 1500);
}

function hideThinkingOverlay() {
    clearTimeout(_thinkingTimer);
    const el = document.getElementById("thinkingOverlay");
    if (el) el.classList.remove("visible");
}

// ============================================================
// AYAR UYGULAMA
// ============================================================
function hexToRgba(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
}

function applySettings() {
    const s = appSettings;
    document.body.classList.toggle("light-mode", s.theme === "light");
    document.body.classList.toggle("dark-mode",  s.theme !== "light");
    document.documentElement.style.setProperty("--seed",        s.seedColor);
    document.documentElement.style.setProperty("--primary-color", s.seedColor);
    document.documentElement.style.setProperty("--accent-color",  s.seedColor);
    document.documentElement.style.setProperty("--seed-dim",    hexToRgba(s.seedColor, 0.12));
    document.documentElement.style.setProperty("--seed-glow",   hexToRgba(s.seedColor, 0.30));
    document.documentElement.style.setProperty("--seed-border", hexToRgba(s.seedColor, 0.35));
    document.documentElement.style.setProperty("--font-size",   s.fontSize + "px");
    const radii = { default: "20px", minimal: "8px", sharp: "4px" };
    document.documentElement.style.setProperty("--bubble-radius", radii[s.bubbleStyle] || "20px");
    const gaps = { compact: "10px", normal: "20px", spacious: "30px" };
    document.documentElement.style.setProperty("--density-gap", gaps[s.messageDensity] || "20px");

    const lang = s.language || "tr";
    document.querySelectorAll("[data-lang]").forEach(el => {
        const key = el.getAttribute("data-lang");
        if (translations[lang]?.[key]) el.textContent = translations[lang][key];
    });
}

// ============================================================
// TOAST & PULSE
// ============================================================
function showToast(msg, dur = 2500) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg; t.classList.add("visible");
    clearTimeout(t._tm); t._tm = setTimeout(() => t.classList.remove("visible"), dur);
}

function showNovaActivePulse() {
    const p = document.getElementById("nova-active-pulse");
    if (!p) return;
    p.classList.add("active"); clearTimeout(p._tm);
    p._tm = setTimeout(() => p.classList.remove("active"), 600);
}

// ============================================================
// HOŞGELDİN EKRANI
// ============================================================
const GREETINGS = [
    { icon: "👋", title: "Merhaba! Ben Nova.", sub: "Bugün sana nasıl yardımcı olabilirim?" },
    { icon: "💡", title: "Bir fikrin mi var?", sub: "Yazmak, öğrenmek veya keşfetmek için buradayım." },
    { icon: "✍️", title: "Bugün ne yazalım?",  sub: "Kod, makale, e-posta... Hepsi burada!" },
    { icon: "🚀", title: "Hazır olduğunda başla!", sub: "Her sorunun bir cevabı var." },
    { icon: "🌟", title: "Sana yardım etmekten mutluluk duyarım.", sub: "Fikirlerini, sorularını veya projelerini paylaş." },
];
const CHIPS = ["Kod yaz 💻", "Makale üret ✍️", "Soru sor 🤔", "Çeviri yap 🌍", "Özet çıkar 📄"];
const greetingIdx = Math.floor(Math.random() * GREETINGS.length);

function buildWelcomeScreen() {
    const ws = document.getElementById("welcome-screen");
    if (!ws) return;
    const g    = GREETINGS[greetingIdx];
    const name = Auth.isLoggedIn() ? Auth.getDisplayName() : novaUserName;
    ws.innerHTML = `
        <div class="welcome-icon-ring">${g.icon}</div>
        ${name ? `<div class="welcome-user-name">Merhaba, ${name}! 👋</div>` : ""}
        <div class="welcome-title">${g.title}</div>
        <div class="welcome-sub">${g.sub}</div>
        <div class="welcome-chips">${CHIPS.map(c => `<div class="welcome-chip" data-chip="${c}">${c}</div>`).join("")}</div>
    `;
    ws.querySelectorAll(".welcome-chip").forEach(ch => {
        ch.addEventListener("click", () => {
            const inp = document.getElementById("input");
            if (inp) { inp.value = ch.dataset.chip; inp.focus(); inp.style.height = "auto"; inp.style.height = inp.scrollHeight + "px"; }
        });
    });
}

function toggleWelcomeScreen() {
    const chat = document.getElementById(currentChat);
    const ws   = document.getElementById("welcome-screen");
    if (!chat || !ws) return;
    if (chat.children.length === 0) {
        ws.style.display = "flex";
        requestAnimationFrame(() => ws.classList.add("visible"));
    } else {
        ws.classList.remove("visible");
        setTimeout(() => { if (!ws.classList.contains("visible")) ws.style.display = "none"; }, 400);
    }
}

// ============================================================
// TTS — SESLİ OKUMA
// ============================================================
let _isSpeaking    = false;
let _speakingMsgId = null;

function cleanForSpeech(text) {
    return text
        .replace(/[\p{Emoji_Presentation}\p{Emoji}\p{Extended_Pictographic}]/gu, "")
        .replace(/[^0-9a-zA-ZğüşıöçĞÜŞİÖÇ\s.,!?]/g, "")
        .replace(/,/g, ", ").replace(/\./g, ". ")
        .trim();
}

function speakMessage(text, msgId) {
    const synth = window.speechSynthesis;
    // Aynı mesaj tekrar tıklandıysa durdur
    if (_isSpeaking && _speakingMsgId === msgId) {
        synth.cancel();
        _isSpeaking = false; _speakingMsgId = null;
        document.querySelectorAll(".speak-active").forEach(e => e.classList.remove("speak-active"));
        showToast("⏸️ Okuma durduruldu");
        return;
    }
    synth.cancel();
    const clean = cleanForSpeech(text || "");
    if (!clean) { showToast("⚠️ Okunacak metin yok"); return; }

    const utt   = new SpeechSynthesisUtterance(clean);
    utt.lang    = "tr-TR";
    utt.rate    = appSettings.ttsSpeed  || 0.9;
    utt.pitch   = appSettings.ttsPitch  || 1.0;

    const trySpeak = () => {
        const voices = synth.getVoices();
        if (appSettings.selectedVoiceURI) {
            const v = voices.find(v => v.voiceURI === appSettings.selectedVoiceURI);
            if (v) utt.voice = v;
        } else {
            const tr = voices.find(v => v.lang.startsWith("tr"));
            if (tr) utt.voice = tr;
        }
        _isSpeaking = true; _speakingMsgId = msgId;
        if (msgId) {
            const el = document.getElementById("msg_" + msgId);
            if (el) el.classList.add("speak-active");
        }
        showToast("🔊 Nova konuşuyor...");
        utt.onend = utt.onerror = () => {
            _isSpeaking = false; _speakingMsgId = null;
            document.querySelectorAll(".speak-active").forEach(e => e.classList.remove("speak-active"));
        };
        synth.speak(utt);
    };

    if (synth.getVoices().length) trySpeak();
    else { synth.onvoiceschanged = () => trySpeak(); }
}
window.speakMessage = speakMessage;

// ============================================================
// KOD BLOĞU FORMATLAMA
// ============================================================
function formatCodeBlocks(text) {
    return text.replace(/```(\w*)?([\s\S]*?)```/g, (_, lang, code) => {
        const l    = lang || "text";
        const safe = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<div class="code-window"><div class="code-header"><span>${l}</span><button class="copy-btn-code" data-copy>📋 Kopyala</button></div><pre><code class="language-${l}">${safe}</code></pre></div>`;
    });
}

// delegated copy (onclick yerine event delegation)
document.addEventListener("click", e => {
    if (!e.target.matches("[data-copy]")) return;
    const code = e.target.closest(".code-window")?.querySelector("code");
    if (!code) return;
    navigator.clipboard.writeText(code.innerText).then(() => {
        const orig = e.target.textContent;
        e.target.textContent = "✅ Kopyalandı";
        setTimeout(() => e.target.textContent = orig, 2000);
    });
});

// ============================================================
// LİNK AKTİFLEŞTİRME
// ============================================================
function linkify(element) {
    if (!element) return;
    const re = /(?:https?:\/\/|www\.)[\w\-._~:/?#[\]@!$&'()*+,;=%]+/gi;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    const nodes  = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
        if (!node.nodeValue || !re.test(node.nodeValue)) { re.lastIndex = 0; continue; }
        re.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let last = 0, m;
        while ((m = re.exec(node.nodeValue)) !== null) {
            if (m.index > last) frag.appendChild(document.createTextNode(node.nodeValue.slice(last, m.index)));
            let href = m[0];
            if (/^www\./i.test(href)) href = "http://" + href;
            const trail = href.match(/([)\]\.,;:!?]+)$/);
            let trailing = "";
            if (trail) { trailing = trail[1]; href = href.slice(0, -trailing.length); }
            const a = document.createElement("a");
            a.href = href; a.textContent = m[0].replace(/[)\]\.,;:!?]+$/, "");
            a.setAttribute("rel", "noopener noreferrer");
            a.addEventListener("click", ev => {
                if (ev.ctrlKey || ev.metaKey) return;
                ev.preventDefault();
                try { window.open(href, "_blank", "noopener,noreferrer"); } catch (_) { window.location.href = href; }
            });
            frag.appendChild(a);
            if (trailing) frag.appendChild(document.createTextNode(trailing));
            last = re.lastIndex;
        }
        if (last < node.nodeValue.length) frag.appendChild(document.createTextNode(node.nodeValue.slice(last)));
        node.parentNode.replaceChild(frag, node);
        re.lastIndex = 0;
    }
}

// ============================================================
// YARDIMCI
// ============================================================
function fmtTime(d) { return String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0"); }
function scrollToBottom() { const c = document.getElementById("chatsContainer"); if (c) c.scroll({ top: c.scrollHeight, behavior: "smooth" }); }

// ============================================================
// MESAJ EKLEME
// ============================================================
function addMessage(text, sender, imgBase64, container) {
    const parent = container || document.getElementById(currentChat);
    if (!parent) return null;
    const ws = document.getElementById("welcome-screen");
    if (ws) { ws.classList.remove("visible"); setTimeout(() => { if (!ws.classList.contains("visible")) ws.style.display = "none"; }, 400); }
    const msgId = "m" + Date.now() + Math.floor(Math.random() * 999);
    const div = document.createElement("div");
    div.className = "msg " + sender; div.id = "msg_" + msgId;
    if (imgBase64) {
        const img = document.createElement("img"); img.className = "msg-image";
        img.src = "data:image/jpeg;base64," + imgBase64; div.appendChild(img);
    }
    const content = document.createElement("div"); content.className = "message-content"; content.textContent = text || ""; div.appendChild(content);
    const ts = document.createElement("div"); ts.className = "timestamp"; ts.textContent = fmtTime(new Date()); div.appendChild(ts);
    parent.appendChild(div); scrollToBottom(); showNovaActivePulse(); toggleWelcomeScreen();
    return { div, msgId, content };
}

// ============================================================
// YAZMA EFEKTİ (TYPEWRITER)
// ============================================================
async function addTypingMessage(text, sender, container) {
    const parent = container || document.getElementById(currentChat);
    if (!parent) return;
    const ws = document.getElementById("welcome-screen");
    if (ws) { ws.classList.remove("visible"); setTimeout(() => { if (!ws.classList.contains("visible")) ws.style.display = "none"; }, 400); }

    const msgId  = "m" + Date.now();
    const div    = document.createElement("div");
    div.className = "msg " + sender; div.id = "msg_" + msgId;
    const content = document.createElement("div"); content.className = "message-content"; div.appendChild(content);
    parent.appendChild(div); scrollToBottom();

    isTyping = true;
    const baseDelay = appSettings.typewriterSpeed || 6;
    // Uzun metinlerde daha hızlı
    const delay = text.length > 800 ? Math.max(1, Math.floor(baseDelay / 3)) : baseDelay;
    let cur = "";
    for (let i = 0; i < text.length; i++) {
        if (!isTyping) break;
        cur += text[i]; content.textContent = cur;
        if (i % 5 === 0) scrollToBottom();
        if (delay > 0) await new Promise(r => setTimeout(r, delay));
    }

    // Tam içeriği render et
    content.innerHTML = formatCodeBlocks(text);
    content.querySelectorAll("pre code").forEach(b => { if (typeof hljs !== "undefined") hljs.highlightElement(b); });
    linkify(content);

    const tsSp = document.createElement("div"); tsSp.className = "timestamp"; tsSp.textContent = fmtTime(new Date()); div.appendChild(tsSp);

    if (sender === "nova") {
        // Metni registry'ye kaydet (sesli okuma için güvenli)
        msgRegistry[msgId] = text;

        const acts = document.createElement("div"); acts.className = "msg-actions";

        const speakBtn = document.createElement("button");
        speakBtn.className = "msg-action-btn"; speakBtn.textContent = "🔊 Sesli oku";
        speakBtn.addEventListener("click", () => speakMessage(msgRegistry[msgId], msgId));

        const copyBtn = document.createElement("button");
        copyBtn.className = "msg-action-btn"; copyBtn.textContent = "📋 Kopyala";
        copyBtn.addEventListener("click", () => {
            navigator.clipboard.writeText(content.innerText).then(() => showToast("✅ Kopyalandı"));
        });

        const dlBtn = document.createElement("button");
        dlBtn.className = "msg-action-btn"; dlBtn.textContent = "💾 İndir";
        dlBtn.addEventListener("click", () => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([content.innerText], { type: "text/plain" }));
            a.download = "nova_mesaj.txt"; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        });

        acts.appendChild(speakBtn); acts.appendChild(copyBtn); acts.appendChild(dlBtn);
        div.appendChild(acts);
    }

    scrollToBottom(); isTyping = false;
    return div;
}

// ============================================================
// HATA MESAJI
// ============================================================
function showErrorMessage(errorText, lastUserMessage) {
    const chatDiv = document.getElementById(currentChat); if (!chatDiv) return;
    const errorDiv = document.createElement("div"); errorDiv.className = "error-message";
    errorDiv.innerHTML = `<div class="error-text">⚠️ ${errorText}</div><button class="retry-btn">🔄 Yeniden Dene</button>`;
    errorDiv.querySelector(".retry-btn")?.addEventListener("click", () => { errorDiv.remove(); if (lastUserMessage) sendMessage(lastUserMessage); });
    chatDiv.appendChild(errorDiv); scrollToBottom();
}

// ============================================================
// GÖRSEL SEÇİMİ
// ============================================================
function pickImage() {
    if (!Auth.canUseImages()) {
        showToast("🖼️ Görsel göndermek için giriş yap!");
        setTimeout(openLoginModal, 600);
        return;
    }
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
    inp.onchange = () => {
        const file = inp.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = e => { selectedBase64Image = e.target.result.split(",")[1]; showImagePreview(e.target.result); };
        reader.readAsDataURL(file);
    };
    inp.click();
}

function showImagePreview(url) {
    const w = document.getElementById("imagePreview"); if (!w) return;
    w.innerHTML = `<div class="img-preview-box"><img class="img-preview-thumb" src="${url}"><button class="img-preview-remove" onclick="clearImagePreview()">✕</button></div>`;
    w.classList.add("show");
}

function clearImagePreview() {
    selectedBase64Image = null;
    const w = document.getElementById("imagePreview"); if (w) { w.innerHTML = ""; w.classList.remove("show"); }
}
window.clearImagePreview = clearImagePreview;

// ============================================================
// MESAJ GÖNDERME
// ============================================================
async function sendMessage(msg) {
    if (sending) return;

    // Limit kontrolü
    if (LimitSystem.isBlocked()) {
        LimitSystem.showBlockOverlay();
        showToast("⛔ Günlük limit doldu!");
        return;
    }

    const text = msg || document.getElementById("input")?.value.trim();
    if (!text && !selectedBase64Image) return;

    // Misafir + görsel kontrolü
    if (selectedBase64Image && !Auth.canUseImages()) {
        showToast("🖼️ Görsel göndermek için giriş yapmalısın!");
        setTimeout(openLoginModal, 600);
        clearImagePreview();
        return;
    }

    // Misafir: sohbet geçmişi uyarısı (sadece ilk mesajda)
    if (!Auth.keepHistory()) {
        const chatDiv = document.getElementById(currentChat);
        if (chatDiv && chatDiv.children.length === 0) {
            showToast("💡 Sohbetin kaydedilmez. Giriş yap → 35 hak + kayıt!", 4000);
        }
    }

    sending = true;
    const inputEl = document.getElementById("input");
    if (inputEl) { inputEl.value = ""; inputEl.style.height = "auto"; }
    const imgToSend = selectedBase64Image;
    clearImagePreview();
    const chatDiv = document.getElementById(currentChat);
    if (!chatDiv) { sending = false; return; }

    const displayText = imgToSend ? (text ? "[Görsel] " + text : "[Görsel Gönderildi]") : text;
    addMessage(displayText || "", "user", imgToSend, chatDiv);
    updateChatBtnLabel(document.querySelector(`button.chatBtn[data-id="${currentChat}"]`), displayText || "Görsel");

    // Typing dots
    const typingDiv = document.createElement("div"); typingDiv.className = "typing-indicator";
    typingDiv.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
    chatDiv.appendChild(typingDiv); scrollToBottom();

    const statusEl = document.getElementById("novaStatus");
    if (statusEl) statusEl.textContent = "Düşünüyor...";

    // 1.5 saniye sonra "thinking" overlay göster
    showThinkingOverlay();

    abortController = new AbortController();
    const MAX_RETRIES = 3;
    const TIMEOUT_MS  = 70000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const timeoutId = setTimeout(() => abortController?.abort(), TIMEOUT_MS);
        try {
            if (attempt === 2) typingDiv.innerHTML = `<span style="font-size:13px;opacity:.7">⏳ Sunucu uyandırılıyor...</span>`;
            if (attempt === 3) typingDiv.innerHTML = `<span style="font-size:13px;opacity:.7">🔄 Son deneme...</span>`;

            const res = await fetch(`${BACKEND_URL}/chat`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    currentChat,
                    message:          text || "Bu görseli analiz et.",
                    image:            imgToSend,
                    userInfo,
                    systemPrompt:     appSettings.customInstructions || "",
                    systemInstruction:appSettings.customInstructions || "",
                    settings:         appSettings,
                    saveHistory:      Auth.keepHistory(),
                }),
                signal: abortController.signal,
            });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error("HTTP " + res.status);
            const data = await res.json();
            typingDiv.remove();
            hideThinkingOverlay();

            if (data.response) {
                LimitSystem.increment();
                await addTypingMessage(data.response, "nova", chatDiv);
                if (data.updatedUserInfo) {
                    userInfo = data.updatedUserInfo;
                    localStorage.setItem("nova_user_info_" + userId, JSON.stringify(userInfo));
                }
            } else {
                showErrorMessage("Boş yanıt alındı.", text);
            }
            break;

        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === "AbortError" && attempt < MAX_RETRIES) {
                abortController = new AbortController();
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }
            typingDiv.remove();
            hideThinkingOverlay();
            if (err.name === "AbortError" && !sending) {
                showToast("⏹️ İşlem durduruldu."); addMessage("🛑 Durduruldu.", "nova", null, chatDiv);
            } else {
                let msg2 = "";
                if (["Failed to fetch","Load failed","NetworkError when attempting to fetch resource."].includes(err.message))
                    msg2 = "🔴 Ağ hatası — sunucuya bağlanılamıyor.";
                else if (err.name === "AbortError") msg2 = "⏱️ Sunucu 70 saniyede cevap vermedi.";
                else if (err.message.includes("JSON"))  msg2 = "📄 Sunucu yanıtı bozuk.";
                else msg2 = "❓ " + err.message;
                console.error(`[Nova] Deneme ${attempt}:`, err);
                showErrorMessage(msg2, text);
            }
            break;
        }
    }

    sending = false;
    if (statusEl) statusEl.textContent = "Hazır";
    abortController = null;
}

// ============================================================
// SOHBET YÖNETİMİ
// ============================================================
function addChatToMenu(chatId, label) {
    label = (label || "Yeni Sohbet").slice(0, 28);
    const menu = document.getElementById("menu"); if (!menu) return;
    if (menu.querySelector(`[data-id="${chatId}"]`)) return;

    const row = document.createElement("div"); row.className = "chatRow"; row.dataset.chatrow = chatId;
    const btn = document.createElement("button"); btn.className = "chatBtn"; btn.dataset.id = chatId;
    btn.textContent = label.length >= 28 ? label + "…" : label;
    btn.onclick = () => { loadChat(chatId); document.getElementById("sideMenu")?.classList.remove("active"); };

    const del = document.createElement("button"); del.className = "deleteBtn"; del.textContent = "✕"; del.title = "Sil";
    del.onclick = async () => {
        const confirmed = await showConfirm("Bu sohbeti silmek istiyor musun?", "🗑️ Sil");
        if (!confirmed) return;

        // Önce UI'dan kaldır (her zaman çalışır)
        row.remove();
        const chatEl = document.getElementById(chatId);
        if (chatEl) chatEl.remove();

        // Eğer silinen aktif sohbetse yenisini başlat
        if (currentChat === chatId) startNewChat();

        showToast("🗑️ Sohbet silindi");

        // Backend'e de bildir (arka planda, hata olursa önemli değil)
        if (Auth.keepHistory()) {
            fetch(`${BACKEND_URL}/delete_chat`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ userId, chatId }),
            }).catch(() => {});
        }
    };

    row.appendChild(btn); row.appendChild(del);
    menu.appendChild(row);
}

function updateChatBtnLabel(btn, label) {
    if (!btn || !label) return;
    btn.textContent = label.length > 28 ? label.slice(0, 28) + "…" : label;
}

function markChatActive(chatId) {
    document.querySelectorAll(".chatBtn").forEach(b => b.classList.toggle("active", b.dataset.id === chatId));
}

function loadChat(cid) {
    currentChat = cid;
    localStorage.setItem("nova_last_chat", cid);
    const container = document.getElementById("chatsContainer"); if (!container) return;
    Array.from(container.children).forEach(c => { if (c.classList?.contains("chatDiv")) c.style.display = "none"; });
    let div = document.getElementById(cid);
    if (!div) { div = document.createElement("div"); div.className = "chatDiv"; div.id = cid; container.appendChild(div); }
    div.style.display = "flex";
    markChatActive(cid);
    const hName = document.getElementById("headerChatName");
    const lbl   = document.querySelector(`button.chatBtn[data-id="${cid}"]`)?.textContent;
    if (hName) hName.textContent = lbl || "Yeni Sohbet";

    // Geçmiş sadece giriş yapanlarda yükle
    if (Auth.keepHistory()) {
        fetch(`${BACKEND_URL}/history?userId=${userId}`)
            .then(r => r.json())
            .then(data => {
                const msgs = data[cid] || [];
                if (div.innerHTML === "") msgs.forEach(m => addMessage(m.message || m.text, m.sender, null, div));
                toggleWelcomeScreen();
            })
            .catch(() => toggleWelcomeScreen());
    } else {
        toggleWelcomeScreen();
    }
}

function startNewChat() {
    const id = "chat_" + Date.now() + "_" + Math.floor(Math.random() * 9999);
    addChatToMenu(id, "Yeni Sohbet");
    loadChat(id);
    document.getElementById("sideMenu")?.classList.remove("active");
    showToast("✨ Yeni sohbet başlatıldı");
}

function renderMenu() {
    if (!document.querySelector(`button.chatBtn[data-id="${currentChat}"]`)) addChatToMenu(currentChat, "Mevcut Sohbet");
    markChatActive(currentChat);
}

// ============================================================
// SUNUCU UYANDIRMA
// ============================================================
async function warmUpServer() {
    try { await fetch(BACKEND_URL.replace("/api", "/"), { method: "GET", mode: "no-cors" }); } catch (_) {}
}

// ============================================================
// AYARLAR PANELİ
// ============================================================
function openSettings() {
    const m = document.getElementById("settingsModal"); if (!m) return;
    m.style.display = "flex"; populateSettings();
}

function closeSettings() {
    const m = document.getElementById("settingsModal"); if (m) m.style.display = "none";
}

function populateSettings() {
    const s = appSettings;
    const cp = document.getElementById("colorPicker"); if (cp) cp.value = s.seedColor;
    const ci = document.getElementById("customInstructions"); if (ci) ci.value = s.customInstructions || "";
    document.querySelectorAll("[data-bubble]").forEach(el => el.classList.toggle("active", el.dataset.bubble === s.bubbleStyle));
    document.querySelectorAll("[data-density]").forEach(el => el.classList.toggle("active", el.dataset.density === s.messageDensity));
    document.querySelectorAll("[data-theme]").forEach(el => el.classList.toggle("active", el.dataset.theme === s.theme));

    const fs = document.getElementById("fontSizeSlider");
    if (fs) { fs.value = s.fontSize; const l = document.getElementById("fontSizeLabel"); if (l) l.textContent = s.fontSize + "px"; }

    const tw = document.getElementById("twSpeedSlider");
    if (tw) { tw.value = s.typewriterSpeed; updateTwLabel(s.typewriterSpeed); }

    const sp = document.getElementById("ttsSpeedSlider");
    if (sp) { sp.value = s.ttsSpeed; const l = document.getElementById("ttsSpeedLabel"); if (l) l.textContent = Number(s.ttsSpeed).toFixed(2); }

    const pi = document.getElementById("ttsPitchSlider");
    if (pi) { pi.value = s.ttsPitch; const l = document.getElementById("ttsPitchLabel"); if (l) l.textContent = Number(s.ttsPitch).toFixed(2); }

    const lang = document.getElementById("languageSelect"); if (lang) lang.value = s.language || "tr";
    buildVoiceCards();
}

function updateTwLabel(val) {
    const l = document.getElementById("twSpeedLabel"); if (!l) return;
    val = parseInt(val);
    l.textContent = val <= 5 ? "Çok Hızlı" : val <= 12 ? "Hızlı" : val <= 25 ? "Normal" : "Yavaş";
}

function buildVoiceCards() {
    const wrap = document.getElementById("voiceCardScroll"); if (!wrap) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) { window.speechSynthesis.onvoiceschanged = buildVoiceCards; return; }
    wrap.innerHTML = voices.map(v => {
        const a = v.voiceURI === appSettings.selectedVoiceURI;
        return `<button class="voice-card ${a ? "active" : ""}" data-uri="${v.voiceURI}" data-locale="${v.lang}">${a ? "🔊" : "🎙️"} ${v.name.length > 22 ? v.name.slice(0, 22) : v.name}</button>`;
    }).join("");
    wrap.querySelectorAll(".voice-card").forEach(btn => {
        btn.addEventListener("click", () => {
            appSettings.selectedVoiceURI = btn.dataset.uri;
            wrap.querySelectorAll(".voice-card").forEach(b => b.classList.remove("active")); btn.classList.add("active");
            const synth = window.speechSynthesis; synth.cancel();
            const utt = new SpeechSynthesisUtterance("Merhaba! Ben Nova.");
            utt.lang = btn.dataset.locale || "tr-TR";
            const vObj = synth.getVoices().find(v => v.voiceURI === btn.dataset.uri);
            if (vObj) utt.voice = vObj;
            synth.speak(utt);
        });
    });
}

function saveSettings() {
    const cp = document.getElementById("colorPicker"); if (cp) appSettings.seedColor = cp.value;
    const ci = document.getElementById("customInstructions"); if (ci) appSettings.customInstructions = ci.value;
    const fs = document.getElementById("fontSizeSlider"); if (fs) appSettings.fontSize = parseInt(fs.value);
    const tw = document.getElementById("twSpeedSlider"); if (tw) appSettings.typewriterSpeed = parseInt(tw.value);
    const sp = document.getElementById("ttsSpeedSlider"); if (sp) appSettings.ttsSpeed = parseFloat(sp.value);
    const pi = document.getElementById("ttsPitchSlider"); if (pi) appSettings.ttsPitch = parseFloat(pi.value);
    const lg = document.getElementById("languageSelect"); if (lg) appSettings.language = lg.value;
    localStorage.setItem("nova_settings_v3", JSON.stringify(appSettings));
    applySettings(); closeSettings(); showToast("✅ Ayarlar kaydedildi");
}
window.openSettings  = openSettings;
window.closeSettings = closeSettings;
window.saveSettings  = saveSettings;

// ============================================================
// FİREBASE BİLDİRİMLER
// ============================================================
async function initNovaNotifications() {
    try {
        if (typeof firebase === "undefined") return;
        if (!Auth._firebaseReady) { if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG); }
        const messaging  = firebase.messaging();
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            const reg   = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
            const token = await messaging.getToken({
                serviceWorkerRegistration: reg,
                vapidKey: "BDMDVEtUfabWh6LAnM15zLGcK2R-1kxuSvjwegdx0q-I46l9GnBSSKimwAoIxUhOxh5QtRxAtt0Hj9PBl19qlxU",
            });
            if (token) await fetch(`${BACKEND_URL}/subscribe`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
        }
    } catch (err) { console.error("Bildirim hatası:", err); }
}

// ============================================================
// SAYFA YÜKLENDİĞİNDE
// ============================================================
window.addEventListener("DOMContentLoaded", () => {
    // Splash
    const splash = document.getElementById("splash-screen");
    if (splash) setTimeout(() => { splash.classList.add("fade-out"); setTimeout(() => splash.style.display = "none", 800); }, 2000);

    // Ayarları uygula
    applySettings();

    // Firebase Auth başlat
    Auth.init();

    // Hoşgeldin
    buildWelcomeScreen();

    // Sohbet + menü
    loadChat(currentChat);
    renderMenu();
    setTimeout(toggleWelcomeScreen, 500);

    // Limit
    LimitSystem.currentLimit = Auth.getLimit();
    LimitSystem.updateUI();
    if (LimitSystem.isBlocked()) LimitSystem.startCountdown();

    // Güncelleme
    setTimeout(checkAppUpdate, 1200);

    // Bildirimler
    window.addEventListener("load", initNovaNotifications);

    // Sunucu uyandır
    warmUpServer();

    // ── DOM ──
    const sideMenu   = document.getElementById("sideMenu");
    const menuToggle = document.getElementById("menuToggle");
    const dragHandle = document.getElementById("dragHandle");
    const input      = document.getElementById("input");
    const sendBtn    = document.getElementById("sendBtn");
    const stopBtn    = document.getElementById("stopBtn");
    const newChatBtn = document.getElementById("newChatBtn");
    const themeToggle= document.getElementById("themeToggleBtn");
    const settingsBtn= document.getElementById("settingsBtn");
    const imgBtn     = document.getElementById("imgPickBtn");
    const quickBtns  = document.getElementById("quickBtns");
    const emojiPicker= document.getElementById("emojiPicker");

    // Tema
    themeToggle?.addEventListener("click", () => {
        appSettings.theme = appSettings.theme === "dark" ? "light" : "dark";
        applySettings();
        localStorage.setItem("nova_settings_v3", JSON.stringify(appSettings));
        showToast(appSettings.theme === "dark" ? "🌙 Karanlık Mod" : "☀️ Aydınlık Mod");
    });

    // Ayarlar
    settingsBtn?.addEventListener("click", openSettings);

    // Menü
    menuToggle?.addEventListener("click", () => sideMenu?.classList.toggle("active"));
    document.addEventListener("click", e => {
        if (sideMenu?.classList.contains("active") && !sideMenu.contains(e.target) && e.target !== menuToggle)
            sideMenu.classList.remove("active");
        if (e.target.dataset.bubble)  { document.querySelectorAll("[data-bubble]").forEach(el=>el.classList.remove("active")); e.target.classList.add("active"); appSettings.bubbleStyle=e.target.dataset.bubble; applySettings(); }
        if (e.target.dataset.density) { document.querySelectorAll("[data-density]").forEach(el=>el.classList.remove("active")); e.target.classList.add("active"); appSettings.messageDensity=e.target.dataset.density; applySettings(); }
        if (e.target.dataset.theme)   { document.querySelectorAll("[data-theme]").forEach(el=>el.classList.remove("active")); e.target.classList.add("active"); appSettings.theme=e.target.dataset.theme; applySettings(); }
    });

    // Drag resize
    dragHandle?.addEventListener("mousedown", () => { isResizing=true; document.body.style.cursor="col-resize"; });
    document.addEventListener("mousemove", e => {
        if (!isResizing) return;
        const w = Math.max(180, Math.min(e.clientX, 500));
        sideMenu.style.width = w + "px";
        document.documentElement.style.setProperty("--sidebar-w", w + "px");
    });
    document.addEventListener("mouseup", () => { if (isResizing) { isResizing=false; document.body.style.cursor="default"; } });

    // Yeni sohbet / gönder / durdur
    newChatBtn?.addEventListener("click", e => { e.preventDefault(); startNewChat(); });
    sendBtn?.addEventListener("click",    e => { e.preventDefault(); sendMessage(); });

    input?.addEventListener("keydown", e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    input?.addEventListener("input", () => { input.style.height="auto"; input.style.height=Math.min(input.scrollHeight,200)+"px"; });

    stopBtn?.addEventListener("click", e => {
        e.preventDefault();
        abortController?.abort(); abortController=null;
        isTyping=false; sending=false;
        hideThinkingOverlay();
        const statusEl = document.getElementById("novaStatus"); if (statusEl) statusEl.textContent = "Hazır";
        document.querySelector(".typing-indicator")?.remove();
        showToast("⏹️ Durduruldu");
    });

    imgBtn?.addEventListener("click", pickImage);

    // Emoji
    if (emojiPicker) {
        "😀😂😍😎🤔😢❤️🤖🚀✨💡🔥".split("").forEach(em => {
            const s = document.createElement("span"); s.textContent = em;
            s.onclick = () => { if (input) { input.value += em; input.focus(); } };
            emojiPicker.appendChild(s);
        });
    }

    // Hızlı butonlar
    quickBtns?.querySelectorAll("button").forEach(b => {
        b.addEventListener("click", e => { e.preventDefault(); sendMessage(b.textContent); });
    });

    // Slider canlı etiketler
    document.getElementById("fontSizeSlider")?.addEventListener("input", function() {
        const l = document.getElementById("fontSizeLabel"); if (l) l.textContent = this.value + "px";
        appSettings.fontSize = parseInt(this.value); applySettings();
    });
    document.getElementById("twSpeedSlider")?.addEventListener("input", function() {
        appSettings.typewriterSpeed = parseInt(this.value); updateTwLabel(this.value);
    });
    document.getElementById("ttsSpeedSlider")?.addEventListener("input", function() {
        const l = document.getElementById("ttsSpeedLabel"); if (l) l.textContent = Number(this.value).toFixed(2);
    });
    document.getElementById("ttsPitchSlider")?.addEventListener("input", function() {
        const l = document.getElementById("ttsPitchLabel"); if (l) l.textContent = Number(this.value).toFixed(2);
    });

    // Renk picker canlı önizleme
    document.getElementById("colorPicker")?.addEventListener("input", function() {
        appSettings.seedColor = this.value; applySettings();
    });

    // Login modal dışına tıklayınca kapat
    document.getElementById("loginModal")?.addEventListener("click", function(e) {
        if (e.target === this) closeLoginModal();
    });

    // Mevcut mesajları linkify et
    document.querySelectorAll(".message-content").forEach(el => linkify(el));
});