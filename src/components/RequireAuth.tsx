import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { FirebaseSetupNotice } from "@/components/FirebaseSetupNotice";
import { CardSkeleton } from "@/components/States";

function Loader() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}

export function RequireAuth({
  children,
  requireProfile = true,
  admin = false,
}: {
  children: ReactNode;
  requireProfile?: boolean;
  admin?: boolean;
}) {
  const { user, profile, loading, configured, isAdmin } = useAuth();

  if (!configured) return <FirebaseSetupNotice />;
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (requireProfile && profile && !profile.profileComplete)
    return <Navigate to="/onboarding" replace />;
  if (admin && !isAdmin)
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This area is restricted to tournament staff.
          </p>
        </div>
      </div>
    );
  return <>{children}</>;
}
