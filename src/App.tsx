import React from "react";
import { PixelGarden } from "./components/PixelGarden";

/**
 * App
 *
 * Provides the overall layout of the application.
 * Delegates the simulation logic and UI to the PixelGarden component.
 */
const App: React.FC = () => {
  return (
    <div className="app-root">
      <header className="app-header">
        <h1 className="app-title">PixelGarden</h1>
        <p className="app-subtitle">
          Plant coloured seeds and watch them grow into generative pixel art.
        </p>
      </header>

      <main className="app-main">
        <PixelGarden />
      </main>

      <footer className="app-footer">
        <span>Open source · MIT License</span>
      </footer>
    </div>
  );
};

export default App;
