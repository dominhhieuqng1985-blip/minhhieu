export interface MovieTmdb {
  type?: string;
  id?: string | number;
  season?: number | null;
  vote_average?: string | number;
  vote_count?: number;
}

export interface MovieCategory {
  id?: number | string;
  _id?: number | string;
  name: string;
  slug: string;
}

export interface MovieCountry {
  id?: number | string;
  _id?: number | string;
  name: string;
  slug: string;
}

export interface MovieItem {
  _id?: number | string;
  id?: number | string;
  name: string;
  origin_name?: string;
  slug: string;
  thumb_url?: string;
  poster_url?: string;
  year?: number | string;
  type?: 'single' | 'series' | 'hoathinh' | 'tvshows' | string;
  quality?: string;
  lang?: string;
  episode_current?: string;
  episode_total?: string;
  time?: string | null;
  status?: string;
  view?: number;
  tmdb?: MovieTmdb;
  imdb?: { id?: string };
  modified?: { time?: string };
}

export interface ActorItem {
  _id?: number | string;
  name: string;
  slug: string;
  thumb_url?: string | null;
}

export interface GenreQueryParams {
  limit?: number;
  page?: number;
  year?: string | number;
  country?: string;
  type?: 'single' | 'series' | 'hoathinh' | 'tvshows' | string;
  status?: 'trailer' | 'ongoing' | 'completed' | string;
}

export interface EpisodeData {
  name: string;
  slug: string;
  filename?: string;
  link_embed: string;
  link_m3u8?: string;
}

export interface EpisodeServer {
  server_name: string;
  server_data: EpisodeData[];
}

export interface MovieDetail extends MovieItem {
  content?: string;
  trailer_url?: string | null;
  showtimes?: string | null;
  notify?: string | null;
  keywords?: string[];
  chieurap?: boolean;
  sub_docquyen?: boolean;
  actor?: string[];
  director?: string[];
  category?: MovieCategory[];
  country?: MovieCountry[];
  episodes?: EpisodeServer[];
}

export interface MovieDetailResponse {
  status: boolean | string;
  msg?: string;
  message?: string;
  movie?: MovieDetail;
  item?: MovieDetail;
  data?: {
    item?: MovieDetail;
    movie?: MovieDetail;
  };
  episodes?: EpisodeServer[];
}

export interface MoviePagination {
  currentPage: number;
  totalItemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

export interface MovieListResponse {
  status: boolean | string;
  message?: string;
  items?: MovieItem[];
  data?: {
    items?: MovieItem[];
    pagination?: {
      current_page?: number;
      per_page?: number;
      total_items?: number;
      total_pages?: number;
      currentPage?: number;
      totalItemsPerPage?: number;
      totalItems?: number;
      totalPages?: number;
    };
  };
  pagination?: {
    currentPage?: number;
    totalItemsPerPage?: number;
    totalItems?: number;
    totalPages?: number;
    current_page?: number;
    per_page?: number;
    total_items?: number;
    total_pages?: number;
  };
}

export interface FilterOption {
  _id?: number | string;
  id?: number | string;
  name: string;
  slug: string;
}

export interface FilterListResponse {
  status: boolean | string;
  message?: string;
  items?: FilterOption[];
  data?: {
    items?: FilterOption[];
  };
}

export interface MovieHistoryItem {
  slug: string;
  name: string;
  origin_name?: string;
  poster_url?: string;
  thumb_url?: string;
  lastWatchedEpisodeName?: string;
  lastWatchedEpisodeSlug?: string;
  lastWatchedServerName?: string;
  updatedAt: string;
}
