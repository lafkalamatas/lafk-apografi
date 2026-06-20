'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const tabs = [
  { href: '/', label: 'Πίνακας' },
  { href: '/products', label: 'Προϊόντα' },
  { href: '/movements', label: 'Ιστορικό' },
];

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <header className="bg-white border-b border-[#e8e3d6]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="app-heading text-lg font-medium text-[#2c2a24]">
          Απογραφή
        </Link>
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-gold-50 text-gold-600 font-medium' : 'text-[#5a5750] hover:bg-[#f0ece0]'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg text-sm text-[#8a8578] hover:bg-[#f0ece0] transition-colors"
          >
            Έξοδος
          </button>
        </nav>
      </div>
    </header>
  );
}
