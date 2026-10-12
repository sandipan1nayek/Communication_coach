// State Variables
let interviewQueue = [];
let activeTopicContext = [];
let globalTranscript = [];
let currentQuestion = null;
let currentQuestionAttempts = 0;

// DOM Elements
const setupPhase = document.getElementById('setupPhase');
const interviewPhase = document.getElementById('interviewPhase');
const setupLog = document.getElementById('setupLog');
const btnStartSpeaking = document.getElementById('btnStartSpeaking');
const btnStopSpeaking = document.getElementById('btnStopSpeaking');
const liveTranscript = document.getElementById('liveTranscript');
const displayQuestion = document.getElementById('displayQuestion');
const displayTopic = document.getElementById('displayTopic');
const statusText = document.getElementById('statusText');
const statusDot = document.getElementById('statusDot');

// TTS Engine (Adapted from coach.js to be independent)
class AudioEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.selectedVoice = null;
    this.initVoices();
  }
  initVoices() {
    if (!this.synth) return;
    const load = () => {
      const voices = this.synth.getVoices();
      for(let v of voices) {
         if(v.lang.includes('en') && (v.name.includes('Natural') || v.name.includes('Google'))) {
             this.selectedVoice = v; break;
         }
      }
      if(!this.selectedVoice && voices.length > 0) this.selectedVoice = voices[0];
    };
    load();
    if(this.synth.onvoiceschanged !== undefined) this.synth.onvoiceschanged = load;
  }
  speak(text) {
    return new Promise((resolve) => {
      if(!this.synth) return resolve();
      this.synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if(this.selectedVoice) u.voice = this.selectedVoice;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      this.synth.speak(u);
    });
  }
}
const audio = new AudioEngine();

// STT Engine (Web Speech API)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let finalTranscript = '';

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + ' ';
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    liveTranscript.textContent = finalTranscript + interimTranscript;
  };

  recognition.onerror = (event) => {
    console.warn("Speech recognition warning:", event.error);
    if (event.error === 'not-allowed') {
      alert("Microphone permission was denied. Please allow microphone access in your browser.");
    }
  };
}

// API Call Wrapper
async function callGemini(promptText) {
  let url = '/api/gemini';
  
  // Fallback for local development (if opening file directly)
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:") {
      const apiKey = typeof GEMINI_API_KEY !== 'undefined' ? GEMINI_API_KEY : window.GEMINI_API_KEY;
      if (apiKey) {
          url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
      } else {
          console.error("GEMINI_API_KEY is missing for local development.");
      }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { response_mime_type: "application/json", temperature: 0.3 }
      })
    });
    const data = await res.json();
    if (!res.ok || !data.candidates) {
        throw new Error("API Error: " + JSON.stringify(data));
    }
    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/^```json/gi, '').replace(/```$/g, '').trim();
    return JSON.parse(text);
  } catch(e) {
    console.error("Gemini API Call Failed:", e);
    return null;
  }
}

// PDF Parsing logic using pdf.js
async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(" ") + " ";
    }
    return fullText;
}

// Phase 1: Input & Skeleton Generation
document.getElementById('btnGeneratePlan').addEventListener('click', async () => {
    const topic = document.getElementById('topicInput').value.trim();
    const cvFile = document.getElementById('cvInput').files[0];
    
    if(!topic && !cvFile) return alert("Please provide a topic or upload a CV PDF.");
    
    setupLog.textContent = "Analyzing input... Generating Master Plan... (This takes a few seconds)";
    let contextData = topic;
    
    if(cvFile) {
        setupLog.textContent = "Parsing PDF...";
        try {
            contextData = await extractTextFromPDF(cvFile);
            setupLog.textContent = "PDF Parsed. Generating Master Plan... (This takes a few seconds)";
        } catch(err) {
            setupLog.textContent = "Failed to parse PDF: " + err.message;
            return;
        }
    }

    let prompt = "";
    if (cvFile) {
        prompt = `Act as an expert technical interviewer. Analyze this CV.
Identify every major project, skill, and technical domain.
For EACH project/skill, divide it into 10 specific "chunks" or sub-topics (e.g., Architecture, Challenges, Scalability, Security, Specific Tech).
For EACH chunk, generate exactly 1 highly specific main interview question.
Do not generate generic questions. Tailor them to the CV details.

Output a flat JSON array of objects:
[
  { "topic_id": "Project1_Architecture", "text": "Question about...", "layer": 0 },
  ...
]

Here is the CV data:
${contextData}`;
    } else {
        prompt = `Act as an expert technical interviewer. The user wants to practice interviews for the following topic: "${contextData}".
Do not limit the number of questions. Divide this topic into as many comprehensive "chunks" or sub-topics as possible to thoroughly cover it, especially including the most commonly asked real-world interview questions for this topic.
For EACH chunk, generate exactly 1 main interview question.

Output a flat JSON array of objects:
[
  { "topic_id": "TopicName_ChunkName", "text": "Question about...", "layer": 0 },
  ...
]`;
    }

    const plan = await callGemini(prompt);
    
    if(plan && Array.isArray(plan) && plan.length > 0) {
        interviewQueue = plan;
        setupPhase.classList.add('hidden');
        interviewPhase.classList.remove('hidden');
        askNextQuestion();
    } else {
        setupLog.textContent = "Failed to generate plan. Please try again or check console.";
    }
});

