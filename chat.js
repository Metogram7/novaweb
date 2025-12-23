// 👤 Kullanıcı adı (index.html'den geliyor)
const novaUserName = localStorage.getItem("nova_user");

// Eğer isim yoksa index'e geri at
if (!novaUserName) {
    window.location.href = "index.html";
}


// 🧠 Nova'nın mesaj alanı boş mu kontrol et
function toggleWelcomeScreen() {
    const chat = document.getElementById(currentChat);
    const welcome = document.getElementById("welcome-screen");
    if (!chat || !welcome) return;

    const isChatEmpty = chat.children.length === 0;
    const isVisible = welcome.classList.contains("visible");

    if ((isChatEmpty && isVisible) || (!isChatEmpty && !isVisible)) return;

    if (isChatEmpty) {
        welcome.style.display = "flex";
        requestAnimationFrame(() => welcome.classList.add("visible"));
    } else {
        welcome.classList.remove("visible");
        setTimeout(() => {
            if (!welcome.classList.contains("visible")) {
                welcome.style.display = "none";
            }
        }, 400);
    }
}

// === GÜNCELLEME NOTLARI SİSTEMİ ===

// 🛠️ BURAYI HER GÜNCELLEMEDE DEĞİŞTİR:
const CURRENT_VERSION = "2.7w";

const UPDATE_NOTES = [
    "🚀 Nova artık daha hızlı ve akıcı!",
    "👨‍🏫 Nova daha çok eğitildi",
    "🔴Nova Live modu!. (menüden hemen geçin!)",
    "🏃‍➡️ Yazma hızı artırıldı.",
    "🐛 hatalar düzeldi .",
    "💻 Mağlesef nova play store için ertelendi😔 (ocak ayı 5 inden sonra)",
    "🚀 Nova limit hatasi bidaha yaşanmayacak."
];

function checkAppUpdate() {
    const savedVersion = localStorage.getItem('nova_app_version');
    const modal = document.getElementById('updateModal');
    const listContainer = document.getElementById('updateList');
    const badge = document.getElementById('modalVersionBadge');

    // Eğer kayıtlı versiyon yoksa veya eskiyse modalı göster
    if (savedVersion !== CURRENT_VERSION) {

        // Versiyon numarasını yaz
        badge.textContent = "V" + CURRENT_VERSION;

        // Listeyi oluştur
        let htmlList = "<ul>";
        UPDATE_NOTES.forEach(note => {
            htmlList += `<li>${note}</li>`;
        });
        htmlList += "</ul>";
        listContainer.innerHTML = htmlList;

        // Modalı göster
        modal.style.display = 'flex';
    }
}

function closeUpdateModal() {
    const modal = document.getElementById('updateModal');
    // Modalı gizle
    modal.style.display = 'none';
    // Yeni versiyonu kaydet ki bir daha sormasın
    localStorage.setItem('nova_app_version', CURRENT_VERSION);
}

// Sayfa yüklendiğinde kontrol et
window.addEventListener('DOMContentLoaded', () => {
    // Mevcut diğer yükleme kodlarının yanına eklenmiş gibi çalışır
    setTimeout(checkAppUpdate, 1000); // 1 saniye gecikmeli açılması daha şık durur
});

// Nova aktiflik animasyonu göstermek için
function showNovaActivePulse() {
    const pulse = document.getElementById("nova-active-pulse");
    if (!pulse) return;

    pulse.classList.add("active");
    clearTimeout(pulse._timeout);
    pulse._timeout = setTimeout(() => pulse.classList.remove("active"), 600);
}

// AddMessage fonksiyonunu güvenli şekilde sarmala
(function () {
    const originalAddMessage = window.addMessage;
    if (typeof originalAddMessage !== "function") {
    }
})();

// Sayfa yüklenince ekranı doğru başlat
window.addEventListener("DOMContentLoaded", () => {
    requestAnimationFrame(() => {
        toggleWelcomeScreen();
    });
});

// === SPLASH EKRANI ===
window.addEventListener("DOMContentLoaded", () => {
    const splash = document.getElementById("splash-screen");
    if (!splash) return;

    setTimeout(() => {
        splash.classList.add("fade-out");
        setTimeout(() => (splash.style.display = "none"), 800);
    }, 1800);
});

