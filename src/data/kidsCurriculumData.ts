export type SchoolTier = 'tieu-hoc' | 'thcs' | 'thpt';

export type SubjectId = 'tieng-viet' | 'tieng-anh' | 'toan' | 'khoa-hoc' | 'kham-pha';

export type QuestionInteractionType = 'multiple-choice' | 'word-order' | 'fill-blank';

export interface LearningQuestion {
  id: string;
  tier: SchoolTier;
  grade: number; // 1..12
  subject: SubjectId;
  topic: string;
  type: QuestionInteractionType;
  prompt: string;
  /** Optional phonetic / formula / sub-caption displayed prominently */
  visualFormulaOrHint?: string;
  /** Text optimized for TTS reading by Lê Hoàng Nam */
  spokenPrompt?: string;
  /** Options for multiple-choice */
  options?: string[];
  /** Correct index for multiple-choice */
  correctIndex?: number;
  /** Tokens for word-order game (shuffled in UI) */
  wordTokens?: string[];
  /** Target ordered sentence or accepted answers for fill-blank */
  acceptedAnswers?: string[];
  hint: string;
  explanation: string;
  points: number;
}

export interface LearningFlashcard {
  id: string;
  tier: SchoolTier;
  grade: number;
  subject: SubjectId;
  frontTitle: string;
  frontSubtitle?: string;
  frontBadge: string;
  backContent: string;
  example: string;
  spokenText: string;
}

export interface SchoolTierMeta {
  id: SchoolTier;
  label: string;
  shortLabel: string;
  gradesLabel: string;
  grades: number[];
  description: string;
  accentClass: string;
  badgeClass: string;
}

export interface SubjectMeta {
  id: SubjectId;
  name: string;
  shortName: string;
  description: string;
  colorHex: string;
  borderClass: string;
  bgSoftClass: string;
  textClass: string;
}

export const SCHOOL_TIERS: SchoolTierMeta[] = [
  {
    id: 'tieu-hoc',
    label: 'Tiểu Học (Cấp 1)',
    shortLabel: 'Tiểu Học',
    gradesLabel: 'Lớp 1 – Lớp 5',
    grades: [1, 2, 3, 4, 5],
    description: 'Đánh vần, chính tả Tiếng Việt, từ vựng Tiếng Anh vui nhộn, tính nhẩm & toán đố trực quan.',
    accentClass: 'from-emerald-500 to-teal-500',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  },
  {
    id: 'thcs',
    label: 'Trung Học Cơ Sở (Cấp 2)',
    shortLabel: 'THCS (Cấp 2)',
    gradesLabel: 'Lớp 6 – Lớp 9',
    grades: [6, 7, 8, 9],
    description: 'Ngữ văn & tu từ, ngữ pháp Tiếng Anh, Đại số - Hình học, Khoa học tự nhiên Lý - Hóa - Sinh.',
    accentClass: 'from-sky-500 to-indigo-500',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  },
  {
    id: 'thpt',
    label: 'Trung Học Phổ Thông (Cấp 3)',
    shortLabel: 'THPT (Cấp 3)',
    gradesLabel: 'Lớp 10 – Lớp 12',
    grades: [10, 11, 12],
    description: 'Đọc hiểu văn học, Tiếng Anh học thuật, Giải tích - Xác suất - Hình không gian & Vật lý nâng cao.',
    accentClass: 'from-amber-500 to-orange-500',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  },
];

export const SUBJECTS_META: SubjectMeta[] = [
  {
    id: 'tieng-viet',
    name: 'Tiếng Việt & Ngữ Văn',
    shortName: 'Tiếng Việt / Văn',
    description: 'Chính tả, từ vựng, thành ngữ, ca dao và cảm thụ văn học Việt Nam',
    colorHex: '#F59E0B',
    borderClass: 'border-amber-500/40',
    bgSoftClass: 'bg-amber-500/10',
    textClass: 'text-amber-300',
  },
  {
    id: 'tieng-anh',
    name: 'Tiếng Anh Giao Tiếp & Ngữ Pháp',
    shortName: 'Tiếng Anh',
    description: 'Từ vựng theo chủ đề, phát âm, cấu trúc câu và đọc hiểu song ngữ',
    colorHex: '#0EA5E9',
    borderClass: 'border-sky-500/40',
    bgSoftClass: 'bg-sky-500/10',
    textClass: 'text-sky-300',
  },
  {
    id: 'toan',
    name: 'Toán Học & Tư Duy Số',
    shortName: 'Toán Học',
    description: 'Tính nhẩm, phân số, toán đố, đại số, hình học và giải tích',
    colorHex: '#10B981',
    borderClass: 'border-emerald-500/40',
    bgSoftClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-300',
  },
  {
    id: 'khoa-hoc',
    name: 'Khoa Học Tự Nhiên',
    shortName: 'Khoa Học',
    description: 'Tự nhiên & xã hội, Vật lý, Hóa học, Sinh học quanh ta',
    colorHex: '#8B5CF6',
    borderClass: 'border-violet-500/40',
    bgSoftClass: 'bg-violet-500/10',
    textClass: 'text-violet-300',
  },
  {
    id: 'kham-pha',
    name: 'Sử - Địa & Khám Phá',
    shortName: 'Khám Phá',
    description: 'Lịch sử hào hùng, địa lý Việt Nam và đố vui tư duy logic',
    colorHex: '#F43F5E',
    borderClass: 'border-rose-500/40',
    bgSoftClass: 'bg-rose-500/10',
    textClass: 'text-rose-300',
  },
];

