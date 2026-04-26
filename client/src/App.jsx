import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthShell } from "./components/layout/AuthShell";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Loader } from "./components/ui/Loader";

const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));
const AdminDashboardPage = lazy(() =>
  import("./pages/admin/AdminDashboardPage").then((module) => ({ default: module.AdminDashboardPage }))
);
const AdminExamsPage = lazy(() =>
  import("./pages/admin/AdminExamsPage").then((module) => ({ default: module.AdminExamsPage }))
);
const AdminResultsPage = lazy(() =>
  import("./pages/admin/AdminResultsPage").then((module) => ({ default: module.AdminResultsPage }))
);
const LoginPage = lazy(() => import("./pages/auth/LoginPage").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() =>
  import("./pages/auth/RegisterPage").then((module) => ({ default: module.RegisterPage }))
);
const ExamAttemptPage = lazy(() =>
  import("./pages/user/ExamAttemptPage").then((module) => ({ default: module.ExamAttemptPage }))
);
const CurrentAffairsPage = lazy(() =>
  import("./pages/user/CurrentAffairsPage").then((module) => ({ default: module.CurrentAffairsPage }))
);
const ExamInstructionsPage = lazy(() =>
  import("./pages/user/ExamInstructionsPage").then((module) => ({ default: module.ExamInstructionsPage }))
);
const MyResultsPage = lazy(() =>
  import("./pages/user/MyResultsPage").then((module) => ({ default: module.MyResultsPage }))
);
const ResultDetailPage = lazy(() =>
  import("./pages/user/ResultDetailPage").then((module) => ({ default: module.ResultDetailPage }))
);
const UserDashboardPage = lazy(() =>
  import("./pages/user/UserDashboardPage").then((module) => ({ default: module.UserDashboardPage }))
);

const App = () => (
  <Suspense fallback={<Loader label="Loading workspace..." />}>
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
          <Route path="/current-affairs" element={<CurrentAffairsPage />} />
          <Route path="/my-results" element={<MyResultsPage />} />
        </Route>
      </Route>

      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </Suspense>
);

export default App;
