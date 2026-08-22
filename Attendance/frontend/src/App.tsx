import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Loader2 } from "lucide-react";

const Dashboard = lazy(() => import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Students = lazy(() => import("@/pages/Students").then((m) => ({ default: m.Students })));
const Attendance = lazy(() => import("@/pages/Attendance").then((m) => ({ default: m.Attendance })));
const AttendanceHistory = lazy(() => import("@/pages/AttendanceHistory").then((m) => ({ default: m.AttendanceHistory })));
const TeacherDashboard = lazy(() => import("@/pages/TeacherDashboard").then((m) => ({ default: m.TeacherDashboard })));
const StudentDetail = lazy(() => import("@/pages/StudentDetail").then((m) => ({ default: m.StudentDetail })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <Routes>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/students" element={<Students />} />
              <Route path="/students/:id" element={<StudentDetail />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/history" element={<AttendanceHistory />} />
              <Route path="/teacher" element={<TeacherDashboard />} />
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

export default App;
