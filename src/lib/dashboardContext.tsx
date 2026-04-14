import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { idbDelete, idbGet, idbSet } from './storage';
import { assetPath, normalizeAssetPath } from './assets';

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
}

export type GlassStyle = 'acrylic' | 'liquid-glass' | 'clear' | 'translucent';
export type NewsGenre = 'trending' | 'sports' | 'politics' | 'technology' | 'finance' | 'world' | 'science' | 'wellbeing';

export const NEWS_GENRES: { id: NewsGenre; label: string }[] = [
  { id: 'trending', label: 'Trending' },
  { id: 'sports', label: 'Sports' },
  { id: 'politics', label: 'Politics' },
  { id: 'technology', label: 'Technology' },
  { id: 'finance', label: 'Finance' },
  { id: 'world', label: 'World News' },
  { id: 'science', label: 'Science' },
  { id: 'wellbeing', label: 'Wellbeing' },
];

export interface DashboardSettings {
  blurStrength: number;
  glassOpacity: number;
  borderThickness: number;
  borderOpacity: number;
  cornerRadius: number;
  iconSize: number;
  layoutSpacing: number;
  showNews: boolean;
  showWeather: boolean;
  wallpaper: string;
  customWallpaper: string | null;
  selectedState: string;
  selectedCity: string;
  syncInterval: number;
  showBookmarkNames: boolean;
  userName: string;
  glassStyle: GlassStyle;
  newsGenres: NewsGenre[];
}

const DEFAULT_SETTINGS: DashboardSettings = {
  blurStrength: 20,
  glassOpacity: 0.15,
  borderThickness: 1,
  borderOpacity: 0.2,
  cornerRadius: 20,
  iconSize: 40,
  layoutSpacing: 16,
  showNews: true,
  showWeather: true,
  wallpaper: assetPath('images/wallpaper-nordic.jpg'),
  customWallpaper: null,
  selectedState: 'Tamil Nadu',
  selectedCity: 'Chennai',
  syncInterval: 30,
  showBookmarkNames: true,
  userName: '',
  glassStyle: 'acrylic',
  newsGenres: ['trending'],
};

const GLASS_PRESETS: Record<GlassStyle, Partial<DashboardSettings>> = {
  acrylic: { blurStrength: 20, glassOpacity: 0.15, borderThickness: 1, borderOpacity: 0.2, cornerRadius: 20 },
  'liquid-glass': { blurStrength: 40, glassOpacity: 0.08, borderThickness: 1.5, borderOpacity: 0.35, cornerRadius: 28 },
  clear: { blurStrength: 8, glassOpacity: 0.05, borderThickness: 0.5, borderOpacity: 0.1, cornerRadius: 16 },
  translucent: { blurStrength: 30, glassOpacity: 0.25, borderThickness: 1, borderOpacity: 0.15, cornerRadius: 22 },
};

function faviconFor(url: string) {
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    const domain = new URL(normalized).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch { return ''; }
}

const DEFAULT_BOOKMARKS: Bookmark[] = [
  { id: '1', title: 'Google', url: 'https://google.com', favicon: faviconFor('https://google.com') },
  { id: '2', title: 'YouTube', url: 'https://youtube.com', favicon: faviconFor('https://youtube.com') },
  { id: '3', title: 'GitHub', url: 'https://github.com', favicon: faviconFor('https://github.com') },
  { id: '4', title: 'Twitter', url: 'https://x.com', favicon: faviconFor('https://x.com') },
  { id: '5', title: 'Reddit', url: 'https://reddit.com', favicon: faviconFor('https://reddit.com') },
  { id: '6', title: 'Wikipedia', url: 'https://wikipedia.org', favicon: faviconFor('https://wikipedia.org') },
  { id: '7', title: 'Stack Overflow', url: 'https://stackoverflow.com', favicon: faviconFor('https://stackoverflow.com') },
  { id: '8', title: 'Netflix', url: 'https://netflix.com', favicon: faviconFor('https://netflix.com') },
];

