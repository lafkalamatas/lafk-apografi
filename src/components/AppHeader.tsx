'use client';

import { useState } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);

  function isTabActive(href: string) {
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  }

  async function handleLogout() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <header className="bg-white border-b border-[#e8e3d6]">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="app-heading text-lg font-medium text-[#2c2a24] shrink-0"
        >
          Απογραφή
        </Link>

        {/* Desktop / tablet: inline nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                isTabActive(tab.href) ? 'bg-gold-50 text-gold-600 font-medium' : 'text-[#5a5750] hover:bg-[#f0ece0]'
              }`}
            >
              {tab.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg text-sm whitespace-nowrap text-[#8a8578] hover:bg-[#f0ece0] transition-colors"
          >
            Έξοδος
          </button>
        </nav>

        {/* Mobile: hamburger toggle */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Μενού"
          aria-expanded={menuOpen}
          className="sm:hidden -mr-1 p-2 rounded-lg text-[#5a5750] hover:bg-[#f0ece0] transition-colors"
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile: dropdown panel */}
      {menuOpen && (
        <nav className="sm:hidden border-t border-[#e8e3d6] px-3 py-2 flex flex-col gap-1">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => setMenuOpen(false)}
              className={`px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isTabActive(tab.href) ? 'bg-gold-50 text-gold-600 font-medium' : 'text-[#5a5750] hover:bg-[#f0ece0]'
              }`}
            >
              {tab.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-2.5 rounded-lg text-sm text-left text-[#8a8578] hover:bg-[#f0ece0] transition-colors"
          >
            Έξοδος
          </button>
        </nav>
      )}
    </header>
  );
}
