/* opening-slide.js
   -------------------------------------------------------------
   • The splash (h1, car SVG, START button) is initially hidden
     via CSS class .hidden.
   • After startStudy() completes (game passes us a callback),
     we fade the splash in and wire the START button.
*/

import { startStudy } from "./game.js";

export function setupOpeningSlideHandlers() {
  const container  = document.querySelector(".game-container");
  const splash     = container.querySelector(".content");      // your h1/car/button div
  const startBtn   = splash?.querySelector(".start-btn");

  // 0. keep splash hidden while consent / questionnaire run
  splash?.classList.add("hidden");

  // 1. run consent + questionnaire immediately
  startStudy(afterConsent);

  /* called by startStudy() once questionnaires are done */
  function afterConsent() {
    // fade the splash in
    splash.classList.remove("hidden");
    splash.style.opacity = "0";
    splash.style.transition = "opacity 0.6s ease";
    requestAnimationFrame(() => (splash.style.opacity = "1"));

    //  wire the button (once)
    startBtn?.addEventListener(
      "click",
      () => {
        splash.style.opacity = "0";
        setTimeout(() => {
          // initializeGame is defined inside game.js and already loaded
          window.initializeGame();
        }, 600);
      },
      { once: true }
    );
  }
}
