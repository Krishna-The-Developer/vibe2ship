import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { DisasterProvider } from './context/DisasterContext';
import { MapLayersProvider } from './context/MapLayersContext';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Scheduler from './pages/Scheduler';
import Insights from './pages/Insights';
import History from './pages/History';
import MapView from './pages/MapView';
import Resources from './pages/Resources';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import CommandCenter from './pages/CommandCenter';
import PredictiveForecast from './pages/PredictiveForecast';
import Login from './pages/Login';
import PrivateRoute from './components/PrivateRoute';

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <DisasterProvider>
          <MapLayersProvider>
            <Router>
          <div className="min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
            <Routes>
              {/* Public Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected Routes */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              <Route 
                path="/dashboard" 
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/tasks" 
                element={
                  <PrivateRoute>
                    <Tasks />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/scheduler" 
                element={
                  <PrivateRoute>
                    <Scheduler />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/insights" 
                element={
                  <PrivateRoute>
                    <Insights />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/reports" 
                element={
                  <PrivateRoute>
                    <Reports />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/history" 
                element={
                  <PrivateRoute>
                    <History />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/map" 
                element={
                  <PrivateRoute>
                    <MapView />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/resources" 
                element={
                  <PrivateRoute>
                    <Resources />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/alerts" 
                element={
                  <PrivateRoute>
                    <Alerts />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/command-center" 
                element={
                  <PrivateRoute>
                    <CommandCenter />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/predictive-forecast" 
                element={
                  <PrivateRoute>
                    <PredictiveForecast />
                  </PrivateRoute>
                } 
              />

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
          </MapLayersProvider>
        </DisasterProvider>
      </AppProvider>
    </AuthProvider>
  );
}
