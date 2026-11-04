/**
 * Comprehensive Buddhist Temple Data
 * Statues, 18 Arhats, Sutras, Dharma Talks for TTS, Books, Offerings, and Guestbook
 */

export interface BuddhaStatue {
  id: string;
  name: string;
  title: string;
  imageUrl: string;
  description: string;
  vow: string;
  mantra: string;
  color: string;
}

export interface ArhatItem {
  id: number;
  nameVi: string;
  nameSanskrit: string;
  alias: string;
  symbol: string;
  meaning: string;
  story: string;
  imageUrl: string;
}

export interface SutraChant {
  id: string;
  title: string;
  category: string;
  youtubeId: string;
  youtubeFallbackIds?: string[];
  audioUrl?: string;
  duration: string;
  description: string;
  merit: string;
  lyrics: string[];
}

export interface DharmaTalk {
  id: string;
  title: string;
  speaker: string;
  duration: string;
  summary: string;
  fullSpeech: string;
  keyLessons: string[];
}

export interface SacredBook {
  id: string;
  title: string;
  author: string;
  totalChapters: number;
  description: string;
  chapters: {
    title: string;
    content: string;
  }[];
}

export interface TempleOffering {
  id: string;
  name: string;
  icon: string;
  category: 'hoa' | 'nhang' | 'qua' | 'den' | 'nuoc' | 'congduc';
  description: string;
  meritPoints: number;
  meaning: string;
  virtualCost: number; // 0 = Miễn phí tùy tâm
}

export interface TempleGuestbookEntry {
  id: string;
  name: string;
  dharmaName?: string;
  location: string;
  wish: string;
  createdAt: string;
  likes: number;
  offeringsCount?: number;
}

export const BUDDHA_STATUES: BuddhaStatue[] = [
  {
    id: 'thich-ca',
    name: 'Đức Bổn Sư Thích Ca Mâu Ni',
    title: 'Đấng Toàn Giác • Giáo Chủ Cõi Ta Bà',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
    description: 'Bậc Đạo Sư khai sáng đạo Phật, từ bỏ ngai vàng cung điện để tìm con đường cứu độ muôn loài thoát khỏi sinh lão bệnh tử.',
    vow: 'Tất cả chúng sinh đều có Phật tính, chỉ cần dứt trừ vô minh và tham ái thì đều có thể đạt tới giác ngộ giải thoát.',
    mantra: 'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật',
    color: 'from-amber-500 to-yellow-600',
  },
  {
    id: 'quan-am',
    name: 'Đại Bi Quán Thế Âm Bồ Tát',
    title: 'Mẹ Hiền Quán Thế Âm • Cứu Khổ Cứu Nạn',
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
    description: 'Bồ Tát của lòng từ bi vô lượng, lắng nghe mọi tiếng kêu cứu khổ của chúng sinh trong cõi Ta Bà để thị hiện cứu vớt.',
    vow: 'Nguyện đem lòng từ bi cứu giúp mọi nỗi khổ đau của nhân gian, nơi nào có tiếng kêu cầu bi thiết, nơi đó có Bồ Tát hiện thân.',
    mantra: 'Nam Mô Đại Bi Quán Thế Âm Bồ Tát • Án Ma Ni Bát Mê Hồng',
    color: 'from-sky-500 to-teal-600',
  },
  {
    id: 'a-di-da',
    name: 'Đức Phật A Di Đà',
    title: 'Vô Lượng Thọ • Giáo Chủ Cõi Tây Phương Cực Lạc',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    description: 'Đức Phật của ánh sáng vô lượng và tuổi thọ vô biên, tiếp dẫn chúng sinh có tâm niệm Phật vãng sanh về cõi Tịnh Độ trang nghiêm.',
    vow: 'Chúng sinh trong mười phương hết lòng tin ưa, xưng niệm danh hiệu từ một đến mười niệm khi lâm chung tất được vãng sanh Cực Lạc.',
    mantra: 'Nam Mô A Di Đà Phật',
    color: 'from-red-500 to-rose-600',
  },
  {
    id: 'dia-tang',
    name: 'Đại Nguyện Địa Tạng Vương Bồ Tát',
    title: 'U Minh Giáo Chủ • Đại Hiếu Bồ Tát',
    imageUrl: 'https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?auto=format&fit=crop&w=800&q=80',
    description: 'Vị Bồ Tát với đại nguyện độ tận chúng sinh cõi địa ngục tăm tối, tượng trưng cho hạnh nguyện hiếu thảo bậc nhất và sự nhẫn nhục.',
    vow: 'Địa ngục vị không, thệ bất thành Phật; Chúng sinh độ tận, phương chứng Bồ Đề.',
    mantra: 'Nam Mô Đại Nguyện Địa Tạng Vương Bồ Tát',
    color: 'from-amber-600 to-orange-700',
  },
  {
    id: 'di-lac',
    name: 'Đức Phật Di Lặc',
    title: 'Đương Lai Hạ Sanh • Phật Hoan Hỷ & An Lạc',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    description: 'Vị Phật tương lai với nụ cười bao dung hỷ xả, xua tan mọi muộn phiền ưu tư, mang lại phúc lộc và bình an viên mãn.',
    vow: 'Bao dung những điều khó dung của thiên hạ, mỉm cười trước vạn biến đổi thay, gieo niềm an vui hoan hỷ cho cõi đời.',
    mantra: 'Nam Mô Đương Lai Hạ Sanh Di Lặc Tôn Phật',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'duoc-su',
    name: 'Dược Sư Lưu Ly Quang Vương Phật',
    title: 'Giáo Chủ Cõi Đông Phương Tịnh Lưu Ly',
    imageUrl: 'https://images.unsplash.com/photo-1508672019048-805b876b67e2?auto=format&fit=crop&w=800&q=80',
    description: 'Thầy thuốc chữa lành cả thân bệnh và tâm bệnh, xua tan tật ách, ban cho chúng sinh sức khỏe dồi dào, trí tuệ sáng trong như ngọc lưu ly.',
    vow: 'Tiêu trừ mọi khổ đau bệnh tật, đem lại thân tâm an lạc, ánh sáng lưu ly soi chiếu phá tan đêm dài vô minh.',
    mantra: 'Nam Mô Dược Sư Lưu Ly Quang Vương Phật',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'dai-the-chi',
    name: 'Đại Thế Chí Bồ Tát',
    title: 'Đại Trí Tuệ • Bậc Hộ Trì Ánh Sáng Tây Phương',
    imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
    description: 'Bồ Tát dùng ánh sáng trí tuệ soi khắp mười phương, giúp chúng sinh dứt trừ phiền não ba cõi, đồng vãng sanh cõi Phật.',
    vow: 'Dùng ánh quang minh trí tuệ phá tan bóng tối si mê, tiếp dẫn chúng sinh tịnh tâm niệm Phật.',
    mantra: 'Nam Mô Đại Thế Chí Bồ Tát',
    color: 'from-yellow-500 to-amber-600',
  },
  {
    id: 'chuan-de',
    name: 'Phật Mẫu Chuẩn Đề Bồ Tát',
    title: 'Thất Câu Chi Phật Mẫu • Thập Bát Thủ Linh Thiêng',
    imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',
    description: 'Mẹ hiền mười tám tay cầm pháp bảo linh diệu, che chở gia hộ cho người tu hành tai qua nạn khỏi, sở cầu như ý.',
    vow: 'Tùy cơ cảm ứng cứu vớt chúng sinh khỏi vòng nguy biến, ban phát phước trí vẹn toàn.',
    mantra: 'Khể thủ quy y Tô Tất Đế... Nam Mô Thất Câu Chi Phật Mẫu Chuẩn Đề Vương Bồ Tát',
    color: 'from-purple-500 to-pink-600',
  },
];

