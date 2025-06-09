// teleprompterTrial.js

function startTeleprompterSimulation() {
    console.log('Starting teleprompter simulation');

    const container = document.querySelector('.game-container');
    container.innerHTML = '';

    const overlay = document.createElement('div');
    overlay.className = 'message-overlay';

    overlay.innerHTML = `
      <div class="message-box" style="font-family: 'Segoe UI', sans-serif; padding: 36px 40px; max-width: 700px; margin: auto; text-align: left;">
        <h2 style="color: #1e3c72; text-align: left;">Public Speaking Simulation</h2>
        <p style="text-align: left;">
        This is a short simulation of the public speaking task you will face later. You’ll read from a teleprompter just like in the actual task.</p>
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
        overlay.remove();
        showTeleprompterScroll();
    });
}

function showTeleprompterScroll() {
    const container = document.querySelector('.game-container');
    container.innerHTML = '';

    const teleprompter = document.createElement('div');
    teleprompter.style.position = 'relative';
    teleprompter.style.height = '450px';
    teleprompter.style.width = '50%';
    teleprompter.style.overflow = 'hidden';
    teleprompter.style.background = '#ffffff';
    teleprompter.style.border = '2px solid #ccc';
    teleprompter.style.borderRadius = '12px';
    teleprompter.style.padding = '30px';
    teleprompter.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    teleprompter.style.fontSize = '1.5rem';
    teleprompter.style.lineHeight = '2';
    teleprompter.style.color = '#222';
    teleprompter.style.fontFamily = "'Segoe UI', sans-serif";
    teleprompter.style.marginTop = '30px';

    const recordingIndicator = document.createElement('div');
    recordingIndicator.innerHTML = ` 
      <span class="recording-dot" style="margin-right: 8px;"></span>
      <span style="font-weight: bold;">Recording  </span> 🎤
     `;
    recordingIndicator.style.display = 'flex';
    recordingIndicator.style.alignItems = 'center';
    recordingIndicator.style.justifyContent = 'center';
    recordingIndicator.style.fontSize = '20px';
    recordingIndicator.style.color = '#d11a2a';
    recordingIndicator.style.fontWeight = 'bold';
    recordingIndicator.style.marginBottom = '12px';

    container.appendChild(recordingIndicator);
    container.appendChild(teleprompter);




    const text = document.createElement('div');
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
    text.style.position = 'absolute';
    text.style.bottom = '-100%';
    text.style.width = '100%';
    //text.style.whiteSpace = 'normal';  // ✅ allows wrapping
    //text.style.wordWrap = 'break-word'; // ✅ fallback
    text.style.whiteSpace=  'pre-line';  // keep line-breaks but allow wrapping at spaces
    text.style.wordBreak= 'normal'      // prevents mid-word splits

    teleprompter.appendChild(text);
    container.appendChild(teleprompter);

    // Scroll animation
    let start = null;
    const duration = 20000; // 20 seconds scroll time
    //const distance = teleprompter.offsetHeight + text.offsetHeight;
    const distance = teleprompter.offsetHeight + text.offsetHeight + 50;


    function step(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const pct = Math.min(progress / duration, 1);
        text.style.bottom = `${-100 + pct * distance / (teleprompter.offsetHeight / 100)}%`;
        if (pct < 1) {
            requestAnimationFrame(step);
        } else {
            showContinueButton();
        }
    }

    requestAnimationFrame(step);
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
        //overlay.remove()
        createGameUI();
        startPracticeTrial();
    });

    container.appendChild(button);
}
