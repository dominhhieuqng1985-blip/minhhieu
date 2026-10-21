import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Play,
  Search,
  Sparkles,
  Tv,
  Star,
  Clock,
  Calendar,
  Globe2,
  Tag,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Heart,
  Share2,
  SlidersHorizontal,
  X,
  Volume2,
  Check,
  Bookmark,
  Layers,
  Info,
  Maximize2,
  ExternalLink,
  Loader2,
  PlayCircle
} from 'lucide-react';
import {
  MovieItem,
  MovieDetail,
  EpisodeServer,
  EpisodeData,
  FilterOption,
  MoviePagination,
  MovieHistoryItem
} from '../types/movie';
import {
  getLatestMovies,
  getMoviesByList,
  searchMovies,
  getCategories,
  getCountries,
  getYears,
  getMovieDetail
} from '../utils/movieApi';

interface MovieCinemaViewProps {
  onSendToTTS?: (text: string) => void;
  onShowToast?: (message: string) => void;
}

type CatalogTab = 'latest' | 'series' | 'single' | 'hoathinh' | 'tvshows' | 'subteam' | 'history' | 'favorites';

const STORAGE_KEY_HISTORY = 'vsmov_cinema_history_v1';
const STORAGE_KEY_FAVORITES = 'vsmov_cinema_favorites_v1';

