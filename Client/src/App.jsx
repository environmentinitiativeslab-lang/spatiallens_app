import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import HomePage from "./Page/HomePage.jsx";
import MapPanel from "./Page/MapPanel.jsx";
import AdminDashboard from "./Page/AdminDashboard.jsx";
import AdminAuth from "./Page/AdminAuth.jsx";

// simple guard: require login + (optional) roles
function ProtectedRoute({ element, roles }) {
  const token = localStorage.getItem("sl:token");
  const user = JSON.parse(localStorage.getItem("sl:user") || "null");
  const next = encodeURIComponent(
    window.location.pathname + window.location.search
  );
  if (!token) return <Navigate to={`/admin/auth?next=${next}`} replace />;
  if (roles && user && !roles.includes(user.role))
    return <Navigate to="/admin/auth" replace />;
  return element;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<MapPanel />} />
        <Route path="/admin/auth" element={<AdminAuth />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute
              roles={["ADMIN", "EDITOR", "VIEWER"]}
              element={<AdminDashboard />}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
