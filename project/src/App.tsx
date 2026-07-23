import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Sidebar, MobileNav } from "@/components/Shell";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Timetable from "@/pages/Timetable";
import Planner from "@/pages/Planner";
import Holidays from "@/pages/Holidays";
import Attendance from "@/pages/Attendance";
import Assistant from "@/pages/Assistant";
import LostFound from "@/pages/LostFound";
import Mentors from "@/pages/Mentors";
import CampusMap from "@/pages/CampusMap";
import PlacementHub from "@/pages/PlacementHub";

function AuthLoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-900 border-t-violet-400" />
    </div>
  );
}

function RootGate() {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoadingSpinner />;
  return user ? <ProtectedRoutes /> : <Landing />;
}

function AuthGate() {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoadingSpinner />;
  return user ? <Navigate to="/" replace /> : <Auth />;
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoadingSpinner />;
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="relative flex min-h-screen bg-black md:gap-0">
      {/* ambient violet glow for all app pages */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-violet-800/15 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-purple-800/10 blur-3xl" />
      </div>
      <Sidebar />
      <main className="relative z-10 flex-1 pb-20 md:pb-0">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/timetable" element={<Timetable />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/holidays" element={<Holidays />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/lost-found" element={<LostFound />} />
          <Route path="/mentors" element={<Mentors />} />
          <Route path="/campus-map" element={<CampusMap />} />
          <Route path="/placements" element={<PlacementHub />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <MobileNav />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootGate />} />
          <Route path="/auth" element={<AuthGate />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
