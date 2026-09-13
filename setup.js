document.addEventListener("DOMContentLoaded", () => {
    // UI Elements
    const nameInput = document.getElementById("candidate-name");
    const emailInput = document.getElementById("candidate-email");
    const roleSelect = document.getElementById("role");
    const customRoleWrapper = document.getElementById("custom-role-wrapper");
    const customRoleInput = document.getElementById("custom-role");
    const companySelect = document.getElementById("company");
    const customCompanyWrapper = document.getElementById("custom-company-wrapper");
    const customCompanyInput = document.getElementById("custom-company");
    const levelSelect = document.getElementById("level");
    const difficultySelect = document.getElementById("difficulty");
    const durationSelect = document.getElementById("duration");
    const modeSelect = document.getElementById("mode");
    const languageSelect = document.getElementById("language");
    const soundFxSelect = document.getElementById("sound-fx-toggle");

    // Summary Elements
    const sumRole = document.getElementById("sum-role");
    const sumCompany = document.getElementById("sum-company");
    const sumLevel = document.getElementById("sum-level");
    const sumMode = document.getElementById("sum-mode");
    const setupStreakText = document.getElementById("setup-streak-text");
    const historyGrowthPill = document.getElementById("history-growth-pill");
    const pastList = document.getElementById("past-list");

    // Hardware Test Buttons & Elements
    const testMicBtn = document.getElementById("test-mic-btn");
    const micStatusText = document.getElementById("mic-status-text");
    const micMeterBox = document.getElementById("mic-meter-box");
    const micMeterFill = document.getElementById("mic-meter-fill");
    const micTranscriptPreview = document.getElementById("mic-transcript-preview");

    const testCamBtn = document.getElementById("test-cam-btn");
    const camStatusText = document.getElementById("cam-status-text");
    const previewVideoBox = document.getElementById("preview-video-box");
    const setupVideoPreview = document.getElementById("setup-video-preview");

    const testVoiceBtn = document.getElementById("test-voice-btn");
    const voiceStatusText = document.getElementById("voice-status-text");
    const startBtn = document.getElementById("start-btn");
    const toastContainer = document.getElementById("toast-container");

    // State
    let audioContext = null;
    let micStream = null;
    let camStream = null;
    let recognition = null;
    let isTestingMic = false;
    let isTestingCam = false;
    let camEnabled = false;
    let cachedVoices = [];

    // Cache available SpeechSynthesis voices
    function populateVoices() {
        if ("speechSynthesis" in window) {
            cachedVoices = window.speechSynthesis.getVoices();
        }
    }
    populateVoices();
    if ("speechSynthesis" in window && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = populateVoices;
    }

    // Toast Notification helper
    function showToast(message, icon = "fa-circle-info") {
        const toast = document.createElement("div");
        toast.className = "toast";
        toast.innerHTML = `<i class="fa-solid ${icon}" style="color: var(--accent-blue);"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = "0";
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // Load & Render Streaks & Practice History
    function loadStreakAndHistory() {
        try {
            let streak = parseInt(localStorage.getItem("prepPilot_streak") || "3", 10);
            setupStreakText.textContent = `${streak} Day Streak`;

            let history = JSON.parse(localStorage.getItem("prepPilot_history") || "[]");
            if (history.length > 0) {
                pastList.innerHTML = "";
                let totalScore = 0;
                history.slice(-3).reverse().forEach(item => {
                    totalScore += item.score;
                    const div = document.createElement("div");
                    div.className = "past-item";
                    div.innerHTML = `
                        <span>${escapeHtml(item.role || "Developer")} @ ${escapeHtml(item.company || "Tech")}</span>
                        <span style="font-weight: 700; color: ${item.score >= 80 ? 'var(--success)' : 'var(--warning)'};">${item.score}/100</span>
                    `;
                    pastList.appendChild(div);
                });
                const avg = Math.round(totalScore / Math.min(3, history.length));
                historyGrowthPill.textContent = `Avg Score: ${avg}/100`;
            }
        } catch (e) {
            console.warn("Could not load history", e);
        }
    }

    function escapeHtml(string) {
        return String(string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Update Summary card
    function updateSummary() {
        const role = roleSelect.value === "CUSTOM" ? (customRoleInput.value.trim() || "Custom Role") : roleSelect.value;
        const company = companySelect.value === "CUSTOM" ? (customCompanyInput.value.trim() || "Custom Company") : companySelect.value;
        const level = levelSelect.options[levelSelect.selectedIndex].text.split("(")[0].trim();
        const diff = difficultySelect.options[difficultySelect.selectedIndex].text.split("(")[0].trim();
        const mode = modeSelect.options[modeSelect.selectedIndex].text.split("(")[0].trim();
        const duration = durationSelect.value;

        sumRole.textContent = role;
        sumCompany.textContent = company;
        sumLevel.textContent = `${level} • ${diff}`;
        sumMode.textContent = `${mode} • ${duration} Mins`;
    }

    // Role Custom Toggle
    roleSelect.addEventListener("change", () => {
        if (roleSelect.value === "CUSTOM") {
            customRoleWrapper.classList.add("visible");
            customRoleInput.focus();
        } else {
            customRoleWrapper.classList.remove("visible");
        }
        updateSummary();
    });

    customRoleInput.addEventListener("input", updateSummary);

    // Company Custom Toggle
    companySelect.addEventListener("change", () => {
        if (companySelect.value === "CUSTOM") {
            customCompanyWrapper.classList.add("visible");
            customCompanyInput.focus();
        } else {
            customCompanyWrapper.classList.remove("visible");
        }
        updateSummary();
    });

    customCompanyInput.addEventListener("input", updateSummary);

    levelSelect.addEventListener("change", updateSummary);
    difficultySelect.addEventListener("change", updateSummary);
    durationSelect.addEventListener("change", updateSummary);
    modeSelect.addEventListener("change", updateSummary);

    // Load any existing saved values from localStorage
    try {
        if (localStorage.getItem("candidateName")) nameInput.value = localStorage.getItem("candidateName");
        if (localStorage.getItem("candidateEmail")) emailInput.value = localStorage.getItem("candidateEmail");
        if (localStorage.getItem("soundFxEnabled")) soundFxSelect.value = localStorage.getItem("soundFxEnabled");
    } catch (e) {
        console.warn("Storage access restricted", e);
    }

    // --- Microphone Test & Audio Meter ---
    testMicBtn.addEventListener("click", async () => {
        if (isTestingMic) {
            stopMicTest();
            return;
        }

        try {
            micStatusText.textContent = "Listening... Speak into your mic";
            testMicBtn.classList.add("active");
            testMicBtn.innerHTML = '<i class="fa-solid fa-stop"></i> Stop';
            micMeterBox.style.display = "block";
            isTestingMic = true;

            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(micStream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            function analyzeAudio() {
                if (!isTestingMic) return;
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;
                const percentage = Math.min(100, Math.round((average / 128) * 100 * 1.8));
                micMeterFill.style.width = `${percentage}%`;
                requestAnimationFrame(analyzeAudio);
            }
            analyzeAudio();

            // Speech recognition test
            const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRec) {
                recognition = new SpeechRec();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = languageSelect.value;
                recognition.onresult = (event) => {
                    let transcript = "";
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        transcript += event.results[i][0].transcript;
                    }
                    micTranscriptPreview.textContent = `Heard: "${transcript}"`;
                };
                recognition.onerror = (err) => {
                    console.warn("Speech recognition test notice", err);
                    micTranscriptPreview.textContent = "Audio waveform signal active!";
                };
                try {
                    recognition.start();
                } catch(e) {}
            } else {
                micTranscriptPreview.textContent = "Live microphone audio signal active!";
            }

            showToast("Microphone verified! Audio input detected.", "fa-circle-check");
        } catch (err) {
            console.error("Mic access error:", err);
            micStatusText.textContent = "Microphone permission denied";
            testMicBtn.classList.remove("active");
            testMicBtn.innerHTML = '<i class="fa-solid fa-play"></i> Test Mic';
            isTestingMic = false;
            showToast("Could not access microphone. Please allow browser mic permission.", "fa-triangle-exclamation");
        }
    });

    function stopMicTest() {
        isTestingMic = false;
        if (micStream) {
            micStream.getTracks().forEach(track => track.stop());
            micStream = null;
        }
        if (audioContext && audioContext.state !== "closed") {
            audioContext.close();
        }
        if (recognition) {
            try { recognition.stop(); } catch(e) {}
            recognition = null;
        }
        micMeterFill.style.width = "0%";
        testMicBtn.classList.remove("active");
        testMicBtn.innerHTML = '<i class="fa-solid fa-play"></i> Test Mic';
        micStatusText.textContent = "Microphone ready ✓";
    }

    // --- Webcam Test ---
    testCamBtn.addEventListener("click", async () => {
        if (isTestingCam) {
            stopCamTest();
            return;
        }

        try {
            camStatusText.textContent = "Connecting camera...";
            testCamBtn.classList.add("active");
            testCamBtn.innerHTML = '<i class="fa-solid fa-stop"></i> Stop Cam';

            camStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            setupVideoPreview.srcObject = camStream;
            previewVideoBox.style.display = "block";
            isTestingCam = true;
            camEnabled = true;
            camStatusText.textContent = "Camera active ✓";
            showToast("Webcam connected successfully!", "fa-video");
        } catch (err) {
            console.error("Camera access error:", err);
            camStatusText.textContent = "Camera unavailable / denied";
            testCamBtn.classList.remove("active");
            testCamBtn.innerHTML = '<i class="fa-solid fa-camera"></i> Test Cam';
            isTestingCam = false;
            camEnabled = false;
            showToast("Camera access optional for interview.", "fa-circle-info");
        }
    });

    function stopCamTest() {
        isTestingCam = false;
        if (camStream) {
            camStream.getTracks().forEach(track => track.stop());
            camStream = null;
        }
        setupVideoPreview.srcObject = null;
        previewVideoBox.style.display = "none";
        testCamBtn.classList.remove("active");
        testCamBtn.innerHTML = '<i class="fa-solid fa-camera"></i> Test Cam';
        camStatusText.textContent = "Camera test stopped";
    }

    // --- AI Voice Synthesis Test (Robust Across All Browsers) ---
    testVoiceBtn.addEventListener("click", () => {
        if (!("speechSynthesis" in window)) {
            showToast("Speech synthesis is not supported on this browser.", "fa-triangle-exclamation");
            return;
        }

        // Resume audio context & cancel any stuck speech
        window.speechSynthesis.resume();
        window.speechSynthesis.cancel();

        testVoiceBtn.classList.add("active");
        testVoiceBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Speaking...';
        voiceStatusText.textContent = "Playing sample voice audio...";

        const sampleText = "Hello! I am PrepPilot AI. I am ready to conduct your live mock interview session.";
        const utterance = new SpeechSynthesisUtterance(sampleText);
        utterance.lang = languageSelect.value || "en-US";
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Fetch voices dynamically
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            const chosen = voices.find(v => (v.lang === utterance.lang || v.lang.startsWith("en")) && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha") || v.name.includes("English")));
            if (chosen) utterance.voice = chosen;
        }

        utterance.onend = () => {
            testVoiceBtn.classList.remove("active");
            testVoiceBtn.innerHTML = '<i class="fa-solid fa-play"></i> Sample Voice';
            voiceStatusText.textContent = "Voice verified ✓";
            showToast("AI voice playback complete!", "fa-volume-high");
        };

        utterance.onerror = (e) => {
            console.warn("Speech synthesis notice:", e);
            testVoiceBtn.classList.remove("active");
            testVoiceBtn.innerHTML = '<i class="fa-solid fa-play"></i> Sample Voice';
            voiceStatusText.textContent = "Voice ready ✓";
        };

        window.speechSynthesis.speak(utterance);
    });

    // --- Start Interview Form Submit ---
    startBtn.addEventListener("click", () => {
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();

        if (!name) {
            showToast("Please enter your candidate name before starting.", "fa-circle-exclamation");
            nameInput.focus();
            return;
        }

        // Determine final role & company
        const selectedRole = roleSelect.value;
        const customRole = customRoleInput.value.trim();
        const finalRole = selectedRole === "CUSTOM" ? (customRole || "Software Engineer") : selectedRole;

        const selectedCompany = companySelect.value;
        const customCompany = customCompanyInput.value.trim();
        const finalCompany = selectedCompany === "CUSTOM" ? (customCompany || "Tech Company") : selectedCompany;

        const level = levelSelect.value;
        const difficulty = difficultySelect.value;
        const duration = durationSelect.value;
        const mode = modeSelect.value;
        const language = languageSelect.value;
        const soundFx = soundFxSelect.value;

        // Stop pre-flight media devices
        if (isTestingMic) stopMicTest();
        if (isTestingCam) stopCamTest();

        // Increment or initialize practice streak
        try {
            let streak = parseInt(localStorage.getItem("prepPilot_streak") || "0", 10);
            localStorage.setItem("prepPilot_streak", (streak + 1).toString());
        } catch (e) {}

        // Save session config to localStorage
        try {
            localStorage.setItem("candidateName", name);
            localStorage.setItem("candidateEmail", email);
            localStorage.setItem("role", finalRole);
            localStorage.setItem("company", finalCompany);
            localStorage.setItem("level", level);
            localStorage.setItem("difficulty", difficulty);
            localStorage.setItem("duration", duration);
            localStorage.setItem("mode", mode);
            localStorage.setItem("language", language);
            localStorage.setItem("enableCam", camEnabled ? "true" : "false");
            localStorage.setItem("voiceEnabled", "true");
            localStorage.setItem("soundFxEnabled", soundFx);
        } catch (e) {
            console.error("Failed to save to localStorage", e);
        }

        startBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Initializing Session...';
        startBtn.disabled = true;

        setTimeout(() => {
            window.location.href = "index.html";
        }, 400);
    });

    // Initialize
    updateSummary();
    loadStreakAndHistory();
});