interface DashboardBackup {
  version: 1;
  app: 'Mady';
  exportedAt: string;
  settings: DashboardSettings;
  bookmarks: Bookmark[];
  searchHistory: string[];
}

interface DashboardContextType {
  settings: DashboardSettings;
  updateSettings: (partial: Partial<DashboardSettings>) => void;
  applyGlassStyle: (style: GlassStyle) => void;
  bookmarks: Bookmark[];
  setBookmarks: (b: Bookmark[]) => void;
  addBookmark: (title: string, url: string, favicon?: string) => void;
  updateBookmark: (id: string, data: Partial<Omit<Bookmark, 'id'>>) => void;
  removeBookmark: (id: string) => void;
  searchHistory: string[];
  addSearchHistory: (term: string) => void;
  clearSearchHistory: () => void;
  exportConfig: () => DashboardBackup;
  importConfig: (data: unknown) => Promise<void>;
  searchFocused: boolean;
  setSearchFocused: (v: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);
export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}

function cleanSettings(value?: Partial<DashboardSettings>): DashboardSettings {
  const next: DashboardSettings = { ...DEFAULT_SETTINGS, ...(value || {}) };
  next.wallpaper = normalizeAssetPath(next.wallpaper);
  next.customWallpaper = next.customWallpaper || null;
  if (!Array.isArray(next.newsGenres) || next.newsGenres.length === 0) next.newsGenres = ['trending'];
  next.syncInterval = Math.max(Number(next.syncInterval || 30), 5);
  return next;
}

