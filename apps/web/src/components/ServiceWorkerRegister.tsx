"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // installation non bloquante : l'app fonctionne sans service worker
      });
    }
  }, []);

  return null;
}
