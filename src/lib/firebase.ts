import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const config = {
  apiKey: import.meta.env['VITE_FIREBASE_API_KEY'] as string | undefined,
  authDomain: import.meta.env['VITE_FIREBASE_AUTH_DOMAIN'] as string | undefined,
  projectId: import.meta.env['VITE_FIREBASE_PROJECT_ID'] as string | undefined,
  storageBucket: import.meta.env['VITE_FIREBASE_STORAGE_BUCKET'] as string | undefined,
  messagingSenderId: import.meta.env['VITE_FIREBASE_MESSAGING_SENDER_ID'] as string | undefined,
  appId: import.meta.env['VITE_FIREBASE_APP_ID'] as string | undefined,
};

export const isFirebaseConfigured = Boolean(
  config.apiKey && config.authDomain && config.projectId && config.appId,
);

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

function app(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error(
      "Firebase is not configured. Add your VITE_FIREBASE_* values to connect the backend.",
    );
  }
  if (!_app) {
    _app = getApps().length
      ? getApp()
      : initializeApp({
          apiKey: config.apiKey!,
          authDomain: config.authDomain!,
          projectId: config.projectId!,
          storageBucket: config.storageBucket ?? `${config.projectId}.appspot.com`,
          messagingSenderId: config.messagingSenderId ?? "",
          appId: config.appId!,
        });
  }
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (!_auth) _auth = getAuth(app());
  return _auth;
}

export function getDb(): Firestore {
  if (!_db) _db = getFirestore(app());
  return _db;
}

export function getBucket(): FirebaseStorage {
  if (!_storage) _storage = getStorage(app());
  return _storage;
}
