import { useState, useEffect, useRef, useCallback } from 'react';
import { useDashboard, NewsGenre } from '@/lib/dashboardContext';
import { RefreshCw, Newspaper } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  image: string;
  publishedAt?: string;
}

function getVisualPlaceholder() {
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 210">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#2dd4bf" stop-opacity="0.95"/>
          <stop offset="48%" stop-color="#6366f1" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#ec4899" stop-opacity="0.95"/>
        </linearGradient>
        <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="18"/>
        </filter>
      </defs>
      <rect width="320" height="210" rx="22" fill="#111827"/>
      <circle cx="70" cy="55" r="70" fill="#22d3ee" opacity="0.45" filter="url(#blur)"/>
      <circle cx="250" cy="150" r="90" fill="#a855f7" opacity="0.45" filter="url(#blur)"/>
      <rect x="34" y="42" width="252" height="126" rx="20" fill="url(#g)" opacity="0.32" stroke="rgba(255,255,255,0.32)"/>
      <path d="M92 78h102M92 102h136M92 126h92" stroke="white" stroke-width="10" stroke-linecap="round" opacity="0.82"/>
      <path d="M230 76h28v54h-28z" fill="white" opacity="0.78"/>
    </svg>
  `)}`;
}

const FALLBACK_NEWS: NewsItem[] = [
  {
    id: '1',
    title: 'Latest local headlines will appear here when the news feed is reachable',
    source: 'Mady News',
    url: 'https://news.google.com',
    image: getVisualPlaceholder(),
  },
  {
    id: '2',
    title: 'Use Sync Now to refresh weather and news manually',
    source: 'Mady News',
    url: 'https://news.google.com',
    image: getVisualPlaceholder(),
  },
];

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  return doc.body.textContent?.trim() || '';
}

function extractSource(title: string, fallback = 'Google News'): string {
  const match = title?.match(/ - ([^-]+)$/);
  return match ? match[1].trim() : fallback;
}

function cleanTitle(title: string): string {
  return (title || 'Untitled').replace(/ - [^-]+$/, '').trim();
}

function extractImageFromHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const img = doc.querySelector('img');
  return img?.getAttribute('src') || '';
}

function normalizeImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://')) return url.replace('http://', 'https://');
  return url;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function getFaviconFallback(url: string): string {
  const host = getHostname(url);
  if (!host) return getVisualPlaceholder();
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
}

