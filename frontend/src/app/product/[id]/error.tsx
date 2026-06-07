"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console only — not to a third-party service
    console.error("[ProductPage error]", error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="text-xl font-bold text-surface-900 mb-2">Something went wrong</h1>
      <p className="text-sm text-surface-500 mb-8">
        We couldn&apos;t load this product page. This is usually a temporary issue.
      </p>
      {/* Temporary: show error message to diagnose the crash */}
      {process.env.NODE_ENV !== "production" || error?.message ? (
        <p className="text-xs text-red-400 font-mono bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-6 text-left break-all">
          {error?.message || "Unknown error"}{error?.digest ? ` (digest: ${error.digest})` : ""}
        </p>
      ) : null}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5
                     bg-brand-600 hover:bg-brand-700 text-white rounded-xl
                     text-sm font-semibold transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
        <Link
          href="/search"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5
                     bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-xl
                     text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Search
        </Link>
      </div>
    </div>
  );
}
