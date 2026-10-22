import {
  MovieItem,
  MovieDetail,
  MoviePagination,
  MovieListResponse,
  MovieDetailResponse,
  FilterOption,
  FilterListResponse,
  EpisodeServer,
  ActorItem,
  GenreQueryParams
} from '../types/movie';

const DIRECT_BASE_URL = 'https://vsmov.com/api';
const PROXY_BASE_URL = '/api/movie';

async function safeFetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// Normalize items array from various response formats
function extractItems(json: any): MovieItem[] {
  if (Array.isArray(json?.items)) return json.items;
  if (Array.isArray(json?.data?.items)) return json.data.items;
  if (Array.isArray(json?.data)) return json.data;
  return [];
}

// Normalize pagination
function extractPagination(json: any, fallbackCurrentPage: number = 1): MoviePagination {
  const p = json?.pagination || json?.data?.pagination || {};
  const current = Number(p.currentPage ?? p.current_page ?? fallbackCurrentPage ?? 1);
  const perPage = Number(p.totalItemsPerPage ?? p.per_page ?? 24);
  const totalItems = Number(p.totalItems ?? p.total_items ?? 0);
  const totalPages = Number(p.totalPages ?? p.total_pages ?? Math.max(1, Math.ceil(totalItems / perPage)));

  return {
    currentPage: current,
    totalItemsPerPage: perPage,
    totalItems: totalItems,
    totalPages: totalPages,
  };
}

export async function getLatestMovies(page: number = 1): Promise<{ items: MovieItem[]; pagination: MoviePagination }> {
  try {
    const json = await safeFetchJson<MovieListResponse>(`${PROXY_BASE_URL}/phim-moi-cap-nhat?page=${page}`);
    return {
      items: extractItems(json),
      pagination: extractPagination(json, page),
    };
  } catch (proxyErr) {
    // Direct fallback
    const json = await safeFetchJson<MovieListResponse>(`${DIRECT_BASE_URL}/danh-sach/phim-moi-cap-nhat?page=${page}`);
    return {
      items: extractItems(json),
      pagination: extractPagination(json, page),
    };
  }
}

export interface ListQueryParams {
  page?: number;
  limit?: number;
  year?: string | number;
  country?: string;
  category?: string;
  type?: string;
  status?: string;
}

export async function getMoviesByList(
  slug: string,
  params: ListQueryParams = {}
): Promise<{ items: MovieItem[]; pagination: MoviePagination }> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.year) query.set('year', String(params.year));
  if (params.country) query.set('country', String(params.country));
  if (params.category) query.set('category', String(params.category));
  if (params.type) query.set('type', String(params.type));
  if (params.status) query.set('status', String(params.status));

  const qs = query.toString() ? `?${query.toString()}` : '';

  try {
    const json = await safeFetchJson<MovieListResponse>(`${PROXY_BASE_URL}/danh-sach/${encodeURIComponent(slug)}${qs}`);
    return {
      items: extractItems(json),
      pagination: extractPagination(json, params.page || 1),
    };
  } catch (proxyErr) {
    const json = await safeFetchJson<MovieListResponse>(`${DIRECT_BASE_URL}/danh-sach/${encodeURIComponent(slug)}${qs}`);
    return {
      items: extractItems(json),
      pagination: extractPagination(json, params.page || 1),
    };
  }
}

/**
 * Lấy danh sách phim theo thể loại (slug) và bộ lọc:
 * /api/the-loai/[slug]?limit=20&page=1&year=2024&country=han-quoc&type=series&status=completed
 */
export async function getMoviesByGenre(
  slug: string,
  params: GenreQueryParams = {}
): Promise<{ items: MovieItem[]; pagination: MoviePagination }> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.year) query.set('year', String(params.year));
  if (params.country) query.set('country', String(params.country));
  if (params.type) query.set('type', String(params.type));
  if (params.status) query.set('status', String(params.status));

  const qs = query.toString() ? `?${query.toString()}` : '';

  try {
    const json = await safeFetchJson<MovieListResponse>(`${PROXY_BASE_URL}/the-loai/${encodeURIComponent(slug)}${qs}`);
    return {
      items: extractItems(json),
      pagination: extractPagination(json, params.page || 1),
    };
  } catch (proxyErr) {
    const json = await safeFetchJson<MovieListResponse>(`${DIRECT_BASE_URL}/the-loai/${encodeURIComponent(slug)}${qs}`);
    return {
      items: extractItems(json),
      pagination: extractPagination(json, params.page || 1),
    };
  }
}