export const ARHAT_LIST: ArhatItem[] = [
  {
    id: 1,
    nameVi: 'Tọa Lộc La Hán',
    nameSanskrit: 'Pindola Bharadvaja',
    alias: 'Tân-đầu-lư',
    symbol: 'Cưỡi hươu thong dong, tay cầm gậy như ý',
    meaning: 'Tượng trưng cho sự tĩnh tại, an nhiên tự tại giữa dòng đời biến động',
    story: 'Ngài xuất thân từ dòng dõi quý tộc, từ bỏ vinh hoa để xuất gia, chứng thánh quả và thường cưỡi hươu ngao du hóa độ nhân gian.',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 2,
    nameVi: 'Hỉ Khánh La Hán',
    nameSanskrit: 'Kanakavatsa',
    alias: 'Già-nặc-ca',
    symbol: 'Khuôn mặt tươi cười rạng rỡ, hoan hỷ độ sinh',
    meaning: 'Niềm vui thiện lành bắt nguồn từ việc giúp đỡ và chuyển hóa chúng sinh',
    story: 'Ngài luôn dùng nụ cười hoan hỷ để cảm hóa lòng người, nhắc nhở thế gian rằng nụ cười từ bi có thể hóa giải vạn niềm oán hận.',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 3,
    nameVi: 'Cử Bát La Hán',
    nameSanskrit: 'Kanakabharadvaja',
    alias: 'Bặc-đoan-la',
    symbol: 'Nâng bình bát khất thực trên tay',
    meaning: 'Tinh thần hạnh khất thực, buông xả bản ngã và lòng tham lam',
    story: 'Ngài đi khất thực không phân biệt giàu nghèo, coi việc nhận thức ăn là để gieo duyên phước lành cho thí chủ tích công đức.',
    imageUrl: 'https://images.unsplash.com/photo-1508672019048-805b876b67e2?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 4,
    nameVi: 'Thác Tháp La Hán',
    nameSanskrit: 'Subinda',
    alias: 'Tô-tần-đà',
    symbol: 'Tay nâng bảo tháp xá lợi',
    meaning: 'Trân quý Phật pháp, giữ gìn giới luật trang nghiêm vững chãi như bảo tháp',
    story: 'Ngài là vị đệ tử cuối cùng được Đức Phật trực tiếp truyền pháp, luôn mang theo bảo tháp tưởng nhớ ân đức Tam Bảo vô biên.',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 5,
    nameVi: 'Tĩnh Tọa La Hán',
    nameSanskrit: 'Nakula',
    alias: 'Nặc-cự-la',
    symbol: 'Ngồi kiết già bất động, tâm định như sơn',
    meaning: 'Định lực thâm sâu, an trú trong hiện tại, không lay chuyển bởi khen chê',
    story: 'Vốn là một dũng sĩ kiên cường, khi xuất gia ngài vận dụng ý chí sắt đá để hàng phục tâm loạn động, đạt thiền định thanh tịnh.',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 6,
    nameVi: 'Quá Giang La Hán',
    nameSanskrit: 'Bhadra',
    alias: 'Bạt-đà-la',
    symbol: 'Vượt sông lớn trên bè trúc thong dong',
    meaning: 'Vượt qua biển khổ luân hồi sinh tử để cập bến bờ giác ngộ an lạc',
    story: 'Mẹ ngài sinh ngài bên bờ sông dưới cội cây Bạt-đà. Ngài tinh thông giáo lý và thường vượt sông hoằng hóa Phật pháp khắp nơi.',
    imageUrl: 'https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 7,
    nameVi: 'Kỵ Tượng La Hán',
    nameSanskrit: 'Kalika',
    alias: 'Ca-lý-ca',
    symbol: 'Cưỡi voi trắng sáu ngà hiền hòa',
    meaning: 'Sức mạnh của trí tuệ và sự nhẫn nại bền bỉ chế ngự bản năng hoang dã',
    story: 'Trước khi xuất gia ngài thuần hóa loài voi dữ. Ngài dạy rằng điều phục tâm mình khó hơn điều phục trăm ngàn thớt voi trận.',
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 8,
    nameVi: 'Tiếu Sư La Hán',
    nameSanskrit: 'Vajraputra',
    alias: 'Phạt-xà-la',
    symbol: 'Đùa vui cùng sư tử dũng mãnh',
    meaning: 'Từ bi hàng phục hung tàn, dũng khí vô úy của người con Phật',
    story: 'Sư tử chúa dũng mãnh quy phục trước lòng từ bi của ngài, trở thành bạn đồng hành hộ trì chánh pháp trên mọi nẻo đường.',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 9,
    nameVi: 'Khai Tâm La Hán',
    nameSanskrit: 'Gopaka',
    alias: 'Thú-bác-ca',
    symbol: 'Vạch ngực áo lộ rõ tâm Phật sáng ngời',
    meaning: 'Trực tâm là đạo tràng, Phật tại tâm chứ không tìm cầu nơi xa xôi',
    story: 'Khi có người hỏi Phật ở đâu, ngài mỉm cười mở áo chỉ vào trái tim mình: "Trong tâm mỗi người đều có sẵn hạt giống giác ngộ".',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 10,
    nameVi: 'Thám Thủ La Hán',
    nameSanskrit: 'Panthaka',
    alias: 'Bán-thác-ca',
    symbol: 'Vươn vai duỗi tay thức tỉnh sảng khoái',
    meaning: 'Bừng tỉnh cơn mê muội, trút bỏ uể oải lười biếng để tinh tấn tu hành',
    story: 'Sau những giờ thiền định sâu, ngài vươn vai nhắc nhở đại chúng hãy thức tỉnh khỏi giấc ngủ dài của vô minh và dục vọng.',
    imageUrl: 'https://images.unsplash.com/photo-1508672019048-805b876b67e2?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 11,
    nameVi: 'Trầm Tư La Hán',
    nameSanskrit: 'Rahula',
    alias: 'La-hầu-la',
    symbol: 'Ngồi trầm mặc tư duy chiêm nghiệm',
    meaning: 'Quán chiếu nội tâm sâu sắc, mật hạnh vô song trong từng hành động',
    story: 'Ngài là con trai của Đức Phật Thích Ca, từ bỏ ngôi vua tương lai để tu mật hạnh, nổi tiếng với sự khiêm cung và nhẫn nại tột cùng.',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 12,
    nameVi: 'Hàng Long La Hán',
    nameSanskrit: 'Nagasena',
    alias: 'Khánh Hữu',
    symbol: 'Tay nâng ngọc báu, rồng thiêng uốn lượn',
    meaning: 'Chế ngự dục vọng cuồn cuộn như sóng dữ, bảo vệ chánh pháp trường tồn',
    story: 'Ngài dùng đại từ bi và thần lực cảm hóa loài rồng dữ chuyên làm lũ lụt quấy nhiễu dân gian, biến rồng thành vị thần hộ trì thiện lành.',
    imageUrl: 'https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 13,
    nameVi: 'Phục Hổ La Hán',
    nameSanskrit: 'Pindola',
    alias: 'Tân-đầu-lư',
    symbol: 'Hổ dữ ngoan ngoãn nằm nép bên chân',
    meaning: 'Lòng nhân từ cảm hóa loài muông thú hung dữ nhất, dập tắt ngọn lửa sân hận',
    story: 'Ngài sống trong rừng sâu chia sẻ phần cơm chay cho đàn hổ đói, khiến loài chúa sơn lâm dứt trừ tính sát sinh, thuần thục theo ngài.',
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 14,
    nameVi: 'Trương Cung La Hán',
    nameSanskrit: 'Vanavasa',
    alias: 'Bạt-nặc-ca',
    symbol: 'Tay cầm cung tên nhắm thẳng vô minh',
    meaning: 'Mũi tên chánh kiến bắn tan hoang mang nghi ngờ, hướng tới mục tiêu giác ngộ',
    story: 'Từng là cung thủ thiện xạ, ngài dùng hình ảnh cung tên để dạy đệ tử: người tu hành phải kiên định tập trung tâm trí như người bắn cung.',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 15,
    nameVi: 'Ba Tiêu La Hán',
    nameSanskrit: 'Asita',
    alias: 'Phạt-na-bà-tư',
    symbol: 'Ngồi tĩnh tọa dưới tán lá chuối xanh ngát',
    meaning: 'Lắng nghe âm thanh của mưa rơi gió thổi, hòa mình cùng đại tự nhiên',
    story: 'Ngài thích ngồi thiền dưới tàng cây chuối trong rừng, lắng nghe giọt mưa rơi để giác ngộ tính vô thường và mong manh của kiếp sống.',
    imageUrl: 'https://images.unsplash.com/photo-1508672019048-805b876b67e2?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 16,
    nameVi: 'Khoái Mục La Hán',
    nameSanskrit: 'Ajita',
    alias: 'A-thị-đa',
    symbol: 'Đôi mắt sáng quắc nhìn thấu vạn vật',
    meaning: 'Mắt tuệ sáng soi, không bị vẻ bề ngoài giả tạm đánh lừa',
    story: 'Ngài quán chiếu mọi pháp đều sinh diệt vô thường, không tham đắm sắc trần, truyền dạy đôi mắt chánh niệm cho muôn thế hệ.',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 17,
    nameVi: 'Trường Mi La Hán',
    nameSanskrit: 'Asita',
    alias: 'A-sử-đa',
    symbol: 'Lông mày dài buông rủ thanh tú',
    meaning: 'Tượng trưng cho phúc thọ vô biên, đức độ viên mãn trường cửu',
    story: 'Khi sinh ra ngài đã có đôi lông mày dài buông thõng, kiếp trước là một nhà sư tu trì nghiêm cẩn, kiếp này chứng quả La Hán trường thọ.',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 18,
    nameVi: 'Bố Đại La Hán',
    nameSanskrit: 'Angida',
    alias: 'Nhân-yết-đà',
    symbol: 'Khoác túi vải lớn chứa đựng vạn bảo vật',
    meaning: 'Bao dung chứa đựng cả cõi đời, buông xả là có tất cả',
    story: 'Ngài mang túi vải đi khắp nẻo đường, gom hết rác rưởi phiền muộn của thế gian để ban phát niềm vui, nụ cười và phước lành.',
    imageUrl: 'https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?auto=format&fit=crop&w=500&q=80',
  },
];

