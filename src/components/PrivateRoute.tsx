import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 text-primary-blue animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Synchronizing Authenticator...
          </p>
        </div>
      </div>
    );
  }

  return currentUser ? <>{children}</> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
