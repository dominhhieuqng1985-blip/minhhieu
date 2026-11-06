import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  ShoppingBag,
  Sparkles,
  Heart,
  QrCode,
  CheckCircle2,
  Copy,
  Coins,
  X,
  Plus,
  Minus,
  Gift,
  Flame,
} from 'lucide-react';
import {
  TempleMemberRecord,
  MemorialTombRecord,
  TempleMeritRecord,
  TempleAdminPaymentSettings,
  DEFAULT_TEMPLE_ADMIN_PAYMENT,
} from '../../data/buddhistTempleData';
import { resolveApiEndpoint, safeFetchJson } from '../../utils/api';
import { getMemberAuthHeaders } from '../../utils/templeMemberAuth';

interface StoreOfferingItem {
  id: string;
  name: string;
  category: 'flower' | 'fruit' | 'incense_light' | 'feast';
  price: number;
  meritPoints: number;
  icon: string;
  description: string;
  suitableFor: 'all' | 'temple' | 'tomb';
}

const STORE_OFFERING_ITEMS: StoreOfferingItem[] = [
  // 1. Hoa tươi
  {
    id: 'fl-lotus-white',
    name: 'Bó Hoa Sen Trắng Tinh Khiết',
    category: 'flower',
    price: 50000,
    meritPoints: 50,
    icon: '🪷',
    description: 'Biểu trưng thanh tịnh, vô nhiễm giải thoát của chư Phật và hương linh siêu thoát.',
    suitableFor: 'all',
  },
  {
    id: 'fl-chrysanth-gold',
    name: 'Lẵng Hoa Cúc Vàng Đại Bi',
    category: 'flower',
    price: 80000,
    meritPoints: 80,
    icon: '🌼',
    description: 'Sắc vàng trang nghiêm, cầu trường thọ, cát tường và lòng hiếu hạnh phụng dưỡng.',
    suitableFor: 'all',
  },
  {
    id: 'fl-orchid-purple',
    name: 'Chậu Lan Hồ Điệp Quý Phái',
    category: 'flower',
    price: 150000,
    meritPoints: 150,
    icon: '🌸',
    description: 'Thanh nhã tôn nghiêm, dâng lên cúng dường Tam Bảo hoặc trang hoàng phần mộ.',
    suitableFor: 'all',
  },
  {
    id: 'fl-lily-white',
    name: 'Bình Hoa Ly Trắng Tinh Khôi',
    category: 'flower',
    price: 90000,
    meritPoints: 90,
    icon: '💐',
    description: 'Hương thơm ngan ngát, dâng cúng chư Bồ Tát và cầu nguyện hương linh vãng sanh.',
    suitableFor: 'all',
  },

  // 2. Trái cây & Ngũ quả
  {
    id: 'fr-ngu-qua-phat',
    name: 'Mâm Ngũ Quả Cúng Phật Thượng Hạng',
    category: 'fruit',
    price: 120000,
    meritPoints: 120,
    icon: '🍎',
    description: 'Đầy đủ 5 loại quả quý: Bưởi, Thanh long, Xoài cát, Táo đỏ, Nho Mỹ tượng trưng Ngũ Hành.',
    suitableFor: 'all',
  },
  {
    id: 'fr-buoi-xoai',
    name: 'Đĩa Bưởi Da Xanh & Xoài Cát Hòa Lộc',
    category: 'fruit',
    price: 85000,
    meritPoints: 85,
    icon: '🍐',
    description: 'Trái cây đặc sản Nam Bộ tươi ngọt, dâng cúng trang nghiêm thanh tịnh.',
    suitableFor: 'all',
  },
  {
    id: 'fr-gio-trai-cay-nhap-khau',
    name: 'Giỏ Trái Cây Nhập Khẩu Đại Cát',
    category: 'fruit',
    price: 250000,
    meritPoints: 250,
    icon: '🍇',
    description: 'Nho Mẫu Đơn, Táo Envy, Kiwi New Zealand kết lẵng lụa vàng trang trọng.',
    suitableFor: 'all',
  },

  // 3. Nhang đèn & Dầu lạc
  {
    id: 'in-tram-huong-xu-quang',
    name: 'Hộp Trầm Hương Xứ Quảng Thượng Đẳng',
    category: 'incense_light',
    price: 60000,
    meritPoints: 60,
    icon: '🪔',
    description: 'Khói trầm thơm mát thanh lọc không gian, thông linh ba cõi, dâng cúng đại bi.',
    suitableFor: 'all',
  },
  {
    id: 'in-den-hoa-dang',
    name: 'Cặp Đèn Cầy Hoa Sen Lung Linh',
    category: 'incense_light',
    price: 45000,
    meritPoints: 45,
    icon: '🕯️',
    description: 'Ngọn đèn Bát Nhã thắp sáng trí tuệ, xua tan vô minh, chiếu soi phần mộ ấm áp.',
    suitableFor: 'all',
  },
  {
    id: 'in-dau-thap-den',
    name: 'Bình Dầu Lạc Thắp Đèn Tam Bảo',
    category: 'incense_light',
    price: 70000,
    meritPoints: 70,
    icon: '🛢️',
    description: 'Dầu thực vật tinh khiết thắp sáng đèn chánh điện ngày đêm bất diệt.',
    suitableFor: 'temple',
  },

  // 4. Mâm cơm chay & Trà sen
  {
    id: 'fe-com-chay-7-mon',
    name: 'Mâm Cơm Chay Thanh Tịnh 7 Món',
    category: 'feast',
    price: 180000,
    meritPoints: 180,
    icon: '🍲',
    description: 'Cơm hạt sen, canh nấm ngũ sắc, nem chay hoa đăng, giò lụa chay, đậu hũ sốt nấm.',
    suitableFor: 'all',
  },
  {
    id: 'fe-tra-sen-cung-dinh',
    name: 'Ấm Trà Sen Cung Đình & Bánh Khảo',
    category: 'feast',
    price: 55000,
    meritPoints: 55,
    icon: '🍵',
    description: 'Trà sen ướp hoa tươi thuần khiết dâng cúng chư Phật hoặc kính dâng gia tiên.',
    suitableFor: 'all',
  },
  {
    id: 'fe-tinh-thuy-cam-lo',
    name: 'Bình Tịnh Thủy Cam Lộ Thanh Lương',
    category: 'feast',
    price: 30000,
    meritPoints: 30,
    icon: '🍶',
    description: 'Nước nguồn thanh khiết tượng trưng tâm bồ đề nhuận hóa khắp chúng sanh.',
    suitableFor: 'all',
  },
];

