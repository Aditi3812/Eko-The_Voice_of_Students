'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveAuthData, AuthUser } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Context Choice Modal state
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);
  const [showContextModal, setShowContextModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isSignup ? '/api/v1/auth/signup' : '/api/v1/auth/login';
    const payload = isSignup ? { full_name: fullName, email, password } : { email, password };

    try {
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      // Handle Context Choice
      if (data.is_school_email) {
        setPendingUser(data);
        setShowContextModal(true);
      } else {
        saveAuthData(data, 'PERSONAL');
        router.push('/home');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContext = (mode: 'SCHOOL' | 'PERSONAL') => {
    if (pendingUser) {
      saveAuthData(pendingUser, mode);
      setShowContextModal(false);
      router.push('/home');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-slate-800 rounded-2xl shadow-xl border border-slate-700">
        <h2 className="text-3xl font-bold text-center tracking-tight">
          {isSignup ? 'Create EKO Account' : 'Welcome to EKO'}
        </h2>
        <p className="text-sm text-slate-400 text-center">
          {isSignup ? 'Sign up with your university or personal email' : 'Sign in to access your AI study workspace'}
        </p>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
                placeholder="Aditi Priya"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
              placeholder="name@university.edu or name@gmail.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 transition rounded-lg font-semibold text-white shadow-lg disabled:opacity-50"
          >
            {loading ? 'Processing...' : isSignup ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-center text-slate-400">
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => { setIsSignup(!isSignup); setError(''); }}
            className="text-indigo-400 hover:underline font-semibold"
          >
            {isSignup ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>

      {/* --- CONTEXT CHOICE MODAL --- */}
      {showContextModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl max-w-sm w-full space-y-4 text-center">
            <h3 className="text-xl font-bold text-white">Select Workspace Context</h3>
            <p className="text-xs text-slate-400">
              We noticed you logged in with an academic email. Which mode would you like to launch?
            </p>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => handleSelectContext('SCHOOL')}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold flex items-center justify-center gap-2 border border-indigo-400/30"
              >
                🏫 Student Mode (Courses & Notes)
              </button>
              <button
                onClick={() => handleSelectContext('PERSONAL')}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold flex items-center justify-center gap-2 border border-slate-600"
              >
                👤 Personal Mode (Private PDFs & Notes)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}