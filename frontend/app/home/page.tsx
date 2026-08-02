'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthUser, getActiveContext, setActiveContext, logout, AuthUser } from '@/lib/auth';

export default function InteractiveHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeMode, setActiveMode] = useState<'SCHOOL' | 'PERSONAL'>('PERSONAL');

  useEffect(() => {
    const currentUser = getAuthUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    setActiveMode(getActiveContext());
  }, [router]);

  const handleContextToggle = (newMode: 'SCHOOL' | 'PERSONAL') => {
    setActiveContext(newMode);
    setActiveMode(newMode);
  };

  const handleStartStudying = () => {
    if (activeMode === 'SCHOOL') {
      router.push('/classrooms');
    } else {
      router.push('/upload');
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white relative">
      {/* Dynamic Background Ambient Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      {/* Sticky Top Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center font-black text-lg text-white shadow-lg shadow-indigo-500/30">
              E
            </div>
            <span className="text-xl font-bold tracking-tight text-white">EKO</span>
          </div>

          {/* Navigation Anchors */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
            <button onClick={() => scrollToSection('launchpad')} className="hover:text-white transition">Launchpad</button>
            <button onClick={() => scrollToSection('quick-actions')} className="hover:text-white transition">Quick Actions</button>
            <button onClick={() => scrollToSection('recent-activity')} className="hover:text-white transition">Activity & Notes</button>
          </nav>

          {/* Mode Switcher + Profile */}
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 flex items-center gap-1 shadow-inner">
              <button
                onClick={() => handleContextToggle('SCHOOL')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  activeMode === 'SCHOOL'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🏫 Student
              </button>
              <button
                onClick={() => handleContextToggle('PERSONAL')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  activeMode === 'PERSONAL'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                👤 Personal
              </button>
            </div>

            <button
              onClick={logout}
              className="text-xs font-semibold text-slate-400 hover:text-red-400 transition ml-1"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 space-y-24 py-12 relative z-10">
        
        {/* Section 1: Launchpad Hero */}
        <section id="launchpad" className="text-center pt-8 scroll-mt-24 min-h-[70vh] flex flex-col justify-center items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-6">
            <span>
              {activeMode === 'SCHOOL' ? '🏫 Active Context: University Classrooms' : '👤 Active Context: Private PDF Studio'}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">{user.full_name}</span> 👋
          </h1>

          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto mb-10 leading-relaxed">
            {activeMode === 'SCHOOL'
              ? 'Access department course units, ask instant AI study buddy questions, and sync notes with your batch.'
              : 'Upload custom study PDFs, query vector indices in real-time, and auto-synthesize raw notes.'}
          </p>

          {/* Primary Action Card */}
          <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-xl transition duration-300 relative overflow-hidden group">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-left">
              <div className="space-y-2">
                <div className="text-xs font-bold tracking-wider text-indigo-400 uppercase">
                  {activeMode === 'SCHOOL' ? 'Course Materials & Peer Sync' : 'Custom Document RAG'}
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {activeMode === 'SCHOOL' ? 'Open Classroom Vault' : 'Launch Personal PDF Studio'}
                </h2>
                <p className="text-xs text-slate-400 max-w-md">
                  {activeMode === 'SCHOOL'
                    ? 'Explore subjects, unit slides, and join live collaborative study rooms.'
                    : 'Drag & drop new PDFs to extract concepts, create snapshots, and build study guides.'}
                </p>
              </div>

              <button
                onClick={handleStartStudying}
                className="w-full md:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition shadow-xl shadow-indigo-600/30 text-sm whitespace-nowrap active:scale-95"
              >
                🚀 Start Studying
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: Interactive Quick Actions */}
        <section id="quick-actions" className="scroll-mt-24">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">Shortcuts & Tools</h2>
            <p className="text-xs text-slate-400">Direct entry points into EKO's main orchestrator modules.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div 
              onClick={handleStartStudying}
              className="p-6 bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 rounded-2xl transition cursor-pointer group"
            >
              <div className="w-10 h-10 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition">
                {activeMode === 'SCHOOL' ? '📚' : '📥'}
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                {activeMode === 'SCHOOL' ? 'Browse Class Units' : 'Upload Study PDF'}
              </h3>
              <p className="text-xs text-slate-400">
                {activeMode === 'SCHOOL'
                  ? 'Access faculty lectures, uploaded slides, and syllabus topics.'
                  : 'Add custom files for local chunking and vector retrieval.'}
              </p>
            </div>

            <div 
              onClick={() => router.push(activeMode === 'SCHOOL' ? '/classrooms' : '/workspace')}
              className="p-6 bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 rounded-2xl transition cursor-pointer group"
            >
              <div className="w-10 h-10 bg-purple-600/20 text-purple-400 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition">
                🤖
              </div>
              <h3 className="text-base font-bold text-white mb-1">Eko AI Study Buddy</h3>
              <p className="text-xs text-slate-400">
                Query course context with exact citations and page references.
              </p>
            </div>

            <div 
              onClick={() => router.push(activeMode === 'SCHOOL' ? '/classrooms' : '/workspace')}
              className="p-6 bg-slate-900/60 border border-slate-800 hover:border-pink-500/50 rounded-2xl transition cursor-pointer group"
            >
              <div className="w-10 h-10 bg-pink-600/20 text-pink-400 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition">
                ✍️
              </div>
              <h3 className="text-base font-bold text-white mb-1">Note Synthesizer</h3>
              <p className="text-xs text-slate-400">
                Structure raw notes, generate Markdown summaries, and manage snapshot versions.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Context Overview & Recent Activity */}
        <section id="recent-activity" className="scroll-mt-24 py-8">
          <div className="p-8 bg-slate-900/80 border border-slate-800 rounded-3xl backdrop-blur-md">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Active Session Overview</h3>
                <p className="text-xs text-slate-400">Configured workspace settings for your account.</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono px-3 py-1 bg-slate-800 rounded-lg border border-slate-700 text-slate-300">
                  User ID: {user.user_id.slice(0, 8)}...
                </span>
                <span className="text-xs font-mono px-3 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-lg">
                  Role: {user.role || 'Student'}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl font-mono text-xs text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Status: Connected to Database & Vector Store</span>
              </div>
              <span className="text-slate-500">Mode: {activeMode}</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 text-center py-6 text-xs text-slate-500 relative z-10">
        © 2026 EKO Orchestrator System. Welcome, {user.full_name}.
      </footer>
    </div>
  );
}