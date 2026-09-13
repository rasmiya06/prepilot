/**
 * PrepPilot AI - High-Fidelity Crystal-Clear Speech Engine
 * - Smooth natural human voice using Web Speech API with sentence chunking
 * - Automatic Chromium/Linux speech pause prevention (keepalive)
 * - Zero shaking, zero distortion, zero robotic artifacts
 */

class PrepPilotVoiceEngine {
    constructor() {
        this.synth = window.speechSynthesis;
        this.isVoiceEnabled = true;
        this.isSoundFxEnabled = true;
        this.isSpeaking = false;
        this.audioCtx = null;
        this.voices = [];
        this.currentQueue = [];
        this.keepAliveInterval = null;
        this.selectedVoice = null;
        this.rate = 0.95; // Natural clear pace
        this.pitch = 1.0;

        this.initVoices();
    }

    getAudioContext() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === "suspended") {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    }

    initVoices() {
        if (!("speechSynthesis" in window)) return;

        const populate = () => {
            this.voices = window.speechSynthesis.getVoices();
            if (this.voices.length > 0 && !this.selectedVoice) {
                // Find highest quality natural English voice
                this.selectedVoice = this.voices.find(v => 
                    (v.lang.startsWith("en") || v.lang === "en-US") && 
                    (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Neural") || v.name.includes("Samantha") || v.name.includes("Jenny"))
                ) || this.voices.find(v => v.lang.startsWith("en")) || this.voices[0];
            }
        };

        populate();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = populate;
        }
    }

    getVoices() {
        if (this.voices.length === 0 && "speechSynthesis" in window) {
            this.voices = window.speechSynthesis.getVoices();
        }
        return this.voices;
    }

    setVoice(voiceName) {
        const found = this.voices.find(v => v.name === voiceName);
        if (found) {
            this.selectedVoice = found;
        }
    }

    // Play Gentle Chimes (zero harsh frequencies)
    playChime(type) {
        if (!this.isSoundFxEnabled) return;
        try {
            const ctx = this.getAudioContext();
            const now = ctx.currentTime;

            if (type === "start") {
                [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                    gain.gain.setValueAtTime(0.12, now + idx * 0.08);
                    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + idx * 0.08);
                    osc.stop(now + idx * 0.08 + 0.35);
                });
            } else if (type === "mic_on") {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(660, now);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (type === "mic_off") {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(440, now);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (type === "ai_reply") {
                [523.25, 659.25].forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                    gain.gain.setValueAtTime(0.1, now + idx * 0.08);
                    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.25);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + idx * 0.08);
                    osc.stop(now + idx * 0.08 + 0.25);
                });
            } else if (type === "complete") {
                [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(freq, now + idx * 0.1);
                    gain.gain.setValueAtTime(0.12, now + idx * 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.4);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + idx * 0.1);
                    osc.stop(now + idx * 0.1 + 0.4);
                });
            }
        } catch (e) {
            console.warn("Chime notice:", e);
        }
    }

    // Split long sentences for smooth speech without stutters
    splitIntoSentences(text) {
        // Strip markdown code fences, headers, asterisks
        const clean = text
            .replace(/```[\s\S]*?```/g, "Code snippet provided on screen.")
            .replace(/[*_#`]/g, "")
            .replace(/\n+/g, ". ")
            .trim();

        // Match sentence terminators (. ! ?)
        const raw = clean.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g);
        if (!raw || raw.length === 0) return [clean];
        return raw.map(s => s.trim()).filter(s => s.length > 0);
    }

    // Speak cleanly with zero jitter
    speak(text, onStart, onEnd) {
        if (!this.isVoiceEnabled || !("speechSynthesis" in window)) {
            if (onEnd) onEnd();
            return;
        }

        this.stop();
        this.isSpeaking = true;
        if (onStart) onStart();

        // Resume Audio Context / Speech Synthesis
        try {
            window.speechSynthesis.resume();
        } catch (e) {}

        const sentences = this.splitIntoSentences(text);
        let currentSentenceIdx = 0;

        // Keepalive interval for Linux Chromium to prevent speech-dispatcher pausing mid-speech
        if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = setInterval(() => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
            } else if (!this.isSpeaking) {
                clearInterval(this.keepAliveInterval);
            }
        }, 8000);

        const speakNext = () => {
            if (!this.isSpeaking || currentSentenceIdx >= sentences.length) {
                this.isSpeaking = false;
                if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
                if (onEnd) onEnd();
                return;
            }

            const sentenceText = sentences[currentSentenceIdx];
            currentSentenceIdx++;

            const utterance = new SpeechSynthesisUtterance(sentenceText);
            utterance.rate = this.rate;
            utterance.pitch = this.pitch;
            utterance.volume = 1.0;

            if (this.selectedVoice) {
                utterance.voice = this.selectedVoice;
            }

            utterance.onend = () => {
                speakNext();
            };

            utterance.onerror = (e) => {
                console.warn("Speech utterance notice:", e);
                speakNext();
            };

            try {
                window.speechSynthesis.speak(utterance);
            } catch (err) {
                console.warn("Speech speak error:", err);
                speakNext();
            }
        };

        speakNext();
    }

    stop() {
        this.isSpeaking = false;
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
        if ("speechSynthesis" in window) {
            try {
                window.speechSynthesis.cancel();
            } catch (e) {}
        }
    }
}

// Global Singleton Instance
window.PrepPilotVoice = new PrepPilotVoiceEngine();
