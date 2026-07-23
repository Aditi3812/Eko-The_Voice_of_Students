'use client';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  const handleStartStudying = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'usr_aditi_99',
          name: 'Aditi Priya',
          email: 'aditi@rru.ac.in',
        }),
      });

      const data = await response.json();
      if (data.status === 'authenticated') {
        console.log('✅ Connected to Neon via FastAPI! Session valid.');
        // Route seamlessly past entry barrier straight into your learning dock
        router.push('/upload');
      }
    } catch (error) {
      console.error('❌ Connection handshake failed:', error);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white text-black p-6 font-mono selection:bg-neutral-200">
      <div className="border border-black p-12 max-w-xl w-full text-center space-y-8">
        <h1 className="text-4xl font-black tracking-tighter">EKO</h1>
        <p className="text-xs text-neutral-500 uppercase tracking-widest">One Platform. Student Echoes.</p>
        <hr className="border-neutral-200" />
        <button 
          onClick={handleStartStudying}
          className="w-full bg-black text-white hover:bg-neutral-900 font-bold py-3 px-6 transition-all duration-150 uppercase text-sm tracking-wider"
        >
          Start Studying
        </button>
      </div>
    </main>
  );
}