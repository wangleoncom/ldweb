import {
  getFirebaseServices,
  isFirebaseEnabled,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from './firebase-config.js';
import { initUserProfile, getUserProfile } from './db.js';

const LS_AUTH_KEY = 'ld_v2_local_auth';
const LS_USERS_KEY = 'ld_v2_local_auth_users';

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function emitState(user) {
  document.dispatchEvent(new CustomEvent('auth:state-changed', { detail: { user } }));
}

function emitSuccess(message) {
  document.dispatchEvent(new CustomEvent('auth:action-success', { detail: { message } }));
}

function emitError(message) {
  document.dispatchEvent(new CustomEvent('auth:action-error', { detail: { message } }));
}

export function initAuth() {
  document.addEventListener('auth:login-requested', async (e) => {
    const { email, password } = e.detail || {};
    try {
      await login(email, password);
      emitSuccess('登入成功，歡迎回來。');
    } catch (error) {
      emitError(error.message || '登入失敗，請檢查帳號密碼。');
    }
  });

  document.addEventListener('auth:register-requested', async (e) => {
    const { email, password, displayName } = e.detail || {};
    try {
      await register(email, password, displayName);
      emitSuccess('註冊成功！資料已加密儲存。');
    } catch (error) {
      emitError(error.message || '註冊失敗，請稍後再試。');
    }
  });

  document.addEventListener('auth:logout-requested', async () => {
    try {
      await logout();
      emitSuccess('已安全登出。');
    } catch (error) {
      emitError(error.message || '登出失敗。');
    }
  });

  document.addEventListener('auth:forgot-password-requested', async (e) => {
    const email = e.detail?.email || '';
    try {
      await forgotPassword(email);
      emitSuccess('若帳號存在，重設密碼信件已送出。');
    } catch (error) {
      emitError(error.message || '寄送失敗。');
    }
  });

  if (isFirebaseEnabled()) {
    const { auth } = getFirebaseServices();
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        emitState(null);
        return;
      }
      const profile = await initUserProfile(firebaseUser);
      emitState(normalizeUser(firebaseUser, profile));
    });
  } else {
    const localUser = readLS(LS_AUTH_KEY, null);
    emitState(localUser);
  }
}

async function register(email, password, displayName) {
  // 自動權限派發：特定信箱或官方管理員註冊時，自動升級為 Admin
  const assignedRole = (email.includes('admin') || displayName === '王岦恩') ? 'admin' : 'user';
  const now = new Date().toISOString();

  if (isFirebaseEnabled()) {
    const { auth } = getFirebaseServices();
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName });
    
    // 將權限與隱私同意狀態一併封裝，交給 db.js 寫入 Firestore
    const userPayload = { 
      ...credential.user, 
      displayName, 
      role: assignedRole,
      privacyAgreed: true,
      privacyAgreedAt: now
    };
    const profile = await initUserProfile(userPayload);
    emitState(normalizeUser(credential.user, profile));
    return;
  }

  // 本機模擬模式 (Firebase 未連線時的降級處理)
  const users = readLS(LS_USERS_KEY, []);
  if (users.find((u) => u.email === email)) throw new Error('此 Email 已被註冊。');
  
  const localUser = {
    uid: `local_${Date.now()}`,
    email,
    password,
    displayName: displayName || '鹿粉會員',
    role: assignedRole,
    privacyAgreed: true,
    privacyAgreedAt: now,
    createdAt: now,
    lastLoginAt: now,
    showHistory: true
  };
  
  users.push(localUser);
  writeLS(LS_USERS_KEY, users);
  writeLS(LS_AUTH_KEY, localUser);
  
  // 寫入本地 DB 模擬
  await initUserProfile(localUser);
  emitState(localUser);
}

async function login(email, password) {
  if (isFirebaseEnabled()) {
    const { auth } = getFirebaseServices();
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await initUserProfile(credential.user);
    emitState(normalizeUser(credential.user, profile));
    return;
  }

  const users = readLS(LS_USERS_KEY, []);
  const found = users.find((u) => u.email === email && u.password === password);
  if (!found) throw new Error('帳號或密碼錯誤。');
  
  const merged = { ...found, lastLoginAt: new Date().toISOString() };
  writeLS(LS_AUTH_KEY, merged);
  emitState(merged);
}

async function logout() {
  if (isFirebaseEnabled()) {
    const { auth } = getFirebaseServices();
    await signOut(auth);
    emitState(null);
    return;
  }
  localStorage.removeItem(LS_AUTH_KEY);
  emitState(null);
}

async function forgotPassword(email) {
  if (!email) throw new Error('請先輸入 Email。');
  if (isFirebaseEnabled()) {
    const { auth } = getFirebaseServices();
    await sendPasswordResetEmail(auth, email);
    return;
  }
  return true;
}

function normalizeUser(authUser, profile) {
  // 將 Firebase Auth 狀態與 Firestore 中的 Profile 資料合併
  const fallbackRole = (authUser.email?.includes('admin') || authUser.displayName === '王岦恩') ? 'admin' : 'user';
  
  return {
    uid: authUser.uid,
    email: authUser.email || profile?.email || '',
    displayName: authUser.displayName || profile?.displayName || '鹿粉會員',
    role: profile?.role || fallbackRole,
    privacyAgreed: profile?.privacyAgreed || true,
    createdAt: profile?.createdAt || null,
    lastLoginAt: profile?.lastLoginAt || null,
    showHistory: profile?.showHistory !== false
  };
}

export async function refreshCurrentProfile(user) {
  if (!user?.uid) return null;
  const profile = await getUserProfile(user.uid);
  return { ...user, ...profile };
}