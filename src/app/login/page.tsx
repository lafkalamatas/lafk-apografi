'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('Λάθος email ή κωδικός πρόσβασης');
      setLoading(false);
      return;
    }

    router.push('/');
  };

  return (
    <div className="app-page min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="app-heading text-2xl font-medium text-[#2c2a24] mb-1">Απογραφή</h1>
          <p className="text-xs text-[#8b7d3c]">Λέσχη Αξιωματικών Καλαμάτας</p>
        </div>

        <div className="app-card p-6 shadow-sm">
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-xs text-[#8a8578] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-[#e8e3d6] rounded-lg
                           text-[#2c2a24] text-sm placeholder-[#8a8578]
                           focus:outline-none focus:border-[#c4a94d] transition-colors"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-xs text-[#8a8578] mb-1.5">Κωδικός</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-[#e8e3d6] rounded-lg
                           text-[#2c2a24] text-sm placeholder-[#8a8578]
                           focus:outline-none focus:border-[#c4a94d] transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="text-red-500 text-xs mb-4 text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold-400 text-military-700 py-2.5 rounded-lg font-medium text-sm
                         hover:bg-gold-300 transition-colors disabled:opacity-50"
            >
              {loading ? 'Σύνδεση...' : 'Είσοδος'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
