// =============================================================
//  teleprompterTrial.js  — rev-B (2025-07-08)
//  • Adds tweak-able scroll-speed constant
//  • Ensures the last line never scrolls fully away
//  • Shows the “Continue” button a little **before** the text ends
// =============================================================

import { createGameUI }   from './game.js';
import { startPracticeTrial } from './practiceTrial.js';

// ─── 0. Config knobs ──────────────────────────────────────────
const SCROLL_DURATION   = 28000; // ms  ↔ increase = slower scroll
const END_BUFFER_PCT    = 0.05;   // how early (5 %) to pop the Continue btn

// ─── 1. Speech-monitoring globals ─────────────────────────────
let recognition   = null;
let lastSpeech    = 0;
let silenceId     = null;
const SILENCE_TIMEOUT = 8_000; // ms

// ─── 2. Animation globals ─────────────────────────────────────
let scrollAnimId   = null;
let scrollCanceled = false;
let continueShown  = false;

// ─── 3. Speech-monitoring helpers ─────────────────────────────
function startSpeechMonitoring(onSilence) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    console.warn('SpeechRecognition not supported – skipping silence check');
    return;
  }

  recognition               = new SpeechRec();
  recognition.continuous    = true;
  recognition.interimResults = true;
  recognition.lang          = 'en-US';
  lastSpeech                = Date.now();

  recognition.onresult = () => (lastSpeech = Date.now());
  recognition.onerror  = () => { stopSpeechMonitoring(); onSilence(); };
  recognition.start();

  silenceId = setInterval(() => {
    if (Date.now() - lastSpeech > SILENCE_TIMEOUT) {
      stopSpeechMonitoring();
      onSilence();
    }
  }, 500);
}

function stopSpeechMonitoring() {
  if (recognition) {
    recognition.onresult = recognition.onerror = null;
    recognition.stop();
    recognition = null;
  }
  clearInterval(silenceId);
  silenceId = null;
}

// ─── 4. Public entry point ────────────────────────────────────
export function startTeleprompterSimulation() {
  const container = document.querySelector('.game-container');
  container.innerHTML = '';

  const overlay = document.createElement('div');
  overlay.className = 'message-overlay';
  overlay.innerHTML = `
    <div class="message-box" style="font-family:'Segoe UI',sans-serif;padding:36px 40px;max-width:700px;margin:auto;text-align:left;">
      <h2 style="color:#1e3c72;">Public Speaking Simulation</h2>
      <p>This is a brief simulation of the public speaking task you'll complete later.
         Read the scrolling text aloud; a fake live-chat will appear on the right.</p>
      <p>Click <strong>Start Practice</strong> when you’re ready.</p>
      <div style="text-align:center;margin-top:30px;">
        <button id="start-teleprompter"
                style="background:#1e3c72;color:#fff;padding:12px 24px;font-size:16px;border:none;border-radius:6px;cursor:pointer;">
          Start Practice
        </button>
      </div>
    </div>`;
  container.appendChild(overlay);

  document.getElementById('start-teleprompter').addEventListener('click', () => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      stream.getTracks().forEach(t => t.stop()); // close mic probe
      overlay.remove();
      showTeleprompterScroll();
    }).catch(() =>
      alert('Microphone access is required to proceed. Please enable your mic and refresh.'));
  });
}

