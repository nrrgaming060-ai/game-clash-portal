import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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

function check<T extends { error: { message: string } | null }>(res: T) {
  if (res.error) throw new Error(res.error.message);
  return res;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apply = (session: Session | null) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
        setLoading(false);
      }
    };
    void supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => apply(session));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let unsub: (() => void) | undefined;
    void (async () => {
      try {
        await createProfileIfMissing(user.id, {
          name:
            (user.user_metadata?.["full_name"] as string | undefined) ??
            user.email?.split("@")[0] ??
            "Player",
          email: user.email ?? "",
          avatarUrl: (user.user_metadata?.["avatar_url"] as string | undefined) ?? "",
        });
      } catch {
        /* the listener below still reports the current state */
      }
      if (cancelled) return;
      unsub = watchProfile(user.id, (p) => {
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
      configured: true,
      isAdmin: profile?.role === "admin",
      signInGoogle: async () => {
        const result = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: window.location.origin,
        });
        if (result.error) throw result.error;
      },
      signInEmail: async (email, password) => {
        check(await supabase.auth.signInWithPassword({ email, password }));
      },
      signUpEmail: async (name, email, password) => {
        check(
          await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: window.location.origin,
              data: { full_name: name },
            },
          }),
        );
      },
      resetPassword: async (email) => {
        check(
          await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth`,
          }),
        );
      },
      logout: async () => {
        await supabase.auth.signOut();
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
