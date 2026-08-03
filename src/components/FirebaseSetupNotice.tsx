import { AlertTriangle, ExternalLink } from "lucide-react";

const KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

export function FirebaseSetupNotice() {
  return (
    <div className="grid min-h-screen place-items-center bg-background arena-grid px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl glass p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-warning/15 text-warning">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <h1 className="font-display text-xl font-bold">Connect Firebase to continue</h1>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          ClashArena runs on your own Firebase project. Create one, enable{" "}
          <strong className="text-foreground">Google</strong> and{" "}
          <strong className="text-foreground">Email/Password</strong> sign-in, create a Firestore
          database and a Storage bucket, then add these values to the project environment:
        </p>
        <ul className="mt-4 space-y-1.5 rounded-xl border border-border bg-surface-2 p-4 font-mono text-xs text-primary">
          {KEYS.map((k) => (
            <li key={k}>{k}</li>
          ))}
        </ul>
        <a
          href="https://console.firebase.google.com/"
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Open Firebase Console <ExternalLink className="h-4 w-4" />
        </a>
        <p className="mt-4 text-xs text-muted-foreground">
          Remember to publish the <code className="text-foreground">firestore.rules</code> and{" "}
          <code className="text-foreground">storage.rules</code> files from this repo in the
          Firebase console — they protect room passwords and wallets.
        </p>
      </div>
    </div>
  );
}