// === TOAST BİLDİRİM SİSTEMİ ===
function showToast(message, duration = 2500) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove("visible"), duration);
}

// === NOVA SESLİ OKUMA SİSTEMİ ===
function speakText(text) {
    const cleanText = cleanTextForSpeech(text);
    if (!cleanText) return;

    const synth = window.speechSynthesis;
    if (synth.speaking) synth.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "tr-TR";
    utterance.rate = 1;
    utterance.pitch = 1;

    // Sesleri yüklemeden önce bekle
    const speakNow = () => {
        let voices = synth.getVoices();
        const trVoice = voices.find(v => v.lang === "tr-TR" || v.lang.startsWith("tr"));
        if (trVoice) utterance.voice = trVoice;
        synth.speak(utterance);
    };

    if (!synth.getVoices().length) {
        synth.onvoiceschanged = () => speakNow();
    } else {
        speakNow();
    }
}


// === NOVA MESAJLARINA SESLİ OKUMA BUTONU ===
function addSpeechButton(div, text) {
    const btn = document.createElement("button");
    btn.textContent = "🔉";
    btn.className = "speak-btn";
    btn.title = "Mesajı sesli oku";

    const synth = window.speechSynthesis;
    let isSpeaking = false;
    let utterance = null;

    btn.addEventListener("click", () => {
        if (isSpeaking) {
            synth.cancel();
            isSpeaking = false;
            btn.textContent = "🔉";
            showToast("⏸️ Okuma durduruldu");
            return;
        }

        const cleanText = cleanTextForSpeech(text);
        if (!cleanText) return showToast("⚠️ Okunacak metin yok");

        utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "tr-TR";
        utterance.rate = 1;
        utterance.pitch = 1;

        const voices = synth.getVoices();
        const trVoice = voices.find(v => v.lang === "tr-TR" || v.lang.startsWith("tr"));
        if (trVoice) utterance.voice = trVoice;

        synth.cancel();
        synth.speak(utterance);

        btn.textContent = "⏸️";
        isSpeaking = true;
        showToast("🔊 Nova konuşuyor...");

        utterance.onend = () => {
            isSpeaking = false;
            btn.textContent = "🔉";
            showToast("✅ Okuma tamamlandı");
        };

        utterance.onerror = () => {
            isSpeaking = false;
            btn.textContent = "🔉";
            showToast("⚠️ Sesli okuma hatası");
        };
    });

    div.appendChild(btn);
}


// === METİN TEMİZLEME (Emoji ve özel karakterleri kaldır) ===
function cleanTextForSpeech(text) {
    return text
        .replace(/[\p{Emoji_Presentation}\p{Emoji}\p{Extended_Pictographic}]/gu, "")
        .replace(/[^0-9a-zA-ZğüşıöçĞÜŞİÖÇ\s.,!?]/g, "")
        // Virgülden sonra boşluk ekle ki sayılar düzgün okunsun
        .replace(/,/g, ", ")
        // Nokta varsa kısa duraklama sağla
        .replace(/\./g, ". ")
        .trim();
}

/* --- Core Logic --- */
const sideMenu = document.getElementById("sideMenu");
const menuToggle = document.getElementById("menuToggle");
const dragHandle = document.getElementById("dragHandle");
const chatsContainer = document.getElementById("chatsContainer");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const stopBtn = document.getElementById("stopBtn");
const menu = document.getElementById("menu");
const novaStatus = document.getElementById("novaStatus");
const quickBtns = document.getElementById("quickBtns");
const emojiPicker = document.getElementById("emojiPicker");
const newChatBtn = document.getElementById("newChatBtn");
const themeToggle = document.getElementById("themeToggle");
const toast = document.getElementById("toast");
const BACKEND_URL = 'https://nova-chat-d50f.onrender.com/api';

menuToggle.onclick = () => { sideMenu.classList.toggle("active"); };

// Drag handle
let isResizing = false;
dragHandle.addEventListener("mousedown", e => { isResizing = true; document.body.style.cursor = "col-resize"; });
document.addEventListener("mousemove", e => {
    if (!isResizing) return;
    let newWidth = e.clientX;
    if (newWidth < 150) newWidth = 150;
    if (newWidth > 500) newWidth = 500;
    sideMenu.style.width = newWidth + "px";
});
document.addEventListener("mouseup", e => { if (isResizing) { isResizing = false; document.body.style.cursor = "default"; } });