export const TEMPLE_SUTRAS: SutraChant[] = [
  {
    id: 'chu-dai-bi',
    title: 'Chú Đại Bi (84 Câu - Trì Niệm Tiêu Trừ Nghiệp Chướng & Cầu An)',
    category: 'Mật Chú Thần Diệu',
    youtubeId: 'hxPZ7Wxs-LQ',
    youtubeFallbackIds: ['hxPZ7Wxs-LQ', 'ER5awCKFMqg'],
    duration: '21:40',
    description: 'Thần chú cứu khổ cứu nạn của Đức Đại Bi Quán Thế Âm Bồ Tát. Nghe và trì tụng giúp tâm thanh tịnh, tiêu trừ chướng ngại, gia đạo bình an.',
    merit: 'Công đức vô lượng, tiêu tai diệt tội, tăng trưởng thiện căn, được chư thiên thiện thần hộ trì ngày đêm.',
    lyrics: [
      'Nam mô Đại Bi Hội Thượng Phật Bồ Tát. (3 lần)',
      'Thiên thủ thiên nhãn vô ngại đại bi tâm đà la ni.',
      'Nam mô hắc ra đát na, đa ra dạ da. Nam mô a rị da, bà lô kiết đế, thước bát ra da, bồ đề tát đỏa bà da, ma ha tát đỏa bà da, ma ha ca lô ni ca da.',
      'Án, tát bàn ra phạt duệ, số đát na đát tỏa.',
      'Nam mô tất kiết lật đỏa y mông a rị da, bà lô kiết đế thất Phật ra lăng đà bà.',
      'Nam mô na ra cẩn trì, hê rị ma ha bàn đa sa mế, tát bà a tha đậu du bằng, a thệ dựng, tát bà tát đa, na ma bà tát đa, na ma bà già, ma phạt đạt đậu, đát điệt tha.',
      'Án, a bà lô hê, lô ca đế, ca ra đế, di hê rị, ma ha bồ đề tát đỏa, tát bà tát bà, ma ra ma ra, ma hê ma hê, rị đà dựng.',
      'Câu lô câu lô kiết mông, độ lô độ lô phạt xà da đế, ma ha phạt xà da đế, đà ra đà ra, địa rị ni, thất Phật ra da, giá ra giá ra.',
      'Mạ mạ phạt ma ra, mục đế lệ, y hê y hê, thất na thất na, a ra sâm Phật ra xá lợi, phạt sa phạt sâm, Phật ra xá da.',
      'Hô lô hô lô ma ra, hô lô hô lô hê rị, ta ra ta ra, tất rị tất rị, tô rô tô rô, bồ đề dạ bồ đề dạ, bồ đà dạ bồ đà dạ.',
      'Tất điện đô, mạn đa ra, bạt đà dạ, ta bà ha. (3 lần)',
    ],
  },
  {
    id: 'bat-nha-tam-kinh',
    title: 'Bát Nhã Ba La Mật Đa Tâm Kinh (Kinh Trí Tuệ Bát Nhã)',
    category: 'Đại Thừa Kinh Điển',
    youtubeId: 'rWjIDcjS070',
    youtubeFallbackIds: ['rWjIDcjS070', '24MOe2Oq37M'],
    duration: '15:20',
    description: 'Tinh hoa của Phật giáo Đại Thừa về Tánh Không (Sùnyatà). Quán chiếu ngũ uẩn giai không, vượt qua mọi khổ ách trần gian.',
    merit: 'Khai mở trí tuệ sáng suốt, dứt trừ vô minh chấp ngã, tâm không còn lo sợ, đạt tới Niết Bàn tịch tịnh.',
    lyrics: [
      'Nam Mô Bát Nhã Hội Thượng Phật Bồ Tát. (3 lần)',
      'Khi Bồ Tát Quán Tự Tại hành sâu Bát nhã Ba la mật đa, soi thấy năm uẩn đều không, liền qua hết thảy khổ ách.',
      'Xá Lợi Tử! Sắc chẳng khác không, không chẳng khác sắc; sắc tức là không, không tức là sắc. Thọ, tưởng, hành, thức cũng đều như thế.',
      'Xá Lợi Tử! Tướng không của mọi pháp không sanh, không diệt, không nhơ, không sạch, không thêm, không bớt.',
      'Cho nên trong tánh không không có sắc, không có thọ, tưởng, hành, thức; không có mắt, tai, mũi, lưỡi, thân, ý.',
      'Vì không có chỗ được, nên Bồ Đề Tát Đỏa nương Bát nhã Ba la mật đa, tâm không ngăn ngại, vì không ngăn ngại nên không sợ hãi, xa lìa mộng tưởng điên đảo, rốt ráo Niết bàn.',
      'Chư Phật ba đời cũng nương Bát nhã Ba la mật đa, đắc quả Bồ đề Vô thượng Chánh đẳng Chánh giác.',
      'Nên biết Bát nhã Ba la mật đa là đại thần chú, là đại minh chú, là vô thượng chú, là vô đẳng đẳng chú, trừ được hết thảy khổ, chân thật không hư.',
      'Yết đế, yết đế, ba la yết đế, ba la tăng yết đế, bồ đề tát bà ha! (3 lần)',
    ],
  },
  {
    id: 'kinh-duoc-su',
    title: 'Kinh Dược Sư Cầu Bình An & Sức Khỏe Cho Gia Đạo',
    category: 'Tiêu Tai Trừ Bệnh',
    youtubeId: 'OR1EHCFjyOI',
    youtubeFallbackIds: ['OR1EHCFjyOI', 'hxPZ7Wxs-LQ'],
    duration: '28:15',
    description: '12 đại nguyện của Đức Phật Dược Sư Lưu Ly Quang Vương. Cầu nguyện cho cha mẹ khỏe mạnh sống lâu, con cháu tai qua nạn khỏi, thân tâm khinh an.',
    merit: 'Hóa giải bệnh tật, tiêu trừ nghiệp chướng thân tâm, gia đình thuận hòa ấm no, công danh hanh thông.',
    lyrics: [
      'Nam Mô Dược Sư Hải Hội Phật Bồ Tát. (3 lần)',
      'Quy mạng mười phương Vô Thượng Sĩ, Dược Sư Lưu Ly Quang Như Lai.',
      'Nguyện lớn mười hai cứu cõi đời, trừ bệnh dứt khổ ban an lạc.',
      'Ánh sáng lưu ly chiếu rực rỡ, phá tan tăm tối cõi trần ai.',
      'Nam mô Bạc già phạt đế, bệ sát xã, lũ rô thích lưu ly, bát lạt bà, hắc ra xà dã, đát tha yết đa da, a ra hắc đế, tam miệu tam bồ đà da.',
      'Đát điệt tha: Án, bệ sát thệ, bệ sát thệ, bệ sát xã, tam một yết đế toát ha. (7 biến)',
      'Nam mô Dược Sư Lưu Ly Quang Vương Phật. (3 lần)',
    ],
  },
  {
    id: 'kinh-a-di-da',
    title: 'Kinh A Di Đà (Cầu Siêu Độ Cửu Huyền Thất Tổ & Vãng Sanh Cực Lạc)',
    category: 'Cầu Siêu Tịnh Độ',
    youtubeId: 'YUiNU-910EY',
    youtubeFallbackIds: ['YUiNU-910EY', '5RB5bzMxh7U'],
    duration: '42:04',
    description: 'Bộ kinh nền tảng của Tịnh Độ Tông mô tả cõi Tây Phương Cực Lạc trang nghiêm thanh tịnh, chuyên dùng tụng niệm cầu siêu cho hương linh người quá cố sớm siêu sanh tịnh cảnh.',
    merit: 'Tiếp dẫn hương linh Cửu Huyền Thất Tổ và người thân đã khuất siêu thoát nhẹ nhàng về miền Cực Lạc quốc.',
    lyrics: [
      'Nam Mô Liên Trì Hải Hội Phật Bồ Tát. (3 lần)',
      'Như vầy tôi nghe: Một thời Đức Phật ở tại vườn Kỳ Thọ Cấp Cô Độc, nước Xá Vệ, cùng với một ngàn hai trăm năm mươi vị Đại Tỳ Kheo.',
      'Bấy giờ Đức Phật bảo ngài Trưởng lão Xá Lợi Phất rằng: Từ đây qua phương Tây quá mười muôn ức cõi Phật, có thế giới tên là Cực Lạc.',
      'Trong cõi đó có Đức Phật hiệu là A Di Đà, hiện nay đang thuyết pháp.',
      'Cõi nước đó vì sao tên là Cực Lạc? Vì chúng sanh trong cõi đó không có những sự khổ, chỉ hưởng những điều vui, nên tên là Cực Lạc.',
      'Hàng bảy lớp lan can, bảy lớp mành lưới, bảy lớp hàng cây báu, đều dùng bốn chất báu bao bọc đoanh vây.',
      'Trong ao bảy báu đầy dẫy nước tám công đức, hoa sen trong ao lớn bằng bánh xe, sắc xanh ánh sáng xanh, sắc vàng ánh sáng vàng, thơm tho tinh khiết.',
      'Nếu có thiện nam tử, thiện nữ nhân nào nghe nói Đức Phật A Di Đà rồi chấp trì danh hiệu từ một ngày cho đến bảy ngày nhất tâm bất loạn, thời người đó đến lúc lâm chung liền được vãng sanh Thế giới Cực Lạc.',
      'Nguyện đem công đức trì tụng này, trang nghiêm Phật Tịnh Độ, trên đền bốn ơn nặng, dưới cứu khổ tam đồ, cầu cho hương linh người quá cố trực vãng Tây Phương Cực Lạc thế giới.',
      'Nam Mô Tây Phương Cực Lạc Thế Giới Đại Từ Đại Bi A Di Đà Phật. (3 lần)',
    ],
  },
  {
    id: 'kinh-dia-tang',
    title: 'Kinh Địa Tạng Bồ Tát Bổn Nguyện (Đại Hiếu Cứu Độ Vong Linh)',
    category: 'Đại Nguyện Cầu Siêu',
    youtubeId: '9NQFsvecC04',
    youtubeFallbackIds: ['9NQFsvecC04', 'AKz2seEIiv4'],
    duration: '48:30',
    description: 'Bộ kinh Hiếu Đạo tối thượng của Phật giáo, ghi lại đại nguyện cứu độ của Đức Địa Tạng Vương Bồ Tát đối với cha mẹ nhiều đời và các hương linh nơi u minh.',
    merit: 'Siêu độ vong linh người thân thoát mọi khổ ách, gia quyến hiện tiền tăng thêm phước thọ bình an.',
    lyrics: [
      'Nam Mô U Minh Giáo Chủ Đại Nguyện Địa Tạng Vương Bồ Tát. (3 lần)',
      'Địa ngục vị không, thệ bất thành Phật; Chúng sanh độ tận, phương chứng Bồ Đề.',
      'Đức Phật bảo ngài Phổ Quảng Bồ Tát: Nếu đời sau có người nam người nữ nào trong bảy phần công đức tu tạo khi người thân quyến thuộc qua đời, người mất được một phần, người sống được sáu phần.',
      'Cho nên người hiếu thảo thương nhớ ông bà cha mẹ đã khuất, chí tâm đọc tụng Kinh Địa Tạng, thắp hương dâng hoa cúng dường Tam Bảo, thời hương linh được thoát khỏi chốn tối tăm, sanh về cõi lành.',
      'Nguyện đem ánh sáng từ bi của Đức Địa Tạng Vương Bồ Tát soi đường dẫn lối cho hương linh an nghỉ nơi chín suối được siêu sanh Tịnh Độ.',
      'Nam Mô Đại Nguyện Địa Tạng Vương Bồ Tát Ma Ha Tát. (3 lần)',
    ],
  },
  {
    id: 'kinh-vu-lan',
    title: 'Kinh Vu Lan Báo Hiếu (Tri Ân Công Đức Sinh Thành Của Cha Mẹ)',
    category: 'Hiếu Đạo Thiêng Liêng',
    youtubeId: '7OWiEA3rFQE',
    youtubeFallbackIds: ['7OWiEA3rFQE', 'TZmflOyFJns'],
    duration: '32:00',
    description: 'Lời Phật dạy Tôn giả Mục Kiền Liên về phương pháp cứu mẹ khỏi chốn lầm than và đạo lý uống nước nhớ nguồn, đền ơn chín chữ cù lao.',
    merit: 'Hồi hướng công đức cho cha mẹ hiện tiền được mạnh khỏe trường thọ, cha mẹ nhiều đời nhiều kiếp được siêu sinh Tịnh Độ.',
    lyrics: [
      'Nam Mô Vu Lan Hội Thượng Phật Bồ Tát. (3 lần)',
      'Đệ tử chúng con vâng lời Phật dạy, chí thành đảnh lễ mười phương Tam Bảo, tưởng nhớ thâm ân sinh thành dưỡng dục của ông bà cha mẹ.',
      'Cúi đầu lạy Mẹ kính Cha, chín tháng cưu mang ba năm bú mớm, bên ướt mẹ nằm bên ráo con lăn.',
      'Công cha như núi Thái Sơn, nghĩa mẹ như nước trong nguồn chảy ra.',
      'Nguyện cầu cha mẹ hiện tiền tăng long phước thọ, cha mẹ quá vãng siêu sanh miền Tịnh Cảnh Liên Bang.',
      'Nam Mô Đại Hiếu Mục Kiền Liên Bồ Tát. (3 lần)',
    ],
  },
  {
    id: 'niem-a-di-da',
    title: 'Niệm Hồng Danh Nam Mô A Di Đà Phật 108 Biến Tịnh Tâm',
    category: 'Tịnh Độ Diệu Âm',
    youtubeId: '5RB5bzMxh7U',
    youtubeFallbackIds: ['5RB5bzMxh7U', 'KNMBFbx-oYc'],
    duration: '35:40',
    description: 'Âm điệu niệm Phật trầm hùng, du dương, giúp tâm định tĩnh sau một ngày làm việc mệt mỏi, dứt bặt mọi lo âu phiền não.',
    merit: 'Một câu niệm Phật tiêu tan vạn nghiệp chướng, tâm hồn thanh thản, hộ niệm an lành.',
    lyrics: [
      'Nam Mô Tây Phương Cực Lạc Thế Giới Đại Từ Đại Bi Tiếp Dẫn Đạo Sư A Di Đà Phật.',
      'Nam Mô A Di Đà Phật.',
      'Nam Mô Quán Thế Âm Bồ Tát.',
      'Nam Mô Đại Thế Chí Bồ Tát.',
      'Nam Mô Địa Tạng Vương Bồ Tát.',
      'Nam Mô Thanh Tịnh Đại Hải Chúng Bồ Tát.',
    ],
  },
];

