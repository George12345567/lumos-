import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/shared";

// Monkey patch removeChild to prevent crashes from Google Translate/Extensions
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    try {
      return originalRemoveChild.call(this, child);
    } catch (error) {
      if (error instanceof Error && error.name === 'NotFoundError') {
        console.warn('Silenced removeChild error:', error);
        return child; // Pretend we removed it
      }
      throw error;
    }
  };
}

// Error handling for unhandled errors
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
  event.preventDefault();
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  event.preventDefault();
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

try {
  const root = createRoot(rootElement);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
} catch (error) {
  console.error("Failed to render app:", error);
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; font-family: system-ui;">
        <div>
          <h1 style="font-size: 24px; margin-bottom: 16px;">Something Went Wrong</h1>
          <p style="color: #666; margin-bottom: 24px;">An error occurred while loading the site.</p>
          <button onclick="window.location.reload()" style="background: #0070f3; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px;">
            Reload Page
          </button>
        </div>
      </div>
    `;
  }
}
