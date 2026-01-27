import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getCurrentUser, setInitialized } from './store/slices/authSlice';

// Components
import Navbar from './components/layout/Navbar.jsx';
import LoadingSpinner from './components/common/LoadingSpinner.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';

// Pages
import Home from './pages/Home.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import FormBuilder from './pages/FormBuilder.jsx';
import FormView from './pages/FormView.jsx';
import FormSubmit from './pages/FormSubmit.jsx';
import Analytics from './pages/Analytics.jsx';
import NotFound from './pages/NotFound.jsx';

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, loading, isInitialized, accessToken } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    // Initialize authentication state
    if (accessToken && !isAuthenticated && !isInitialized) {
      dispatch(getCurrentUser());
    } else if (!accessToken) {
      dispatch(setInitialized());
    }
  }, [dispatch, accessToken, isAuthenticated, isInitialized]);

  // Show loading spinner while initializing
  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="pt-16">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route 
            path="/login" 
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
            } 
          />
          <Route 
            path="/register" 
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />
            } 
          />
          
          {/* Public form submission */}
          <Route path="/form/:publicLink" element={<FormSubmit />} />
          
          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forms/:id/builder"
            element={
              <ProtectedRoute>
                <FormBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forms/:id/view"
            element={
              <ProtectedRoute>
                <FormView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forms/:id/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />
          
          {/* 404 route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;