export const DHARMA_TALKS: DharmaTalk[] = [
  {
    id: 'dharma-karma',
    title: 'Luật Nhân Quả: Gieo Nhân Lành Gặt Quả Ngọt Giữa Đời Thường',
    speaker: 'Minh Hiếu Lễ Chùa',
    duration: '12 phút',
    summary: 'Mọi sự gặp gỡ, giàu nghèo, vui buồn trong đời đều không phải ngẫu nhiên mà do nghiệp nhân chúng ta đã tạo tác.',
    keyLessons: [
      'Muốn gặt quả ngọt thì phải siêng gieo hạt giống lành.',
      'Không oán trách số phận khi gặp nghịch cảnh, hãy dùng lòng nhân từ để hóa giải.',
      'Làm việc thiện từ những điều nhỏ nhất: lời nói hòa nhã, ánh mắt cảm thông.',
    ],
    fullSpeech: `A Di Đà Phật! Kính thưa quý Phật tử và các bạn đồng tu thân mến. 
Trong vũ trụ bao la này, không có ngọn gió nào thổi vô cớ, không có chiếc lá nào rơi tình cờ, và không có cuộc gặp gỡ nào trên đời là không do nhân duyên. 
Đức Phật từng dạy: "Muốn biết nhân đời trước, hãy nhìn quả đời này đang nhận; muốn biết quả đời sau, hãy nhìn nhân đời này đang gieo." 
Khi ta nói một lời nói dịu dàng, ta đang gieo một đóa hoa thơm vào tâm hồn người khác. Khi ta nổi cơn thịnh nộ, ta đang tự tay châm ngọn lửa đốt cháy rừng công đức của chính mình. 
Cuộc đời này công bằng lắm quý vị ạ. Gieo yêu thương ắt gặt an vui. Gieo oán hận ắt gặt sầu não. 
Hôm nay bước chân vào cửa Phật, xin hãy trút bỏ mọi sân si ganh ghét ngoài hiên chùa, để lòng mình nhẹ tênh như áng mây trắng giữa bầu trời mùa thu. Chúc quý đạo hữu luôn an trú trong chánh niệm!`,
  },
  {
    id: 'dharma-letting-go',
    title: 'Nghệ Thuật Buông Bỏ Muộn Phiền & Tìm Lại Sự An Lạc Trong Tâm',
    speaker: 'Minh Hiếu Lễ Chùa',
    duration: '10 phút',
    summary: 'Nắm chặt thì đau tay, buông tay thì lòng thanh thản. Học cách bao dung và mỉm cười với những điều bất như ý.',
    keyLessons: [
      'Buông bỏ không phải là từ bỏ trách nhiệm, mà là buông bỏ sự chấp dính và kỳ vọng thái quá.',
      'Hít vào tâm tĩnh lặng, thở ra miệng mỉm cười.',
      'Hạnh phúc chân thật chỉ có mặt trong giây phút hiện tại.',
    ],
    fullSpeech: `Kính thưa quý vị thiện hữu tri thức! 
Chúng ta thường đau khổ không phải vì ngoại cảnh quá nghiệt ngã, mà vì đôi tay ta cứ cố nắm giữ những thứ đã thuộc về quá khứ, hoặc lo âu về những điều chưa xảy ra trong tương lai. 
Giống như một người cầm chiếc cốc nước sôi, càng cố siết chặt thì càng bỏng rát. Chỉ cần đặt chiếc cốc xuống, nỗi đau sẽ lập tức chấm dứt. 
Buông bỏ ở đây là buông sự cố chấp, buông lòng đố kỵ, buông những tổn thương mà người khác vô tình hay cố ý mang lại cho ta. 
Hãy nhìn hoa sen mọc lên từ bùn lầy hôi tanh, nhưng cánh sen vẫn trắng ngần, tỏa hương thơm thanh khiết ngát trời. 
Mỗi sáng thức dậy, hãy hít thật sâu làn dưỡng khí của đất trời, nở một nụ cười hàm tiếu và tự nhủ: "Hôm nay tôi chọn tha thứ và bình an."`,
  },
  {
    id: 'dharma-filial-piety',
    title: 'Đạo Hiếu Cha Mẹ: Cội Nguồn Của Mọi Phước Báu Trần Gian',
    speaker: 'Minh Hiếu Lễ Chùa',
    duration: '14 phút',
    summary: 'Cha mẹ tại tiền như hai vị Phật sống trong nhà. Thờ cúng chư Phật mười phương không bằng hiếu thảo phụng dưỡng mẹ cha.',
    keyLessons: [
      'Phụng dưỡng cha mẹ lúc tuổi già bằng cả tấm lòng và thái độ kính cẩn.',
      'Dành thời gian lắng nghe và chia sẻ với cha mẹ khi còn có thể.',
      'Lấy hiếu đạo làm gốc thì công danh sự nghiệp ắt bền lâu phát đạt.',
    ],
    fullSpeech: `Kính thưa quý Phật tử gần xa! 
Kinh Phật dạy: "Gặp thời không có Phật, khéo phụng thờ cha mẹ chính là phụng thờ Phật." 
Biển đông còn có lúc vơi, nhưng công ơn cha mẹ đời đời chẳng vơi. Mẹ mang nặng đẻ đau chín tháng mười ngày, cha dãi nắng dầm mưa gánh gồng cả cuộc đời nuôi nấng ta khôn lớn. 
Có những người đi lễ bái khắp các đền chùa xa xôi, mâm cao cỗ đầy cúng dường, nhưng về đến nhà lại nặng lời gắt gỏng với mẹ cha, thì thử hỏi công đức ấy đi đâu? 
Xin hãy nhớ rằng: Bữa cơm ấm áp ăn cùng cha mẹ, một chén trà thơm dâng tận tay mẹ già, một câu hỏi thăm ân cần lúc cha trái gió trở trời... quý báu hơn ngàn vạn lời hoa mỹ. 
Xin nguyện chúc cho song thân của quý vị luôn được phước thọ miên trường, an lạc thân tâm!`,
  },
  {
    id: 'dharma-mindfulness',
    title: 'Tâm Bất Biến Giữa Dòng Đời Vạn Biến: Chánh Niệm Trong Công Việc',
    speaker: 'Minh Hiếu Lễ Chùa',
    duration: '11 phút',
    summary: 'Giữ tâm định tĩnh trước áp lực mưu sinh cơm áo gạo tiền. Sống trọn vẹn trong từng hơi thở và bước chân.',
    keyLessons: [
      'Gặp việc khó không hoảng loạn, giữ tâm an như mặt hồ phẳng lặng.',
      'Làm việc hết mình với tinh thần cống hiến, không đắm chìm vào toan tính nhỏ nhen.',
      'Mỗi ngày dành 10 phút tĩnh tâm lắng nghe tiếng chuông chùa để tái tạo năng lượng lành.',
    ],
    fullSpeech: `A Di Đà Phật! Cuộc sống mưu sinh ngày nay cuốn con người vào guồng quay chóng mặt của lo toan, danh vọng và áp lực. 
Đôi khi ta quên mất cách thở, quên mất nụ cười với người thương yêu. 
Lời Phật dạy người cư sĩ: Hãy làm việc với sự tận tâm, nhưng đừng để lòng tham và nỗi sợ hãi chi phối hành động. 
Khi gặp nghịch cảnh trắc trở, hãy lùi lại một bước, hít thở thật sâu, nhớ rằng mây đen nào rồi cũng phải nhường chỗ cho ánh bình minh rạng rỡ. 
Giữ được tâm an định, thì ở giữa giông bão bạn vẫn tìm thấy sự an lạc vô bờ!`,
  },
];

