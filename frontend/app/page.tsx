'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function InteractiveLandingPage() {
  const [demoMode, setDemoMode] = useState<'SCHOOL' | 'PERSONAL'>('SCHOOL');

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />
      </div>

      {/* Sticky Header Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center font-black text-lg text-white shadow-lg shadow-indigo-500/30">
              E
            </div>
            <span className="text-xl font-bold tracking-tight text-white">EKO</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <button onClick={() => scrollToSection('features')} className="hover:text-white transition">Features</button>
            <button onClick={() => scrollToSection('demo')} className="hover:text-white transition">Interactive Preview</button>
            <button onClick={() => scrollToSection('workflow')} className="hover:text-white transition">How it Works</button>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition"
            >
              Log In
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition shadow-lg shadow-indigo-600/25 active:scale-95"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Section 1: Hero */}
      <section className="relative pt-24 pb-20 px-6 max-w-5xl mx-auto text-center flex flex-col items-center justify-center min-h-[85vh]">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-8 animate-pulse">
          <span>✨ The Next-Gen AI Academic Orchestrator</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6 leading-tight">
          Master Your Courses. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            Collaborate in Real-Time.
          </span>
        </h1>

        <p className="text-base md:text-lg text-slate-400 max-w-2xl mb-10 leading-relaxed">
          From department-wide course units to private research PDF studio—EKO unifies AI study buddies, note synthesis, and peer presence into one fluid flow.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition shadow-xl shadow-indigo-600/30 text-base active:scale-95"
          >
            Get Started Free
          </Link>
          <button
            onClick={() => scrollToSection('demo')}
            className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold rounded-2xl border border-slate-800 transition text-base"
          >
            Try Demo Preview ↓
          </button>
        </div>
      </section>

      {/* Section 2: Interactive Dual-Mode Preview */}
      <section id="demo" className="py-20 px-6 max-w-6xl mx-auto scroll-mt-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
            Two Modes. Zero Friction.
          </h2>
          <p className="text-sm text-slate-400">
            Toggle below to see how EKO adapts to your immediate study goal.
          </p>

          {/* Interactive Mode Switcher */}
          <div className="inline-flex mt-6 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
            <button
              onClick={() => setDemoMode('SCHOOL')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                demoMode === 'SCHOOL'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏫 Student Mode (Classrooms)
            </button>
            <button
              onClick={() => setDemoMode('PERSONAL')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                demoMode === 'PERSONAL'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              👤 Personal Mode (PDF Studio)
            </button>
          </div>
        </div>

        {/* Dynamic Demo Card Display */}
        <div className="p-8 md:p-12 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl relative overflow-hidden transition-all duration-300">
          {demoMode === 'SCHOOL' ? (
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-xs font-bold text-indigo-400 tracking-wider uppercase">Classroom Centric</span>
                <h3 className="text-2xl font-bold text-white">Department & Course Unit Vault</h3>
                <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                  Automatically routed to your enrolled department syllabus. Access faculty-uploaded units, view course-wide announcements, and build collaborative copybook notes with your batchmates.
                </p>
                <ul className="text-xs text-slate-300 space-y-2 pt-2">
                  <li className="flex items-center gap-2">✅ Structured by Semester, Subject & Unit</li>
                  <li className="flex items-center gap-2">✅ Integrated Eko Study Buddy with exact PDF page citations</li>
                  <li className="flex items-center gap-2">✅ Real-time peer presence & shared Pomodoro timer</li>
                </ul>
              </div>
              <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3 font-mono text-xs">
                <div className="text-slate-500">// Student Context Active</div>
                <div className="p-3 bg-indigo-950/40 border border-indigo-800/50 rounded-xl text-indigo-200">
                  📁 B.Tech CSE &gt; Sem 4 &gt; Operating Systems &gt; Unit 3: Deadlocks
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 flex justify-between items-center">
                  <span>📄 Unit_3_Deadlock_Handling.pdf</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">Indexed</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="text-xs font-bold text-purple-400 tracking-wider uppercase">Private Studio</span>
                <h3 className="text-2xl font-bold text-white">Drag & Drop Any Research PDF</h3>
                <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                  Need to study for an external exam or personal research? Drop your custom PDFs into your isolated workspace for instant AI vector embedding and smart note synthesis.
                </p>
                <ul className="text-xs text-slate-300 space-y-2 pt-2">
                  <li className="flex items-center gap-2">⚡ Instant Chunking & Local Chroma Vector Search</li>
                  <li className="flex items-center gap-2">⚡ Automatic Markdown Note Formatting & Snapshot Rollback</li>
                  <li className="flex items-center gap-2">⚡ Complete Privacy (Isolated from class repositories)</li>
                </ul>
              </div>
              <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3 font-mono text-xs">
                <div className="text-slate-500">// Personal Workspace Active</div>
                <div className="p-6 border-2 border-dashed border-purple-500/40 bg-purple-950/20 rounded-xl text-center text-purple-300">
                  📥 Drag & Drop Custom PDFs Here
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 3: Feature Highlights (Scroll Grid) */}
      <section id="features" className="py-20 px-6 max-w-6xl mx-auto scroll-mt-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Engineered for Focus</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            Everything you need to digest heavy academic material without switching tabs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 rounded-3xl transition duration-300 group">
            <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition">
              🤖
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Eko AI Study Buddy</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ask deep conceptual questions. Eko responds using only your course units with direct textbook citations.
            </p>
          </div>

          <div className="p-8 bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 rounded-3xl transition duration-300 group">
            <div className="w-12 h-12 bg-purple-600/20 text-purple-400 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition">
              ✍️
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Note Synthesizer</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Draft raw notes and let AI format, structure, and condense them. Includes instant snapshot versions to undo or rollback anytime.
            </p>
          </div>

          <div className="p-8 bg-slate-900/60 border border-slate-800 hover:border-pink-500/50 rounded-3xl transition duration-300 group">
            <div className="w-12 h-12 bg-pink-600/20 text-pink-400 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition">
              👥
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Live Peer Telemetry</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              See who else from your class is actively studying the same unit. Sync Pomodoro focus sessions seamlessly.
            </p>
          </div>
        </div>
      </section>

      {/* Section 4: Simple How It Works */}
      <section id="workflow" className="py-20 px-6 max-w-5xl mx-auto scroll-mt-20">
        <div className="p-10 md:p-14 bg-gradient-to-b from-indigo-950/40 to-slate-900 border border-indigo-800/40 rounded-3xl text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">Ready to elevate your study sessions?</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Log in with your academic or personal credentials and jump right into your custom workspace.
          </p>
          <Link
            href="/login"
            className="inline-block px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition shadow-xl shadow-indigo-600/30 text-base"
          >
            Launch EKO Now 🚀
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 text-center py-8 text-xs text-slate-500">
        © 2026 EKO Orchestrator System. Built for serious learners.
      </footer>
    </div>
  );
}