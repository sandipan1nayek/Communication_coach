# 🗣️ AI Communication Coach (SVAR Assessment Simulator)

Hey there! Welcome to the **AI Communication Coach** repository. 

This project is a fully automated, AI-powered spoken English evaluation platform designed to help candidates prepare for strict corporate communication interviews (like the LTIMindtree SVAR assessment or standard HR screening tests). 

Instead of just recording your voice and giving you generic advice, this app dynamically generates questions using Generative AI, transcribes your speech in real-time, detects your "um"s and "uh"s, and provides an extremely nitpicky, item-by-item breakdown of your grammar, fluency, and pronunciation.

## ✨ What does it actually do?

The app has two main modes: a **Full Mock Test** and an **Unlimited Practice Mode**. Both modes simulate an official spoken English benchmark protocol across 5 distinct sections:

1. **📖 Read Aloud:** Tests your reading fluency and articulation by giving you a paragraph to read within a time limit.
2. **🎧 Listen & Repeat:** Tests your memory and verbatim recitation. The app uses Text-to-Speech (TTS) to speak a sentence to you, the text is hidden, and you must repeat it perfectly after the beep.
3. **🧩 Sentence Mastery:** Tests your grammar. You'll be given jumbled sentences or fill-in-the-blank scenarios to restructure on the fly.
4. **💬 Situational Q&A:** Tests your ability to answer workplace scenarios in complete, grammatically correct subject-predicate clauses.
5. **⏱️ Extempore:** The final boss. You get 30 seconds to prepare a response to a random topic, and 45 seconds to speak spontaneously. Long pauses or filler words are heavily penalized here!

## 🧠 The "AI Coach"

What makes this project special is the evaluation system:
- **Real-time Transcription:** Built using the browser's native Web Speech API.
- **Dynamic Content Generation:** The questions are *never* exactly the same. We use Gemini's API to generate fresh, unique questions for every single session based on highly specific prompts.
- **Strict Evaluation Engine:** Every time you speak, the system measures your exact WPM (Words Per Minute), tracks hesitations, and counts filler words (`um`, `uh`, `ahhh`). 
- **Inline Feedback:** In Unlimited mode, every 5 questions triggers an **AI Checkpoint** where the AI Coach jumps in to summarize your strengths and pinpoint exactly what you are doing wrong.
- **Final Scorecard:** The Full Mock Test generates a gorgeous scorecard grading your Pronunciation, Fluency, Grammar, and Retention, assigning you an estimated CEFR level (B1, B2, C1).

## 🛠️ Tech Stack

This project was intentionally built to be lightweight, lightning-fast, and run entirely in the browser:
- **Frontend Core:** Vanilla HTML5, CSS3, and JavaScript (ES6+). No complex build steps or heavy frameworks!
- **Styling:** Tailwind CSS (via CDN for rapid prototyping and beautiful, responsive UI).
- **Icons & Visuals:** FontAwesome and custom Canvas-based microphone waveforms.
- **AI Brain:** Google Gemini API (`gemini-3.5-flash-lite`) handles all the dynamic question generation and the intense final transcript evaluations.
- **Web APIs:** Native `window.speechSynthesis` (for text-to-speech) and `window.SpeechRecognition` (for speech-to-text).

## 🚀 How to run it locally

Since it uses native JS modules and APIs, you just need a basic local web server. 

1. Clone this repository.
2. Create a file named `env.js` in the root folder (this is `.gitignore`d for security) and add your Gemini API key:
   ```javascript
   const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_GOES_HERE";
   ```
3. Open your terminal in the project folder and start a local server. For example, if you have Python installed:
   ```bash
   python -m http.server 8000
   ```
4. Open your browser and navigate to `http://localhost:8000/coach.html`.
5. Plug in a good microphone, give the browser microphone permissions, and start speaking!

## 🔮 What's next?

The app is currently ready for local use and practice. Future updates might include better cross-browser support for speech recognition (currently optimized for Chromium-based browsers like Chrome and Edge), user profile caching so you can track your progress over time, and deployment to a static hosting service like Vercel or Netlify.

---
