const BACKEND_URL = 'https://nova-chat-d50f.onrender.com/api/chat';

const body = document.body;
const chatContainer = document.getElementById('chatContainer');
const statusText = document.getElementById('statusText');
const settingsPanel = document.getElementById('settingsPanel');
const voiceSelect = document.getElementById('voiceSelect');
const rateRange = document.getElementById('rateRange');
const pitchRange = document.getElementById('pitchRange');

let synth = window.speechSynthesis;
let voices = [];
let isTalking = false;

// Ayarlar Paneli Kontrolü
document.getElementById('settingsBtn').onclick = () => {
    settingsPanel.classList.toggle('active');
};

rateRange.oninput = e => document.getElementById('rateVal').textContent = e.target.value;
pitchRange.oninput = e => document.getElementById('pitchVal').textContent = e.target.value;

// Sesleri Yükle
function loadVoices() {
    voices = synth.getVoices();
    voiceSelect.innerHTML = voices
        .sort((a, b) => b.lang.includes('tr') - a.lang.includes('tr'))
        .map(v => `<option value="${v.voiceURI}">${v.name} (${v.lang})</option>`)
        .join('');
}

if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
}
loadVoices();

// --- MESAJ EKLEME (FOSFORLU EFEKT ENTEGRASYONU) ---
function addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    
    // Çift yıldız (**metin**) görünümünü fosforlu span'a dönüştürür
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<span class="highlight">$1</span>');
    
    div.innerHTML = formattedText; 
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// --- SESLİ OKUMA (EMOJİ VE YILDIZ TEMİZLEME) ---
function speak(text) {
    if(!text) return;
    
    isTalking = true;
    synth.cancel();

    // SES FİLTRESİ: Emojileri ve tüm yıldız (*) karakterlerini temizler
    let cleanText = text
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '') // Emojileri siler
        .replace(/\*/g, '') // Yıldızları siler
        .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    const selectedURI = voiceSelect.value;
    const selectedVoice = voices.find(v => v.voiceURI === selectedURI);
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.rate = parseFloat(rateRange.value);
    utterance.pitch = parseFloat(pitchRange.value);

    utterance.onstart = () => setStatus("Nova konuşuyor...", "speaking");
    utterance.onend = () => {
        isTalking = false;
        setStatus("Hazır", "");
    };

    synth.speak(utterance);
}

// --- SES TANIMA (STT) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
    alert("Tarayıcınız ses tanımayı desteklemiyor.");
} else {
    var recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.continuous = false;

    recognition.onstart = () => setStatus("Dinleniyor...", "listening");
    
    recognition.onresult = async e => {
        const text = e.results[0][0].transcript;
        addMessage(text, 'user');
        
        setStatus("Nova düşünüyor...", "processing");
        const reply = await sendToBackend(text);
        
        addMessage(reply, 'nova');
        speak(reply);
    };

    recognition.onerror = () => setStatus("Hata oluştu", "");
    recognition.onend = () => { if(!isTalking) setStatus("Hazır", ""); };
}

async function sendToBackend(text) {
    try {
        const res = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: text,
                userId: "voice_user_v3",
                currentChat: "voice_mode" 
            })
        });
        const data = await res.json();
        return data.response || "Anlayamadım, tekrar eder misin?";
    } catch (err) {
        return "Bağlantı hatası oluştu.";
    }
}

function setStatus(text, cls) {
    statusText.textContent = text;
    body.className = cls;
}

// Buton İşlemleri
document.getElementById('talkBtn').onclick = () => {
    if(isTalking) synth.cancel();
    recognition.start();
};

document.getElementById('stopBtn').onclick = () => {
    recognition.stop();
    synth.cancel();
    isTalking = false;
    setStatus("Hazır", "");
};