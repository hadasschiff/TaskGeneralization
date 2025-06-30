// teleprompterTrial.js
import {createGameUI} from './game.js'
import {startPracticeTrial} from './practiceTrial.js'

let recognition = null;          // SpeechRecognition instance
let lastSpeech  = 0;             // timestamp of the latest speech fragment
let silenceId   = null;          // interval id
const SILENCE_TIMEOUT = 4000;    // ms
let scrollAnimId     = null;   // requestAnimationFrame handle
let scrollCanceled   = false;  // flag checked inside the loop

function startSpeechMonitoring(onSilence) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    console.warn('SpeechRecognition not supported – skipping silence check');
    return; // graceful degradation
  }

  recognition = new SpeechRec();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  lastSpeech = Date.now();

  recognition.onresult = () => {
    lastSpeech = Date.now(); // we heard something – reset timer
    console.log('speech heard');          // <- helps you confirm activity

  };

  recognition.onerror = () => {
    stopSpeechMonitoring();
    onSilence();
  };

  recognition.start();

  // watchdog loop
  silenceId = setInterval(() => {
    if (Date.now() - lastSpeech > SILENCE_TIMEOUT) {
      stopSpeechMonitoring();
      onSilence();
    }
  }, 500);
}

function stopSpeechMonitoring() {
  if (recognition) {
    recognition.onresult = null;
    recognition.onerror  = null;
    recognition.stop();
    recognition = null;
  }
  clearInterval(silenceId);
  silenceId = null;
}

export function startTeleprompterSimulation() {
    const container = document.querySelector('.game-container');
    container.innerHTML = '';
    const overlay = document.createElement('div');
    overlay.className = 'message-overlay';

    overlay.innerHTML = `
    <div class="message-box" style="font-family: 'Segoe UI', sans-serif; padding: 36px 40px; max-width: 700px; margin: auto; text-align: left;">
        <h2 style="color: #1e3c72; text-align: left;">Public Speaking Simulation</h2>
        <p style="text-align: left;">
        This is a brief simulation of the public speaking task you'll complete later. You'll read from a teleprompter, just like in the actual task. On the right, a simulated live chat will show examples of the kinds of comments you might receive during the real task.
        <br> Some of the comments may come at a delay. </p>
        <p style="text-align: left;">
        When you click "Start Practice", the teleprompter will scroll automatically. Read the text aloud as it appears.</p>

        <div style="text-align: center; margin-top: 30px;">
          <button id="start-teleprompter" style="background-color: #1e3c72; color: white; padding: 12px 24px; font-size: 16px; border: none; border-radius: 6px; cursor: pointer;">
            Start Practice
          </button>
        </div>
      </div>
    `;

    container.appendChild(overlay);
    document.getElementById('start-teleprompter').addEventListener('click', () => {
        navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            // Microphone access granted
            stream.getTracks().forEach(track => track.stop()); // Close the stream
            overlay.remove(); // Now remove overlay and proceed
            showTeleprompterScroll();
        })
        .catch(err => {
            // Mic access denied or unavailable
            alert("Microphone access is required to proceed. Please enable your microphone and refresh the page.");
        });
    });
}