/**
 * Lấy danh sách tất cả diễn viên:
 * /api/dien-vien
 */
export async function getActors(): Promise<ActorItem[]> {
  try {
    const json = await safeFetchJson<any>(`${PROXY_BASE_URL}/dien-vien`);
    if (Array.isArray(json?.data?.items)) return json.data.items;
    if (Array.isArray(json?.items)) return json.items;
    return [];
  } catch {
    const json = await safeFetchJson<any>(`${DIRECT_BASE_URL}/dien-vien`);
    if (Array.isArray(json?.data?.items)) return json.data.items;
    if (Array.isArray(json?.items)) return json.items;
    return [];
  }
}

export async function searchMovies(
  keyword: string,
  page: number = 1,
  limit: number = 20
): Promise<{ items: MovieItem[]; pagination: MoviePagination }> {
  const query = new URLSearchParams({
    keyword: keyword.trim(),
    page: String(page),
    limit: String(limit),
  });

  try {
    const json = await safeFetchJson<MovieListResponse>(`${PROXY_BASE_URL}/tim-kiem?${query.toString()}`);
    return {
      items: extractItems(json),
      pagination: extractPagination(json, page),
    };
  } catch (proxyErr) {
    const json = await safeFetchJson<MovieListResponse>(`${DIRECT_BASE_URL}/tim-kiem?${query.toString()}`);
    return {
      items: extractItems(json),
      pagination: extractPagination(json, page),
    };
  }
}

export async function getCategories(): Promise<FilterOption[]> {
  try {
    const json = await safeFetchJson<FilterListResponse>(`${PROXY_BASE_URL}/the-loai`);
    return extractFilterList(json);
  } catch {
    const json = await safeFetchJson<FilterListResponse>(`${DIRECT_BASE_URL}/the-loai`);
    return extractFilterList(json);
  }
}

export async function getCountries(): Promise<FilterOption[]> {
  try {
    const json = await safeFetchJson<FilterListResponse>(`${PROXY_BASE_URL}/quoc-gia`);
    return extractFilterList(json);
  } catch {
    const json = await safeFetchJson<FilterListResponse>(`${DIRECT_BASE_URL}/quoc-gia`);
    return extractFilterList(json);
  }
}

export async function getYears(): Promise<FilterOption[]> {
  try {
    const json = await safeFetchJson<FilterListResponse>(`${PROXY_BASE_URL}/nam`);
    return extractFilterList(json);
  } catch {
    const json = await safeFetchJson<FilterListResponse>(`${DIRECT_BASE_URL}/nam`);
    return extractFilterList(json);
  }
}

function extractFilterList(json: any): FilterOption[] {
  if (Array.isArray(json?.items)) return json.items;
  if (Array.isArray(json?.data?.items)) return json.data.items;
  if (Array.isArray(json?.data)) return json.data;
  return [];
}

export async function getMovieDetail(slug: string): Promise<{ movie: MovieDetail; episodes: EpisodeServer[] }> {
  try {
    const json = await safeFetchJson<MovieDetailResponse>(`${PROXY_BASE_URL}/detail/${encodeURIComponent(slug)}`);
    return parseMovieDetail(json);
  } catch (proxyErr) {
    const json = await safeFetchJson<MovieDetailResponse>(`${DIRECT_BASE_URL}/phim/${encodeURIComponent(slug)}`);
    return parseMovieDetail(json);
  }
}

function parseMovieDetail(json: any): { movie: MovieDetail; episodes: EpisodeServer[] } {
  const movie: MovieDetail = json.movie || json.item || json.data?.item || json.data?.movie || {};
  const episodes: EpisodeServer[] = Array.isArray(json.episodes)
    ? json.episodes
    : Array.isArray(json.data?.episodes)
    ? json.data.episodes
    : Array.isArray(movie.episodes as any)
    ? (movie.episodes as any)
    : [];

  return { movie, episodes };
}
