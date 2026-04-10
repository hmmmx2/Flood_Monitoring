"use client";

import { useEffect } from "react";

const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:3000";

export default function LoginRedirect() {
  useEffect(() => {
    window.location.replace(`${CRM_URL}/login`);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-brand)] mx-auto mb-4" />
        <p className="text-sm text-[var(--color-muted)]">Redirecting to sign in…</p>
      </div>
    </div>
  );
}
