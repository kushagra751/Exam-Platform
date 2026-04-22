import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthShell } from "./components/layout/AuthShell";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminExamsPage } from "./pages/admin/AdminExamsPage";
import { AdminResultsPage } from "./pages/admin/AdminResultsPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ExamAttemptPage } from "./pages/user/ExamAttemptPage";
import { ExamInstructionsPage } from "./pages/user/ExamInstructionsPage";
import { MyResultsPage } from "./pages/user/MyResultsPage";
import { ResultDetailPage } from "./pages/user/ResultDetailPage";
import { UserDashboardPage } from "./pages/user/UserDashboardPage";

const App = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />

    <Route element={<AuthShell />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
    </Route>

    <Route element={<ProtectedRoute roles={["admin", "user"]} />}>
      <Route path="/exam/:examId/instructions" element={<ExamInstructionsPage />} />
      <Route path="/exam/:examId/attempt" element={<ExamAttemptPage />} />
      <Route path="/results/:resultId" element={<ResultDetailPage />} />
    </Route>

    <Route element={<ProtectedRoute roles={["admin"]} />}>
      <Route element={<DashboardLayout />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/exams" element={<AdminExamsPage />} />
        <Route path="/admin/results" element={<AdminResultsPage />} />
      </Route>
    </Route>

    <Route element={<ProtectedRoute roles={["user"]} />}>
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<UserDashboardPage />} />
        <Route path="/my-results" element={<MyResultsPage />} />
      </Route>
    </Route>

    <Route path="/home" element={<Navigate to="/" replace />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

export default App;
