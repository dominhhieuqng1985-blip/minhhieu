export type SchoolTier = 'tieu-hoc' | 'thcs' | 'thpt';

export type SubjectId =
  | 'tieng-viet'
  | 'tieng-anh'
  | 'toan'
  | 'khoa-hoc'
  | 'kham-pha';

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
  grade?: number;
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
    label: '🌱 Cấp 1 — Tiểu Học',
    gradesLabel: 'Lớp 1 – Lớp 5',
    grades: [1, 2, 3, 4, 5],
    description:
      'Đánh vần Tiếng Việt, từ vựng Tiếng Anh chuẩn bản xứ, bảng cửu chương, phân số và tự nhiên xã hội vui nhộn.',
    badgeClass: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
  },
  {
    id: 'thcs',
    label: '🚀 Cấp 2 — Trung Học Cơ Sở',
    gradesLabel: 'Lớp 6 – Lớp 9',
    grades: [6, 7, 8, 9],
    description:
      'Ngữ văn & biện pháp tu từ, ngữ pháp – giao tiếp Tiếng Anh, Đại số, Hình học Pythagoras và Khoa học tự nhiên.',
    badgeClass: 'bg-sky-500/15 border-sky-500/40 text-sky-300',
  },
  {
    id: 'thpt',
    label: '🎓 Cấp 3 — Trung Học Phổ Thông',
    gradesLabel: 'Lớp 10 – Lớp 12',
    grades: [10, 11, 12],
    description:
      'Đọc hiểu Văn học, Tiếng Anh học thuật & IELTS nền tảng, Giải tích đạo hàm – tích phân, Vật lý & Hóa sinh.',
    badgeClass: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
  },
];

export const SUBJECTS_META: SubjectMeta[] = [
  {
    id: 'tieng-viet',
    name: 'Tiếng Việt & Ngữ Văn',
    shortName: 'Tiếng Việt / Văn',
    bgSoftClass: 'bg-rose-500/15',
    borderClass: 'border-rose-500/50',
    textClass: 'text-rose-300',
  },
  {
    id: 'tieng-anh',
    name: 'Tiếng Anh Chuẩn Bản Xứ',
    shortName: 'Tiếng Anh',
    bgSoftClass: 'bg-sky-500/15',
    borderClass: 'border-sky-500/50',
    textClass: 'text-sky-300',
  },
  {
    id: 'toan',
    name: 'Toán Học Tư Duy',
    shortName: 'Toán Học',
    bgSoftClass: 'bg-emerald-500/15',
    borderClass: 'border-emerald-500/50',
    textClass: 'text-emerald-300',
  },
  {
    id: 'khoa-hoc',
    name: 'Khoa Học & Vật Lý – Hóa',
    shortName: 'Khoa Học',
    bgSoftClass: 'bg-amber-500/15',
    borderClass: 'border-amber-500/50',
    textClass: 'text-amber-300',
  },
  {
    id: 'kham-pha',
    name: 'Khám Phá Lịch Sử – Địa Lý',
    shortName: 'Khám Phá',
    bgSoftClass: 'bg-indigo-500/15',
    borderClass: 'border-indigo-500/50',
    textClass: 'text-indigo-300',
  },
];

