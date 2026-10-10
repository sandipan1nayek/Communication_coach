// State Variables
let interviewQueue = [];
let activeTopicContext = [];
let globalTranscript = [];
let currentQuestion = null;

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
const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;

let finalTranscript = '';

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
        contextData = await extractTextFromPDF(cvFile);
        setupLog.textContent = "PDF Parsed. Generating Master Plan... (This takes a few seconds)";
    }

    const prompt = `Act as an expert technical interviewer. Analyze this CV (or topic text). Identify and understand those projects and skills and other technical parts. Generate a JSON array of those, and make 10 main interview questions from each portions(eg. if there are 3 projects, generate 3*10=30 questions, if there are 4 skills/languages, generate 4*10=40 questions, etc.) that actually cover the whole parts. Do not generate generic questions; tailor them specifically to the details in this CV.

The JSON array must be a flat list of objects, where each object has:
- "topic_id": string (e.g., "Project_1", "Skill_React")
- "text": string (the interview question)
- "layer": 0

Here is the context data:
${contextData}`;

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
        btnStartSpeaking.classList.add('hidden');
        return;
    }

    const nextQ = interviewQueue.shift();
    
    // Context Switching Optimization
    if(currentQuestion && currentQuestion.topic_id !== nextQ.topic_id) {
        activeTopicContext = [];
    }
    currentQuestion = nextQ;
    
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
    finalTranscript = '';
    liveTranscript.textContent = 'Listening...';
    btnStartSpeaking.classList.add('hidden');
    btnStopSpeaking.classList.remove('hidden');
    recognition.start();
});

btnStopSpeaking.addEventListener('click', async () => {
    recognition.stop();
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
    const prompt = `Evaluate the user's answer. If the answer is 'correct' and the current_layer is less than 2, generate as many specific follow-up questions as needed to dig deeper into unexplored areas. Do not limit the number of follow-ups, but only generate them if there is more to explore. If the topic is sufficiently covered, or if the current_layer is 2, return an empty array for generated_follow_ups. **Crucial:** Do not generate questions similar to previously asked questions in the provided context.

Context of current topic (history):
${activeTopicContext.join('\n')}

Current Question Layer: ${currentQuestion.layer}

Respond STRICTLY in this JSON format:
{
  "evaluation_status": "<correct | wrong | need improvement in answer | clarification for ai's misunderstanding>",
  "spoken_response": "Feedback/transition text",
  "generated_follow_ups": ["Follow up 1", "Follow up 2"] 
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
        // Queue Injection (Breadth)
        if(evalData.generated_follow_ups && evalData.generated_follow_ups.length > 0) {
            const mappedFollowUps = evalData.generated_follow_ups.map(text => ({
                text: text,
                topic_id: currentQuestion.topic_id,
                layer: currentQuestion.layer + 1
            }));
            interviewQueue.unshift(...mappedFollowUps); // Put at front of line
        }
        askNextQuestion();
    } else {
        // Coach Mode (Wrong, Needs Improvement, or Clarification)
        // Wait for them to answer again on the SAME topic without adding follow-ups
        statusText.textContent = "Ready for your answer";
        statusDot.className = "w-2 h-2 rounded-full bg-emerald-400";
        liveTranscript.textContent = "Awaiting your clarification/retrial...";
    }
}

// Phase 4 & Controls: Skip and Download
document.getElementById('btnSkipTopic').addEventListener('click', () => {
    if(!currentQuestion) return;
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
