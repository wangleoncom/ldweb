import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { getFirebaseServices, isFirebaseEnabled } from './firebase-config.js';

const LS_PREFIX = 'ld_v2';

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}:${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key, value) {
  localStorage.setItem(`${LS_PREFIX}:${key}`, JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

export async function initUserProfile(user) {
  if (!user?.uid) return null;

  // 完美對接 auth.js 傳來的動態權限與隱私權同意紀錄
  const profile = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '鹿粉會員',
    role: user.role || 'user', 
    privacyAgreed: user.privacyAgreed ?? true,
    privacyAgreedAt: user.privacyAgreedAt || nowIso(),
    createdAt: nowIso(),
    lastLoginAt: nowIso(),
    showHistory: true,
    isActive: true
  };

  if (isFirebaseEnabled()) {
    const { db } = getFirebaseServices();
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      // 第一次註冊，寫入完整初始資料 (包含隱私同意時間)
      await setDoc(ref, { 
        ...profile, 
        createdAt: serverTimestamp(), 
        lastLoginAt: serverTimestamp() 
      });
    } else {
      // 舊用戶登入，更新最後登入時間與最新名稱
      await updateDoc(ref, { 
        lastLoginAt: serverTimestamp(), 
        email: profile.email, 
        displayName: profile.displayName 
      });
    }
    return getUserProfile(user.uid);
  }

  // 本機降級模式 (當 Firebase 未設定時)
  const users = readLS('users', {});
  const existing = users[user.uid] || {};
  users[user.uid] = {
    ...profile,
    ...existing,
    uid: user.uid,
    email: user.email || existing.email || '',
    displayName: user.displayName || existing.displayName || '鹿粉會員',
    lastLoginAt: nowIso(),
    createdAt: existing.createdAt || nowIso()
  };
  writeLS('users', users);
  return users[user.uid];
}

export async function getUserProfile(uid) {
  if (!uid) return null;
  if (isFirebaseEnabled()) {
    const { db } = getFirebaseServices();
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? { uid, ...snap.data() } : null;
  }
  const users = readLS('users', {});
  return users[uid] || null;
}

export async function updateUserProfile(uid, updates) {
  if (!uid) throw new Error('缺少 uid');
  
  // 防呆：只允許更新安全欄位
  const safeUpdates = {
    displayName: updates.displayName || '鹿粉會員',
    showHistory: updates.showHistory !== false,
    updatedAt: nowIso()
  };

  if (isFirebaseEnabled()) {
    const { db } = getFirebaseServices();
    await updateDoc(doc(db, 'users', uid), { 
      ...safeUpdates, 
      updatedAt: serverTimestamp() 
    });
    return getUserProfile(uid);
  }

  const users = readLS('users', {});
  users[uid] = { ...(users[uid] || {}), ...safeUpdates, uid };
  writeLS('users', users);
  return users[uid];
}

export async function saveQuizResult(uid, data) {
  const payload = {
    uid,
    playerName: data.playerName || '匿名挑戰者',
    score: Number(data.score || 0),
    total: Number(data.total || 100),
    title: data.title || '-',
    createdAt: nowIso()
  };

  if (!uid) return payload;

  if (isFirebaseEnabled()) {
    const { db } = getFirebaseServices();
    await addDoc(collection(db, 'users', uid, 'quiz_results'), { 
      ...payload, 
      createdAt: serverTimestamp() 
    });
    return payload;
  }

  const rows = readLS(`quiz_results:${uid}`, []);
  rows.unshift(payload);
  writeLS(`quiz_results:${uid}`, rows.slice(0, 30));
  return payload;
}

export async function getQuizHistory(uid, max = 10) {
  if (!uid) return [];
  if (isFirebaseEnabled()) {
    const { db } = getFirebaseServices();
    const q = query(collection(db, 'users', uid, 'quiz_results'), orderBy('createdAt', 'desc'), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  return readLS(`quiz_results:${uid}`, []).slice(0, max);
}

export async function saveQaHistory(uid, data) {
  const payload = {
    uid,
    question: data.question || '',
    answer: data.answer || '',
    source: 'local_qa',
    createdAt: nowIso()
  };

  if (!uid) return payload;

  if (isFirebaseEnabled()) {
    const { db } = getFirebaseServices();
    await addDoc(collection(db, 'users', uid, 'qa_history'), { 
      ...payload, 
      createdAt: serverTimestamp() 
    });
    return payload;
  }

  const rows = readLS(`qa_history:${uid}`, []);
  rows.unshift(payload);
  writeLS(`qa_history:${uid}`, rows.slice(0, 30));
  return payload;
}

export async function getQaHistory(uid, max = 10) {
  if (!uid) return [];
  if (isFirebaseEnabled()) {
    const { db } = getFirebaseServices();
    const q = query(collection(db, 'users', uid, 'qa_history'), orderBy('createdAt', 'desc'), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  return readLS(`qa_history:${uid}`, []).slice(0, max);
}

export async function getUserStats(uid) {
  if (!uid) return { quizCount: 0, bestScore: 0, qaCount: 0 };
  const [quizResults, qaHistory] = await Promise.all([getQuizHistory(uid, 50), getQaHistory(uid, 50)]);
  return {
    quizCount: quizResults.length,
    bestScore: quizResults.reduce((max, row) => Math.max(max, Number(row.score || 0)), 0),
    qaCount: qaHistory.length
  };
}