import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Bi } from "./Bi";
import { LoadingScreen } from "./LoadingScreen";

// Client-side gate is UX only — every admin query independently re-checks
// server-side (see convex/admin.ts requireAdmin). A non-admin landing here
// directly sees this screen and gets zero data either way.
export function RequireAdmin({ children }: { children: ReactNode }) {
  const isAdmin = useQuery(api.admin.isCurrentUserAdmin);
  const logAccess = useMutation(api.admin.logAccess);
  const logged = useRef(false);

  useEffect(() => {
    if (isAdmin && !logged.current) {
      logged.current = true;
      void logAccess({});
    }
  }, [isAdmin, logAccess]);

  if (isAdmin === undefined) {
    return <LoadingScreen en="Loading…" ar="جاري التحميل..." theme="admin" />;
  }

  if (!isAdmin) {
    return (
      <div className="page-center admin-shell">
        <div className="stub-card">
          <h1 className="stub-title">403</h1>
          <p className="stub-desc">
            <Bi en="You don't have access to this page." ar="معندكش صلاحية الدخول للصفحة دي." />
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
