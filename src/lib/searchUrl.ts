import type { PanelTab } from '../components/Header.tsx';

export type SearchUrlPresetId = 'bobysmmpanal' | 'clean_path' | 'tab_query' | 'wp_query' | 'custom';

export interface SearchUrlFormat {
  id: SearchUrlPresetId;
  label: string;
  basePath: string;
  queryParam: string;
  includeTabParam: boolean;
}

export const SEARCH_URL_PRESETS: SearchUrlFormat[] = [
  {
    id: 'bobysmmpanal',
    label: 'Boby SMM Panel (/bobysmmpanal?q=...)',
    basePath: '/bobysmmpanal',
    queryParam: 'q',
    includeTabParam: false
  },
  {
    id: 'clean_path',
    label: 'Clean Path (/search?q=...)',
    basePath: '/search',
    queryParam: 'q',
    includeTabParam: false
  },
  {
    id: 'tab_query',
    label: 'Query Format (/?tab=services&q=...)',
    basePath: '/',
    queryParam: 'q',
    includeTabParam: true
  },
  {
    id: 'wp_query',
    label: 'Services Query (/services?s=...)',
    basePath: '/services',
    queryParam: 's',
    includeTabParam: false
  }
];

const STORAGE_KEY = 'boby_search_url_format_v2';

export function normalizeBasePath(raw: string): string {
  const cleaned = String(raw || '/search').trim().replace(/\s+/g, '-');
  if (!cleaned || cleaned === '/') return '/';
  const withLeading = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
  return withLeading.length > 1 && withLeading.endsWith('/')
    ? withLeading.slice(0, -1)
    : withLeading;
}

export function normalizeQueryParam(raw: string): string {
  const cleaned = String(raw || 'q').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned || 'q';
}

export function getSavedSearchUrlFormat(): SearchUrlFormat {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.basePath === 'string' && typeof parsed.queryParam === 'string') {
        return {
          id: parsed.id || 'custom',
          label: parsed.label || 'Custom Search Format',
          basePath: normalizeBasePath(parsed.basePath),
          queryParam: normalizeQueryParam(parsed.queryParam),
          includeTabParam: Boolean(parsed.includeTabParam)
        };
      }
    }
  } catch {
    // ignore storage parse failure
  }
  return SEARCH_URL_PRESETS[0];
}

export function saveSearchUrlFormat(format: SearchUrlFormat): SearchUrlFormat {
  const normalized: SearchUrlFormat = {
    ...format,
    basePath: normalizeBasePath(format.basePath),
    queryParam: normalizeQueryParam(format.queryParam)
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // ignore storage errors
  }
  return normalized;
}

export interface ParsedUrlState {
  tab: PanelTab;
  query: string;
  platform: string;
  category: string;
  status: string;
  sortBy: 'id' | 'rate' | 'min' | 'name';
  sortOrder: 'asc' | 'desc';
  page: number;
}

export function parseUrlState(): ParsedUrlState {
  const format = getSavedSearchUrlFormat();
  const pathname = normalizeBasePath(window.location.pathname || '/');
  const params = new URLSearchParams(window.location.search || '');

  const query =
    params.get(format.queryParam) ??
    params.get('q') ??
    params.get('s') ??
    params.get('keyword') ??
    params.get('search') ??
    '';

  const platform = params.get('platform') || 'All';
  const category = params.get('category') || 'All';
  const status = params.get('status') || 'All';

  const rawSort = params.get('sort') || '';
  const [rawSortBy, rawSortOrder] = rawSort.split(':');
  const sortBy: 'id' | 'rate' | 'min' | 'name' =
    rawSortBy === 'rate' || rawSortBy === 'min' || rawSortBy === 'name' ? rawSortBy : 'id';
  const sortOrder: 'asc' | 'desc' = rawSortOrder === 'desc' ? 'desc' : 'asc';

  const parsedPage = parseInt(params.get('page') || '1', 10);
  const page = !Number.isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  // Determine active tab from query param or pathname
  const tabParam = params.get('tab');
  let tab: PanelTab = 'new-order';

  if (
    tabParam === 'new-order' ||
    tabParam === 'services' ||
    tabParam === 'orders' ||
    tabParam === 'wallet' ||
    tabParam === 'referrals' ||
    tabParam === 'api' ||
    tabParam === 'faq'
  ) {
    tab = tabParam;
  } else if (
    pathname === '/bobysmmpanal' ||
    pathname === '/bobysmmpanel' ||
    pathname === '/search' ||
    pathname === '/services' ||
    pathname === '/find' ||
    pathname === '/catalog' ||
    (format.basePath !== '/' && pathname === format.basePath)
  ) {
    tab = 'services';
  } else if (pathname === '/orders') {
    tab = 'orders';
  } else if (pathname === '/wallet' || pathname === '/add-funds') {
    tab = 'wallet';
  } else if (pathname === '/referrals' || pathname === '/referral') {
    tab = 'referrals';
  } else if (pathname === '/api-docs' || pathname === '/api') {
    tab = 'api';
  } else if (pathname === '/faq') {
    tab = 'faq';
  } else if (
    pathname === '/' &&
    (query.trim() !== '' || platform !== 'All' || category !== 'All' || params.has('page'))
  ) {
    tab = 'services';
  }

  return {
    tab,
    query,
    platform,
    category,
    status,
    sortBy,
    sortOrder,
    page
  };
}

