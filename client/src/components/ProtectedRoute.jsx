import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader } from "./ui/Loader";

export const ProtectedRoute = ({ roles = [] }) => {
  const { isAuthenticated, user, bootstrapping } = useAuth();

  if (bootstrapping) {
    return <Loader label="Checking access..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length && !roles.includes(user?.role)) {
    return <Navigate to={user?.role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  return <Outlet />;
};