export const CURRICULUM_QUESTIONS: LearningQuestion[] = [
  // =========================================================================
  // TIỂU HỌC (LỚP 1 - 5)
  // =========================================================================
  // --- TIẾNG VIỆT (TIỂU HỌC) ---
  {
    id: 'th-tv-1',
    tier: 'tieu-hoc',
    grade: 1,
    subject: 'tieng-viet',
    topic: 'Chính tả chữ C / K',
    type: 'multiple-choice',
    prompt: 'Điền chữ cái đúng vào chỗ trống để tạo thành từ có nghĩa: "...iến chăm chỉ tha mồi về tổ."',
    visualFormulaOrHint: 'Quy tắc: Chữ K đi với nguyên âm i, e, ê',
    spokenPrompt: 'Điền chữ cái đúng vào chỗ trống: chấm chấm chấm, iến chăm chỉ tha mồi về tổ. Bé chọn chữ C, chữ K, chữ Q hay chữ G?',
    options: ['K (Kiến)', 'C (Ciến)', 'Q (Qiến)', 'G (Giến)'],
    correctIndex: 0,
    hint: 'Trước các chữ cái i, e, ê, ta luôn viết phụ âm K thay vì C nhé!',
    explanation: 'Chính xác! Trong Tiếng Việt, phụ âm "K" luôn đứng trước các nguyên âm i, e, ê. Vì vậy ta viết là "Kiến chăm chỉ".',
    points: 10,
  },
  {
    id: 'th-tv-2',
    tier: 'tieu-hoc',
    grade: 2,
    subject: 'tieng-viet',
    topic: 'Ghép câu Ca dao hiếu thảo',
    type: 'word-order',
    prompt: 'Bé hãy chạm vào các thẻ từ theo đúng thứ tự để ghép thành câu ca dao quen thuộc về công ơn cha mẹ:',
    visualFormulaOrHint: 'Ca dao Việt Nam (6 chữ)',
    spokenPrompt: 'Bé hãy sắp xếp các thẻ từ sau để tạo thành câu ca dao quen thuộc về công ơn cha mẹ nhé: Công cha như núi Thái Sơn.',
    wordTokens: ['Công', 'cha', 'như', 'núi', 'Thái', 'Sơn'],
    acceptedAnswers: ['Công cha như núi Thái Sơn'],
    hint: 'Bắt đầu bằng hai chữ "Công cha..." và kết thúc bằng tên ngọn núi "Thái Sơn".',
    explanation: 'Giỏi lắm! Câu ca dao "Công cha như núi Thái Sơn, Nghĩa mẹ như nước trong nguồn chảy ra" nhắc nhở chúng ta luôn hiếu thảo, biết ơn cha mẹ.',
    points: 15,
  },
  {
    id: 'th-tv-3',
    tier: 'tieu-hoc',
    grade: 3,
    subject: 'tieng-viet',
    topic: 'Từ chỉ đặc điểm & Từ trái nghĩa',
    type: 'multiple-choice',
    prompt: 'Từ nào dưới đây trái nghĩa với từ "Chăm chỉ"?',
    spokenPrompt: 'Đố bé, từ nào dưới đây trái nghĩa với từ chăm chỉ?',
    options: ['Cần cù', 'Lười biếng', 'Siêng năng', 'Ngoan ngoãn'],
    correctIndex: 1,
    hint: 'Cần cù và siêng năng cùng nghĩa với chăm chỉ. Hãy tìm từ mang nghĩa ngược lại nhé!',
    explanation: '"Lười biếng" là từ trái nghĩa với "Chăm chỉ". Còn "Cần cù" và "Siêng năng" là các từ đồng nghĩa với chăm chỉ.',
    points: 10,
  },
  {
    id: 'th-tv-4',
    tier: 'tieu-hoc',
    grade: 4,
    subject: 'tieng-viet',
    topic: 'Chủ ngữ và Vị ngữ trong câu kể',
    type: 'multiple-choice',
    prompt: 'Trong câu "Đàn cò trắng bay lả rập rờn trên cánh đồng lúa chín.", bộ phận Chủ ngữ là gì?',
    spokenPrompt: 'Trong câu: Đàn cò trắng bay lả rập rờn trên cánh đồng lúa chín. Bộ phận chủ ngữ là gì?',
    options: [
      'Đàn cò trắng',
      'Bay lả rập rờn',
      'Trên cánh đồng lúa chín',
      'Cánh đồng lúa chín',
    ],
    correctIndex: 0,
    hint: 'Chủ ngữ trả lời cho câu hỏi "Con gì?" đang thực hiện hành động bay lả rập rờn.',
    explanation: '"Đàn cò trắng" trả lời cho câu hỏi "Con gì?", giữ vai trò Chủ ngữ. Còn "bay lả rập rờn trên cánh đồng lúa chín" là bộ phận Vị ngữ.',
    points: 15,
  },
  {
    id: 'th-tv-5',
    tier: 'tieu-hoc',
    grade: 5,
    subject: 'tieng-viet',
    topic: 'Từ đồng âm và Từ nhiều nghĩa',
    type: 'multiple-choice',
    prompt: 'Trong hai cụm từ "Đường phèn ngọt lịm" và "Con đường làng quanh co", từ "đường" thuộc hiện tượng từ vựng nào?',
    spokenPrompt: 'Trong hai cụm từ: Đường phèn ngọt lịm, và Con đường làng quanh co. Từ đường thuộc hiện tượng từ vựng nào?',
    options: ['Từ đồng âm', 'Từ đồng nghĩa', 'Từ trái nghĩa', 'Từ láy âm'],
    correctIndex: 0,
    hint: 'Hai từ "đường" đọc và viết giống hệt nhau nhưng nghĩa hoàn toàn khác xa nhau!',
    explanation: 'Đúng rồi! "Đường" (thực phẩm có vị ngọt) và "đường" (lối đi lại) phát âm giống hệt nhau nhưng nghĩa hoàn toàn khác nhau, gọi là Từ đồng âm.',
    points: 15,
  },

  // --- TIẾNG ANH (TIỂU HỌC) ---
  {
    id: 'th-en-1',
    tier: 'tieu-hoc',
    grade: 1,
    subject: 'tieng-anh',
    topic: 'Colors & Fruits (Màu sắc & Trái cây)',
    type: 'multiple-choice',
    prompt: 'Quả táo màu đỏ trong Tiếng Anh được nói như thế nào?',
    visualFormulaOrHint: 'Apple /ˈæp.əl/ = Quả táo',
    spokenPrompt: 'Quả táo màu đỏ trong Tiếng Anh được nói như thế nào?',
    options: ['A red apple', 'A blue banana', 'A yellow cat', 'A green dog'],
    correctIndex: 0,
    hint: 'Red là màu đỏ, và Apple là quả táo!',
    explanation: 'Tuyệt vời! "Red" nghĩa là màu đỏ, "Apple" nghĩa là quả táo. Trong Tiếng Anh tính từ chỉ màu sắc đứng trước danh từ: "A red apple".',
    points: 10,
  },
  {
    id: 'th-en-2',
    tier: 'tieu-hoc',
    grade: 3,
    subject: 'tieng-anh',
    topic: 'Giới thiệu bản thân bằng Tiếng Anh',
    type: 'word-order',
    prompt: 'Sắp xếp các từ Tiếng Anh sau thành câu chào hỏi đúng ngữ pháp ("Xin chào, tên mình là Nam"):',
    visualFormulaOrHint: 'Mẫu câu làm quen lớp 3',
    spokenPrompt: 'Bé hãy sắp xếp các từ Tiếng Anh để được câu: Xin chào, tên của mình là Nam.',
    wordTokens: ['Hello,', 'my', 'name', 'is', 'Nam.'],
    acceptedAnswers: ['Hello, my name is Nam.'],
    hint: 'Bắt đầu bằng lời chào "Hello," tiếp theo là "my name is...".',
    explanation: 'Chuẩn xác! "Hello, my name is Nam." là câu tự giới thiệu tên lịch sự và tự nhiên nhất trong Tiếng Anh.',
    points: 15,
  },
  {
    id: 'th-en-3',
    tier: 'tieu-hoc',
    grade: 4,
    subject: 'tieng-anh',
    topic: 'Daily Routines (Hoạt động hằng ngày)',
    type: 'multiple-choice',
    prompt: 'Chọn động từ đúng để hoàn thành câu: "She ______ to school at 7 o\'clock every morning."',
    visualFormulaOrHint: 'Chủ ngữ số ít (He / She / It) + V-s/es',
    spokenPrompt: 'Chọn động từ đúng cho câu: She, chấm chấm, to school at seven o clock every morning.',
    options: ['goes', 'go', 'going', 'went'],
    correctIndex: 0,
    hint: 'Chủ ngữ là "She" (ngôi thứ ba số ít) ở thì hiện tại đơn ("every morning"), động từ "go" cần thêm "-es".',
    explanation: 'Xuất sắc! Với trạng ngữ "every morning" (mỗi sáng) và chủ ngữ số ít "She", động từ "go" chia thành "goes".',
    points: 15,
  },
  {
    id: 'th-en-4',
    tier: 'tieu-hoc',
    grade: 5,
    subject: 'tieng-anh',
    topic: 'Past Simple (Thì quá khứ đơn cơ bản)',
    type: 'multiple-choice',
    prompt: 'Yesterday, my family ______ Ha Long Bay and took many photos.',
    visualFormulaOrHint: 'Yesterday (Hôm qua) → Quá khứ đơn (V-ed)',
    spokenPrompt: 'Chọn đáp án đúng cho câu có từ Yesterday: Hôm qua gia đình em đã thăm Vịnh Hạ Long.',
    options: ['visited', 'visit', 'visits', 'visiting'],
    correctIndex: 0,
    hint: '"Yesterday" nghĩa là ngày hôm qua (đã xảy ra rồi), nên ta chọn động từ có đuôi "-ed".',
    explanation: 'Chính xác! "Yesterday" là dấu hiệu của thì quá khứ đơn, nên động từ "visit" thêm đuôi "-ed" thành "visited".',
    points: 15,
  },

  // --- TOÁN HỌC (TIỂU HỌC) ---
  {
    id: 'th-math-1',
    tier: 'tieu-hoc',
    grade: 1,
    subject: 'toan',
    topic: 'Phép cộng trong phạm vi 20',
    type: 'fill-blank',
    prompt: 'Mẹ hái được 8 quả cam, bé hái thêm 7 quả cam nữa. Hỏi hai mẹ con có tất cả bao nhiêu quả cam?',
    visualFormulaOrHint: '8 + 7 = ?',
    spokenPrompt: 'Mẹ hái được 8 quả cam, bé hái thêm 7 quả cam nữa. Hỏi hai mẹ con có tất cả bao nhiêu quả cam?',
    acceptedAnswers: ['15', '15 quả', 'mười lăm'],
    hint: 'Tách 7 thành 2 và 5: lấy 8 + 2 = 10, rồi cộng thêm 5 nhé!',
    explanation: 'Quá giỏi! Ta tính nhẩm cực nhanh bằng cách gộp cho tròn chục: 8 + 2 = 10, sau đó 10 + 5 = 15 (quả cam).',
    points: 10,
  },
  {
    id: 'th-math-2',
    tier: 'tieu-hoc',
    grade: 3,
    subject: 'toan',
    topic: 'Bảng nhân & Chu vi hình chữ nhật',
    type: 'multiple-choice',
    prompt: 'Một sân chơi hình chữ nhật có chiều dài 12 m và chiều rộng 8 m. Chu vi của sân chơi đó bằng bao nhiêu mét?',
    visualFormulaOrHint: 'Chu vi HCN: P = (Dài + Rộng) × 2',
    spokenPrompt: 'Một sân chơi hình chữ nhật có chiều dài 12 mét và chiều rộng 8 mét. Hỏi chu vi sân chơi bằng bao nhiêu mét?',
    options: ['40 m', '20 m', '96 m', '32 m'],
    correctIndex: 0,
    hint: 'Lấy chiều dài cộng chiều rộng (12 + 8), được bao nhiêu rồi nhân với 2 nhé!',
    explanation: 'Chuẩn không cần chỉnh! Chu vi hình chữ nhật là: (12 + 8) × 2 = 20 × 2 = 40 (m). (Lưu ý: 96 m² là diện tích, không phải chu vi).',
    points: 15,
  },
  {
    id: 'th-math-3',
    tier: 'tieu-hoc',
    grade: 4,
    subject: 'toan',
    topic: 'Phân số bằng nhau & Rút gọn phân số',
    type: 'multiple-choice',
    prompt: 'Khi rút gọn phân số 12/18 về phân số tối giản, ta được kết quả nào?',
    visualFormulaOrHint: '12 / 18 = (12 : ?) / (18 : ?)',
    spokenPrompt: 'Khi rút gọn phân số mười hai phần mười tám về phân số tối giản, ta được phân số nào?',
    options: ['2/3', '6/9', '3/4', '4/6'],
    correctIndex: 0,
    hint: 'Cả 12 và 18 đều chia hết cho số lớn nhất là 6!',
    explanation: 'Đúng rồi! Chia cả tử số và mẫu số cho 6, ta có: 12 : 6 = 2 và 18 : 6 = 3. Phân số tối giản là 2/3.',
    points: 15,
  },
  {
    id: 'th-math-4',
    tier: 'tieu-hoc',
    grade: 5,
    subject: 'toan',
    topic: 'Chuyển động đều (Vận tốc - Quãng đường - Thời gian)',
    type: 'fill-blank',
    prompt: 'Một người đi xe đạp với vận tốc 15 km/giờ trong 2 giờ. Hỏi người đó đi được quãng đường dài bao nhiêu ki-lô-mét?',
    visualFormulaOrHint: 'Quãng đường: s = v × t',
    spokenPrompt: 'Một người đi xe đạp với vận tốc 15 ki lô mét trên giờ trong 2 giờ. Hỏi người đó đi được bao nhiêu ki lô mét?',
    acceptedAnswers: ['30', '30 km', '30km'],
    hint: 'Áp dụng công thức s = v × t: lấy 15 nhân với 2.',
    explanation: 'Tuyệt vời! Quãng đường người đó đi được là: s = v × t = 15 × 2 = 30 (km).',
    points: 15,
  },

  // --- KHOA HỌC & KHÁM PHÁ (TIỂU HỌC) ---
  {
    id: 'th-sci-1',
    tier: 'tieu-hoc',
    grade: 4,
    subject: 'khoa-hoc',
    topic: 'Quang hợp ở cây xanh',
    type: 'multiple-choice',
    prompt: 'Dưới ánh nắng mặt trời, lá cây xanh hấp thụ khí gì và nhả ra khí gì giúp con người hô hấp?',
    spokenPrompt: 'Dưới ánh nắng mặt trời, trong quá trình quang hợp, cây xanh hấp thụ khí gì và nhả ra khí gì?',
    options: [
      'Hấp thụ khí Các-bô-níc (CO2), nhả ra khí Ô-xi (O2)',
      'Hấp thụ khí Ô-xi (O2), nhả ra khí Các-bô-níc (CO2)',
      'Chỉ hấp thụ hơi nước và không nhả khí',
      'Hấp thụ khí Ni-tơ và nhả ra khói',
    ],
    correctIndex: 0,
    hint: 'Nhờ trồng nhiều cây xanh mà bầu không khí có thêm nhiều khí Ô-xi trong lành!',
    explanation: 'Chính xác! Khi quang hợp dưới ánh sáng mặt trời, cây xanh hấp thụ khí Các-bô-níc (CO2) và giải phóng khí Ô-xi (O2) quý giá cho sự sống.',
    points: 15,
  },
  {
    id: 'th-kp-1',
    tier: 'tieu-hoc',
    grade: 5,
    subject: 'kham-pha',
    topic: 'Lịch sử & Địa lý Việt Nam',
    type: 'multiple-choice',
    prompt: 'Chiến thắng Bạch Đằng năm 938 đánh tan quân Nam Hán bằng trận địa cọc ngầm gắn liền với vị anh hùng dân tộc nào?',
    spokenPrompt: 'Chiến thắng Bạch Đằng năm 938 đánh tan quân Nam Hán gắn liền với vị anh hùng dân tộc nào?',
    options: ['Ngô Quyền', 'Đinh Bộ Lĩnh', 'Lý Thường Kiệt', 'Quang Trung'],
    correctIndex: 0,
    hint: 'Chiến thắng năm 938 của ông đã chấm dứt hơn 1000 năm Bắc thuộc của dân tộc ta.',
    explanation: 'Xuất sắc! Năm 938, Ngô Quyền lãnh đạo nhân dân lợi dụng thủy triều lên xuống trên sông Bạch Đằng đóng cọc gỗ bịt sắt đánh tan quân Nam Hán, mở ra kỷ nguyên độc lập lâu dài.',
    points: 15,
  },

  // =========================================================================
  // TRUNG HỌC CƠ SỞ - CẤP 2 (LỚP 6 - 9)
  // =========================================================================
  // --- NGỮ VĂN (THCS) ---
  {
    id: 'thcs-tv-1',
    tier: 'thcs',
    grade: 6,
    subject: 'tieng-viet',
    topic: 'Biện pháp tu từ Ẩn dụ & Nhân hóa',
    type: 'multiple-choice',
    prompt: 'Trong hai câu thơ của Minh Huệ: "Ngày ngày mặt trời đi qua trên lăng / Thấy một mặt trời trong lăng rất đỏ", hình ảnh "mặt trời trong lăng" sử dụng biện pháp tu từ nào?',
    spokenPrompt: 'Trong hai câu thơ: Ngày ngày mặt trời đi qua trên lăng, Thấy một mặt trời trong lăng rất đỏ. Hình ảnh mặt trời trong lăng sử dụng biện pháp tu từ nào?',
    options: ['Ẩn dụ', 'So sánh', 'Hoán dụ', 'Nói quá'],
    correctIndex: 0,
    hint: 'Tác giả gọi Bác Hồ bằng "mặt trời" dựa trên nét tương đồng về sự tỏa sáng, mang lại độc lập ấm no, mà không dùng từ "như".',
    explanation: 'Chính xác! "Mặt trời trong lăng" là hình ảnh Ẩn dụ chỉ Bác Hồ kính yêu, ca ngợi sự vĩ đại và công lao soi đường dẫn lối của Người đối với dân tộc.',
    points: 20,
  },
  {
    id: 'thcs-tv-2',
    tier: 'thcs',
    grade: 8,
    subject: 'tieng-viet',
    topic: 'Văn học trung đại Việt Nam - Hịch tướng sĩ',
    type: 'multiple-choice',
    prompt: 'Tác phẩm "Hịch tướng sĩ" hùng hồn khích lệ lòng yêu nước chống quân Nguyên - Mông do danh tướng nào biên soạn?',
    spokenPrompt: 'Tác phẩm Hịch tướng sĩ khích lệ lòng yêu nước chống quân Nguyên Mông do vị danh tướng nào biên soạn?',
    options: [
      'Trần Quốc Tuấn (Hưng Đạo Đại Vương)',
      'Nguyễn Trãi',
      'Lý Thường Kiệt',
      'Phạm Ngũ Lão',
    ],
    correctIndex: 0,
    hint: 'Ông là Quốc công Tiết chế chỉ huy quân dân nhà Trần ba lần đại thắng quân Nguyên - Mông.',
    explanation: 'Đúng vậy! Trần Quốc Tuấn (Hưng Đạo Đại Vương) viết "Hịch tướng sĩ" trước cuộc kháng chiến chống Mông - Nguyên lần thứ hai (1285), thể hiện lòng căm thù giặc sâu sắc ("Ta thường tới bữa quên ăn, nửa đêm vỗ gối...").',
    points: 20,
  },

  // --- TIẾNG ANH (THCS) ---
  {
    id: 'thcs-en-1',
    tier: 'thcs',
    grade: 7,
    subject: 'tieng-anh',
    topic: 'Present Perfect vs Past Simple',
    type: 'multiple-choice',
    prompt: 'Choose the best answer: "Lan ______ English for five years, so she can speak very fluently now."',
    visualFormulaOrHint: 'for + khoảng thời gian (tính đến hiện tại) → have / has + V3/ed',
    spokenPrompt: 'Chọn đáp án đúng cho câu Tiếng Anh: Lan đã học Tiếng Anh được 5 năm tính đến hiện tại.',
    options: ['has learned', 'learned', 'is learning', 'learns'],
    correctIndex: 0,
    hint: 'Cụm "for five years" đi kèm kết quả ở hiện tại ("now") là dấu hiệu đặc trưng của thì Hiện tại hoàn thành!',
    explanation: 'Chính xác! Hành động bắt đầu trong quá khứ, kéo dài suốt 5 năm ("for five years") và vẫn còn tiếp diễn ở hiện tại dùng Present Perfect: "has learned".',
    points: 20,
  },
  {
    id: 'thcs-en-2',
    tier: 'thcs',
    grade: 9,
    subject: 'tieng-anh',
    topic: 'Conditional Sentences Type 2 (Câu điều kiện loại 2)',
    type: 'word-order',
    prompt: 'Sắp xếp thành câu điều kiện loại 2 hoàn chỉnh ("Nếu mình là bạn, mình sẽ ôn bài mỗi ngày"):',
    visualFormulaOrHint: 'If + S + were/V2, S + would + V-infinitive',
    spokenPrompt: 'Sắp xếp các từ Tiếng Anh sau thành câu điều kiện loại 2: Nếu mình là bạn, mình sẽ ôn bài mỗi ngày.',
    wordTokens: ['If', 'I', 'were', 'you,', 'I', 'would', 'study', 'every', 'day.'],
    acceptedAnswers: ['If I were you, I would study every day.'],
    hint: 'Mệnh đề If đặt trước: "If I were you," theo sau là mệnh đề chính "I would study every day."',
    explanation: 'Rất xuất sắc! Cấu trúc "If I were you, I would + V" dùng để đưa ra lời khuyên chân thành trong câu điều kiện không có thật ở hiện tại (loại 2).',
    points: 25,
  },

  // --- TOÁN HỌC (THCS) ---
  {
    id: 'thcs-math-1',
    tier: 'thcs',
    grade: 7,
    subject: 'toan',
    topic: 'Tỉ lệ thức & Đại lượng tỉ lệ thuận',
    type: 'fill-blank',
    prompt: 'Tìm x trong tỉ lệ thức sau:  x / 6 = 10 / 15',
    visualFormulaOrHint: 'Tính chất tỉ lệ thức: x × 15 = 6 × 10',
    spokenPrompt: 'Tìm giá trị của x trong tỉ lệ thức: x phần 6 bằng 10 phần 15.',
    acceptedAnswers: ['4', 'x=4', 'x = 4'],
    hint: 'Nhân chéo: x = (6 × 10) : 15.',
    explanation: 'Hoàn toàn chính xác! Áp dụng tính chất hai phân số bằng nhau: x = (6 × 10) / 15 = 60 / 15 = 4.',
    points: 20,
  },
  {
    id: 'thcs-math-2',
    tier: 'thcs',
    grade: 8,
    subject: 'toan',
    topic: 'Định lý Pythagore trong tam giác vuông',
    type: 'multiple-choice',
    prompt: 'Một tam giác vuông có hai cạnh góc vuông lần lượt dài 6 cm và 8 cm. Độ dài cạnh huyền của tam giác vuông đó là bao nhiêu?',
    visualFormulaOrHint: 'c² = a² + b² = 6² + 8²',
    spokenPrompt: 'Một tam giác vuông có hai cạnh góc vuông dài 6 xen ti mét và 8 xen ti mét. Hỏi cạnh huyền dài bao nhiêu xen ti mét?',
    options: ['10 cm', '14 cm', '12 cm', '100 cm'],
    correctIndex: 0,
    hint: 'Tính 6² + 8² = 36 + 64 = 100, sau đó lấy căn bậc hai của 100!',
    explanation: 'Chuẩn xác! Theo định lý Pythagore: c² = 6² + 8² = 36 + 64 = 100. Suy ra cạnh huyền c = √100 = 10 cm (Bộ ba Pythagore 6 - 8 - 10).',
    points: 20,
  },
  {
    id: 'thcs-math-3',
    tier: 'thcs',
    grade: 9,
    subject: 'toan',
    topic: 'Phương trình bậc hai & Hệ thức Viète',
    type: 'multiple-choice',
    prompt: 'Cho phương trình bậc hai: x² - 7x + 10 = 0. Tổng hai nghiệm (x₁ + x₂) và tích hai nghiệm (x₁·x₂) của phương trình lần lượt là:',
    visualFormulaOrHint: 'Hệ thức Viète: S = -b/a ; P = c/a',
    spokenPrompt: 'Cho phương trình x bình phương trừ 7x cộng 10 bằng 0. Tổng hai nghiệm và tích hai nghiệm lần lượt bằng bao nhiêu?',
    options: [
      'Tổng = 7, Tích = 10',
      'Tổng = -7, Tích = 10',
      'Tổng = 7, Tích = -10',
      'Tổng = 10, Tích = 7',
    ],
    correctIndex: 0,
    hint: 'Với a = 1, b = -7, c = 10 (Δ = 49 - 40 = 9 > 0), áp dụng S = -b/a và P = c/a.',
    explanation: 'Đúng rồi! Vì Δ = (-7)² - 4·1·10 = 9 > 0 nên phương trình có 2 nghiệm phân biệt (x = 2 và x = 5). Theo Viète: x₁ + x₂ = -(-7)/1 = 7 và x₁·x₂ = 10/1 = 10.',
    points: 25,
  },

  // --- KHOA HỌC & KHÁM PHÁ (THCS) ---
  {
    id: 'thcs-sci-1',
    tier: 'thcs',
    grade: 8,
    subject: 'khoa-hoc',
    topic: 'Hóa học - Định luật bảo toàn khối lượng',
    type: 'multiple-choice',
    prompt: 'Đốt cháy hoàn toàn 12 gam Cacbon (C) trong khí Oxi (O₂) vừa đủ thu được 44 gam khí Cacbon đioxit (CO₂). Khối lượng khí Oxi đã phản ứng là:',
    visualFormulaOrHint: 'm(C) + m(O₂) = m(CO₂)',
    spokenPrompt: 'Đốt cháy hoàn toàn 12 gam Cacbon trong khí Oxi thu được 44 gam khí CO2. Hỏi khối lượng khí Oxi đã tham gia phản ứng là bao nhiêu gam?',
    options: ['32 gam', '56 gam', '22 gam', '16 gam'],
    correctIndex: 0,
    hint: 'Theo Định luật bảo toàn khối lượng: m(O₂) = m(CO₂) - m(C).',
    explanation: 'Chính xác! Áp dụng Định luật bảo toàn khối lượng: m(C) + m(O₂) = m(CO₂) ⇒ m(O₂) = 44 - 12 = 32 (gam).',
    points: 20,
  },
  {
    id: 'thcs-kp-1',
    tier: 'thcs',
    grade: 7,
    subject: 'kham-pha',
    topic: 'Địa lý tự nhiên Việt Nam',
    type: 'multiple-choice',
    prompt: 'Đỉnh núi Phan-xi-păng (Fansipan) cao 3.147,3m được mệnh danh là "Nóc nhà Đông Dương" nằm trên dãy núi nào của nước ta?',
    spokenPrompt: 'Đỉnh núi Phan xi păng được mệnh danh là Nóc nhà Đông Dương nằm trên dãy núi nào của nước ta?',
    options: ['Dãy Hoàng Liên Sơn', 'Dãy Trường Sơn Bắc', 'Dãy Đông Triều', 'Dãy Bạch Mã'],
    correctIndex: 0,
    hint: 'Dãy núi hùng vĩ này nằm ở vùng Tây Bắc (giữa Lào Cai và Lai Châu).',
    explanation: 'Tuyệt vời! Đỉnh Fansipan nằm trên dãy Hoàng Liên Sơn hùng vĩ ở vùng núi Tây Bắc Việt Nam.',
    points: 20,
  },

  // =========================================================================
  // TRUNG HỌC PHỔ THÔNG - CẤP 3 (LỚP 10 - 12)
  // =========================================================================
  // --- NGỮ VĂN (THPT) ---
  {
    id: 'thpt-tv-1',
    tier: 'thpt',
    grade: 10,
    subject: 'tieng-viet',
    topic: 'Bình Ngô đại cáo - Nguyễn Trãi',
    type: 'multiple-choice',
    prompt: 'Tư tưởng nhân nghĩa cốt lõi của Nguyễn Trãi trong mở đầu "Bình Ngô đại cáo" ("Việc nhân nghĩa cốt ở yên dân / Quân điếu phạt trước lo trừ bạo") hướng tới điều gì?',
    spokenPrompt: 'Tư tưởng nhân nghĩa cốt lõi của Nguyễn Trãi trong mở đầu tác phẩm Bình Ngô đại cáo hướng tới điều gì?',
    options: [
      'Đem lại cuộc sống thái bình cho nhân dân và tiêu diệt thế lực xâm lược tàn bạo',
      'Xây dựng nghi lễ cung đình phong kiến khắt khe',
      'Mở rộng bờ cõi sang các nước láng giềng',
      'Đề cao phép thuật thần bí trong chiến trận',
    ],
    correctIndex: 0,
    hint: 'Chú ý hai cụm từ chìa khóa: "yên dân" (cho dân được yên ổn) và "trừ bạo" (dẹp giặc ngoại xâm bạo ngược).',
    explanation: 'Xuất sắc! Nguyễn Trãi đã nâng tư tưởng nhân nghĩa truyền thống lên tầm cao yêu nước thương dân: nhân nghĩa gắn liền với bảo vệ độc lập dân tộc ("trừ bạo") vì hạnh phúc của nhân dân ("yên dân").',
    points: 25,
  },
  {
    id: 'thpt-tv-2',
    tier: 'thpt',
    grade: 12,
    subject: 'tieng-viet',
    topic: 'Thơ ca kháng chiến - Tây Tiến (Quang Dũng)',
    type: 'multiple-choice',
    prompt: 'Hai câu thơ "Sông Mã xa rồi Tây Tiến ơi! / Nhớ về rừng núi nhớ chơi vơi" sử dụng từ láy "chơi vơi" kết hợp hiệp vần "ơi" nhằm diễn tả cảm xúc gì chủ đạo?',
    spokenPrompt: 'Trong bài thơ Tây Tiến của Quang Dũng, hai câu mở đầu sử dụng từ láy chơi vơi kết hợp vần ơi nhằm diễn tả cảm xúc gì chủ đạo?',
    options: [
      'Nỗi nhớ da diết, mênh mang, đầy ắp và ngân vang trong tâm tưởng người lính',
      'Sự hoảng sợ trước thiên nhiên hoang vu hiểm trở',
      'Niềm vui rộn rã của buổi liên hoan doanh trại',
      'Sự thờ ơ, lãng quên ký ức đã qua',
    ],
    correctIndex: 0,
    hint: '"Nhớ chơi vơi" là nỗi nhớ không định hình nhưng bao trùm cả không gian và thời gian.',
    explanation: 'Rất sâu sắc! Tiếng gọi "Tây Tiến ơi!" vang vọng cùng từ láy "chơi vơi" khắc họa nỗi nhớ bâng khuâng, da diết, vừa mênh mang lan tỏa vừa lắng sâu trong lòng người lính Tây Tiến.',
    points: 25,
  },

  // --- TIẾNG ANH (THPT) ---
  {
    id: 'thpt-en-1',
    tier: 'thpt',
    grade: 11,
    subject: 'tieng-anh',
    topic: 'Participle Clauses & Inversion (Đảo ngữ học thuật)',
    type: 'multiple-choice',
    prompt: 'Choose the grammatically correct sentence using inversion: "Hardly ______ the station when the train departed."',
    visualFormulaOrHint: 'Hardly + had + S + V3/ed + when + S + V2/ed',
    spokenPrompt: 'Chọn cấu trúc đảo ngữ đúng cho câu Tiếng Anh lớp 11 - 12 với Hardly, chấm chấm, when the train departed.',
    options: [
      'had we reached',
      'we had reached',
      'did we reached',
      'have we reached',
    ],
    correctIndex: 0,
    hint: 'Khi trạng từ phủ định "Hardly / Scarcely" đứng đầu câu, ta đảo trợ động từ "had" lên trước chủ ngữ!',
    explanation: 'Hoàn hảo! Cấu trúc đảo ngữ nhấn mạnh sự việc vừa mới xảy ra thì sự việc khác ập tới: "Hardly + had + S + V3/ed + when + S + V2/ed" (Chúng tôi vừa mới tới nhà ga thì tàu rời bánh).',
    points: 30,
  },
  {
    id: 'thpt-en-2',
    tier: 'thpt',
    grade: 12,
    subject: 'tieng-anh',
    topic: 'Academic Vocabulary & Collocations (Luyện thi THPT)',
    type: 'multiple-choice',
    prompt: 'Artificial intelligence is playing an increasingly ______ role in modern medical diagnosis and scientific research.',
    spokenPrompt: 'Chọn tính từ học thuật phù hợp nhất trong câu về trí tuệ nhân tạo trong y học hiện đại.',
    options: ['pivotal', 'reluctant', 'obsolete', 'trivial'],
    correctIndex: 0,
    hint: '"Play a ______ role" cần một tính từ mang nghĩa "then chốt, vô cùng quan trọng".',
    explanation: 'Chính xác! "Play a pivotal role" (đóng vai trò then chốt/trọng yếu) là collocation học thuật rất hay gặp trong bài thi THPT. (reluctant: miễn cưỡng, obsolete: lỗi thời, trivial: tầm thường).',
    points: 30,
  },

  // --- TOÁN HỌC (THPT) ---
  {
    id: 'thpt-math-1',
    tier: 'thpt',
    grade: 11,
    subject: 'toan',
    topic: 'Đạo hàm & Tiếp tuyến hàm số',
    type: 'multiple-choice',
    prompt: 'Cho hàm số f(x) = x³ - 3x² + 2. Giá trị đạo hàm f\'(2) bằng bao nhiêu?',
    visualFormulaOrHint: '(xⁿ)\' = n·xⁿ⁻¹  ⇒  f\'(x) = 3x² - 6x',
    spokenPrompt: 'Cho hàm số f x bằng x mũ 3 trừ 3 x bình phương cộng 2. Giá trị đạo hàm f phẩy tại 2 bằng bao nhiêu?',
    options: ['0', '4', '-2', '6'],
    correctIndex: 0,
    hint: 'Tính f\'(x) = 3x² - 6x, sau đó thay x = 2 vào biểu thức đạo hàm.',
    explanation: 'Chuẩn xác! Ta có f\'(x) = 3x² - 6x. Thay x = 2 vào ta được: f\'(2) = 3·(2²) - 6·2 = 12 - 12 = 0 (x = 2 là điểm cực tiểu của hàm số).',
    points: 25,
  },
  {
    id: 'thpt-math-2',
    tier: 'thpt',
    grade: 12,
    subject: 'toan',
    topic: 'Nguyên hàm & Tích phân xác định',
    type: 'fill-blank',
    prompt: 'Tính giá trị tích phân I = ∫₀² (2x + 1) dx',
    visualFormulaOrHint: '∫(2x + 1)dx = x² + x | cận từ 0 đến 2',
    spokenPrompt: 'Tính giá trị tích phân xác định từ 0 đến 2 của hàm số 2x cộng 1 d x.',
    acceptedAnswers: ['6', 'I=6', 'I = 6'],
    hint: 'Nguyên hàm F(x) = x² + x. Tính F(2) - F(0) = (2² + 2) - 0.',
    explanation: 'Tuyệt vời! Nguyên hàm của (2x + 1) là F(x) = x² + x. Thế cận từ 0 đến 2: I = F(2) - F(0) = (4 + 2) - (0 + 0) = 6.',
    points: 30,
  },

  // --- KHOA HỌC & KHÁM PHÁ (THPT) ---
  {
    id: 'thpt-sci-1',
    tier: 'thpt',
    grade: 12,
    subject: 'khoa-hoc',
    topic: 'Vật lý 12 - Dao động điều hòa Con lắc đơn / Lò xo',
    type: 'multiple-choice',
    prompt: 'Một vật dao động điều hòa theo phương trình x = 5·cos(4πt) (cm). Tần số f của dao động này bằng bao nhiêu?',
    visualFormulaOrHint: 'ω = 2πf  ⇒  f = ω / (2π)',
    spokenPrompt: 'Một vật dao động điều hòa theo phương trình x bằng 5 nhân cos của 4 pi t xen ti mét. Tần số f của dao động bằng bao nhiêu Héc?',
    options: ['2 Hz', '4 Hz', '0,5 Hz', '5 Hz'],
    correctIndex: 0,
    hint: 'Từ phương trình x = A·cos(ωt + φ), ta thấy tần số góc ω = 4π (rad/s). Áp dụng f = ω / (2π).',
    explanation: 'Chính xác! Tần số góc ω = 4π rad/s. Suy ra tần số dao động f = ω / (2π) = 4π / (2π) = 2 Hz (vật thực hiện 2 dao động toàn phần mỗi giây).',
    points: 25,
  },
  {
    id: 'thpt-kp-1',
    tier: 'thpt',
    grade: 12,
    subject: 'kham-pha',
    topic: 'Sinh học Di truyền phân tử (ADN & Phiên mã)',
    type: 'multiple-choice',
    prompt: 'Trong phân tử ADN mạch kép, theo nguyên tắc bổ sung của Watson - Crick, bazơ nitơ Ađênin (A) trên mạch gốc luôn liên kết với bazơ nào trên mạch bổ sung bằng 2 liên kết hiđrô?',
    visualFormulaOrHint: 'Nguyên tắc bổ sung ADN: A - T (2 liên kết H) ; G - X (3 liên kết H)',
    spokenPrompt: 'Trong phân tử A D N mạch kép, theo nguyên tắc bổ sung, A đê nin luôn liên kết với ba dơ ni tơ nào bằng 2 liên kết hi đrô?',
    options: ['Timin (T)', 'Guanin (G)', 'Xitôzin (X)', 'Uraxin (U)'],
    correctIndex: 0,
    hint: 'Trong ADN mạch kép là A đi với T (còn Uraxin chỉ xuất hiện ở ARN trong quá trình phiên mã).',
    explanation: 'Hoàn toàn chính xác! Trong phân tử ADN hai mạch xoắn kép, A luôn liên kết bổ sung với T bằng 2 liên kết hiđrô, và G liên kết với X bằng 3 liên kết hiđrô.',
    points: 25,
  },
];

