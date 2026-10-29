export type SchoolTier = 'tieu-hoc' | 'thcs' | 'thpt';

export type SubjectId = 'tieng-viet' | 'tieng-anh' | 'toan' | 'khoa-hoc' | 'kham-pha';

export interface SchoolTierMeta {
  id: SchoolTier;
  label: string;
  gradesLabel: string;
  grades: number[];
  description: string;
  badgeClass: string;
}

export interface SubjectMeta {
  id: SubjectId;
  name: string;
  shortName: string;
  bgSoftClass: string;
  borderClass: string;
  textClass: string;
}

export interface LearningQuestion {
  id: string;
  tier: SchoolTier;
  grade: number;
  subject: SubjectId;
  topic: string;
  type: 'multiple-choice' | 'word-order' | 'fill-blank';
  prompt: string;
  visualFormulaOrHint?: string;
  spokenPrompt?: string;
  options?: string[];
  correctIndex?: number;
  wordTokens?: string[];
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
  frontBadge: string;
  frontTitle: string;
  frontSubtitle?: string;
  backContent: string;
  example: string;
  spokenText: string;
}

export const SCHOOL_TIERS: SchoolTierMeta[] = [
  {
    id: 'tieu-hoc',
    label: 'Cấp 1 — Tiểu Học',
    gradesLabel: 'Lớp 1 – Lớp 5',
    grades: [1, 2, 3, 4, 5],
    description:
      'Bảng chữ cái, ghép vần Tiếng Việt, từ vựng Tiếng Anh chuẩn bản xứ, Toán đố & khám phá tự nhiên.',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'thcs',
    label: 'Cấp 2 — Trung Học Cơ Sở',
    gradesLabel: 'Lớp 6 – Lớp 9',
    grades: [6, 7, 8, 9],
    description:
      'Ngữ văn, Ngữ pháp & giao tiếp Tiếng Anh, Đại số - Hình học, Khoa học tự nhiên (Lý - Hóa - Sinh).',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  {
    id: 'thpt',
    label: 'Cấp 3 — Trung Học Phổ Thông',
    gradesLabel: 'Lớp 10 – Lớp 12',
    grades: [10, 11, 12],
    description:
      'Giải tích & Đạo hàm, Tiếng Anh học thuật IELTS/THPT, Vật lý - Hóa học nâng cao & Tư duy phản biện.',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
];

export const SUBJECTS_META: SubjectMeta[] = [
  {
    id: 'tieng-viet',
    name: 'Tiếng Việt & Ngữ Văn',
    shortName: 'Tiếng Việt',
    bgSoftClass: 'bg-rose-500/15',
    borderClass: 'border-rose-500/40',
    textClass: 'text-rose-300',
  },
  {
    id: 'tieng-anh',
    name: 'Tiếng Anh Chuẩn Bản Xứ',
    shortName: 'Tiếng Anh',
    bgSoftClass: 'bg-sky-500/15',
    borderClass: 'border-sky-500/40',
    textClass: 'text-sky-300',
  },
  {
    id: 'toan',
    name: 'Toán Học Tư Duy',
    shortName: 'Toán Học',
    bgSoftClass: 'bg-emerald-500/15',
    borderClass: 'border-emerald-500/40',
    textClass: 'text-emerald-300',
  },
  {
    id: 'khoa-hoc',
    name: 'Khoa Học (Lý • Hóa • Sinh)',
    shortName: 'Khoa Học',
    bgSoftClass: 'bg-purple-500/15',
    borderClass: 'border-purple-500/40',
    textClass: 'text-purple-300',
  },
  {
    id: 'kham-pha',
    name: 'Lịch Sử • Địa Lý & Đạo Đức',
    shortName: 'Khám Phá',
    bgSoftClass: 'bg-amber-500/15',
    borderClass: 'border-amber-500/40',
    textClass: 'text-amber-300',
  },
];

export const CURRICULUM_QUESTIONS: LearningQuestion[] = [
  // ================= TIỂU HỌC (LỚP 1 - 5) =================
  {
    id: 'th-tv-1',
    tier: 'tieu-hoc',
    grade: 1,
    subject: 'tieng-viet',
    topic: 'Chính tả & Ghép vần Tiếng Việt',
    type: 'multiple-choice',
    prompt: 'Từ nào dưới đây viết ĐÚNG chính tả Tiếng Việt?',
    spokenPrompt: 'Đố bé, từ nào dưới đây viết đúng chính tả Tiếng Việt?',
    options: ['Bông sen trắng', 'Bông xen trắng', 'Bôn sen chắn', 'Bông sên trắng'],
    correctIndex: 0,
    hint: 'Quốc hoa của Việt Nam mọc trong hồ bùn gọi là hoa sen (âm đầu s).',
    explanation: '"Bông sen trắng" viết đúng chính tả với phụ âm đầu "s" và vần "en".',
    points: 15,
  },
  {
    id: 'th-tv-2',
    tier: 'tieu-hoc',
    grade: 3,
    subject: 'tieng-viet',
    topic: 'Sắp xếp câu tục ngữ Việt Nam',
    type: 'word-order',
    prompt: 'Hãy ghép các từ sau thành câu tục ngữ quen thuộc nói về lòng biết ơn:',
    spokenPrompt: 'Em hãy sắp xếp các từ sau thành câu tục ngữ nói về lòng biết ơn nhé.',
    wordTokens: ['Uống', 'nước', 'nhớ', 'nguồn'],
    acceptedAnswers: ['Uống nước nhớ nguồn'],
    hint: 'Khi uống dòng nước mát, ta nhớ tới cội nguồn sinh ra dòng nước.',
    explanation: '"Uống nước nhớ nguồn" khuyên chúng ta luôn biết ơn người đã làm ra thành quả.',
    points: 15,
  },
  {
    id: 'th-en-1',
    tier: 'tieu-hoc',
    grade: 2,
    subject: 'tieng-anh',
    topic: 'Animals & Phonics',
    type: 'multiple-choice',
    prompt: 'Trong Tiếng Anh, "Con bướm" đầy màu sắc được gọi là gì?',
    visualFormulaOrHint: 'Butterfly /ˈbʌt.ə.flaɪ/',
    spokenPrompt: 'Trong Tiếng Anh, con bướm đầy màu sắc được gọi là gì?',
    options: ['Butterfly', 'Dragonfly', 'Elephant', 'Rabbit'],
    correctIndex: 0,
    hint: 'Từ này bắt đầu bằng chữ B và kết thúc bằng fly.',
    explanation: '"Butterfly" (/ˈbʌt.ə.flaɪ/) nghĩa là con bướm.',
    points: 15,
  },
  {
    id: 'th-en-2',
    tier: 'tieu-hoc',
    grade: 4,
    subject: 'tieng-anh',
    topic: 'Daily Greetings & Grammar',
    type: 'word-order',
    prompt: 'Sắp xếp các từ Tiếng Anh sau thành câu giới thiệu bản thân đúng ngữ pháp:',
    visualFormulaOrHint: 'My name is Nam.',
    spokenPrompt: 'Em hãy ghép các từ sau thành câu giới thiệu tên bằng Tiếng Anh.',
    wordTokens: ['My', 'name', 'is', 'Nam.'],
    acceptedAnswers: ['My name is Nam.'],
    hint: 'Bắt đầu bằng tính từ sở hữu "My", tiếp theo là danh từ "name".',
    explanation: '"My name is Nam." là câu chuẩn để giới thiệu tên mình bằng Tiếng Anh.',
    points: 15,
  },
  {
    id: 'th-math-1',
    tier: 'tieu-hoc',
    grade: 3,
    subject: 'toan',
    topic: 'Chu vi hình chữ nhật',
    type: 'multiple-choice',
    prompt: 'Một mảnh vườn hình chữ nhật có chiều dài 12 m và chiều rộng 8 m. Chu vi mảnh vườn là:',
    visualFormulaOrHint: 'P = (dài + rộng) × 2',
    spokenPrompt:
      'Một mảnh vườn hình chữ nhật có chiều dài 12 mét và chiều rộng 8 mét. Chu vi mảnh vườn bằng bao nhiêu mét?',
    options: ['40 m', '96 m', '20 m', '32 m'],
    correctIndex: 0,
    hint: 'Lấy chiều dài cộng chiều rộng (12 + 8), được bao nhiêu nhân với 2.',
    explanation: 'Chu vi hình chữ nhật là: (12 + 8) × 2 = 40 (m).',
    points: 15,
  },
  {
    id: 'th-sci-1',
    tier: 'tieu-hoc',
    grade: 5,
    subject: 'khoa-hoc',
    topic: 'Sự chuyển thể của nước',
    type: 'multiple-choice',
    prompt: 'Hiện tượng nước từ thể lỏng biến thành hơi nước bay lên không trung gọi là gì?',
    spokenPrompt: 'Hiện tượng nước từ thể lỏng biến thành hơi nước bay lên gọi là gì?',
    options: ['Sự bay hơi', 'Sự ngưng tụ', 'Sự đông đặc', 'Sự nóng chảy'],
    correctIndex: 0,
    hint: 'Khi phơi quần áo dưới nắng, nước thấm trong vải khô đi nhờ hiện tượng này.',
    explanation: 'Khi gặp nhiệt độ thích hợp, nước ở thể lỏng chuyển thành hơi nước gọi là sự bay hơi.',
    points: 15,
  },
  {
    id: 'th-kp-1',
    tier: 'tieu-hoc',
    grade: 4,
    subject: 'kham-pha',
    topic: 'Địa lý & Lịch sử Việt Nam',
    type: 'multiple-choice',
    prompt: 'Thủ đô nghìn năm văn hiến của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam là thành phố nào?',
    spokenPrompt: 'Thủ đô nghìn năm văn hiến của nước Việt Nam chúng ta là thành phố nào?',
    options: ['Hà Nội', 'Huế', 'Đà Nẵng', 'TP. Hồ Chí Minh'],
    correctIndex: 0,
    hint: 'Nơi có Hồ Hoàn Kiếm, Lăng Bác và Văn Miếu – Quốc Tử Giám.',
    explanation: 'Hà Nội là Thủ đô ngàn năm văn hiến, trung tâm chính trị - văn hóa của Việt Nam.',
    points: 15,
  },

  // ================= THCS (LỚP 6 - 9) =================
  {
    id: 'thcs-math-1',
    tier: 'thcs',
    grade: 8,
    subject: 'toan',
    topic: 'Định lý Pythagore',
    type: 'fill-blank',
    prompt:
      'Cho tam giác vuông có hai cạnh góc vuông lần lượt là 6 cm và 8 cm. Độ dài cạnh huyền bằng bao nhiêu cm?',
    visualFormulaOrHint: 'c² = a² + b² = 6² + 8²',
    spokenPrompt:
      'Cho tam giác vuông có hai cạnh góc vuông bằng 6 xen ti mét và 8 xen ti mét. Độ dài cạnh huyền bằng bao nhiêu?',
    acceptedAnswers: ['10', '10cm', '10 cm'],
    hint: 'Tính 6² + 8² = 36 + 64 = 100, sau đó lấy căn bậc hai của 100.',
    explanation: 'Theo định lý Pythagore: c = √(6² + 8²) = √(36 + 64) = √100 = 10 (cm).',
    points: 20,
  },
  {
    id: 'thcs-en-1',
    tier: 'thcs',
    grade: 7,
    subject: 'tieng-anh',
    topic: 'Present Perfect Tense',
    type: 'multiple-choice',
    prompt: 'Chọn đáp án đúng hoàn thành câu: "She ______ English for five years."',
    visualFormulaOrHint: 'She has learned English for five years.',
    spokenPrompt: 'Chọn dạng động từ đúng cho câu thì hiện tại hoàn thành với trạng từ for five years.',
    options: ['has learned', 'learned', 'is learning', 'learn'],
    correctIndex: 0,
    hint: 'Cấu trúc thì Hiện tại hoàn thành đi với "for + khoảng thời gian": S + have/has + V3/ed.',
    explanation: 'Chủ ngữ ngôi thứ ba số ít "She" đi với "has learned" diễn tả hành động kéo dài 5 năm đến hiện tại.',
    points: 20,
  },
  {
    id: 'thcs-tv-1',
    tier: 'thcs',
    grade: 6,
    subject: 'tieng-viet',
    topic: 'Biện pháp tu từ Ngữ Văn',
    type: 'multiple-choice',
    prompt:
      'Câu thơ "Mặt trời xuống biển như hòn lửa" (Đoàn Thị Điểm / Huy Cận - Đoàn thuyền đánh cá) sử dụng biện pháp tu từ nổi bật nào?',
    spokenPrompt: 'Câu thơ Mặt trời xuống biển như hòn lửa sử dụng biện pháp tu từ nào?',
    options: ['So sánh', 'Nói quá', 'Điệp ngữ', 'Chơi chữ'],
    correctIndex: 0,
    hint: 'Chú ý từ "như" đối chiếu hình ảnh mặt trời hoàng hôn với hòn lửa đỏ rực.',
    explanation: 'Tác giả Huy Cận dùng phép so sánh "Mặt trời ... như hòn lửa" tạo hình ảnh kỳ vĩ, tráng lệ.',
    points: 20,
  },
  {
    id: 'thcs-sci-1',
    tier: 'thcs',
    grade: 8,
    subject: 'khoa-hoc',
    topic: 'Hóa học — Công thức phân tử',
    type: 'multiple-choice',
    prompt: 'Khí Oxy cần thiết cho sự hô hấp của con người và sinh vật có công thức hóa học là:',
    visualFormulaOrHint: 'O₂ (Phân tử gồm 2 nguyên tử Oxygen)',
    spokenPrompt: 'Khí Ô xi cần thiết cho sự hô hấp có công thức hóa học là gì?',
    options: ['O₂', 'CO₂', 'H₂O', 'N₂'],
    correctIndex: 0,
    hint: 'Phân tử đơn chất tạo từ 2 nguyên tử Oxygen.',
    explanation: 'Khí Oxygen ở điều kiện thường tồn tại dạng phân tử hai nguyên tử: O₂.',
    points: 20,
  },

  // ================= THPT (LỚP 10 - 12) =================
  {
    id: 'thpt-math-1',
    tier: 'thpt',
    grade: 12,
    subject: 'toan',
    topic: 'Khảo sát hàm số & Đạo hàm',
    type: 'multiple-choice',
    prompt: 'Đạo hàm của hàm số y = x³ - 3x² + 2 trên tập số thực ℝ là:',
    visualFormulaOrHint: "(xⁿ)' = n·xⁿ⁻¹",
    spokenPrompt: 'Đạo hàm của hàm số y bằng x mũ 3 trừ 3 x bình phương cộng 2 là biểu thức nào?',
    options: ['3x² - 6x', '3x² - 3x', 'x² - 6x', '3x² - 6x + 2'],
    correctIndex: 0,
    hint: 'Áp dụng (x³)\' = 3x², (-3x²)\' = -6x và đạo hàm của hằng số 2 bằng 0.',
    explanation: "Ta có y' = 3x² - 2·3x + 0 = 3x² - 6x.",
    points: 25,
  },
  {
    id: 'thpt-en-1',
    tier: 'thpt',
    grade: 11,
    subject: 'tieng-anh',
    topic: 'Conditional Sentences (Type 3)',
    type: 'multiple-choice',
    prompt:
      'Choose the correct answer: "If they had prepared carefully, they ______ the championship."',
    visualFormulaOrHint: 'If + S + had + V3/ed, S + would have + V3/ed',
    spokenPrompt: 'Chọn vế chính đúng cho câu điều kiện loại 3 trái với quá khứ.',
    options: ['would have won', 'will win', 'would win', 'won'],
    correctIndex: 0,
    hint: 'Mệnh đề If chia Quá khứ hoàn thành (had prepared) ⇒ Câu điều kiện loại 3.',
    explanation:
      'Câu điều kiện loại 3 diễn tả giả thiết trái ngược quá khứ: If + Past Perfect, S + would have + V3/ed.',
    points: 25,
  },
  {
    id: 'thpt-sci-1',
    tier: 'thpt',
    grade: 10,
    subject: 'khoa-hoc',
    topic: 'Định luật II Newton — Vật Lý',
    type: 'multiple-choice',
    prompt:
      'Một vật có khối lượng m = 4 kg chịu tác dụng của hợp lực F = 12 N. Gia tốc a của vật có độ lớn là:',
    visualFormulaOrHint: 'a = F / m',
    spokenPrompt:
      'Một vật khối lượng 4 ki lô gam chịu hợp lực 12 Niu tơn. Gia tốc của vật bằng bao nhiêu?',
    options: ['3 m/s²', '48 m/s²', '8 m/s²', '0.33 m/s²'],
    correctIndex: 0,
    hint: 'Theo định luật II Newton: a = F / m = 12 / 4.',
    explanation: 'Gia tốc của vật là a = F / m = 12 / 4 = 3 (m/s²).',
    points: 25,
  },
];

export const CURRICULUM_FLASHCARDS: LearningFlashcard[] = [
  {
    id: 'fc-th-en-1',
    tier: 'tieu-hoc',
    grade: 2,
    subject: 'tieng-anh',
    frontBadge: 'Tiếng Anh Tiểu Học • Phát Âm Chuẩn',
    frontTitle: 'Knowledge is power',
    frontSubtitle: '/ˈnɒl.ɪdʒ ɪz ˈpaʊər/',
    backContent:
      'Nghĩa Tiếng Việt: "Tri thức là sức mạnh".\nChữ "k" đứng đầu trong từ "knowledge" là âm câm (silent k), đọc bắt đầu từ âm /n/.',
    example: 'Reading books every day helps us gain new knowledge.',
    spokenText:
      'Cụm từ Tiếng Anh Knowledge is power có nghĩa là Tri thức là sức mạnh. Các em lưu ý chữ K ở đầu từ knowledge là âm câm nhé.',
  },
  {
    id: 'fc-th-math-1',
    tier: 'tieu-hoc',
    grade: 3,
    subject: 'toan',
    frontBadge: 'Toán Lớp 3 • Hình Học Nhớ Nhanh',
    frontTitle: 'Chu vi & Diện tích Hình Chữ Nhật',
    frontSubtitle: 'P = (a + b) × 2  |  S = a × b',
    backContent:
      '• Muốn tính CHU VI hình chữ nhật: Ta lấy chiều dài cộng chiều rộng (cùng đơn vị đo) rồi nhân với 2.\n• Muốn tính DIỆN TÍCH hình chữ nhật: Ta lấy chiều dài nhân với chiều rộng.',
    example: 'Hình chữ nhật dài 7 cm, rộng 3 cm ⇒ Chu vi = (7 + 3) × 2 = 20 cm; Diện tích = 21 cm².',
    spokenText:
      'Muốn tính chu vi hình chữ nhật, ta lấy chiều dài cộng chiều rộng cùng đơn vị đo rồi nhân với 2. Muốn tính diện tích, ta lấy chiều dài nhân với chiều rộng.',
  },
  {
    id: 'fc-thcs-en-1',
    tier: 'thcs',
    grade: 8,
    subject: 'tieng-anh',
    frontBadge: 'Tiếng Anh THCS • Giao Tiếp & Ngữ Pháp',
    frontTitle: 'Perseverance leads to success',
    frontSubtitle: '/ˌpɜː.sɪˈvɪə.rəns liːdz tuː səkˈses/',
    backContent:
      'Nghĩa: "Sự kiên trì dẫn đến thành công".\n• Perseverance (danh từ): lòng kiên nhẫn, bền bỉ.\n• Lead to + Noun/V-ing: dẫn tới kết quả gì.',
    example: 'With hard work and perseverance, she passed the exam with flying colors.',
    spokenText:
      'Câu Perseverance leads to success có nghĩa là Sự kiên trì dẫn đến thành công. Danh từ perseverance mang nghĩa là lòng bền bỉ vượt khó.',
  },
  {
    id: 'fc-thcs-math-1',
    tier: 'thcs',
    grade: 8,
    subject: 'toan',
    frontBadge: 'Toán THCS • Hằng Đẳng Thức Đáng Nhớ',
    frontTitle: 'Bình phương của một tổng & hiệu',
    frontSubtitle: '(A ± B)² = A² ± 2AB + B²',
    backContent:
      '1. Bình phương của một tổng: (A + B)² = A² + 2AB + B²\n2. Bình phương của một hiệu: (A - B)² = A² - 2AB + B²\n3. Hiệu hai bình phương: A² - B² = (A - B)(A + B)',
    example: 'Tính nhẩm 101² = (100 + 1)² = 10000 + 200 + 1 = 10201.',
    spokenText:
      'Hằng đẳng thức bình phương của một tổng A cộng B tất cả bình phương bằng A bình phương cộng 2 A B cộng B bình phương.',
  },
  {
    id: 'fc-thpt-math-1',
    tier: 'thpt',
    grade: 12,
    subject: 'toan',
    frontBadge: 'Toán THPT • Giải Tích 12',
    frontTitle: 'Công thức Nguyên hàm cơ bản',
    frontSubtitle: '∫ xⁿ dx = xⁿ⁺¹ / (n + 1) + C  (n ≠ -1)',
    backContent:
      '• ∫ k dx = kx + C\n• ∫ (1/x) dx = ln|x| + C\n• ∫ eˣ dx = eˣ + C\n• ∫ sin(x) dx = -cos(x) + C\n• ∫ cos(x) dx = sin(x) + C',
    example: '∫ 3x² dx = x³ + C.',
    spokenText:
      'Nguyên hàm của x mũ n theo biến x, với n khác âm 1, bằng x mũ n cộng 1 chia cho n cộng 1, cộng hằng số C.',
  },
  {
    id: 'fc-thpt-en-1',
    tier: 'thpt',
    grade: 12,
    subject: 'tieng-anh',
    frontBadge: 'Tiếng Anh THPT & IELTS Vocabulary',
    frontTitle: 'Critical Thinking & Innovation',
    frontSubtitle: '/ˈkrɪt.ɪ.kəl ˈθɪŋ.kɪŋ ænd ˌɪn.əˈveɪ.ʃən/',
    backContent:
      'Nghĩa: "Tư duy phản biện và Đổi mới sáng tạo".\nCụm từ học thuật ăn điểm cao trong bài viết luận (Essay) THPT Quốc gia & IELTS Writing Task 2.',
    example: 'Modern education encourages students to develop critical thinking and creativity.',
    spokenText:
      'Critical thinking and innovation nghĩa là tư duy phản biện và sự đổi mới sáng tạo, rất hữu ích trong các bài luận Tiếng Anh cấp ba.',
  },
];
