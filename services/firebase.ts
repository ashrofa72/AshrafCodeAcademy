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

let app;
let authInstance;
let dbInstance;

try {
  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  // Use long polling to avoid websocket issues in some environments
  dbInstance = initializeFirestore(app, { experimentalForceLongPolling: true });
} catch (error) {
  console.error("Firebase Initialization Error:", error);
}

export const auth = authInstance!;
export const db = dbInstance!;