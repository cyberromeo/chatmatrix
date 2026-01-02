// SFX ASSETS
// Synthesizer Engine (Lazy Load)

let audioCtx;
let gainNode;

function initAudio() {
    if (audioCtx) return;

    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return; // Not supported

        audioCtx = new AudioContext();
        gainNode = audioCtx.createGain();
        gainNode.connect(audioCtx.destination);
        gainNode.gain.value = 0.1;
    } catch (e) {
        console.warn('Audio Init Failed', e);
    }
}

function playTone(freq, type = 'sine', duration = 0.1, delay = 0) {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => { });
    }

    try {
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
    } catch (e) {
        // Ignore play errors
    }
}

const SFX = {
    boot: () => {
        playTone(200, 'square', 0.1, 0);
        playTone(400, 'square', 0.1, 0.1);
        playTone(800, 'square', 0.2, 0.2);
    },

    send: () => {
        playTone(1200, 'sine', 0.05, 0);
        playTone(1800, 'sine', 0.1, 0.05);
    },

    receive: () => {
        playTone(600, 'sine', 0.3, 0);
    },

    error: () => {
        playTone(150, 'sawtooth', 0.3, 0);
        playTone(120, 'sawtooth', 0.3, 0.2);
    }
};

window.playSfx = (name) => {
    // Try to init on any play attempt, effectively lazy loading on first event
    if (!audioCtx) initAudio();
    if (SFX[name]) SFX[name]();
};
