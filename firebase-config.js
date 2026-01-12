// src/firebaseConfig.js

// 1. Use standard NPM imports instead of URLs
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyADm5XDQUPDkvJ8ggdxxbtioY19Ku6Fg7g",
  authDomain: "emotiona-a6695.firebaseapp.com",
  projectId: "emotiona-a6695",
  storageBucket: "emotiona-a6695.appspot.com",
  messagingSenderId: "267592786923",
  appId: "1:267592786923:web:8f05de43d6c5eaa324afae",
  measurementId: "G-GRPL32138M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, "us-central1"); // "us-central1" is the correct default

// 2. Initialize and Export Google Provider (Required for App.jsx)
const googleProvider = new GoogleAuthProvider();

export { auth, db, functions, googleProvider };