// ─── 5. Teleprompter scene ───────────────────────────────────
function showTeleprompterScroll() {
  scrollCanceled = continueShown = false;

  const container = document.querySelector('.game-container');
  container.innerHTML = '';

  // Teleprompter + recording dot
  const teleprompter = document.createElement('div');
  teleprompter.className = 'teleprompter-box';

  const indicator = document.createElement('div');
  indicator.className = 'recording-indicator';
  indicator.innerHTML = `<span class="recording-dot" style="margin-right:8px;"></span>
                         <span style="font-weight:bold;">Recording</span> 🎤`;

  container.append(indicator, teleprompter);

  // The scrolling text
  const text = document.createElement('div');
  text.className = 'teleprompter-text';
  text.innerHTML = `
    Welcome to this simulation. The purpose of this task is to practise speaking clearly and steadily.
    As the text scrolls, please read it aloud at a comfortable pace. This simulation is not recorded.
    Maintain eye contact as if addressing a real audience.

    Try to project your voice and speak with consistent volume.
    Focus on pacing, articulation, and confidence.

    It is very useful to get this practice. The game will begin shortly.
  `;
  teleprompter.appendChild(text);

  startSpeechMonitoring(handleNoSpeech);
  startLiveChatSimulation();

  // ── Scroll animation
  const distance = teleprompter.offsetHeight + text.offsetHeight; // px
  let startTs    = null;

  function step(ts) {
    if (scrollCanceled) return;

    if (!startTs) startTs = ts;
    const pct = Math.min((ts - startTs) / SCROLL_DURATION, 1);

    // Move the text upward but CLAMP so the last line never fully disappears
    const pctBottom = -100 + (pct * distance) / (teleprompter.offsetHeight / 100);
    text.style.bottom = `${Math.min(pctBottom, 0)}%`; // never > 0%

    // Show “Continue” slightly before reaching the end
    if (!continueShown && pct >= 1 - END_BUFFER_PCT) {
      continueShown = true;
      stopSpeechMonitoring();
      showContinueButton();
    }

    if (pct < 1) {
      scrollAnimId = requestAnimationFrame(step);
    } else {
      scrollAnimId = null; // finished
    }
  }
  scrollAnimId = requestAnimationFrame(step);
}

// ─── 6.  Continue button ─────────────────────────────────────
function showContinueButton() {
  const container = document.querySelector('.game-container');
  const btn = document.createElement('button');
  Object.assign(btn.style, {
    marginTop: '30px', padding: '12px 24px',
    background:'#1e3c72', color:'#fff',
    fontSize:'16px', border:'none', borderRadius:'6px',
    cursor:'pointer', display:'block', marginInline:'auto'
  });
  btn.textContent = 'Continue to Practice Trial';
  btn.onclick = () => { createGameUI(); startPracticeTrial(); };
  container.appendChild(btn);
}

// ─── 7. Silence handler ─────────────────────────────────────
function handleNoSpeech() {
  scrollCanceled = true;
  cancelAnimationFrame(scrollAnimId);
  stopSpeechMonitoring();

  const container = document.querySelector('.game-container');
  container.innerHTML = `
    <div class="warning-box" style="font-family:'Segoe UI',sans-serif;padding:40px;max-width:600px;
         margin:80px auto;background:#ffe9e9;border:2px solid #e63946;border-radius:8px;text-align:center;">
      <h3 style="color:#e63946;margin-bottom:20px;">You were not speaking.</h3>
      <p>If you fail to speak during the task, you will be penalised.</p>
      <p>Returning to the instructions…</p>
    </div>`;
  setTimeout(startTeleprompterSimulation, 2000);
}

// ─── 8. Fake live chat ──────────────────────────────────────
function startLiveChatSimulation() {
  const chatBox = document.createElement('div');
  chatBox.className = 'live-chat-box';
  const inner = document.createElement('div');
  inner.className = 'chat-content';
  chatBox.appendChild(inner);
  document.querySelector('.game-container').appendChild(chatBox);

  const users = ['Maya','Jonas','Ali','Zoe','Ben','Chloe','Daniel','Sarah'];
  const comments = [
    'A little louder maybe?', 'Looks focused.', 'Could be more expressive.',
    'Try to slow down a bit.', 'Seems a little nervous.', 'Could use more energy.',
    'Seems like they’re rushing.', 'Feels like reading, not presenting.',
    'A bit too fast to process.',
  ];

  let i = 0;
  const id = setInterval(() => {
    if (i >= comments.length) return clearInterval(id);
    const msg = document.createElement('div');
    msg.className = 'chat-message';
    msg.innerHTML = `<strong>${users[Math.random()*users.length|0]}</strong>: ${comments[i++]}`;
    inner.appendChild(msg);
    inner.scrollTop = inner.scrollHeight;
    requestAnimationFrame(() => (msg.style.opacity = '1'));
  }, 2000);
}
