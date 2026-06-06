"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-6xl mb-4">😕</div>
      <h2 className="text-xl font-bold text-surface-900 mb-2">Something went wrong</h2>
      <p className="text-sm text-surface-500 mb-6 max-w-sm">
        An unexpected error occurred. Try again or go back to the homepage.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="btn-primary px-6 py-2.5 text-sm"
        >
          Try again
        </button>
        <Link href="/" className="btn-secondary px-6 py-2.5 text-sm">
          Go home
        </Link>
      </div>
    </div>
  );
}