// Phase 2: Core Execution Loop
async function askNextQuestion() {
    if(interviewQueue.length === 0) {
        displayQuestion.textContent = "Interview Complete! Thank you.";
        displayTopic.textContent = "Finished";
        statusText.textContent = "Interview Complete";
        statusDot.className = "w-2 h-2 rounded-full bg-slate-400";
        btnStartSpeaking.classList.add('hidden');
        btnStopSpeaking.classList.add('hidden');
        liveTranscript.textContent = "You can download your full interview transcript below.";
        await audio.speak("Interview complete! Thank you for your time. You can now download your transcript below.");
        return;
    }

    const nextQ = interviewQueue.shift();
    
    // Context Switching Optimization
    if(currentQuestion && currentQuestion.topic_id !== nextQ.topic_id) {
        activeTopicContext = [];
    }
    currentQuestion = nextQ;
    currentQuestionAttempts = 0;
    
    displayTopic.textContent = currentQuestion.topic_id.replace(/_/g, ' ');
    displayQuestion.textContent = currentQuestion.text;
    
    // Store question in contexts
    globalTranscript.push("Interviewer: " + currentQuestion.text);
    activeTopicContext.push("Interviewer: " + currentQuestion.text);
    
    statusText.textContent = "Interviewer Speaking...";
    statusDot.className = "w-2 h-2 rounded-full bg-amber-400 animate-pulse";
    
    await audio.speak(currentQuestion.text);
    
    statusText.textContent = "Ready for your answer";
    statusDot.className = "w-2 h-2 rounded-full bg-emerald-400";
    liveTranscript.textContent = "Click 'Start Answering' to speak.";
}

