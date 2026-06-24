"use client";

import { useState, useCallback, useRef } from "react";
import { useAuthStore } from "@/store/authStore";

export interface StreamState {
  content: string;
  isStreaming: boolean;
  isDone: boolean;
  error: string | null;
  contentId: string | null;
  wordCount: number;
}

export function useAgentStream() {
  const [state, setState] = useState<StreamState>({
    content: "",
    isStreaming: false,
    isDone: false,
    error: null,
    contentId: null,
    wordCount: 0,
  });
  const abortRef = useRef<AbortController | null>(null);
  const { accessToken } = useAuthStore();

  const run = useCallback(
    async (agentId: string, inputs: Record<string, string>, tone: string, city: string, customContext = "") => {
      setState({ content: "", isStreaming: true, isDone: false, error: null, contentId: null, wordCount: 0 });
      abortRef.current = new AbortController();

      try {
        // Call backend directly for SSE streaming — bypasses Vercel proxy
        // which can't reliably hold open long-lived SSE connections.
        const streamBase = process.env.NEXT_PUBLIC_API_URL || "https://api.pricebasket.in";
        const response = await fetch(`${streamBase}/api/v1/marketing/agents/run`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ agent_id: agentId, inputs, tone, city, custom_context: customContext }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
          throw new Error(err.detail ?? `HTTP ${response.status}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);

            if (data === "[DONE]") {
              setState((s) => ({ ...s, isStreaming: false, isDone: true }));
            } else if (data.startsWith("[ERROR]")) {
              setState((s) => ({ ...s, isStreaming: false, error: data.slice(7) || "Agent failed. Please retry." }));
            } else if (data.startsWith("[SAVED:")) {
              const id = data.slice(7, -1);
              setState((s) => ({ ...s, contentId: id }));
            } else {
              try {
                const { text } = JSON.parse(data) as { text: string };
                if (text) {
                  setState((s) => {
                    const newContent = s.content + text;
                    return { ...s, content: newContent, wordCount: newContent.split(/\s+/).filter(Boolean).length };
                  });
                }
              } catch {
                // non-JSON chunk — skip
              }
            }
          }
        }
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") {
          setState((s) => ({ ...s, isStreaming: false, error: (err as Error).message || "Stream failed. Please retry." }));
        } else {
          setState((s) => ({ ...s, isStreaming: false }));
        }
      }
    },
    [accessToken]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState((s) => ({ ...s, isStreaming: false }));
  }, []);

  const reset = useCallback(() => {
    setState({ content: "", isStreaming: false, isDone: false, error: null, contentId: null, wordCount: 0 });
  }, []);

  return { ...state, run, stop, reset };
}
