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
          <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.95"/>
          <stop offset="52%" stop-color="#6366f1" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#ec4899" stop-opacity="0.95"/>
        </linearGradient>
        <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="18"/>
        </filter>
      </defs>
      <rect width="320" height="210" rx="22" fill="#0f172a"/>
      <circle cx="70" cy="60" r="72" fill="#22d3ee" opacity="0.38" filter="url(#blur)"/>
      <circle cx="255" cy="150" r="92" fill="#a855f7" opacity="0.42" filter="url(#blur)"/>
      <rect x="32" y="38" width="256" height="134" rx="22" fill="url(#g)" opacity="0.30" stroke="rgba(255,255,255,0.34)"/>
      <circle cx="80" cy="78" r="21" fill="white" opacity="0.76"/>
      <path d="M44 154l62-58 42 40 34-29 94 47" fill="none" stroke="white" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity="0.78"/>
      <path d="M194 70h58M194 96h44M194 122h62" stroke="white" stroke-width="9" stroke-linecap="round" opacity="0.68"/>
    </svg>
  `)}`;
}

const FALLBACK_NEWS: NewsItem[] = [
  {
    id: 'fallback-1',
    title: 'Latest headlines will appear here when the RSS feeds are reachable',
    source: 'Mady News',
    url: 'https://news.google.com',
    image: getVisualPlaceholder(),
  },
  {
    id: 'fallback-2',
    title: 'Use Sync Now to refresh weather and news manually',
    source: 'Mady News',
    url: 'https://news.google.com',
    image: getVisualPlaceholder(),
  },
];

function stripHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent?.trim() || '';
}

function decodeText(text: string): string {
  return stripHtml(text || '')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function extractSource(title: string, fallback = 'News'): string {
  const match = title?.match(/ - ([^-]+)$/);
  return match ? match[1].trim() : fallback;
}

function cleanTitle(title: string): string {
  return decodeText(title || 'Untitled').replace(/ - [^-]+$/, '').trim() || 'Untitled';
}

function extractImageFromHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const img = doc.querySelector('img');
  return img?.getAttribute('src') || img?.getAttribute('data-src') || '';
}