export const CURRICULUM_FLASHCARDS: LearningFlashcard[] = [
  // TIỂU HỌC
  {
    id: 'fc-th-1',
    tier: 'tieu-hoc',
    grade: 2,
    subject: 'tieng-viet',
    frontTitle: 'Quy tắc chính tả G / GH và NG / NGH',
    frontSubtitle: 'Mẹo nhớ siêu tốc không bao giờ viết sai!',
    frontBadge: 'Tiếng Việt Lớp 1–3',
    backContent: 'Chữ GH và NGH chỉ đứng trước 3 chữ cái: I, E, Ê. Trước tất cả các chữ cái khác (a, o, ô, ơ, u, ư...), ta luôn viết G và NG.',
    example: 'Ví dụ: Ghi nhớ, Ghế gỗ, Nghe nhạc, Nghỉ hè — Gà trống, Ngôi sao.',
    spokenText: 'Quy tắc chính tả gờ đơn, gờ ghép và ngờ đơn, ngờ ghép: Chữ gờ ghép và ngờ ghép luôn đứng trước ba nguyên âm i, e, ê. Ví dụ: ghi nhớ, ghế gỗ, nghe nhạc, nghỉ hè.',
  },
  {
    id: 'fc-th-2',
    tier: 'tieu-hoc',
    grade: 3,
    subject: 'tieng-anh',
    frontTitle: 'Family & Gratitude (Gia đình yêu thương)',
    frontSubtitle: 'Parents /ˈpeə.rənts/ • Grandparents /ˈɡræn.peə.rənts/',
    frontBadge: 'Tiếng Anh Lớp 3–5',
    backContent: '• Father (Dad): Cha, bố\n• Mother (Mom): Mẹ\n• Parents: Cha mẹ\n• I love my family very much: Em rất yêu gia đình của mình.',
    example: 'My parents always read stories to me before bedtime.',
    spokenText: 'Chủ đề Gia đình trong Tiếng Anh: Father là cha, Mother là mẹ, Parents là cha mẹ. Câu ví dụ: I love my family very much, nghĩa là Em rất yêu gia đình của mình.',
  },
  {
    id: 'fc-th-3',
    tier: 'tieu-hoc',
    grade: 4,
    subject: 'toan',
    frontTitle: 'Chu vi & Diện tích Hình chữ nhật, Hình vuông',
    frontSubtitle: 'Công thức vàng Toán Tiểu học',
    frontBadge: 'Toán Lớp 3–5',
    backContent: '• Hình chữ nhật (dài a, rộng b): Chu vi P = (a + b) × 2 | Diện tích S = a × b\n• Hình vuông (cạnh a): Chu vi P = a × 4 | Diện tích S = a × a',
    example: 'Hình vuông cạnh 5 cm có Chu vi = 20 cm và Diện tích = 25 cm².',
    spokenText: 'Công thức Toán Tiểu học: Với hình chữ nhật có chiều dài a và chiều rộng b, chu vi bằng mở ngoặc a cộng b đóng ngoặc nhân 2, diện tích bằng a nhân b. Với hình vuông cạnh a, chu vi bằng a nhân 4, diện tích bằng a nhân a.',
  },
  {
    id: 'fc-th-4',
    tier: 'tieu-hoc',
    grade: 5,
    subject: 'khoa-hoc',
    frontTitle: 'Vòng tuần hoàn của Nước trong tự nhiên',
    frontSubtitle: 'Bay hơi → Ngưng tụ → Mưa → Dòng chảy',
    frontBadge: 'Khoa học Lớp 4–5',
    backContent: 'Nước ở sông, biển bay hơi thành hơi nước, bay lên cao gặp lạnh ngưng tụ thành mây. Các giọt nước lớn dần rơi xuống thành mưa, chảy lại về sông biển.',
    example: 'Nhờ vòng tuần hoàn này, nguồn nước ngọt trên Trái Đất luôn được tái tạo.',
    spokenText: 'Vòng tuần hoàn của nước trong tự nhiên: Nước ở ao hồ sông biển bay hơi lên cao, gặp không khí lạnh ngưng tụ thành những đám mây, rồi rơi xuống thành mưa nuôi dưỡng cây cối và muôn loài.',
  },

  // THCS
  {
    id: 'fc-thcs-1',
    tier: 'thcs',
    grade: 7,
    subject: 'tieng-viet',
    frontTitle: '4 Biện pháp tu từ trọng tâm THCS',
    frontSubtitle: 'So sánh • Nhân hóa • Ẩn dụ • Hoán dụ',
    frontBadge: 'Ngữ Văn Lớp 6–9',
    backContent: '• Ẩn dụ: Gọi tên sự vật A bằng B dựa trên nét TƯƠNG ĐỒNG (giống nhau ngầm).\n• Hoán dụ: Gọi tên sự vật A bằng B dựa trên quan hệ GẦN GŨI đi đôi với nhau.',
    example: 'Ẩn dụ: "Người Cha mái tóc bạc" (Bác Hồ). Hoán dụ: "Áo chàm đưa buổi phân li" (Người dân Việt Bắc).',
    spokenText: 'Cách phân biệt nhanh Ẩn dụ và Hoán dụ trong Ngữ văn cấp 2: Ẩn dụ dựa trên nét tương đồng giống nhau giữa hai sự vật, còn Hoán dụ dựa trên mối quan hệ gần gũi luôn đi liền với nhau.',
  },
  {
    id: 'fc-thcs-2',
    tier: 'thcs',
    grade: 8,
    subject: 'toan',
    frontTitle: '7 Hằng đẳng thức đáng nhớ (Trọng tâm)',
    frontSubtitle: '(A + B)² • (A - B)² • A² - B²',
    frontBadge: 'Toán Đại Số Lớp 8–9',
    backContent: '1) Bình phương một tổng: (A + B)² = A² + 2AB + B²\n2) Bình phương một hiệu: (A - B)² = A² - 2AB + B²\n3) Hiệu hai bình phương: A² - B² = (A - B)(A + B)',
    example: 'Tính nhẩm nhanh: 101 × 99 = (100 + 1)(100 - 1) = 100² - 1² = 9.999!',
    spokenText: 'Ba hằng đẳng thức nền tảng giúp tính nhanh Đại số lớp 8 và lớp 9: A cộng B tất cả bình phương bằng A bình cộng 2 A B cộng B bình. Hiệu hai bình phương A bình trừ B bình bằng A trừ B nhân A cộng B.',
  },
  {
    id: 'fc-thcs-3',
    tier: 'thcs',
    grade: 9,
    subject: 'tieng-anh',
    frontTitle: 'Passive Voice (Câu bị động Tiếng Anh)',
    frontSubtitle: 'S + be (chia theo thì) + V3/ed (+ by O)',
    frontBadge: 'Tiếng Anh Lớp 8–9',
    backContent: 'Quy tắc chuyển từ chủ động sang bị động:\n1) Đưa tân ngữ lên làm chủ ngữ mới.\n2) Động từ "to be" chia đúng thì của câu gốc.\n3) Động từ chính luôn đưa về Quá khứ phân từ (V3/ed).',
    example: 'Active: People speak English worldwide → Passive: English is spoken worldwide.',
    spokenText: 'Quy tắc vàng của câu bị động Passive Voice trong Tiếng Anh: Đưa tân ngữ lên đầu câu, chia động từ to be theo đúng thì của câu gốc, rồi cộng với động từ cột 3 hoặc thêm đuôi e d.',
  },

  // THPT
  {
    id: 'fc-thpt-1',
    tier: 'thpt',
    grade: 12,
    subject: 'toan',
    frontTitle: 'Bảng Đạo hàm & Nguyên hàm cơ bản',
    frontSubtitle: 'Giải tích Lớp 11 – 12',
    frontBadge: 'Toán THPT',
    backContent: '• (xⁿ)\' = n·xⁿ⁻¹  |  ∫xⁿ dx = xⁿ⁺¹/(n + 1) + C (n ≠ -1)\n• (eˣ)\' = eˣ  |  (ln x)\' = 1/x (x > 0)\n• (sin x)\' = cos x  |  (cos x)\' = -sin x',
    example: 'Đạo hàm giúp tìm cực trị & GTLN/GTNN; Tích phân tính diện tích hình phẳng và thể tích khối tròn xoay.',
    spokenText: 'Kiến thức cốt lõi Giải tích trung học phổ thông: Đạo hàm của x mũ n bằng n nhân x mũ n trừ 1. Đạo hàm của e mũ x là chính nó. Đạo hàm của sin x là cos x, còn đạo hàm của cos x là trừ sin x.',
  },
  {
    id: 'fc-thpt-2',
    tier: 'thpt',
    grade: 10,
    subject: 'khoa-hoc',
    frontTitle: 'Ba Định luật Newton về Chuyển động',
    frontSubtitle: 'Nền tảng Cơ học Vật lý THPT (F = m·a)',
    frontBadge: 'Vật Lý Lớp 10–12',
    backContent: '• ĐL I (Quán tính): Không có hợp lực tác dụng, vật đứng yên sẽ đứng yên mãi, vật chuyển động sẽ thẳng đều.\n• ĐL II: Gia tốc tỉ lệ thuận với hợp lực và tỉ lệ nghịch với khối lượng: a = F / m.\n• ĐL III: Phản lực luôn cùng phương, ngược chiều, cùng độ lớn: F_AB = -F_BA.',
    example: 'Khi tên lửa phụt khí về phía sau, phản lực đẩy tên lửa bay vọt lên không gian.',
    spokenText: 'Ba định luật Niu tơn nền tảng của Vật lý cấp 3: Định luật 1 về quán tính, Định luật 2 gia tốc bằng lực chia khối lượng F bằng m nhân a, và Định luật 3 về lực và phản lực.',
  },
  {
    id: 'fc-thpt-3',
    tier: 'thpt',
    grade: 12,
    subject: 'tieng-anh',
    frontTitle: '3 Loại Câu Điều Kiện & Đảo Ngữ (Conditionals)',
    frontSubtitle: 'Cấu trúc ăn điểm tuyệt đối kỳ thi THPT',
    frontBadge: 'Tiếng Anh Lớp 10–12',
    backContent: '• Loại 1 (Có thể xảy ra): Should + S + V, S + will + V\n• Loại 2 (Trái hiện tại): Were + S + (to V), S + would + V\n• Loại 3 (Trái quá khứ): Had + S + V3/ed, S + would have + V3/ed',
    example: 'Had I known about the exam earlier, I would have prepared more carefully.',
    spokenText: 'Ba công thức đảo ngữ câu điều kiện trong Tiếng Anh cấp 3: Loại 1 đưa Should lên đầu câu, Loại 2 đưa Were lên đầu câu, và Loại 3 đưa trợ động từ Had lên trước chủ ngữ.',
  },
];
