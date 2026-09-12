import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProjectEditor from './pages/ProjectEditor';
import SharedProject from './pages/SharedProject';
import { useAuthStore } from './store/useAuthStore';
import './index.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();
  
  if (loading) return <div className="lm-root" style={{ padding: 50, textAlign: 'center' }}>Yuklanmoqda...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  return children;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/project/:projectId" 
          element={
            <ProtectedRoute>
              <ProjectEditor />
            </ProtectedRoute>
          } 
        />
        
        {/* Public Share Route */}
        <Route path="/share/:shareToken" element={<SharedProject />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