export const MovieCinemaView: React.FC<MovieCinemaViewProps> = ({
  onSendToTTS,
  onShowToast,
}) => {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<CatalogTab>('latest');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState<MoviePagination>({
    currentPage: 1,
    totalItemsPerPage: 24,
    totalItems: 0,
    totalPages: 1,
  });

  // Movie lists
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [activeSearchTerm, setActiveSearchTerm] = useState<string>('');

  // Filter options from API
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [countries, setCountries] = useState<FilterOption[]>([]);
  const [years, setYears] = useState<FilterOption[]>([]);
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);

  // Selected filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Active Movie Player / Detail Screen
  const [selectedMovieSlug, setSelectedMovieSlug] = useState<string | null>(null);
  const [currentMovieDetail, setCurrentMovieDetail] = useState<MovieDetail | null>(null);
  const [currentEpisodes, setCurrentEpisodes] = useState<EpisodeServer[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Active Playing Episode
  const [activeServerIndex, setActiveServerIndex] = useState<number>(0);
  const [activeEpisode, setActiveEpisode] = useState<EpisodeData | null>(null);
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // History & Favorites
  const [watchHistory, setWatchHistory] = useState<MovieHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_HISTORY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [favorites, setFavorites] = useState<MovieItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_FAVORITES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const playerRef = useRef<HTMLDivElement | null>(null);

  // Load Filter metadata once on mount
  useEffect(() => {
    async function loadFilters() {
      try {
        const [cats, counts, yrs] = await Promise.all([
          getCategories().catch(() => []),
          getCountries().catch(() => []),
          getYears().catch(() => []),
        ]);
        setCategories(cats);
        setCountries(counts);
        setYears(yrs);
      } catch (err) {
        console.warn('Error loading movie filters:', err);
      }
    }
    loadFilters();
  }, []);

  // Fetch movies when tab, page, or filters change
  useEffect(() => {
    if (selectedMovieSlug) return; // Don't fetch catalog while in player mode

    if (activeTab === 'history') {
      setIsLoading(false);
      return;
    }
    if (activeTab === 'favorites') {
      setIsLoading(false);
      return;
    }

    if (activeSearchTerm.trim()) {
      handleSearchExecution(activeSearchTerm, currentPage);
      return;
    }

    fetchCatalogMovies();
  }, [activeTab, currentPage, selectedCategory, selectedCountry, selectedYear, selectedStatus, activeSearchTerm, selectedMovieSlug]);

  const fetchCatalogMovies = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      let res: { items: MovieItem[]; pagination: MoviePagination };

      const filterParams = {
        page: currentPage,
        year: selectedYear || undefined,
        country: selectedCountry || undefined,
        category: selectedCategory || undefined,
        status: selectedStatus || undefined,
      };

      if (activeTab === 'latest') {
        if (selectedCategory || selectedCountry || selectedYear || selectedStatus) {
          // If filters applied, use general list
          res = await getMoviesByList('phim-moi-cap-nhat', filterParams);
        } else {
          res = await getLatestMovies(currentPage);
        }
      } else if (activeTab === 'series') {
        res = await getMoviesByList('phim-bo', { ...filterParams, type: 'series' });
      } else if (activeTab === 'single') {
        res = await getMoviesByList('phim-le', { ...filterParams, type: 'single' });
      } else if (activeTab === 'hoathinh') {
        res = await getMoviesByList('hoat-hinh', { ...filterParams, type: 'hoathinh' });
      } else if (activeTab === 'tvshows') {
        res = await getMoviesByList('tv-shows', { ...filterParams, type: 'tvshows' });
      } else if (activeTab === 'subteam') {
        res = await getMoviesByList('subteam', filterParams);
      } else {
        res = await getLatestMovies(currentPage);
      }

      setMovies(res.items);
      setPagination(res.pagination);
    } catch (err: any) {
      console.error('Error fetching movies:', err);
      setErrorMessage(err.message || 'Không thể tải danh sách phim. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchExecution = async (term: string, page: number = 1) => {
    if (!term.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await searchMovies(term, page, 24);
      setMovies(res.items);
      setPagination(res.pagination);
    } catch (err: any) {
      console.error('Search error:', err);
      setErrorMessage(err.message || 'Lỗi khi tìm kiếm phim.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setActiveSearchTerm(searchQuery.trim());
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearchTerm('');
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedCountry('');
    setSelectedYear('');
    setSelectedStatus('');
    setCurrentPage(1);
  };

  // Open Movie Detail & Player
  const handleSelectMovie = async (slug: string, autoScroll: boolean = true) => {
    setSelectedMovieSlug(slug);
    setIsLoadingDetail(true);
    setDetailError(null);
    setCurrentMovieDetail(null);
    setCurrentEpisodes([]);
    setActiveEpisode(null);
    setActiveServerIndex(0);

    try {
      const res = await getMovieDetail(slug);
      setCurrentMovieDetail(res.movie);
      setCurrentEpisodes(res.episodes);

      // Select first episode by default
      if (res.episodes.length > 0 && res.episodes[0].server_data.length > 0) {
        const firstEp = res.episodes[0].server_data[0];
        setActiveEpisode(firstEp);
        saveWatchHistory(res.movie, firstEp, res.episodes[0].server_name);
      }

      if (autoScroll) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('Error fetching movie detail:', err);
      setDetailError(err.message || 'Không thể tải thông tin phim.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Save history to localStorage
  const saveWatchHistory = (movie: MovieDetail, ep: EpisodeData, serverName: string) => {
    const item: MovieHistoryItem = {
      slug: movie.slug,
      name: movie.name,
      origin_name: movie.origin_name,
      poster_url: movie.poster_url || movie.thumb_url,
      thumb_url: movie.thumb_url || movie.poster_url,
      lastWatchedEpisodeName: ep.name,
      lastWatchedEpisodeSlug: ep.slug,
      lastWatchedServerName: serverName,
      updatedAt: new Date().toISOString(),
    };

    setWatchHistory((prev) => {
      const filtered = prev.filter((h) => h.slug !== movie.slug);
      const updated = [item, ...filtered].slice(0, 30);
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Toggle favorite
  const handleToggleFavorite = (movie: MovieItem) => {
    setFavorites((prev) => {
      const exists = prev.some((m) => m.slug === movie.slug);
      let updated: MovieItem[];
      if (exists) {
        updated = prev.filter((m) => m.slug !== movie.slug);
        if (onShowToast) onShowToast(`Đã xóa "${movie.name}" khỏi danh sách yêu thích`);
      } else {
        updated = [movie, ...prev];
        if (onShowToast) onShowToast(`Đã lưu "${movie.name}" vào danh sách yêu thích`);
      }
      try {
        localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const isFavorited = (slug: string) => {
    return favorites.some((m) => m.slug === slug);
  };

  // Change episode
  const handleSelectEpisode = (ep: EpisodeData) => {
    setActiveEpisode(ep);
    if (currentMovieDetail && currentEpisodes[activeServerIndex]) {
      saveWatchHistory(currentMovieDetail, ep, currentEpisodes[activeServerIndex].server_name);
    }
    // Scroll player into view
    playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Next / Previous episode controls
  const handleNextEpisode = () => {
    if (!currentEpisodes[activeServerIndex] || !activeEpisode) return;
    const epList = currentEpisodes[activeServerIndex].server_data;
    const currentIndex = epList.findIndex((e) => e.slug === activeEpisode.slug);
    if (currentIndex >= 0 && currentIndex < epList.length - 1) {
      handleSelectEpisode(epList[currentIndex + 1]);
    }
  };

  const handlePrevEpisode = () => {
    if (!currentEpisodes[activeServerIndex] || !activeEpisode) return;
    const epList = currentEpisodes[activeServerIndex].server_data;
    const currentIndex = epList.findIndex((e) => e.slug === activeEpisode.slug);
    if (currentIndex > 0) {
      handleSelectEpisode(epList[currentIndex - 1]);
    }
  };

  // Transfer movie summary to TTS Studio
  const handleTransferToTTS = () => {
    if (!currentMovieDetail || !onSendToTTS) return;
    const summary = `Phim ${currentMovieDetail.name} (${currentMovieDetail.origin_name || ''}), phát hành năm ${currentMovieDetail.year || ''}. ${currentMovieDetail.content || ''}`;
    onSendToTTS(summary);
    if (onShowToast) {
      onShowToast(`Đã gửi tóm tắt phim "${currentMovieDetail.name}" sang Studio Đỗ Minh Hiếu AI!`);
    }
  };

  // Copy movie link
  const handleCopyMovieLink = () => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      if (onShowToast) onShowToast('Đã sao chép liên kết xem phim!');
    }
  };

  // Featured Spotlight movie (first item of current list)
  const spotlightMovie = movies.length > 0 ? movies[0] : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ===================================================================== */}
      {/* VIEW A: DEDICATED MOVIE PLAYER & CINEMA SCREEN                        */}
      {/* ===================================================================== */}
      {selectedMovieSlug ? (
        <div className="space-y-6">
          {/* Back button & Breadcrumb bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl backdrop-blur-md">
            <button
              onClick={() => {
                setSelectedMovieSlug(null);
                setCurrentMovieDetail(null);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Quay Lại Danh Sách Phim</span>
            </button>

            {currentMovieDetail && (
              <div className="flex items-center gap-2 text-xs text-slate-300 font-medium truncate max-w-md">
                <span className="text-amber-400 font-bold">{currentMovieDetail.name}</span>
                {activeEpisode && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-mono">
                    Tập {activeEpisode.name}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTheaterMode(!isTheaterMode)}
                className={`p-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 ${
                  isTheaterMode
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title={isTheaterMode ? 'Thu nhỏ chế độ rạp' : 'Chế độ rạp chiếu phim (Rộng)'}
              >
                <Maximize2 className="w-4 h-4" />
                <span className="hidden sm:inline">Rạp Chiếu</span>
              </button>

              <button
                onClick={handleCopyMovieLink}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                title="Chia sẻ liên kết phim"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Loading Detail State */}
          {isLoadingDetail && (
            <div className="p-16 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center space-y-4 text-center">
              <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
              <p className="text-sm font-semibold text-slate-300">Đang khởi tạo rạp chiếu phim và nạp nguồn phát...</p>
              <p className="text-xs text-slate-500">Vui lòng đợi giây lát trong khi máy chủ kết nối đường truyền</p>
            </div>
          )}

          {/* Error Detail State */}
          {detailError && !isLoadingDetail && (
            <div className="p-8 rounded-3xl bg-red-950/30 border border-red-800/40 text-center space-y-4">
              <p className="text-sm text-red-300 font-semibold">{detailError}</p>
              <button
                onClick={() => handleSelectMovie(selectedMovieSlug, false)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                Thử Lại Ngay
              </button>
            </div>
          )}

          {/* Player & Episode Content */}
          {currentMovieDetail && !isLoadingDetail && (
            <div className={`space-y-6 ${isTheaterMode ? 'max-w-full' : ''}`}>
              {/* VIDEO PLAYER FRAME CONTAINER */}
              <div
                ref={playerRef}
                className="relative rounded-3xl overflow-hidden bg-black border border-slate-800 shadow-2xl"
              >
                {activeEpisode ? (
                  <div className="relative w-full aspect-video sm:aspect-[16/9] bg-black">
                    <iframe
                      src={activeEpisode.link_embed}
                      title={`${currentMovieDetail.name} - ${activeEpisode.name}`}
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      className="absolute inset-0 w-full h-full border-0 bg-black"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full flex flex-col items-center justify-center space-y-3 text-slate-400">
                    <PlayCircle className="w-12 h-12 text-slate-600" />
                    <p className="text-sm font-medium">Chưa có tập phim nào được chọn</p>
                  </div>
                )}

                {/* Quick Next/Prev Controller Overlay Bar */}
                <div className="p-3 sm:p-4 bg-slate-950/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrevEpisode}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1 font-semibold"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Tập Trước</span>
                    </button>

                    <button
                      onClick={handleNextEpisode}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <span>Tập Kế Tiếp</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {onSendToTTS && (
                      <button
                        onClick={handleTransferToTTS}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-indigo-200 font-semibold transition-all flex items-center gap-1.5"
                        title="Chuyển tóm tắt phim này sang Studio Đỗ Minh Hiếu AI để đọc giọng nói"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Đọc Tóm Tắt AI</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleFavorite(currentMovieDetail)}
                      className={`px-3 py-1.5 rounded-xl border font-semibold transition-all flex items-center gap-1.5 ${
                        isFavorited(currentMovieDetail.slug)
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isFavorited(currentMovieDetail.slug) ? 'fill-rose-400 text-rose-400' : ''
                        }`}
                      />
                      <span>{isFavorited(currentMovieDetail.slug) ? 'Đã Thích' : 'Yêu Thích'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SERVER SELECTOR & EPISODE PICKER */}
              {currentEpisodes.length > 0 && (
                <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 font-bold text-white text-sm">
                      <Tv className="w-4 h-4 text-amber-400" />
                      <span>Danh Sách Tập Phim</span>
                      <span className="text-xs text-slate-400 font-normal">
                        ({currentEpisodes[activeServerIndex]?.server_data?.length || 0} tập)
                      </span>
                    </div>

                    {/* Server switcher tabs */}
                    {currentEpisodes.length > 1 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                        {currentEpisodes.map((server, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setActiveServerIndex(idx);
                              if (server.server_data.length > 0) {
                                handleSelectEpisode(server.server_data[0]);
                              }
                            }}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                              activeServerIndex === idx
                                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {server.server_name || `Nguồn #${idx + 1}`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Episodes Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2 max-h-60 overflow-y-auto pr-1">
                    {currentEpisodes[activeServerIndex]?.server_data?.map((ep) => {
                      const isActive = activeEpisode?.slug === ep.slug;
                      return (
                        <button
                          key={ep.slug}
                          onClick={() => handleSelectEpisode(ep)}
                          className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center truncate ${
                            isActive
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 scale-105'
                              : 'bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700'
                          }`}
                          title={`Xem Tập ${ep.name}`}
                        >
                          {ep.name.startsWith('Tập') ? ep.name : `Tập ${ep.name}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MOVIE INFO & METADATA SECTION */}
              <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Poster Thumbnail */}
                  <div className="w-36 sm:w-44 shrink-0 rounded-2xl overflow-hidden border border-slate-800 shadow-lg aspect-[2/3] bg-slate-950">
                    <img
                      src={currentMovieDetail.poster_url || currentMovieDetail.thumb_url || ''}
                      alt={currentMovieDetail.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  {/* Details column */}
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {currentMovieDetail.quality && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {currentMovieDetail.quality}
                          </span>
                        )}
                        {currentMovieDetail.lang && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {currentMovieDetail.lang}
                          </span>
                        )}
                        {currentMovieDetail.year && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
                            {currentMovieDetail.year}
                          </span>
                        )}
                        {currentMovieDetail.tmdb?.vote_average && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span>TMDB {currentMovieDetail.tmdb.vote_average}</span>
                          </span>
                        )}
                      </div>

                      <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {currentMovieDetail.name}
                      </h1>
                      {currentMovieDetail.origin_name && (
                        <p className="text-xs text-slate-400 font-mono">
                          {currentMovieDetail.origin_name}
                        </p>
                      )}
                    </div>

                    {/* Metadata tags */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2">
                      {currentMovieDetail.time && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Thời lượng: <strong className="text-slate-200">{currentMovieDetail.time}</strong></span>
                        </div>
                      )}

                      {currentMovieDetail.episode_current && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Tv className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Trạng thái: <strong className="text-slate-200">{currentMovieDetail.episode_current}</strong></span>
                        </div>
                      )}

                      {currentMovieDetail.director && currentMovieDetail.director.length > 0 && (
                        <div className="flex items-center gap-2 text-slate-400 sm:col-span-2">
                          <Film className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Đạo diễn: <strong className="text-slate-200">{currentMovieDetail.director.join(', ')}</strong></span>
                        </div>
                      )}

                      {currentMovieDetail.actor && currentMovieDetail.actor.length > 0 && (
                        <div className="flex items-start gap-2 text-slate-400 sm:col-span-2">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>Diễn viên: <span className="text-slate-300">{currentMovieDetail.actor.join(', ')}</span></span>
                        </div>
                      )}

                      {currentMovieDetail.category && currentMovieDetail.category.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 sm:col-span-2 pt-1">
                          <Tag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-slate-400 mr-1">Thể loại:</span>
                          {currentMovieDetail.category.map((cat, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] border border-slate-700"
                            >
                              {cat.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {currentMovieDetail.country && currentMovieDetail.country.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 sm:col-span-2">
                          <Globe2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-slate-400 mr-1">Quốc gia:</span>
                          {currentMovieDetail.country.map((c, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] border border-slate-700"
                            >
                              {c.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Synopsis */}
                    {currentMovieDetail.content && (
                      <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Nội Dung Phim
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-6 hover:line-clamp-none transition-all">
                          {currentMovieDetail.content.replace(/<[^>]*>?/gm, '')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ===================================================================== */
        /* VIEW B: CATALOG / MOVIE LIST & DISCOVERY                              */
        /* ===================================================================== */
        <div className="space-y-8">
          {/* HERO BANNER SPOTLIGHT */}
          {spotlightMovie && !activeSearchTerm && activeTab === 'latest' && currentPage === 1 && (
            <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900 group">
              {/* Background Backdrop Blur */}
              <div className="absolute inset-0 z-0">
                <img
                  src={spotlightMovie.poster_url || spotlightMovie.thumb_url || ''}
                  alt={spotlightMovie.name}
                  className="w-full h-full object-cover opacity-25 filter blur-lg scale-105 group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
              </div>

              {/* Spotlight Content */}
              <div className="relative z-10 p-6 sm:p-10 flex flex-col md:flex-row items-center gap-6 sm:gap-8">
                <div className="w-40 sm:w-52 shrink-0 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-950 group-hover:shadow-amber-500/10 transition-shadow">
                  <img
                    src={spotlightMovie.poster_url || spotlightMovie.thumb_url || ''}
                    alt={spotlightMovie.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-3 flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>PHIM MỚI CẬP NHẬT HÔM NAY</span>
                    {spotlightMovie.quality && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[10px] font-black uppercase">
                        {spotlightMovie.quality}
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                    {spotlightMovie.name}
                  </h2>

                  {spotlightMovie.origin_name && (
                    <p className="text-xs sm:text-sm text-slate-400 font-mono">
                      {spotlightMovie.origin_name} {spotlightMovie.year ? `(${spotlightMovie.year})` : ''}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1 text-xs">
                    {spotlightMovie.episode_current && (
                      <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 font-semibold">
                        {spotlightMovie.episode_current}
                      </span>
                    )}
                    {spotlightMovie.lang && (
                      <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-amber-300 border border-slate-700 font-semibold">
                        {spotlightMovie.lang}
                      </span>
                    )}
                    {spotlightMovie.tmdb?.vote_average && (
                      <span className="px-2.5 py-1 rounded-xl bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-bold flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span>TMDB {spotlightMovie.tmdb.vote_average}</span>
                      </span>
                    )}
                  </div>

                  <div className="pt-4 flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <button
                      onClick={() => handleSelectMovie(spotlightMovie.slug)}
                      className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-amber-500/20 flex items-center gap-2 active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-slate-950" />
                      <span>Xem Phim Ngay</span>
                    </button>

                    <button
                      onClick={() => handleToggleFavorite(spotlightMovie)}
                      className="px-4 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-2"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isFavorited(spotlightMovie.slug) ? 'fill-rose-400 text-rose-400' : ''
                        }`}
                      />
                      <span>{isFavorited(spotlightMovie.slug) ? 'Đã Thích' : 'Yêu Thích'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SEARCH & FILTERS BAR */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-3">
              {/* Search Form */}
              <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm phim theo tên tiếng Việt hoặc tên gốc (ví dụ: Avengers, Màu Xanh Cuối Cùng)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-20 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors font-sans"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors"
                >
                  Tìm
                </button>
              </form>

              {/* Filter toggle button */}
              <button
                onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border ${
                  showFilterDrawer || selectedCategory || selectedCountry || selectedYear || selectedStatus
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Bộ Lọc Nâng Cao</span>
                {(selectedCategory || selectedCountry || selectedYear || selectedStatus) && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            </div>

            {/* EXPANDABLE FILTER OPTIONS PANEL */}
            {showFilterDrawer && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {/* Category Filter */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Thể loại
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Tất cả thể loại</option>
                      {categories.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Country Filter */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Quốc gia
                    </label>
                    <select
                      value={selectedCountry}
                      onChange={(e) => {
                        setSelectedCountry(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Tất cả quốc gia</option>
                      {countries.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Year Filter */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Năm phát hành
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Tất cả năm</option>
                      {years.map((y) => (
                        <option key={y.slug} value={y.slug}>
                          {y.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Trạng thái
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => {
                        setSelectedStatus(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Tất cả trạng thái</option>
                      <option value="completed">Đã hoàn thành</option>
                      <option value="ongoing">Đang tiến hành / Chiếu</option>
                      <option value="trailer">Trailer sắp chiếu</option>
                    </select>
                  </div>
                </div>

                {/* Reset Filters button */}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleResetFilters}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Đặt lại bộ lọc</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Catalog Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none border-t border-slate-800 pt-3">
              {[
                { id: 'latest', label: 'Phim Mới Cập Nhật', icon: Sparkles },
                { id: 'series', label: 'Phim Bộ', icon: Tv },
                { id: 'single', label: 'Phim Lẻ', icon: Film },
                { id: 'hoathinh', label: 'Hoạt Hình (Anime)', icon: Tag },
                { id: 'tvshows', label: 'TV Shows', icon: Layers },
                { id: 'subteam', label: 'Subteam Độc Quyền', icon: Globe2 },
                { id: 'history', label: `Lịch Sử Xem (${watchHistory.length})`, icon: Clock },
                { id: 'favorites', label: `Yêu Thích (${favorites.length})`, icon: Heart },
              ].map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id && !activeSearchTerm;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as CatalogTab);
                      setCurrentPage(1);
                      if (activeSearchTerm) handleClearSearch();
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACTIVE SEARCH BADGE INDICATOR */}
          {activeSearchTerm && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-amber-400" />
                <span>
                  Kết quả tìm kiếm cho: <strong>"{activeSearchTerm}"</strong> ({pagination.totalItems} kết quả)
                </span>
              </div>
              <button
                onClick={handleClearSearch}
                className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
              >
                Xóa tìm kiếm
              </button>
            </div>
          )}

          {/* ===================================================================== */}
          {/* MOVIE GRID RENDERING                                                  */}
          {/* ===================================================================== */}
          {activeTab === 'history' ? (
            /* WATCH HISTORY VIEW */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Phim Bạn Đã Xem Gần Đây</span>
                </h3>
                {watchHistory.length > 0 && (
                  <button
                    onClick={() => {
                      localStorage.removeItem(STORAGE_KEY_HISTORY);
                      setWatchHistory([]);
                    }}
                    className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                  >
                    Xóa lịch sử
                  </button>
                )}
              </div>

              {watchHistory.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs font-semibold">Bạn chưa xem bộ phim nào gần đây.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {watchHistory.map((item) => (
                    <div
                      key={item.slug}
                      onClick={() => handleSelectMovie(item.slug)}
                      className="group cursor-pointer rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-2.5 transition-all shadow-md hover:shadow-xl hover:-translate-y-1"
                    >
                      <div className="aspect-[2/3] rounded-xl overflow-hidden bg-slate-950 relative">
                        <img
                          src={item.poster_url || item.thumb_url || ''}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg">
                            <Play className="w-5 h-5 fill-slate-950 translate-x-0.5" />
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 space-y-1">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                          {item.name}
                        </h4>
                        {item.lastWatchedEpisodeName && (
                          <p className="text-[11px] text-amber-300/90 font-mono">
                            Đang xem: Tập {item.lastWatchedEpisodeName}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'favorites' ? (
            /* FAVORITES VIEW */
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
                <span>Danh Sách Phim Yêu Thích Của Bạn ({favorites.length})</span>
              </h3>

              {favorites.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 space-y-2">
                  <Heart className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs font-semibold">Chưa có phim nào trong danh sách yêu thích.</p>
                  <p className="text-[11px] text-slate-500">
                    Bấm vào biểu tượng trái tim khi xem phim để lưu lại xem sau!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {favorites.map((m) => (
                    <MovieCard
                      key={m.slug}
                      movie={m}
                      onSelect={() => handleSelectMovie(m.slug)}
                      isFavorited={true}
                      onToggleFavorite={() => handleToggleFavorite(m)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* STANDARD CATALOG VIEW */
            <div className="space-y-6">
              {/* Loading State */}
              {isLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="rounded-2xl bg-slate-900 border border-slate-800 p-2.5 space-y-2">
                      <div className="aspect-[2/3] rounded-xl bg-slate-800" />
                      <div className="h-3 bg-slate-800 rounded w-3/4" />
                      <div className="h-2.5 bg-slate-800 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              )}

              {/* Error State */}
              {errorMessage && !isLoading && (
                <div className="p-8 text-center rounded-3xl bg-red-950/30 border border-red-800/40 text-red-300 space-y-3">
                  <p className="text-sm font-semibold">{errorMessage}</p>
                  <button
                    onClick={fetchCatalogMovies}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Tải Lại
                  </button>
                </div>
              )}

              {/* Empty Results State */}
              {!isLoading && !errorMessage && movies.length === 0 && (
                <div className="p-16 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 space-y-3">
                  <Film className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-sm font-semibold text-slate-300">Không tìm thấy bộ phim nào phù hợp</p>
                  <p className="text-xs text-slate-500">Hãy thử tìm với từ khóa khác hoặc điều chỉnh bộ lọc</p>
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                  >
                    Xem tất cả phim mới
                  </button>
                </div>
              )}

              {/* Movie Grid */}
              {!isLoading && !errorMessage && movies.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {movies.map((m) => (
                    <MovieCard
                      key={m.slug}
                      movie={m}
                      onSelect={() => handleSelectMovie(m.slug)}
                      isFavorited={isFavorited(m.slug)}
                      onToggleFavorite={() => handleToggleFavorite(m)}
                    />
                  ))}
                </div>
              )}

              {/* PAGINATION BAR */}
              {!isLoading && !errorMessage && pagination.totalPages > 1 && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div className="text-xs text-slate-400 font-mono">
                    Trang <strong>{pagination.currentPage}</strong> / {pagination.totalPages}{' '}
                    <span className="hidden sm:inline">({pagination.totalItems.toLocaleString()} phim)</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1));
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      disabled={currentPage <= 1}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Trước</span>
                    </button>

                    {/* Quick page buttons */}
                    <div className="hidden sm:flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, idx) => {
                        let pageNum: number;
                        if (pagination.totalPages <= 5) {
                          pageNum = idx + 1;
                        } else if (currentPage <= 3) {
                          pageNum = idx + 1;
                        } else if (currentPage >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + idx;
                        } else {
                          pageNum = currentPage - 2 + idx;
                        }

                        const isCurrent = pageNum === currentPage;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => {
                              setCurrentPage(pageNum);
                              window.scrollTo({ top: 300, behavior: 'smooth' });
                            }}
                            className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                              isCurrent
                                ? 'bg-amber-500 text-slate-950 shadow-md'
                                : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => {
                        setCurrentPage((p) => Math.min(pagination.totalPages, p + 1));
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      disabled={currentPage >= pagination.totalPages}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <span>Sau</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =========================================================================
// REUSABLE MOVIE CARD COMPONENT
// =========================================================================
interface MovieCardProps {
  movie: MovieItem;
  onSelect: () => void;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}

const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  onSelect,
  isFavorited,
  onToggleFavorite,
}) => {
  return (
    <div
      onClick={onSelect}
      className="group cursor-pointer rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-2.5 transition-all shadow-md hover:shadow-2xl hover:-translate-y-1 flex flex-col"
    >
      {/* Poster Image Container */}
      <div className="aspect-[2/3] rounded-xl overflow-hidden bg-slate-950 relative w-full">
        <img
          src={movie.poster_url || movie.thumb_url || ''}
          alt={movie.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Top Floating Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          <div className="flex flex-col gap-1 items-start">
            {movie.quality && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-600/90 text-white shadow-sm">
                {movie.quality}
              </span>
            )}
            {movie.lang && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/90 text-slate-950 shadow-sm">
                {movie.lang}
              </span>
            )}
          </div>

          {movie.year && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/60 text-slate-200 backdrop-blur-sm">
              {movie.year}
            </span>
          )}
        </div>

        {/* Bottom Episode Current Badge */}
        {movie.episode_current && (
          <div className="absolute bottom-2 left-2 right-2">
            <span className="block px-2 py-0.5 rounded-lg text-[10px] font-semibold text-center bg-black/75 text-amber-300 border border-slate-700/60 backdrop-blur-sm truncate">
              {movie.episode_current}
            </span>
          </div>
        )}

        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/30 transform scale-75 group-hover:scale-100 transition-transform">
            <Play className="w-5 h-5 fill-slate-950 translate-x-0.5" />
          </div>
        </div>

        {/* Favorite Bookmark Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-slate-200 hover:text-rose-400 transition-colors z-20"
          title={isFavorited ? 'Xóa khỏi yêu thích' : 'Lưu vào yêu thích'}
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-rose-400 text-rose-400' : ''}`} />
        </button>
      </div>

      {/* Title & Metadata */}
      <div className="pt-2.5 space-y-1 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-amber-400 transition-colors">
            {movie.name}
          </h4>
          {movie.origin_name && (
            <p className="text-[10px] text-slate-400 font-mono truncate">
              {movie.origin_name}
            </p>
          )}
        </div>

        {movie.tmdb?.vote_average && (
          <div className="flex items-center gap-1 pt-1 text-[11px] font-bold text-yellow-400">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span>{movie.tmdb.vote_average}</span>
          </div>
        )}
      </div>
    </div>
  );
};
