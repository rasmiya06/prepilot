# PrepPilot AI 🎙️🤖

An intelligent, interactive AI Mock Interview Platform built with real-time speech synthesis, audio visualizer, live answer coaching with STAR framework tracking, and strict performance evaluations.

---

## 🌟 Key Features

- **3-Step Intuitive Interview Flow**:
  1. **Candidate Profile Setup (`login.html` / `setup.html`)**: Customize candidate name, target role (Backend, Frontend, Full Stack, AI/ML, DevOps), company (Amazon, Google, Meta, Microsoft, Netflix, Apple), and seniority level.
  2. **Hardware & Voice Pre-Flight Check (`testing.html`)**: Real-time microphone oscilloscope canvas, speech clarity test, voice actor selector, and optional webcam preview.
  3. **Live AI Interview Stage (`index.html`)**: Dynamic questions spoken audibly by the AI interviewer with live mic input and speech recognition.
- **Audio Voice Synthesis Engine (`voice-engine.js`)**:
  - Natural sentence-chunked Speech Synthesis for crystal-clear, smooth pronunciation without jitter or robotic artifacts.
  - Multi-voice selection with adjustable pace (0.75x–1.25x) and pitch controls.
- **Live Answer Quality Coach & STAR Tracker**:
  - Real-time word counter and depth rating (*Basic* → *Developing* → *Strong Depth* → *FAANG Ready*).
  - Dynamic detection of the **STAR** method (`[S]ituation`, `[T]ask`, `[A]ction`, `[R]esult`).
- **Strict Scoring & Accurate Evaluation Report**:
  - Accurate zero-response detection (`Score: 0`, `Incomplete Session`).
  - Realistic metric evaluation for Technical Depth, Communication, and Confidence.
  - 1-Click PDF export and markdown summary clipboard copy.
- **Client-Side Architecture**:
  - 100% zero-backend required. Can be hosted directly on **GitHub Pages**, **Vercel**, or **Netlify** for free.

---

## 🚀 Getting Started

### Local Setup
Simply open `login.html` in any modern web browser or serve locally with Python:

```bash
python3 -m http.server 8080
```
Then visit: `http://localhost:8080/login.html`

### Deploying to GitHub Pages
1. Push this repository to GitHub.
2. Go to repository **Settings** > **Pages**.
3. Under **Branch**, select `main` and root `/`, then click **Save**.
4. Access your live interview room at `https://<username>.github.io/prepilot/login.html`!

---

## 🛠️ Tech Stack
- **Frontend**: HTML5, CSS3 Glassmorphism, Vanilla JavaScript (ES6+)
- **Audio**: Web Audio API (`AudioContext`, `AnalyserNode`, `BiquadFilterNode`)
- **Speech**: Web Speech API (`SpeechSynthesis`, `SpeechRecognition`)
- **Icons & Fonts**: FontAwesome 6, Google Fonts (Inter, JetBrains Mono)
