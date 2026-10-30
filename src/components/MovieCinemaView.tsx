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
  RotateCw,
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
  PlayCircle,
  Users,
  UserCheck,
  MessageSquare,
  Send,
  ThumbsUp,
  Flame,
  Filter,
  CheckCircle2,
  MessageCircle,
  HelpCircle,
  Copy,
  Radio,
} from 'lucide-react';
import {
  MovieItem,
  MovieDetail,
  EpisodeServer,
  EpisodeData,
  FilterOption,
  MoviePagination,
  MovieHistoryItem,
  ActorItem,
  GenreQueryParams,
} from '../types/movie';
import {
  getLatestMovies,
  getMoviesByList,
  getMoviesByGenre,
  getActors,
  searchMovies,
  getCategories,
  getCountries,
  getYears,
  getMovieDetail,
} from '../utils/movieApi';
import { MovieVideoPlayer } from './MovieVideoPlayer';
import { AdcashBanner, StandaloneBanner300x250 } from './AdcashBanner';

interface MovieCinemaViewProps {
  onSendToTTS?: (text: string) => void;
  onShowToast?: (message: string) => void;
  initialTab?: string;
  initialGenreSlug?: string;
  initialActorSlug?: string;
  isRightSidebarOpen?: boolean;
  onToggleRightSidebar?: () => void;
  onPlayMovieInUniversalPlayer?: (
    movie: MovieDetail,
    ep: EpisodeData,
    serverName: string,
    episodes: EpisodeServer[]
  ) => void;
}

export type CatalogTab =
  | 'latest'
  | 'genre'
  | 'actors'
  | 'series'
  | 'single'
  | 'hoathinh'
  | 'tvshows'
  | 'subteam'
  | 'history'
  | 'favorites';

const STORAGE_KEY_HISTORY = 'vsmov_cinema_history_v1';
const STORAGE_KEY_FAVORITES = 'vsmov_cinema_favorites_v1';
const STORAGE_KEY_COMMENTS = 'vsmov_cinema_comments_v1';
const STORAGE_KEY_NOTES = 'vsmov_cinema_notes_v1';

interface MovieComment {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timeAgo: string;
  likes: number;
  userLiked?: boolean;
}

interface MovieUserNote {
  id: string;
  movieSlug: string;
  episodeName: string;
  timeText: string;
  content: string;
  createdAt: string;
}

