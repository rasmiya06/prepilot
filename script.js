/**
 * PrepPilot AI - Live Interactive Interview Engine
 * - Smooth natural human voice engine (zero shaking)
 * - Accurate Speech Recognition (Only transcribes what you actually speak)
 * - Strict Metric Evaluation (Accurate Zero-Response Detection & Real Scoring)
 * - Live Answer Coach & STAR Framework Tracking
 * - Explicit 1-Click Sample Answer & Voice Suggestions
 */

document.addEventListener("DOMContentLoaded", () => {
    // ==========================================
    // 1. CONFIGURATION & STATE
    // ==========================================
    const config = {
        name: localStorage.getItem("candidateName") || "Candidate",
        email: localStorage.getItem("candidateEmail") || "",
        role: localStorage.getItem("role") || "Backend Developer",
        company: localStorage.getItem("company") || "Amazon",
        level: localStorage.getItem("level") || "Entry-Level / Junior",
        difficulty: localStorage.getItem("difficulty") || "Medium",
        duration: parseInt(localStorage.getItem("duration") || "10", 10),
        mode: localStorage.getItem("mode") || "Mixed",
        language: localStorage.getItem("language") || "en-US",
        enableCam: localStorage.getItem("enableCam") === "true",
        voiceEnabled: localStorage.getItem("voiceEnabled") !== "false",
        soundFxEnabled: localStorage.getItem("soundFxEnabled") !== "false"
    };

    let totalQuestions = 5;
    if (config.duration <= 5) totalQuestions = 3;
    else if (config.duration <= 10) totalQuestions = 5;
    else if (config.duration <= 15) totalQuestions = 7;
    else totalQuestions = 9;

    let currentQuestionIndex = 0;
    let interviewQuestions = [];
    let sessionHistory = [];
    let timeRemainingSeconds = config.duration * 60;
    let timerInterval = null;
    let isVoiceActive = config.voiceEnabled;
    let isSoundFxActive = config.soundFxEnabled;
    let isListening = false;
    let isCamActive = config.enableCam;
    let isInterviewEnded = false;
    let currentStreak = parseInt(localStorage.getItem("prepPilot_streak") || "1", 10);

    // Sync saved voice settings
    if (window.PrepPilotVoice) {
        window.PrepPilotVoice.isVoiceEnabled = isVoiceActive;
        window.PrepPilotVoice.isSoundFxEnabled = isSoundFxActive;
        const savedVoice = localStorage.getItem("selectedVoiceName");
        if (savedVoice) window.PrepPilotVoice.setVoice(savedVoice);
        const savedRate = localStorage.getItem("voiceRate");
        if (savedRate) window.PrepPilotVoice.rate = parseFloat(savedRate);
        const savedPitch = localStorage.getItem("voicePitch");
        if (savedPitch) window.PrepPilotVoice.pitch = parseFloat(savedPitch);
    }

    let recognition = null;
    let pipStream = null;
    let pipAnalyser = null;
    let pipAnimFrame = null;

    let micAudioStream = null;
    let micAudioCtx = null;
    let micAnalyserNode = null;
    let micCanvasAnimId = null;

    // ==========================================
    // 2. DOM ELEMENTS
    // ==========================================
    const headerMetaPill = document.getElementById("header-meta-pill");
    const sessionTimerEl = document.getElementById("session-timer");
    const questionProgressText = document.getElementById("question-progress-text");
    const progressBarFill = document.getElementById("progress-bar-fill");
    const sessionStreakText = document.getElementById("session-streak-text");
    
    // Header Buttons
    const voiceToggleBtn = document.getElementById("voice-toggle");
    const soundfxToggleBtn = document.getElementById("soundfx-toggle");
    const camToggleBtn = document.getElementById("cam-toggle");
    const codeToggleBtn = document.getElementById("code-toggle");
    const endInterviewBtn = document.getElementById("end-interview-btn");

    // Stage Elements
    const avatarContainer = document.getElementById("avatar-container");
    const aiStatus = document.getElementById("ai-status");
    const chatHistory = document.getElementById("chat-history");
    const aiLoading = document.getElementById("ai-loading");
    const liveTranscriptBox = document.getElementById("live-transcript-box");
    const liveTranscriptText = document.getElementById("live-transcript-text");
    const micLabelStatus = document.getElementById("mic-label-status");
    const voiceSuggestionChips = document.getElementById("voice-suggestion-chips");

    // Quick Chips
    const chipHint = document.getElementById("chip-hint");
    const chipRepeat = document.getElementById("chip-repeat");
    const chipSkip = document.getElementById("chip-skip");
    const chipCodepad = document.getElementById("chip-codepad");

    // Candidate PiP
    const candidatePip = document.getElementById("candidate-pip");
    const pipVideo = document.getElementById("pip-video");
    const closePipBtn = document.getElementById("close-pip-btn");
    const pipMicFill = document.getElementById("pip-mic-fill");

    // Code Drawer
    const codeDrawer = document.getElementById("code-drawer");
    const codeInput = document.getElementById("code-input");
    const codeLanguage = document.getElementById("code-language");
    const insertCodeBtn = document.getElementById("insert-code-btn");
    const clearCodeBtn = document.getElementById("clear-code-btn");
    const closeCodeBtn = document.getElementById("close-code-btn");

    // Live Answer Coach Elements
    const coachWordCount = document.getElementById("coach-word-count");
    const coachQualityLabel = document.getElementById("coach-quality-label");
    const qDot1 = document.getElementById("q-dot-1");
    const qDot2 = document.getElementById("q-dot-2");
    const qDot3 = document.getElementById("q-dot-3");
    const qDot4 = document.getElementById("q-dot-4");
    const starS = document.getElementById("star-s");
    const starT = document.getElementById("star-t");
    const starA = document.getElementById("star-a");
    const starR = document.getElementById("star-r");
    const sampleAnswerBtn = document.getElementById("sample-answer-btn");
    const polishAnswerBtn = document.getElementById("polish-answer-btn");

    // Input Controls
    const userInput = document.getElementById("user-input");
    const micBtn = document.getElementById("mic-btn");
    const liveInputCanvas = document.getElementById("live-input-canvas");
    const clearTextBtn = document.getElementById("clear-text-btn");
    const sendBtn = document.getElementById("send-btn");
    const toastContainer = document.getElementById("toast-container");

    // Modals
    const confirmModal = document.getElementById("confirm-modal");
    const cancelEndBtn = document.getElementById("cancel-end-btn");
    const confirmEndBtn = document.getElementById("confirm-end-btn");
    const reportPage = document.getElementById("report-page");

    // Report Elements
    const repName = document.getElementById("rep-name");
    const repRoleCompany = document.getElementById("rep-role-company");
    const repDate = document.getElementById("rep-date");
    const repVerdict = document.getElementById("rep-verdict");
    const repStreakPill = document.getElementById("rep-streak-pill");
    const resOverall = document.getElementById("res-overall");
    const resTech = document.getElementById("res-tech");
    const resComm = document.getElementById("res-comm");
    const resConf = document.getElementById("res-conf");
    const resFeedback = document.getElementById("res-feedback");
    const resStrengths = document.getElementById("res-strengths");
    const resImprovements = document.getElementById("res-improvements");
    const qaReviewList = document.getElementById("qa-review-list");
    const restartInterviewBtn = document.getElementById("restart-interview-btn");
    const copySummaryBtn = document.getElementById("copy-summary-btn");
    const printPdfBtn = document.getElementById("print-pdf-btn");

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

    // ==========================================
    // 3. QUESTION BANK & GENERATOR
    // ==========================================
    function generateInterviewQuestions() {
        const role = config.role.toLowerCase();
        const company = config.company;
        const mode = config.mode;

        const roleQuestions = {
            backend: [
                {
                    q: `How would you design a distributed caching layer for a high-traffic microservices architecture to handle cache stampede and ensure eventual data consistency?`,
                    hint: `Discuss Cache-Aside vs Write-Through, Redis cluster, TTL jitter, mutex locks for stampedes, and cache invalidation strategies.`,
                    ideal: `Explain Cache-Aside pattern, Redis replication, probabilistic early expiration (XFetch) or distributed locks (Redlock) for stampede protection, and CDC (Change Data Capture) with Debezium/Kafka for invalidation.`,
                    sampleAnswer: `In our high-traffic architecture, I implement the Cache-Aside pattern with a Redis Cluster. To prevent cache stampedes when hot keys expire, we use distributed mutex locks (Redlock) and randomized TTL jitter. For cache invalidation, we listen to DB change events via Kafka CDC to maintain eventual consistency.`,
                    chips: ["Cache-Aside with Redis", "Distributed Mutex (Redlock)", "TTL Jitter & Kafka CDC", "Probabilistic Expiration (XFetch)"]
                },
                {
                    q: `When scaling a relational database (like PostgreSQL/MySQL), compare the trade-offs of database indexing strategies, read-replicas, partitioning, and database sharding.`,
                    hint: `Focus on B-Tree vs GIN indexes, replication lag, horizontal vs vertical partitioning, and shard key selection.`,
                    ideal: `Explain write overhead on secondary indexes, asynchronous vs synchronous replication lag, hash/range sharding, cross-shard joins/transactions, and when to transition to NoSQL/NewSQL.`,
                    sampleAnswer: `I evaluate database indexing carefully: B-Tree for range/equality queries, while minimizing index count to reduce write latency. For read-heavy loads, we deploy read-replicas while managing replication lag. If a table exceeds hundreds of millions of rows, we implement range or hash partitioning before evaluating horizontal sharding.`,
                    chips: ["B-Tree vs GIN Indexes", "Read-Replicas & Replication Lag", "Range Partitioning", "Horizontal Sharding Strategy"]
                },
                {
                    q: `How do you ensure idempotency, rate limiting, and fault-tolerance across asynchronous REST and gRPC API endpoints in a distributed system?`,
                    hint: `Discuss Idempotency Keys (stored in Redis), Token Bucket / Leaky Bucket algorithms, and Circuit Breaker patterns.`,
                    ideal: `Explain Unique Idempotency Keys mapped to request fingerprints, Token Bucket algorithm in API gateways, Circuit Breakers (Resilience4j/Envoy), and dead-letter queues (DLQ) for retries.`,
                    sampleAnswer: `For idempotency, clients pass an Idempotency-Key stored in Redis with atomic SETNX. For rate limiting, we use the Token Bucket algorithm at the API gateway layer. To prevent cascading failures, we configure Circuit Breakers with fallback responses and Dead Letter Queues for async retries.`,
                    chips: ["Idempotency Keys with Redis SETNX", "Token Bucket Rate Limiting", "Circuit Breaker Fallbacks", "Dead-Letter Queues (DLQ)"]
                }
            ],
            frontend: [
                {
                    q: `How do modern JavaScript frameworks optimize DOM rendering, and how would you diagnose and fix an unnecessary re-render issue in a large production application?`,
                    hint: `Mention Virtual DOM, reconciliation, memoization (React.memo / useMemo / useCallback), React Profiler, or reactive signals.`,
                    ideal: `Explain the Virtual DOM diffing process, state immutability, using Chrome DevTools / React Profiler to identify render triggers, splitting components, and using memoization hooks responsibly.`,
                    sampleAnswer: `I diagnose rendering bottlenecks using the React Profiler to record component re-render frequency and commit durations. I resolve unnecessary renders by lifting state down, memoizing expensive computations with useMemo, and stabilizing callback references with useCallback.`,
                    chips: ["React Profiler Diagnostics", "useMemo & useCallback", "Lifting State Down", "Virtual DOM Reconciliation"]
                },
                {
                    q: `Explain how the Web Performance Critical Rendering Path works, and what specific architectural strategies you implement to optimize Core Web Vitals (LCP, INP, CLS)?`,
                    hint: `Focus on HTML/CSS parsing, script async/defer, image optimization, font display swap, and server-side rendering / streaming.`,
                    ideal: `Break down DOM/CSSOM tree construction, layout, paint, composite. Discuss optimizing critical CSS, deferring non-critical JS, responsive WebP/AVIF images with layout reservations, and SSR/edge caching.`,
                    sampleAnswer: `To optimize LCP, we prioritize critical CSS, preload hero images, and use edge SSR. For INP, we minimize main thread blocking by breaking long tasks with requestIdleCallback and web workers. For CLS, we set explicit aspect-ratios on media containers.`,
                    chips: ["Critical CSS & Preload LCP", "Web Workers for INP", "Aspect Ratios for CLS", "Edge SSR Streaming"]
                }
            ],
            behavioral: [
                {
                    q: `Tell me about a time when you faced a severe production outage or high-stakes technical roadblock. How did you diagnose the issue, communicate with stakeholders, and prevent future recurrences?`,
                    hint: `Use the STAR method: Situation, Task, Action, Result. Highlight root-cause analysis (RCA) and blameless post-mortems.`,
                    ideal: `Structured STAR story detailing the crisis context, systematic triage with observability logs, customer-facing communication, rollback or hotfix execution, and post-incident action items.`,
                    sampleAnswer: `Situation: During peak holiday traffic, our payment gateway service experienced elevated 504 gateway timeouts. Task: As on-call engineer, I needed to restore service immediately. Action: I inspected APM traces, identified a DB connection pool exhaustion bug from a recent release, and initiated an instant rollback within 6 minutes while sending updates to customer support. Result: Service restored in 12 minutes, and we added automated circuit breaking to prevent recurrence.`,
                    chips: ["STAR Situation & Task", "APM Traces & Root Cause", "Automated Rollback Action", "12-Min Recovery Metric"]
                }
            ]
        };

        let pool = [];
        if (mode.includes("Behavioral")) {
            pool = [...roleQuestions.behavioral];
        } else if (role.includes("front")) {
            pool = [roleQuestions.frontend[0], roleQuestions.behavioral[0], roleQuestions.frontend[1]];
        } else {
            pool = [roleQuestions.backend[0], roleQuestions.behavioral[0], roleQuestions.backend[1], roleQuestions.backend[2]];
        }

        const companyGreetings = {
            Amazon: `Hello ${config.name}! At Amazon, our builders lead with Customer Obsession and Ownership. To kick off our session: `,
            Google: `Welcome ${config.name}! At Google, we emphasize scalable engineering, robust problem-solving, and clean design principles. To begin: `,
            Meta: `Hi ${config.name}! Welcome to your Meta technical interview. We value rapid iteration and building for global scale. Let's start: `,
            Microsoft: `Welcome ${config.name}! At Microsoft, we focus on resilient, high-impact systems. Let's begin with our first question: `
        };

        const greeting = companyGreetings[company] || `Welcome ${config.name}! I am excited to interview you for the ${config.level} ${config.role} position at ${config.company}. Let's begin: `;

        const selected = pool.slice(0, totalQuestions);
        while (selected.length < totalQuestions) {
            selected.push({
                q: `Can you discuss a complex engineering challenge you solved recently, explaining the architectural trade-offs you evaluated and why you chose your specific approach?`,
                hint: `Detail problem statement, alternative solutions considered, rationale, and quantitative impact.`,
                ideal: `Clear problem decomposition, comparison of 2-3 alternatives, technical justification, performance metrics, and retrospective learnings.`,
                sampleAnswer: `In our production pipeline handling 2M records daily, we replaced batch processing with stream workers using backpressure, cutting memory usage by 60% and reducing job runtime from 4 hours to 45 minutes.`,
                chips: ["Stream Workers Architecture", "Backpressure Optimization", "60% Memory Reduction", "Latency & SLA Improvement"]
            });
        }

        selected[0] = {
            ...selected[0],
            q: greeting + selected[0].q
        };

        return selected;
    }

    // ==========================================
    // 4. UI INITIALIZATION & RENDERERS
    // ==========================================
    function initUI() {
        headerMetaPill.textContent = `${config.role} • ${config.company}`;
        sessionStreakText.textContent = `${currentStreak} Day Streak`;
        updateQuestionTracker();
        updateTimerDisplay();

        if (config.enableCam) {
            startWebcamPiP();
        }

        voiceToggleBtn.classList.toggle("active", isVoiceActive);
        voiceToggleBtn.innerHTML = isVoiceActive ? '<i class="fa-solid fa-volume-high"></i> <span>Voice On</span>' : '<i class="fa-solid fa-volume-xmark"></i> <span>Voice Off</span>';

        soundfxToggleBtn.classList.toggle("active", isSoundFxActive);
        soundfxToggleBtn.innerHTML = isSoundFxActive ? '<i class="fa-solid fa-bell"></i> <span>FX On</span>' : '<i class="fa-solid fa-bell-slash"></i> <span>FX Off</span>';
    }

    function updateQuestionTracker() {
        const displayIndex = Math.min(currentQuestionIndex + 1, totalQuestions);
        questionProgressText.textContent = `Q ${displayIndex} of ${totalQuestions}`;
        const pct = (displayIndex / totalQuestions) * 100;
        progressBarFill.style.width = `${pct}%`;
        renderVoiceSuggestionChips();
    }

    function renderVoiceSuggestionChips() {
        voiceSuggestionChips.innerHTML = "";
        const currentQ = interviewQuestions[currentQuestionIndex];
        if (currentQ && currentQ.chips) {
            currentQ.chips.forEach(text => {
                const chip = document.createElement("button");
                chip.type = "button";
                chip.className = "v-chip";
                chip.innerHTML = `<i class="fa-regular fa-comment-dots" style="color: var(--accent-blue);"></i> ${escapeHtml(text)}`;
                chip.addEventListener("click", () => {
                    userInput.value = (userInput.value ? userInput.value.trim() + " " : "") + text;
                    autoResizeTextarea();
                    updateLiveAnswerCoach();
                    userInput.focus();
                });
                voiceSuggestionChips.appendChild(chip);
            });
        }
    }

    function updateTimerDisplay() {
        const mins = Math.floor(timeRemainingSeconds / 60);
        const secs = timeRemainingSeconds % 60;
        sessionTimerEl.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

        if (timeRemainingSeconds <= 60 && timeRemainingSeconds > 0) {
            sessionTimerEl.style.color = "var(--danger)";
        }
    }

    function startTimer() {
        timerInterval = setInterval(() => {
            if (isInterviewEnded) {
                clearInterval(timerInterval);
                return;
            }
            timeRemainingSeconds--;
            updateTimerDisplay();

            if (timeRemainingSeconds === 60) {
                showToast("1 minute remaining in your interview session.", "fa-clock");
            }

            if (timeRemainingSeconds <= 0) {
                clearInterval(timerInterval);
                showToast("Session time concluded. Compiling evaluation report...", "fa-flag-checkered");
                concludeInterview();
            }
        }, 1000);
    }

    function getTimestamp() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function appendMessage(sender, text) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${sender === "ai" ? "ai-message" : "user-message"}`;

        const bubble = document.createElement("div");
        bubble.className = "bubble";

        const meta = document.createElement("div");
        meta.className = "bubble-meta";

        if (sender === "ai") {
            meta.innerHTML = `
                <span class="sender-tag"><i class="fa-solid fa-robot"></i> PrepPilot AI</span>
                <div class="bubble-actions">
                    <span style="font-size: 0.72rem; color: var(--text-dim);">${getTimestamp()}</span>
                    <button class="msg-action-btn replay-speech-btn" title="Listen to question"><i class="fa-solid fa-volume-high"></i></button>
                    <button class="msg-action-btn copy-msg-btn" title="Copy text"><i class="fa-regular fa-copy"></i></button>
                </div>
            `;
        } else {
            meta.innerHTML = `
                <div class="bubble-actions">
                    <span style="font-size: 0.72rem; color: rgba(255,255,255,0.7);">${getTimestamp()}</span>
                    <button class="msg-action-btn copy-msg-btn" title="Copy text" style="color: rgba(255,255,255,0.8);"><i class="fa-regular fa-copy"></i></button>
                </div>
                <span class="sender-tag" style="color: #fff;"><i class="fa-solid fa-user"></i> ${escapeHtml(config.name)}</span>
            `;
        }

        const content = document.createElement("div");
        content.className = "bubble-content";

        if (text.includes("```")) {
            const parts = text.split("```");
            let formattedHtml = "";
            parts.forEach((part, index) => {
                if (index % 2 === 1) {
                    const lines = part.trim().split("\n");
                    const lang = lines[0].trim();
                    const codeBody = lang && !lang.includes(" ") ? lines.slice(1).join("\n") : part;
                    formattedHtml += `<pre><code>${escapeHtml(codeBody || part)}</code></pre>`;
                } else {
                    formattedHtml += `<p>${escapeHtml(part).replace(/\n/g, "<br>")}</p>`;
                }
            });
            content.innerHTML = formattedHtml;
        } else {
            content.innerHTML = `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`;
        }

        bubble.appendChild(meta);
        bubble.appendChild(content);
        msgDiv.appendChild(bubble);
        chatHistory.appendChild(msgDiv);

        chatHistory.scrollTop = chatHistory.scrollHeight;
        const viewport = document.getElementById("viewport");
        if (viewport) viewport.scrollTop = viewport.scrollHeight;

        const copyBtn = bubble.querySelector(".copy-msg-btn");
        if (copyBtn) {
            copyBtn.addEventListener("click", () => {
                navigator.clipboard.writeText(text);
                showToast("Copied to clipboard!", "fa-copy");
            });
        }

        const replayBtn = bubble.querySelector(".replay-speech-btn");
        if (replayBtn) {
            replayBtn.addEventListener("click", () => {
                playAiSpeech(text);
            });
        }

        return msgDiv;
    }

    function escapeHtml(string) {
        return String(string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function setAiState(state, customMessage) {
        if (state === "speaking") {
            avatarContainer.classList.add("speaking");
            avatarContainer.classList.remove("listening");
            aiStatus.textContent = customMessage || "AI Interviewer is speaking...";
            aiStatus.style.color = "var(--text-highlight)";
        } else if (state === "listening") {
            avatarContainer.classList.remove("speaking");
            avatarContainer.classList.add("listening");
            aiStatus.textContent = customMessage || "Listening to your answer...";
            aiStatus.style.color = "var(--success)";
        } else if (state === "evaluating") {
            avatarContainer.classList.remove("speaking");
            avatarContainer.classList.remove("listening");
            aiStatus.textContent = customMessage || "Analyzing response...";
            aiStatus.style.color = "var(--accent-blue)";
        } else {
            avatarContainer.classList.remove("speaking");
            avatarContainer.classList.remove("listening");
            aiStatus.textContent = customMessage || "Ready for your answer";
            aiStatus.style.color = "var(--text-secondary)";
        }
    }

    // ==========================================
    // 5. SMOOTH NATURAL AI VOICE
    // ==========================================
    function playAiSpeech(text, onComplete) {
        if (!isVoiceActive || !window.PrepPilotVoice) {
            if (onComplete) onComplete();
            return;
        }

        setAiState("speaking");
        window.PrepPilotVoice.playChime("ai_reply");

        window.PrepPilotVoice.speak(
            text,
            () => setAiState("speaking"),
            () => {
                setAiState("ready");
                if (onComplete) onComplete();
            }
        );
    }

    // ==========================================
    // 6. ACCURATE MICROPHONE & SPEECH RECOGNITION
    // ==========================================
    async function startListening() {
        if (window.PrepPilotVoice) {
            window.PrepPilotVoice.stop();
        }

        isListening = true;
        micBtn.classList.add("recording");
        liveInputCanvas.classList.add("active");
        liveTranscriptBox.classList.add("active");
        micLabelStatus.textContent = "Microphone Live:";
        liveTranscriptText.textContent = "Listening for your voice... Speak aloud into your mic";
        setAiState("listening");
        if (window.PrepPilotVoice) window.PrepPilotVoice.playChime("mic_on");

        // Web Audio real-time waveform visualizer
        try {
            if (!micAudioStream) {
                micAudioStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
            }
            micAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = micAudioCtx.createMediaStreamSource(micAudioStream);
            micAnalyserNode = micAudioCtx.createAnalyser();
            micAnalyserNode.fftSize = 64;
            source.connect(micAnalyserNode);

            const canvasCtx = liveInputCanvas.getContext("2d");
            const buffer = new Uint8Array(micAnalyserNode.frequencyBinCount);

            function drawLiveMic() {
                if (!isListening) return;
                micAnalyserNode.getByteFrequencyData(buffer);

                canvasCtx.fillStyle = "rgba(10, 15, 28, 0.6)";
                canvasCtx.fillRect(0, 0, liveInputCanvas.width, liveInputCanvas.height);

                let sum = 0;
                const barWidth = 4;
                let x = 4;

                for (let i = 0; i < buffer.length; i += 2) {
                    const h = (buffer[i] / 255) * (liveInputCanvas.height - 4);
                    sum += buffer[i];

                    canvasCtx.fillStyle = "#10b981";
                    canvasCtx.fillRect(x, (liveInputCanvas.height - h) / 2, barWidth, Math.max(2, h));
                    x += barWidth + 2;
                }

                micCanvasAnimId = requestAnimationFrame(drawLiveMic);
            }
            drawLiveMic();

        } catch (err) {
            console.warn("Direct mic stream notice:", err);
            showToast("Please allow microphone permission in your browser.", "fa-triangle-exclamation");
        }

        // Speech Recognition: ONLY transcribes what the user actually says
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRec) {
            try {
                if (!recognition) {
                    recognition = new SpeechRec();
                    recognition.continuous = true;
                    recognition.interimResults = true;
                    recognition.lang = config.language || "en-US";

                    recognition.onresult = (event) => {
                        let interimTranscript = "";
                        let finalTranscript = "";

                        for (let i = event.resultIndex; i < event.results.length; i++) {
                            const transcript = event.results[i][0].transcript;
                            if (event.results[i].isFinal) {
                                finalTranscript += transcript + " ";
                            } else {
                                interimTranscript += transcript;
                            }
                        }

                        if (interimTranscript) {
                            liveTranscriptText.textContent = `Hearing: "${interimTranscript}"`;
                        }

                        if (finalTranscript.trim()) {
                            userInput.value = (userInput.value ? userInput.value.trim() + " " : "") + finalTranscript.trim();
                            liveTranscriptText.textContent = `Captured: "${finalTranscript.trim()}"`;
                            autoResizeTextarea();
                            updateLiveAnswerCoach();
                        }
                    };

                    recognition.onerror = (event) => {
                        console.warn("Speech recognition notice:", event.error);
                        if (event.error === "no-speech") {
                            liveTranscriptText.textContent = "Listening... Speak when ready";
                        } else if (event.error === "not-allowed") {
                            showToast("Microphone permission denied. Allow mic in browser settings.", "fa-triangle-exclamation");
                        }
                    };

                    recognition.onend = () => {
                        if (isListening && !isInterviewEnded) {
                            try { recognition.start(); } catch(e) {}
                        }
                    };
                }

                recognition.start();
            } catch (e) {
                console.warn("Speech recognition start notice:", e);
            }
        }
    }

    function stopListening() {
        isListening = false;
        micBtn.classList.remove("recording");
        liveInputCanvas.classList.remove("active");
        liveTranscriptBox.classList.remove("active");
        setAiState("ready");
        if (window.PrepPilotVoice) window.PrepPilotVoice.playChime("mic_off");

        if (recognition) {
            try { recognition.stop(); } catch (e) {}
        }
        if (micCanvasAnimId) cancelAnimationFrame(micCanvasAnimId);
        if (micAudioCtx && micAudioCtx.state !== "closed") {
            try { micAudioCtx.close(); } catch(e) {}
        }
        if (micAudioStream) {
            micAudioStream.getTracks().forEach(t => t.stop());
            micAudioStream = null;
        }
    }

    micBtn.addEventListener("click", () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    });

    voiceToggleBtn.addEventListener("click", () => {
        isVoiceActive = !isVoiceActive;
        if (window.PrepPilotVoice) window.PrepPilotVoice.isVoiceEnabled = isVoiceActive;

        voiceToggleBtn.classList.toggle("active", isVoiceActive);
        voiceToggleBtn.innerHTML = isVoiceActive ? '<i class="fa-solid fa-volume-high"></i> <span>Voice On</span>' : '<i class="fa-solid fa-volume-xmark"></i> <span>Voice Off</span>';
        showToast(isVoiceActive ? "AI voice enabled" : "AI voice muted", isVoiceActive ? "fa-volume-high" : "fa-volume-xmark");
    });

    soundfxToggleBtn.addEventListener("click", () => {
        isSoundFxActive = !isSoundFxActive;
        if (window.PrepPilotVoice) window.PrepPilotVoice.isSoundFxEnabled = isSoundFxActive;

        soundfxToggleBtn.classList.toggle("active", isSoundFxActive);
        soundfxToggleBtn.innerHTML = isSoundFxActive ? '<i class="fa-solid fa-bell"></i> <span>FX On</span>' : '<i class="fa-solid fa-bell-slash"></i> <span>FX Off</span>';
        showToast(isSoundFxActive ? "Sound effects on" : "Sound effects muted", isSoundFxActive ? "fa-bell" : "fa-bell-slash");
    });

    // ==========================================
    // 7. LIVE ANSWER COACH & SAMPLE ANSWER
    // ==========================================
    function updateLiveAnswerCoach() {
        const text = userInput.value.trim();
        const words = text ? text.split(/\s+/).length : 0;
        coachWordCount.textContent = `${words} word${words === 1 ? '' : 's'}`;

        const lower = text.toLowerCase();

        const hasS = /situation|context|background|project|when i was|at my previous|our team was|in our system/i.test(lower);
        const hasT = /task|goal|objective|responsibility|needed to|required to|my role was|target/i.test(lower);
        const hasA = /action|implemented|developed|architected|designed|optimized|built|refactored|chose|solved|created/i.test(lower);
        const hasR = /result|outcome|reduced|increased|achieved|improved|latency|scale|saved|metric|impact|delivered/i.test(lower);

        starS.classList.toggle("detected", hasS);
        starT.classList.toggle("detected", hasT);
        starA.classList.toggle("detected", hasA);
        starR.classList.toggle("detected", hasR);

        [qDot1, qDot2, qDot3, qDot4].forEach(dot => {
            dot.className = "q-dot";
        });

        if (words === 0) {
            coachQualityLabel.textContent = "Awaiting answer";
            coachQualityLabel.style.color = "var(--text-dim)";
        } else if (words < 15) {
            qDot1.classList.add("active-1");
            coachQualityLabel.textContent = "Very Brief (Add Technical Details)";
            coachQualityLabel.style.color = "var(--danger)";
        } else if (words < 40) {
            qDot1.classList.add("active-2");
            qDot2.classList.add("active-2");
            coachQualityLabel.textContent = "Developing Structure";
            coachQualityLabel.style.color = "var(--warning)";
        } else if (words < 75) {
            qDot1.classList.add("active-3");
            qDot2.classList.add("active-3");
            qDot3.classList.add("active-3");
            coachQualityLabel.textContent = "Strong Depth & Concepts";
            coachQualityLabel.style.color = "var(--accent-blue)";
        } else {
            qDot1.classList.add("active-4");
            qDot2.classList.add("active-4");
            qDot3.classList.add("active-4");
            qDot4.classList.add("active-4");
            coachQualityLabel.textContent = "Exceptional / FAANG Ready!";
            coachQualityLabel.style.color = "var(--success)";
        }
    }

    sampleAnswerBtn.addEventListener("click", () => {
        const currentQ = interviewQuestions[currentQuestionIndex];
        if (currentQ && currentQ.sampleAnswer) {
            userInput.value = currentQ.sampleAnswer;
            autoResizeTextarea();
            updateLiveAnswerCoach();
            showToast("Sample technical answer filled!", "fa-lightbulb");
            userInput.focus();
        }
    });

    polishAnswerBtn.addEventListener("click", () => {
        const text = userInput.value.trim();
        if (!text || text.length < 5) {
            showToast("Type a draft answer first or click 'Sample Answer'.", "fa-wand-magic-sparkles");
            return;
        }

        showToast("Structuring into STAR format...", "fa-wand-magic-sparkles");

        const structuredText = `**Situation & Context:**\nIn our production architecture, we needed to address this scenario efficiently.\n\n**Action & Implementation:**\n${text}\n\n**Results & Trade-offs:**\nThis approach ensured high availability, reduced latency overhead, and provided clean maintainability across microservices.`;

        userInput.value = structuredText;
        autoResizeTextarea();
        updateLiveAnswerCoach();
        userInput.focus();
    });

    // ==========================================
    // 8. WEBCAM PICTURE-IN-PICTURE
    // ==========================================
    async function startWebcamPiP() {
        try {
            pipStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 480, height: 320 },
                audio: true
            });
            pipVideo.srcObject = pipStream;
            candidatePip.classList.add("visible");
            camToggleBtn.classList.add("active");
            isCamActive = true;

            const ctx = window.PrepPilotVoice ? window.PrepPilotVoice.getAudioContext() : new (window.AudioContext || window.webkitAudioContext)();
            const source = ctx.createMediaStreamSource(pipStream);
            pipAnalyser = ctx.createAnalyser();
            pipAnalyser.fftSize = 128;
            source.connect(pipAnalyser);

            const buffer = new Uint8Array(pipAnalyser.frequencyBinCount);
            function drawPipMeter() {
                if (!isCamActive) return;
                pipAnalyser.getByteFrequencyData(buffer);
                let sum = 0;
                for (let i = 0; i < buffer.length; i++) sum += buffer[i];
                const avg = sum / buffer.length;
                const pct = Math.min(100, Math.round((avg / 128) * 100 * 2));
                pipMicFill.style.width = `${pct}%`;
                pipAnimFrame = requestAnimationFrame(drawPipMeter);
            }
            drawPipMeter();
        } catch (err) {
            console.warn("Webcam PiP notice:", err);
            candidatePip.classList.remove("visible");
            camToggleBtn.classList.remove("active");
            isCamActive = false;
        }
    }

    function stopWebcamPiP() {
        if (pipStream) {
            pipStream.getTracks().forEach(t => t.stop());
            pipStream = null;
        }
        if (pipAnimFrame) cancelAnimationFrame(pipAnimFrame);
        candidatePip.classList.remove("visible");
        camToggleBtn.classList.remove("active");
        isCamActive = false;
    }

    camToggleBtn.addEventListener("click", () => {
        if (isCamActive) {
            stopWebcamPiP();
            showToast("Webcam turned off", "fa-video-slash");
        } else {
            startWebcamPiP();
            showToast("Webcam active", "fa-video");
        }
    });

    closePipBtn.addEventListener("click", stopWebcamPiP);

    // ==========================================
    // 9. CODE PAD DRAWER
    // ==========================================
    codeToggleBtn.addEventListener("click", () => {
        codeDrawer.classList.toggle("collapsed");
        codeToggleBtn.classList.toggle("active", !codeDrawer.classList.contains("collapsed"));
    });

    closeCodeBtn.addEventListener("click", () => {
        codeDrawer.classList.add("collapsed");
        codeToggleBtn.classList.remove("active");
    });

    chipCodepad.addEventListener("click", () => {
        codeDrawer.classList.remove("collapsed");
        codeToggleBtn.classList.add("active");
        codeInput.focus();
    });

    insertCodeBtn.addEventListener("click", () => {
        const code = codeInput.value.trim();
        if (!code) {
            showToast("Write some code in the pad first!", "fa-circle-exclamation");
            return;
        }
        const lang = codeLanguage.value;
        const formattedCodeBlock = `\n\`\`\`${lang}\n${code}\n\`\`\`\n`;
        userInput.value += formattedCodeBlock;
        autoResizeTextarea();
        updateLiveAnswerCoach();
        showToast("Code block added to your answer!", "fa-code");
        userInput.focus();
    });

    clearCodeBtn.addEventListener("click", () => {
        codeInput.value = "";
    });

    // ==========================================
    // 10. CONVERSATIONAL ENGINE & STRICT EVALUATION
    // ==========================================
    function presentCurrentQuestion() {
        if (currentQuestionIndex >= interviewQuestions.length) {
            concludeInterview();
            return;
        }

        const currentQ = interviewQuestions[currentQuestionIndex];
        updateQuestionTracker();

        aiLoading.classList.remove("hidden");
        setAiState("evaluating", "Formulating question...");

        setTimeout(() => {
            aiLoading.classList.add("hidden");
            appendMessage("ai", currentQ.q);
            playAiSpeech(currentQ.q);
        }, 350);
    }

    async function handleUserAnswer(answerText) {
        if (!answerText.trim()) return;

        if (isListening) stopListening();

        appendMessage("user", answerText);
        if (window.PrepPilotVoice) window.PrepPilotVoice.playChime("send");
        userInput.value = "";
        autoResizeTextarea();
        updateLiveAnswerCoach();

        const currentQ = interviewQuestions[currentQuestionIndex];
        aiLoading.classList.remove("hidden");
        setAiState("evaluating", "Analyzing your response & metrics...");

        const evaluation = evaluateAnswerMetrics(answerText, currentQ);
        sessionHistory.push({
            question: currentQ.q,
            answer: answerText,
            score: evaluation.score,
            techScore: evaluation.techScore,
            commScore: evaluation.commScore,
            confScore: evaluation.confScore,
            critique: evaluation.critique,
            idealAnswer: currentQ.ideal,
            isSkipped: false,
            isUnanswered: false
        });

        setTimeout(() => {
            aiLoading.classList.add("hidden");
            currentQuestionIndex++;

            if (currentQuestionIndex < interviewQuestions.length) {
                const transitionMessage = `${evaluation.feedbackComment}\n\nLet's move to our next question:\n${interviewQuestions[currentQuestionIndex].q}`;
                appendMessage("ai", transitionMessage);
                playAiSpeech(transitionMessage);
                updateQuestionTracker();
            } else {
                const finalWrapup = `${evaluation.feedbackComment}\n\nThank you for completing the interview session, ${config.name}! I am now compiling your complete evaluation report.`;
                appendMessage("ai", finalWrapup);
                if (window.PrepPilotVoice) window.PrepPilotVoice.playChime("complete");
                playAiSpeech(finalWrapup, () => {
                    setTimeout(concludeInterview, 1000);
                });
            }
        }, 900);
    }

    function evaluateAnswerMetrics(answer, questionObj) {
        const words = answer.trim().split(/\s+/).length;
        const text = answer.toLowerCase();

        if (words < 5) {
            return {
                score: 15,
                techScore: 10,
                commScore: 20,
                confScore: 15,
                critique: "Response was insufficient. The candidate did not provide any technical explanation or system architecture reasoning.",
                feedbackComment: "That response was very brief. In interviews, aim to provide concrete technical explanations and design trade-offs."
            };
        }

        if (words < 15) {
            return {
                score: 35,
                techScore: 30,
                commScore: 40,
                confScore: 30,
                critique: "Brief response without architectural specifics or trade-off evaluation.",
                feedbackComment: "You gave a concise answer. Try elaborating on underlying system mechanisms and edge cases."
            };
        }

        const keywords = [
            "trade-off", "tradeoff", "scale", "performance", "latency", "cache", "async",
            "component", "database", "security", "testing", "monitoring", "situation", "task",
            "action", "result", "metric", "architecture", "design", "edge case", "efficiency",
            "optim", "scalable", "lifecycle", "state", "user", "experience", "impact",
            "redis", "kafka", "postgres", "cluster", "index", "sharding", "replica",
            "virtual dom", "profiler", "memo", "lcp", "inp", "cls", "circuit breaker",
            "idempotent", "outbox", "token bucket", "base62", "mutex", "ttl"
        ];

        let keywordMatches = 0;
        keywords.forEach(kw => {
            if (text.includes(kw)) keywordMatches++;
        });

        let baseScore = 40;
        if (words >= 30) baseScore += 15;
        if (words >= 60) baseScore += 15;
        if (words >= 85) baseScore += 10;

        let kwScore = Math.min(25, keywordMatches * 5);
        let calculatedOverall = Math.min(96, baseScore + kwScore);

        let tech = Math.min(98, Math.round(calculatedOverall * (0.9 + (keywordMatches > 2 ? 0.1 : 0))));
        let comm = Math.min(96, Math.round(calculatedOverall * (words > 40 ? 1.02 : 0.95)));
        let conf = Math.min(95, Math.round(calculatedOverall * 0.96));

        let feedbackComment = "";
        let critique = "";

        if (calculatedOverall >= 80) {
            feedbackComment = "Excellent depth and structure! You articulated architectural trade-offs and reasoned with great clarity.";
            critique = "Strong technical terminology and well-structured explanation with clear problem-solving rationale.";
        } else if (calculatedOverall >= 60) {
            feedbackComment = "Solid response with good foundational points. Adding more concrete metrics and failure modes would make it even stronger.";
            critique = "Good foundational understanding. To elevate your score, dive deeper into quantifiable metrics and resilience patterns.";
        } else {
            feedbackComment = "Good attempt. To elevate this answer, structure your points using the STAR method and dive deeper into technical specifics.";
            critique = "Answer covered basic points but lacked deep technical justification and trade-off analysis.";
        }

        return {
            score: calculatedOverall,
            techScore: tech,
            commScore: comm,
            confScore: conf,
            critique: critique,
            feedbackComment: feedbackComment
        };
    }

    // Quick Action Chips handlers
    chipHint.addEventListener("click", () => {
        if (isInterviewEnded || currentQuestionIndex >= interviewQuestions.length) return;
        const currentQ = interviewQuestions[currentQuestionIndex];
        const hintText = `💡 **Hint**: ${currentQ.hint || "Decompose the problem into core components and explain the trade-offs of your approach."}`;
        appendMessage("ai", hintText);
        playAiSpeech(hintText);
    });

    chipRepeat.addEventListener("click", () => {
        if (isInterviewEnded || currentQuestionIndex >= interviewQuestions.length) return;
        const currentQ = interviewQuestions[currentQuestionIndex];
        appendMessage("ai", `🔄 **Repeating Question**: ${currentQ.q}`);
        playAiSpeech(currentQ.q);
    });

    chipSkip.addEventListener("click", () => {
        if (isInterviewEnded || currentQuestionIndex >= interviewQuestions.length) return;
        showToast("Question skipped. Moving to next question...", "fa-forward-step");
        sessionHistory.push({
            question: interviewQuestions[currentQuestionIndex].q,
            answer: "[Question Skipped by Candidate]",
            score: 0,
            techScore: 0,
            commScore: 0,
            confScore: 0,
            critique: "Question skipped without response. Candidate should review foundational concepts for this topic.",
            idealAnswer: interviewQuestions[currentQuestionIndex].ideal,
            isSkipped: true,
            isUnanswered: false
        });
        currentQuestionIndex++;
        presentCurrentQuestion();
    });

    function autoResizeTextarea() {
        userInput.style.height = "auto";
        userInput.style.height = Math.min(120, userInput.scrollHeight) + "px";
    }

    userInput.addEventListener("input", () => {
        autoResizeTextarea();
        updateLiveAnswerCoach();
    });

    userInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const text = userInput.value.trim();
            if (text) handleUserAnswer(text);
        }
    });

    sendBtn.addEventListener("click", () => {
        const text = userInput.value.trim();
        if (text) handleUserAnswer(text);
    });

    clearTextBtn.addEventListener("click", () => {
        userInput.value = "";
        autoResizeTextarea();
        updateLiveAnswerCoach();
        userInput.focus();
    });

    // ==========================================
    // 11. END INTERVIEW & ACCURATE EVALUATION REPORT
    // ==========================================
    endInterviewBtn.addEventListener("click", () => {
        confirmModal.classList.add("active");
    });

    cancelEndBtn.addEventListener("click", () => {
        confirmModal.classList.remove("active");
    });

    confirmEndBtn.addEventListener("click", () => {
        confirmModal.classList.remove("active");
        concludeInterview();
    });

    function concludeInterview() {
        if (isInterviewEnded) return;
        isInterviewEnded = true;
        clearInterval(timerInterval);

        if (isListening) stopListening();
        if (window.PrepPilotVoice) window.PrepPilotVoice.stop();
        if (isCamActive) stopWebcamPiP();

        setAiState("ready", "Interview Concluded");
        renderEvaluationReport();
    }

    function renderEvaluationReport() {
        const answeredQuestions = sessionHistory.filter(item => !item.isSkipped && item.answer && !item.answer.includes("[Interview concluded early]"));

        repName.textContent = config.name;
        repRoleCompany.textContent = `${config.level} ${config.role} @ ${config.company}`;
        repDate.textContent = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

        // CASE 1: ZERO ANSWERS PROVIDED (Real Incomplete Report)
        if (answeredQuestions.length === 0) {
            repVerdict.className = "verdict-badge consider";
            repVerdict.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Incomplete Session (0 Answers)';
            repStreakPill.textContent = `Practice Session Incomplete`;

            resOverall.textContent = "0";
            resTech.textContent = "0";
            resComm.textContent = "0";
            resConf.textContent = "0";

            resFeedback.textContent = `Candidate ${config.name} initiated a ${config.duration}-minute session for the ${config.level} ${config.role} role at ${config.company}, but no responses were submitted. To generate an accurate score and personalized feedback, please answer the interview questions by speaking into your microphone or typing in the chat box.`;

            resStrengths.innerHTML = `
                <li style="color: var(--text-dim);">No response data available to assess strengths.</li>
                <li style="color: var(--text-dim);">Start a new session and answer the interview questions to unlock your scorecard.</li>
            `;

            resImprovements.innerHTML = `
                <li><strong>Participate in Questions:</strong> Type your thoughts or use the microphone button to dictate responses.</li>
                <li><strong>Use Sample Answer Button:</strong> Click the "Sample Answer" button to test the scoring engine with realistic technical answers.</li>
            `;

            qaReviewList.innerHTML = `
                <div class="qa-card" style="text-align: center; padding: 2rem;">
                    <i class="fa-solid fa-comment-slash" style="font-size: 2rem; color: var(--text-dim); margin-bottom: 10px;"></i>
                    <p style="color: var(--text-secondary); font-weight: 500;">No answers were recorded during this session.</p>
                    <button class="primary-btn" onclick="location.reload()" style="max-width: 200px; margin: 1rem auto 0; padding: 8px 16px;">Restart & Try Again</button>
                </div>
            `;

            reportPage.classList.add("active");
            return;
        }

        // CASE 2: REAL ANSWERS WERE SUBMITTED (Calculate Real Scores)
        let totalScore = answeredQuestions.reduce((acc, curr) => acc + curr.score, 0);
        let totalTech = answeredQuestions.reduce((acc, curr) => acc + curr.techScore, 0);
        let totalComm = answeredQuestions.reduce((acc, curr) => acc + curr.commScore, 0);
        let totalConf = answeredQuestions.reduce((acc, curr) => acc + curr.confScore, 0);

        let avgOverall = Math.round(totalScore / answeredQuestions.length);
        let avgTech = Math.round(totalTech / answeredQuestions.length);
        let avgComm = Math.round(totalComm / answeredQuestions.length);
        let avgConf = Math.round(totalConf / answeredQuestions.length);

        if (avgOverall >= 50) {
            currentStreak += 1;
            localStorage.setItem("prepPilot_streak", currentStreak.toString());
        }

        repStreakPill.textContent = `🔥 ${currentStreak} Day Practice Streak`;

        if (avgOverall >= 80) {
            repVerdict.className = "verdict-badge hire";
            repVerdict.innerHTML = '<i class="fa-solid fa-check-circle"></i> Strong Hire (Exceeds Bar)';
        } else if (avgOverall >= 60) {
            repVerdict.className = "verdict-badge hire";
            repVerdict.innerHTML = '<i class="fa-solid fa-check"></i> Hire (Meets Bar)';
        } else if (avgOverall >= 40) {
            repVerdict.className = "verdict-badge consider";
            repVerdict.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Consider (Needs Polish)';
        } else {
            repVerdict.className = "verdict-badge consider";
            repVerdict.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Further Preparation Advised';
        }

        resOverall.textContent = avgOverall;
        resTech.textContent = avgTech;
        resComm.textContent = avgComm;
        resConf.textContent = avgConf;

        resFeedback.textContent = `Candidate ${config.name} completed ${answeredQuestions.length} answered question(s) for the ${config.level} ${config.role} position at ${config.company}. Overall score: ${avgOverall}/100. Based on your submitted answers, the AI evaluated your technical terminology, reasoning structure, and trade-off depth.`;

        resStrengths.innerHTML = `
            <li><strong>Domain Knowledge:</strong> Applied relevant engineering terminology to the target domain of ${config.company}.</li>
            <li><strong>Clarity & Structure:</strong> Addressed prompt objectives with structured reasoning steps.</li>
            <li><strong>Composure:</strong> Articulated approaches methodically.</li>
        `;

        resImprovements.innerHTML = `
            <li><strong>Quantifiable Impact:</strong> Highlight measurable metrics (e.g. latency reduction %, throughput QPS, memory saved).</li>
            <li><strong>Failure Modes:</strong> Proactively discuss cache stampedes, retry backoffs, and fallback mechanisms before concluding.</li>
        `;

        qaReviewList.innerHTML = "";
        sessionHistory.forEach((item, idx) => {
            const qaCard = document.createElement("div");
            qaCard.className = "qa-card";
            qaCard.innerHTML = `
                <div class="qa-question">
                    <i class="fa-solid fa-circle-question"></i>
                    <div><strong>Question ${idx + 1}:</strong> ${escapeHtml(item.question)}</div>
                </div>
                <div class="qa-answer">
                    <strong>Your Response:</strong><br>
                    ${escapeHtml(item.answer)}
                </div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin: 6px 0;">
                    <span style="color: var(--accent-blue); font-weight: 600;">AI Critique (Score: ${item.score}/100):</span> ${escapeHtml(item.critique)}
                </div>
                <div class="qa-ideal">
                    <strong>Ideal Key Points to Cover:</strong> ${escapeHtml(item.idealAnswer)}
                </div>
            `;
            qaReviewList.appendChild(qaCard);
        });

        reportPage.classList.add("active");
        if (window.PrepPilotVoice) window.PrepPilotVoice.playChime("complete");
    }

    restartInterviewBtn.addEventListener("click", () => {
        window.location.href = "login.html";
    });

    copySummaryBtn.addEventListener("click", () => {
        const summaryText = `PrepPilot AI Interview Evaluation Report\nCandidate: ${config.name}\nRole: ${config.level} ${config.role} @ ${config.company}\nOverall Score: ${resOverall.textContent}/100\nTechnical Depth: ${resTech.textContent}/100\nCommunication: ${resComm.textContent}/100\nConfidence: ${resConf.textContent}/100\nDate: ${repDate.textContent}`;
        navigator.clipboard.writeText(summaryText);
        showToast("Report summary copied to clipboard!", "fa-copy");
    });

    printPdfBtn.addEventListener("click", () => {
        window.print();
    });

    // ==========================================
    // 12. INITIALIZATION
    // ==========================================
    interviewQuestions = generateInterviewQuestions();
    initUI();
    if (window.PrepPilotVoice) window.PrepPilotVoice.playChime("start");
    startTimer();
    presentCurrentQuestion();
});
