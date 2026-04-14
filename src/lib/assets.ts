export function assetPath(path: string): string {
  const clean = path.replace(/^\/+/, '');
  return `${import.meta.env.BASE_URL}${clean}`;
}

export function normalizeAssetPath(path: string | null | undefined): string {
  if (!path) return assetPath('images/wallpaper-nordic.jpg');
  if (path.startsWith('data:') || path.startsWith('blob:') || /^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/images/')) return assetPath(path.slice(1));
  if (path.startsWith('images/')) return assetPath(path);
  return path;
}
