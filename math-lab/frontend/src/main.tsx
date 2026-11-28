import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { EventsProvider } from "./lib/events";

try {
  const t = localStorage.getItem("theme");
  if (t && t !== "auto") document.documentElement.setAttribute("data-theme", t);
} catch {
  /* sin almacenamiento: se usa el tema del sistema */
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <EventsProvider>
        <App />
      </EventsProvider>
    </BrowserRouter>
  </StrictMode>,
);