async function fetchPreviewImage(url: string): Promise<string> {
  try {
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&meta=false&screenshot=false`);
    if (!res.ok) return '';
    const data = await res.json();
    const image = data?.data?.image?.url || data?.data?.logo?.url || '';
    return normalizeImageUrl(image);
  } catch {
    return '';
  }
}

const GENRE_QUERY: Record<NewsGenre, string> = {
  trending: 'latest news',
  sports: 'sports news',
  politics: 'politics India news',
  technology: 'technology news',
  finance: 'business finance news India',
  world: 'world news',
  science: 'science news',
  wellbeing: 'health wellbeing news',
};

function buildGoogleNewsRss(query: string) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
}

function extractRss2JsonImage(item: any): string {
  const image =
    item.thumbnail ||
    item.enclosure?.link ||
    item.enclosure?.url ||
    item.enclosure?.thumbnail ||
    extractImageFromHtml(item.content || '') ||
    extractImageFromHtml(item.description || '') ||
    '';
  return normalizeImageUrl(image);
}

async function fetchFromRss2Json(rssUrl: string): Promise<NewsItem[]> {
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
  const res = await fetch(apiUrl);
  if (!res.ok) return [];
  const data = await res.json();
  if (data.status !== 'ok' || !Array.isArray(data.items)) return [];

  return data.items.map((item: any, i: number) => {
    const source = item.author || extractSource(item.title, data.feed?.title || 'Google News');
    return {
      id: `${rssUrl}-${i}`,
      title: cleanTitle(stripHtml(item.title || 'Untitled')),
      source: stripHtml(source).replace(/ - .*$/, '').trim() || 'Google News',
      url: item.link || 'https://news.google.com',
      image: extractRss2JsonImage(item),
      publishedAt: item.pubDate,
    };
  });
}

async function fetchFromXmlProxy(rssUrl: string): Promise<NewsItem[]> {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) return [];
  const text = await res.text();
  const xml = new DOMParser().parseFromString(text, 'application/xml');

  return Array.from(xml.querySelectorAll('item')).map((item, i) => {
    const title = item.querySelector('title')?.textContent || 'Untitled';
    const description = item.querySelector('description')?.textContent || '';
    const enclosure = item.querySelector('enclosure[url]')?.getAttribute('url') || '';
    const mediaThumbnail = item.querySelector('thumbnail')?.getAttribute('url') || '';
    const mediaContent = item.querySelector('content[url]')?.getAttribute('url') || '';
    const image = normalizeImageUrl(enclosure || mediaThumbnail || mediaContent || extractImageFromHtml(description));

    return {
      id: `${rssUrl}-xml-${i}`,
      title: cleanTitle(title),
      source: item.querySelector('source')?.textContent || extractSource(title),
      url: item.querySelector('link')?.textContent || 'https://news.google.com',
      image,
      publishedAt: item.querySelector('pubDate')?.textContent || undefined,
    };
  });
}

async function fetchGoogleNews(rssUrl: string): Promise<NewsItem[]> {
  try {
    const items = await fetchFromRss2Json(rssUrl);
    if (items.length) return items;
  } catch {}

  try {
    return await fetchFromXmlProxy(rssUrl);
  } catch {
    return [];
  }
}

async function enrichImages(items: NewsItem[]): Promise<NewsItem[]> {
  const firstBatch = items.slice(0, 12);
  const rest = items.slice(12);

  const enriched = await Promise.all(
    firstBatch.map(async item => {
      if (item.image) return item;
      const previewImage = await fetchPreviewImage(item.url);
      return {
        ...item,
        image: previewImage || getFaviconFallback(item.url) || getVisualPlaceholder(),
      };
    })
  );

  return [
    ...enriched,
    ...rest.map(item => ({
      ...item,
      image: item.image || getFaviconFallback(item.url) || getVisualPlaceholder(),
    })),
  ];
}

async function fetchNews(city: string, state: string, genres: NewsGenre[]): Promise<NewsItem[]> {
  const active = genres.length ? genres : ['trending' as NewsGenre];
  const queries = active.slice(0, 4).map(g =>
    g === 'trending' ? `${city} ${state} ${GENRE_QUERY[g]}` : `${GENRE_QUERY[g]} India`
  );
  const results = await Promise.allSettled(queries.map(q => fetchGoogleNews(buildGoogleNewsRss(q))));
  const all: NewsItem[] = [];

  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }

  if (!all.length) return FALLBACK_NEWS;

  const seen = new Set<string>();
  const unique = all.filter(item => {
    const key = item.title.toLowerCase().replace(/\s+/g, ' ').slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(item.title && item.url);
  });

  unique.sort((a, b) =>
    (b.publishedAt ? Date.parse(b.publishedAt) : 0) - (a.publishedAt ? Date.parse(a.publishedAt) : 0)
  );

  return enrichImages(unique.slice(0, 15));
}

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function NewsSection() {
  const { settings } = useDashboard();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [agoText, setAgoText] = useState('');
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const city = settings.selectedCity || 'Chennai';
    const state = settings.selectedState || 'Tamil Nadu';
    const genres = settings.newsGenres || ['trending'];
    const items = await fetchNews(city, state, genres);

    if (mountedRef.current) {
      setNews(items);
      setLastUpdated(new Date());
      setLoading(false);
    }
  }, [settings.selectedCity, settings.selectedState, settings.newsGenres]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, Math.max(settings.syncInterval || 30, 5) * 60000);
    const sync = () => refresh();
    window.addEventListener('mady:sync-now', sync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('mady:sync-now', sync);
    };
  }, [refresh, settings.syncInterval]);

  useEffect(() => {
    if (!lastUpdated) return;
    setAgoText(timeAgo(lastUpdated));
    const t = setInterval(() => setAgoText(timeAgo(lastUpdated)), 30000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  if (!settings.showNews) return null;

  return (
    <section className="px-5 py-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium glass-text-subtle uppercase tracking-wider flex items-center gap-2">
          <Newspaper className="w-4 h-4" />
          {settings.newsGenres?.length === 1
            ? settings.newsGenres[0].charAt(0).toUpperCase() + settings.newsGenres[0].slice(1)
            : 'News'}
        </h2>
        <div className="flex items-center gap-2">
          {agoText && <span className="glass-text-subtle text-[10px]">{agoText}</span>}
          <button onClick={refresh} disabled={loading} className="tap-scale glass-panel px-2 py-1">
            <RefreshCw className={`w-3.5 h-3.5 glass-text-subtle ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && news.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-panel flex items-center gap-3 p-3 animate-pulse">
              <div className="w-20 h-14 rounded-lg bg-white/10 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
                <div className="h-2 bg-white/10 rounded w-1/4 mt-1" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {news.map(article => (
            <a
              key={article.id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-panel flex items-center gap-3 p-3 tap-scale block"
            >
              <img
                src={article.image || getVisualPlaceholder()}
                alt=""
                className="w-20 h-14 object-cover shrink-0 bg-white/5"
                loading="lazy"
                style={{ borderRadius: `calc(var(--glass-radius) * 0.4)` }}
                onError={e => {
                  const target = e.target as HTMLImageElement;
                  if (!target.dataset.fallback) {
                    target.dataset.fallback = '1';
                    target.src = getVisualPlaceholder();
                  }
                }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="glass-text text-sm font-medium leading-snug line-clamp-2">{article.title}</h3>
                <p className="glass-text-subtle text-[11px] mt-1.5">{article.source}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
