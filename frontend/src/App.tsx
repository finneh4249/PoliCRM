import "./index.css";
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";

import { Layout } from "./components/Layout";

const LandingPage = lazy(() =>
  import("./components/LandingPage").then((module) => ({
    default: module.LandingPage,
  })),
);
const WarRoom = lazy(() =>
  import("./pages/WarRoom").then((module) => ({ default: module.WarRoom })),
);
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Members = lazy(() => import("./pages/Members"));
const Queue = lazy(() => import("./pages/Queue"));
const ElectoralRoll = lazy(() =>
  import("./pages/ElectoralRoll").then((module) => ({ default: module.ElectoralRoll })),
);
const DatabaseViewer = lazy(() =>
  import("./pages/DatabaseViewer").then((module) => ({ default: module.DatabaseViewer })),
);
const HouseholdAnalytics = lazy(() => import("./pages/HouseholdAnalytics"));

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-200">
              <div className="animate-pulse">Loading...</div>
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />

            {/* Protected Routes with Sidebar Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/war-room" element={<WarRoom />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/members" element={<Members />} />
              <Route path="/queue" element={<Queue />} />
              <Route path="/electoral-roll" element={<ElectoralRoll />} />
              <Route path="/database" element={<DatabaseViewer />} />
              <Route path="/household-analytics" element={<HouseholdAnalytics />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
