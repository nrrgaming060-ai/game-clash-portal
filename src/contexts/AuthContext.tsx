import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile as updateAuthProfile,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { createProfileIfMissing, watchProfile } from "@/services/db";
import type { UserProfile } from "@/lib/types";

interface AuthValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
  isAdmin: boolean;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(getFirebaseAuth(), async (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!user || !isFirebaseConfigured) return;
    let cancelled = false;
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        await createProfileIfMissing(user.uid, {
          name: user.displayName ?? user.email?.split("@")[0] ?? "Player",
          email: user.email ?? "",
          avatarUrl: user.photoURL ?? "",
        });
      } catch {
        /* rules may block creation; the listener below still reports state */
      }
      if (cancelled) return;
      unsub = watchProfile(user.uid, (p) => {
        setProfile(p);
        setLoading(false);
      });
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [user]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      profile,
      loading,
      configured: isFirebaseConfigured,
      isAdmin: profile?.role === "admin",
      signInGoogle: async () => {
        await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
      },
      signInEmail: async (email, password) => {
        await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      },
      signUpEmail: async (name, email, password) => {
        const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
        await updateAuthProfile(cred.user, { displayName: name });
        await createProfileIfMissing(cred.user.uid, { name, email });
      },
      resetPassword: async (email) => {
        await sendPasswordResetEmail(getFirebaseAuth(), email);
      },
      logout: async () => {
        await signOut(getFirebaseAuth());
      },
    }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
