"use client";

import { useCallback, useEffect, useState } from "react";
import { FlaskConical, Check } from "lucide-react";
import { apiClient } from "@/services/api";

interface HeadlineTest {
  id: string;
  post_slug: string;
  variants: string[];
  chosen_variant: string | null;
  created_at: string | null;
}

function useTests() {
  const [tests, setTests] = useState<HeadlineTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/headline-tests/pending`);
      setTests(res.data.items ?? []);
    } catch {
      setError("Could not load headline tests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  return { tests, loading, error, refetch: fetchTests };
}

export default function HeadlineTestsPage() {
  const { tests, loading, error, refetch } = useTests();
  const [choosing, setChoosing] = useState<string | null>(null);

  const choose = async (testId: string, variant: string) => {
    setChoosing(testId);
    try {
      await apiClient.post(`/headline-tests/${testId}/choose`, { chosen_variant: variant });
      await refetch();
    } catch {
      // stays in the list on failure
    } finally {
      setChoosing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-surface-900 flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-brand-600" />
          Headline A/B Tests
        </h2>
        <p className="text-sm text-surface-500 mt-0.5">
          AI generates 3 title variants per new blog post — pick the one to publish. No automated
          winner selection yet (blog pageviews aren&apos;t tracked), so this is a manual call.
        </p>
      </div>

      {error && <div className="card p-4 text-sm text-red-700 bg-red-50">{error}</div>}

      {loading ? (
        <div className="card p-6 space-y-3">
          <div className="h-4 w-1/3 bg-surface-100 rounded animate-pulse" />
          <div className="h-4 w-full bg-surface-100 rounded animate-pulse" />
        </div>
      ) : tests.length === 0 ? (
        <div className="card p-6 text-center text-sm text-surface-500">No pending headline tests.</div>
      ) : (
        <div className="space-y-3">
          {tests.map((t) => (
            <div key={t.id} className="card p-4 space-y-2">
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide">{t.post_slug}</p>
              <div className="space-y-2">
                {t.variants.map((variant, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-sm bg-surface-50 rounded-lg p-2">
                    <span className="text-surface-800">{variant}</span>
                    <button
                      onClick={() => choose(t.id, variant)}
                      disabled={choosing === t.id}
                      className="btn-ghost text-xs flex items-center gap-1 flex-shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Pick
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