export const SACRED_BOOKS: SacredBook[] = [
  {
    id: 'kinh-phap-cu',
    title: 'Kinh Pháp Cú (Dhammapada - Lời Vàng Đức Phật)',
    author: 'Đức Bổn Sư Thích Ca Mâu Ni',
    totalChapters: 26,
    description: 'Tập hợp 423 bài kệ kinh cốt tủy, đúc kết đạo lý sống đẹp, đạo lý làm người và con đường thoát khổ đầy minh triết.',
    chapters: [
      {
        title: 'Phẩm 1: Song Yếu (Nhân Quả Của Tâm)',
        content: `1. Ý dẫn đầu các pháp, ý làm chủ ý tạo. Nếu với ý ô nhiễm, nói năng hay hành động, khổ não bước theo sau, như xe chân vật kéo.
2. Ý dẫn đầu các pháp, ý làm chủ ý tạo. Nếu với ý thanh tịnh, nói năng hay hành động, an lạc bước theo sau, như bóng chẳng rời hình.
3. Nó mắng tôi nhục tôi, nó đánh tôi cướp tôi, ai ôm ấp niệm ấy, hận thù không thể nguôi.
4. Nó mắng tôi nhục tôi, nó đánh tôi cướp tôi, không ôm ấp niệm ấy, hận thù tự lắng xuôi.
5. Hận thù diệt hận thù, đời này không thể có. Từ bi diệt hận thù, là định luật ngàn thu.`,
      },
      {
        title: 'Phẩm 2: Không Phóng Dật (Chánh Niệm Tỉnh Thức)',
        content: `21. Không phóng dật là đường bất tử, phóng dật là đường chết. Người không phóng dật không bao giờ chết, kẻ phóng dật như đã chết rồi.
22. Hiểu rõ sự sai biệt này, người trí hoan hỷ trong sự không phóng dật, thích thú trong cảnh giới của bậc Thánh.
23. Nhờ kiên trì thiền định, tinh tấn không ngừng nghỉ, người trí chứng Niết bàn, an lạc tối thượng.`,
      },
      {
        title: 'Phẩm Tâm: Chế Ngự Tâm Hướng Thiện',
        content: `33. Tâm dao động chao đảo, khó hộ trì khó nhiếp. Người trí làm tâm thẳng, như thợ tên làm tên.
36. Tâm này rất khó thấy, tế nhị theo dục vọng. Người trí phòng hộ tâm, tâm hộ mang an lạc.
42. Kẻ thù hại kẻ thù, oan gia hại oan gia, không bằng tâm hướng tà, gây hại cho chính mình.
43. Điều mẹ cha bà con, không thể làm cho được, tâm hướng thiện chánh kiến, làm cho mình tốt hơn.`,
      },
    ],
  },
  {
    id: 'kinh-kim-cang',
    title: 'Kinh Kim Cang Bát Nhã Ba La Mật (Vajracchedika)',
    author: 'Đức Phật Thích Ca & Tôn giả Tu Bồ Đề',
    totalChapters: 32,
    description: 'Bộ kinh sấm sét phá tan mọi chấp thủ tướng mạo, khai mở chân tâm vô ngã thanh tịnh.',
    chapters: [
      {
        title: 'Chương 1: Pháp Hội Nhân Duyên Khởi',
        content: `Như vầy tôi nghe: Một thời Đức Phật ở nước Xá Vệ, tại rừng Kỳ Đà, hoa viên Cấp Cô Độc, cùng với chúng đại Tỳ kheo một ngàn hai trăm năm mươi người. 
Bấy giờ gần đến giờ thọ trai, Đức Thế Tôn đắp y mang bát vào đại thành Xá Vệ khất thực. Trong thành ấy, theo thứ lớp khất thực xong, trở về nơi cư trú. 
Dùng cơm xong, thu dẹp y bát, rửa chân rồi trải tòa ngồi kiết già ngay thẳng, an trú chánh niệm phía trước.`,
      },
      {
        title: 'Chương 32: Ứng Hóa Phi Chân (Kệ Tứ Cú Bất Hủ)',
        content: `Nhất thiết hữu vi pháp,
Như mộng huyễn bào ảnh,
Như lộ diệc như điện,
Ưng tác như thị quán.

(Dịch nghĩa:
Hết thảy pháp hữu vi,
Như mộng mị, bọt bèo,
Như sương mai, ánh chớp,
Hãy quán chiếu như thế!)`,
      },
    ],
  },
];

export const TEMPLE_OFFERINGS: TempleOffering[] = [
  {
    id: 'hoa-sen-trang',
    name: 'Hoa Sen Trắng Tinh Khiết (Bạch Liên)',
    icon: '🪷',
    category: 'hoa',
    description: 'Dâng hoa sen thanh bạch thơm ngát cúng dường mười phương chư Phật, tích lũy phước đức thanh cao.',
    meritPoints: 20,
    meaning: 'Tượng trưng cho tâm hồn trong sạch, gần bùn mà chẳng hôi tanh mùi bùn.',
    virtualCost: 0,
  },
  {
    id: 'hoa-sen-hong',
    name: 'Hoa Sen Hồng Pháp Hỷ',
    icon: '🌸',
    category: 'hoa',
    description: 'Đóa sen hồng thắm tươi tượng trưng cho niềm hoan hỷ và lòng tôn kính đấng Giác Ngộ.',
    meritPoints: 25,
    meaning: 'Khai mở trí tuệ từ bi, mang lại năng lượng hòa ái và duyên lành cho gia đạo.',
    virtualCost: 0,
  },
  {
    id: 'nhang-tram',
    name: 'Tam Nén Nhang Trầm Xứ Quảng',
    icon: '🕯️',
    category: 'nhang',
    description: 'Trầm hương tự nhiên thơm ngát tỏa khói lam chiều, dâng trọn Giới hương - Định hương - Tuệ hương.',
    meritPoints: 30,
    meaning: 'Khói hương trầm thấu triệt mười phương, lòng thành kính cảm ứng chư Phật mười phương.',
    virtualCost: 0,
  },
  {
    id: 'mam-ngu-qua',
    name: 'Mâm Ngũ Quả Cầu An Lạc',
    icon: '🍇',
    category: 'qua',
    description: 'Mâm ngũ quả tươi ngon (mãng cầu, xoài, đu đủ, sung, quýt) tượng trưng ngũ phúc lâm môn.',
    meritPoints: 40,
    meaning: 'Cầu mong cho cả gia đình quanh năm ấm no hạnh phúc, bình an may mắn, quả ngọt từ nhân lành.',
    virtualCost: 0,
  },
  {
    id: 'den-dau',
    name: 'Ngọn Đèn Dầu Vạn Niên',
    icon: '🪔',
    category: 'den',
    description: 'Thắp sáng ngọn đăng quang trước điện Phật, xua tan bóng tối u mê của kiếp người.',
    meritPoints: 35,
    meaning: 'Ánh sáng trí tuệ soi đường dẫn lối, tâm trí sáng suốt minh mẫn, không lạc lối lầm đường.',
    virtualCost: 0,
  },
  {
    id: 'nuoc-tinh-thuy',
    name: 'Chén Nước Tịnh Thủy Cam Lộ',
    icon: '💧',
    category: 'nuoc',
    description: 'Nước suối nguồn tinh khiết thanh lương, làm dịu mát mọi phiền não thiêu đốt trần gian.',
    meritPoints: 15,
    meaning: 'Tâm trong veo như nước đầu nguồn, gột rửa mọi bụi bặm trần ai.',
    virtualCost: 0,
  },
  {
    id: 'cong-duc-tam-bao',
    name: 'Cúng Dường Tam Bảo Tùy Hỷ',
    icon: '🪙',
    category: 'congduc',
    description: 'Góp viên gạch tu bổ chùa chiền, in ấn kinh sách, lan tỏa chánh pháp (hoàn toàn tùy tâm miễn phí).',
    meritPoints: 100,
    meaning: 'Tích lũy kho tàng công đức vô lượng cho đời này và mai sau.',
    virtualCost: 0,
  },
];

