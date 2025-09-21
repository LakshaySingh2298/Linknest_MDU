import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';
import LandingPage from './pages/LandingPage';
import AdminAuth from './pages/AdminAuth';
import AdminDashboard from './pages/AdminDashboard';
import CaptivePortal from './pages/CaptivePortal';
import TenantPortal from './pages/TenantPortal';
import api from './utils/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await api.get('/auth/me');
          setIsAuthenticated(true);
        } catch {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/portal" element={<CaptivePortal />} />
          <Route path="/tenant" element={<TenantPortal />} />
          <Route 
            path="/admin" 
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <AdminAuth />} 
          />
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <AdminDashboard /> : <Navigate to="/admin" />} 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#fff',
            color: '#1e293b',
            border: '1px solid #e2e8f0',
          },
        }}
      />
    </>
  );
}

export default App;