interface UniversalOfferingsStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTargetName?: string;
  currentMember?: TempleMemberRecord | null;
  tombs?: MemorialTombRecord[];
  paymentSettings?: TempleAdminPaymentSettings;
  onOfferSuccess: (record: TempleMeritRecord) => void;
  onShowToast: (msg: string) => void;
}

export const UniversalOfferingsStoreModal: React.FC<UniversalOfferingsStoreModalProps> = ({
  isOpen,
  onClose,
  initialTargetName = 'Chánh Điện Đại Bi Tự',
  currentMember = null,
  tombs = [],
  paymentSettings = DEFAULT_TEMPLE_ADMIN_PAYMENT,
  onOfferSuccess,
  onShowToast,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'flower' | 'fruit' | 'incense_light' | 'feast'>('all');
  const [targetType, setTargetType] = useState<'temple' | 'tomb'>(
    initialTargetName.includes('Mộ') || initialTargetName.includes('Khu Mộ') ? 'tomb' : 'temple'
  );
  const [targetName, setTargetName] = useState<string>(initialTargetName);
  const [donorName, setDonorName] = useState<string>(
    currentMember?.fullName || 'Phật tử ẩn danh'
  );
  const [dharmaName, setDharmaName] = useState<string>(currentMember?.dharmaName || '');
  const [prayerWishes, setPrayerWishes] = useState<string>(
    'Cầu cho quốc thái dân an, gia quyến bình an, tổ tiên siêu thăng tịnh độ.'
  );

  // Cart: item ID -> quantity
  const [cart, setCart] = useState<Record<string, number>>({
    'fl-lotus-white': 1,
    'fr-ngu-qua-phat': 1,
  });

  const [paymentMethod, setPaymentMethod] = useState<'vietqr' | 'merit_points' | 'free_pray'>('vietqr');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showQrConfirmation, setShowQrConfirmation] = useState<boolean>(false);

  const filteredItems = useMemo(() => {
    return STORE_OFFERING_ITEMS.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (targetType === 'tomb' && item.suitableFor === 'temple') return false;
      return true;
    });
  }, [selectedCategory, targetType]);

  const { totalAmount, totalMerit } = useMemo(() => {
    let amt = 0;
    let pts = 0;
    Object.entries(cart).forEach(([id, qty]) => {
      const item = STORE_OFFERING_ITEMS.find((it) => it.id === id);
      if (item && qty > 0) {
        amt += item.price * qty;
        pts += item.meritPoints * qty;
      }
    });
    return { totalAmount: amt, totalMerit: pts };
  }, [cart]);

  const selectedItemsSummary = useMemo(() => {
    return Object.entries(cart)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = STORE_OFFERING_ITEMS.find((it) => it.id === id);
        return `${item?.name || id} (x${qty})`;
      })
      .join(', ');
  }, [cart]);

  if (!isOpen) return null;

  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  // Dynamic VietQR payment URL for Temple Admin account
  const vietQrUrl = `https://img.vietqr.io/image/${paymentSettings.bankId}-${paymentSettings.accountNo}-compact2.png?amount=${totalAmount}&addInfo=${encodeURIComponent(
    `CUNG DUONG ${donorName.substring(0, 15)}`
  )}&accountName=${encodeURIComponent(paymentSettings.accountName)}`;

  const handleCompleteOffering = async () => {
    if (Object.keys(cart).length === 0 || totalAmount === 0) {
      onShowToast('Vui lòng chọn ít nhất một lễ vật để dâng cúng.');
      return;
    }

    setIsSubmitting(true);
    try {
      const record: TempleMeritRecord = {
        id: 'rec-' + Date.now(),
        createdAt: new Date().toISOString(),
        donorName: donorName.trim() || 'Phật tử thập phương',
        dharmaName: dharmaName.trim() || undefined,
        phone: currentMember?.phone,
        address: currentMember?.address,
        prayerType: targetType === 'temple' ? 'cau-an' : 'cau-sieu',
        prayerText: prayerWishes.trim() || `Dâng lễ vật tại ${targetName}`,
        sutraTitle: selectedItemsSummary || 'Lễ Vật Hoa Quả Trái Cây',
        items: Object.entries(cart)
          .filter(([_, qty]) => qty > 0)
          .map(([id, qty]) => {
            const it = STORE_OFFERING_ITEMS.find((item) => item.id === id);
            return {
              itemId: id,
              itemName: it?.name || id,
              quantity: qty,
              price: it?.price || 0,
              subtotal: (it?.price || 0) * qty,
            };
          }),
        customDonation: 0,
        totalAmount: paymentMethod === 'free_pray' ? 0 : totalAmount,
        totalMeritPoints: totalMerit,
        paymentMethod: paymentMethod === 'vietqr' ? 'vietqr_admin' : 'tuy-tam',
        paymentStatus: 'completed',
        memberId: currentMember?.id,
      };

      // Persist to Neon PostgreSQL
      const memberHeaders = getMemberAuthHeaders();
      await safeFetchJson(resolveApiEndpoint('temple/merit-records'), {
        method: 'POST',
        headers: {
          ...memberHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#fbbf24', '#10b981', '#3b82f6', '#ec4899'],
      });

      onOfferSuccess(record);
      onShowToast(
        `Dâng lễ vật thành công (+${totalMerit} Điểm Công Đức)! Đã lưu thông tin ghi danh vào cơ sở dữ liệu.`
      );
      onClose();
    } catch (err: any) {
      onShowToast(err?.message || 'Lỗi khi lưu thông tin dâng cúng');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="max-w-4xl w-full max-h-[92vh] bg-slate-900 border border-amber-500/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-amber-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-500 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30 shrink-0 font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                Cửa Hàng Lễ Vật &amp; Hoa Quả • Chùa &amp; Hoa Viên
              </span>
              <h2 className="text-base sm:text-lg font-black text-amber-300">
                Shop Hoa Tươi, Mâm Ngũ Quả &amp; Lễ Vật Cúng Dường
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Destination & Filter Bar */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Target type switcher */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold">Dâng lễ tại:</span>
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setTargetType('temple');
                  setTargetName('Chánh Điện Đại Bi Tự');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  targetType === 'temple'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                🪷 Cúng Dường Chùa
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetType('tomb');
                  if (tombs.length > 0) {
                    setTargetName(`Mộ ${tombs[0].deceasedFullName} (${tombs[0].plotCode})`);
                  } else {
                    setTargetName('Hoa Viên Khu Mộ Gia Tộc');
                  }
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  targetType === 'tomb'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                🪦 Đi Viếng Khu Mộ
              </button>
            </div>
          </div>

          {/* Target Hall or Tomb picker */}
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            {targetType === 'temple' ? (
              <select
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-amber-300 focus:outline-none focus:border-amber-500 font-semibold"
              >
                <option value="Chánh Điện Đại Bi Tự (Đại Hùng Bảo Điện)">Đại Hùng Bảo Điện (Chánh Điện)</option>
                <option value="Điện Phật Thích Ca Mâu Ni">Điện Phật Thích Ca Mâu Ni</option>
                <option value="Điện Bồ Tát Quán Thế Âm">Điện Bồ Tát Quán Thế Âm</option>
                <option value="Điện Đại Nguyện Địa Tạng Vương Bồ Tát">Điện Địa Tạng Vương Bồ Tát</option>
                <option value="Vườn Thập Bát La Hán">Vườn Thập Bát La Hán</option>
                <option value="Nhà Tổ & Tăng Xá">Nhà Tổ &amp; Tăng Xá</option>
              </select>
            ) : (
              <select
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-amber-300 focus:outline-none focus:border-amber-500 font-semibold"
              >
                <option value="Hoa Viên Khu Mộ Gia Tộc">Tất Cả Hương Linh Hoa Viên</option>
                {tombs.map((t) => (
                  <option key={t.id} value={`Mộ ${t.deceasedFullName} (${t.plotCode})`}>
                    Mộ #{t.plotCode}: {t.deceasedFullName}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'Tất Cả Lễ Vật', icon: '✨' },
            { id: 'flower', label: 'Hoa Tươi & Lẵng Hoa', icon: '💐' },
            { id: 'fruit', label: 'Mâm Ngũ Quả & Trái Cây', icon: '🍇' },
            { id: 'incense_light', label: 'Nhang Đèn & Dầu Lạc', icon: '🪔' },
            { id: 'feast', label: 'Mâm Cơm Chay & Trà', icon: '🍲' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Main Content: Store Grid + Cart Dock */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Items Catalog (2 cols on large screen) */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredItems.map((item) => {
              const qty = cart[item.id] || 0;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                    qty > 0
                      ? 'bg-amber-950/20 border-amber-500/50 shadow-md shadow-amber-500/10'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-3xl p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                        {item.icon}
                      </span>
                      <div className="text-right">
                        <span className="text-sm font-black text-amber-400 block">
                          {item.price.toLocaleString('vi-VN')} đ
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold">
                          +{item.meritPoints} Điểm Công Đức
                        </span>
                      </div>
                    </div>
                    <h4 className="font-bold text-xs text-white line-clamp-1">{item.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Số lượng:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-bold text-xs text-amber-300">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, 1)}
                        className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Checkout & Ghi Danh */}
          <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-3.5 text-xs">
              <h3 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400" />
                <span>Ghi Danh &amp; Hồi Hướng Công Đức</span>
              </h3>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">
                  Họ tên người dâng lễ / Phật tử: *
                </label>
                <input
                  type="text"
                  required
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">
                  Pháp danh (nếu có):
                </label>
                <input
                  type="text"
                  value={dharmaName}
                  onChange={(e) => setDharmaName(e.target.value)}
                  placeholder="Ví dụ: Diệu Tâm, Nhuận Trí"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">
                  Lời nguyện cầu / Chúc thư / Hồi hướng:
                </label>
                <textarea
                  rows={2}
                  value={prayerWishes}
                  onChange={(e) => setPrayerWishes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 resize-none font-serif text-[11px]"
                />
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-slate-400 font-semibold block mb-1.5">
                  Hình thức thanh toán / Công đức:
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="store_payment"
                      checked={paymentMethod === 'vietqr'}
                      onChange={() => setPaymentMethod('vietqr')}
                      className="accent-amber-500"
                    />
                    <QrCode className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold text-slate-200">
                      Quét mã VietQR Chùa ({paymentSettings.bankId} • {paymentSettings.accountNo})
                    </span>
                  </label>

                  {currentMember && (
                    <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="store_payment"
                        checked={paymentMethod === 'merit_points'}
                        onChange={() => setPaymentMethod('merit_points')}
                        className="accent-amber-500"
                      />
                      <Coins className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold text-slate-200">
                        Khấu trừ điểm công đức TV ({currentMember.meritPoints || 0} điểm)
                      </span>
                    </label>
                  )}

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="store_payment"
                      checked={paymentMethod === 'free_pray'}
                      onChange={() => setPaymentMethod('free_pray')}
                      className="accent-amber-500"
                    />
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="font-semibold text-slate-200">
                      Tâm thành dâng cúng (Công đức tùy tâm / Miễn phí)
                    </span>
                  </label>
                </div>
              </div>

              {/* VietQR Preview if selected */}
              {paymentMethod === 'vietqr' && totalAmount > 0 && (
                <div className="p-3 rounded-2xl bg-slate-900 border border-amber-500/40 text-center space-y-2">
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                    Mã VietQR Ngân Hàng Chùa &amp; Hoa Viên
                  </span>
                  <div className="w-36 h-36 mx-auto bg-white p-2 rounded-xl shadow-md overflow-hidden">
                    <img
                      src={vietQrUrl}
                      alt="VietQR Chùa"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {paymentSettings.bankId} • {paymentSettings.accountNo} • {paymentSettings.accountName}
                  </p>
                </div>
              )}
            </div>

            {/* Total Summary & Confirm Button */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Tổng tiền lễ vật:</span>
                <span className="text-base font-black text-amber-300">
                  {totalAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Công đức tích lũy:</span>
                <span className="text-xs font-bold text-emerald-400">+{totalMerit} Điểm</span>
              </div>

              <button
                type="button"
                disabled={isSubmitting || totalAmount === 0}
                onClick={handleCompleteOffering}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all disabled:opacity-50"
              >
                <Gift className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Đang ghi nhận vào Neon DB...'
                    : `Xác Nhận Dâng Lễ Vật Tại ${targetType === 'temple' ? 'Chùa' : 'Hoa Viên'}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