export const NOVICE_MONK_QA = [
  {
    question: 'Làm thế nào để tâm bớt lo âu phiền muộn thưa Chú Tiểu?',
    answer: 'A Di Đà Phật! Quý Phật tử hãy dừng lại một chút, hít thật sâu và thở thật nhẹ. Hãy nhớ lời Phật dạy: Mọi việc trên đời đều là vô thường, có đến rồi ắt có đi. Đừng ôm giữ những điều không vui trong tâm, hãy mở rộng lòng bao dung, uống một chén trà thơm và niệm vài câu Phật hiệu, lòng sẽ an yên ngay thôi ạ!',
  },
  {
    question: 'Ý nghĩa của việc thắp ba nén hương trước Phật đài là gì?',
    answer: 'A Di Đà Phật! Ba nén hương tượng trưng cho Tam Bảo: Phật - Pháp - Tăng, và cũng là ba phẩm hạnh của người tu: Giới hương (giữ gìn đạo đức trong sạch), Định hương (tâm hồn bình thản không dao động), và Tuệ hương (trí tuệ thấu suốt chân lý). Khi thắp hương, chúng ta nguyện giữ tâm mình thơm ngát như hương trầm ạ!',
  },
  {
    question: 'Con không có tiền cúng dường thì đi lễ chùa có được phước báu không?',
    answer: 'A Di Đà Phật! Đức Phật chỉ nhìn vào cái tâm chân thành chứ không nhìn vào mâm cao cỗ đầy hay tiền tài quý vị ơi! Một chén nước trong, một đóa hoa thơm hái ngoài vườn, hay đơn giản chỉ là một cử chỉ nhường nhịn, một nụ cười hòa ái với người xung quanh đều là phước báu vô lượng rồi ạ!',
  },
  {
    question: 'Xin Chú Tiểu chỉ đường cho con thăm các điện thờ trong chùa?',
    answer: 'Dạ, Chùa Online của chúng ta có: Đại Hùng Bảo Điện uy nghiêm để chiêm bái và thắp hương Phật tổ; La Hán Đường với 18 tôn tượng La Hán nhiệm màu; Điện Trì Tụng để nghe kinh và gõ mõ tụng niệm; Pháp Đường nghe Thầy thuyết giảng; Tàng Kinh Các để đọc sách; Bàn Dâng Lễ Cúng Dường và Sổ Lưu Bút Thập Phương ạ!',
  },
];

export const SAMPLE_GUESTBOOK: TempleGuestbookEntry[] = [
  {
    id: 'gb-1',
    name: 'Nguyễn Văn Minh',
    dharmaName: 'Pháp danh Tâm An',
    location: 'Quận 1, TP. Hồ Chí Minh',
    wish: 'Nam Mô A Di Đà Phật. Con kính nguyện mười phương Chư Phật gia hộ cho cha mẹ con luôn dồi dào sức khỏe, sống đời bình an, gia đình thuận hòa ấm no, tai qua nạn khỏi.',
    createdAt: 'Hôm nay, 08:30',
    likes: 42,
    offeringsCount: 3,
  },
  {
    id: 'gb-2',
    name: 'Trần Thị Mỹ Duyên',
    dharmaName: 'Pháp danh Diệu Thiện',
    location: 'Hà Nội',
    wish: 'Con cầu nguyện cho con cái chăm ngoan học giỏi, thi cử đỗ đạt, công việc hanh thông, đất nước thanh bình nhân dân ấm no hạnh phúc.',
    createdAt: 'Hôm nay, 09:15',
    likes: 38,
    offeringsCount: 2,
  },
  {
    id: 'gb-3',
    name: 'Lê Hoàng Phong',
    dharmaName: 'Pháp danh Nhuận Trí',
    location: 'Đà Nẵng',
    wish: 'Được vào chiêm bái ngôi chùa online 3D thật thanh tịnh và trang nghiêm. Nguyện đem công đức này hồi hướng cho tất cả chúng sinh đều được an lạc và sớm giác ngộ.',
    createdAt: 'Hôm qua, 18:40',
    likes: 56,
    offeringsCount: 5,
  },
  {
    id: 'gb-4',
    name: 'Phạm Hồng Phúc',
    dharmaName: 'Pháp danh Thiện Duyên',
    location: 'Cần Thơ',
    wish: 'Con cầu bình an cho gia đạo, tiêu trừ mọi oan khiên tật ách, gieo duyên lành cho mọi người cùng biết đến Phật pháp từ bi.',
    createdAt: 'Hôm qua, 20:10',
    likes: 29,
    offeringsCount: 1,
  },
];

export interface TempleStoreItem {
  id: string;
  name: string;
  icon: string;
  category: 'nhang' | 'hoa' | 'qua' | 'den' | 'nuoc' | 'phapbao' | 'tu-tam';
  description: string;
  price: number; // VNĐ
  meritPoints: number;
  meaning: string;
}

