import { setupOpeningSlideHandlers } from "./opening-slide.js";

document.addEventListener("DOMContentLoaded", () => {
  setupOpeningSlideHandlers();          // will call startStudy() internally
});
