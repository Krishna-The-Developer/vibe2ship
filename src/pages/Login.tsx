import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Flame, 
  Mail, 
  Lock, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  AlertCircle 
} from 'lucide-react';

export default function Login() {
  const { login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide all credentials.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isRegistering) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Incorrect email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already registered.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError(err.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google sign-in was aborted.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-slate-100 shadow-md">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-alert-orange/10 border border-alert-orange/20 text-alert-orange animate-pulse">
            <Flame className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800">
            {isRegistering ? 'Create Life Saver Account' : 'Welcome back to Life Saver'}
          </h2>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            {isRegistering ? 'Start defusing procrastination' : 'AI-Powered Deadline Resilience'}
          </p>
        </div>

        {/* Error message alert */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold flex items-center gap-2 animate-shake">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Email input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">Email Address</label>
            <div className="mt-1 relative rounded-xl shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-primary-blue bg-slate-50/50"
              />
            </div>
          </div>

          {/* Password input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">Password</label>
            <div className="mt-1 relative rounded-xl shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-primary-blue bg-slate-50/50"
              />
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-white font-bold bg-primary-blue hover:bg-blue-600 focus:outline-none transition-all cursor-pointer shadow-md shadow-blue-500/10 text-sm flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : isRegistering ? 'Register & Begin' : 'Secure Sign In'}
          </button>
        </form>

        {/* Divider line */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-white text-slate-400 font-bold uppercase">Or use oauth</span>
          </div>
        </div>

        {/* Google sign-in */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.256-3.133C18.423 1.253 15.54 0 12.24 0 5.58 0 .174 5.37.174 12s5.406 12 12.066 12c6.96 0 11.57-4.85 11.57-11.77 0-.795-.085-1.4-.19-1.945H12.24z"
            />
          </svg>
          Sign In With Google
        </button>

        {/* Toggle between Login and Register */}
        <div className="text-center pt-2">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-xs font-bold text-primary-blue hover:underline cursor-pointer"
          >
            {isRegistering 
              ? 'Already have an account? Sign In' 
              : "Don't have an account? Create one now"}
          </button>
        </div>

        {/* Productivity quotes / benefits at the bottom */}
        <div className="border-t border-slate-50 pt-4 grid grid-cols-2 gap-2 text-[10px] text-slate-400 text-center font-semibold">
          <div className="flex items-center justify-center gap-1 border-r border-slate-100">
            <ShieldCheck className="h-3 w-3 text-success-green" /> SSL Protected
          </div>
          <div className="flex items-center justify-center gap-1">
            <Clock className="h-3 w-3 text-alert-orange" /> Real-time Sync
          </div>
        </div>

      </div>
    </div>
  );
}