export const MovieCinemaView: React.FC<MovieCinemaViewProps> = ({
  onSendToTTS,
  onShowToast,
  initialTab,
  initialGenreSlug,
  initialActorSlug,
  isRightSidebarOpen = false,
  onToggleRightSidebar,
  onPlayMovieInUniversalPlayer,
}) => {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<CatalogTab>(
    (initialTab as CatalogTab) || (initialGenreSlug ? 'genre' : 'latest')
  );
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

  // Selected filters for /api/the-loai/[slug]
  const [selectedGenreSlug, setSelectedGenreSlug] = useState<string>(
    initialGenreSlug || 'hanh-dong'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedLimit, setSelectedLimit] = useState<number>(20);

  // Actors state for /api/dien-vien
  const [actors, setActors] = useState<ActorItem[]>([]);
  const [isLoadingActors, setIsLoadingActors] = useState<boolean>(false);
  const [actorSearchQuery, setActorSearchQuery] = useState<string>('');
  const [selectedActor, setSelectedActor] = useState<ActorItem | null>(null);

  // Active Movie Player / Detail Screen
  const [selectedMovieSlug, setSelectedMovieSlug] = useState<string | null>(null);
  const [currentMovieDetail, setCurrentMovieDetail] = useState<MovieDetail | null>(null);
  const [currentEpisodes, setCurrentEpisodes] = useState<EpisodeServer[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Active Playing Episode & Controls
  const [activeServerIndex, setActiveServerIndex] = useState<number>(0);
  const [activeEpisode, setActiveEpisode] = useState<EpisodeData | null>(null);
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [playerTab, setPlayerTab] = useState<'episodes' | 'ai' | 'comments' | 'notes'>('episodes');

  // AI Movie Analysis
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [aiMovieSummary, setAiMovieSummary] = useState<string | null>(null);
  const [aiAnalysisType, setAiAnalysisType] = useState<'summary' | 'lessons' | 'quotes'>('summary');

  // Interactive Comments & Notes
  const [comments, setComments] = useState<MovieComment[]>([
    {
      id: 'c1',
      author: 'Tuấn Khang Cinema',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
      content: 'Bản Vietsub mượt và nét căng, phụ đề chuẩn xác. Kênh Minh Hiếu cập nhật phim quá nhanh!',
      timeAgo: '1 giờ trước',
      likes: 38,
    },
    {
      id: 'c2',
      author: 'Thu Thảo Phim Bộ',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      content: 'Tập này kịch tính đỉnh điểm luôn, đoạn cao trào nghẹt thở. Cảm ơn admin!',
      timeAgo: '3 giờ trước',
      likes: 21,
    },
  ]);
  const [newCommentInput, setNewCommentInput] = useState<string>('');

  const [movieNotes, setMovieNotes] = useState<MovieUserNote[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_NOTES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [newNoteContent, setNewNoteContent] = useState<string>('');

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

  // Sync initial props from parent
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as CatalogTab);
      setCurrentPage(1);
    }
    if (initialGenreSlug) {
      setSelectedGenreSlug(initialGenreSlug);
      setActiveTab('genre');
      setCurrentPage(1);
    }
    if (initialActorSlug) {
      setActiveTab('actors');
      setActorSearchQuery(initialActorSlug.replace(/-/g, ' '));
      handleSearchExecution(initialActorSlug.replace(/-/g, ' '), 1);
    }
  }, [initialTab, initialGenreSlug, initialActorSlug]);

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
    if (activeTab === 'actors') {
      fetchActorsList();
      return;
    }

    if (activeSearchTerm.trim()) {
      handleSearchExecution(activeSearchTerm, currentPage);
      return;
    }

    fetchCatalogMovies();
  }, [
    activeTab,
    currentPage,
    selectedGenreSlug,
    selectedCategory,
    selectedCountry,
    selectedYear,
    selectedType,
    selectedStatus,
    selectedLimit,
    activeSearchTerm,
    selectedMovieSlug,
  ]);

  // Fetch /api/dien-vien
  const fetchActorsList = async () => {
    setIsLoadingActors(true);
    try {
      const list = await getActors();
      setActors(list);
    } catch (err: any) {
      console.warn('Error loading actors:', err);
    } finally {
      setIsLoadingActors(false);
    }
  };

  const fetchCatalogMovies = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      let res: { items: MovieItem[]; pagination: MoviePagination };

      // Case 1: Thể loại theo bộ lọc: /api/the-loai/[slug]
      if (activeTab === 'genre') {
        const genreParams: GenreQueryParams = {
          limit: selectedLimit,
          page: currentPage,
          year: selectedYear || undefined,
          country: selectedCountry || undefined,
          type: selectedType || undefined,
          status: selectedStatus || undefined,
        };
        res = await getMoviesByGenre(selectedGenreSlug, genreParams);
      } else if (activeTab === 'latest') {
        const filterParams = {
          page: currentPage,
          year: selectedYear || undefined,
          country: selectedCountry || undefined,
          category: selectedCategory || undefined,
          status: selectedStatus || undefined,
        };
        if (selectedCategory || selectedCountry || selectedYear || selectedStatus) {
          res = await getMoviesByList('phim-moi-cap-nhat', filterParams);
        } else {
          res = await getLatestMovies(currentPage);
        }
      } else if (activeTab === 'series') {
        res = await getMoviesByList('phim-bo', {
          page: currentPage,
          type: 'series',
          year: selectedYear || undefined,
          country: selectedCountry || undefined,
        });
      } else if (activeTab === 'single') {
        res = await getMoviesByList('phim-le', {
          page: currentPage,
          type: 'single',
          year: selectedYear || undefined,
          country: selectedCountry || undefined,
        });
      } else if (activeTab === 'hoathinh') {
        res = await getMoviesByList('hoat-hinh', {
          page: currentPage,
          type: 'hoathinh',
          year: selectedYear || undefined,
          country: selectedCountry || undefined,
        });
      } else if (activeTab === 'tvshows') {
        res = await getMoviesByList('tv-shows', {
          page: currentPage,
          type: 'tvshows',
          year: selectedYear || undefined,
          country: selectedCountry || undefined,
        });
      } else if (activeTab === 'subteam') {
        res = await getMoviesByList('subteam', {
          page: currentPage,
          year: selectedYear || undefined,
        });
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
    setSelectedType('');
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
    setAiMovieSummary(null);

    try {
      const res = await getMovieDetail(slug);
      setCurrentMovieDetail(res.movie);
      setCurrentEpisodes(res.episodes);

      // Select first episode by default
      if (res.episodes.length > 0 && res.episodes[0].server_data.length > 0) {
        const firstEp = res.episodes[0].server_data[0];
        setActiveEpisode(firstEp);
        saveWatchHistory(res.movie, firstEp, res.episodes[0].server_name);

        // Notify parent universal player if provided
        if (onPlayMovieInUniversalPlayer) {
          onPlayMovieInUniversalPlayer(
            res.movie,
            firstEp,
            res.episodes[0].server_name,
            res.episodes
          );
        }
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
      const serverName = currentEpisodes[activeServerIndex].server_name;
      saveWatchHistory(currentMovieDetail, ep, serverName);
      if (onPlayMovieInUniversalPlayer) {
        onPlayMovieInUniversalPlayer(currentMovieDetail, ep, serverName, currentEpisodes);
      }
    }
    if (onShowToast) {
      onShowToast(`Đang phát: ${ep.name.startsWith('Tập') ? ep.name : `Tập ${ep.name}`}`);
    }
    // Only scroll into view smoothly on desktop screens (width > 768)
    // On mobile phones, aggressive scrolling covers the episode buttons and link tools!
    if (typeof window !== 'undefined' && window.innerWidth > 768) {
      playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Next / Previous episode controls
  const handleNextEpisode = () => {
    if (!currentEpisodes[activeServerIndex] || !activeEpisode) return;
    const epList = currentEpisodes[activeServerIndex].server_data;
    const currentIndex = epList.findIndex((e) => e.slug === activeEpisode.slug);
    if (currentIndex >= 0 && currentIndex < epList.length - 1) {
      const nextEp = epList[currentIndex + 1];
      handleSelectEpisode(nextEp);
      if (onShowToast) onShowToast(`Tự động chuyển tiếp: ${nextEp.name}`);
    }
  };

  const handlePrevEpisode = () => {
    if (!currentEpisodes[activeServerIndex] || !activeEpisode) return;
    const epList = currentEpisodes[activeServerIndex].server_data;
    const currentIndex = epList.findIndex((e) => e.slug === activeEpisode.slug);
    if (currentIndex > 0) {
      const prevEp = epList[currentIndex - 1];
      handleSelectEpisode(prevEp);
      if (onShowToast) onShowToast(`Phát lại: ${prevEp.name}`);
    }
  };

  // Generate AI Movie Takeaways / Review
  const handleGenerateAIMovieSummary = async (type: 'summary' | 'lessons' | 'quotes') => {
    if (!currentMovieDetail) return;
    setIsLoadingAI(true);
    setAiAnalysisType(type);

    try {
      const res = await fetch('/api/podcast/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: type === 'lessons' ? 'summary' : type,
          title: `Phim ${currentMovieDetail.name} (${currentMovieDetail.origin_name || ''})`,
          host: currentMovieDetail.director?.join(', ') || 'Đạo diễn',
          description: currentMovieDetail.content || '',
          videoId: currentMovieDetail.slug,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setAiMovieSummary(data.result);
      } else {
        setAiMovieSummary(
          `💡 **Tóm tắt cốt truyện & Bài học phim "${currentMovieDetail.name}"**\n` +
            `Tác phẩm khai thác sâu sắc chủ đề đấu tranh sinh tồn, lý tưởng và phẩm giá con người. ` +
            `Những phân cảnh hành động mãn nhãn kết hợp câu chuyện cảm động tạo nên thông điệp mạnh mẽ về sự kiên định trước thử thách.`
        );
      }
    } catch {
      setAiMovieSummary(
        `💡 **Tóm tắt cốt truyện & Bài học phim "${currentMovieDetail.name}"**\n` +
          `Bộ phim mang tới những góc nhìn đa chiều về tình cảm gia đình, tình bạn và bản lĩnh đối đầu nghịch cảnh.`
      );
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Add Comment
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentInput.trim()) return;

    const newC: MovieComment = {
      id: `c-${Date.now()}`,
      author: 'Bạn (Người xem Minh Hiếu TuBe)',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      content: newCommentInput.trim(),
      timeAgo: 'Vừa xong',
      likes: 1,
      userLiked: true,
    };

    setComments((prev) => [newC, ...prev]);
    setNewCommentInput('');
    if (onShowToast) onShowToast('Đã đăng bình luận thành công!');
  };

  // Add Timestamp Note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !currentMovieDetail || !activeEpisode) return;

    const noteItem: MovieUserNote = {
      id: `note-${Date.now()}`,
      movieSlug: currentMovieDetail.slug,
      episodeName: activeEpisode.name,
      timeText: 'Đoạn phim hay',
      content: newNoteContent.trim(),
      createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = [noteItem, ...movieNotes];
    setMovieNotes(updated);
    try {
      localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(updated.slice(0, 50)));
    } catch {}

    setNewNoteContent('');
    if (onShowToast) onShowToast('Đã lưu ghi chú cho tập phim này!');
  };

  // Transfer movie summary to TTS Studio
  const handleTransferToTTS = () => {
    if (!currentMovieDetail || !onSendToTTS) return;
    const summary =
      aiMovieSummary ||
      `Phim ${currentMovieDetail.name} (${currentMovieDetail.origin_name || ''}), phát hành năm ${currentMovieDetail.year || ''}. ${currentMovieDetail.content || ''}`;
    onSendToTTS(summary);
    if (onShowToast) {
      onShowToast(`Đã gửi tóm tắt phim "${currentMovieDetail.name}" sang Studio Giọng Nói!`);
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

  // Filtered actors
  const filteredActors = actors.filter((a) =>
    a.name.toLowerCase().includes(actorSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ===================================================================== */}
      {/* VIEW A: DEDICATED UNIFIED MOVIE PLAYER & CINEMA SCREEN               */}
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
                <span className="text-rose-400 font-bold">{currentMovieDetail.name}</span>
                {activeEpisode && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[11px] font-mono">
                    {activeEpisode.name.startsWith('Tập') ? activeEpisode.name : `Tập ${activeEpisode.name}`}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              {onToggleRightSidebar && (
                <button
                  onClick={onToggleRightSidebar}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isRightSidebarOpen
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                  title="Nhấn để mở hoặc đóng Cột 3 (Bảng phát & Trợ lý AI)"
                >
                  <Radio className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isRightSidebarOpen ? 'Đóng Cột 3' : 'Mở Cột 3'}</span>
                </button>
              )}

              <button
                onClick={() => setIsTheaterMode(!isTheaterMode)}
                className={`p-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 ${
                  isTheaterMode
                    ? 'bg-rose-600 text-white font-bold'
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
              <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
              <p className="text-sm font-semibold text-slate-300">Đang khởi tạo rạp chiếu phim Minh Hiếu TuBe...</p>
              <p className="text-xs text-slate-500">Vui lòng đợi giây lát trong khi máy chủ kết nối đường truyền</p>
            </div>
          )}

          {/* Error Detail State */}
          {detailError && !isLoadingDetail && (
            <div className="p-8 rounded-3xl bg-red-950/40 border border-red-500/40 text-center space-y-3">
              <p className="text-red-300 font-semibold text-sm">{detailError}</p>
              <button
                onClick={() => handleSelectMovie(selectedMovieSlug)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs"
              >
                Thử Kết Nối Lại
              </button>
            </div>
          )}

          {/* PLAYER WORKSPACE (YOUTUBE-STYLE CINEMA PLAYER) */}
          {currentMovieDetail && !isLoadingDetail && (
            <div
              ref={playerRef}
              className={`transition-all duration-300 space-y-6 ${
                isTheaterMode ? 'max-w-none w-full' : ''
              }`}
            >
              {/* VIDEO EMBED CONTAINER WITH DUAL ENGINE & AD/WATERMARK */}
              <MovieVideoPlayer
                movie={currentMovieDetail}
                activeEpisode={activeEpisode}
                onPrevEpisode={handlePrevEpisode}
                onNextEpisode={handleNextEpisode}
                hasPrevEpisode={currentEpisodes[activeServerIndex]?.server_data.findIndex((e) => e.slug === activeEpisode?.slug) > 0}
                hasNextEpisode={currentEpisodes[activeServerIndex]?.server_data.findIndex((e) => e.slug === activeEpisode?.slug) < (currentEpisodes[activeServerIndex]?.server_data.length || 0) - 1}
                nextEpisodeName={
                  currentEpisodes[activeServerIndex]?.server_data && activeEpisode
                    ? currentEpisodes[activeServerIndex].server_data[
                        currentEpisodes[activeServerIndex].server_data.findIndex((e) => e.slug === activeEpisode.slug) + 1
                      ]?.name
                    : undefined
                }
                onShowToast={onShowToast}
              />

              {/* ACTION TOOLBAR UNDER PLAYER */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevEpisode}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Tập Trước</span>
                  </button>

                  <button
                    onClick={handleNextEpisode}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-md shadow-rose-600/20"
                  >
                    <span>Tập Kế Tiếp</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* AI Lesson / Summary Button */}
                  <button
                    onClick={() => {
                      setPlayerTab('ai');
                      handleGenerateAIMovieSummary('summary');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5"
                    title="Tạo tóm tắt và bài học triết lý bằng AI"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Trợ Lý AI Phim</span>
                  </button>

                  {/* Transfer to TTS Studio */}
                  {onSendToTTS && (
                    <button
                      onClick={handleTransferToTTS}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition-all flex items-center gap-1.5"
                      title="Chuyển tóm tắt phim sang Studio Giọng Nói"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Đọc Giọng Nói AI</span>
                    </button>
                  )}

                  {/* Toggle Favorite */}
                  <button
                    onClick={() => handleToggleFavorite(currentMovieDetail)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      isFavorited(currentMovieDetail.slug)
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
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

              {/* Adcash Display Banner 728x90 (Zone 12358102) under Cinema Player */}
              <AdcashBanner zoneId="12358102" format="728x90" />

              {/* TABS CONTAINER UNDER PLAYER: EPISODES | AI COMPANION | COMMENTS | NOTES */}
              <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
                <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => setPlayerTab('episodes')}
                    className={`pb-3 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
                      playerTab === 'episodes'
                        ? 'border-rose-500 text-white'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Tv className="w-4 h-4 text-rose-400" />
                    <span>Chọn Tập ({currentEpisodes[activeServerIndex]?.server_data?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setPlayerTab('ai')}
                    className={`pb-3 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
                      playerTab === 'ai'
                        ? 'border-amber-500 text-amber-300'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Trợ Lý &amp; Triết Lý Phim</span>
                  </button>

                  <button
                    onClick={() => setPlayerTab('comments')}
                    className={`pb-3 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
                      playerTab === 'comments'
                        ? 'border-sky-500 text-sky-300'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-sky-400" />
                    <span>Bình Luận ({comments.length})</span>
                  </button>

                  <button
                    onClick={() => setPlayerTab('notes')}
                    className={`pb-3 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
                      playerTab === 'notes'
                        ? 'border-emerald-500 text-emerald-300'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Bookmark className="w-4 h-4 text-emerald-400" />
                    <span>Ghi Chú Phim</span>
                  </button>
                </div>

                {/* TAB 1: EPISODES & SERVERS */}
                {playerTab === 'episodes' && (
                  <div className="p-4 sm:p-6 space-y-4">
                    {/* Server switcher tabs */}
                    {currentEpisodes.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto py-1 border-b border-slate-800 pb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
                          Nguồn phát:
                        </span>
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
                                ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/20'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {server.server_name || `Nguồn #${idx + 1}`}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Direct stream link bar for active episode */}
                    {activeEpisode && (
                      <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white font-mono font-bold text-[11px] shrink-0">
                            {activeEpisode.name.startsWith('Tập') ? activeEpisode.name : `Tập ${activeEpisode.name}`}
                          </span>
                          <span className="text-slate-300 text-[11px] font-medium truncate">
                            {activeEpisode.link_m3u8 ? '⚡ Luồng HLS m3u8 sẵn sàng chạy player riêng' : '📺 Link nhúng sẵn sàng'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          {activeEpisode.link_m3u8 && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(activeEpisode.link_m3u8!);
                                if (onShowToast) onShowToast(`📋 Đã sao chép link m3u8 ${activeEpisode.name}!`);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95"
                              title="Sao chép link m3u8 để dán vào VLC/PotPlayer"
                            >
                              <Copy className="w-3 h-3 text-emerald-400" />
                              <span>Chép m3u8 Trực Tiếp</span>
                            </button>
                          )}

                          {activeEpisode.link_embed && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(activeEpisode.link_embed);
                                if (onShowToast) onShowToast(`📋 Đã sao chép link embed ${activeEpisode.name}!`);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[11px] flex items-center gap-1 transition-all active:scale-95"
                              title="Sao chép link nhúng iframe"
                            >
                              <Copy className="w-3 h-3 text-sky-400" />
                              <span>Chép Embed</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Episodes Grid - Ergonomic layout on mobile */}
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-1.5 sm:gap-2 max-h-72 overflow-y-auto pr-1">
                      {currentEpisodes[activeServerIndex]?.server_data?.map((ep) => {
                        const isActive = activeEpisode?.slug === ep.slug;
                        return (
                          <button
                            key={ep.slug}
                            onClick={() => handleSelectEpisode(ep)}
                            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center truncate ${
                              isActive
                                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 scale-105 ring-2 ring-rose-400/50'
                                : 'bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                            }`}
                            title={`Xem ${ep.name}`}
                          >
                            {ep.name.startsWith('Tập') ? ep.name : `Tập ${ep.name}`}
                          </button>
                        );
                      })}
                    </div>

                    {/* Prioritized Standalone 300x250 Banner (ylse) */}
                    <div className="pt-3 border-t border-slate-800/80 flex justify-center">
                      <StandaloneBanner300x250 />
                    </div>
                  </div>
                )}

                {/* TAB 2: AI ASSISTANT & PHILOSOPHY */}
                {playerTab === 'ai' && (
                  <div className="p-6 space-y-5">
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
                      <button
                        onClick={() => handleGenerateAIMovieSummary('summary')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          aiAnalysisType === 'summary'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Tóm Tắt &amp; Diễn Biến
                      </button>
                      <button
                        onClick={() => handleGenerateAIMovieSummary('lessons')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          aiAnalysisType === 'lessons'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Bài Học Nhân Sinh
                      </button>
                      <button
                        onClick={() => handleGenerateAIMovieSummary('quotes')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          aiAnalysisType === 'quotes'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Câu Thoại Bất Hủ
                      </button>
                    </div>

                    {isLoadingAI ? (
                      <div className="p-8 flex flex-col items-center justify-center space-y-3 text-center">
                        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                        <p className="text-xs text-slate-300">
                          AI Studio đang phân tích cốt truyện và đúc kết triết lý nhân vật...
                        </p>
                      </div>
                    ) : aiMovieSummary ? (
                      <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-3">
                        <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                          {aiMovieSummary}
                        </div>
                        <div className="pt-2 flex items-center justify-between border-t border-slate-800 text-xs text-slate-400">
                          <span>Phân tích bởi Gemini AI Minh Hiếu TuBe</span>
                          {onSendToTTS && (
                            <button
                              onClick={handleTransferToTTS}
                              className="text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Nghe giọng đọc</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-400 space-y-3">
                        <Sparkles className="w-10 h-10 mx-auto text-amber-400/60" />
                        <p className="text-sm font-semibold text-slate-200">
                          Khám phá chiều sâu nội dung phim cùng Trợ Lý AI
                        </p>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          Bấm vào các nút phía trên để tự động nhận dạng thông điệp, triết lý sống và câu thoại đắt giá nhất của tác phẩm này.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: DISCUSSION & COMMENTS */}
                {playerTab === 'comments' && (
                  <div className="p-6 space-y-5">
                    {/* Input form */}
                    <form onSubmit={handleAddComment} className="flex gap-2.5">
                      <input
                        type="text"
                        placeholder="Viết bình luận, cảm nhận về tập phim này..."
                        value={newCommentInput}
                        onChange={(e) => setNewCommentInput(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                      />
                      <button
                        type="submit"
                        disabled={!newCommentInput.trim()}
                        className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Gửi</span>
                      </button>
                    </form>

                    {/* Comment list */}
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {comments.map((cm) => (
                        <div
                          key={cm.id}
                          className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex gap-3"
                        >
                          <img
                            src={cm.avatar}
                            alt={cm.author}
                            className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                          />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-200">{cm.author}</span>
                              <span className="text-[10px] text-slate-500">{cm.timeAgo}</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">{cm.content}</p>
                            <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                              <button
                                onClick={() => {
                                  setComments((prev) =>
                                    prev.map((c) =>
                                      c.id === cm.id
                                        ? { ...c, likes: c.likes + (c.userLiked ? -1 : 1), userLiked: !c.userLiked }
                                        : c
                                    )
                                  );
                                }}
                                className={`flex items-center gap-1 hover:text-white transition-colors ${
                                  cm.userLiked ? 'text-rose-400 font-bold' : ''
                                }`}
                              >
                                <ThumbsUp className="w-3 h-3" />
                                <span>{cm.likes}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 4: USER NOTES */}
                {playerTab === 'notes' && (
                  <div className="p-6 space-y-5">
                    <form onSubmit={handleAddNote} className="flex gap-2.5">
                      <input
                        type="text"
                        placeholder="Ghi chú chi tiết đáng nhớ cho tập này..."
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={!newNoteContent.trim()}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Lưu</span>
                      </button>
                    </form>

                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {movieNotes.filter((n) => n.movieSlug === currentMovieDetail.slug).length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-4">Chưa có ghi chú nào cho phim này.</p>
                      ) : (
                        movieNotes
                          .filter((n) => n.movieSlug === currentMovieDetail.slug)
                          .map((nt) => (
                            <div
                              key={nt.id}
                              className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-3"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold">
                                  <span>{nt.episodeName}</span>
                                  <span>·</span>
                                  <span className="text-slate-500">{nt.createdAt}</span>
                                </div>
                                <p className="text-xs text-slate-200">{nt.content}</p>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* MOVIE INFO CARD */}
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
                      {currentMovieDetail.category && currentMovieDetail.category.length > 0 && (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="text-slate-500">Thể loại:</span>
                          <span className="truncate">
                            {currentMovieDetail.category.map((c) => c.name).join(', ')}
                          </span>
                        </div>
                      )}

                      {currentMovieDetail.country && currentMovieDetail.country.length > 0 && (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Globe2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="text-slate-500">Quốc gia:</span>
                          <span className="truncate">
                            {currentMovieDetail.country.map((c) => c.name).join(', ')}
                          </span>
                        </div>
                      )}

                      {currentMovieDetail.director && currentMovieDetail.director.length > 0 && (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Film className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="text-slate-500">Đạo diễn:</span>
                          <span className="truncate">
                            {currentMovieDetail.director.join(', ')}
                          </span>
                        </div>
                      )}

                      {currentMovieDetail.actor && currentMovieDetail.actor.length > 0 && (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="text-slate-500">Diễn viên:</span>
                          <span className="truncate">
                            {currentMovieDetail.actor.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content Synopsis */}
                    {currentMovieDetail.content && (
                      <div className="pt-3 border-t border-slate-800 space-y-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Nội Dung Tác Phẩm
                        </h4>
                        <div
                          className="text-xs text-slate-300 leading-relaxed max-h-36 overflow-y-auto pr-1"
                          dangerouslySetInnerHTML={{ __html: currentMovieDetail.content }}
                        />
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
        /* VIEW B: MAIN CATALOG & FILTER WORKSPACE (3-COLUMN CENTER)            */
        /* ===================================================================== */
        <div className="space-y-6">
          {/* TOP SEARCH & FILTER BAR */}
          <div className="p-4 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm phim, diễn viên hoặc từ khóa (ví dụ: Màu Xanh Cuối Cùng, Lee Min Ho, Hành Động)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-rose-500 font-sans"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow-md shadow-rose-600/20 transition-all shrink-0 active:scale-95"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Tìm Kiếm</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                className={`px-3.5 py-2.5 rounded-2xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  showFilterDrawer || selectedCategory || selectedCountry || selectedYear || selectedType || selectedStatus
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Mở bộ lọc nâng cao"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Bộ Lọc</span>
              </button>

              {onToggleRightSidebar && (
                <button
                  type="button"
                  onClick={onToggleRightSidebar}
                  className={`px-3.5 py-2.5 rounded-2xl border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                    isRightSidebarOpen
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title="Nhấn để mở / đóng Cột 3 (Bảng phát & Trợ lý AI)"
                >
                  <Radio className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">{isRightSidebarOpen ? 'Đóng Cột 3' : 'Mở Cột 3'}</span>
                </button>
              )}
            </form>

            {/* EXPANDABLE FILTER DRAWER (ENDPOINT /api/the-loai/[slug] FILTERS) */}
            {showFilterDrawer && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3 pt-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-rose-400" />
                    <span>Bộ lọc tìm kiếm nâng cao</span>
                  </span>
                  <button
                    onClick={handleResetFilters}
                    className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Đặt lại</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {/* Category / Genre */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Thể Loại
                    </label>
                    <select
                      value={selectedGenreSlug}
                      onChange={(e) => {
                        setSelectedGenreSlug(e.target.value);
                        setActiveTab('genre');
                        setCurrentPage(1);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                    >
                      {categories.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Year */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Năm Phát Hành
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                    >
                      <option value="">Tất cả năm</option>
                      {years.map((y) => (
                        <option key={y.slug || y.name} value={y.slug || y.name}>
                          {y.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Quốc Gia
                    </label>
                    <select
                      value={selectedCountry}
                      onChange={(e) => {
                        setSelectedCountry(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                    >
                      <option value="">Tất cả quốc gia</option>
                      {countries.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Loại Phim
                    </label>
                    <select
                      value={selectedType}
                      onChange={(e) => {
                        setSelectedType(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                    >
                      <option value="">Tất cả loại</option>
                      <option value="series">Phim bộ</option>
                      <option value="single">Phim lẻ điện ảnh</option>
                      <option value="hoathinh">Hoạt hình Anime</option>
                      <option value="tvshows">TV Shows truyền hình</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Trạng Thái
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => {
                        setSelectedStatus(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                    >
                      <option value="">Tất cả trạng thái</option>
                      <option value="completed">Đã hoàn thành</option>
                      <option value="ongoing">Đang phát sóng</option>
                      <option value="trailer">Phim sắp chiếu</option>
                    </select>
                  </div>

                  {/* Limit */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Số Lượng Mỗi Trang
                    </label>
                    <select
                      value={selectedLimit}
                      onChange={(e) => {
                        setSelectedLimit(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                    >
                      <option value={20}>20 phim / trang</option>
                      <option value={24}>24 phim / trang</option>
                      <option value={36}>36 phim / trang</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* PRIMARY CATALOG NAVIGATION TABS */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 border-t border-slate-800 pt-3 scrollbar-none">
              <button
                onClick={() => {
                  setActiveTab('latest');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeTab === 'latest'
                    ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Mới Cập Nhật</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('genre');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeTab === 'genre'
                    ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-rose-400" />
                <span>Theo Thể Loại</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('actors');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeTab === 'actors'
                    ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>Diễn Viên</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500 text-white font-bold">
                  Mới
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('series');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'series'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Phim Bộ
              </button>

              <button
                onClick={() => {
                  setActiveTab('single');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'single'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Phim Lẻ
              </button>

              <button
                onClick={() => {
                  setActiveTab('hoathinh');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'hoathinh'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Hoạt Hình
              </button>

              <button
                onClick={() => {
                  setActiveTab('tvshows');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'tvshows'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                TV Shows
              </button>

              <button
                onClick={() => {
                  setActiveTab('favorites');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                  activeTab === 'favorites'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Heart className="w-3 h-3 text-rose-400" />
                <span>Yêu Thích ({favorites.length})</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('history');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                  activeTab === 'history'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Lịch Sử ({watchHistory.length})</span>
              </button>
            </div>

            {/* GENRE SLUG SELECTOR PILLS IF IN GENRE TAB */}
            {activeTab === 'genre' && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Chọn thể loại phim
                  </span>
                  <span className="text-[10px] text-rose-400 font-mono font-bold">
                    {pagination.totalItems} kết quả
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
                  {categories.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => {
                        setSelectedGenreSlug(cat.slug);
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        selectedGenreSlug === cat.slug
                          ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* TAB CONTENT A: ACTORS BROWSER                                     */}
          {/* ================================================================= */}
          {activeTab === 'actors' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-sky-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Danh Sách Diễn Viên</h3>
                    <p className="text-xs text-slate-400">Chọn diễn viên để xem toàn bộ danh sách phim tham gia</p>
                  </div>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Lọc tên diễn viên..."
                    value={actorSearchQuery}
                    onChange={(e) => setActorSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {isLoadingActors ? (
                <div className="p-16 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                  <p className="text-xs text-slate-400">Đang tải danh sách diễn viên...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {filteredActors.slice(0, 48).map((actor) => (
                    <button
                      key={actor.slug || actor._id}
                      onClick={() => {
                        setSelectedActor(actor);
                        handleSearchExecution(actor.name, 1);
                        if (onShowToast) onShowToast(`Đang tìm các phim của diễn viên: ${actor.name}`);
                      }}
                      className="p-3 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-sky-500/50 hover:bg-slate-800/80 text-left transition-all group flex flex-col items-center text-center space-y-2"
                    >
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-700 group-hover:border-sky-400 transition-colors bg-slate-950 shrink-0">
                        {actor.thumb_url ? (
                          <img
                            src={actor.thumb_url}
                            alt={actor.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-sky-950/40 text-sky-400 font-bold text-sm">
                            {actor.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="w-full min-w-0">
                        <p className="text-xs font-bold text-slate-200 group-hover:text-sky-300 truncate">
                          {actor.name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">{actor.slug}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* ================================================================= */}
          {/* TAB CONTENT B: MOVIE GRID (MOVIES CATALOG)                         */}
          {/* ================================================================= */}
          {activeTab !== 'actors' && (
            <>
              {/* Active Search Term Banner */}
              {activeSearchTerm && (
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-300">
                    Kết quả tìm kiếm cho:{' '}
                    <span className="text-rose-400 font-bold">"{activeSearchTerm}"</span> (
                    {pagination.totalItems} phim)
                  </span>
                  <button
                    onClick={handleClearSearch}
                    className="text-slate-400 hover:text-white text-xs underline"
                  >
                    Xóa tìm kiếm
                  </button>
                </div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="p-16 flex flex-col items-center justify-center space-y-4 text-center">
                  <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
                  <p className="text-xs text-slate-400">Đang nạp danh sách phim từ rạp chiếu...</p>
                </div>
              )}

              {/* Error State */}
              {errorMessage && !isLoading && (
                <div className="p-8 rounded-3xl bg-red-950/40 border border-red-500/40 text-center space-y-3">
                  <p className="text-red-300 text-xs font-semibold">{errorMessage}</p>
                  <button
                    onClick={fetchCatalogMovies}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs"
                  >
                    Thử Lại
                  </button>
                </div>
              )}

              {/* Movie Grid */}
              {!isLoading && !errorMessage && (
                <>
                  {movies.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 space-y-2">
                      <Film className="w-10 h-10 mx-auto text-slate-600" />
                      <p className="text-sm font-semibold text-slate-300">Không tìm thấy phim phù hợp.</p>
                      <p className="text-xs text-slate-500">Vui lòng thử bộ lọc hoặc từ khóa khác.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                      {movies.map((movie) => {
                        const poster = movie.poster_url || movie.thumb_url;
                        return (
                          <div
                            key={movie.slug}
                            onClick={() => handleSelectMovie(movie.slug)}
                            className="group cursor-pointer rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-rose-500/50 hover:bg-slate-800/80 transition-all overflow-hidden flex flex-col shadow-lg"
                          >
                            {/* Poster Aspect Ratio */}
                            <div className="relative aspect-[2/3] w-full bg-slate-950 overflow-hidden">
                              <img
                                src={poster}
                                alt={movie.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />

                              {/* Hover Play Overlay */}
                              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                  <Play className="w-4 h-4 fill-white translate-x-0.5" />
                                </div>
                              </div>

                              {/* Badges on poster */}
                              <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
                                {movie.quality && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-500 text-slate-950 shadow-md">
                                    {movie.quality}
                                  </span>
                                )}
                                {movie.lang && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-500 text-slate-950 shadow-md">
                                    {movie.lang}
                                  </span>
                                )}
                              </div>

                              {movie.episode_current && (
                                <div className="absolute bottom-2 right-2 pointer-events-none">
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-950/80 text-white backdrop-blur-sm border border-slate-700">
                                    {movie.episode_current}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Card Details */}
                            <div className="p-3 flex-1 flex flex-col justify-between space-y-1">
                              <div>
                                <h3 className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors line-clamp-1">
                                  {movie.name}
                                </h3>
                                {movie.origin_name && (
                                  <p className="text-[10px] text-slate-400 font-mono truncate">
                                    {movie.origin_name}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                                <span>{movie.year || '2024'}</span>
                                {movie.tmdb?.vote_average && (
                                  <span className="flex items-center gap-0.5 text-yellow-400 font-semibold">
                                    <Star className="w-2.5 h-2.5 fill-yellow-400" />
                                    <span>{movie.tmdb.vote_average}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Pagination Bar */}
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-6">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 text-xs font-semibold flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Trang Trước</span>
                      </button>

                      <div className="px-3 py-1 text-xs font-mono font-bold text-slate-300">
                        Trang <span className="text-rose-400">{currentPage}</span> / {pagination.totalPages}
                      </div>

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                        disabled={currentPage >= pagination.totalPages}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 text-xs font-semibold flex items-center gap-1"
                      >
                        <span>Trang Sau</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Prioritized Standalone 300x250 Banner in Movie Catalog Footer */}
              <div className="pt-4 border-t border-slate-800/70 flex justify-center">
                <StandaloneBanner300x250 />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