export const CURRICULUM_QUESTIONS: LearningQuestion[] = [
  // ======================== TIỂU HỌC (LỚP 1 - 5) ========================
  {
    id: 'th-tv-1',
    tier: 'tieu-hoc',
    grade: 1,
    subject: 'tieng-viet',
    topic: 'Chính tả c / k / q',
    type: 'multiple-choice',
    prompt: 'Điền chữ cái đúng vào chỗ trống: "...on kiến chăm chỉ tha mồi về tổ."',
    visualFormulaOrHint: 'Quy tắc: k đi với i, e, ê; c đi với a, ă, â, o, ô, ơ, u, ư',
    spokenPrompt: 'Điền chữ cái đúng vào chỗ trống: con kiến chăm chỉ tha mồi về tổ.',
    options: ['C (Con kiến)', 'K (Kon kiến)', 'Q (Qon kiến)', 'Ch (Chon kiến)'],
    correctIndex: 0,
    hint: 'Trước nguyên âm "o", chúng ta luôn viết chữ C (cờ), không dùng chữ K nhé!',
    explanation: 'Chính xác! Chữ K chỉ đứng trước i, e, ê (như chữ "kiến"), còn trước âm "o" ta viết là "Con kiến".',
    points: 15,
  },
  {
    id: 'th-tv-2',
    tier: 'tieu-hoc',
    grade: 2,
    subject: 'tieng-viet',
    topic: 'Ghép câu ca dao yêu thương',
    type: 'word-order',
    prompt: 'Hãy sắp xếp các thẻ từ dưới đây thành câu tục ngữ đúng và ý nghĩa:',
    spokenPrompt: 'Hãy sắp xếp các thẻ từ thành câu tục ngữ đúng: Công cha như núi Thái Sơn.',
    wordTokens: ['Công', 'cha', 'như', 'núi', 'Thái', 'Sơn'],
    acceptedAnswers: ['Công cha như núi Thái Sơn'],
    hint: 'Câu mở đầu bằng hai chữ "Công cha...".',
    explanation: '"Công cha như núi Thái Sơn, nghĩa mẹ như nước trong nguồn chảy ra" ca ngợi công ơn sinh thành to lớn của cha mẹ.',
    points: 15,
  },
  {
    id: 'th-tv-3',
    tier: 'tieu-hoc',
    grade: 4,
    subject: 'tieng-viet',
    topic: 'Từ láy và Từ ghép',
    type: 'multiple-choice',
    prompt: 'Trong các từ sau đây, từ nào là từ láy miêu tả ánh nắng buổi sớm?',
    spokenPrompt: 'Trong các từ sau đây, từ nào là từ láy miêu tả ánh nắng buổi sớm?',
    options: ['Lung linh', 'Mặt trời', 'Bình minh', 'Ánh sáng'],
    correctIndex: 0,
    hint: 'Từ láy có sự hòa phối âm đầu hoặc vần (cùng bắt đầu bằng âm "l").',
    explanation: '"Lung linh" là từ láy âm đầu "l", gợi tả vẻ đẹp rực rỡ, lấp lánh của ánh nắng sớm.',
    points: 15,
  },
  {
    id: 'th-ta-1',
    tier: 'tieu-hoc',
    grade: 1,
    subject: 'tieng-anh',
    topic: 'Colors & Fruits (Màu sắc & Trái cây)',
    type: 'multiple-choice',
    prompt: 'Quả táo màu đỏ trong Tiếng Anh được nói như thế nào?',
    visualFormulaOrHint: 'A red apple /ə red ˈæp.əl/',
    spokenPrompt: 'Quả táo màu đỏ trong Tiếng Anh được nói như thế nào?',
    options: ['A red apple', 'A blue banana', 'A yellow cat', 'A green book'],
    correctIndex: 0,
    hint: '"Red" là màu đỏ và "apple" là quả táo. Tính từ chỉ màu sắc đứng trước danh từ!',
    explanation: 'Tuyệt vời! "A red apple" (/ə red ˈæp.əl/) nghĩa là một quả táo màu đỏ.',
    points: 15,
  },
  {
    id: 'th-ta-2',
    tier: 'tieu-hoc',
    grade: 3,
    subject: 'tieng-anh',
    topic: 'Sentence Building (Ghép câu giao tiếp)',
    type: 'word-order',
    prompt: 'Sắp xếp các từ Tiếng Anh sau để tạo thành câu giới thiệu bản thân đúng ngữ pháp:',
    visualFormulaOrHint: 'I like learning English every day.',
    spokenPrompt: 'Hãy ghép các từ Tiếng Anh thành câu có nghĩa: Em thích học Tiếng Anh mỗi ngày.',
    wordTokens: ['I', 'like', 'learning', 'English', 'every', 'day'],
    acceptedAnswers: ['I like learning English every day'],
    hint: 'Cấu trúc: Chủ ngữ (I) + Động từ (like) + V-ing (learning English) + trạng từ chỉ thời gian (every day).',
    explanation: 'Chuẩn bản xứ! "I like learning English every day" nghĩa là "Em thích học Tiếng Anh mỗi ngày".',
    points: 15,
  },
  {
    id: 'th-ta-3',
    tier: 'tieu-hoc',
    grade: 5,
    subject: 'tieng-anh',
    topic: 'Simple Past Tense (Thì quá khứ đơn)',
    type: 'multiple-choice',
    prompt: 'Chọn đáp án đúng hoàn thành câu: "Yesterday, Nam ___ to the zoo with his parents."',
    visualFormulaOrHint: 'Yesterday → Past Simple (go → went)',
    spokenPrompt: 'Chọn động từ đúng cho câu: Yesterday, Nam blank to the zoo with his parents.',
    options: ['went', 'goes', 'going', 'go'],
    correctIndex: 0,
    hint: 'Có từ "Yesterday" (hôm qua) nên ta dùng động từ bất quy tắc ở quá khứ của "go".',
    explanation: 'Động từ quá khứ của "go" là "went": "Yesterday, Nam went to the zoo with his parents."',
    points: 15,
  },
  {
    id: 'th-toan-1',
    tier: 'tieu-hoc',
    grade: 2,
    subject: 'toan',
    topic: 'Phép cộng có nhớ trong phạm vi 100',
    type: 'fill-blank',
    prompt: 'Lan gấp được 27 ngôi sao giấy, Mai gấp thêm 18 ngôi sao nữa. Hỏi hai bạn gấp được tất cả bao nhiêu ngôi sao?',
    visualFormulaOrHint: '27 + 18 = ?',
    spokenPrompt: 'Lan gấp được 27 ngôi sao giấy, Mai gấp thêm 18 ngôi sao nữa. Hỏi cả hai bạn có tất cả bao nhiêu ngôi sao?',
    acceptedAnswers: ['45', '45 ngôi sao'],
    hint: 'Lấy 7 + 8 = 15 viết 5 nhớ 1; 2 + 1 = 3 thêm 1 bằng 4.',
    explanation: 'Tổng số ngôi sao hai bạn gấp được là: 27 + 18 = 45 (ngôi sao).',
    points: 15,
  },
  {
    id: 'th-toan-2',
    tier: 'tieu-hoc',
    grade: 3,
    subject: 'toan',
    topic: 'Chu vi hình vuông',
    type: 'multiple-choice',
    prompt: 'Một sân chơi hình vuông có độ dài một cạnh là 9 m. Chu vi của sân chơi đó bằng bao nhiêu?',
    visualFormulaOrHint: 'Chu vi hình vuông: P = cạnh × 4',
    spokenPrompt: 'Một sân chơi hình vuông có cạnh dài 9 mét. Hỏi chu vi sân chơi bằng bao nhiêu mét?',
    options: ['36 m', '81 m', '18 m', '27 m'],
    correctIndex: 0,
    hint: 'Chu vi hình vuông bằng độ dài một cạnh nhân với 4.',
    explanation: 'Chu vi sân chơi hình vuông là: 9 × 4 = 36 (m). (Còn 81 m² là diện tích nhé!).',
    points: 15,
  },
  {
    id: 'th-toan-3',
    tier: 'tieu-hoc',
    grade: 5,
    subject: 'toan',
    topic: 'Chuyển động đều (Vận tốc - Thời gian - Quãng đường)',
    type: 'fill-blank',
    prompt: 'Một người đi xe đạp với vận tốc 15 km/giờ trong 2 giờ. Hỏi quãng đường người đó đi được là bao nhiêu km?',
    visualFormulaOrHint: 's = v × t = 15 × 2',
    spokenPrompt: 'Một người đi xe đạp với vận tốc 15 ki lô mét trên giờ trong 2 giờ. Quãng đường đi được là bao nhiêu ki lô mét?',
    acceptedAnswers: ['30', '30km', '30 km'],
    hint: 'Quãng đường bằng vận tốc nhân với thời gian: s = v × t.',
    explanation: 'Quãng đường đi được là: s = 15 × 2 = 30 (km).',
    points: 15,
  },
  {
    id: 'th-kh-1',
    tier: 'tieu-hoc',
    grade: 4,
    subject: 'khoa-hoc',
    topic: 'Quang hợp ở cây xanh',
    type: 'multiple-choice',
    prompt: 'Dưới ánh nắng mặt trời, lá cây xanh hấp thụ khí gì và nhả ra khí gì giúp không khí trong lành?',
    spokenPrompt: 'Dưới ánh nắng mặt trời, lá cây xanh hấp thụ khí gì và nhả ra khí gì giúp con người hô hấp?',
    options: [
      'Hấp thụ khí Các-bô-níc (CO₂), nhả ra khí Ô-xi (O₂)',
      'Hấp thụ khí Ô-xi (O₂), nhả ra khí Các-bô-níc (CO₂)',
      'Chỉ hấp thụ hơi nước',
      'Hấp thụ khí Ni-tơ',
    ],
    correctIndex: 0,
    hint: 'Nhờ trồng nhiều cây xanh mà chúng ta có thêm khí Ô-xi mát lành để thở mỗi ngày!',
    explanation: 'Trong quá trình quang hợp ban ngày, cây xanh hấp thụ khí CO₂ và giải phóng khí Ô-xi (O₂) nuôi dưỡng sự sống.',
    points: 15,
  },
  {
    id: 'th-kp-1',
    tier: 'tieu-hoc',
    grade: 5,
    subject: 'kham-pha',
    topic: 'Địa lý & Biểu tượng Việt Nam',
    type: 'multiple-choice',
    prompt: 'Thủ đô ngàn năm văn hiến của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam là thành phố nào?',
    spokenPrompt: 'Thủ đô ngàn năm văn hiến của nước Việt Nam thân yêu là thành phố nào?',
    options: ['Thủ đô Hà Nội', 'Thành phố Huế', 'Thành phố Đà Nẵng', 'Thành phố Cần Thơ'],
    correctIndex: 0,
    hint: 'Nơi có Hồ Hoàn Kiếm, Lăng Bác và Văn Miếu – Quốc Tử Giám.',
    explanation: 'Hà Nội là Thủ đô ngàn năm văn hiến (từ năm 1010 với tên gọi Thăng Long), trái tim của cả nước Việt Nam.',
    points: 15,
  },

  // ======================== THCS - CẤP 2 (LỚP 6 - 9) ========================
  {
    id: 'thcs-tv-1',
    tier: 'thcs',
    grade: 6,
    subject: 'tieng-viet',
    topic: 'Biện pháp tu từ Ẩn dụ & Nhân hóa',
    type: 'multiple-choice',
    prompt: 'Câu thơ "Ông trời mặc áo giáp đen / Ra trận" (Trần Đăng Khoa) sử dụng biện pháp tu từ nổi bật nào?',
    spokenPrompt: 'Câu thơ Ông trời mặc áo giáp đen ra trận của Trần Đăng Khoa sử dụng biện pháp tu từ nào?',
    options: ['Nhân hóa', 'Nói quá', 'Nói giảm nói tránh', 'Liệt kê'],
    correctIndex: 0,
    hint: 'Tác giả gọi mây đen bầu trời bằng "Ông" và có hành động như con người ("mặc áo giáp", "ra trận").',
    explanation: 'Biện pháp Nhân hóa giúp cảnh bầu trời chuyển mưa dông hiện lên sinh động, oai phong như một vị tướng ra trận.',
    points: 20,
  },
  {
    id: 'thcs-ta-1',
    tier: 'thcs',
    grade: 7,
    subject: 'tieng-anh',
    topic: 'Conditional Type 1 (Câu điều kiện loại 1)',
    type: 'multiple-choice',
    prompt: 'Choose the correct form: "If we ___ more trees, the air in our city will become cleaner."',
    visualFormulaOrHint: 'If + S + V(s/es), S + will + V-inf',
    spokenPrompt: 'Chọn dạng động từ đúng cho câu điều kiện loại 1: If we blank more trees, the air in our city will become cleaner.',
    options: ['plant', 'planted', 'will plant', 'planting'],
    correctIndex: 0,
    hint: 'Trong mệnh đề "If" của câu điều kiện loại 1, động từ chia ở thì Hiện tại đơn (Present Simple).',
    explanation: 'Mệnh đề If dùng hiện tại đơn với chủ ngữ "we" là "plant": "If we plant more trees, the air will become cleaner."',
    points: 20,
  },
  {
    id: 'thcs-ta-2',
    tier: 'thcs',
    grade: 8,
    subject: 'tieng-anh',
    topic: 'Passive Voice (Câu bị động)',
    type: 'word-order',
    prompt: 'Sắp xếp thành câu bị động đúng chuẩn Tiếng Anh:',
    visualFormulaOrHint: 'S + was/were + V3/ed + by O',
    spokenPrompt: 'Sắp xếp các từ để tạo thành câu bị động: Chiếc bánh ngon này được làm bởi mẹ tôi.',
    wordTokens: ['This', 'delicious', 'cake', 'was', 'made', 'by', 'my', 'mother'],
    acceptedAnswers: ['This delicious cake was made by my mother'],
    hint: 'Bắt đầu bằng cụm danh từ chủ ngữ "This delicious cake" + "was made"...',
    explanation: '"This delicious cake was made by my mother." là câu bị động ở thì Quá khứ đơn (was + V3).',
    points: 20,
  },
  {
    id: 'thcs-toan-1',
    tier: 'thcs',
    grade: 8,
    subject: 'toan',
    topic: 'Định lý Pythagoras trong tam giác vuông',
    type: 'fill-blank',
    prompt: 'Cho tam giác ABC vuông tại A có hai cạnh góc vuông AB = 6 cm và AC = 8 cm. Độ dài cạnh huyền BC bằng bao nhiêu cm?',
    visualFormulaOrHint: 'BC² = AB² + AC² = 6² + 8²',
    spokenPrompt: 'Cho tam giác vuông có hai cạnh góc vuông bằng 6 xen ti mét và 8 xen ti mét. Tính độ dài cạnh huyền.',
    acceptedAnswers: ['10', '10cm', '10 cm'],
    hint: 'Tính 6² + 8² = 36 + 64 = 100, sau đó lấy căn bậc hai của 100.',
    explanation: 'Theo định lý Pythagoras: BC² = 6² + 8² = 36 + 64 = 100 ⇒ BC = √100 = 10 cm.',
    points: 20,
  },
  {
    id: 'thcs-toan-2',
    tier: 'thcs',
    grade: 9,
    subject: 'toan',
    topic: 'Hệ thức Viète của phương trình bậc hai',
    type: 'multiple-choice',
    prompt: 'Cho phương trình x² - 7x + 10 = 0 có hai nghiệm x₁, x₂. Tổng x₁ + x₂ và tích x₁·x₂ lần lượt là:',
    visualFormulaOrHint: 'x₁ + x₂ = -b/a ;  x₁·x₂ = c/a',
    spokenPrompt: 'Cho phương trình x bình phương trừ 7 x cộng 10 bằng 0. Tổng và tích hai nghiệm bằng bao nhiêu?',
    options: [
      'x₁ + x₂ = 7 và x₁·x₂ = 10',
      'x₁ + x₂ = -7 và x₁·x₂ = 10',
      'x₁ + x₂ = 7 và x₁·x₂ = -10',
      'x₁ + x₂ = 10 và x₁·x₂ = 7',
    ],
    correctIndex: 0,
    hint: 'Với a = 1, b = -7, c = 10 thì -b/a = -(-7)/1 = 7 và c/a = 10/1 = 10.',
    explanation: 'Theo định lý Viète: Tổng hai nghiệm S = -b/a = 7 và tích hai nghiệm P = c/a = 10 (hai nghiệm là 2 và 5).',
    points: 20,
  },
  {
    id: 'thcs-kh-1',
    tier: 'thcs',
    grade: 8,
    subject: 'khoa-hoc',
    topic: 'Định luật Ôm & Vật lý điện học',
    type: 'multiple-choice',
    prompt: 'Đặt hiệu điện thế U = 12 V vào hai đầu một điện trở R = 6 Ω. Cường độ dòng điện I chạy qua điện trở là:',
    visualFormulaOrHint: 'I = U / R',
    spokenPrompt: 'Đặt hiệu điện thế 12 Vôn vào hai đầu điện trở 6 Ôm. Cường độ dòng điện chạy qua bằng bao nhiêu Am pe?',
    options: ['2 A', '72 A', '0,5 A', '6 A'],
    correctIndex: 0,
    hint: 'Áp dụng định luật Ohm: I = U : R = 12 : 6.',
    explanation: 'Theo định luật Ohm: I = U / R = 12 / 6 = 2 (A).',
    points: 20,
  },
  {
    id: 'thcs-kp-1',
    tier: 'thcs',
    grade: 7,
    subject: 'kham-pha',
    topic: 'Lịch sử hào hùng dân tộc Việt Nam',
    type: 'multiple-choice',
    prompt: 'Chiến thắng Bạch Đằng năm 938 kết thúc hơn một thiên niên kỷ Bắc thuộc gắn liền với vị anh hùng dân tộc nào?',
    spokenPrompt: 'Chiến thắng Bạch Đằng năm 938 mở ra kỷ nguyên độc lập lâu dài gắn liền với vị anh hùng dân tộc nào?',
    options: ['Ngô Quyền', 'Lý Thường Kiệt', 'Trần Hưng Đạo', 'Quang Trung – Nguyễn Huệ'],
    correctIndex: 0,
    hint: 'Người đã dùng mưu đóng cọc gỗ bịt sắt ngầm trên sông Bạch Đằng đánh tan quân Nam Hán năm 938.',
    explanation: 'Năm 938, Đức Vương Ngô Quyền đại phá quân Nam Hán trên sông Bạch Đằng, chấm dứt hơn 1000 năm Bắc thuộc.',
    points: 20,
  },

  // ======================== THPT - CẤP 3 (LỚP 10 - 12) ========================
  {
    id: 'thpt-tv-1',
    tier: 'thpt',
    grade: 12,
    subject: 'tieng-viet',
    topic: 'Đọc hiểu phong cách ngôn ngữ & Nghị luận văn học',
    type: 'multiple-choice',
    prompt: 'Trong bài thơ "Tây Tiến" của Quang Dũng, câu thơ "Sông Mã xa rồi Tây Tiến ơi! / Nhớ về rừng núi, nhớ chơi vơi" sử dụng từ láy "chơi vơi" nhằm diễn tả điều gì?',
    spokenPrompt: 'Trong bài thơ Tây Tiến của Quang Dũng, từ láy chơi vơi diễn tả cảm xúc gì?',
    options: [
      'Nỗi nhớ da diết, mênh mang, đầy ắp dư âm bao trùm cả không gian và thời gian',
      'Sự lạnh lẽo của sương mù miền biên viễn',
      'Tốc độ chảy xiết của dòng sông Mã mùa lũ',
      'Khoảng cách địa lý chính xác giữa hai vùng đất',
    ],
    correctIndex: 0,
    hint: 'Chú ý hiệp vần "ơi" ("Tây Tiến ơi" – "nhớ chơi vơi") tạo âm hưởng ngân dài sâu lắng.',
    explanation: 'Từ láy "chơi vơi" kết hợp điệp từ "nhớ" khắc họa trạng thái nỗi nhớ bồng bềnh, da diết, sâu thẳm không thể đong đếm.',
    points: 25,
  },
  {
    id: 'thpt-ta-1',
    tier: 'thpt',
    grade: 11,
    subject: 'tieng-anh',
    topic: 'Inversion & Academic Grammar (Đảo ngữ Tiếng Anh)',
    type: 'multiple-choice',
    prompt: 'Choose the best answer: "Not only ___ fluent English, but she also writes persuasive essays."',
    visualFormulaOrHint: 'Not only + Auxiliary + S + V, but S + also...',
    spokenPrompt: 'Chọn cấu trúc đảo ngữ đúng: Not only blank fluent English, but she also writes persuasive essays.',
    options: ['does Lan speak', 'Lan speaks', 'speaks Lan', 'did Lan spoke'],
    correctIndex: 0,
    hint: 'Khi "Not only" đứng đầu câu, mệnh đề đầu phải đảo trợ động từ lên trước chủ ngữ (thì Hiện tại đơn → does + S + V).',
    explanation: 'Đảo ngữ với "Not only" ở hiện tại đơn: "Not only does Lan speak fluent English, but she also writes persuasive essays."',
    points: 25,
  },
  {
    id: 'thpt-toan-1',
    tier: 'thpt',
    grade: 12,
    subject: 'toan',
    topic: 'Giải tích: Tích phân cơ bản',
    type: 'fill-blank',
    prompt: 'Tính giá trị tích phân xác định: I = ∫₀² (3x² + 2) dx',
    visualFormulaOrHint: 'Nguyên hàm của 3x² + 2 là F(x) = x³ + 2x',
    spokenPrompt: 'Tính tích phân từ 0 đến 2 của hàm số 3 x bình phương cộng 2 d x.',
    acceptedAnswers: ['12'],
    hint: 'Tìm F(x) = x³ + 2x, sau đó tính F(2) - F(0) = (2³ + 2·2) - 0.',
    explanation: 'Ta có F(x) = x³ + 2x. Vậy I = F(2) - F(0) = (8 + 4) - 0 = 12.',
    points: 25,
  },
  {
    id: 'thpt-toan-2',
    tier: 'thpt',
    grade: 11,
    subject: 'toan',
    topic: 'Tổ hợp & Xác suất',
    type: 'multiple-choice',
    prompt: 'Một tổ học tập gồm 6 bạn học sinh giỏi. Hỏi có bao nhiêu cách chọn ra một nhóm gồm 2 bạn đi dự thi Hùng biện Tiếng Anh?',
    visualFormulaOrHint: 'C₆² = 6! / (2! · 4!)',
    spokenPrompt: 'Từ 6 bạn học sinh, có bao nhiêu cách chọn ra một nhóm 2 bạn không phân biệt thứ tự?',
    options: ['15 cách', '30 cách', '12 cách', '36 cách'],
    correctIndex: 0,
    hint: 'Chọn 2 bạn không phân biệt vai trò là tổ hợp chập 2 của 6: (6 × 5) : 2.',
    explanation: 'Số cách chọn là tổ hợp chập 2 của 6 phần tử: C₆² = (6 × 5) / 2 = 15 (cách).',
    points: 25,
  },
  {
    id: 'thpt-kh-1',
    tier: 'thpt',
    grade: 12,
    subject: 'khoa-hoc',
    topic: 'Vật lý 12: Dao động điều hòa con lắc đơn',
    type: 'multiple-choice',
    prompt: 'Khi tăng chiều dài dây treo l của một con lắc đơn lên 4 lần tại cùng một nơi trên Trái Đất thì chu kỳ dao động nhỏ T của nó thay đổi thế nào?',
    visualFormulaOrHint: 'T = 2π · √(l / g)',
    spokenPrompt: 'Khi tăng chiều dài con lắc đơn lên 4 lần thì chu kỳ dao động điều hòa thay đổi như thế nào?',
    options: ['Tăng lên 2 lần', 'Tăng lên 4 lần', 'Giảm đi 2 lần', 'Không thay đổi'],
    correctIndex: 0,
    hint: 'Chu kỳ T tỉ lệ thuận với căn bậc hai của chiều dài l (√4 = 2).',
    explanation: 'Vì T = 2π√(l/g) nên khi l tăng 4 lần thì T tỉ lệ với √4, tức là chu kỳ tăng lên 2 lần.',
    points: 25,
  },
];