function getPreservedRefParam(): string | null {
  try {
    const params = new URLSearchParams(window.location.search || '');
    return params.get('ref');
  } catch {
    return null;
  }
}

export function buildServicesSearchUrl(options: {
  query: string;
  platform: string;
  category: string;
  sortBy: 'id' | 'rate' | 'min' | 'name';
  sortOrder: 'asc' | 'desc';
  page: number;
  format?: SearchUrlFormat;
}): string {
  const format = options.format || getSavedSearchUrlFormat();
  const params = new URLSearchParams();
  const ref = getPreservedRefParam();
  if (ref) params.set('ref', ref);

  const hasSearchOrFilter =
    options.query.trim().length > 0 ||
    options.platform !== 'All' ||
    options.category !== 'All' ||
    options.sortBy !== 'id' ||
    options.sortOrder !== 'asc' ||
    options.page > 1;

  if (format.includeTabParam) {
    params.set('tab', 'services');
  }

  if (options.query.trim()) {
    params.set(format.queryParam, options.query.trim());
  }
  if (options.platform !== 'All') {
    params.set('platform', options.platform);
  }
  if (options.category !== 'All') {
    params.set('category', options.category);
  }
  if (options.sortBy !== 'id' || options.sortOrder !== 'asc') {
    params.set('sort', `${options.sortBy}:${options.sortOrder}`);
  }
  if (options.page > 1) {
    params.set('page', String(options.page));
  }

  const targetPath = hasSearchOrFilter
    ? format.basePath
    : format.basePath === '/'
      ? '/'
      : format.basePath === '/bobysmmpanal'
        ? '/bobysmmpanal'
        : '/services';

  const qs = params.toString();
  return qs ? `${targetPath}?${qs}` : targetPath;
}

export function buildOrdersUrl(options: {
  query: string;
  status: string;
  page: number;
}): string {
  const format = getSavedSearchUrlFormat();
  const params = new URLSearchParams();
  const ref = getPreservedRefParam();
  if (ref) params.set('ref', ref);

  if (options.query.trim()) {
    params.set(format.queryParam, options.query.trim());
  }
  if (options.status !== 'All') {
    params.set('status', options.status);
  }
  if (options.page > 1) {
    params.set('page', String(options.page));
  }

  const qs = params.toString();
  return qs ? `/orders?${qs}` : '/orders';
}

export function buildFaqUrl(options: {
  query: string;
  category: string;
}): string {
  const format = getSavedSearchUrlFormat();
  const params = new URLSearchParams();
  const ref = getPreservedRefParam();
  if (ref) params.set('ref', ref);

  if (options.query.trim()) {
    params.set(format.queryParam, options.query.trim());
  }
  if (options.category !== 'All') {
    params.set('category', options.category);
  }

  const qs = params.toString();
  return qs ? `/faq?${qs}` : '/faq';
}

export function getTabBaseUrl(tab: PanelTab): string {
  const params = new URLSearchParams();
  const ref = getPreservedRefParam();
  if (ref) params.set('ref', ref);

  let path = '/';
  switch (tab) {
    case 'services': {
      const activeFormat = getSavedSearchUrlFormat();
      path = activeFormat.basePath === '/bobysmmpanal' ? '/bobysmmpanal' : '/services';
      break;
    }
    case 'orders':
      path = '/orders';
      break;
    case 'wallet':
      path = '/wallet';
      break;
    case 'referrals':
      path = '/referrals';
      break;
    case 'api':
      path = '/api-docs';
      break;
    case 'faq':
      path = '/faq';
      break;
    default:
      path = '/';
      break;
  }

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function updateBrowserUrl(url: string, push = false): void {
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === url) return;
  if (push) {
    window.history.pushState(null, '', url);
  } else {
    window.history.replaceState(null, '', url);
  }
}
