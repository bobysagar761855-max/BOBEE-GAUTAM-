import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid'
];

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testFirestoreConnection();

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account'
});

// In-memory token caching (never persisted in localStorage/sessionStorage)
let isSigningIn = false;
let isLoggingOut = false;
let cachedIdToken: string | null = null;
let cachedAccessToken: string | null = null;

export const initGoogleAuth = (
  onAuthSuccess?: (firebaseUser: FirebaseUser, idToken: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (isLoggingOut) return;
    if (firebaseUser) {
      try {
        const idToken = await firebaseUser.getIdToken();
        cachedIdToken = idToken;
        if (onAuthSuccess && !isSigningIn && !isLoggingOut) {
          onAuthSuccess(firebaseUser, idToken);
        }
      } catch {
        cachedIdToken = null;
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedIdToken = null;
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGoogle = async (): Promise<{
  firebaseUser: FirebaseUser;
  idToken: string;
  accessToken: string | null;
}> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const idToken = await result.user.getIdToken(true);

    cachedIdToken = idToken;
    cachedAccessToken = credential?.accessToken || null;

    return {
      firebaseUser: result.user,
      idToken,
      accessToken: cachedAccessToken
    };
  } finally {
    isSigningIn = false;
  }
};

export const getCachedIdToken = async (): Promise<string | null> => {
  if (auth.currentUser) {
    cachedIdToken = await auth.currentUser.getIdToken();
    return cachedIdToken;
  }
  return cachedIdToken;
};

export const googleLogout = async (): Promise<void> => {
  isLoggingOut = true;
  cachedIdToken = null;
  cachedAccessToken = null;
  try {
    await signOut(auth);
  } finally {
    isLoggingOut = false;
  }
};
