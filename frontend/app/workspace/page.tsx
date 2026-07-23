'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Save, Users, FileText, Check } from 'lucide-react';
// full, responsive TipTap workspace that syncs live over WebSockets and debounces auto-saves to Neon:
const ROOM_ID = 'cse_301_notes';

export default function Workspace() {
  const [isSaved, setIsSaved] = useState(true);
  const [connectedPeers, setConnectedPeers] = useState(1);
  const socketRef = useRef<WebSocket | null>(null);
  const isRemoteUpdate = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'agent'; text: string }[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const handleAskAgent = async () => {
  if (!inputQuery.trim()) return;
  const userText = inputQuery;
  setInputQuery('');
  setMessages((prev) => [...prev, { role: 'user', text: userText }]);
  setIsAsking(true);

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/agent/study-buddy/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: 'CSE-301', question: userText }),
    });
    const data = await res.json();
    setMessages((prev) => [...prev, { role: 'agent', text: data.answer }]);
  } catch (err) {
    console.error('Agent chat failed:', err);
  } finally {
    setIsAsking(false);
  }
};
  // --- Auto-Save to Neon Database ---
  const saveToNeon = useCallback(async (content: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notes/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_id: ROOM_ID,
          course_id: 'CSE-301',
          content: content,
        }),
      });
      setIsSaved(true);
      console.log('💾 Auto-saved note to Neon PostgreSQL!');
    } catch (err) {
      console.error('Save failed:', err);
    }
  }, []);

  // --- TipTap Editor Setup ---
  const editor = useEditor({
    extensions: [StarterKit],
    content: '<h1>Unit 3: Graph Theory & Paths</h1><p>Dijkstra\'s Algorithm finds the shortest path between nodes in a weighted graph...</p>',
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[400px] text-sm font-mono',
      },
    },
    onUpdate: ({ editor }) => {
      // If the change came from another user over WebSocket, don't re-broadcast
      if (isRemoteUpdate.current) {
        isRemoteUpdate.current = false;
        return;
      }

      setIsSaved(false);
      const htmlContent = editor.getHTML();

      // 1. Broadcast edit to WebSocket
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(htmlContent);
      }

      // 2. Debounce Auto-Save to Neon (saves 2 seconds after user stops typing)
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveToNeon(htmlContent);
      }, 2000);
    },
  });

  // --- Load Initial Content & Connect WebSocket ---
  useEffect(() => {
    // 1. Fetch initial note content from Neon
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notes/${ROOM_ID}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.content && editor) {
          isRemoteUpdate.current = true;
          editor.commands.setContent(data.content);
        }
      })
      .catch((err) => console.error('Error fetching initial note:', err));

    // 2. Establish WebSocket connection to FastAPI
    const wsUrl = process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') || 'ws://127.0.0.1:8000';
    const ws = new WebSocket(`${wsUrl}/api/v1/notes/ws/${ROOM_ID}`);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('🟢 Connected to Eko Live Workspace WebSocket');
    };

    ws.onmessage = (event) => {
      console.log('⚡ Received live typing update from peer!');
      if (editor) {
        isRemoteUpdate.current = true;
        // Retain cursor position roughly while setting incoming content
        const { from, to } = editor.state.selection;
        editor.commands.setContent(event.data, { emitUpdate: false });
        editor.commands.setTextSelection({ from, to });
      }
    };

    ws.onclose = () => console.log('🔴 Disconnected from WebSocket');
    return () => {
      ws.close();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [editor]);

    const [isAvailable, setIsAvailable] = useState(false);
    const [matchToast, setMatchToast] = useState<string | null>(null);

    const handleToggleAvailable = async () => {
      const nextState = !isAvailable;
      setIsAvailable(nextState);

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/agent/matchmaker/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: 'usr_aditi_99', course_id: 'CSE-301', is_available: nextState }),
        });
        const data = await res.json();
        if (data.match_found) {
          setMatchToast(data.message);
        } else {
          setMatchToast(null);
        }
      } catch (err) {
        console.error('Matchmaker toggle failed:', err);
      }
    };
    const [isSynthesizing, setIsSynthesizing] = useState(false);

    const handleSynthesize = async () => {
      if (!editor) return;
      setIsSynthesizing(true);
      const rawContent = editor.getHTML();

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/agent/synthesizer/compile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw_html_notes: rawContent }),
        });
        const data = await res.json();
        if (data.polished_html) {
          editor.commands.setContent(data.polished_html);
          console.log('✨ Notes synthesized and polished by Gemini Flash!');
        }
      } catch (err) {
        console.error('Synthesis failed:', err);
      } finally {
        setIsSynthesizing(false);
      }
    };

  return (
    <main className="min-h-screen bg-neutral-100 text-black font-mono p-6">
      {/* Top Header Bar */}
      <header className="border border-black bg-white p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="font-black text-lg tracking-tighter">EKO</span>
          <span className="text-neutral-300">|</span>
          <span className="text-xs bg-neutral-100 border border-neutral-300 px-2 py-1 flex items-center gap-1">
            <FileText className="w-3 h-3" /> CSE-301: Data Structures
          </span>
          <button
          onClick={handleToggleAvailable}
          className={`px-3 py-1 text-xs font-bold border ${isAvailable ? 'bg-black text-white border-black' : 'bg-white text-black border-neutral-300'}`}>
          {isAvailable ? '🟢 Available to Study' : '⚪ Go Available'}
        </button>
        </div>

        <div className="flex items-center space-x-6 text-xs">
          <div className="flex items-center gap-1 text-neutral-600">
            <Users className="w-3 h-3" />
            <span>Live Workspace</span>
          </div>

          <div className="flex items-center gap-1 font-bold">
            {isSaved ? (
              <span className="text-emerald-600 flex items-center gap-1">
                <Check className="w-3 h-3" /> Saved to Neon
              </span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1 animate-pulse">
                <Save className="w-3 h-3" /> Saving...
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Central Workspace Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Main TipTap Collaborative Canvas */}
        <div className="col-span-8 border border-black bg-white p-6 shadow-sm min-h-[550px]">
          <div className="border-b border-neutral-200 pb-2 mb-4 text-xs text-neutral-400 uppercase tracking-widest">
            Collaborative Notes Canvas
          </div>
          <EditorContent editor={editor} />
          <button
            onClick={handleSynthesize}
            disabled={isSynthesizing}
            className="bg-black text-white text-xs px-3 py-1 font-bold uppercase hover:bg-neutral-800 disabled:opacity-50"
          >
            {isSynthesizing ? '✨ Synthesizing...' : '✨ Compile Verified Study Guide'}
          </button>
        </div>

        {/* Right Sidebar Placeholder (Ready for Study Buddy Agent in Step 4) */}
        <div className="col-span-4 border border-black bg-white p-4 flex flex-col justify-between h-[550px]">
  <div className="border-b border-neutral-200 pb-2 text-xs text-neutral-400 uppercase tracking-widest font-bold">
    🤖 Eko Study Buddy Agent
  </div>

  {/* Messages Scroll View */}
  <div className="flex-1 overflow-y-auto my-3 space-y-3 text-xs pr-1">
    {messages.length === 0 && (
      <p className="text-neutral-400 italic">Ask me anything about your uploaded CSE-301 slides...</p>
    )}
    {messages.map((m, idx) => (
      <div key={idx} className={`p-2 border ${m.role === 'user' ? 'bg-neutral-100 border-neutral-300 text-right' : 'bg-black text-white border-black'}`}>
        <span className="font-bold block text-[10px] opacity-70 mb-1">{m.role === 'user' ? 'YOU' : 'EKO AGENT'}</span>
        <p className="whitespace-pre-wrap">{m.text}</p>
      </div>
    ))}
    {isAsking && <div className="text-xs text-neutral-400 animate-pulse">Eko Agent searching ChromaDB...</div>}
  </div>

  {/* Chat Input */}
  <div className="flex gap-2 border-t border-neutral-200 pt-3">
    <input
      type="text"
      value={inputQuery}
      onChange={(e) => setInputQuery(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && handleAskAgent()}
      placeholder="Ask a question..."
      className="flex-1 border border-neutral-300 px-2 py-1 text-xs focus:outline-none focus:border-black"
    />
    <button onClick={handleAskAgent} className="bg-black text-white px-3 py-1 text-xs font-bold uppercase hover:bg-neutral-800">
      Ask
    </button>
  </div>
</div>
{/* 🛎️ GLOBAL TOAST OVERLAY (Fixed Bottom-Right) */}
    {matchToast && (
      <div className="fixed bottom-6 right-6 max-w-sm bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 animate-bounce">
        <div className="flex justify-between items-start mb-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
            ⚡ Match Notification
          </span>
          <button 
            onClick={() => setMatchToast(null)} 
            className="text-xs font-bold hover:text-red-500 ml-2"
          >
            ✕
          </button>
        </div>
        <p className="text-xs font-bold text-black mb-3">{matchToast}</p>
        <button 
          onClick={() => {
            // Handle actual room redirect or join action
            alert("Joining shared study room!");
            setMatchToast(null);
          }} 
          className="w-full bg-black text-white text-xs py-2 uppercase font-black hover:bg-neutral-800 transition-colors"
        >
          Join Group Room
        </button>
      </div>
    )}
</div>
    </main>
  );
}