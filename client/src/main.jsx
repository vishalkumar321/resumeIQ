import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";
import "./index.css";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const History = lazy(() => import("./pages/History"));
const ReportDetail = lazy(() => import("./pages/ReportDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const JobMatch = lazy(() => import("./pages/JobMatch"));
const ResumeRewriter = lazy(() => import("./pages/ResumeRewriter"));

const PageLoader = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-12">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
      <span className="text-xs font-semibold text-slate-500 animate-pulse">Loading ResumeIQ...</span>
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/report/:id" element={<ProtectedRoute><ReportDetail /></ProtectedRoute>} />
            <Route path="/job-match" element={<ProtectedRoute><JobMatch /></ProtectedRoute>} />
            <Route path="/ai-rewrite" element={<ProtectedRoute><ResumeRewriter /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
);