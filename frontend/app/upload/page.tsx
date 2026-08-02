'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, CheckCircle2, Loader2 } from 'lucide-react';

export default function UploadPortal() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string>(''); // Store backend filename
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success'>('idle');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'processing' && countdown > 0) {
      interval = setInterval(() => setCountdown(prev => prev - 1), 1000);
    } else if (status === 'processing' && countdown === 0) {
      setStatus('success');
    }
    return () => clearInterval(interval);
  }, [status, countdown]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleUploadSubmit = async () => {
    if (!file) return;
    setStatus('uploading');

    const formData = new FormData();
    formData.append('course_id', 'CSE-301');
    formData.append('file', file);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/course/ingest`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // Save the filename returned by FastAPI (e.g., data.filename or data.source)
        setUploadedFilename(data.filename || file.name);
        // Trigger simulated processing animation
        setStatus('processing');
      } else {
        alert('Upload sequence rejected by API backend.');
        setStatus('idle');
      }
    } catch (err) {
      console.error('Handshake execution drop:', err);
      setStatus('idle');
    }
  };

  const handleEnterWorkspace = () => {
    if (uploadedFilename) {
      // Redirect to /workspace passing the uploaded PDF filename as a query param
      router.push(`/workspace?pdf=${encodeURIComponent(uploadedFilename)}`);
    } else {
      router.push('/workspace');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-white text-black font-mono p-6">
      <div className="border border-black p-8 max-w-lg w-full text-center space-y-6">
        <h2 className="text-xl font-bold uppercase tracking-tight">Ingest Course Knowledge</h2>

        <div className="border-2 border-dashed border-neutral-300 p-8 flex flex-col items-center justify-center relative bg-neutral-50 hover:bg-neutral-100 transition-all">
          <input type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
          <UploadCloud className="w-10 h-10 text-neutral-400 mb-2" />
          <p className="text-xs text-neutral-600">
            {file ? `Selected: ${file.name}` : 'Drag and drop your syllabus or textbook PDF here'}
          </p>
        </div>

        <div className="text-left bg-neutral-100 p-3 text-xs text-neutral-600 flex justify-between">
          <span>Target Module Context:</span>
          <span className="font-bold">CSE-301 (Data Structures)</span>
        </div>

        {status === 'idle' && file && (
          <button onClick={handleUploadSubmit} className="w-full bg-black text-white font-bold py-3 text-xs uppercase tracking-wider">
            Process Knowledge Asset
          </button>
        )}

        {status === 'uploading' && (
          <div className="flex items-center justify-center space-x-2 text-xs text-neutral-600 py-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Sending raw document bits to vector layers...</span>
          </div>
        )}

        {status === 'processing' && (
          <div className="space-y-2 py-3">
            <div className="flex items-center justify-center space-x-2 text-xs text-neutral-800 font-bold">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
              <span>Structuring RAG Embeddings... {countdown}s</span>
            </div>
            <div className="w-full bg-neutral-200 h-1">
              <div className="bg-black h-1 transition-all duration-1000" style={{ width: `${((3 - countdown) / 3) * 100}%` }}></div>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-center space-x-2 text-xs text-green-600 font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>Successfully Embedded! ✅</span>
            </div>
            <button onClick={handleEnterWorkspace} className="w-full bg-black text-white font-bold py-3 text-xs uppercase tracking-wider">
              Enter Intelligent Canvas
            </button>
          </div>
        )}
      </div>
    </main>
  );
}