export const CURRICULUM_FLASHCARDS: LearningFlashcard[] = [
  {
    id: 'fc-th-1',
    tier: 'tieu-hoc',
    grade: 2,
    subject: 'tieng-viet',
    frontBadge: 'Tiếng Việt Tiểu Học • Mẹo Chính Tả',
    frontTitle: 'Quy tắc vàng viết đúng C / K và G / GH',
    frontSubtitle: 'Không bao giờ nhầm lẫn khi viết chính tả!',
    backContent:
      '• Chữ K, GH, NGH luôn đứng trước 3 nguyên âm: I, E, Ê.\n• Chữ C, G, NG đứng trước các nguyên âm còn lại (a, ă, â, o, ô, ơ, u, ư).',
    example: 'Ví dụ đúng: Kể chuyện, kì diệu, ghế gỗ, con kiến, quả cam.',
    spokenText:
      'Mẹo nhớ nhanh chính tả: Chữ K, GH và NGH luôn kết bạn với ba chữ I, E, Ê. Ví dụ: kể chuyện, kì diệu, ghế gỗ.',
  },
  {
    id: 'fc-th-2',
    tier: 'tieu-hoc',
    grade: 3,
    subject: 'tieng-anh',
    frontBadge: 'Tiếng Anh Tiểu Học • Giao Tiếp Chuẩn',
    frontTitle: 'Daily Greetings & Polite Expressions',
    frontSubtitle: '/ɡʊd ˈmɔː.nɪŋ/ • /θæŋk juː ˈver.i mʌtʃ/',
    backContent:
      '• Good morning! — Chào buổi sáng!\n• Nice to meet you! — Rất vui được gặp bạn!\n• Could you help me, please? — Bạn giúp mình với nhé?',
    example: 'Hello teacher! Thank you very much for helping me today.',
    spokenText:
      'Khi chào hỏi lịch sự bằng Tiếng Anh, các em hãy mỉm cười và nói: Good morning! Nice to meet you!',
  },
  {
    id: 'fc-th-3',
    tier: 'tieu-hoc',
    grade: 4,
    subject: 'toan',
    frontBadge: 'Toán Tiểu Học • Công Thức Trọng Tâm',
    frontTitle: 'Tìm Hai Số Khi Biết Tổng Và Hiệu',
    frontSubtitle: 'Số bé = (Tổng − Hiệu) : 2  |  Số lớn = (Tổng + Hiệu) : 2',
    backContent:
      'Muốn tìm hai số khi biết Tổng và Hiệu:\n1. Số bé = (Tổng trừ Hiệu) chia 2.\n2. Số lớn = Số bé cộng Hiệu (hoặc Tổng cộng Hiệu tất cả chia 2).',
    example: 'Tổng = 50, Hiệu = 10 ⇒ Số bé = (50 − 10) : 2 = 20; Số lớn = 30.',
    spokenText:
      'Công thức tìm hai số khi biết tổng và hiệu: Số bé bằng mở ngoặc Tổng trừ Hiệu đóng ngoặc chia 2. Số lớn bằng Tổng cộng Hiệu tất cả chia 2.',
  },
  {
    id: 'fc-thcs-1',
    tier: 'thcs',
    grade: 8,
    subject: 'toan',
    frontBadge: 'Toán THCS • Hình Học & Đại Số',
    frontTitle: '7 Hằng Đẳng Thức & Định Lý Pythagoras',
    frontSubtitle: '(a + b)² = a² + 2ab + b²  •  a² − b² = (a − b)(a + b)',
    backContent:
      '• Bình phương một tổng: (a + b)² = a² + 2ab + b²\n• Hiệu hai bình phương: a² − b² = (a − b)(a + b)\n• Tam giác vuông: Bình phương cạnh huyền bằng tổng bình phương hai cạnh góc vuông (c² = a² + b²).',
    example: 'Bộ ba Pythagoras quen thuộc: (3, 4, 5), (6, 8, 10), (5, 12, 13).',
    spokenText:
      'Trong tam giác vuông, bình phương cạnh huyền luôn bằng tổng bình phương hai cạnh góc vuông. Các bộ ba số đẹp thường gặp là 3, 4, 5 và 6, 8, 10.',
  },
  {
    id: 'fc-thcs-2',
    tier: 'thcs',
    grade: 8,
    subject: 'tieng-anh',
    frontBadge: 'Tiếng Anh THCS • Phát Âm Đuôi -ED',
    frontTitle: 'Pronouncing Past Regular Verbs (-ed)',
    frontSubtitle: '3 cách đọc chuẩn bản xứ: /ɪd/, /t/, /d/',
    backContent:
      '1. Đọc là /ɪd/ sau âm /t/, /d/ (wanted, needed).\n2. Đọc là /t/ sau âm vô thanh /p, k, f, s, ʃ, tʃ/ (watched, helped).\n3. Đọc là /d/ sau các âm hữu thanh & nguyên âm còn lại (played, loved).',
    example: 'She watched a movie, played the piano, and invited her friends.',
    spokenText:
      'Ba quy tắc phát âm đuôi e d chuẩn bản xứ: Đọc là ít sau tờ và đờ; đọc là tờ sau các âm bật hơi vô thanh; và đọc là đờ cho các âm còn lại.',
  },
  {
    id: 'fc-thpt-1',
    tier: 'thpt',
    grade: 12,
    subject: 'toan',
    frontBadge: 'Toán THPT • Giải Tích 12',
    frontTitle: 'Bảng Đạo Hàm & Nguyên Hàm Cốt Lõi',
    frontSubtitle: "(xⁿ)' = n·xⁿ⁻¹  •  ∫ xⁿ dx = xⁿ⁺¹ / (n + 1) + C",
    backContent:
      "• (xⁿ)' = n·xⁿ⁻¹  |  (eˣ)' = eˣ  |  (ln x)' = 1/x\n• (sin x)' = cos x  |  (cos x)' = −sin x\n• Điểm cực trị hàm khả vi f(x) xảy ra khi f'(x) đổi dấu qua nghiệm x₀.",
    example: "Cho f(x) = x³ − 3x ⇒ f'(x) = 3x² − 3 = 0 ⇔ x = ±1 (2 điểm cực trị).",
    spokenText:
      'Đạo hàm của x mũ n bằng n nhân x mũ n trừ 1. Điểm cực trị của hàm số xuất hiện tại nơi đạo hàm f phẩy đổi dấu.',
  },
  {
    id: 'fc-thpt-2',
    tier: 'thpt',
    grade: 12,
    subject: 'tieng-anh',
    frontBadge: 'Tiếng Anh THPT & IELTS • Academic Linking Words',
    frontTitle: 'High-Scoring Connectors for Writing & Speaking',
    frontSubtitle: 'Furthermore • Nevertheless • Consequently',
    backContent:
      '• Bổ sung ý (Adding): Furthermore, Moreover, In addition\n• Tương phản (Contrast): Nevertheless, On the other hand, Whereas\n• Kết quả (Result): Consequently, Therefore, As a result',
    example: 'Regular reading expands vocabulary; furthermore, it sharpens critical thinking.',
    spokenText:
      'Để nâng điểm bài nói và bài luận Tiếng Anh cấp 3, hãy sử dụng linh hoạt các từ nối học thuật như Furthermore, Nevertheless và Consequently.',
  },
];
