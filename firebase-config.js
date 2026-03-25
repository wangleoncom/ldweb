import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

// ⚠️ 上線必填：請將下方空字串換成你 Firebase 控制台的真實金鑰
const DEFAULT_CONFIG = {
  apiKey: "AIzaSyBWzwXbYbnAnI299eTNosL6HH-2Fj3PrDc",
  authDomain: "ld1003-d2f33.firebaseapp.com",
  projectId: "ld1003-d2f33",
  storageBucket: "ld1003-d2f33.firebasestorage.app",
  messagingSenderId: "636930016742",
  appId: "1:636930016742:web:eafcc3bdcd08fbfa8d4227",
  measurementId: "G-B944S5WQ1M"
};

function getConfiguredValue() {
  try {
    if (window.__FIREBASE_CONFIG__ && typeof window.__FIREBASE_CONFIG__ === 'object') {
      return { ...DEFAULT_CONFIG, ...window.__FIREBASE_CONFIG__ };
    }
    const saved = localStorage.getItem('ld_firebase_config');
    if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
  } catch {}
  return { ...DEFAULT_CONFIG };
}

// 嚴格檢查：只要有填入真實資料，才會啟動雲端連線
function isValidConfig(config) {
  return Boolean(
    config.apiKey && !config.apiKey.includes('請填入') &&
    config.projectId && !config.projectId.includes('請填入')
  );
}

let services = {
  enabled: false,
  app: null,
  auth: null,
  db: null,
  config: getConfiguredValue()
};

export function initializeFirebaseServices() {
  const config = getConfiguredValue();
  services.config = config;

  if (!isValidConfig(config)) {
    services.enabled = false;
    document.dispatchEvent(new CustomEvent('firebase:status-changed', {
      detail: { initialized: false, authReady: false, dbReady: false, mode: 'local' }
    }));
    return services;
  }

  if (!services.app) {
    services.app = initializeApp(config);
    services.auth = getAuth(services.app);
    services.db = getFirestore(services.app);
    // 強制設定為瀏覽器本機記憶登入狀態
    setPersistence(services.auth, browserLocalPersistence).catch(() => {});
  }

  services.enabled = true;
  document.dispatchEvent(new CustomEvent('firebase:status-changed', {
    detail: { initialized: true, authReady: true, dbReady: true, mode: 'firebase' }
  }));
  return services;
}

export function getFirebaseServices() {
  return services;
}

export function isFirebaseEnabled() {
  return Boolean(services.enabled && services.auth && services.db);
}

export {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
};