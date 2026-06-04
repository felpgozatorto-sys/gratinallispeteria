import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user === null) return <FullLoader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return children;
}

export function AdminRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user === null) return <FullLoader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

function FullLoader() {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="h-12 w-12 rounded-full border-4 border-baunilha border-t-terracota animate-spin" />
    </div>
  );
}
