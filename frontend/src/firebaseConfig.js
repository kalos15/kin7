import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  // PASTE YOUR KEYS HERE
  apiKey: "AIzaSyADm5XDQUPDkvJ8ggdxxbtioY19Ku6Fg7g",
  authDomain: "kin7.com",
  projectId: "emotiona-a6695",
  storageBucket: "emotiona-a6695.appspot.com",
  messagingSenderId: "267592786923",
  appId: "1:267592786923:web:8f05de43d6c5eaa324afae",
  measurementId: "G-YFH24EHDKF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");
const analytics = getAnalytics(app); // This starts the tracking

export { app, analytics };