// Tema toggle
themeToggle.onclick = () => { document.body.classList.toggle("light"); showToast("Tema değiştirildi"); };

// User setup
let userId = localStorage.getItem("nova_user_id");
if (!userId) { userId = "user_" + Date.now() + "_" + Math.floor(Math.random() * 10000); localStorage.setItem("nova_user_id", userId); }
let currentChat = localStorage.getItem("nova_last_chat") || "default";
let sending = false;
let userInfo = JSON.parse(localStorage.getItem("nova_user_info_" + userId) || "{}");
// 👤 Kullanıcı adını userInfo'ya yaz
userInfo.name = novaUserName;


// Sanitize function (basit)
function sanitize(str) {
    const temp = document.createElement("div");
    temp.innerHTML = str;

    // Tüm <a> etiketlerini hedef="_blank" ile güvenli hâle getir
    temp.querySelectorAll('a').forEach(a => {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
    });

    return temp.innerHTML;
}

// 🔹 Tarih formatı
function formatDate(d) {
    return d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, '0') + "-" +
        String(d.getDate()).padStart(2, '0') + " " +
        String(d.getHours()).padStart(2, '0') + ":" +
        String(d.getMinutes()).padStart(2, '0');
}


function addChatToMenu(chatId, lastMessage = "Yeni Sohbet", skipSave = false) {
    if ([...menu.querySelectorAll(".chatBtn")].some(b => b.dataset.id === chatId)) return;
    const row = document.createElement("div"); row.className = "chatRow";
    const chatBtn = document.createElement("button"); chatBtn.className = "chatBtn"; chatBtn.dataset.id = chatId; chatBtn.onclick = () => { loadChat(chatId); };
    const deleteBtn = document.createElement("button"); deleteBtn.className = "deleteBtn"; deleteBtn.textContent = "❌";
    deleteBtn.onclick = async () => { if (confirm("Bu sohbeti silmek istediğine emin misin?")) { try { const res = await fetch(`${BACKEND_URL}/delete_chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, chatId }) }); const data = await res.json(); if (data.success) { row.remove(); const div = document.getElementById(chatId); if (div) div.remove(); if (currentChat === chatId) startNewChat(); } else showToast("Silme başarısız: " + (data.error || "")); } catch (err) { console.error(err); showToast("Silme sırasında hata!"); } } };
    row.appendChild(chatBtn); row.appendChild(deleteBtn); menu.appendChild(row); updateChatBtnLabel(chatBtn, lastMessage);
}

function updateChatBtnLabel(button, lastMessage) { if (lastMessage.length > 20) lastMessage = lastMessage.slice(0, 20) + "..."; button.textContent = lastMessage; }

function loadChat(cid) {
    currentChat = cid; Array.from(chatsContainer.children).forEach(c => c.style.display = "none");
    let div = document.getElementById(cid);
    if (!div) { div = document.createElement("div"); div.className = "chatDiv"; div.id = cid; chatsContainer.appendChild(div); }
    div.style.display = "flex";
    fetch(`${BACKEND_URL}/history?userId=${userId}`)
        .then(r => r.json())
        .then(data => { const msgs = data[cid] || []; div.innerHTML = ""; msgs.forEach(m => addMessage(m.text, m.sender, div)); });
    localStorage.setItem("nova_last_chat", cid);
}

function startNewChat() { const newId = "chat_" + Date.now() + "_" + Math.floor(Math.random() * 10000); addChatToMenu(newId, "Yeni Sohbet"); loadChat(newId); }

newChatBtn.addEventListener("click", e => { e.preventDefault(); startNewChat(); });

// 💬 MESAJ EKLEME VE KOD BLOKLARINI İŞLEME FONKSİYONU (DÜZELTİLMİŞ)
function addMessage(text, sender, container = null) {
    const parent = container || document.getElementById(currentChat);
    if (!parent) return;

    // Mesaj div'i
    const div = document.createElement("div");
    div.className = "msg " + sender;

    // Hoşgeldin ekranını gizle
    const welcome = document.getElementById("welcome-screen-" + currentChat) || document.getElementById("welcome-screen");
    if (welcome) {
        welcome.style.display = "none";
        welcome.classList.remove("visible");
    }

    // Mesaj metni - normal mesaj gibi
    const messageDiv = document.createElement("div");
    messageDiv.className = "message-content";
    messageDiv.textContent = text; // <-- Sadece normal metin, hiçbir ek özellik yok
    div.appendChild(messageDiv);

    // Zaman etiketi
    const timestamp = document.createElement("div");
    timestamp.className = "timestamp";
    timestamp.textContent = formatDate(new Date());
    div.appendChild(timestamp);

    // Mesajı parent container'a ekle
    parent.appendChild(div);
    parent.scroll({ top: parent.scrollHeight, behavior: "smooth" });
    
    // AddMessage Wrapper Logic (Yukarıdaki sarmalayıcının yaptığı işi burada tetikliyoruz)
    requestAnimationFrame(() => {
        toggleWelcomeScreen();
        showNovaActivePulse();
    });

    return div;
}
// === METİN İÇİNDEKİ KOD BLOKLARINI DÜZENLEYEN FONKSİYON ===
function formatTextWithCodeBlocks(text) {
    // ```dil ... ``` yapısını bul ve HTML'e çevir
    return text.replace(/```(\w*)?([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang || 'text'; // Dil belirtilmezse düz metin
        // HTML karakterlerini güvenli hale getir
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

// === KOD KOPYALAMA FONKSİYONU ===
function copyCodeToClipboard(btn) {
    // Butonun bulunduğu penceredeki kod elementini bul
    const codeElement = btn.parentElement.nextElementSibling.querySelector('code');
    const codeText = codeElement.innerText; // Sadece metni al

    navigator.clipboard.writeText(codeText).then(() => {
        const originalText = btn.textContent;
        btn.textContent = "✅ Kopyalandı";
        btn.style.background = "#2e7d32";

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = "#3a3f4b"; // Eski rengine dön
        }, 2000);
    }).catch(err => {
        console.error('Kopyalama hatası:', err);
    });
}

// === GÜNCELLENMİŞ ADD TYPING MESSAGE (RENKLENDİRME DESTEKLİ) ===
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

    // 1. AŞAMA: Harf harf yazma efekti (Düz metin görünür)
    let tempText = '';

    // Eğer metin çok uzunsa yazma hızını artır
    const dynamicDelay = text.length > 500 ? 1 : delay;

    for (let i = 0; i < text.length; i++) {
        tempText += text[i];
        contentDiv.textContent = tempText;

        // Performans için her harfte değil, her 5 harfte bir scroll yap
        if (i % 5 === 0) parent.scroll({ top: parent.scrollHeight, behavior: "smooth" });

        await new Promise(r => setTimeout(r, dynamicDelay));
    }

    // 2. AŞAMA: Yazma bitti, şimdi "Güzelleştirme" zamanı
    contentDiv.innerHTML = formatTextWithCodeBlocks(text);

    // Highlight.js kütüphanesini tetikle (Renklendirme burada olur!)
    contentDiv.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });

    // Linkleri aktif et
    if (typeof linkifyElementOpenExternally === "function") {
        linkifyElementOpenExternally(contentDiv);
    }

    // Zaman etiketi ve diğer butonlar
    const timestamp = document.createElement("div");
    timestamp.className = "timestamp";
    timestamp.textContent = formatDate(new Date());
    div.appendChild(timestamp);

    if (sender === "nova") {
        addSpeechButton(div, text);
        addDownloadButton(div);
    }

    parent.scroll({ top: parent.scrollHeight, behavior: "smooth" });
    return div;
}
// TXT butonu
function addDownloadButton(div) {
    const downloadBtn = document.createElement("button");
    downloadBtn.textContent = "💾 TXT indir";
    downloadBtn.className = "download-btn";
    downloadBtn.style.marginTop = "5px";
    downloadBtn.style.fontSize = "12px";
    downloadBtn.style.padding = "2px 6px";
    downloadBtn.style.cursor = "pointer";

    downloadBtn.onclick = () => {
        const txt = [...div.querySelectorAll(".message-content")].map(m => m.textContent).join("\n\n");
        if (!txt) return;
        const blob = new Blob([txt], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "nova_message.txt";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    div.appendChild(downloadBtn);
}

// Mesaj gönderme
async function sendMessage(msg = null) {
    if (sending) return;
    sending = true;

    const text = msg || input.value.trim();
    if (!text) { sending = false; return; }
    input.value = "";

    const chatDiv = document.getElementById(currentChat);
    if (!chatDiv) { sending = false; return; }

    // Kullanıcı mesajı
    addMessage(text, "user", chatDiv);

    // Nova yazıyor...
    const typingDiv = addMessage("Nova yazıyor...", "nova", chatDiv);
    novaStatus.textContent = "Nova yazıyor...";

    try {
        const resHist = await fetch(`${BACKEND_URL}/history?userId=${userId}`);
        const historyData = await resHist.json();
        const chatHistory = historyData[currentChat] || [];

        const res = await fetch(`${BACKEND_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, currentChat, message: text, userInfo, history: chatHistory })
        });

        const data = await res.json();
        typingDiv.remove();

        // Nova cevabı (her şey düz metin)
        await addTypingMessage(data.response || "⚠️ Hata", "nova", chatDiv);

        if (data.updatedUserInfo) {
            userInfo = data.updatedUserInfo;
            localStorage.setItem("nova_user_info_" + userId, JSON.stringify(userInfo));
        }

    } catch (err) {
        typingDiv.textContent = "Bağlantı hatası 🚫";
        console.error(err);
    }

    novaStatus.textContent = "Hazır";
    sending = false;
}


// Event listener
input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
sendBtn.addEventListener("click", e => { e.preventDefault(); sendMessage(); });
stopBtn.addEventListener("click", e => { e.preventDefault(); });

// Emoji picker
emojiPicker.innerHTML = "";
"😀😂😍😎🤔😢❤️🤖".split("").forEach(e => {
    const span = document.createElement("span");
    span.textContent = e;
    span.onclick = () => { input.value += e; input.focus(); };
    emojiPicker.appendChild(span);
});

// Quick buttons
quickBtns.querySelectorAll("button").forEach(b => {
    b.addEventListener("click", e => {
        e.preventDefault();
        sendMessage(b.textContent);
    });
});

window.addEventListener("DOMContentLoaded", () => {
    loadChat(currentChat);
    renderMenu();
});


// 🔴 Nova'dan hata geldiğinde çağrılacak fonksiyon
function showErrorMessage(errorText, lastUserMessage) {
    const chat = document.getElementById("chat");

    if (!chat) {
        console.error("Chat elementi bulunamadı. HTML'de id='chat' olduğundan emin ol.");
        return;
    }

    // Hata mesajı kutusu
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.innerHTML = `
    <div class="error-text">⚠️ ${errorText}</div>
    <button class="retry-btn">🔄 Yeniden Dene</button>
  `;

    const retryBtn = errorDiv.querySelector(".retry-btn");
    if (!retryBtn) {
        console.error("Retry butonu bulunamadı.");
        return;
    }

    // Butona tıklanınca son mesaj yeniden gönderilecek
    retryBtn.addEventListener("click", () => {
        errorDiv.remove(); // Eski hata mesajını sil
        if (lastUserMessage) {
            if (typeof sendMessage === "function") {
                sendMessage(lastUserMessage); // Kullanıcının son mesajını yeniden gönder
            } else {
                console.error("sendMessage fonksiyonu tanımlı değil.");
            }
        }
    });

    chat.appendChild(errorDiv);
    chat.scrollTop = chat.scrollHeight;
}

/* linkify + external open handler */
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
        let lastIndex = 0;
        let match;
        while ((match = urlRegex.exec(text)) !== null) {
            const urlText = match[0];
            const start = match.index;
            const end = urlRegex.lastIndex;

            if (start > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, start)));

            let href = urlText;
            if (/^www\./i.test(href)) href = 'http://' + href;

            // Trim trailing punctuation from href but keep punctuation in displayed text
            const trailingPunctMatch = href.match(/([)\]\.,;:!?]+)$/);
            let trailing = '';
            if (trailingPunctMatch) {
                trailing = trailingPunctMatch[1];
                href = href.slice(0, -trailing.length);
            }

            const a = document.createElement('a');
            a.href = href;
            a.textContent = urlText.replace(/([)\]\.,;:!?]+)$/, '');
            a.setAttribute('rel', 'noopener noreferrer');
            // not setting target here — we'll handle opening explicitly
            a.addEventListener('click', function (ev) {
                // Allow action if user Ctrl/Cmd/Meta-clicks or middle-clicks (open in new tab intentionally)
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

/* Açma mantığı: çeşitli ortamlar için fallback'ler */
function openExternally(url) {
    // Quick sanitization: allow only http/https/mailto/tel
    if (!/^((https?:)|(mailto:)|(tel:))/.test(url)) {
        // If user pasted "www.example.com" we already normalized to http:// earlier.
        // If still something else, force https
        url = 'https://' + url;
    }

    // 1) Try window.open with _blank (normal browser opens new tab)
    try {
        const newWin = window.open(url, '_blank', 'noopener,noreferrer');
        // If returned window is non-null, assume browser handled it
        if (newWin) return;
    } catch (e) {
        // ignore and fallback
    }

    // 2) If running as installed PWA or inside some WebView, try location change as fallback
    // Detect common 'display-mode' for PWAs
    const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true; // iOS

    // If standalone (installed PWA), use location.assign to try open in browser
    if (isStandalone) {
        // Force opening in a new top-level context by setting location.href.
        // Many Android PWAs (TWA) will open external links outside the app if URL is outside scope.
        // If the URL is same-origin and inside scope, this will still open inside the PWA.
        window.location.href = url;
        return;
    }

    // 3) For WebViews (wrapped APKs) - attempt to open via intent URL (Android Chrome)
    // This is a reasonable fallback for Android devices; it will open Chrome if available.
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
        try {
            // Build an intent scheme which most Android browsers understand and will open externally
            const intentUrl = 'intent://' + url.replace(/^https?:\/\//, '') +
                '#Intent;scheme=https;package=com.android.chrome;end';
            // try open intent
            window.location.href = intentUrl;
            return;
        } catch (e) {
            // ignore and continue fallback
        }
    }

    // 4) final fallback: try assigning top-level location (best-effort)
    window.top.location.href = url;
}

/* Örnek kullanım */
document.querySelectorAll('.message-content').forEach(el => linkifyElementOpenExternally(el));

// --- NOVA BİLDİRİM İZNİ ---
const firebaseConfig = {
    apiKey: "AIzaSyDqQAHCB2MizgN5Id5Ezfr3UPE1P3UlSS8",
    authDomain: "nova-329c7.firebaseapp.com",
    projectId: "nova-329c7",
    storageBucket: "nova-329c7.firebasestorage.app",
    messagingSenderId: "284547967902",
    appId: "1:284547967902:web:7dd2e64d1a643a30e5c48f"
};

// Firebase başlat
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

async function initNovaNotifications() {
    try {
        // İzin iste
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Bildirim izni verildi.');

            // Service Worker'ı kaydet
            const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

            // Token al (Vapid Key senin yönetici dosyanla uyumlu)
            const token = await messaging.getToken({
                serviceWorkerRegistration: reg,
                vapidKey: "BDMDVEtUfabWh6LAnM15zLGcK2R-1kxuSvjwegdx0q-I46l9GnBSSKimwAoIxUhOxh5QtRxAtt0Hj9PBl19qlxU"
            });

            if (token) {
                // Token'ı backend'e gönder
                await fetch('https://nova-chat-d50f.onrender.com/api/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: token })
                });
                console.log('Nova Token kaydedildi.');
            }
        } else {
            console.log('Bildirim izni reddedildi.');
        }
    } catch (error) {
        console.error('Bildirim hatası:', error);
    }
}

// Sayfa açılınca veya bir butona basınca çağır
window.addEventListener('load', initNovaNotifications);

// Ayarları tutan nesne
let appSettings = JSON.parse(localStorage.getItem("nova_settings")) || {
    language: "tr",
    primaryColor: "#00bfff",
    customInstructions: "",
    selectedVoiceURI: ""
};

// Çeviri Sözlüğü
const translations = {
    tr: { settings_title: "⚙️ Nova Ayarları", lbl_language: "Dil", lbl_instructions: "Özel Talimatlar", lbl_memory: "Kayıtlı Belleğim", lbl_theme_color: "Tema Rengi", lbl_voice_select: "Okuma Sesi", btn_save: "Kaydet" },
    en: { settings_title: "⚙️ Nova Settings", lbl_language: "Language", lbl_instructions: "Custom Instructions", lbl_memory: "My Memory", lbl_theme_color: "Theme Color", lbl_voice_select: "Voice Selection", btn_save: "Save" }
};

// Modalı Aç/Kapat
function openSettings() {
    document.getElementById("settingsModal").style.display = "flex";
    document.getElementById("customInstructions").value = appSettings.customInstructions;
    document.getElementById("primaryColorPicker").value = appSettings.primaryColor;
    document.getElementById("languageSelect").value = appSettings.language;
    
    // Belleği Göster (localStorage'dan çekilen userInfo)
    const userInfo = localStorage.getItem("nova_user_info_" + userId) || "{}";
    document.getElementById("memoryViewer").value = JSON.stringify(JSON.parse(userInfo), null, 2);
    
    loadVoices();
}

function closeSettings() { document.getElementById("settingsModal").style.display = "none"; }

// Ayarları Kaydet
function saveSettings() {
    appSettings.language = document.getElementById("languageSelect").value;
    appSettings.customInstructions = document.getElementById("customInstructions").value;
    appSettings.primaryColor = document.getElementById("primaryColorPicker").value;
    appSettings.selectedVoiceURI = document.getElementById("voiceSelect").value;
    
    // Belleği (Hafızayı) Manuel Güncelle
    try {
        const updatedMemory = JSON.parse(document.getElementById("memoryViewer").value);
        localStorage.setItem("nova_user_info_" + userId, JSON.stringify(updatedMemory));
    } catch(e) { alert("Bellek formatı hatalı!"); }

    localStorage.setItem("nova_settings", JSON.stringify(appSettings));
    applySettings();
    closeSettings();
}

// Ayarları Uygula (Renk ve Dil)
function applySettings() {
    document.documentElement.style.setProperty('--accent-color', appSettings.primaryColor);
    
    // Dil Çevirisi (data-lang etiketli yerleri bulur)
    const lang = appSettings.language;
    document.querySelectorAll("[data-lang]").forEach(el => {
        const key = el.getAttribute("data-lang");
        if(translations[lang][key]) el.textContent = translations[lang][key];
    });
}

// Sesleri Yükle
function loadVoices() {
    const voiceSelect = document.getElementById("voiceSelect");
    const voices = window.speechSynthesis.getVoices();
    voiceSelect.innerHTML = voices.map(v => `<option value="${v.voiceURI}" ${v.voiceURI === appSettings.selectedVoiceURI ? 'selected' : ''}>${v.name} (${v.lang})</option>`).join('');
}

// Konuşma Fonksiyonu (Ayarlardaki sesi kullanır)
function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(v => v.voiceURI === appSettings.selectedVoiceURI);
    window.speechSynthesis.speak(utterance);
}

// Ayarlar penceresini açar
function openSettings() {
    const modal = document.getElementById("settingsModal");
    if (modal) {
        modal.style.display = "flex";
        
        // Form alanlarını mevcut ayarlarla doldur
        if (document.getElementById("customInstructions")) {
            document.getElementById("customInstructions").value = appSettings.customInstructions || "";
        }
        if (document.getElementById("primaryColorPicker")) {
            document.getElementById("primaryColorPicker").value = appSettings.primaryColor || "#00bfff";
        }
        if (document.getElementById("languageSelect")) {
            document.getElementById("languageSelect").value = appSettings.language || "tr";
        }
        
        // Bellek verisini göster
        const memoryViewer = document.getElementById("memoryViewer");
        if (memoryViewer) {
            const userInfo = localStorage.getItem("nova_user_info_" + userId) || "{}";
            memoryViewer.value = JSON.stringify(JSON.parse(userInfo), null, 2);
        }
        
        // Ses listesini yükle
        if (typeof loadVoices === "function") loadVoices();
    }
}

// Ayarlar penceresini kapatır
function closeSettings() {
    const modal = document.getElementById("settingsModal");
    if (modal) {
        modal.style.display = "none";
    }
}