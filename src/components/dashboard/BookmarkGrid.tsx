import { useState, useRef, useCallback } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, PenLine } from 'lucide-react';
import { useDashboard, Bookmark } from '@/lib/dashboardContext';

function getFavicon(url: string) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`; } catch { return ''; }
}
function isEmoji(value?: string) { return Boolean(value && !value.startsWith('http') && !value.startsWith('data:') && value.length <= 4); }
function fallbackSvg(title: string) {
  const letter = encodeURIComponent((title || 'B')[0].toUpperCase());
  return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect fill="%23667" width="40" height="40" rx="8"/><text x="20" y="26" text-anchor="middle" fill="white" font-size="18">${letter}</text></svg>`;
}

export default function BookmarkGrid() {
  const { bookmarks, setBookmarks, addBookmark, updateBookmark, removeBookmark, settings } = useDashboard();
  const [editMode, setEditMode] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Bookmark | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  const resetForm = () => { setNewTitle(''); setNewUrl(''); setNewIcon(''); };
  const handleDragStart = (idx: number) => { dragItem.current = idx; };
  const handleDragEnter = (idx: number) => { dragOver.current = idx; };
  const handleDragEnd = useCallback(() => {
    if (dragItem.current === null || dragOver.current === null) return;
    const items = [...bookmarks];
    const [removed] = items.splice(dragItem.current, 1);
    items.splice(dragOver.current, 0, removed);
    setBookmarks(items);
    dragItem.current = null; dragOver.current = null;
  }, [bookmarks, setBookmarks]);
  const moveBookmark = useCallback((idx: number, direction: -1 | 1) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= bookmarks.length) return;
    const items = [...bookmarks];
    [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
    setBookmarks(items);
  }, [bookmarks, setBookmarks]);
  const openEdit = (bookmark: Bookmark) => { setEditing(bookmark); setNewTitle(bookmark.title); setNewUrl(bookmark.url); setNewIcon(bookmark.favicon || ''); setShowAdd(true); };
  const handleSave = () => {
    if (newTitle && newUrl) {
      const url = newUrl.startsWith('http') ? newUrl : `https://${newUrl}`;
      const favicon = newIcon.trim() || getFavicon(url);
      if (editing) updateBookmark(editing.id, { title: newTitle, url, favicon }); else addBookmark(newTitle, url, favicon);
      resetForm(); setEditing(null); setShowAdd(false);
    }
  };
  const closeDialog = () => { resetForm(); setEditing(null); setShowAdd(false); };
  const renderIcon = (bookmark: Bookmark) => {
    const src = bookmark.favicon || getFavicon(bookmark.url);
    if (isEmoji(src)) return <span className="glass-text leading-none" style={{ fontSize: `calc(var(--glass-icon-size) * 0.75)` }}>{src}</span>;
    return <img src={src} alt={bookmark.title} className="rounded-lg" style={{ width: `var(--glass-icon-size)`, height: `var(--glass-icon-size)` }} onError={(e) => { const target = e.target as HTMLImageElement; if (!target.dataset.fallback) { target.dataset.fallback = '1'; target.src = fallbackSvg(bookmark.title); } }} />;
  };

  return (
    <section className="px-5 py-2" style={{ gap: `var(--glass-spacing)` }}>
      <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-medium glass-text-subtle uppercase tracking-wider">Speed Dial</h2><button onClick={() => setEditMode(!editMode)} className="text-xs glass-text-subtle px-2 py-1 glass-panel tap-scale">{editMode ? 'Done' : 'Edit'}</button></div>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8" style={{ gap: `var(--glass-spacing)` }}>
        {bookmarks.map((b, i) => (
          <div key={b.id} draggable={editMode} onDragStart={() => handleDragStart(i)} onDragEnter={() => handleDragEnter(i)} onDragEnd={handleDragEnd} onDragOver={e => e.preventDefault()} className={`relative group flex flex-col items-center ${editMode ? 'animate-wiggle' : ''}`} style={{ gap: '6px' }}>
            <a href={editMode ? undefined : b.url} target="_blank" rel="noopener noreferrer" onClick={e => editMode && e.preventDefault()} className="glass-panel aspect-square w-full flex items-center justify-center tap-scale block">{renderIcon(b)}</a>
            {settings.showBookmarkNames && <span className="glass-text text-[10px] truncate w-full text-center leading-tight">{b.title}</span>}
            {editMode && <><button onClick={() => removeBookmark(b.id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center z-10"><X className="w-3 h-3 text-white" /></button><button onClick={() => openEdit(b)} className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-white/25 backdrop-blur rounded-full flex items-center justify-center z-10"><PenLine className="w-3 h-3 text-white" /></button><div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 z-10"><button onClick={() => moveBookmark(i, -1)} disabled={i === 0} className="w-5 h-5 rounded-full bg-white/20 backdrop-blur flex items-center justify-center disabled:opacity-30 tap-scale"><ChevronLeft className="w-3 h-3 text-white" /></button><button onClick={() => moveBookmark(i, 1)} disabled={i === bookmarks.length - 1} className="w-5 h-5 rounded-full bg-white/20 backdrop-blur flex items-center justify-center disabled:opacity-30 tap-scale"><ChevronRight className="w-3 h-3 text-white" /></button></div></>}
          </div>
        ))}
        <button onClick={() => setShowAdd(true)} className="glass-panel aspect-square w-full flex flex-col items-center justify-center gap-2 tap-scale"><Plus className="glass-text-subtle" style={{ width: `calc(var(--glass-icon-size) * 0.6)`, height: `calc(var(--glass-icon-size) * 0.6)` }} />{settings.showBookmarkNames && <span className="glass-text-subtle text-[10px]">Add</span>}</button>
      </div>
      {showAdd && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-5" onClick={closeDialog}><div className="glass-panel p-5 w-full max-w-sm space-y-3" onClick={e => e.stopPropagation()}><h3 className="glass-text font-medium">{editing ? 'Edit Bookmark' : 'Add Bookmark'}</h3><input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title" className="w-full bg-white/10 rounded-lg px-3 py-2 glass-text text-sm outline-none placeholder:text-white/30" /><input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="URL (e.g. google.com)" className="w-full bg-white/10 rounded-lg px-3 py-2 glass-text text-sm outline-none placeholder:text-white/30" /><input value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="Optional icon: emoji or image URL" className="w-full bg-white/10 rounded-lg px-3 py-2 glass-text text-sm outline-none placeholder:text-white/30" onKeyDown={e => e.key === 'Enter' && handleSave()} /><p className="glass-text-subtle text-[10px]">Leave icon empty to auto-fetch the website favicon.</p><div className="flex gap-2 pt-1"><button onClick={closeDialog} className="flex-1 glass-panel py-2 glass-text text-sm tap-scale">Cancel</button><button onClick={handleSave} className="flex-1 bg-white/20 rounded-xl py-2 glass-text text-sm tap-scale font-medium" style={{ borderRadius: 'var(--glass-radius)' }}>{editing ? 'Save' : 'Add'}</button></div></div></div>}
    </section>
  );
}
