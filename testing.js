document.addEventListener("DOMContentLoaded", () => {
    const candidateName = localStorage.getItem("candidateName") || "Candidate";
    const role = localStorage.getItem("role") || "Backend Developer";
    const company = localStorage.getItem("company") || "Amazon";
    const streak = parseInt(localStorage.getItem("prepPilot_streak") || "1", 10);

    // DOM Elements
    const titleEl = document.getElementById("test-candidate-title");
    const subtitleEl = document.getElementById("test-candidate-subtitle");
    const streakText = document.getElementById("test-streak-text");

    const startMicBtn = document.getElementById("start-mic-test-btn");
    const micHintText = document.getElementById("mic-hint-text");
    const micCanvas = document.getElementById("mic-waveform-canvas");
    const micDecibelText = document.getElementById("mic-decibel-text");
    const micVerifiedBadge = document.getElementById("mic-verified-badge");
    const micSpokenTranscript = document.getElementById("mic-spoken-transcript");

    const playVoiceBtn = document.getElementById("play-voice-test-btn");
    const speakerHintText = document.getElementById("speaker-hint-text");
    const voiceSelect = document.getElementById("voice-select");
    const voiceSpeed = document.getElementById("voice-speed");
    const voicePitch = document.getElementById("voice-pitch");
    const speedVal = document.getElementById("speed-val");
    const pitchVal = document.getElementById("pitch-val");
    const voiceVerifiedBadge = document.getElementById("voice-verified-badge");

    const testWebcamBtn = document.getElementById("test-webcam-btn");
    const webcamBox = document.getElementById("testing-webcam-box");
    const videoEl = document.getElementById("testing-video-element");

    const enterInterviewBtn = document.getElementById("enter-interview-btn");
    const toastContainer = document.getElementById("toast-container");

    // Populate Headers
    titleEl.textContent = `${candidateName}'s Audio & Hardware Setup`;
    subtitleEl.textContent = `${role} @ ${company}`;
    streakText.textContent = `${streak} Day Streak`;

    let micStream = null;
    let micAudioCtx = null;
    let micAnalyser = null;
    let micAnimId = null;
    let recognition = null;
    let isTestingMic = false;
    let speechRecognized = false;

    let camStream = null;
    let isTestingCam = false;

    function showToast(message, icon = "fa-circle-info") {
        const toast = document.createElement("div");
        toast.className = "toast";
        toast.innerHTML = `<i class="fa-solid ${icon}" style="color: var(--accent-blue);"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    // --- Voice Options Loader ---
    function populateVoiceList() {
        const voices = window.PrepPilotVoice ? window.PrepPilotVoice.getVoices() : [];
        if (voices.length > 0) {
            voiceSelect.innerHTML = "";
            voices.forEach((v) => {
                const opt = document.createElement("option");
                opt.value = v.name;
                opt.textContent = `${v.name} (${v.lang})`;
                if (v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha"))) {
                    opt.selected = true;
                }
                voiceSelect.appendChild(opt);
            });
            if (window.PrepPilotVoice && voiceSelect.value) {
                window.PrepPilotVoice.setVoice(voiceSelect.value);
            }
        }
    }

    setTimeout(populateVoiceList, 300);
    if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = populateVoiceList;
    }

    voiceSelect.addEventListener("change", () => {
        if (window.PrepPilotVoice) {
            window.PrepPilotVoice.setVoice(voiceSelect.value);
            localStorage.setItem("selectedVoiceName", voiceSelect.value);
        }
    });

    voiceSpeed.addEventListener("input", () => {
        speedVal.textContent = `${voiceSpeed.value}x`;
        if (window.PrepPilotVoice) {
            window.PrepPilotVoice.rate = parseFloat(voiceSpeed.value);
            localStorage.setItem("voiceRate", voiceSpeed.value);
        }
    });

    voicePitch.addEventListener("input", () => {
        pitchVal.textContent = `${voicePitch.value}x`;
        if (window.PrepPilotVoice) {
            window.PrepPilotVoice.pitch = parseFloat(voicePitch.value);
            localStorage.setItem("voicePitch", voicePitch.value);
        }
    });

    // --- 1. AI Voice Speaker Test ---
    playVoiceBtn.addEventListener("click", () => {
        playVoiceBtn.classList.add("active");
        playVoiceBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Speaking...';
        speakerHintText.textContent = "Playing voice sample through your speakers...";

        const testPhrase = `Hello ${candidateName}! Welcome to your PrepPilot interview. Your audio is sounding clean and clear.`;

        window.PrepPilotVoice.speak(
            testPhrase,
            () => {},
            () => {
                playVoiceBtn.classList.remove("active");
                playVoiceBtn.innerHTML = '<i class="fa-solid fa-play"></i> Test Voice';
                speakerHintText.textContent = "Voice test completed.";
                voiceVerifiedBadge.classList.remove("hidden");
                showToast("AI voice tested successfully!", "fa-volume-high");
            }
        );
    });

    // --- 2. Microphone Test & Real-Time Waveform Detection ---
    startMicBtn.addEventListener("click", async () => {
        if (isTestingMic) {
            stopMicTest();
            return;
        }

        try {
            micHintText.textContent = "Listening... Speak aloud into your microphone now";
            startMicBtn.classList.add("active");
            startMicBtn.innerHTML = '<i class="fa-solid fa-stop"></i> Stop Mic';
            isTestingMic = true;
            speechRecognized = false;

            // Direct hardware microphone access with noise cancellation
            micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            micAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = micAudioCtx.createMediaStreamSource(micStream);
            micAnalyser = micAudioCtx.createAnalyser();
            micAnalyser.fftSize = 128;
            micAnalyser.smoothingTimeConstant = 0.5;
            source.connect(micAnalyser);

            const canvasCtx = micCanvas.getContext("2d");
            const bufferLength = micAnalyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            function drawWaveform() {
                if (!isTestingMic) return;
                micAnalyser.getByteFrequencyData(dataArray);

                canvasCtx.fillStyle = "#020617";
                canvasCtx.fillRect(0, 0, micCanvas.width, micCanvas.height);

                let sum = 0;
                const barWidth = (micCanvas.width / bufferLength) * 2.2;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    const barHeight = (dataArray[i] / 255) * micCanvas.height;
                    sum += dataArray[i];

                    const gradient = canvasCtx.createLinearGradient(0, micCanvas.height, 0, 0);
                    gradient.addColorStop(0, "#3b82f6");
                    gradient.addColorStop(1, "#10b981");

                    canvasCtx.fillStyle = gradient;
                    canvasCtx.fillRect(x, micCanvas.height - barHeight, barWidth, Math.max(2, barHeight));
                    x += barWidth + 1;
                }

                const avg = sum / bufferLength;
                const pct = Math.min(100, Math.round((avg / 128) * 100 * 2.0));
                micDecibelText.textContent = `Microphone Signal: ${pct}%`;

                if (pct > 5) {
                    micVerifiedBadge.classList.remove("hidden");
                    if (!speechRecognized) {
                        micSpokenTranscript.textContent = `🟢 Voice signal actively detected (${pct}% volume)! Hardware mic is working.`;
                    }
                }

                micAnimId = requestAnimationFrame(drawWaveform);
            }
            drawWaveform();

            // Speech-to-text listener
            const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRec) {
                try {
                    recognition = new SpeechRec();
                    recognition.continuous = true;
                    recognition.interimResults = true;
                    recognition.lang = "en-US";

                    recognition.onresult = (e) => {
                        let trans = "";
                        for (let i = e.resultIndex; i < e.results.length; i++) {
                            trans += e.results[i][0].transcript;
                        }
                        if (trans.trim()) {
                            speechRecognized = true;
                            micSpokenTranscript.textContent = `Transcribed: "${trans}"`;
                            micVerifiedBadge.classList.remove("hidden");
                        }
                    };

                    recognition.onerror = (e) => {
                        console.warn("SpeechRec error:", e.error);
                        if (e.error === "network" || e.error === "not-allowed") {
                            micSpokenTranscript.innerHTML = `<span>Voice hardware detected! <em>Tip for Brave: Enable 'Google speech services' in brave://settings/privacy for auto-transcribe.</em></span>`;
                        }
                    };

                    recognition.start();
                } catch (e) {
                    console.warn("Speech recognition init error:", e);
                }
            }

            showToast("Microphone active! Speak to test voice input.", "fa-circle-check");
        } catch (err) {
            console.error("Mic test error:", err);
            micHintText.textContent = "Microphone access denied. Check browser permission bar.";
            startMicBtn.classList.remove("active");
            startMicBtn.innerHTML = '<i class="fa-solid fa-play"></i> Test Mic';
            isTestingMic = false;
            showToast("Could not access microphone. Please allow mic permission.", "fa-triangle-exclamation");
        }
    });

    function stopMicTest() {
        isTestingMic = false;
        if (micStream) {
            micStream.getTracks().forEach(t => t.stop());
            micStream = null;
        }
        if (micAudioCtx && micAudioCtx.state !== "closed") {
            micAudioCtx.close();
        }
        if (recognition) {
            try { recognition.stop(); } catch(e) {}
            recognition = null;
        }
        if (micAnimId) cancelAnimationFrame(micAnimId);
        startMicBtn.classList.remove("active");
        startMicBtn.innerHTML = '<i class="fa-solid fa-play"></i> Test Mic';
        micHintText.textContent = "Microphone test paused.";
    }

    // --- 3. Webcam Test ---
    testWebcamBtn.addEventListener("click", async () => {
        if (isTestingCam) {
            if (camStream) {
                camStream.getTracks().forEach(t => t.stop());
                camStream = null;
            }
            videoEl.srcObject = null;
            webcamBox.style.display = "none";
            testWebcamBtn.classList.remove("active");
            isTestingCam = false;
            return;
        }

        try {
            camStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            videoEl.srcObject = camStream;
            webcamBox.style.display = "block";
            testWebcamBtn.classList.add("active");
            isTestingCam = true;
            localStorage.setItem("enableCam", "true");
            showToast("Webcam is working!", "fa-video");
        } catch (e) {
            console.warn("Webcam access notice:", e);
            showToast("Webcam is optional for the interview.", "fa-circle-info");
        }
    });

    // --- 4. Proceed to Live Interview Room ---
    enterInterviewBtn.addEventListener("click", () => {
        if (isTestingMic) stopMicTest();
        if (camStream) {
            camStream.getTracks().forEach(t => t.stop());
        }

        enterInterviewBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entering Interview Room...';
        enterInterviewBtn.disabled = true;

        setTimeout(() => {
            window.location.href = "index.html";
        }, 300);
    });
});