function normalizeImageUrl(url: string): string {
  if (!url) return '';
  const cleaned = decodeText(url).replace(/^url\(["']?/, '').replace(/["']?\)$/, '').trim();
  if (!cleaned || cleaned.startsWith('data:')) return cleaned;
  if (cleaned.startsWith('//')) return `https:${cleaned}`;
  if (cleaned.startsWith('http://')) return cleaned.replace('http://', 'https://');
  return cleaned;
}

function isUsefulImage(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.includes('favicon')) return false;
  if (lower.includes('google.com/s2/favicons')) return false;
  if (lower.includes('news.google.com')) return false;
  if (lower.endsWith('.ico')) return false;
  return true;
}

function imageOrPlaceholder(url: string): string {
  const normalized = normalizeImageUrl(url);
  return isUsefulImage(normalized) ? normalized : getVisualPlaceholder();
}

const GENRE_FEEDS: Record<NewsGenre, string[]> = {
  trending: [
    'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
    'https://www.thehindu.com/news/national/feeder/default.rss',
  ],
  sports: [
    'https://timesofindia.indiatimes.com/rssfeeds/4719148.cms',
    'https://www.thehindu.com/sport/feeder/default.rss',
  ],
  politics: [
    'https://timesofindia.indiatimes.com/rssfeeds/1221656.cms',
    'https://www.thehindu.com/news/national/feeder/default.rss',
  ],
  technology: [
    'https://timesofindia.indiatimes.com/rssfeeds/66949542.cms',
    'https://www.thehindu.com/sci-tech/technology/feeder/default.rss',
  ],
  finance: [
    'https://timesofindia.indiatimes.com/rssfeeds/1898055.cms',
    'https://www.thehindu.com/business/feeder/default.rss',
  ],
  world: [
    'https://timesofindia.indiatimes.com/rssfeeds/296589.cms',
    'https://www.thehindu.com/news/international/feeder/default.rss',
  ],
  science: [
    'https://timesofindia.indiatimes.com/rssfeeds/391.cms',
    'https://www.thehindu.com/sci-tech/science/feeder/default.rss',
  ],
  wellbeing: [
    'https://timesofindia.indiatimes.com/rssfeeds/3908999.cms',
    'https://www.thehindu.com/sci-tech/health/feeder/default.rss',
  ],
};

const REGIONAL_FEEDS: Record<string, string[]> = {
  'Tamil Nadu': ['https://www.thehindu.com/news/national/tamil-nadu/feeder/default.rss'],
  Karnataka: ['https://www.thehindu.com/news/national/karnataka/feeder/default.rss'],
  Kerala: ['https://www.thehindu.com/news/national/kerala/feeder/default.rss'],
  Maharashtra: ['https://www.thehindu.com/news/national/other-states/feeder/default.rss'],
  Delhi: ['https://www.thehindu.com/news/cities/Delhi/feeder/default.rss'],
};

function buildGoogleNewsRss(query: string) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
}

function extractRss2JsonImage(item: any): string {
  const candidates = [
    item.thumbnail,
    item.enclosure?.link,
    item.enclosure?.url,
    item.enclosure?.thumbnail,
    item.enclosure?.['@attributes']?.url,
    item['media:thumbnail']?.url,
    item['media:content']?.url,
    extractImageFromHtml(item.content || ''),
    extractImageFromHtml(item.description || ''),
  ];

  return candidates.map(normalizeImageUrl).find(isUsefulImage) || '';
}

function mapRss2JsonItem(item: any, rssUrl: string, index: number, feedTitle = 'News'): NewsItem {
  const rawTitle = decodeText(item.title || 'Untitled');
  const source = decodeText(item.author || extractSource(rawTitle, feedTitle)).replace(/ - .*$/, '').trim() || feedTitle;

  return {
    id: `${rssUrl}-${index}-${item.guid || item.link || rawTitle}`,
    title: cleanTitle(rawTitle),
    source,
    url: item.link || item.guid || 'https://news.google.com',
    image: extractRss2JsonImage(item),
    publishedAt: item.pubDate,
  };
}

async function fetchFromRss2Json(rssUrl: string): Promise<NewsItem[]> {
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
  const res = await fetch(apiUrl);
  if (!res.ok) return [];
  const data = await res.json();
  if (data.status !== 'ok' || !Array.isArray(data.items)) return [];

  const feedTitle = decodeText(data.feed?.title || 'News');
  return data.items.map((item: any, i: number) => mapRss2JsonItem(item, rssUrl, i, feedTitle));
}

function extractXmlImage(item: Element): string {
  const candidates = [
    item.querySelector('enclosure[url]')?.getAttribute('url') || '',
    item.querySelector('media\\:thumbnail[url]')?.getAttribute('url') || '',
    item.querySelector('media\\:content[url]')?.getAttribute('url') || '',
    item.querySelector('content[url]')?.getAttribute('url') || '',
    extractImageFromHtml(item.querySelector('description')?.textContent || ''),
    extractImageFromHtml(item.querySelector('content\\:encoded')?.textContent || ''),
  ];

  return candidates.map(normalizeImageUrl).find(isUsefulImage) || '';
}

async function fetchFromXmlProxy(rssUrl: string): Promise<NewsItem[]> {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) return [];
  const text = await res.text();
  const xml = new DOMParser().parseFromString(text, 'application/xml');

  return Array.from(xml.querySelectorAll('item')).map((item, i) => {
    const rawTitle = item.querySelector('title')?.textContent || 'Untitled';
    const source = item.querySelector('source')?.textContent || extractSource(rawTitle, 'News');

    return {
      id: `${rssUrl}-xml-${i}-${rawTitle}`,
      title: cleanTitle(rawTitle),
      source: decodeText(source),
      url: item.querySelector('link')?.textContent || 'https://news.google.com',
      image: extractXmlImage(item),
      publishedAt: item.querySelector('pubDate')?.textContent || item.querySelector('published')?.textContent || undefined,
    };
  });
}

async function fetchFeed(rssUrl: string): Promise<NewsItem[]> {
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

function buildFeedList(city: string, state: string, genres: NewsGenre[]): string[] {
  const activeGenres = genres.length ? genres : ['trending' as NewsGenre];
  const feedUrls = new Set<string>();

  for (const genre of activeGenres) {
    for (const feed of GENRE_FEEDS[genre] || GENRE_FEEDS.trending) feedUrls.add(feed);
  }

  if (activeGenres.includes('trending')) {
    for (const feed of REGIONAL_FEEDS[state] || []) feedUrls.add(feed);
    feedUrls.add(buildGoogleNewsRss(`${city} ${state} news`));
  }

  return Array.from(feedUrls).slice(0, 8);
}

async function fetchNews(city: string, state: string, genres: NewsGenre[]): Promise<NewsItem[]> {
  const feedUrls = buildFeedList(city, state, genres);
  const results = await Promise.allSettled(feedUrls.map(feed => fetchFeed(feed)));
  const all: NewsItem[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') all.push(...result.value);
  }

  if (!all.length) return FALLBACK_NEWS;

  const seen = new Set<string>();
  const unique = all.filter(item => {
    const key = cleanTitle(item.title).toLowerCase().replace(/\s+/g, ' ').slice(0, 90);
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(item.title && item.url);
  });

  unique.sort((a, b) => {
    const imageScore = Number(Boolean(b.image)) - Number(Boolean(a.image));
    if (imageScore !== 0) return imageScore;
    return (b.publishedAt ? Date.parse(b.publishedAt) : 0) - (a.publishedAt ? Date.parse(a.publishedAt) : 0);
  });

  return unique.slice(0, 15).map(item => ({
    ...item,
    image: imageOrPlaceholder(item.image),
  }));
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
                referrerPolicy="no-referrer"
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
