"use client";

import { useState, useCallback, useRef } from "react";
import { useAuthStore } from "@/store/authStore";

export interface StreamState {
  content: string;
  svg: string;           // SVG creative poster
  isStreaming: boolean;
  isDone: boolean;
  error: string | null;
  contentId: string | null;
  wordCount: number;
  provider: string;
}

export function useAgentStream() {
  const [state, setState] = useState<StreamState>({
    content: "",
    svg: "",
    isStreaming: false,
    isDone: false,
    error: null,
    contentId: null,
    wordCount: 0,
    provider: "",
  });
  const abortRef = useRef<AbortController | null>(null);
  const { accessToken } = useAuthStore();

  const run = useCallback(
    async (
      agentId: string,
      inputs: Record<string, string>,
      tone: string,
      city: string,
      customContext = "",
      generateCreative = true,
      creativeTheme = "orange",
    ) => {
      setState({
        content: "",
        svg: "",
        isStreaming: true,
        isDone: false,
        error: null,
        contentId: null,
        wordCount: 0,
        provider: "",
      });
      abortRef.current?.abort();
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
          body: JSON.stringify({
            agent_id: agentId,
            inputs,
            tone,
            city,
            custom_context: customContext,
            generate_creative: generateCreative,
            creative_theme: creativeTheme,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
          const msg = typeof err.detail === "object"
            ? `${err.detail.error || "Error"}\n💡 ${err.detail.fix || ""}`
            : String(err.detail);
          throw new Error(msg);
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

            // ── Legacy plain-text signals (backward compat) ──────────────
            if (data === "[DONE]") {
              setState((s) => ({ ...s, isStreaming: false, isDone: true }));
              continue;
            }
            if (data.startsWith("[ERROR]")) {
              setState((s) => ({
                ...s,
                isStreaming: false,
                error: data.slice(7) || "Agent failed. Please retry.",
              }));
              continue;
            }
            if (data.startsWith("[SAVED:")) {
              const id = data.slice(7, -1);
              setState((s) => ({ ...s, contentId: id }));
              continue;
            }

            // ── New JSON event format ─────────────────────────────────────
            try {
              const event = JSON.parse(data) as Record<string, unknown>;

              if (event.type === "chunk" && typeof event.text === "string") {
                setState((s) => {
                  const newContent = s.content + event.text;
                  return {
                    ...s,
                    content: newContent,
                    wordCount: newContent.split(/\s+/).filter(Boolean).length,
                  };
                });
              } else if (event.type === "creative" && typeof event.svg === "string") {
                setState((s) => ({ ...s, svg: event.svg as string }));
              } else if (event.type === "saved" && typeof event.content_id === "string") {
                setState((s) => ({ ...s, contentId: event.content_id as string }));
              } else if (event.type === "done") {
                setState((s) => ({
                  ...s,
                  isStreaming: false,
                  isDone: true,
                  contentId: (event.content_id as string) || s.contentId,
                  provider: (event.provider as string) || s.provider,
                }));
              } else if (event.type === "error") {
                setState((s) => ({
                  ...s,
                  isStreaming: false,
                  error: (event.message as string) || "Agent failed.",
                }));
              } else if (typeof event.text === "string") {
                // Legacy JSON chunk without type field
                setState((s) => {
                  const newContent = s.content + event.text;
                  return {
                    ...s,
                    content: newContent,
                    wordCount: newContent.split(/\s+/).filter(Boolean).length,
                  };
                });
              }
            } catch {
              // Non-JSON chunk — skip silently
            }
          }
        }
        // Ensure streaming flag is cleared if stream ends without [DONE]
        setState((s) => (s.isStreaming ? { ...s, isStreaming: false, isDone: true } : s));
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") {
          setState((s) => ({
            ...s,
            isStreaming: false,
            error: (err as Error).message || "Stream failed. Please retry.",
          }));
        } else {
          setState((s) => ({ ...s, isStreaming: false }));
        }
      }
    },
    [accessToken],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState((s) => ({ ...s, isStreaming: false }));
  }, []);

  const reset = useCallback(() => {
    setState({
      content: "",
      svg: "",
      isStreaming: false,
      isDone: false,
      error: null,
      contentId: null,
      wordCount: 0,
      provider: "",
    });
  }, []);

  return { ...state, run, stop, reset };
}
