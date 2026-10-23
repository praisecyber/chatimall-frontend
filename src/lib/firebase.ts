import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAI, getGenerativeModel } from 'firebase/ai';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { Capacitor } from '@capacitor/core';

// Automatically detect whether the app is running as a native Android APK or on Web
const isNativeAndroid = Capacitor.getPlatform() === 'android';

export const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    (isNativeAndroid
      ? 'AIzaSyAkK7VKiG4ggZO3CGhsjhR70C_H9MrN8-o' // Android Firebase API key (from google-services.json)
      : 'AIzaSyALHw8Qiu16HOQq7JOiqr811dYIjPpVA_g'), // Web Firebase API key
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'chatimall-2623c.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'chatimall-2623c',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'chatimall-2623c.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '603029306761',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    (isNativeAndroid
      ? '1:603029306761:android:e653f60127627403a67558' // Android Firebase App ID
      : '1:603029306761:web:53294ecb7ca8ea60a67558'), // Web Firebase App ID
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-B4QXXK622E',
};

// Initialize Firebase App
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Analytics if supported in the browser environment
if (typeof window !== 'undefined' && !isNativeAndroid) {
  void isSupported().then((yes) => {
    if (yes) getAnalytics(firebaseApp);
  });
}

// Initialize Firebase AI Logic service (Gemini 1.5 Flash developer API)
export const firebaseAI = getAI(firebaseApp);

// Initialize Gemini 1.5 Flash (optimized for multimodal audio voice notes, translation, & summarization)
export const geminiFlashModel = getGenerativeModel(firebaseAI, {
  model: 'gemini-1.5-flash',
});
