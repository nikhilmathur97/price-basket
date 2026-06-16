/**
 * WebSocket hook — subscribes to real-time price updates for a list of product IDs.
 */
"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Only use the WS URL if it's a secure wss:// connection — browsers block ws:// from https:// pages.
// If NEXT_PUBLIC_WS_URL is set to a plain ws:// URL on an https:// site, the WebSocket constructor
// throws "Failed to construct 'WebSocket': An insecure WebSocket connection may not be initiated
// from a page loaded over HTTPS." which crashes the React component tree.
const RAW_WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? null;
const WS_URL = RAW_WS_URL && RAW_WS_URL.startsWith("wss://")
  ? `${RAW_WS_URL}/ws/prices`
  : null;

export function useWebSocket(productIds: string[]) {
  const ws = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  // Stable JSON string so useCallback doesn't fire on every render
  // (caller often passes an inline array literal like [id])
  const productIdsKey = useMemo(() => JSON.stringify(productIds), [productIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = useCallback(() => {
    if (!WS_URL) return;
    if (ws.current?.readyState === WebSocket.OPEN) return;

    ws.current = new WebSocket(WS_URL!);

    ws.current.onopen = () => {
      const ids: string[] = JSON.parse(productIdsKey);
      if (ids.length > 0) {
        ws.current?.send(JSON.stringify({ action: "subscribe", product_ids: ids }));
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "price_update") {
          queryClient.invalidateQueries({ queryKey: ["prices", data.product_id] });
          queryClient.invalidateQueries({ queryKey: ["product", data.product_id] });
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.current.onclose = () => {
      // ws.current is nulled in cleanup to signal an intentional close — don't reconnect then
      if (ws.current === null) return;
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.current.onerror = () => {
      ws.current?.close();
    };
  }, [productIdsKey, queryClient]);

  useEffect(() => {
    connect();
    // If already open (e.g. navigating between products), send an updated subscribe
    if (ws.current?.readyState === WebSocket.OPEN) {
      const ids: string[] = JSON.parse(productIdsKey);
      if (ids.length > 0) {
        ws.current.send(JSON.stringify({ action: "subscribe", product_ids: ids }));
      }
    }
    return () => {
      clearTimeout(reconnectTimer.current);
      // Null ws.current BEFORE close so the onclose handler knows this was intentional
      const socket = ws.current;
      ws.current = null;
      socket?.close();
    };
  }, [connect, productIdsKey]);

  return ws;
}
