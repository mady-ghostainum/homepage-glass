import { useState, useRef, useCallback, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useDashboard } from '@/lib/dashboardContext';

const FIXED_SUGGESTIONS = ['React documentation', 'Tailwind CSS', 'TypeScript handbook', 'JavaScript MDN', 'CSS Grid guide', 'Node.js tutorial', 'Next.js docs', 'Vite guide', 'GitHub trending'];

export default function SearchBar() {
  const { setSearchFocused, searchHistory, addSearchHistory } = useDashboard();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const combined = [...searchHistory, ...FIXED_SUGGESTIONS];
    const seen = new Set<string>();
    return combined.filter(item => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [searchHistory]);

  const filtered = query.length > 0 ? suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase())).slice(0, 5) : searchHistory.slice(0, 5);

  const handleFocus = useCallback(() => { setFocused(true); setSearchFocused(true); }, [setSearchFocused]);
  const handleBlur = useCallback(() => { setTimeout(() => { setFocused(false); setSearchFocused(false); }, 150); }, [setSearchFocused]);

  const handleSearch = (term: string) => {
    const clean = term.trim();
    if (clean) {
      addSearchHistory(clean);
      window.open(`https://www.google.com/search?q=${encodeURIComponent(clean)}`, '_blank');
      setQuery('');
    }
  };

  return (
    <div className="px-5 py-3 relative z-30">
      <div className="glass-panel flex items-center gap-3 px-4 py-3 transition-shadow duration-300" style={{ boxShadow: focused ? '0 8px 32px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Search className="w-5 h-5 glass-text-subtle shrink-0" />
        <input ref={inputRef} type="text" placeholder="Search the web..." value={query} onChange={e => setQuery(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} onKeyDown={e => e.key === 'Enter' && handleSearch(query)} className="bg-transparent outline-none w-full glass-text placeholder:text-white/40 text-sm" />
      </div>
      {focused && filtered.length > 0 && (
        <div className="glass-panel mt-1 mx-0 overflow-hidden absolute left-5 right-5 z-40">
          {filtered.map((s, i) => (
            <button key={`${s}-${i}`} onMouseDown={() => handleSearch(s)} className="w-full text-left px-4 py-2.5 glass-text text-sm hover:bg-white/10 transition-colors flex items-center gap-2">
              <Search className="w-3.5 h-3.5 glass-text-subtle" />{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
