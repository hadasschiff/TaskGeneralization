  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
  import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

  import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCPAX-L6QHMalS2Xioy9QGFkk26jTDXYpU",
    authDomain: "taskgeneralization.firebaseapp.com",
    projectId: "taskgeneralization",
    storageBucket: "taskgeneralization.firebasestorage.app",
    messagingSenderId: "457871279205",
    appId: "1:457871279205:web:f23eb2903a407ef46f728c",
    measurementId: "G-LRLRG44KMP",
  };

  // Initialize Firebase
  export const app = initializeApp(firebaseConfig);
  export const db = getFirestore(app);
  
  export const analytics = getAnalytics(app);
  window.db = db; 