export interface TempleMeritRecord {
  id: string; // Mã biên lai / điệp công đức
  memberId?: string;
  donorName: string;
  dharmaName?: string;
  phone?: string;
  address?: string;
  prayerType: 'cau-an' | 'cau-sieu' | 'hoi-huong' | 'suc-khoe' | 'thi-cu' | 'cong-danh' | 'khac';
  prayerText: string;
  sutraId?: string;
  sutraTitle?: string;
  items: {
    itemId: string;
    itemName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
  customDonation: number;
  totalAmount: number;
  totalMeritPoints: number;
  paymentMethod?: 'tuy-tam' | 'vietqr_admin' | 'paypal_admin';
  paymentStatus?: 'completed' | 'pending_admin' | 'approved';
  transactionCode?: string;
  createdAt: string;
}

export const TEMPLE_STORE_ITEMS: TempleStoreItem[] = [
  {
    id: 'store-nhang-tram',
    name: 'Nhang Trầm Hương Xứ Quảng',
    icon: '🪔',
    category: 'nhang',
    description: 'Bó nhang trầm kiến tự nhiên thơm ngát, tỏa khói thanh tao dâng Tam Bảo',
    price: 30000,
    meritPoints: 50,
    meaning: 'Giới hương, Định hương, Tuệ hương thấu khắp mười phương chư Phật',
  },
  {
    id: 'store-hoa-sen',
    name: 'Bó Hoa Sen Trắng Tinh Khiết Dâng Phật',
    icon: '🪷',
    category: 'hoa',
    description: 'Hoa sen trắng thanh bạch vừa hái sớm mai, biểu trưng tâm hồn thanh tịnh',
    price: 50000,
    meritPoints: 80,
    meaning: 'Gần bùn mà chẳng hôi tanh mùi bùn, tướng mạo đoan trang thanh cao',
  },
  {
    id: 'store-mam-ngu-qua',
    name: 'Mâm Ngũ Quả Cúng Phật Đủ Đầy',
    icon: '🍇',
    category: 'qua',
    description: 'Mâm ngũ quả tươi ngon (xoài, thanh long, táo, sung, nho) đong đầy phước báu',
    price: 100000,
    meritPoints: 150,
    meaning: 'Cầu mong hoa thơm quả ngọt, ngũ phúc lâm môn, mùa màng bội thu',
  },
  {
    id: 'store-cap-den-dau',
    name: 'Cặp Đèn Dầu Vô Lượng Quang',
    icon: '🕯️',
    category: 'den',
    description: 'Đôi ngọn hải đăng thắp sáng bàn thờ Phật cả ngày lẫn đêm',
    price: 40000,
    meritPoints: 60,
    meaning: 'Đốt sáng ngọn đèn trí tuệ, phá tan tăm tối mông muội chốn nhân gian',
  },
  {
    id: 'store-nuoc-cam-lo',
    name: 'Bình Nước Cam Lộ Tịnh Thủy',
    icon: '💧',
    category: 'nuoc',
    description: 'Nước nguồn ngọc tuyền thanh khiết gột rửa trần tâm phiền não',
    price: 20000,
    meritPoints: 35,
    meaning: 'Tưới mát những tâm hồn khô héo, hóa giải oán kết hận thù',
  },
  {
    id: 'store-hoa-dang',
    name: 'Đèn Hoa Đăng Cầu Bình An Hồ Sen',
    icon: '🌸',
    category: 'phapbao',
    description: 'Ngọn đèn hoa sen thả trôi trên mặt nước mang theo ước nguyện thiện lành',
    price: 35000,
    meritPoints: 55,
    meaning: 'Thắp sáng niềm hy vọng, cầu cho người thân bình an tai qua nạn khỏi',
  },
  {
    id: 'store-trang-hat',
    name: 'Tràng Hạt Bồ Đề 108 Hạt Trì Chú',
    icon: '📿',
    category: 'phapbao',
    description: 'Vòng chuỗi hạt Bồ Đề khai quang gia trì, trợ duyên niệm Phật an định',
    price: 80000,
    meritPoints: 120,
    meaning: 'Chặt đứt 108 phiền não trần thế, tâm an định trong từng hơi thở',
  },
  {
    id: 'store-dau-thap-den',
    name: 'Dầu Thắp Đèn Điện Đại Hùng Bảo Điện',
    icon: '🛢️',
    category: 'den',
    description: 'Góp dầu duy trì ngọn đèn trường minh nơi chánh điện ngôi chùa',
    price: 50000,
    meritPoints: 90,
    meaning: 'Công đức soi sáng đường tu, kiếp sau mắt sáng thông minh tài đức',
  },
  {
    id: 'store-ao-trang',
    name: 'Bộ Áo Tràng Lam Đi Chùa Tụng Kinh',
    icon: '👘',
    category: 'phapbao',
    description: 'Áo tràng lam truyền thống may đo trang nhã, phục vụ việc lễ bái tu tập',
    price: 120000,
    meritPoints: 200,
    meaning: 'Tâm khiêm hạ, trang phục tôn nghiêm hòa mình cùng đại chúng',
  },
];

export const INITIAL_MERIT_RECORDS: TempleMeritRecord[] = [
  {
    id: 'CB-20261104-001',
    donorName: 'Đỗ Minh Hiếu',
    dharmaName: 'Nhuận Trí',
    phone: '0985***688',
    address: 'Quảng Ngãi / TP. Hồ Chí Minh',
    prayerType: 'cau-an',
    prayerText: 'Nguyện cầu mười phương Chư Phật gia hộ cho cha mẹ mạnh khỏe sống lâu trăm tuổi, gia đạo bình an, công việc hanh thông, mọi sự kiết tường như ý.',
    sutraId: 'kinh-duoc-su',
    sutraTitle: 'Kinh Dược Sư Cầu Bình An & Sức Khỏe Cho Gia Đạo',
    items: [
      { itemId: 'store-nhang-tram', itemName: 'Nhang Trầm Hương Xứ Quảng', quantity: 1, price: 30000, subtotal: 30000 },
      { itemId: 'store-hoa-sen', itemName: 'Bó Hoa Sen Trắng Tinh Khiết Dâng Phật', quantity: 2, price: 50000, subtotal: 100000 },
      { itemId: 'store-mam-ngu-qua', itemName: 'Mâm Ngũ Quả Cúng Phật Đủ Đầy', quantity: 1, price: 100000, subtotal: 100000 },
    ],
    customDonation: 50000,
    totalAmount: 280000,
    totalMeritPoints: 420,
    paymentMethod: 'vietqr_admin',
    paymentStatus: 'approved',
    createdAt: '2026-11-04 08:30:00',
  },
  {
    id: 'CB-20261103-089',
    donorName: 'Nguyễn Thị Diệu Hương',
    dharmaName: 'Diệu Tâm',
    phone: '0912***345',
    address: 'Ba Đình, Hà Nội',
    prayerType: 'cau-sieu',
    prayerText: 'Cầu siêu cho Cửu Huyền Thất Tổ, cha mẹ nhiều đời nhiều kiếp và hương linh sớm vãng sanh về cõi Tây Phương Cực Lạc.',
    sutraId: 'kinh-a-di-da',
    sutraTitle: 'Kinh A Di Đà (Cầu Siêu Độ Cửu Huyền Thất Tổ & Vãng Sanh Cực Lạc)',
    items: [
      { itemId: 'store-cap-den-dau', itemName: 'Cặp Đèn Dầu Vô Lượng Quang', quantity: 1, price: 40000, subtotal: 40000 },
      { itemId: 'store-hoa-dang', itemName: 'Đèn Hoa Đăng Cầu Bình An Hồ Sen', quantity: 3, price: 35000, subtotal: 105000 },
    ],
    customDonation: 100000,
    totalAmount: 245000,
    totalMeritPoints: 350,
    paymentMethod: 'vietqr_admin',
    paymentStatus: 'approved',
    createdAt: '2026-11-03 15:45:00',
  },
  {
    id: 'CB-20261102-045',
    donorName: 'Trần Văn Phúc',
    dharmaName: 'Phúc Thiện',
    phone: '0903***789',
    address: 'Hải Châu, Đà Nẵng',
    prayerType: 'thi-cu',
    prayerText: 'Cầu cho con cái tâm trí sáng suốt, ôn thi đại học hanh thông đỗ đạt, ngoan ngoãn hiếu thuận với ông bà cha mẹ.',
    sutraId: 'bat-nha-tam-kinh',
    sutraTitle: 'Bát Nhã Ba La Mật Đa Tâm Kinh (Kinh Trí Tuệ Bát Nhã)',
    items: [
      { itemId: 'store-trang-hat', itemName: 'Tràng Hạt Bồ Đề 108 Hạt Trì Chú', quantity: 1, price: 80000, subtotal: 80000 },
      { itemId: 'store-nuoc-cam-lo', itemName: 'Bình Nước Cam Lộ Tịnh Thủy', quantity: 2, price: 20000, subtotal: 40000 },
    ],
    customDonation: 30000,
    totalAmount: 150000,
    totalMeritPoints: 230,
    paymentMethod: 'tuy-tam',
    paymentStatus: 'completed',
    createdAt: '2026-11-02 10:20:00',
  },
];

// =========================================================================
// HOA VIÊN TÂM LINH & KHU MỘ TƯỞNG NIỆM 3D (MEMORIAL PARK 3D DATA & CATALOG)
// =========================================================================

export interface TombMaterialOption {
  id:
    | 'da_xanh_cong_duc'
    | 'da_xanh_thanh_hoa'
    | 'granite_kim_sa'
    | 'cam_thach_trang'
    | 'hoang_gia_ma_vang';
  name: string;
  subtitle: string;
  price: number;
  baseColorHex: string;
  accentColorHex: string;
  steleBgHex: string;
  steleTextHex: string;
  roughness: number;
  metalness: number;
  description: string;
}

export interface TombArchitectureOption {
  id: 'mo_don_tam_cap' | 'mo_mai_dao_co' | 'mo_thap_lien_hoa' | 'lang_mo_hoang_gia';
  name: string;
  price: number;
  badge: string;
  description: string;
}

export interface TombAddonItem {
  id: 'lu_huong_da' | 'den_da' | 'binh_sen_ngoc' | 'doi_hac_da' | 'cay_tung_bonsai' | 'hao_quang_phat';
  name: string;
  icon: string;
  price: number;
  description: string;
}

export interface MemorialPlotSlot {
  plotCode: string;
  zoneName: string;
  rowIndex: number;
  colIndex: number;
  plotFee: number;
}

export interface MemorialTombRecord {
  id: string;
  plotCode: string;
  zoneName: string;
  rowIndex: number;
  colIndex: number;
  steleHeader: string; // PHẬT QUANG TIẾP DẪN | CỐ PHỤ | CỐ MẪU | BIA TƯỞNG NIỆM
  deceasedFullName: string;
  deceasedDharmaName?: string;
  gender: 'Nam' | 'Nữ';
  birthSolar: string;  // DD/MM/YYYY
  birthLunar: string;  // DD/MM năm Can Chi
  deathSolar: string;  // DD/MM/YYYY
  deathLunar: string;  // DD/MM năm Can Chi
  longevityType: 'huong-tho' | 'huong-duong' | 'huong-nien';
  longevityAge: number;
  hometown?: string;
  epitaph?: string;
  erectedBy: string;
  memberId?: string;
  builderName: string;
  builderPhone?: string;
  builderEmail?: string;
  materialId: TombMaterialOption['id'];
  architectureId: TombArchitectureOption['id'];
  addons: TombAddonItem['id'][];
  dedicatedSutraId?: string;
  totalCost: number;
  paymentMethod: 'tuy-tam' | 'vietqr_admin' | 'paypal_admin';
  paymentStatus: 'approved' | 'pending_admin';
  incenseCount: number;
  flowerCount: number;
  lastIncenseAt?: string;
  createdAt: string;
  isDraft?: boolean;
}

export interface MemorialTributeRecord {
  id: string;
  tombId: string;
  plotCode: string;
  visitorName: string;
  tributeType: 'dot-nhang' | 'dang-hoa' | 'don-dep' | 'thap-den' | 'tung-kinh' | 'mua-vat-pham';
  itemName?: string;
  amount?: number;
  message: string;
  createdAt: string;
}

export interface TempleMemberRecord {
  id: string;
  username?: string;
  fullName: string;
  dharmaName?: string;
  phone?: string;
  email?: string;
  address?: string;
  meritPoints: number;
  totalDonated: number;
  tombsBuilt: number;
  createdAt: string;
}

export interface TempleAdminPaymentSettings {
  bankId: string;        // MB, VCB, ACB, TCB, BIDV, VPB, etc.
  bankName: string;
  accountNo: string;
  accountName: string;
  paypalMeUrl: string;
  adminContact: string;
  autoApproveOrders: boolean;
  noteTemplate: string;
}

export const DEFAULT_TEMPLE_ADMIN_PAYMENT: TempleAdminPaymentSettings = {
  bankId: 'MB',
  bankName: 'Ngân hàng Quân Đội (MB Bank)',
  accountNo: '0985123688',
  accountName: 'MINH HIEU OFFICIAL VN',
  paypalMeUrl: 'https://www.paypal.com',
  adminContact: 'Quản trị viên Minh Hiếu Official VN (@MinhHieuOfficialvn)',
  autoApproveOrders: true,
  noteTemplate: 'CUNG DUONG CHUA HOA VIEN 3D',
};

export const TOMB_MATERIAL_CATALOG: TombMaterialOption[] = [
  {
    id: 'da_xanh_cong_duc',
    name: 'Đá Xanh Công Đức (Miễn Phí Tùy Tâm)',
    subtitle: 'Miễn phí 0 đ · Thành tâm lập mộ báo hiếu',
    price: 0,
    baseColorHex: '#3f524d',
    accentColorHex: '#94a3b8',
    steleBgHex: '#1f2926',
    steleTextHex: '#fde68a',
    roughness: 0.72,
    metalness: 0.1,
    description: 'Đá xanh truyền thống nhà chùa trợ duyên 0 đ để mọi gia đình đều có thể lập mộ 3D tưởng nhớ người thân.',
  },
  {
    id: 'da_xanh_thanh_hoa',
    name: 'Đá Xanh Rêu Cổ Kính Thanh Hóa',
    subtitle: 'Mộc mạc truyền thống Việt Nam',
    price: 500000,
    baseColorHex: '#4b5b56',
    accentColorHex: '#7d8e87',
    steleBgHex: '#232e2b',
    steleTextHex: '#f4e3b2',
    roughness: 0.68,
    metalness: 0.12,
    description: 'Đá xanh rêu nguyên khối chạm khắc hoa văn sen cổ, mang nét trầm mặc trang nghiêm truyền thống.',
  },
  {
    id: 'granite_kim_sa',
    name: 'Đá Hoa Cương Granite Đen Kim Sa',
    subtitle: 'Bền bỉ vĩnh cửu • Bia khắc vàng nổi bật',
    price: 1200000,
    baseColorHex: '#1f232a',
    accentColorHex: '#d4af37',
    steleBgHex: '#101318',
    steleTextHex: '#ffd86b',
    roughness: 0.24,
    metalness: 0.45,
    description: 'Đá Granite đen ánh kim sa đánh bóng gương sang trọng, chữ khắc vàng kim rõ nét như ngoài đời thật.',
  },
  {
    id: 'cam_thach_trang',
    name: 'Đá Cẩm Thạch Trắng Ngọc Bích Non Nước',
    subtitle: 'Thanh khiết Tịnh Độ • Trang nhã cao quý',
    price: 2500000,
    baseColorHex: '#e6e4de',
    accentColorHex: '#c59b27',
    steleBgHex: '#1c252c',
    steleTextHex: '#ffe599',
    roughness: 0.28,
    metalness: 0.22,
    description: 'Đá cẩm thạch trắng vân mây thanh thoát tượng trưng cho cõi Liên Hoa Tịnh Độ tinh khôi.',
  },
  {
    id: 'hoang_gia_ma_vang',
    name: 'Đá Hoàng Gia Cẩm Thạch Vàng & Kim Sơn',
    subtitle: 'Uy nghiêm bậc nhất • Chạm rồng sen thếp vàng',
    price: 5000000,
    baseColorHex: '#634819',
    accentColorHex: '#ffd700',
    steleBgHex: '#1a0f07',
    steleTextHex: '#ffe066',
    roughness: 0.22,
    metalness: 0.65,
    description: 'Đá hoàng gia quý hiếm kết hợp viền thếp vàng 24K rực rỡ, tôn vinh trọn vẹn lòng đại hiếu của con cháu.',
  },
];

export const TOMB_ARCHITECTURE_CATALOG: TombArchitectureOption[] = [
  {
    id: 'mo_don_tam_cap',
    name: 'Mộ Đá Tam Cấp Truyền Thống',
    price: 0,
    badge: 'Tiêu chuẩn',
    description: 'Thiết kế 3 cấp đá vững chãi (Thiên - Địa - Nhân) cùng bia đá khắc nổi trang nghiêm.',
  },
  {
    id: 'mo_mai_dao_co',
    name: 'Mộ Đá Một Mái Đao Chùa Cổ',
    price: 800000,
    badge: 'Phổ biến',
    description: 'Bốn trụ đá chạm câu đối nâng đỡ mái đao cong truyền thống che mưa nắng cho bia tưởng niệm.',
  },
  {
    id: 'mo_thap_lien_hoa',
    name: 'Bảo Tháp Liên Hoa Tịnh Độ',
    price: 1600000,
    badge: 'Phật Giáo',
    description: 'Kiến trúc đài sen nâng bảo tháp thanh cao dành cho Phật tử thuần thành quy y Tam Bảo.',
  },
  {
    id: 'lang_mo_hoang_gia',
    name: 'Khu Lăng Mộ Đá Hai Mái Đao & Lan Can',
    price: 3200000,
    badge: 'Cao cấp 3D',
    description: 'Khuôn viên lăng mộ bề thế có lan can đá bao quanh, cổng bậc tam cấp và hai tầng mái đao uy nghi.',
  },
];

export const TOMB_ADDON_ITEMS: TombAddonItem[] = [
  {
    id: 'lu_huong_da',
    name: 'Lư Hương Đá Chạm Rồng & Bát Nhang',
    icon: '🪔',
    price: 150000,
    description: 'Đặt chính giữa trước mộ để con cháu thắp nhang tưởng nhớ tỏa khói trầm 3D ngày đêm.',
  },
  {
    id: 'den_da',
    name: 'Cặp Đèn Đá Tứ Phương Thắp Sáng',
    icon: '🏮',
    price: 250000,
    description: 'Đôi đèn đá lục lăng tỏa ánh sáng ấm áp hai bên ngôi mộ suốt đêm trường.',
  },
  {
    id: 'binh_sen_ngoc',
    name: 'Đôi Bình Hoa Sen Thanh Khiết Dâng Mộ',
    icon: '🪷',
    price: 180000,
    description: 'Hai bình gốm ngọc cắm hoa sen hồng tươi thắm đặt trang trọng trên bàn lễ.',
  },
  {
    id: 'doi_hac_da',
    name: 'Đôi Hạc Đá Cưỡi Quy Chầu Bia',
    icon: '🦢',
    price: 350000,
    description: 'Biểu tượng trường tồn và thanh cao của văn hóa tâm linh người Việt.',
  },
  {
    id: 'cay_tung_bonsai',
    name: 'Cặp Tùng La Hán Xanh Mát Bên Mộ',
    icon: '🌲',
    price: 220000,
    description: 'Hai cây tùng bách bốn mùa xanh tốt che mát và tụ khí lành cho phần mộ.',
  },
  {
    id: 'hao_quang_phat',
    name: 'Vầng Hào Quang Liên Hoa Tiếp Dẫn 3D',
    icon: '✨',
    price: 400000,
    description: 'Vòng ánh sáng Phật quang vàng kim xoay nhẹ phía sau bia mộ, cầu siêu vãng sanh Cực Lạc.',
  },
];

export const MEMORIAL_PLOT_SLOTS: MemorialPlotSlot[] = (() => {
  const zones = [
    { rowIndex: 0, prefix: 'A', zoneName: 'Khu Liên Hoa Thượng Phẩm (Hàng Đầu Gần Đài Địa Tạng)', plotFee: 1000000 },
    { rowIndex: 1, prefix: 'B', zoneName: 'Khu Tịnh Độ An Nhiên (Hàng Trung Tâm)', plotFee: 600000 },
    { rowIndex: 2, prefix: 'C', zoneName: 'Khu Báo Hiếu Từ Tâm (Hàng Thanh Tịnh)', plotFee: 300000 },
    { rowIndex: 3, prefix: 'D', zoneName: 'Khu Bồ Đề Tĩnh Lặng (Miễn Phí Đất Tùy Tâm)', plotFee: 0 },
  ];
  const slots: MemorialPlotSlot[] = [];
  for (const z of zones) {
    for (let col = 0; col < 6; col++) {
      slots.push({
        plotCode: `${z.prefix}${col + 1}`,
        zoneName: z.zoneName,
        rowIndex: z.rowIndex,
        colIndex: col,
        plotFee: z.plotFee,
      });
    }
  }
  return slots;
})();

export const INITIAL_MEMORIAL_TOMBS: MemorialTombRecord[] = [];