function showTeleprompterScroll() {
    scrollCanceled = false;          // <-- reset each time we start
    const container = document.querySelector('.game-container');
    container.innerHTML = '';

    const teleprompter = document.createElement('div');
    teleprompter.className = 'teleprompter-box';

    const recordingIndicator = document.createElement('div');
    recordingIndicator.className = 'recording-indicator';
    recordingIndicator.innerHTML = ` 
      <span class="recording-dot" style="margin-right: 8px;"></span>
      <span style="font-weight: bold;">Recording  </span> 🎤
     `;

    container.appendChild(recordingIndicator);
    container.appendChild(teleprompter);

    const text = document.createElement('div');
    text.className = 'teleprompter-text';
    text.innerHTML = `
      Welcome to this simulation. The purpose of this task is to practice speaking clearly and steadily. 
      As the text scrolls, please read it aloud at a comfortable pace.
      This simulation is not being recorded and is only for demonstration.
      Maintain eye contact as if addressing a real audience. 
      Try to project your voice and speak with consistent volume. 
      Focus on pacing, articulation, and confidence. 
      The actual task will follow a similar structure.
      Thank you for participating in this practice round.
    `;
    teleprompter.appendChild(text);
    startSpeechMonitoring(handleNoSpeech);
    //container.appendChild(teleprompter);

    // Scroll animation
    let start = null;
    const duration = 20000; // 20 seconds scroll time
    //const distance = teleprompter.offsetHeight + text.offsetHeight;
    const distance = teleprompter.offsetHeight + text.offsetHeight + 50;

    function step(timestamp) {
        if (scrollCanceled) return;    // <-- bail out if we were interrupted

        if (!start) start = timestamp;
        const progress = timestamp - start;
        const pct = Math.min(progress / duration, 1);
        text.style.bottom = `${-100 + pct * distance / (teleprompter.offsetHeight / 100)}%`;
        if (pct < 1) {
            scrollAnimId = requestAnimationFrame(step);  // store id so we can cancel

        } else {
            stopSpeechMonitoring(); // finished successfully
            scrollAnimId = null;
            showContinueButton();
        }
    }
    requestAnimationFrame(step);
    startLiveChatSimulation();
}
function showContinueButton() {
    const container = document.querySelector('.game-container');
    const button = document.createElement('button');
    button.textContent = 'Continue to Practice Trial';
    button.style.marginTop = '30px';
    button.style.padding = '12px 24px';
    button.style.backgroundColor = '#1e3c72';
    button.style.color = 'white';
    button.style.fontSize = '16px';
    button.style.border = 'none';
    button.style.borderRadius = '6px';
    button.style.cursor = 'pointer';
    button.style.display = 'block';
    button.style.marginLeft = 'auto';
    button.style.marginRight = 'auto';
    button.addEventListener('click', () => {
        createGameUI();
        startPracticeTrial();
    });
    container.appendChild(button);
}

//If there is silence
function handleNoSpeech() {
  scrollCanceled = true;                 // tell the loop to quit
  cancelAnimationFrame(scrollAnimId);    // stop any queued frame
  stopSpeechMonitoring();                // (already cleans up the mic)
  const container = document.querySelector('.game-container');
  container.innerHTML = '';

  const msg = document.createElement('div');
  msg.className = 'warning-box';
  msg.style = 'font-family: "Segoe UI", sans-serif; padding: 40px; max-width: 600px; margin: 80px auto; background: #ffe9e9; border: 2px solid #e63946; border-radius: 8px; text-align: center;';
  msg.innerHTML = `<h3 style="color:#e63946; margin-bottom: 20px;">You were not speaking.</h3>
                   <p>If you fail to speak during the task, you will be penalized.</p>
                   <p>Returning to the instructions</p>`;
  container.appendChild(msg);

  setTimeout(() => startTeleprompterSimulation(), 4000);
}

function startLiveChatSimulation() {
  const chatBox = document.createElement('div');
  chatBox.className = 'live-chat-box';
  const inner = document.createElement('div');
  inner.className = 'chat-content';
  chatBox.appendChild(inner);
  const container = document.querySelector('.game-container');
  container.appendChild(chatBox);

  const fakeUsers = ['Maya', 'Jonas', 'Ali', 'Zoe', 'Ben', 'Chloe', 'Daniel', 'Sarah'];
  const comments = [
    "A little louder maybe?",
    "Looks focused.",
    "Great pace!",
    "Eye contact is nice.",
    "Clear and confident!",
    "Could be more expressive.",
    "Nice flow and energy!",
    "Try to slow down a bit.",
    "Looking composed!",
    "Seems a little nervous."
  ];

  let index = 0;
  const interval = setInterval(() => {
    if (index >= comments.length) {
      clearInterval(interval);
      return;
    }

    const user = fakeUsers[Math.floor(Math.random() * fakeUsers.length)];
    const message = document.createElement('div');
    message.className = 'chat-message';
    message.innerHTML = `<strong>${user}</strong>: ${comments[index++]}`;
    inner.appendChild(message);
    // scroll to bottom if overflow
    inner.scrollTop = inner.scrollHeight;

    setTimeout(() => {
      message.style.opacity = '1';
    }, 10);
  }, 2000);
}