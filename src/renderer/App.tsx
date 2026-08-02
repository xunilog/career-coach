// src/App.tsx
// ---------------------------------------------------------------------------
// Root component — sets up React Router and renders the AppShell layout.
// Blocks on the API Key Gate if no provider key is configured.
// Each coach editor (Profile/Experience/Resume) auto-initializes its own
// conversation via CoachChatPanel.
// ---------------------------------------------------------------------------

import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { AppShellLayout } from "./components/layout/AppShell";
import { ApiKeyGate } from "./components/layout/ApiKeyGate";
import { WelcomePage } from "./components/chat/ChatPanel";
import { ProfileEditor } from "./components/editors/ProfileEditor";
import { ExperienceEditor } from "./components/editors/ExperienceEditor";
import { ResumeEditor } from "./components/editors/ResumeEditor";
import { InboxView } from "./components/inbox/InboxView";
import { ResultsView } from "./components/results/ResultsView";

import { useCareerStore } from "./stores/careerStore";

function ResumeGuard({ children }: { children: React.ReactNode }) {
  const canAccess = useCareerStore((s) => s.canAccessResume());
  if (!canAccess) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function InboxPage() {
  return <InboxView />;
}

function AppRoutes() {
  const initializeFromStorage = useCareerStore((s) => s.initializeFromStorage);

  // Load career data from SQLite on app startup so the Overview page
  // (and all other pages) see saved profile/experience data immediately.
  useEffect(() => {
    void initializeFromStorage();
  }, [initializeFromStorage]);

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShellLayout />}>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/profile" element={<ProfileEditor />} />
          <Route path="/experience" element={<ExperienceEditor />} />
          <Route
            path="/resume"
            element={
              <ResumeGuard>
                <ResumeEditor />
              </ResumeGuard>
            }
          />
          {/* ── Job Search routes ──────────────────────────────── */}
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/search/:searchId" element={<ResultsView />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export function App() {
  const [gatePassed, setGatePassed] = useState(false);

  const handleKeyReady = useCallback(() => {
    setGatePassed(true);
  }, []);

  if (!gatePassed) {
    return <ApiKeyGate onKeyReady={handleKeyReady} />;
  }

  return <AppRoutes />;
}
