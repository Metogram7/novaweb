const BACKEND_URL = 'https://nova-chat-d50f.onrender.com/api/chat';

// DOM Elemanları
const body = document.body;
const chatContainer = document.getElementById('chatContainer');
const statusText = document.getElementById('statusText');
const settingsPanel = document.getElementById('settingsPanel');
const voiceSelect = document.getElementById('voiceSelect');
const rateRange = document.getElementById('rateRange');
const pitchRange = document.getElementById('pitchRange');

let recognition;
let synth = window.speechSynthesis;
let voices = [];
let isTalking = false;

/* --- AYARLAR --- */
document.getElementById('settingsBtn').onclick = () => {
    settingsPanel.classList.toggle('active');
    loadVoices();
};

rateRange.oninput = e => document.getElementById('rateVal').textContent = e.target.value;
pitchRange.oninput = e => document.getElementById('pitchVal').textContent = e.target.value;

/* --- SES YÜKLEME --- */
function loadVoices() {
    voices = synth.getVoices();
    voiceSelect.innerHTML = '';
    
    // Sesleri filtrele (Önce Türkçe, sonra İngilizce)
    const sortedVoices = voices.sort((a, b) => {
        const langA = a.lang.includes('tr');
        const langB = b.lang.includes('tr');
        return langB - langA;
    });

    sortedVoices.forEach((v, i) => {
        const opt = document.createElement('option');
        opt.textContent = `${v.name} (${v.lang})`;
        opt.value = v.voiceURI; // Index yerine URI kullanmak daha güvenli
        if (v.lang.includes('tr') && !voiceSelect.value) opt.selected = true;
        voiceSelect.appendChild(opt);
    });
}

// Mobilde sesler geç yüklenir
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
}
loadVoices();

/* --- KONUŞMA TANIMA (STT) --- */
function setupRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Tarayıcınız sesli sohbeti desteklemiyor. Lütfen Chrome kullanın.");
        return null;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'tr-TR';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => {
        setStatus("Dinleniyor...", "listening");
    };

    rec.onend = () => {
        if (!isTalking && body.classList.contains("listening")) {
             // Kendi kendine durduysa resetle
             setStatus("Hazır", "");
        }
    };

    rec.onerror = (e) => {
        console.error("STT Hatası:", e.error);
        setStatus("Hata: " + e.error, "");
    };

    rec.onresult = async e => {
        const text = e.results[0][0].transcript;
        addMessage(text, 'user');
        
        // Backend İsteği
        setStatus("Nova düşünüyor...", "processing");
        const reply = await sendToBackend(text);
        
        addMessage(reply, 'nova');
        speak(reply);
    };

    return rec;
}

recognition = setupRecognition();

/* --- BACKEND İLETİŞİMİ --- */
async function sendToBackend(text) {
    try {
        // Chat.js ile aynı ID'yi kullanmak mantıklı olurdu ama burada basit tuttuk
        const userId = localStorage.getItem("nova_user_id") || "voice_user";
        
        const res = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: text,
                userId: userId,
                // Chat.js'teki gibi tam yapı gerekebilir backend'e göre
                currentChat: "voice_mode" 
            })
        });
        
        const data = await res.json();
        return data.response || "Bir hata oluştu.";
    } catch (err) {
        console.error(err);
        return "Sunucu ile bağlantı kurulamadı.";
    }
}

/* --- METİN OKUMA (TTS) --- */
function speak(text) {
    if(!text) return;
    
    isTalking = true;
    synth.cancel();
    
    // Temiz metin (Emoji vs kaldırılabilir)
    const u = new SpeechSynthesisUtterance(text);
    
    // Seçili sesi bul
    const selectedURI = voiceSelect.value;
    const selectedVoice = voices.find(v => v.voiceURI === selectedURI);
    if (selectedVoice) u.voice = selectedVoice;
    else u.voice = voices.find(v => v.lang.includes('tr'));

    u.rate = parseFloat(rateRange.value);
    u.pitch = parseFloat(pitchRange.value);

    u.onstart = () => setStatus("Nova konuşuyor...", "speaking");
    
    u.onend = () => {
        isTalking = false;
        setStatus("Hazır", "");
        // Otomatik tekrar dinlemeye geçmek istersen:
        // recognition.start(); 
    };
    
    u.onerror = () => {
        isTalking = false;
        setStatus("Ses hatası", "");
    };

    synth.speak(u);
}

/* --- UI --- */
function setStatus(text, cls) {
    statusText.textContent = text;
    body.className = cls;
}

function addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    // Markdown basit render (opsiyonel kütüphane varsa)
    div.textContent = text; 
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

/* --- BUTONLAR --- */
document.getElementById('talkBtn').onclick = () => {
    if(isTalking) synth.cancel(); // Konuşuyorsa sustur ve dinle
    recognition.start();
};

document.getElementById('stopBtn').onclick = () => {
    recognition.stop();
    synth.cancel();
    isTalking = false;
    setStatus("Durduruldu", "");
};