function normalizeBookmark(bookmark: Bookmark): Bookmark {
  const url = bookmark.url?.startsWith('http') ? bookmark.url : `https://${bookmark.url || ''}`;
  return {
    ...bookmark,
    id: bookmark.id || Date.now().toString(),
    title: bookmark.title || 'Bookmark',
    url,
    favicon: bookmark.favicon || faviconFor(url),
  };
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS);
  const [bookmarks, setBookmarksState] = useState<Bookmark[]>(DEFAULT_BOOKMARKS);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [savedSettings, savedBookmarks, savedHistory, customWallpaper] = await Promise.all([
          idbGet<Partial<DashboardSettings>>('settings'),
          idbGet<Bookmark[]>('bookmarks'),
          idbGet<string[]>('searchHistory'),
          idbGet<string>('customWallpaper'),
        ]);
        const nextSettings = cleanSettings(savedSettings);
        if (customWallpaper) {
          nextSettings.customWallpaper = customWallpaper;
          if (!savedSettings?.wallpaper || savedSettings.wallpaper === 'custom' || savedSettings.wallpaper?.startsWith('data:')) {
            nextSettings.wallpaper = customWallpaper;
          }
        }
        setSettings(nextSettings);
        if (Array.isArray(savedBookmarks) && savedBookmarks.length > 0) setBookmarksState(savedBookmarks.map(normalizeBookmark));
        if (Array.isArray(savedHistory)) setSearchHistory(savedHistory.filter(Boolean).slice(0, 20));
      } catch (error) { console.warn('Failed to load saved dashboard data:', error); }
      loaded.current = true;
    })();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--glass-blur', `${settings.blurStrength}px`);
    root.style.setProperty('--glass-opacity', `${settings.glassOpacity}`);
    root.style.setProperty('--glass-border', `${settings.borderThickness}px`);
    root.style.setProperty('--glass-border-opacity', `${settings.borderOpacity}`);
    root.style.setProperty('--glass-radius', `${settings.cornerRadius}px`);
    root.style.setProperty('--glass-icon-size', `${settings.iconSize}px`);
    root.style.setProperty('--glass-spacing', `${settings.layoutSpacing}px`);
    root.style.setProperty('--glass-surface', `rgba(255,255,255,${settings.glassOpacity})`);
    root.style.setProperty('--glass-border-color', `rgba(255,255,255,${settings.borderOpacity})`);
  }, [settings]);

  const persistSettings = useCallback(async (next: DashboardSettings) => {
    try {
      await idbSet('settings', next);
      if (next.customWallpaper) await idbSet('customWallpaper', next.customWallpaper);
      else await idbDelete('customWallpaper');
    } catch (error) { console.warn('Failed to save settings:', error); }
  }, []);

  const updateSettings = useCallback((partial: Partial<DashboardSettings>) => {
    setSettings(prev => {
      const next = cleanSettings({ ...prev, ...partial });
      if (loaded.current) void persistSettings(next);
      return next;
    });
  }, [persistSettings]);

  const applyGlassStyle = useCallback((style: GlassStyle) => updateSettings({ ...GLASS_PRESETS[style], glassStyle: style }), [updateSettings]);
  const setBookmarks = useCallback((b: Bookmark[]) => {
    const next = b.map(normalizeBookmark);
    setBookmarksState(next);
    if (loaded.current) void idbSet('bookmarks', next);
  }, []);
  const addBookmark = useCallback((title: string, url: string, favicon?: string) => {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const newBookmark = normalizeBookmark({ id: Date.now().toString(), title, url: normalizedUrl, favicon: favicon?.trim() || faviconFor(normalizedUrl) });
    setBookmarksState(prev => {
      const next = [...prev, newBookmark];
      if (loaded.current) void idbSet('bookmarks', next);
      return next;
    });
  }, []);
  const updateBookmark = useCallback((id: string, data: Partial<Omit<Bookmark, 'id'>>) => {
    setBookmarksState(prev => {
      const next = prev.map(b => b.id === id ? normalizeBookmark({ ...b, ...data }) : b);
      if (loaded.current) void idbSet('bookmarks', next);
      return next;
    });
  }, []);
  const removeBookmark = useCallback((id: string) => {
    setBookmarksState(prev => {
      const next = prev.filter(b => b.id !== id);
      if (loaded.current) void idbSet('bookmarks', next);
      return next;
    });
  }, []);
  const addSearchHistory = useCallback((term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setSearchHistory(prev => {
      const next = [clean, ...prev.filter(item => item.toLowerCase() !== clean.toLowerCase())].slice(0, 20);
      if (loaded.current) void idbSet('searchHistory', next);
      return next;
    });
  }, []);
  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    if (loaded.current) void idbSet('searchHistory', []);
  }, []);
  const exportConfig = useCallback((): DashboardBackup => ({ version: 1, app: 'Mady', exportedAt: new Date().toISOString(), settings, bookmarks, searchHistory }), [settings, bookmarks, searchHistory]);
  const importConfig = useCallback(async (data: unknown) => {
    if (!data || typeof data !== 'object') throw new Error('Invalid config file');
    const backup = data as Partial<DashboardBackup>;
    const nextSettings = cleanSettings(backup.settings || {});
    const nextBookmarks = Array.isArray(backup.bookmarks) && backup.bookmarks.length > 0 ? backup.bookmarks.map(normalizeBookmark) : DEFAULT_BOOKMARKS;
    const nextHistory = Array.isArray(backup.searchHistory) ? backup.searchHistory.filter(Boolean).slice(0, 20) : [];
    setSettings(nextSettings);
    setBookmarksState(nextBookmarks);
    setSearchHistory(nextHistory);
    await Promise.all([
      idbSet('settings', nextSettings),
      idbSet('bookmarks', nextBookmarks),
      idbSet('searchHistory', nextHistory),
      nextSettings.customWallpaper ? idbSet('customWallpaper', nextSettings.customWallpaper) : idbDelete('customWallpaper'),
    ]);
  }, []);

  return (
    <DashboardContext.Provider value={{
      settings, updateSettings, applyGlassStyle, bookmarks, setBookmarks, addBookmark, updateBookmark, removeBookmark,
      searchHistory, addSearchHistory, clearSearchHistory, exportConfig, importConfig,
      searchFocused, setSearchFocused, settingsOpen, setSettingsOpen,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}
