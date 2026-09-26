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
      isUnlimitedMode: false,
      currentDrillKey: null,

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
        sessionHistory: [],
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

              const combined = (this.sessionTranscript + ' ' + final + ' ' + interim).trim();
              if (combined) {
                this.currentTranscript = combined;
                this.hasSpoken = true;
                document.getElementById('liveTranscriptDisplay').textContent = `"${combined}"`;
                this.calculateLiveWpm(combined);
              }
            };

            // When recognition ends, save the final text so it doesn't get wiped out on restart
            this.recognition.onend = () => {
              if (this.currentTranscript) {
                 this.sessionTranscript = this.currentTranscript; // Save progress
              }
              if (this.isListening) {
                try {
                  this.recognition.start();
                } catch(e){}
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

      async getRandomQuestion(drillKey) {
        // Now it fetches dynamically generated AI questions from the in-memory database
        return await getNextQuestion(drillKey);
      },

      async startFullMock() {
        this.isUnlimitedMode = false;
        this.saveCandidateData();
        document.getElementById('btnExitPractice').classList.add('hidden');
        
        // Assemble official full SVAR sequence by popping from the AI database
        const qList = [];
        for(let i=0; i<3; i++) qList.push(await getNextQuestion('readAloud'));
        for(let i=0; i<3; i++) qList.push(await getNextQuestion('listenRepeat'));
        for(let i=0; i<2; i++) qList.push(await getNextQuestion('sentenceMastery'));
        for(let i=0; i<2; i++) qList.push(await getNextQuestion('situationalQA'));
        for(let i=0; i<1; i++) qList.push(await getNextQuestion('extempore'));
        
        // Filter out nulls in case API failed
        this.activeQuestions = qList.filter(q => q !== null);
        
        if (this.activeQuestions.length === 0) {
            alert("Failed to load questions. Please check API Key.");
            return;
        }

        this.currentIndex = 0;
        this.results = [];
        this.showExamStage();
      },

      async startDrill(drillKey) {
        this.isUnlimitedMode = true;
        this.currentDrillKey = drillKey;
        this.saveCandidateData();
        document.getElementById('btnExitPractice').classList.remove('hidden');
        
        // Grab a single random question for the unlimited practice session
        const q = await this.getRandomQuestion(drillKey);
        if (!q) {
            alert("Failed to load question. Please check API Key.");
            return;
        }
        this.activeQuestions = [q];
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
        this.sessionTranscript = '';
        this.hasSpoken = false;
        this.speakingStartTime = null;
        this.lastSpeechTime = null;
        this.pauseCount = 0;
        this.fillersDetected = 0;

        const q = this.activeQuestions[this.currentIndex];
        const total = this.activeQuestions.length;

        // Update top indices
        if (this.isUnlimitedMode) {
            document.getElementById('currentQuestionNum').textContent = this.sessionHistory ? this.sessionHistory.length + 1 : 1;
            document.getElementById('totalQuestionsNum').textContent = '∞';
        } else {
            document.getElementById('currentQuestionNum').textContent = this.currentIndex + 1;
            document.getElementById('totalQuestionsNum').textContent = total;
        }
        document.getElementById('sectionBadge').textContent = q.section;
        document.getElementById('taskInstructionLabel').textContent = q.instruction;
        document.getElementById('liveTranscriptDisplay').textContent = '[Waiting for response...]';
        document.getElementById('liveWpmBadge').textContent = '0 WPM';
        document.getElementById('inputManualFallback').value = '';

        // Reset UI for unlimited mode
        document.getElementById('instantFeedbackBox').classList.add('hidden');
        document.getElementById('btnSubmitAnswer').classList.remove('hidden');
        document.getElementById('btnRetryUnlimited').classList.add('hidden');
        document.getElementById('btnNextUnlimited').classList.add('hidden');

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
        // Await the visualizer so mic permissions are fully granted BEFORE speech recognition starts
        await this.visualizer.start();
        this.isListening = true;
        
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

      async triggerAiCheckpoint() {
          const feedbackBox = document.getElementById('instantFeedbackBox');
          const originalHTML = feedbackBox.innerHTML;
          feedbackBox.innerHTML = `<div class="text-center py-4"><i class="fa-solid fa-spinner fa-spin text-2xl text-sky-500"></i><p class="mt-2 text-sm text-slate-600 font-medium">AI Coach is analyzing your last 5 answers...</p></div>`;
          
          const last5 = this.sessionHistory.slice(-5);
          const report = await evaluateSessionWithCoach(last5);
          
          if (report) {
              feedbackBox.innerHTML = `
                  <div class="space-y-3">
                      <div class="flex items-center space-x-2 text-sky-800 font-bold">
                          <i class="fa-solid fa-robot"></i> <span>AI Coach Checkpoint</span>
                      </div>
                      <p class="text-xs text-slate-700 italic">"${report.finalCoachMessage}"</p>
                      <div class="grid grid-cols-2 gap-2 text-[11px]">
                          <div class="bg-emerald-50 p-2 rounded border border-emerald-100">
                              <span class="font-bold text-emerald-800">Strengths:</span>
                              <ul class="list-disc pl-3 text-emerald-700 mt-1">${report.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
                          </div>
                          <div class="bg-rose-50 p-2 rounded border border-rose-100">
                              <span class="font-bold text-rose-800">Focus Areas:</span>
                              <ul class="list-disc pl-3 text-rose-700 mt-1">${report.weaknesses.map(s => `<li>${s}</li>`).join('')}</ul>
                          </div>
                      </div>
                      <div class="mt-2 pt-2 border-t border-slate-200">
                         <button id="btnDismissCheckpoint" class="text-xs font-semibold px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded text-slate-700">Continue Drill</button>
                      </div>
                  </div>
              `;
              
              document.getElementById('btnNextUnlimited').classList.add('hidden');
              document.getElementById('btnRetryUnlimited').classList.add('hidden');
              
              document.getElementById('btnDismissCheckpoint').addEventListener('click', () => {
                  feedbackBox.innerHTML = originalHTML;
                  document.getElementById('btnNextUnlimited').classList.remove('hidden');
                  document.getElementById('btnRetryUnlimited').classList.remove('hidden');
              });
          } else {
              feedbackBox.innerHTML = originalHTML + `<p class="text-xs text-rose-600 mt-2">Failed to load AI checkpoint.</p>`;
          }
      },

      submitCurrentAnswer() {
        clearInterval(this.timerInterval);
        this.stopRecording();

        const q = this.activeQuestions[this.currentIndex];
        const manualInput = document.getElementById('inputManualFallback').value.trim();
        const spokenText = (manualInput || this.currentTranscript).trim();

        // Calculate string & phonetic similarity
        
          // Add to AI Coach Session History
          this.sessionHistory.push({
            section: q.type,
            question: q.promptText || q.expectedText || (q.points ? q.points.join(', ') : 'Unknown'),
            userSpoken: spokenText || '[No response]'
          });

          const evaluation = this.gradeResponse(q, spokenText);

        if (this.isUnlimitedMode) {
          // Unlimited practice mode: Show immediate feedback, don't move to next automatically
          const feedbackBox = document.getElementById('instantFeedbackBox');
          feedbackBox.classList.remove('hidden');
          
          let titleColor = evaluation.score >= 80 ? 'text-emerald-900' : (evaluation.score >= 60 ? 'text-amber-900' : 'text-rose-900');
          document.getElementById('feedbackTitle').className = `font-bold ${titleColor}`;
          document.getElementById('feedbackTitle').textContent = `Score: ${evaluation.score}%`;
          document.getElementById('feedbackDetails').textContent = evaluation.feedback;
          
          // Switch buttons
          document.getElementById('btnSubmitAnswer').classList.add('hidden');
          document.getElementById('btnRetryUnlimited').classList.remove('hidden');
          document.getElementById('btnNextUnlimited').classList.remove('hidden');
            // AI Coach Checkpoint every 5 questions
            if (this.sessionHistory.length > 0 && this.sessionHistory.length % 5 === 0) {
                this.triggerAiCheckpoint();
            }

        } else {
          // Normal test mode
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
        const fillerRegex = /\b(um|uh|hm|ahhh|uhhh)\b/gi;
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
        async showFinalReport() {
          document.getElementById('viewExamStage').classList.add('hidden');
          document.getElementById('testProgressBarContainer').classList.add('hidden');
          document.getElementById('viewResults').classList.remove('hidden');

          // Show Loading UI in Results
          const viewResults = document.getElementById('viewResults');
          const originalContent = viewResults.innerHTML;
          viewResults.innerHTML = `
            <div class="max-w-2xl mx-auto w-full text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm mt-10">
                <i class="fa-solid fa-brain fa-spin text-5xl text-sky-500 mb-4"></i>
                <h2 class="text-2xl font-bold text-slate-800">AI Coach is evaluating your test...</h2>
                <p class="text-slate-500 mt-2 text-sm">Please wait while the AI analyzes your grammar, fluency, and answers.</p>
            </div>
          `;

          // Fetch from Gemini
          const report = await evaluateSessionWithCoach(this.sessionHistory);

          if (!report) {
              viewResults.innerHTML = `<div class="text-center py-20"><h2 class="text-red-500 text-xl font-bold">Failed to load AI Report.</h2><button onclick="location.reload()" class="mt-4 px-4 py-2 bg-sky-600 text-white rounded">Reload</button></div>`;
              return;
          }

          // Restore UI
          viewResults.innerHTML = originalContent;
          
          // Populate dynamic info
          document.getElementById('reportCandidateName').textContent = this.candidate.name;
          document.getElementById('reportCandidateMeta').innerHTML = `Assessment ID: ${this.candidate.id} &bull; ${this.candidate.role}`;

          // Score Ring
          document.getElementById('reportOverallScore').textContent = report.overallScore;
          document.getElementById('reportCefrGrade').textContent = report.overallScore >= 80 ? 'C1' : (report.overallScore >= 60 ? 'B2' : 'B1');
          const ltmTag = document.getElementById('reportLtmStatus');
          if (ltmTag) {
              if (report.overallScore >= 65) {
                  ltmTag.className = 'text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full';
                  ltmTag.textContent = 'QUALIFIED';
              } else {
                  ltmTag.className = 'text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full';
                  ltmTag.textContent = 'NOT QUALIFIED';
              }
          }

          // Populate the question Breakdown List dynamically
          const listContainer = document.getElementById('questionBreakdownList');
          if (listContainer) {
              listContainer.innerHTML = '';
              report.detailedFeedback.forEach((item, index) => {
                  listContainer.innerHTML += `
                    <div class="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col space-y-2 mb-3">
                        <div class="flex items-center space-x-2">
                            <span class="w-6 h-6 rounded bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">${index + 1}</span>
                            <h4 class="text-sm font-semibold text-slate-800 line-clamp-1 flex-1" title="${item.question}">${item.question}</h4>
                        </div>
                        <div class="pl-8 space-y-2">
                            <div class="text-xs">
                                <span class="font-bold text-slate-600">You Said:</span>
                                <span class="text-slate-800 italic">"${item.userSpoken}"</span>
                            </div>
                            <div class="text-xs bg-white border border-rose-100 p-2 rounded text-rose-800">
                                <span class="font-bold">Coach Correction:</span> ${item.coachCorrection}
                            </div>
                            <div class="text-xs text-sky-700 font-medium">
                                <i class="fa-solid fa-lightbulb text-amber-500 mr-1"></i> Tip: ${item.actionableTip}
                            </div>
                        </div>
                    </div>
                  `;
              });
          }
          
          // Add listener to the buttons since innerHTML destroyed them
          setTimeout(() => {
              const backBtn = document.getElementById('btnBackToHome');
              if (backBtn) {
                  backBtn.addEventListener('click', () => {
                      document.getElementById('viewResults').classList.add('hidden');
                      document.getElementById('viewOnboarding').classList.remove('hidden');
                  });
              }
              const retakeBtn = document.getElementById('btnRetakeMock');
              if (retakeBtn) {
                  retakeBtn.addEventListener('click', async () => {
                      await this.startFullMock();
                  });
              }
          }, 100);
        },


      bindEvents() {
        // Start full mock
        document.getElementById('btnStartFullMock').addEventListener('click', async () => {
          document.getElementById('viewLoading').classList.remove('hidden');
          this.audio.initContext();
          await this.startFullMock();
          document.getElementById('viewLoading').classList.add('hidden');
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
          btn.addEventListener('click', async (e) => {
            const drillKey = e.currentTarget.getAttribute('data-drill');
            document.getElementById('modalDrill').classList.add('hidden');
            this.audio.initContext();
            await this.startDrill(drillKey);
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

        // Unlimited Mode Buttons
        document.getElementById('btnNextUnlimited').addEventListener('click', async () => {
          this.activeQuestions = [await this.getRandomQuestion(this.currentDrillKey)];
          this.currentIndex = 0;
          this.loadCurrentQuestion();
        });

        document.getElementById('btnRetryUnlimited').addEventListener('click', () => {
          this.loadCurrentQuestion(); // reloads the same question
        });

        document.getElementById('btnExitPractice').addEventListener('click', () => {
          clearInterval(this.timerInterval);
          this.stopRecording();
          document.getElementById('viewExamStage').classList.add('hidden');
          document.getElementById('testProgressBarContainer').classList.add('hidden');
          document.getElementById('viewOnboarding').classList.remove('hidden');
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

        document.getElementById('btnRetakeMock').addEventListener('click', async () => {
          await this.startFullMock();
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
    window.addEventListener('DOMContentLoaded', async () => {
      app.init();
      // Optional: Preload the database slightly on startup (can happen in background)
      // await initDatabase();
    });