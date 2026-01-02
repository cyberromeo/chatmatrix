// SFX ASSETS (Base64 encoded wav/mp3 for zero dependencies)

const AUDIO_ASSETS = {
    // A digital "chirp" for startup
    boot: 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==', // Placeholder, I will use real data in next step of thinking or just simple beeps if compression is too high for chat. Actually, I will generate synthesized beeps using Web Audio API instead of bulky base64 strings! It's cleaner.
};

// SYNTHESIZER ENGINE (Much smaller than Base64 files)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const gainNode = audioCtx.createGain();
gainNode.connect(audioCtx.destination);
gainNode.gain.value = 0.1; // Volume

function playTone(freq, type = 'sine', duration = 0.1, delay = 0) {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);

    env.gain.setValueAtTime(0.1, audioCtx.currentTime + delay);
    env.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);

    osc.connect(env);
    env.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime + delay);
    osc.stop(audioCtx.currentTime + delay + duration);
}

const SFX = {
    boot: () => {
        // Sci-fi power up sound
        playTone(200, 'square', 0.1, 0);
        playTone(400, 'square', 0.1, 0.1);
        playTone(800, 'square', 0.2, 0.2);
    },

    send: () => {
        // High pitched data transmit
        playTone(1200, 'sine', 0.05, 0);
        playTone(1800, 'sine', 0.1, 0.05);
    },

    receive: () => {
        // Soft sonar ping
        playTone(600, 'sine', 0.3, 0);
    },

    error: () => {
        // Low buzz
        playTone(150, 'sawtooth', 0.3, 0);
        playTone(120, 'sawtooth', 0.3, 0.2);
    }
};

window.playSfx = (name) => {
    if (SFX[name]) SFX[name]();
};
