import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  FileArchive,
  FileSpreadsheet,
  FileCode,
  Download,
  Upload,
  Plus,
  Trash2,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Lock,
  Unlock,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  FolderDown,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  DocumentItem,
  PayPalSettings,
  DocumentSettings,
  getStoredDocuments,
  saveStoredDocuments,
  getStoredPayPalSettings,
  getStoredDocumentSettings,
  getUnlockedPaidDocIds,
  markDocAsUnlocked,
  detectFileType,
  INITIAL_DEFAULT_DOCUMENTS,
} from '../types/documents';
import { useAdminAuth } from '../context/AdminAuthContext';
import { getAdminAuthHeaders } from '../utils/adminAuth';
import { getApiBaseUrl } from '../utils/api';

interface DocumentLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  paypalSettings?: PayPalSettings;
  documentSettings?: DocumentSettings;
  onShowToast?: (msg: string) => void;
}

export const DocumentLibraryModal: React.FC<DocumentLibraryModalProps> = ({
  isOpen,
  onClose,
  paypalSettings: propPayPal,
  documentSettings: propDocSettings,
  onShowToast,
}) => {
  const { isAdmin } = useAdminAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>(getStoredDocuments);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pdf' | 'zip' | 'doc' | 'excel'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'browse' | 'add'>('browse');

  // Checkout modal state for PayPal payment
  const [checkoutDoc, setCheckoutDoc] = useState<DocumentItem | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [paypalPayerEmail, setPaypalPayerEmail] = useState<string>('');

  // Unlocked IDs
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(getUnlockedPaidDocIds);

  // New Document Form State (Admin)
  const [newTitle, setNewTitle] = useState<string>('');
  const [newFileName, setNewFileName] = useState<string>('');
  const [newFileSize, setNewFileSize] = useState<string>('');
  const [newFileType, setNewFileType] = useState<'pdf' | 'zip' | 'doc' | 'excel' | 'other'>('pdf');
  const [newFileUrl, setNewFileUrl] = useState<string>('');
  const [newFileData, setNewFileData] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newRequirePayment, setNewRequirePayment] = useState<boolean>(false);
  const [newPrice, setNewPrice] = useState<number>(1.99);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const paypalCfg = propPayPal || getStoredPayPalSettings();
  const docCfg = propDocSettings || getStoredDocumentSettings();

  // Load documents from server API
  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.documents) && data.documents.length > 0) {
          setDocuments(data.documents);
          saveStoredDocuments(data.documents);
          setIsLoading(false);
          return;
        }
      }
    } catch {}
    setDocuments(getStoredDocuments());
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
      setUnlockedIds(getUnlockedPaidDocIds());
      setUploadError(null);
      setPaymentSuccess(false);
      setCheckoutDoc(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Check if a document requires payment:
  // Must satisfy: Document requirePayment is true, system has paywall active (or PayPal enabled), AND user hasn't paid yet
  const isDocLocked = (doc: DocumentItem): boolean => {
    if (!doc.requirePayment) return false;
    // Admin toggled off globally?
    if (!docCfg.enablePaywall && !paypalCfg.enabled) return false;
    // User already unlocked on this browser?
    if (unlockedIds.has(doc.id)) return false;
    // Admins bypass payment lock
    if (isAdmin) return false;
    return true;
  };

  // Handle Download trigger
  const handleDownload = async (doc: DocumentItem) => {
    // If locked, open PayPal checkout
    if (isDocLocked(doc)) {
      setCheckoutDoc(doc);
      setPaymentSuccess(false);
      return;
    }

    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(doc.id)}/download-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const data = await res.json();
        // Update local download count
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, downloadCount: (d.downloadCount || 0) + 1 } : d))
        );

        if (data.directUrl && (data.directUrl.startsWith('http://') || data.directUrl.startsWith('https://'))) {
          // Open direct download in background
          const a = document.createElement('a');
          a.href = data.directUrl;
          a.download = doc.fileName || 'tai_lieu.dat';
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          window.location.href = data.downloadUrl || `/api/documents/${encodeURIComponent(doc.id)}/download`;
        }

        if (onShowToast) onShowToast(`📥 Đang tải tệp "${doc.fileName}"...`);
      } else {
        // Fallback direct link
        window.open(doc.fileUrl, '_blank');
      }
    } catch {
      window.open(doc.fileUrl, '_blank');
    }
  };

  // Handle PayPal Payment Simulation / Live Checkout
  const handleProcessPayPalPayment = async () => {
    if (!checkoutDoc) return;
    setIsProcessingPayment(true);

    // Simulate PayPal API verification delay
    setTimeout(async () => {
      markDocAsUnlocked(checkoutDoc.id);
      setUnlockedIds((prev) => new Set([...prev, checkoutDoc.id]));
      setIsProcessingPayment(false);
      setPaymentSuccess(true);

      if (onShowToast) {
        onShowToast(`🎉 Thanh toán thành công! Tệp "${checkoutDoc.fileName}" đã được mở khóa.`);
      }

      // Automatically initiate file download
      setTimeout(() => {
        handleDownload(checkoutDoc);
      }, 700);
    }, 1200);
  };

  // Handle Local File Upload Selection (Admin)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowed = docCfg.allowedExtensions || ['zip', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];

    if (!allowed.includes(ext)) {
      setUploadError(
        `Định dạng .${ext} không nằm trong danh sách cho phép (${allowed.join(', ')}). Admin có thể cấu hình thêm định dạng trong Cài Đặt.`
      );
      return;
    }

    const maxMb = docCfg.maxFileSizeMb || 50;
    if (file.size > maxMb * 1024 * 1024) {
      setUploadError(`Kích thước file vượt quá giới hạn ${maxMb}MB.`);
      return;
    }

    setUploadError(null);
    setNewFileName(file.name);
    if (!newTitle) {
      setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    // Format human-readable file size
    const sizeStr =
      file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(0)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    setNewFileSize(sizeStr);
    setNewFileType(detectFileType(file.name));

    // Read base64
    const reader = new FileReader();
    reader.onload = () => {
      setNewFileData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle Save New Document (Admin)
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setUploadError('Vui lòng nhập tiêu đề tài liệu');
      return;
    }
    if (!newFileName.trim()) {
      setUploadError('Vui lòng chọn file tải lên hoặc nhập tên file');
      return;
    }
    if (!newFileData && !newFileUrl.trim()) {
      setUploadError('Vui lòng tải lên file hoặc nhập đường dẫn (URL) tải file');
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);

    const docItem: DocumentItem = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newTitle.trim(),
      fileName: newFileName.trim(),
      fileSize: newFileSize || '1.0 MB',
      fileType: newFileType,
      fileUrl: newFileUrl.trim() || `/api/documents/uploaded/${encodeURIComponent(newFileName)}`,
      fileData: newFileData || undefined,
      isUploaded: Boolean(newFileData),
      requirePayment: newRequirePayment,
      price: newPrice,
      currency: paypalCfg.currency || 'USD',
      description: newDescription.trim() || 'Tài liệu số kênh Minh Hiếu Official VN',
      downloadCount: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      const authHeaders = getAdminAuthHeaders();
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(docItem),
      });

      if (res.ok) {
        const savedData = await res.json();
        const finalDoc = savedData.document || docItem;
        setDocuments((prev) => [finalDoc, ...prev]);
        saveStoredDocuments([finalDoc, ...documents]);
        setActiveTab('browse');
        // Reset form
        setNewTitle('');
        setNewFileName('');
        setNewFileSize('');
        setNewFileUrl('');
        setNewFileData('');
        setNewDescription('');
        setNewRequirePayment(false);

        if (onShowToast) onShowToast('✅ Đã thêm tài liệu thành công vào cơ sở dữ liệu!');
      } else {
        const err = await res.json().catch(() => ({}));
        setUploadError(err.error || 'Lỗi lưu tài liệu lên máy chủ.');
      }
    } catch {
      // Local fallback
      setDocuments((prev) => [docItem, ...prev]);
      saveStoredDocuments([docItem, ...documents]);
      setActiveTab('browse');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Document (Admin)
  const handleDeleteDocument = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc muốn xóa tài liệu "${title}" khỏi hệ thống?`)) return;

    try {
      const authHeaders = getAdminAuthHeaders();
      await fetch(`/api/documents/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { ...authHeaders },
      });
    } catch {}

    const updated = documents.filter((d) => d.id !== id);
    setDocuments(updated);
    saveStoredDocuments(updated);
    if (onShowToast) onShowToast('🗑️ Đã xóa tài liệu khỏi danh sách.');
  };

  // Filtered documents
  const filteredDocs = documents.filter((doc) => {
    const matchSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'pdf') return doc.fileType === 'pdf';
    if (selectedFilter === 'zip') return doc.fileType === 'zip';
    if (selectedFilter === 'doc') return doc.fileType === 'doc' || doc.fileType === 'docx';
    if (selectedFilter === 'excel') return doc.fileType === 'excel' || doc.fileType === 'xls' || doc.fileType === 'xlsx';
    return true;
  });

  const getFileBadge = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'pdf') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <FileText className="w-3 h-3 text-rose-400" />
          <span>PDF</span>
        </span>
      );
    }
    if (t === 'zip' || t === 'rar' || t === '7z') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <FileArchive className="w-3 h-3 text-amber-400" />
          <span>ZIP</span>
        </span>
      );
    }
    if (t === 'doc' || t === 'docx') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
          <FileText className="w-3 h-3 text-blue-400" />
          <span>WORD</span>
        </span>
      );
    }
    if (t === 'excel' || t === 'xls' || t === 'xlsx' || t === 'csv') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
          <span>EXCEL</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
        <FileCode className="w-3 h-3 text-purple-400" />
        <span>{t.toUpperCase()}</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
              <FolderDown className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  Kho Tài Liệu &amp; Tải Xuống
                </h3>
                {paypalCfg.enabled && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <CreditCard className="w-2.5 h-2.5" />
                    <span>PayPal Sẵn Sàng</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Tải kịch bản phim, file audio, mẫu Word, bảng tính Excel kênh Minh Hiếu Official VN
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher & Search Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-950/50 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('browse')}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'browse'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Danh Sách Tài Liệu ({filteredDocs.length})</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => setActiveTab('add')}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'add'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm File Mới (Admin)</span>
                </button>
              )}
            </div>

            <button
              onClick={loadDocuments}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors"
              title="Làm mới danh sách"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
          </div>

          {activeTab === 'browse' && (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm tài liệu PDF, kịch bản, bảng tính..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Format filters */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                {(['all', 'pdf', 'zip', 'doc', 'excel'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setSelectedFilter(fmt)}
                    className={`py-1.5 px-2.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                      selectedFilter === fmt
                        ? 'bg-slate-800 text-amber-400 border border-amber-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {fmt === 'all'
                      ? 'Tất cả'
                      : fmt === 'pdf'
                      ? 'PDF'
                      : fmt === 'zip'
                      ? 'ZIP / Nén'
                      : fmt === 'doc'
                      ? 'Word'
                      : 'Excel'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-300">
          {activeTab === 'browse' ? (
            filteredDocs.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <FolderDown className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-400">Không tìm thấy tài liệu nào phù hợp</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Hãy thử tìm kiếm với từ khóa khác hoặc chuyển bộ lọc định dạng tệp.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredDocs.map((doc) => {
                  const locked = isDocLocked(doc);
                  const isPaid = doc.requirePayment;

                  return (
                    <div
                      key={doc.id}
                      className="p-3.5 sm:p-4 bg-slate-950/80 rounded-2xl border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0 text-slate-300">
                          {getFileBadge(doc.fileType)}
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-white text-xs sm:text-sm truncate">
                              {doc.title}
                            </h4>
                            {isPaid ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  locked
                                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                }`}
                              >
                                {locked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                                <span>
                                  {locked
                                    ? `${doc.price || 1.99} ${doc.currency || 'USD'}`
                                    : 'Đã mở khóa'}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <span>Miễn Phí</span>
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-400 line-clamp-2">
                            {doc.description || 'Tài liệu chuẩn từ Minh Hiếu Official VN'}
                          </p>

                          <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                            <span className="text-slate-300 truncate font-semibold">
                              {doc.fileName}
                            </span>
                            <span>•</span>
                            <span>{doc.fileSize}</span>
                            <span>•</span>
                            <span>{doc.downloadCount || 0} lượt tải</span>
                          </div>
                        </div>
                      </div>

                      {/* Download or PayPal Button */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteDocument(doc.id, doc.title)}
                            className="p-2 text-slate-500 hover:text-rose-400 rounded-xl hover:bg-slate-900 transition-colors"
                            title="Xóa tài liệu (Admin)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDownload(doc)}
                          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                            locked
                              ? 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold shadow-amber-500/20'
                              : 'bg-blue-600 hover:bg-blue-500 text-white'
                          }`}
                        >
                          {locked ? (
                            <>
                              <CreditCard className="w-3.5 h-3.5 text-slate-950" />
                              <span>PayPal &amp; Tải (${doc.price || 1.99})</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5 text-white" />
                              <span>Tải File Ngay</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Tab: Add Document (Admin) */
            <form onSubmit={handleCreateDocument} className="space-y-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center gap-2 text-xs text-blue-300">
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  Admin có thể upload trực tiếp file từ máy tính (ZIP, PDF, Word, Excel) hoặc dán link URL ngoài để chia sẻ cho khán giả.
                </span>
              </div>

              {uploadError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label className="font-bold text-white text-xs">Tiêu đề tài liệu:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tuyển tập kịch bản phim trọn bộ tập 1 - 64"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* File upload or URL selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-white text-xs">Chọn file từ máy tính:</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept={docCfg.allowedExtensions?.map((x) => `.${x}`).join(',') || '.zip,.pdf,.doc,.docx,.xls,.xlsx'}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 bg-slate-950 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-amber-500 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition-all"
                  >
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>{newFileName ? `Đã chọn: ${newFileName}` : 'Duyệt file từ máy (.zip, .pdf, .docx, .xlsx)'}</span>
                  </button>
                  <p className="text-[10px] text-slate-500">
                    Cho phép: {docCfg.allowedExtensions?.join(', ') || 'zip, pdf, doc, docx, xls, xlsx'} (Tối đa {docCfg.maxFileSizeMb || 50}MB)
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-white text-xs">Hoặc dán Link URL file tải ngoài:</label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/... hoặc direct URL"
                    value={newFileUrl}
                    onChange={(e) => {
                      setNewFileUrl(e.target.value);
                      if (!newFileName && e.target.value) {
                        const parts = e.target.value.split('/');
                        const candidate = parts[parts.length - 1].split('?')[0];
                        if (candidate) {
                          setNewFileName(candidate);
                          setNewFileType(detectFileType(candidate));
                        }
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* File meta row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-white text-xs">Tên file hiển thị:</label>
                  <input
                    type="text"
                    placeholder="kich_ban_xuyen_khong.pdf"
                    value={newFileName}
                    onChange={(e) => {
                      setNewFileName(e.target.value);
                      setNewFileType(detectFileType(e.target.value));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-white text-xs">Định dạng file:</label>
                  <select
                    value={newFileType}
                    onChange={(e) => setNewFileType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="pdf">PDF Document (.pdf)</option>
                    <option value="zip">Tệp Nén (.zip, .rar, .7z)</option>
                    <option value="doc">Văn Bản Word (.doc, .docx)</option>
                    <option value="excel">Bảng Tính Excel (.xls, .xlsx)</option>
                    <option value="other">Định dạng khác</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-white text-xs">Kích thước (ước tính):</label>
                  <input
                    type="text"
                    placeholder="2.4 MB"
                    value={newFileSize}
                    onChange={(e) => setNewFileSize(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-bold text-white text-xs">Mô tả tóm tắt nội dung file:</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú nội dung tài liệu, hướng dẫn sử dụng hoặc thông tin tệp..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Payment Setting for this file */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                      <span>Yêu cầu thanh toán PayPal để tải file này</span>
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Nếu bật, người dùng phải thanh toán trước khi file bắt đầu tải. Nếu tắt, tải bình thường.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={newRequirePayment}
                    onChange={(e) => setNewRequirePayment(e.target.checked)}
                    className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                  />
                </div>

                {newRequirePayment && (
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-3">
                    <label className="text-xs text-slate-300 font-semibold whitespace-nowrap">
                      Giá tải file ($ USD):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={newPrice}
                      onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                      className="w-32 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[11px] text-slate-500">
                      (Tương đương ~{(newPrice * 25400).toLocaleString('vi-VN')} VNĐ)
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('browse')}
                  className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2 px-5 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 disabled:opacity-60"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Đang Lưu...' : 'Lưu Tài Liệu Lên Data'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Định dạng hỗ trợ:</span>
            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-rose-300">PDF</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-amber-300">ZIP</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-blue-300">Word</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-emerald-300">Excel</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* PayPal Payment Checkout Modal */}
      {checkoutDoc && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold shadow-md">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Thanh Toán PayPal Tải Tệp</h4>
                  <p className="text-[11px] text-slate-400">Cổng thanh toán bảo mật trực tuyến</p>
                </div>
              </div>
              <button
                onClick={() => setCheckoutDoc(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {paymentSuccess ? (
              <div className="text-center py-6 space-y-3 animate-in zoom-in-95">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-base font-extrabold text-white">Thanh Toán Thành Công!</h4>
                <p className="text-xs text-slate-300">
                  Tài liệu <span className="font-semibold text-amber-300">{checkoutDoc.fileName}</span> đã được mở khóa và đang tự động tải về máy của bạn.
                </p>
                <button
                  onClick={() => setCheckoutDoc(null)}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md"
                >
                  Hoàn Tất &amp; Đóng
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Order Summary */}
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-white text-xs">{checkoutDoc.title}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {checkoutDoc.fileName} ({checkoutDoc.fileSize})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-amber-400 text-sm">
                        ${checkoutDoc.price || 1.99} {checkoutDoc.currency || 'USD'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        ~{((checkoutDoc.price || 1.99) * 25400).toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] text-slate-400 font-semibold">
                    Email tài khoản PayPal (Tùy chọn):
                  </label>
                  <input
                    type="email"
                    placeholder="nguyenvana@gmail.com"
                    value={paypalPayerEmail}
                    onChange={(e) => setPaypalPayerEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  {/* PayPal Primary Checkout Button */}
                  <button
                    onClick={handleProcessPayPalPayment}
                    disabled={isProcessingPayment}
                    className="w-full py-2.5 px-4 bg-[#FFC439] hover:bg-[#F2BA36] text-[#003087] font-extrabold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
                  >
                    <CreditCard className="w-4 h-4 text-[#003087]" />
                    <span>
                      {isProcessingPayment
                        ? 'Đang xác thực giao dịch PayPal...'
                        : `Thanh toán $${checkoutDoc.price || 1.99} với PayPal`}
                    </span>
                  </button>

                  <p className="text-[10px] text-center text-slate-500">
                    Bảo mật chuẩn mã hóa SSL 256-bit. Sau khi thanh toán, tệp sẽ được tải ngay về máy.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
