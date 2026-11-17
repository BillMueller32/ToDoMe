import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { startSync } from "./lib/store";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

startSync();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
  // Store this version on the device right away, so the very next open works offline.
  window.addEventListener("load", async () => {
    await new Promise((r) => setTimeout(r, 3000)); // let fonts and icons finish loading
    const urls = new Set<string>(["/", "/manifest.webmanifest", "/icons/icon.svg"]);
    for (const e of performance.getEntriesByType("resource")) {
      const u = new URL(e.name);
      if (u.origin === location.origin && !u.pathname.startsWith("/api/")) urls.add(u.pathname);
    }
    caches
      ?.open("todome-v1")
      .then((c) => c.addAll([...urls]))
      .catch(() => {});
  });
}
