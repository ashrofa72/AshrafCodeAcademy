import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBEt2UfCDfNrnf9awyv-6Wmb86YIaUstqc",
  authDomain: "programming-platform-bb22f.firebaseapp.com",
  projectId: "programming-platform-bb22f",
  storageBucket: "programming-platform-bb22f.firebasestorage.app",
  messagingSenderId: "300412147800",
  appId: "1:300412147800:web:6182514b156cc3910bd22d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Use long polling to avoid websocket issues in some environments
export const db = initializeFirestore(app, { experimentalForceLongPolling: true });