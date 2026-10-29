import { VoiceItem } from '../types/tts';

export const VIETNAMESE_VOICES: VoiceItem[] = [
  {
    code: 'vi_male_lehoang_mb',
    name: 'Lê Hoàng Nam',
    gender: 'Nam',
    region: 'Miền Bắc',
    language: 'Tiếng Việt',
    langCode: 'vi-VN',
    description:
      'Giọng nam miền Bắc chuẩn mực, đĩnh đạc, ấm áp và rõ chữ — giọng đọc chính mặc định cho giảng bài, tin tức & thuyết minh.',
    creditCost: 1000,
    sampleText:
      'Xin chào các em! Thầy là Lê Hoàng Nam, hôm nay chúng ta cùng khám phá bài học mới thật vui và bổ ích nhé!',
    tags: ['Giảng bài', 'Mặc định', 'Phát thanh viên', 'Miền Bắc'],
  },
  {
    code: 'voice-74bb4b22-98a7-41a4',
    name: 'Minh Hiếu - Đạo Lý & Review Phim',
    gender: 'Nam',
    region: 'Thuyết pháp & Điện ảnh',
    language: 'Tiếng Việt',
    langCode: 'vi-VN',
    description:
      'Giọng đọc truyền cảm, sâu sắc, nhấn nhá cuốn hút phù hợp đọc kinh kệ, đạo lý cuộc sống và review phim.',
    creditCost: 1000,
    sampleText:
      'Cuộc đời mỗi con người giống như một cuốn phim dài, điều quý giá nhất chính là giữ được tâm sáng giữa muôn vàn biến động.',
    tags: ['Review phim', 'Đạo lý', 'Đặc biệt'],
  },
  {
    code: 'vi_female_kieunhi_mn',
    name: 'Kiều Nhi',
    gender: 'Nữ',
    region: 'Miền Nam',
    language: 'Tiếng Việt',
    langCode: 'vi-VN',
    description:
      'Giọng nữ miền Nam ngọt ngào, dịu dàng, truyền cảm cho kể chuyện thiếu nhi và tâm sự.',
    creditCost: 1000,
    sampleText:
      'Chào mừng quý vị và các bé đến với không gian nghe truyện và học tập đầy sắc màu.',
    tags: ['Miền Nam', 'Kể chuyện', 'Dịu dàng'],
  },
  {
    code: 'vi_female_thuytrang_mb',
    name: 'Thùy Trang',
    gender: 'Nữ',
    region: 'Miền Bắc',
    language: 'Tiếng Việt',
    langCode: 'vi-VN',
    description:
      'Giọng nữ miền Bắc trong trẻo, thanh thoát, chuẩn chính tả phù hợp đọc bài Tiếng Việt và podcast.',
    creditCost: 1000,
    sampleText:
      'Mỗi ngày học thêm một điều hay là một viên gạch hồng xây dựng tương lai tươi sáng.',
    tags: ['Miền Bắc', 'Trong trẻo', 'Giáo dục'],
  },
  {
    code: 'vi_male_minhtriet_mb',
    name: 'Minh Triết',
    gender: 'Nam',
    region: 'Miền Bắc',
    language: 'Tiếng Việt',
    langCode: 'vi-VN',
    description:
      'Giọng nam trầm ấm, điềm đạm, thích hợp sách nói triết lý, lịch sử và khoa học.',
    creditCost: 1000,
    sampleText:
      'Tri thức là ngọn hải đăng soi sáng hành trình trưởng thành của mỗi thế hệ.',
    tags: ['Sách nói', 'Khoa học', 'Trầm ấm'],
  },
  {
    code: 'vi_female_hacuc_mb',
    name: 'Hạ Cúc',
    gender: 'Nữ',
    region: 'Miền Bắc',
    language: 'Tiếng Việt',
    langCode: 'vi-VN',
    description:
      'Giọng nữ sâu lắng, êm ái, rất hợp đọc truyện đêm khuya và văn học nghệ thuật.',
    creditCost: 1000,
    sampleText:
      'Đêm đã khuya, mời bạn cùng lắng nghe những trang viết bình yên và sâu lắng.',
    tags: ['Đêm khuya', 'Văn học'],
  },
];

export const INTERNATIONAL_VOICES: VoiceItem[] = [
  {
    code: 'en_female_emily_us',
    name: 'Emily (US Native)',
    gender: 'Nữ',
    region: 'Hoa Kỳ (US)',
    language: 'English (US)',
    langCode: 'en-US',
    description:
      'Giọng nữ Tiếng Anh chuẩn Mỹ (American English) phát âm rõ từng âm tiết và ngữ điệu tự nhiên.',
    creditCost: 1000,
    sampleText: 'Hello everyone! Welcome to our interactive English pronunciation studio.',
    tags: ['English US', 'Chuẩn bản xứ', 'IELTS/TOEIC'],
  },
  {
    code: 'en_male_echo_default',
    name: 'Echo (US Male)',
    gender: 'Nam',
    region: 'Hoa Kỳ (US)',
    language: 'English (US)',
    langCode: 'en-US',
    description:
      'Giọng nam Tiếng Anh chuẩn Mỹ rõ ràng, mạnh mẽ cho luyện nghe giao tiếp và thuyết trình.',
    creditCost: 1000,
    sampleText: 'Practice makes progress. Let us read this English sentence together!',
    tags: ['English US', 'Giao tiếp'],
  },
  {
    code: 'en_female_elara_br',
    name: 'Elara (UK British)',
    gender: 'Nữ',
    region: 'Vương quốc Anh (UK)',
    language: 'English (UK)',
    langCode: 'en-GB',
    description:
      'Giọng nữ Tiếng Anh chuẩn Anh Quốc (Received Pronunciation) thanh lịch, chuẩn học thuật.',
    creditCost: 1000,
    sampleText: 'Good morning! Let us practise authentic British English intonation.',
    tags: ['English UK', 'Học thuật'],
  },
];

export const ALL_VOICES: VoiceItem[] = [...VIETNAMESE_VOICES, ...INTERNATIONAL_VOICES];

export const SAMPLE_TEXT_PRESETS: {
  title: string;
  text: string;
  recommendedVoice: string;
}[] = [
  {
    title: 'Đạo lý & Phật pháp',
    text: 'Nam mô A Di Đà Phật. Tâm bình thế giới bình, giữ lòng thanh tịnh giữa dòng đời vạn biến chính là cội nguồn của an lạc.',
    recommendedVoice: 'voice-74bb4b22-98a7-41a4',
  },
  {
    title: 'Review Phim Kịch Tính',
    text: 'Giữa cơn mưa tầm tã nơi con hẻm nhỏ, nhân vật chính bất ngờ nhận ra manh mối cuối cùng đã nằm ngay trước mắt mình suốt mười năm qua.',
    recommendedVoice: 'vi_male_lehoang_mb',
  },
  {
    title: 'Bài Giảng Cho Bé',
    text: 'Chào các em học sinh thân mến! Hôm nay thầy trò mình cùng ôn lại quy tắc tính chu vi và diện tích hình chữ nhật thật dễ nhớ nhé.',
    recommendedVoice: 'vi_male_lehoang_mb',
  },
  {
    title: 'Luyện Nghe Tiếng Anh',
    text: 'Learning a new language opens doors to wonderful cultures, friendships, and boundless knowledge around the world.',
    recommendedVoice: 'en_female_emily_us',
  },
];
