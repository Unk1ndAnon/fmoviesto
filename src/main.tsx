import { createRoot } from "react-dom/client";
import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";
import App from "./App.tsx";
import "./index.css";

// If a user has an old cached build (PWA/edge cache), dynamic chunks can fail to load.
// Vite emits this event; reloading fixes the asset map.
window.addEventListener("vite:preloadError", () => {
  window.location.reload();
});

inject();
injectSpeedInsights();

createRoot(document.getElementById("root")!).render(<App />);
