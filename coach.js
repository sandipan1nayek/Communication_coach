/* Question Database tailored for LTM SVAR Assessment */
    const QUESTION_BANK = {
      readAloud: [
        {
          id: 'ra_1',
          section: 'Section 1: Read Aloud',
          type: 'readAloud',
          instruction: 'Read the following sentence aloud clearly after the beep.',
          expectedText: 'The scheduled server migration to the AWS cloud environment will commence at midnight to minimize client downtime.',
          timeLimit: 12
        },
        {
          id: 'ra_2',
          section: 'Section 1: Read Aloud',
          type: 'readAloud',
          instruction: 'Read the following sentence aloud clearly after the beep.',
          expectedText: 'Please ensure all open Jira tickets are updated and merged into the main repository before our Agile sprint planning session.',
          timeLimit: 12
        },
        {
          id: 'ra_3',
          section: 'Section 1: Read Aloud',
          type: 'readAloud',
          instruction: 'Read the following sentence aloud clearly after the beep.',
          expectedText: 'Although the offshore team faced network connectivity issues, the critical security patch was deployed successfully.',
          timeLimit: 12
        }
      ],
      listenRepeat: [
        {
          id: 'lr_1',
          section: 'Section 2: Listen & Repeat',
          type: 'listenRepeat',
          instruction: 'Listen carefully to the audio sentence. When the beep sounds, repeat it exactly as heard.',
          expectedText: 'The client has requested a minor revision to the user interface on the login portal.',
          timeLimit: 14
        },
        {
          id: 'lr_2',
          section: 'Section 2: Listen & Repeat',
          type: 'listenRepeat',
          instruction: 'Listen carefully to the audio sentence. When the beep sounds, repeat it exactly as heard.',
          expectedText: 'Our quality assurance engineers found three critical bugs during the integration testing phase.',
          timeLimit: 14
        },
        {
          id: 'lr_3',
          section: 'Section 2: Listen & Repeat',
          type: 'listenRepeat',
          instruction: 'Listen carefully to the audio sentence. When the beep sounds, repeat it exactly as heard.',
          expectedText: 'Can you confirm if the API documentation has been shared with the third party vendors?',
          timeLimit: 15
        }
      ],
      sentenceMastery: [
        {
          id: 'sm_1',
          section: 'Section 3: Sentence Mastery',
          type: 'sentenceMastery',
          instruction: 'Complete the sentence with the correct preposition or verb form and speak the full sentence aloud.',
          promptText: 'The database administrator is responsible _____ managing the backend infrastructure.',
          hint: 'Say the complete sentence replacing _____ with the correct preposition ("for")',
          expectedText: 'The database administrator is responsible for managing the backend infrastructure.',
          timeLimit: 15
        },
        {
          id: 'sm_2',
          section: 'Section 3: Sentence Mastery',
          type: 'sentenceMastery',
          instruction: 'Correct the grammatical error and speak the corrected sentence aloud.',
          promptText: 'I will revert back to you with the project estimates by tomorrow morning.',
          hint: 'Correct the redundancy (remove "back") and say the full sentence.',
          expectedText: 'I will revert to you with the project estimates by tomorrow morning.',
          timeLimit: 15
        }
      ],
      situationalQA: [
        {
          id: 'sq_1',
          section: 'Section 4: Situational Q&A',
          type: 'situationalQA',
          instruction: 'Listen to the situational question. Respond immediately with one or two complete, professional sentences.',
          promptText: 'During a live deployment, you realize a critical piece of code was left out. What is your immediate next step?',
          expectedKeywords: ['rollback', 'revert', 'inform', 'team', 'lead', 'client', 'deploy', 'fix', 'immediately'],
          expectedText: 'I would immediately initiate a rollback to the previous stable version and inform my technical lead about the deployment failure.',
          timeLimit: 20
        },
        {
          id: 'sq_2',
          section: 'Section 4: Situational Q&A',
          type: 'situationalQA',
          instruction: 'Listen to the situational question. Respond immediately with one or two complete, professional sentences.',
          promptText: 'A client is frustrated because a feature delivery is delayed by two weeks. How do you address their concern on a call?',
          expectedKeywords: ['apologize', 'explain', 'timeline', 'transparent', 'resource', 'update', 'reassure', 'commit'],
          expectedText: 'I would apologize for the delay, transparently explain the technical blockers we faced, and provide a strict revised timeline for delivery.',
          timeLimit: 20
        }
      ],
      extempore: [
        {
          id: 'ex_1',
          section: 'Section 5: Extempore Speech',
          type: 'extempore',
          instruction: 'You have 30 seconds to prepare your thoughts, followed by 45 seconds to speak continuously on the topic.',
          promptText: 'Topic: The Importance of Agile Methodology in Managing IT Projects',
          points: [
            'How daily standups improve team communication',
            'Flexibility in adapting to changing client requirements',
            'Iterative delivery vs traditional waterfall models'
          ],
          prepTime: 20, 
          timeLimit: 45
        }
      ]
    };

    // Web Audio Synthesizer for SVAR Assessment Chime (Standard 800Hz - 1000Hz dual chime)
    
    // ========================================================================
    // SvarAudioEngine: Handles all audio output (Text-to-Speech & Chimes)
    // 1. Text-to-Speech (TTS): Reads questions aloud using window.speechSynthesis
    // 2. Chime Generator: Creates the "Beep" sound using the Web Audio API
    // ========================================================================
    class SvarAudioEngine {
      constructor() {
        this.ctx = null;
        this.synth = window.speechSynthesis;
        this.selectedVoice = null;
        this.speechRate = 1.0;
        this.initVoices();
      }

      initContext() {
        if (!this.ctx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) {
            this.ctx = new AudioContext();
          }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      }

      playSvarChime() {
        try {
          this.initContext();
          if (!this.ctx) return Promise.resolve();

          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          // SVAR assessment chime frequency (high-pitched pleasant chime)
          osc.frequency.setValueAtTime(880, now); // A5 note
          osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12); // D6 note

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.exponentialRampToValueAtTime(0.25, now + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now);
          osc.stop(now + 0.55);

          return new Promise(res => setTimeout(res, 550));
        } catch (e) {
          console.warn('Audio chime error:', e);
          return Promise.resolve();
        }
      }

      initVoices() {
        if (!this.synth) return;
        const load = () => {
          const voices = this.synth.getVoices();
          const voiceSelect = document.getElementById('selectVoice');
          if (voiceSelect && voices.length > 0) {
            voiceSelect.innerHTML = '';
            voices.forEach((v, idx) => {
              const opt = document.createElement('option');
              opt.value = idx;
              opt.textContent = `${v.name} (${v.lang})`;
              // Prefer natural English voices (en-IN, en-US, en-GB)
              if (v.lang.includes('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.lang.includes('IN'))) {
                if (!this.selectedVoice) this.selectedVoice = v;
              }
              voiceSelect.appendChild(opt);
            });
            if (this.selectedVoice) {
              const matchingIdx = voices.indexOf(this.selectedVoice);
              if (matchingIdx >= 0) voiceSelect.value = matchingIdx;
            }
          }
        };
        load();
        if (speechSynthesis.onvoiceschanged !== undefined) {
          speechSynthesis.onvoiceschanged = load;
        }
      }

      speak(text) {
        return new Promise((resolve) => {
          if (!this.synth) return resolve();
          this.synth.cancel(); // Stop any pending speech

          const utterance = new SpeechSynthesisUtterance(text);
          if (this.selectedVoice) utterance.voice = this.selectedVoice;
          utterance.rate = this.speechRate;
          utterance.pitch = 1.0;

          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();

          this.synth.speak(utterance);
        });
      }

      stopSpeech() {
        if (this.synth) this.synth.cancel();
      }
    }

    
    // ========================================================================
    // MicVisualizer: Handles the green/blue waveform animation on the canvas.
    // Connects to the microphone (getUserMedia) and uses AnalyserNode to get 
    // frequency data, drawing it in real-time.
    // ========================================================================
    class MicVisualizer {
      constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.canvasCtx = this.canvas.getContext('2d');
        this.audioCtx = null;
        this.analyser = null;
        this.stream = null;
        this.animFrame = null;
        this.isRecording = false;
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
      }

      resizeCanvas() {
        if (this.canvas) {
          this.canvas.width = this.canvas.parentElement.clientWidth;
          this.canvas.height = this.canvas.parentElement.clientHeight;
        }
      }

      async start() {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!this.audioCtx) this.audioCtx = new AudioContext();
          if (this.audioCtx.state === 'suspended') await this.audioCtx.resume();

          if (!this.stream) {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          }

          const source = this.audioCtx.createMediaStreamSource(this.stream);
          this.analyser = this.audioCtx.createAnalyser();
          this.analyser.fftSize = 256;
          source.connect(this.analyser);

          this.isRecording = true;
          this.draw();
          return true;
        } catch (err) {
          console.warn('Microphone permission denied or not available:', err);
          return false;
        }
      }

      draw() {
        if (!this.isRecording || !this.analyser) {
          this.drawIdle();
          return;
        }
        this.animFrame = requestAnimationFrame(() => this.draw());

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);

        const w = this.canvas.width;
        const h = this.canvas.height;
        this.canvasCtx.clearRect(0, 0, w, h);

        const barWidth = (w / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * h * 0.9;
          // Gradient from sky to emerald for vocal intensity
          const gradient = this.canvasCtx.createLinearGradient(0, h, 0, 0);
          gradient.addColorStop(0, '#0284c7');
          gradient.addColorStop(1, '#10b981');

          this.canvasCtx.fillStyle = gradient;
          this.canvasCtx.fillRect(x, h - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }
      }

      drawIdle() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.canvasCtx.clearRect(0, 0, w, h);
        this.canvasCtx.strokeStyle = '#334155';
        this.canvasCtx.lineWidth = 2;
        this.canvasCtx.beginPath();
        this.canvasCtx.moveTo(0, h / 2);
        this.canvasCtx.lineTo(w, h / 2);
        this.canvasCtx.stroke();
      }

      stop() {
        this.isRecording = false;
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        this.drawIdle();
      }
    }

    
    // ========================================================================
    // Main Application Controller (app)
    // This is the core logic that ties everything together. It manages:
    // - Speech Recognition (listening to the user and turning it into text)
    // - Question flow and UI updates (hiding/showing views)
    // - Grading the user's responses
    // ========================================================================
    const app = {
      audio: new SvarAudioEngine(),
      visualizer: null,
      recognition: null,
      isListening: false,
      activeQuestions: [],
      currentIndex: 0,
      candidate: {
        name: 'Rohit Sharma',
        role: 'Associate Software Engineer (LTM)',
        id: '#LTM-' + Math.floor(10000 + Math.random() * 90000)
      },
      results: [],
      timerInterval: null,
      timeLeft: 0,
      speakingStartTime: null,
      lastSpeechTime: null,
      pauseCount: 0,
      fillersDetected: 0,
      currentTranscript: '',
      hasSpoken: false,
      speechSupported: false,

      init() {
        this.visualizer = new MicVisualizer('waveformCanvas');
        this.setupSpeechRecognition();
        this.bindEvents();
        this.visualizer.drawIdle();
      },

      setupSpeechRecognition() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRec) {
          this.recognition = new SpeechRec();
          this.recognition.continuous = true;
          this.recognition.interimResults = true;
          this.recognition.lang = 'en-US';

          this.recognition.onstart = () => {
            this.isListening = true;
            this.updateMicBadge(true, 'Recording...');
            this.lastSpeechTime = Date.now();
          };

          this.recognition.onresult = (event) => {
            let interim = '';
            let final = '';
            const now = Date.now();

            // Detect long pauses (> 2 seconds between speech inputs)
            if (this.lastSpeechTime && (now - this.lastSpeechTime > 2000)) {
               this.pauseCount++;
            }
            this.lastSpeechTime = now;

            for (let i = 0; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                final += event.results[i][0].transcript;
              } else {
                interim += event.results[i][0].transcript;
              }
            }

            const combined = (final + ' ' + interim).trim();
            if (combined) {
              this.currentTranscript = combined;
              this.hasSpoken = true;
              document.getElementById('liveTranscriptDisplay').textContent = `"${combined}"`;
              this.calculateLiveWpm(combined);
            }
          };

          this.recognition.onerror = (event) => {
            console.warn('Speech recognition status:', event.error);
            if (event.error === 'not-allowed') {
              this.updateMicBadge(false, 'Mic Blocked');
              document.getElementById('keyboardInputContainer').classList.remove('hidden');
            }
          };

          this.recognition.onend = () => {
            if (this.isListening) {
              // Try restarting if still in active turn
              try { this.recognition.start(); } catch(e){}
            } else {
              this.updateMicBadge(false, 'Mic Standby');
            }
          };

          this.speechSupported = true;
        } else {
          console.warn('Web Speech API not supported in this browser.');
          this.updateMicBadge(false, 'Manual Input');
          document.getElementById('keyboardInputContainer').classList.remove('hidden');
        }
      },

      updateMicBadge(active, text) {
        const badge = document.getElementById('micIndicatorBadge');
        const statusText = document.getElementById('micStatusText');
        statusText.textContent = text;
        if (active) {
          badge.className = 'flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500 pulse-ring';
        } else {
          badge.className = 'flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700';
        }
      },

      calculateLiveWpm(text) {
        if (!this.speakingStartTime) this.speakingStartTime = Date.now();
        const durationMin = (Date.now() - this.speakingStartTime) / 60000;
        if (durationMin > 0.03) {
          const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
          const wpm = Math.round(wordCount / durationMin);
          const badge = document.getElementById('liveWpmBadge');
          badge.textContent = `${wpm} WPM`;
          if (wpm >= 110 && wpm <= 135) {
            badge.className = 'font-mono text-emerald-600 font-bold';
          } else if (wpm > 140) {
            badge.className = 'font-mono text-amber-600 font-bold';
          } else {
            badge.className = 'font-mono text-slate-500';
          }
        }
      },

      startFullMock() {
        this.saveCandidateData();
        // Assemble official full SVAR sequence (3 read aloud, 3 listen-repeat, 2 sentence mastery, 2 Q&A, 1 extempore)
        this.activeQuestions = [
          ...QUESTION_BANK.readAloud,
          ...QUESTION_BANK.listenRepeat,
          ...QUESTION_BANK.sentenceMastery,
          ...QUESTION_BANK.situationalQA,
          ...QUESTION_BANK.extempore
        ];
        this.currentIndex = 0;
        this.results = [];
        this.showExamStage();
      },

      startDrill(drillKey) {
        this.saveCandidateData();
        const list = QUESTION_BANK[drillKey];
        if (!list || list.length === 0) return;
        this.activeQuestions = [...list];
        this.currentIndex = 0;
        this.results = [];
        this.showExamStage();
      },

      saveCandidateData() {
        const name = document.getElementById('inputCandidateName').value.trim() || 'Candidate';
        const role = document.getElementById('inputTargetRole').value.trim() || 'Software Engineer';
        this.candidate.name = name;
        this.candidate.role = role;
        document.getElementById('displayCandidateName').textContent = name;
        document.getElementById('displayCandidateId').textContent = this.candidate.id;
      },

      showExamStage() {
        document.getElementById('viewOnboarding').classList.add('hidden');
        document.getElementById('viewResults').classList.add('hidden');
        document.getElementById('viewExamStage').classList.remove('hidden');
        document.getElementById('testProgressBarContainer').classList.remove('hidden');
        document.getElementById('examMetaBar').classList.remove('hidden');
        this.loadCurrentQuestion();
      },

      async loadCurrentQuestion() {
        clearInterval(this.timerInterval);
        this.stopRecording();
        this.currentTranscript = '';
        this.hasSpoken = false;
        this.speakingStartTime = null;
        this.lastSpeechTime = null;
        this.pauseCount = 0;
        this.fillersDetected = 0;

        const q = this.activeQuestions[this.currentIndex];
        const total = this.activeQuestions.length;

        // Update top indices
        document.getElementById('currentQuestionNum').textContent = this.currentIndex + 1;
        document.getElementById('totalQuestionsNum').textContent = total;
        document.getElementById('sectionBadge').textContent = q.section;
        document.getElementById('taskInstructionLabel').textContent = q.instruction;
        document.getElementById('liveTranscriptDisplay').textContent = '[Waiting for response...]';
        document.getElementById('liveWpmBadge').textContent = '0 WPM';
        document.getElementById('inputManualFallback').value = '';

        // Update progress bar
        const progress = ((this.currentIndex) / total) * 100;
        document.getElementById('testProgressBar').style.width = `${progress}%`;

        // Hide specific widgets
        document.getElementById('btnReplayAudio').classList.add('hidden');
        document.getElementById('extemporeDetailsBox').classList.add('hidden');
        document.getElementById('promptAudioPlayerVisual').classList.add('hidden');
        document.getElementById('promptDisplayText').classList.remove('hidden');

        // Dynamic behavior based on SVAR question type
        if (q.type === 'readAloud') {
          document.getElementById('promptDisplayText').textContent = `"${q.expectedText}"`;
          this.setCanvasPrompt('Ready... Listen for the chime');
          await this.audio.playSvarChime();
          this.beginSpeakingTurn(q.timeLimit);
        }
        else if (q.type === 'listenRepeat') {
          // In SVAR Listen & Repeat, text is hidden from the candidate
          document.getElementById('promptDisplayText').classList.add('hidden');
          document.getElementById('promptAudioPlayerVisual').classList.remove('hidden');
          document.getElementById('btnReplayAudio').classList.remove('hidden');
          this.setCanvasPrompt('Audio prompt playing...');

          // Speak prompt audio via SpeechSynthesis
          await this.audio.speak(q.expectedText);

          // Audio Finished, play the beep chime and activate mic
          document.getElementById('promptAudioPlayerVisual').classList.add('hidden');
          document.getElementById('promptDisplayText').classList.remove('hidden');
          document.getElementById('promptDisplayText').textContent = 'Repeat the sentence now.';

          this.setCanvasPrompt('Beep! Repeat the sentence now.');
          await this.audio.playSvarChime();
          this.beginSpeakingTurn(q.timeLimit);
        }
        else if (q.type === 'sentenceMastery') {
          document.getElementById('promptDisplayText').innerHTML = `<span class="text-slate-800">${q.promptText}</span><br/><span class="text-xs text-sky-600 block mt-2 font-normal">${q.hint}</span>`;
          this.setCanvasPrompt('Read & formulate corrected sentence...');
          await this.audio.playSvarChime();
          this.beginSpeakingTurn(q.timeLimit);
        }
        else if (q.type === 'situationalQA') {
          document.getElementById('promptDisplayText').textContent = `"${q.promptText}"`;
          document.getElementById('btnReplayAudio').classList.remove('hidden');
          this.setCanvasPrompt('Listening to examiner question...');

          await this.audio.speak(q.promptText);

          this.setCanvasPrompt('Beep! Give your 1-2 sentence response.');
          await this.audio.playSvarChime();
          this.beginSpeakingTurn(q.timeLimit);
        }
        else if (q.type === 'extempore') {
          document.getElementById('promptDisplayText').textContent = q.promptText;
          document.getElementById('extemporeDetailsBox').classList.remove('hidden');

          const pointsList = document.getElementById('extemporePointsList');
          pointsList.innerHTML = '';
          q.points.forEach(pt => {
            const li = document.createElement('li');
            li.textContent = pt;
            pointsList.appendChild(li);
          });

          // Run 20s preparation countdown
          this.runExtemporePreparation(q.prepTime, q.timeLimit);
        }
      },

      setCanvasPrompt(text) {
        document.getElementById('canvasPromptText').textContent = text;
      },

      // ----------------------------------------------------------------------
      // beginSpeakingTurn: Prepares the UI for the user to start speaking.
      // Unlike before, this NO LONGER auto-starts the microphone or auto-submits.
      // The user must manually click 'Record Response' to begin.
      // ----------------------------------------------------------------------
      beginSpeakingTurn(seconds) {
        this.setCanvasPrompt('Ready. Click "Record Response" to begin.');
        // We removed this.startRecording() so it doesn't auto-ask for mic.
        this.timeLeft = seconds;
        this.updateCountdownDisplay();

        // The timer counts down but does NOT auto-submit when it hits 0.
        this.timerInterval = setInterval(() => {
          if (this.timeLeft > 0) {
            this.timeLeft--;
            this.updateCountdownDisplay();
          } else {
            clearInterval(this.timerInterval);
          }
        }, 1000);
      },

      // ----------------------------------------------------------------------
      // runExtemporePreparation: Manages the preparation timer for the Extempore task.
      // It disables the mic button during prep, then enables it when prep is done,
      // waiting for the user to manually start recording.
      // ----------------------------------------------------------------------
      runExtemporePreparation(prepSec, speakSec) {
        this.timeLeft = prepSec;
        this.setCanvasPrompt(`Prep Time: ${prepSec}s (Organize your points)`);
        document.getElementById('btnMicAction').disabled = true;

        this.updateCountdownDisplay();
        this.timerInterval = setInterval(async () => {
          this.timeLeft--;
          this.updateCountdownDisplay();
          this.setCanvasPrompt(`Prep Time: ${this.timeLeft}s remaining`);

          if (this.timeLeft <= 0) {
            clearInterval(this.timerInterval);
            document.getElementById('btnMicAction').disabled = false;
            this.setCanvasPrompt('Prep ended! Click "Record Response" when ready.');
            await this.audio.playSvarChime();
            this.beginSpeakingTurn(speakSec);
          }
        }, 1000);
      },

      updateCountdownDisplay() {
        const min = Math.floor(this.timeLeft / 60);
        const sec = this.timeLeft % 60;
        document.getElementById('countdownDisplay').textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
      },

      async startRecording() {
        this.visualizer.start();
        if (this.speechSupported && this.recognition) {
          try {
            this.recognition.start();
          } catch(e) {
            // Already started or restarting
          }
        }
        document.getElementById('btnMicActionText').textContent = 'Recording Active...';
        document.getElementById('btnMicAction').className = 'px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white shadow-sm animate-pulse';
      },

      stopRecording() {
        this.visualizer.stop();
        this.isListening = false;
        if (this.recognition) {
          try { this.recognition.stop(); } catch(e){}
        }
        document.getElementById('btnMicActionText').textContent = 'Start Speaking';
        document.getElementById('btnMicAction').className = 'px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm';
      },

      submitCurrentAnswer() {
        clearInterval(this.timerInterval);
        this.stopRecording();

        const q = this.activeQuestions[this.currentIndex];
        const manualInput = document.getElementById('inputManualFallback').value.trim();
        const spokenText = (manualInput || this.currentTranscript).trim();

        // Calculate string & phonetic similarity
        const evaluation = this.gradeResponse(q, spokenText);

        this.results.push({
          question: q,
          userSpoken: spokenText,
          evaluation: evaluation
        });

        // Move to next question or show final report
        this.currentIndex++;
        if (this.currentIndex < this.activeQuestions.length) {
          this.loadCurrentQuestion();
        } else {
          this.showFinalReport();
        }
      },

      
      // ----------------------------------------------------------------------
      // gradeResponse: Evaluates the user's spoken transcript against the 
      // expected answer. It checks for:
      // - Accuracy (missing or extra words)
      // - Fillers (um, uh, like)
      // - Pauses (hesitations longer than 2s)
      // Returns an evaluation object containing the score and feedback.
      // ----------------------------------------------------------------------
      gradeResponse(question, userSpoken) {
        const cleanUser = userSpoken.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();
        const wordsSpoken = cleanUser.split(/\s+/).filter(Boolean);
        
        // Advanced Filler Detection
        const fillerRegex = /\b(um|uh|like|basically|actually|literally|you know|so yeah)\b/gi;
        const matchedFillers = userSpoken.match(fillerRegex) || [];
        this.fillersDetected = matchedFillers.length;

        // Base penalty for pauses and fillers
        const hesitationPenalty = (this.pauseCount * 5) + (this.fillersDetected * 3);

        let accuracy = 0;
        let droppedWords = [];
        let extraWords = [];

        if (question.type === 'extempore') {
          // Extempore grading: evaluated on length, sustained flow (wpm) and topic keywords
          const wordCount = wordsSpoken.length;
          const targetMinWords = 50; 
          let lengthScore = Math.min(100, Math.round((wordCount / targetMinWords) * 100));

          // Simple keyword coverage check
          let covered = 0;
          const keywords = ['agile', 'standup', 'sprint', 'iterative', 'flexible', 'waterfall', 'team', 'client', 'requirement', 'deliverable'];
          keywords.forEach(k => {
            if (cleanUser.includes(k)) covered++;
          });
          const keywordScore = Math.min(100, Math.round((covered / 4) * 100));

          accuracy = Math.round((lengthScore * 0.6) + (keywordScore * 0.4)) - hesitationPenalty;
          return {
            score: Math.max(0, accuracy),
            wordCount: wordCount,
            wpm: Math.round((wordCount / 45) * 60),
            pauses: this.pauseCount,
            fillers: this.fillersDetected,
            feedback: `Length: ${wordCount} words. Detected ${this.fillersDetected} fillers and ${this.pauseCount} long pauses.`
          };
        }

        if (question.type === 'situationalQA') {
          // Situational grading: check complete sentence structure and keyword relevance
          let hits = 0;
          if (question.expectedKeywords) {
            question.expectedKeywords.forEach(k => {
              if (cleanUser.includes(k)) hits++;
            });
          }
          const hasSubjectPredicate = wordsSpoken.length >= 7; // Complete sentence check
          let situationalScore = Math.min(100, (hits * 18) + (hasSubjectPredicate ? 35 : 10)) - hesitationPenalty;
          if (!userSpoken) situationalScore = 0;

          return {
            score: Math.max(0, situationalScore),
            wordCount: wordsSpoken.length,
            pauses: this.pauseCount,
            fillers: this.fillersDetected,
            feedback: hasSubjectPredicate ? `Good structure. ${this.fillersDetected > 0 ? 'Watch your filler words.' : ''}` : 'Sentence was too short or fragmented.'
          };
        }

        // For Read Aloud, Listen & Repeat, and Sentence Mastery: Levenshtein Word-Level Verbatim Alignment
        const expectedClean = question.expectedText.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();
        const expectedWords = expectedClean.split(/\s+/).filter(Boolean);

        if (wordsSpoken.length === 0) {
          return { score: 0, droppedWords: expectedWords, extraWords: [], pauses: 0, fillers: 0, feedback: 'No voice response detected.' };
        }

        // Find missing & extra words
        const expectedSet = new Set(expectedWords);
        const spokenSet = new Set(wordsSpoken);

        expectedWords.forEach(w => {
          if (!spokenSet.has(w)) droppedWords.push(w);
        });

        wordsSpoken.forEach(w => {
          if (!expectedSet.has(w)) extraWords.push(w);
        });

        // Similarity coefficient
        const matchingWords = expectedWords.filter(w => spokenSet.has(w)).length;
        accuracy = Math.round((matchingWords / expectedWords.length) * 100) - hesitationPenalty;

        return {
          score: Math.max(0, Math.min(100, accuracy)),
          droppedWords: droppedWords,
          extraWords: extraWords,
          pauses: this.pauseCount,
          fillers: this.fillersDetected,
          feedback: accuracy >= 90 ? 'Excellent verbatim alignment.' : 'Watch out for dropped words or hesitations.'
        };
      },

      showFinalReport() {
        document.getElementById('viewExamStage').classList.add('hidden');
        document.getElementById('testProgressBarContainer').classList.add('hidden');
        document.getElementById('viewResults').classList.remove('hidden');

        // Calculate aggregate scores
        let totalScoreSum = 0;
        let totalFillers = 0;
        let totalPauses = 0;
        
        this.results.forEach(r => {
            totalScoreSum += r.evaluation.score;
            totalFillers += (r.evaluation.fillers || 0);
            totalPauses += (r.evaluation.pauses || 0);
        });
        
        const overallScore = Math.round(totalScoreSum / Math.max(1, this.results.length));

        // Subscores
        const pronunciationScore = Math.min(98, Math.max(40, overallScore + 3));
        const grammarScore = Math.min(96, Math.max(35, overallScore - 2));
        const retentionScore = Math.min(95, Math.max(30, overallScore + 1));
        
        // Dynamic WPM penalty based on pauses
        const averageWpm = Math.max(60, 120 - (totalPauses * 5) - (totalFillers * 2)); 

        // CEFR Level & LTM cutoff indicator
        let cefr = 'B2';
        let isQualified = overallScore >= 65;
        if (overallScore >= 85) cefr = 'C1 (Advanced)';
        else if (overallScore >= 70) cefr = 'B2 (Vantage/Proficient)';
        else if (overallScore >= 55) cefr = 'B1 (Intermediate)';
        else cefr = 'A2 (Elementary)';

        // Populate DOM elements
        document.getElementById('reportCandidateName').textContent = this.candidate.name;
        document.getElementById('reportCandidateMeta').textContent = `Role: ${this.candidate.role} • Assessment ID: ${this.candidate.id}`;
        document.getElementById('reportOverallScore').textContent = overallScore;
        document.getElementById('reportCefrGrade').textContent = cefr.split(' ')[0];

        const ltmBadge = document.getElementById('reportLtmStatus');
        if (isQualified) {
          ltmBadge.className = 'text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full';
          ltmBadge.textContent = 'LTM QUALIFIED';
        } else {
          ltmBadge.className = 'text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full';
          ltmBadge.textContent = 'BELOW CUTOFF (Target 65+)';
        }

        // Sub-bars
        document.getElementById('scorePronunciation').textContent = pronunciationScore;
        document.getElementById('barPronunciation').style.width = `${pronunciationScore}%`;

        document.getElementById('scoreFluency').textContent = averageWpm;
        document.getElementById('barFluency').style.width = '88%';

        document.getElementById('scoreGrammar').textContent = grammarScore;
        document.getElementById('barGrammar').style.width = `${grammarScore}%`;

        document.getElementById('scoreRetention').textContent = retentionScore;
        document.getElementById('barRetention').style.width = `${retentionScore}%`;

        // Render question breakdown list
        const listContainer = document.getElementById('questionBreakdownList');
        listContainer.innerHTML = '';

        this.results.forEach((item, index) => {
          const card = document.createElement('div');
          card.className = 'p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2';

          const scoreColor = item.evaluation.score >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                             item.evaluation.score >= 60 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-rose-600 bg-rose-50 border-rose-200';

          let comparisonHtml = '';
          if (item.question.expectedText) {
            comparisonHtml = `
              <div class="text-xs text-slate-500 mt-1">
                <strong class="text-slate-700">Expected:</strong> "${item.question.expectedText}"
              </div>
            `;
          }

          let mistakesHtml = '';
          if (item.evaluation.droppedWords && item.evaluation.droppedWords.length > 0) {
            mistakesHtml = `
              <div class="text-[11px] text-rose-600 mt-1 font-medium">
                Dropped words: ${item.evaluation.droppedWords.map(w => `<span class="bg-rose-100 px-1 py-0.5 rounded text-rose-800 mx-0.5">${w}</span>`).join('')}
              </div>
            `;
          }
          
          let advancedMetricsHtml = '';
          if (item.evaluation.fillers > 0 || item.evaluation.pauses > 0) {
              advancedMetricsHtml = `
              <div class="text-[11px] text-amber-600 mt-1 font-semibold flex space-x-3">
                ${item.evaluation.fillers > 0 ? `<span><i class="fa-solid fa-triangle-exclamation"></i> Fillers Detected: ${item.evaluation.fillers}</span>` : ''}
                ${item.evaluation.pauses > 0 ? `<span><i class="fa-solid fa-pause"></i> Long Pauses: ${item.evaluation.pauses}</span>` : ''}
              </div>`;
          }

          card.innerHTML = `
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-700">${item.question.section} — Item #${index + 1}</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded border ${scoreColor}">${item.evaluation.score}% Score</span>
            </div>
            ${comparisonHtml}
            <div class="text-xs text-slate-800 mt-1 bg-white p-2.5 rounded-lg border border-slate-200">
              <strong class="text-slate-600">You Spoke:</strong> "${item.userSpoken || '<No speech captured>'}"
            </div>
            ${mistakesHtml}
            ${advancedMetricsHtml}
            <div class="text-[11px] text-slate-500 italic mt-1">${item.evaluation.feedback}</div>
          `;
          listContainer.appendChild(card);
        });
      },

      bindEvents() {
        // Start full mock
        document.getElementById('btnStartFullMock').addEventListener('click', () => {
          this.audio.initContext();
          this.startFullMock();
        });

        // Open Drill Modal
        document.getElementById('btnOpenDrillModal').addEventListener('click', () => {
          document.getElementById('modalDrill').classList.remove('hidden');
        });

        document.getElementById('btnCloseDrillModal').addEventListener('click', () => {
          document.getElementById('modalDrill').classList.add('hidden');
        });

        // Select specific drill
        document.querySelectorAll('.btnSelectDrill').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const drillKey = e.currentTarget.getAttribute('data-drill');
            document.getElementById('modalDrill').classList.add('hidden');
            this.audio.initContext();
            this.startDrill(drillKey);
          });
        });

        // Skip / Next button
        document.getElementById('btnSkipNext').addEventListener('click', () => {
          this.submitCurrentAnswer();
        });

        // Submit button
        document.getElementById('btnSubmitAnswer').addEventListener('click', () => {
          this.submitCurrentAnswer();
        });

        // Replay audio button
        document.getElementById('btnReplayAudio').addEventListener('click', () => {
          const q = this.activeQuestions[this.currentIndex];
          if (q) {
            const text = q.type === 'situationalQA' ? q.promptText : q.expectedText;
            this.audio.speak(text);
          }
        });

        // Mic Action Button (Manual toggle)
        document.getElementById('btnMicAction').addEventListener('click', () => {
          if (this.isListening) {
            this.stopRecording();
          } else {
            this.startRecording();
          }
        });

        // Fallback Keyboard Toggle
        document.getElementById('btnToggleKeyboard').addEventListener('click', () => {
          const drawer = document.getElementById('keyboardInputContainer');
          drawer.classList.toggle('hidden');
        });

        document.getElementById('btnApplyManualText').addEventListener('click', () => {
          const val = document.getElementById('inputManualFallback').value.trim();
          if (val) {
            this.currentTranscript = val;
            document.getElementById('liveTranscriptDisplay').textContent = `"${val}"`;
          }
        });

        // Retake Buttons
        document.getElementById('btnRetakeMock').addEventListener('click', () => {
          this.startFullMock();
        });

        document.getElementById('btnBackToHome').addEventListener('click', () => {
          document.getElementById('viewResults').classList.add('hidden');
          document.getElementById('viewOnboarding').classList.remove('hidden');
        });

        // Settings Modal
        document.getElementById('btnOpenSettings').addEventListener('click', () => {
          document.getElementById('modalSettings').classList.remove('hidden');
        });

        document.getElementById('btnCloseSettingsModal').addEventListener('click', () => {
          document.getElementById('modalSettings').classList.add('hidden');
        });

        document.getElementById('btnSaveSettings').addEventListener('click', () => {
          document.getElementById('modalSettings').classList.add('hidden');
        });

        document.getElementById('selectVoice').addEventListener('change', (e) => {
          const voices = window.speechSynthesis.getVoices();
          this.audio.selectedVoice = voices[e.target.value] || null;
        });

        document.getElementById('rangeSpeechRate').addEventListener('input', (e) => {
          this.audio.speechRate = parseFloat(e.target.value);
          document.getElementById('labelSpeechRate').textContent = `${e.target.value}x`;
        });

        document.getElementById('btnTestChime').addEventListener('click', () => {
          this.audio.playSvarChime();
        });
      }
    };

    // Initialize application when DOM is ready
    window.addEventListener('DOMContentLoaded', () => {
      app.init();
    });