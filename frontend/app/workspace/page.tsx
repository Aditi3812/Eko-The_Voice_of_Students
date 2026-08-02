'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { 
  Save, 
  Users, 
  FileText, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  Sparkles,
  Download,
  Wand2,
  Loader2
} from 'lucide-react';

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const docIdParam = searchParams.get('doc_id') || searchParams.get('pdf');
  const unitIdParam = searchParams.get('unit_id') || 'default_unit';

  const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // --- Document Selection State ---
  const [availableDocs, setAvailableDocs] = useState<{ id: string; title: string }[]>([]);

  // Dynamic PostgreSQL Stream URL for embedded PDF preview
  const initialPdfUrl = docIdParam
    ? `${backendBaseUrl}/api/v1/classrooms/documents/${docIdParam}/download`
    : '/sample.pdf';

  // --- Workspace & Sync States ---
  const [isSaved, setIsSaved] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string>(initialPdfUrl);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const isRemoteUpdate = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Floating Assistant States ---
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'agent'; text: string }[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const roomId = `unit_note_${unitIdParam}`;

  // Keep pdfUrl synced with docIdParam
  useEffect(() => {
    if (docIdParam) {
      setPdfUrl(`${backendBaseUrl}/api/v1/classrooms/documents/${docIdParam}/download`);
    }
  }, [docIdParam, backendBaseUrl]);

  // --- Notify Backend to Auto-Ingest Selected Document into ChromaDB ---
  const triggerDocumentIngestion = useCallback(async (selectedDocId: string) => {
    if (!selectedDocId || !unitIdParam) return;

    try {
      const token = localStorage.getItem('eko_auth_token');
      await fetch(`${backendBaseUrl}/api/v1/course/ensure-ingested`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          unit_id: unitIdParam,
          doc_id: selectedDocId,
        }),
      });
    } catch (err) {
      console.error('Failed to auto-ingest document on selection:', err);
    }
  }, [backendBaseUrl, unitIdParam]);

  // Trigger vector ingestion on initial load or whenever docIdParam updates
  useEffect(() => {
    if (docIdParam) {
      triggerDocumentIngestion(docIdParam);
    }
  }, [docIdParam, triggerDocumentIngestion]);

  // --- Fetch Unit Documents & Auto-Select First Document ---
  useEffect(() => {
    if (!unitIdParam) return;

    const token = localStorage.getItem('eko_auth_token');
    fetch(`${backendBaseUrl}/api/v1/classrooms/units/${unitIdParam}/documents`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableDocs(data);

          // If no doc_id parameter is present in URL, auto-select the first document
          const firstDocId = data[0]?.id || data[0]?.document_id;
          if (!docIdParam && firstDocId) {
            router.replace(`/workspace?doc_id=${firstDocId}&unit_id=${unitIdParam}`);
          }
        }
      })
      .catch((err) => console.error('Error fetching unit docs:', err));
  }, [unitIdParam, backendBaseUrl, docIdParam, router]);

  // --- Handle Document Change from Dropdown ---
  const handleDocumentChange = (newDocId: string) => {
    if (newDocId) {
      router.push(`/workspace?doc_id=${newDocId}&unit_id=${unitIdParam}`);
    }
  };

  // --- Auto-Save Notes to Database ---
  const saveToDatabase = useCallback(async (content: string) => {
    try {
      const token = localStorage.getItem('eko_auth_token');
      await fetch(`${backendBaseUrl}/api/v1/notes/save`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          note_id: roomId,
          unit_id: unitIdParam,
          content: content,
        }),
      });
      setIsSaved(true);
    } catch (err) {
      console.error('Save failed:', err);
    }
  }, [backendBaseUrl, roomId, unitIdParam]);

  // --- TipTap Editor Setup ---
  const editor = useEditor({
    extensions: [StarterKit],
    content: '<h1>Unit Notes</h1><p>Type your study notes here while reviewing the document on the left...</p>',
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[500px] text-sm font-mono p-4',
      },
    },
    onUpdate: ({ editor }) => {
      if (isRemoteUpdate.current) {
        isRemoteUpdate.current = false;
        return;
      }

      setIsSaved(false);
      const htmlContent = editor.getHTML();

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(htmlContent);
      }

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveToDatabase(htmlContent);
      }, 2000);
    },
  });

  // --- WebSocket & Initial Notes Fetch ---
  useEffect(() => {
    const token = localStorage.getItem('eko_auth_token');
    fetch(`${backendBaseUrl}/api/v1/notes/${roomId}`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.content && editor) {
          isRemoteUpdate.current = true;
          editor.commands.setContent(data.content);
        }
      })
      .catch((err) => console.error('Error fetching initial note:', err));

    const wsUrl = backendBaseUrl.replace('http', 'ws');
    const ws = new WebSocket(`${wsUrl}/api/v1/notes/ws/${roomId}`);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      if (editor) {
        isRemoteUpdate.current = true;
        const { from, to } = editor.state.selection;
        editor.commands.setContent(event.data, { emitUpdate: false });
        editor.commands.setTextSelection({ from, to });
      }
    };

    return () => {
      ws.close();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [editor, backendBaseUrl, roomId]);

  // --- Synthesizer Agent Trigger ---
  const handleSynthesizeNotes = async () => {
    if (!editor) return;
    setIsSynthesizing(true);
    const rawContent = editor.getHTML();

    try {
      const res = await fetch(`${backendBaseUrl}/api/v1/agent/synthesizer/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_html_notes: rawContent,
        }),
      });

      const data = await res.json();
      if (data.polished_html) {
        isRemoteUpdate.current = false;
        editor.commands.setContent(data.polished_html);
        saveToDatabase(data.polished_html);
      }
    } catch (err) {
      console.error('Synthesizer failed:', err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // --- Export Notes to PDF ---
  const handleExportPDF = async () => {
    if (!editor) return;
    const element = document.querySelector('.ProseMirror');
    if (!element) return;

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin:       10,
        filename:     `Eko_Notes_${unitIdParam}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().set(opt as any).from(element as HTMLElement).save();
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };

  // --- Ask Study Buddy Handler (Chroma Vector RAG) ---
  const handleAskAgent = async () => {
    if (!inputQuery.trim()) return;
    const userText = inputQuery;
    setInputQuery('');
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setIsAsking(true);

    try {
      const token = localStorage.getItem('eko_auth_token');
      const res = await fetch(`${backendBaseUrl}/api/v1/agent/study-buddy/query`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ 
          unit_id: unitIdParam, 
          doc_id: docIdParam || null,
          question: userText
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'agent', text: data.answer }]);
    } catch (err) {
      console.error('Agent chat failed:', err);
      setMessages((prev) => [...prev, { role: 'agent', text: 'Failed to retrieve information from Study Buddy.' }]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <main className="h-screen bg-neutral-100 text-black font-mono flex flex-col overflow-hidden p-4">
      {/* Top Header Bar */}
      <header className="border border-black bg-white p-3 mb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-4">
          <span className="font-black text-lg tracking-tighter">EKO</span>
          <span className="text-neutral-300">|</span>
          <span className="text-xs bg-neutral-100 border border-neutral-300 px-2 py-1 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Unit Reference Material
          </span>
        </div>

        <div className="flex items-center space-x-6 text-xs">
          <div className="flex items-center gap-1 text-neutral-600">
            <Users className="w-3 h-3" />
            <span>Dual-Pane Workspace</span>
          </div>

          <div className="flex items-center gap-1 font-bold">
            {isSaved ? (
              <span className="text-emerald-600 flex items-center gap-1">
                <Check className="w-3 h-3" /> Saved to Database
              </span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1 animate-pulse">
                <Save className="w-3 h-3" /> Saving...
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Dual-Pane Viewport */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0 overflow-hidden">
        
        {/* LEFT PANE: PostgreSQL Stream PDF Viewer */}
        <div className="col-span-6 border border-black bg-white flex flex-col overflow-hidden">
          <div className="border-b border-neutral-200 p-2 bg-neutral-50 flex justify-between items-center text-xs text-neutral-500 uppercase tracking-widest font-bold">
            <div className="flex items-center gap-2">
              <span>📄 Reference:</span>
              
              {/* Document Selector Dropdown */}
              <select
                value={docIdParam || ''}
                onChange={(e) => handleDocumentChange(e.target.value)}
                className="bg-white border border-neutral-300 text-black px-2 py-0.5 text-xs font-mono focus:outline-none cursor-pointer max-w-[220px] truncate"
              >
                {!docIdParam && (
                  <option value="" disabled>
                    -- Select a Document --
                  </option>
                )}
                {availableDocs.map((doc, idx) => {
                  const docId = doc.id || (doc as any).document_id;
                  const docName = doc.title || (doc as any).file_name || `Document ${idx + 1}`;
                  return (
                    <option key={docId || `doc-${idx}`} value={docId}>
                      {docName}
                    </option>
                  );
                })}
              </select>
            </div>

            <span className="text-[10px] text-neutral-400">PDF Viewer Active</span>
          </div>

          <div className="flex-1 bg-neutral-200 relative overflow-hidden">
            {docIdParam ? (
              <iframe
                key={docIdParam}
                src={pdfUrl}
                className="w-full h-full border-none"
                title="Unit Document Viewer"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-neutral-500 font-mono">
                No document selected. Choose one from the dropdown above.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: TipTap Notes Editor */}
        <div className="col-span-6 border border-black bg-white flex flex-col overflow-hidden">
          <div className="border-b border-neutral-200 p-2 bg-neutral-50 flex justify-between items-center text-xs font-bold">
            <span className="text-neutral-500 uppercase tracking-widest">📝 Workspace Notes</span>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleSynthesizeNotes}
                disabled={isSynthesizing}
                className="bg-purple-600 text-white hover:bg-purple-700 px-2 py-1 rounded text-[11px] flex items-center gap-1 transition-all disabled:opacity-50"
              >
                {isSynthesizing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3 h-3" />
                    <span>Synthesize Notes</span>
                  </>
                )}
              </button>

              <button
                onClick={handleExportPDF}
                className="bg-black text-white hover:bg-neutral-800 px-2 py-1 rounded text-[11px] flex items-center gap-1 transition-all"
              >
                <Download className="w-3 h-3" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* FLOATING COLLAPSIBLE ASSISTANT PANEL */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isAssistantOpen && (
          <div className="w-96 h-96 border-2 border-black bg-white shadow-2xl flex flex-col mb-2 font-mono">
            <div className="bg-black text-white p-3 flex justify-between items-center text-xs font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Eko Study Buddy
              </span>
              <button onClick={() => setIsAssistantOpen(false)} className="hover:opacity-70">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
              {messages.length === 0 && (
                <p className="text-neutral-400 italic text-center mt-8">
                  Ask me questions about your uploaded PDF or notes!
                </p>
              )}
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-2 border ${
                    m.role === 'user'
                      ? 'bg-neutral-100 border-neutral-300 text-right ml-6'
                      : 'bg-black text-white border-black mr-6'
                  }`}
                >
                  <span className="font-bold block text-[9px] opacity-70 mb-0.5">
                    {m.role === 'user' ? 'YOU' : 'STUDY BUDDY'}
                  </span>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              ))}
              {isAsking && (
                <div className="text-[11px] text-neutral-500 animate-pulse flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-500" /> Searching ChromaDB vectors...
                </div>
              )}
            </div>

            <div className="border-t border-neutral-200 p-2 bg-neutral-50 flex gap-2">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAgent()}
                placeholder="Ask a question..."
                className="flex-1 border border-neutral-300 px-2 py-1 text-xs focus:outline-none focus:border-black bg-white"
              />
              <button
                onClick={handleAskAgent}
                className="bg-black text-white px-3 py-1 text-xs font-bold hover:bg-neutral-800"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsAssistantOpen(!isAssistantOpen)}
          className="bg-black text-white hover:bg-neutral-900 border border-black p-3 shadow-lg flex items-center gap-2 font-bold text-xs uppercase tracking-wider transition-all"
        >
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Ask Study Buddy</span>
          {isAssistantOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
    </main>
  );
}

export default function Workspace() {
  return (
    <Suspense fallback={<div className="p-4 font-mono text-xs">Loading workspace...</div>}>
      <WorkspaceContent />
    </Suspense>
  );
}