// User Speech Controls
btnStartSpeaking.addEventListener('click', () => {
    if (!recognition) {
        return alert("Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
    }
    finalTranscript = '';
    liveTranscript.textContent = 'Listening...';
    btnStartSpeaking.classList.add('hidden');
    btnStopSpeaking.classList.remove('hidden');
    try {
        recognition.start();
    } catch(e) {
        console.warn("Recognition start error:", e);
    }
});

btnStopSpeaking.addEventListener('click', async () => {
    if (recognition) {
        try { recognition.stop(); } catch(e) {}
    }
    btnStartSpeaking.classList.remove('hidden');
    btnStopSpeaking.classList.add('hidden');
    
    const userText = finalTranscript.trim();
    if(!userText) return alert("I didn't catch that. Please click start and try again.");
    
    globalTranscript.push("Candidate: " + userText);
    activeTopicContext.push("Candidate: " + userText);
    
    statusText.textContent = "AI is evaluating...";
    statusDot.className = "w-2 h-2 rounded-full bg-indigo-400 animate-pulse";
    
    await processAiEvaluation(userText);
});

// Phase 3: The Orchestrator Logic Router
async function processAiEvaluation(userText) {
    const prompt = `You are a technical interview coach. Evaluate the user's answer.
Context of current topic (history):
${activeTopicContext.join('\n')}

Current Question Layer: ${currentQuestion.layer}
Failed Attempts so far on this question: ${currentQuestionAttempts}

Instructions based on Evaluation Status:
1. If 'correct': Generate 1 or 2 highly specific follow-up questions to dig deeper (unless layer is 2 or topic is exhausted).
2. If 'wrong' and Failed Attempts is 0: Generate a 'spoken_response' that provides a gentle HINT to help them get it, but DO NOT give the full answer. Return an empty array for generated_follow_ups.
3. If 'wrong' and Failed Attempts >= 1: Generate a 'spoken_response' that provides a simple, clear explanation of the correct answer. THEN, in the 'generated_follow_ups' array, generate exactly ONE tricky verification question related to your explanation to ensure they understood.
4. If 'need improvement' or 'clarification': Generate a 'spoken_response' that tells them what was missing to make it professional, and give an example of a stellar answer. Return an empty array for generated_follow_ups.

Respond STRICTLY in this JSON format:
{
  "evaluation_status": "<correct | wrong | need improvement | clarification>",
  "spoken_response": "Feedback/transition/hint/explanation text",
  "generated_follow_ups": ["Follow up 1", ...]
}`;

    const evalData = await callGemini(prompt);
    
    if(!evalData) {
        alert("Evaluation failed. The AI might have timed out.");
        statusText.textContent = "Error";
        return;
    }
    
    // AI speaks the feedback
    globalTranscript.push("Interviewer: " + evalData.spoken_response);
    activeTopicContext.push("Interviewer: " + evalData.spoken_response);
    
    statusText.textContent = "Interviewer Speaking...";
    await audio.speak(evalData.spoken_response);
    
    // Logic Branching based on Evaluation Status
    if(evalData.evaluation_status === 'correct') {
        currentQuestionAttempts = 0;
        // Queue Injection (Breadth)
        if(evalData.generated_follow_ups && evalData.generated_follow_ups.length > 0) {
            const mappedFollowUps = evalData.generated_follow_ups.map(text => ({
                text: text,
                topic_id: currentQuestion.topic_id,
                layer: currentQuestion.layer + 1
            }));
            interviewQueue.unshift(...mappedFollowUps); 
        }
        askNextQuestion();
    } else if (evalData.evaluation_status === 'wrong') {
        currentQuestionAttempts++;
        if (currentQuestionAttempts >= 2) {
            // After 2nd attempt, explanation was generated. If tricky verification question provided, inject it.
            if (evalData.generated_follow_ups && evalData.generated_follow_ups.length > 0) {
                const mappedFollowUps = evalData.generated_follow_ups.map(text => ({
                    text: text,
                    topic_id: currentQuestion.topic_id,
                    layer: currentQuestion.layer // Keep layer same to track depth
                }));
                interviewQueue.unshift(...mappedFollowUps);
            }
            askNextQuestion();
        } else {
            // Wait for user to retry with the hint
            statusText.textContent = "Ready for your answer";
            statusDot.className = "w-2 h-2 rounded-full bg-emerald-400";
            liveTranscript.textContent = "Awaiting your retry...";
        }
    } else if (evalData.evaluation_status === 'need improvement' || evalData.evaluation_status === 'clarification') {
        currentQuestionAttempts++;
        statusText.textContent = "Ready for your answer";
        statusDot.className = "w-2 h-2 rounded-full bg-emerald-400";
        liveTranscript.textContent = "Try answering again professionally based on the feedback...";
    }
}

// Phase 4 & Controls: Skip and Download
document.getElementById('btnSkipQuestion').addEventListener('click', () => {
    if(!currentQuestion) return;
    if (audio && audio.synth) audio.synth.cancel();
    try { recognition.stop(); } catch(e) {}
    btnStartSpeaking.classList.remove('hidden');
    btnStopSpeaking.classList.add('hidden');
    askNextQuestion();
});

document.getElementById('btnSkipTopic').addEventListener('click', () => {
    if(!currentQuestion) return;
    if (audio && audio.synth) audio.synth.cancel();
    try { recognition.stop(); } catch(e) {}
    btnStartSpeaking.classList.remove('hidden');
    btnStopSpeaking.classList.add('hidden');
    // Filter out all remaining questions for this topic
    interviewQueue = interviewQueue.filter(q => q.topic_id !== currentQuestion.topic_id);
    askNextQuestion(); // This will pop a new topic, triggering the context clear
});

document.getElementById('btnDownloadTranscript').addEventListener('click', () => {
    const text = globalTranscript.join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Interview_Transcript.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});
