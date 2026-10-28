import React, { useState, useMemo, useCallback } from 'react';
import {
  Volume2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Trophy,
  RefreshCw,
  Globe,
  BookOpen,
  Play,
  Turtle,
} from 'lucide-react';

export interface KidsAlphabetModuleProps {
  onSpeakVi: (text: string) => void;
  onSpeakEnglish: (text: string, opts?: { slow?: boolean }) => void;
  isSpeaking: boolean;
  viVoiceLabel: string;
  enVoiceLabel: string;
  onEarnReward: (xpDelta: number, starDelta: number) => void;
  soundFx: boolean;
  onPlayFeedbackTone: (kind: 'correct' | 'retry') => void;
}

interface ViLetterItem {
  upper: string;
  lower: string;
  soundRead: string; // e.g. "bờ"
  nameRead: string; // e.g. "bê"
  isVowel: boolean;
  emoji: string;
  word: string;
  sentence: string;
  tip: string;
}

interface EnLetterItem {
  upper: string;
  lower: string;
  ipaName: string;
  phonicsIpa: string;
  phonicsSpeak: string;
  word1: { en: string; ipa: string; vi: string; emoji: string };
  word2: { en: string; ipa: string; vi: string; emoji: string };
}

const VIETNAMESE_ALPHABET: ViLetterItem[] = [
  { upper: 'A', lower: 'a', soundRead: 'a', nameRead: 'a', isVowel: true, emoji: '🐟', word: 'Con cá', sentence: 'Đàn cá vàng bơi tung tăng.', tip: 'Nét cong kín kết hợp nét móc ngược bên phải.' },
  { upper: 'Ă', lower: 'ă', soundRead: 'á', nameRead: 'á', isVowel: true, emoji: '🌙', word: 'Ánh trăng', sentence: 'Ánh trăng rằm sáng tỏ sân nhà.', tip: 'Giống chữ a và đội thêm dấu mũ ngửa nhỏ xinh phía trên.' },
  { upper: 'Â', lower: 'â', soundRead: 'ớ', nameRead: 'ớ', isVowel: true, emoji: '☁️', word: 'Đám mây', sentence: 'Đám mây trắng bồng bềnh trên trời xanh.', tip: 'Giống chữ a và đội chiếc nón nhọn cân đối ở trên đầu.' },
  { upper: 'B', lower: 'b', soundRead: 'bờ', nameRead: 'bê', isVowel: false, emoji: '🦋', word: 'Con bướm', sentence: 'Cánh bướm rực rỡ đậu trên bông hoa.', tip: 'Nét khuyết trên cao kết hợp nét thắt gọn gàng.' },
  { upper: 'C', lower: 'c', soundRead: 'cờ', nameRead: 'xê', isVowel: false, emoji: '🦩', word: 'Con cò', sentence: 'Cánh cò trắng bay lả bay la.', tip: 'Một nét cong hở phải thật tròn trịa, mềm mại.' },
  { upper: 'D', lower: 'd', soundRead: 'dờ', nameRead: 'dê', isVowel: false, emoji: '🍉', word: 'Dưa hấu', sentence: 'Miếng dưa hấu đỏ ngọt mát mùa hè.', tip: 'Nét cong kín nối liền nét thẳng đứng từ trên xuống.' },
  { upper: 'Đ', lower: 'đ', soundRead: 'đờ', nameRead: 'đê', isVowel: false, emoji: '🌻', word: 'Hoa đồng tiền', sentence: 'Con đường làng rợp bóng cây xanh.', tip: 'Giống chữ d và có thêm một nét gạch ngang ngắn trên thân.' },
  { upper: 'E', lower: 'e', soundRead: 'e', nameRead: 'e', isVowel: true, emoji: '👶', word: 'Em bé', sentence: 'Em bé cười tươi trong vòng tay mẹ.', tip: 'Nét thắt xiên nối liền nét cong hở phải.' },
  { upper: 'Ê', lower: 'ê', soundRead: 'ê', nameRead: 'ê', isVowel: true, emoji: '🐸', word: 'Con ếch', sentence: 'Chú ếch xanh ngồi trên lá sen.', tip: 'Chữ e đội thêm chiếc nón nhỏ ngay ngắn trên đầu.' },
  { upper: 'G', lower: 'g', soundRead: 'gờ', nameRead: 'giê', isVowel: false, emoji: '🐓', word: 'Con gà', sentence: 'Chú gà trống gáy vang báo thức buổi sáng.', tip: 'Nét cong kín kết hợp nét khuyết dưới kéo thẳng.' },
  { upper: 'H', lower: 'h', soundRead: 'hờ', nameRead: 'hát', isVowel: false, emoji: '🌸', word: 'Bông hoa', sentence: 'Bông hoa hồng tỏa hương thơm ngát.', tip: 'Nét khuyết trên nối liền nét móc hai đầu.' },
  { upper: 'I', lower: 'i', soundRead: 'i', nameRead: 'i ngắn', isVowel: true, emoji: '🟣', word: 'Viên bi', sentence: 'Những viên bi tròn lấp lánh sắc màu.', tip: 'Một nét móc ngược và dấu chấm nhỏ xinh phía trên.' },
  { upper: 'K', lower: 'k', soundRead: 'ca', nameRead: 'ca', isVowel: false, emoji: '🍬', word: 'Cái kẹo', sentence: 'Chiếc kẹo ngọt thơm hương cam.', tip: 'Đi trước các nguyên âm i, e, ê (ví dụ: kì diệu, kể chuyện).' },
  { upper: 'L', lower: 'l', soundRead: 'lờ', nameRead: 'e-lờ', isVowel: false, emoji: '🍐', word: 'Quả lê', sentence: 'Lá cây xanh mướt dưới nắng ban mai.', tip: 'Một nét khuyết trên cao kết hợp nét móc ngược.' },
  { upper: 'M', lower: 'm', soundRead: 'mờ', nameRead: 'em-mờ', isVowel: false, emoji: '🐱', word: 'Con mèo', sentence: 'Chú mèo mướp sưởi nắng bên hiên nhà.', tip: 'Gồm hai nét móc xuôi và một nét móc hai đầu đều nhau.' },
  { upper: 'N', lower: 'n', soundRead: 'nờ', nameRead: 'en-nờ', isVowel: false, emoji: '🦌', word: 'Con nai', sentence: 'Chú nai vàng ngơ ngác trong rừng thu.', tip: 'Một nét móc xuôi nối liền một nét móc hai đầu.' },
  { upper: 'O', lower: 'o', soundRead: 'o', nameRead: 'o', isVowel: true, emoji: '🐝', word: 'Con ong', sentence: 'Đàn ong chăm chỉ đi tìm mật ngọt.', tip: 'Một nét cong kín tròn đều như quả trứng gà.' },
  { upper: 'Ô', lower: 'ô', soundRead: 'ô', nameRead: 'ô', isVowel: true, emoji: '☂️', word: 'Cái ô', sentence: 'Chiếc ô che nắng che mưa cho bé đến trường.', tip: 'Chữ o tròn trịa đội thêm chiếc nón nhọn ở trên.' },
  { upper: 'Ơ', lower: 'ơ', soundRead: 'ơ', nameRead: 'ơ', isVowel: true, emoji: '🚩', word: 'Lá cờ', sentence: 'Lá cờ đỏ sao vàng tung bay trước gió.', tip: 'Chữ o có thêm dấu móc nhỏ duyên dáng bên phải.' },
  { upper: 'P', lower: 'p', soundRead: 'pờ', nameRead: 'pê', isVowel: false, emoji: '🎹', word: 'Đàn pi-a-nô', sentence: 'Tiếng đàn pi-a-nô ngân vang êm dịu.', tip: 'Nét thẳng đứng kéo xuống kết hợp nét móc hai đầu.' },
  { upper: 'Q', lower: 'q', soundRead: 'quờ', nameRead: 'quy', isVowel: false, emoji: '🍊', word: 'Quả quýt', sentence: 'Chữ q luôn đi đôi với chữ u tạo thành âm quờ.', tip: 'Nét cong kín nối với nét thẳng đứng kéo xuống dưới.' },
  { upper: 'R', lower: 'r', soundRead: 'rờ', nameRead: 'e-rờ', isVowel: false, emoji: '🐢', word: 'Con rùa', sentence: 'Chú rùa nhỏ kiên trì bước từng bước vững chắc.', tip: 'Khi đọc nhớ cong nhẹ đầu lưỡi để phân biệt với dờ/giờ.' },
  { upper: 'S', lower: 's', soundRead: 'sờ', nameRead: 'ét-sì', isVowel: false, emoji: '🐿️', word: 'Con sóc', sentence: 'Chú sóc nâu chuyền cành rất nhanh nhẹn.', tip: 'Âm sờ nặng: uốn cong đầu lưỡi khi phát âm (sóc, chim sẻ).' },
  { upper: 'T', lower: 't', soundRead: 'tờ', nameRead: 'tê', isVowel: false, emoji: '🍎', word: 'Quả táo', sentence: 'Tình bạn tuổi thơ trong sáng và đẹp đẽ.', tip: 'Nét hất, nét móc ngược và một nét gạch ngang ngắn.' },
  { upper: 'U', lower: 'u', soundRead: 'u', nameRead: 'u', isVowel: true, emoji: '🥭', word: 'Quả đu đủ', sentence: 'Mùa thu bầu trời cao và trong xanh.', tip: 'Hai nét móc ngược nối liền nhau đều đặn.' },
  { upper: 'Ư', lower: 'ư', soundRead: 'ư', nameRead: 'ư', isVowel: true, emoji: '🦁', word: 'Sư tử', sentence: 'Chú sư tử dũng mãnh trên thảo nguyên.', tip: 'Chữ u có thêm dấu móc nhỏ phía trên bên phải.' },
  { upper: 'V', lower: 'v', soundRead: 'vờ', nameRead: 'vê', isVowel: false, emoji: '🐘', word: 'Con voi', sentence: 'Chú voi con ở Bản Đôn rất hiền lành.', tip: 'Nét móc hai đầu kết hợp nét thắt trên mềm mại.' },
  { upper: 'X', lower: 'x', soundRead: 'xờ', nameRead: 'ích-xì', isVowel: false, emoji: '🚲', word: 'Xe đạp', sentence: 'Mùa xuân cây cối đâm chồi nảy lộc.', tip: 'Hai nét cong lưng chạm nhau ở giữa (âm xờ nhẹ).' },
  { upper: 'Y', lower: 'y', soundRead: 'i', nameRead: 'y dài', isVowel: true, emoji: '🩺', word: 'Y tá', sentence: 'Cô y tá ân cần chăm sóc bệnh nhân.', tip: 'Nét móc hai đầu nối liền nét khuyết dưới kéo dài.' },
];

const ENGLISH_ALPHABET: EnLetterItem[] = [
  { upper: 'A', lower: 'a', ipaName: '/eɪ/', phonicsIpa: '/æ/', phonicsSpeak: 'A says a, like Apple', word1: { en: 'Apple', ipa: '/ˈæp.əl/', vi: 'Quả táo', emoji: '🍎' }, word2: { en: 'Astronaut', ipa: '/ˈæs.trə.nɔːt/', vi: 'Phi hành gia', emoji: '👨‍🚀' } },
  { upper: 'B', lower: 'b', ipaName: '/biː/', phonicsIpa: '/b/', phonicsSpeak: 'B says buh, like Butterfly', word1: { en: 'Butterfly', ipa: '/ˈbʌt.ə.flaɪ/', vi: 'Con bướm', emoji: '🦋' }, word2: { en: 'Book', ipa: '/bʊk/', vi: 'Quyển sách', emoji: '📘' } },
  { upper: 'C', lower: 'c', ipaName: '/siː/', phonicsIpa: '/k/', phonicsSpeak: 'C says kuh, like Cat', word1: { en: 'Cat', ipa: '/kæt/', vi: 'Con mèo', emoji: '🐱' }, word2: { en: 'Camera', ipa: '/ˈkæm.rə/', vi: 'Máy ảnh', emoji: '📷' } },
  { upper: 'D', lower: 'd', ipaName: '/diː/', phonicsIpa: '/d/', phonicsSpeak: 'D says duh, like Dolphin', word1: { en: 'Dolphin', ipa: '/ˈdɒl.fɪn/', vi: 'Cá heo', emoji: '🐬' }, word2: { en: 'Dog', ipa: '/dɒɡ/', vi: 'Chú chó', emoji: '🐶' } },
  { upper: 'E', lower: 'e', ipaName: '/iː/', phonicsIpa: '/e/', phonicsSpeak: 'E says eh, like Elephant', word1: { en: 'Elephant', ipa: '/ˈel.ɪ.fənt/', vi: 'Con voi', emoji: '🐘' }, word2: { en: 'Egg', ipa: '/eɡ/', vi: 'Quả trứng', emoji: '🥚' } },
  { upper: 'F', lower: 'f', ipaName: '/ef/', phonicsIpa: '/f/', phonicsSpeak: 'F says fff, like Fish', word1: { en: 'Fish', ipa: '/fɪʃ/', vi: 'Con cá', emoji: '🐠' }, word2: { en: 'Flower', ipa: '/ˈflaʊ.ər/', vi: 'Bông hoa', emoji: '🌺' } },
  { upper: 'G', lower: 'g', ipaName: '/dʒiː/', phonicsIpa: '/ɡ/', phonicsSpeak: 'G says guh, like Giraffe and Guitar', word1: { en: 'Guitar', ipa: '/ɡɪˈtɑːr/', vi: 'Đàn ghi-ta', emoji: '🎸' }, word2: { en: 'Giraffe', ipa: '/dʒɪˈrɑːf/', vi: 'Hươu cao cổ', emoji: '🦒' } },
  { upper: 'H', lower: 'h', ipaName: '/eɪtʃ/', phonicsIpa: '/h/', phonicsSpeak: 'H says huh, like House', word1: { en: 'House', ipa: '/haʊs/', vi: 'Ngôi nhà', emoji: '🏠' }, word2: { en: 'Honey', ipa: '/ˈhʌn.i/', vi: 'Mật ong', emoji: '🍯' } },
  { upper: 'I', lower: 'i', ipaName: '/aɪ/', phonicsIpa: '/ɪ/', phonicsSpeak: 'I says ih, like Ice cream and Igloo', word1: { en: 'Ice cream', ipa: '/ˈaɪs ˌkriːm/', vi: 'Kem lạnh', emoji: '🍦' }, word2: { en: 'Island', ipa: '/ˈaɪ.lənd/', vi: 'Hòn đảo', emoji: '🏝️' } },
  { upper: 'J', lower: 'j', ipaName: '/dʒeɪ/', phonicsIpa: '/dʒ/', phonicsSpeak: 'J says juh, like Juice', word1: { en: 'Juice', ipa: '/dʒuːs/', vi: 'Nước ép trái cây', emoji: '🧃' }, word2: { en: 'Jellyfish', ipa: '/ˈdʒel.i.fɪʃ/', vi: 'Con sứa', emoji: '🪼' } },
  { upper: 'K', lower: 'k', ipaName: '/keɪ/', phonicsIpa: '/k/', phonicsSpeak: 'K says kuh, like Kite', word1: { en: 'Kite', ipa: '/kaɪt/', vi: 'Cánh diều', emoji: '🪁' }, word2: { en: 'Koala', ipa: '/kəʊˈɑː.lə/', vi: 'Gấu túi Koala', emoji: '🐨' } },
  { upper: 'L', lower: 'l', ipaName: '/el/', phonicsIpa: '/l/', phonicsSpeak: 'L says lll, like Lion', word1: { en: 'Lion', ipa: '/ˈlaɪ.ən/', vi: 'Sư tử', emoji: '🦁' }, word2: { en: 'Lemon', ipa: '/ˈlem.ən/', vi: 'Quả chanh vàng', emoji: '🍋' } },
  { upper: 'M', lower: 'm', ipaName: '/em/', phonicsIpa: '/m/', phonicsSpeak: 'M says mmm, like Moon', word1: { en: 'Moon', ipa: '/muːn/', vi: 'Mặt trăng', emoji: '🌕' }, word2: { en: 'Monkey', ipa: '/ˈmʌŋ.ki/', vi: 'Con khỉ', emoji: '🐒' } },
  { upper: 'N', lower: 'n', ipaName: '/en/', phonicsIpa: '/n/', phonicsSpeak: 'N says nnn, like Notebook', word1: { en: 'Notebook', ipa: '/ˈnəʊt.bʊk/', vi: 'Quyển vở', emoji: '📓' }, word2: { en: 'Nest', ipa: '/nest/', vi: 'Tổ chim', emoji: '🪺' } },
  { upper: 'O', lower: 'o', ipaName: '/əʊ/', phonicsIpa: '/ɒ/', phonicsSpeak: 'O says ah, like Orange', word1: { en: 'Orange', ipa: '/ˈɒr.ɪndʒ/', vi: 'Quả cam', emoji: '🍊' }, word2: { en: 'Octopus', ipa: '/ˈɒk.tə.pəs/', vi: 'Bạch tuộc', emoji: '🐙' } },
  { upper: 'P', lower: 'p', ipaName: '/piː/', phonicsIpa: '/p/', phonicsSpeak: 'P says puh, like Penguin', word1: { en: 'Penguin', ipa: '/ˈpeŋ.ɡwɪn/', vi: 'Chim cánh cụt', emoji: '🐧' }, word2: { en: 'Pencil', ipa: '/ˈpen.səl/', vi: 'Bút chì', emoji: '✏️' } },
  { upper: 'Q', lower: 'q', ipaName: '/kjuː/', phonicsIpa: '/kw/', phonicsSpeak: 'Q says kwuh, like Queen', word1: { en: 'Queen', ipa: '/kwiːn/', vi: 'Nữ hoàng', emoji: '👑' }, word2: { en: 'Question', ipa: '/ˈkwes.tʃən/', vi: 'Câu hỏi', emoji: '❓' } },
  { upper: 'R', lower: 'r', ipaName: '/ɑːr/', phonicsIpa: '/r/', phonicsSpeak: 'R says rrr, like Rainbow', word1: { en: 'Rainbow', ipa: '/ˈreɪn.bəʊ/', vi: 'Cầu vồng', emoji: '🌈' }, word2: { en: 'Rabbit', ipa: '/ˈræb.ɪt/', vi: 'Con thỏ', emoji: '🐰' } },
  { upper: 'S', lower: 's', ipaName: '/es/', phonicsIpa: '/s/', phonicsSpeak: 'S says sss, like Sun', word1: { en: 'Sun', ipa: '/sʌn/', vi: 'Mặt trời', emoji: '☀️' }, word2: { en: 'Strawberry', ipa: '/ˈstrɔː.bər.i/', vi: 'Quả dâu tây', emoji: '🍓' } },
  { upper: 'T', lower: 't', ipaName: '/tiː/', phonicsIpa: '/t/', phonicsSpeak: 'T says tuh, like Tiger', word1: { en: 'Tiger', ipa: '/ˈtaɪ.ɡər/', vi: 'Con hổ', emoji: '🐯' }, word2: { en: 'Train', ipa: '/treɪn/', vi: 'Đoàn tàu', emoji: '🚆' } },
  { upper: 'U', lower: 'u', ipaName: '/juː/', phonicsIpa: '/ʌ/', phonicsSpeak: 'U says uh, like Umbrella', word1: { en: 'Umbrella', ipa: '/ʌmˈbrel.ə/', vi: 'Chiếc ô', emoji: '☂️' }, word2: { en: 'Unicorn', ipa: '/ˈjuː.nɪ.kɔːn/', vi: 'Kỳ lân', emoji: '🦄' } },
  { upper: 'V', lower: 'v', ipaName: '/viː/', phonicsIpa: '/v/', phonicsSpeak: 'V says vvv, like Violin', word1: { en: 'Violin', ipa: '/ˌvaɪəˈlɪn/', vi: 'Đàn vĩ cầm', emoji: '🎻' }, word2: { en: 'Vegetables', ipa: '/ˈvedʒ.tə.bəlz/', vi: 'Rau củ tươi', emoji: '🥦' } },
  { upper: 'W', lower: 'w', ipaName: '/ˈdʌb.əl.juː/', phonicsIpa: '/w/', phonicsSpeak: 'W says wuh, like Whale', word1: { en: 'Whale', ipa: '/weɪl/', vi: 'Cá voi', emoji: '🐋' }, word2: { en: 'Watermelon', ipa: '/ˈwɔː.təˌmel.ən/', vi: 'Dưa hấu', emoji: '🍉' } },
  { upper: 'X', lower: 'x', ipaName: '/eks/', phonicsIpa: '/ks/', phonicsSpeak: 'X says ks, like Xylophone and Fox', word1: { en: 'Xylophone', ipa: '/ˈzaɪ.lə.fəʊn/', vi: 'Đàn mộc cầm', emoji: '🎼' }, word2: { en: 'Fox', ipa: '/fɒks/', vi: 'Con cáo', emoji: '🦊' } },
  { upper: 'Y', lower: 'y', ipaName: '/waɪ/', phonicsIpa: '/j/', phonicsSpeak: 'Y says yuh, like Yacht', word1: { en: 'Yacht', ipa: '/jɒt/', vi: 'Thuyền buồm', emoji: '⛵' }, word2: { en: 'Yogurt', ipa: '/ˈjɒɡ.ət/', vi: 'Sữa chua', emoji: '🥣' } },
  { upper: 'Z', lower: 'z', ipaName: '/ziː/', phonicsIpa: '/z/', phonicsSpeak: 'Z says zzz, like Zebra', word1: { en: 'Zebra', ipa: '/ˈzeb.rə/', vi: 'Ngựa vằn', emoji: '🦓' }, word2: { en: 'Zoo', ipa: '/zuː/', vi: 'Sở thú', emoji: '🦒' } },
];

type ToneId = 'ngang' | 'sac' | 'huyen' | 'hoi' | 'nga' | 'nang';

const VIETNAMESE_TONES: { id: ToneId; name: string; mark: string; desc: string }[] = [
  { id: 'ngang', name: 'Thanh ngang', mark: 'Không dấu', desc: 'Giọng bằng phẳng, tự nhiên (ba, ca, ma)' },
  { id: 'sac', name: 'Dấu sắc', mark: '´', desc: 'Giọng lên cao và gọn (bá, cá, lá)' },
  { id: 'huyen', name: 'Dấu huyền', mark: '`', desc: 'Giọng trầm nhẹ đi xuống (bà, cà, nhà)' },
  { id: 'hoi', name: 'Dấu hỏi', mark: 'ˀ', desc: 'Giọng trầm xuống rồi uốn lên (bả, cả, cỏ)' },
  { id: 'nga', name: 'Dấu ngã', mark: '~', desc: 'Giọng gãy nhẹ rồi vút cao (bã, mã, sữa)' },
  { id: 'nang', name: 'Dấu nặng', mark: '.', desc: 'Giọng trầm dứt khoát (bạ, mẹ, cọ)' },
];

const VOWEL_TONE_MAP: Record<string, Record<ToneId, string>> = {
  a: { ngang: 'a', sac: 'á', huyen: 'à', hoi: 'ả', nga: 'ã', nang: 'ạ' },
  o: { ngang: 'o', sac: 'ó', huyen: 'ò', hoi: 'ỏ', nga: 'õ', nang: 'ọ' },
  ô: { ngang: 'ô', sac: 'ố', huyen: 'ồ', hoi: 'ổ', nga: 'ỗ', nang: 'ộ' },
  ơ: { ngang: 'ơ', sac: 'ớ', huyen: 'ờ', hoi: 'ở', nga: 'ỡ', nang: 'ợ' },
  e: { ngang: 'e', sac: 'é', huyen: 'è', hoi: 'ẻ', nga: 'ẽ', nang: 'ẹ' },
  ê: { ngang: 'ê', sac: 'ế', huyen: 'ề', hoi: 'ể', nga: 'ễ', nang: 'ệ' },
  i: { ngang: 'i', sac: 'í', huyen: 'ì', hoi: 'ỉ', nga: 'ĩ', nang: 'ị' },
  u: { ngang: 'u', sac: 'ú', huyen: 'ù', hoi: 'ủ', nga: 'ũ', nang: 'ụ' },
  ư: { ngang: 'ư', sac: 'ứ', huyen: 'ừ', hoi: 'ử', nga: 'ữ', nang: 'ự' },
};

const BLEND_CONSONANTS: { char: string; read: string }[] = [
  { char: 'B', read: 'Bờ' },
  { char: 'C', read: 'Cờ' },
  { char: 'D', read: 'Dờ' },
  { char: 'Đ', read: 'Đờ' },
  { char: 'H', read: 'Hờ' },
  { char: 'L', read: 'Lờ' },
  { char: 'M', read: 'Mờ' },
  { char: 'N', read: 'Nờ' },
  { char: 'S', read: 'Sờ' },
  { char: 'T', read: 'Tờ' },
  { char: 'V', read: 'Vờ' },
];

export const KidsAlphabetModule: React.FC<KidsAlphabetModuleProps> = ({
  onSpeakVi,
  onSpeakEnglish,
  viVoiceLabel,
  enVoiceLabel,
  onEarnReward,
  soundFx,
  onPlayFeedbackTone,
}) => {
  const [subTab, setSubTab] = useState<'vi' | 'en' | 'blend' | 'game'>('vi');
  const [caseDisplay, setCaseDisplay] = useState<'both' | 'upper' | 'lower'>('both');
  const [viFilter, setViFilter] = useState<'all' | 'vowel' | 'consonant'>('all');

  const [selectedViIndex, setSelectedViIndex] = useState<number>(0);
  const [selectedEnIndex, setSelectedEnIndex] = useState<number>(0);

  // Blending state
  const [blendConsonant, setBlendConsonant] = useState<{ char: string; read: string }>(BLEND_CONSONANTS[6]); // M
  const [blendVowel, setBlendVowel] = useState<string>('e');
  const [blendTone, setBlendTone] = useState<ToneId>('nang'); // Mẹ

  // Listen & Find Game State
  const [gameLang, setGameLang] = useState<'vi' | 'en'>('vi');
  const [gameRound, setGameRound] = useState<number>(1);
  const [gameScore, setGameScore] = useState<number>(0);
  const [gameState, setGameState] = useState<'playing' | 'correct' | 'wrong'>('playing');
  const [pickedOption, setPickedOption] = useState<string | null>(null);

  const filteredViLetters = useMemo(() => {
    if (viFilter === 'vowel') return VIETNAMESE_ALPHABET.filter((l) => l.isVowel);
    if (viFilter === 'consonant') return VIETNAMESE_ALPHABET.filter((l) => !l.isVowel);
    return VIETNAMESE_ALPHABET;
  }, [viFilter]);

  const activeViLetter =
    VIETNAMESE_ALPHABET[selectedViIndex] || VIETNAMESE_ALPHABET[0];
  const activeEnLetter =
    ENGLISH_ALPHABET[selectedEnIndex] || ENGLISH_ALPHABET[0];

  // Adjust C + e/ê/i -> K rule automatically so kids always see grammatically accurate Vietnamese!
  const effectiveConsonantChar =
    blendConsonant.char === 'C' && (blendVowel === 'e' || blendVowel === 'ê' || blendVowel === 'i')
      ? 'K'
      : blendConsonant.char;
  const effectiveConsonantRead =
    effectiveConsonantChar === 'K' ? 'Ca' : blendConsonant.read;

  const baseSyllable = `${effectiveConsonantChar}${blendVowel}`;
  const tonedVowel = VOWEL_TONE_MAP[blendVowel]?.[blendTone] || blendVowel;
  const finalSyllable = `${effectiveConsonantChar}${tonedVowel}`;
  const activeToneObj = VIETNAMESE_TONES.find((t) => t.id === blendTone) || VIETNAMESE_TONES[0];

  const spokenBlendText =
    blendTone === 'ngang'
      ? `${effectiveConsonantRead}, ${blendVowel}, ${finalSyllable.toLowerCase()}! ${finalSyllable}!`
      : `${effectiveConsonantRead}, ${blendVowel}, ${baseSyllable.toLowerCase()}, ${activeToneObj.name.toLowerCase().replace('dấu ', '')}, ${finalSyllable.toLowerCase()}! ${finalSyllable}!`;

  // Generate deterministic game puzzle per round + lang
  const gamePuzzle = useMemo(() => {
    const seed = gameRound * 7919 + (gameLang === 'en' ? 31 : 17);
    if (gameLang === 'vi') {
      const targetIdx = seed % VIETNAMESE_ALPHABET.length;
      const target = VIETNAMESE_ALPHABET[targetIdx];
      const pool = new Set<number>([targetIdx]);
      let step = 1;
      while (pool.size < 6) {
        pool.add((targetIdx + step * 5) % VIETNAMESE_ALPHABET.length);
        step += 1;
      }
      const choices = Array.from(pool)
        .map((idx) => VIETNAMESE_ALPHABET[idx])
        .sort((a, b) => ((a.upper.charCodeAt(0) * seed) % 13) - ((b.upper.charCodeAt(0) * seed) % 13));
      return {
        lang: 'vi' as const,
        targetUpper: target.upper,
        promptLabel: `Bé hãy nghe và tìm chữ cái có trong từ "${target.word}" ${target.emoji}`,
        speakFn: () =>
          onSpeakVi(`Đố bé tìm chữ ${target.soundRead}, có trong từ ${target.word}!`),
        choices: choices.map((c) => ({
          key: c.upper,
          display: `${c.upper} ${c.lower}`,
          sub: `${c.emoji} ${c.word}`,
        })),
      };
    } else {
      const targetIdx = seed % ENGLISH_ALPHABET.length;
      const target = ENGLISH_ALPHABET[targetIdx];
      const pool = new Set<number>([targetIdx]);
      let step = 1;
      while (pool.size < 6) {
        pool.add((targetIdx + step * 5) % ENGLISH_ALPHABET.length);
        step += 1;
      }
      const choices = Array.from(pool)
        .map((idx) => ENGLISH_ALPHABET[idx])
        .sort((a, b) => ((a.upper.charCodeAt(0) * seed) % 11) - ((b.upper.charCodeAt(0) * seed) % 11));
      return {
        lang: 'en' as const,
        targetUpper: target.upper,
        promptLabel: `Listen to the native English voice and pick the right letter! (${target.word1.emoji} ${target.word1.vi})`,
        speakFn: () =>
          onSpeakEnglish(`Find the letter ${target.upper}! ${target.upper} is for ${target.word1.en}.`),
        choices: choices.map((c) => ({
          key: c.upper,
          display: `${c.upper} ${c.lower}`,
          sub: `${c.word1.emoji} ${c.word1.en}`,
        })),
      };
    }
  }, [gameLang, gameRound, onSpeakVi, onSpeakEnglish]);

  const handleSelectGameChoice = useCallback(
    (choiceKey: string) => {
      if (gameState === 'correct') return;
      setPickedOption(choiceKey);
      if (choiceKey === gamePuzzle.targetUpper) {
        setGameState('correct');
        setGameScore((s) => s + 1);
        onEarnReward(12, 1);
        if (soundFx) onPlayFeedbackTone('correct');
      } else {
        setGameState('wrong');
        if (soundFx) onPlayFeedbackTone('retry');
      }
    },
    [gameState, gamePuzzle.targetUpper, onEarnReward, soundFx, onPlayFeedbackTone]
  );

  const renderLetterGlyph = (upper: string, lower: string) => {
    if (caseDisplay === 'upper') return upper;
    if (caseDisplay === 'lower') return lower;
    return `${upper}${lower}`;
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation bar */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('vi')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all ${
              subTab === 'vi'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>29 Chữ Cái Tiếng Việt</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('blend')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all ${
              subTab === 'blend'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>6 Thanh Điệu &amp; Ghép Vần Đọc To</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('en')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all ${
              subTab === 'en'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>English Alphabet A–Z (Giọng Chuẩn Bản Xứ)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab('game');
              setGameState('playing');
              setPickedOption(null);
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all ${
              subTab === 'game'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Trò Chơi Nghe Âm Tìm Chữ</span>
          </button>
        </div>

        {(subTab === 'vi' || subTab === 'en') && (
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs self-start lg:self-auto">
            {[
              { id: 'both' as const, label: 'Aa' },
              { id: 'upper' as const, label: 'IN HOA' },
              { id: 'lower' as const, label: 'chữ thường' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setCaseDisplay(mode.id)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  caseDisplay === mode.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* SUBTAB 1: VIETNAMESE 29 LETTERS                                     */}
      {/* =================================================================== */}
      {subTab === 'vi' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Grid of 29 Letters */}
          <div className="lg:col-span-7 rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                {[
                  { id: 'all' as const, label: 'Tất cả (29)' },
                  { id: 'vowel' as const, label: '12 Nguyên âm' },
                  { id: 'consonant' as const, label: '17 Phụ âm' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setViFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                      viFilter === f.id
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <span className="text-[11px] text-slate-400">
                Chạm vào từng ô chữ để nghe thầy <strong className="text-amber-300">{viVoiceLabel}</strong> đọc to
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
              {filteredViLetters.map((item) => {
                const origIdx = VIETNAMESE_ALPHABET.findIndex((x) => x.upper === item.upper);
                const isSelected = origIdx === selectedViIndex;
                return (
                  <button
                    key={item.upper}
                    type="button"
                    onClick={() => {
                      setSelectedViIndex(origIdx);
                      onSpeakVi(`Chữ ${item.soundRead}. ${item.word}.`);
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 active:scale-95 ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/20 scale-[1.03]'
                        : item.isVowel
                        ? 'bg-slate-950 hover:bg-slate-800 border-amber-500/30 text-amber-200'
                        : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-100'
                    }`}
                  >
                    <span className="text-xl sm:text-2xl font-black tracking-tight">
                      {renderLetterGlyph(item.upper, item.lower)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold truncate max-w-full ${
                        isSelected ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {item.emoji} {item.word}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Spotlight Detail Card */}
          <div className="lg:col-span-5 rounded-3xl bg-slate-900 border border-emerald-500/40 p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <span
                className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                  activeViLetter.isVowel
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                }`}
              >
                {activeViLetter.isVowel ? 'Nguyên âm Tiếng Việt' : 'Phụ âm Tiếng Việt'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Chữ số {selectedViIndex + 1}/29
              </span>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
              <div>
                <div className="text-5xl sm:text-6xl font-black text-white tracking-wider">
                  {activeViLetter.upper} <span className="text-emerald-400">{activeViLetter.lower}</span>
                </div>
                <div className="text-xs text-slate-300 mt-2">
                  Âm đọc đánh vần: <strong className="text-amber-300">“{activeViLetter.soundRead}”</strong> • Tên chữ:{' '}
                  <strong className="text-sky-300">“{activeViLetter.nameRead}”</strong>
                </div>
              </div>
              <div className="text-6xl select-none">{activeViLetter.emoji}</div>
            </div>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-1">
                <div className="text-xs text-slate-400">Từ &amp; Câu mẫu cho bé:</div>
                <div className="text-base font-extrabold text-emerald-300">
                  {activeViLetter.emoji} {activeViLetter.word}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">“{activeViLetter.sentence}”</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-slate-200 leading-relaxed">
                ✏️ <strong className="text-indigo-300">Mẹo tập viết Lớp 1:</strong> {activeViLetter.tip}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  onSpeakVi(
                    `Chữ ${activeViLetter.soundRead}. Tên chữ cái là ${activeViLetter.nameRead}. Ví dụ: ${activeViLetter.word}.`
                  )
                }
                className="py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Volume2 className="w-4 h-4" />
                <span>Đọc Âm &amp; Từ Mẫu</span>
              </button>

              <button
                type="button"
                onClick={() => onSpeakVi(`${activeViLetter.word}. ${activeViLetter.sentence}`)}
                className="py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Nghe Câu Ví Dụ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUBTAB 2: 6 TONES & INTERACTIVE VIETNAMESE PHONICS BLENDER          */}
      {/* =================================================================== */}
      {subTab === 'blend' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5">
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                🎵 Bàn Ghép Vần &amp; 6 Thanh Điệu Tiếng Việt Cho Bé Tập Đánh Vần
              </h3>
              <p className="text-xs text-slate-400">
                Chọn <strong>Phụ âm đầu</strong> + <strong>Nguyên âm</strong> + <strong>Dấu thanh</strong> để xem chữ biến đổi và nghe đọc đánh vần chuẩn!
              </p>
            </div>

            {/* Step 1: Consonant */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-sky-300">1. Chọn Phụ âm đầu:</div>
              <div className="flex flex-wrap gap-2">
                {BLEND_CONSONANTS.map((c) => (
                  <button
                    key={c.char}
                    type="button"
                    onClick={() => setBlendConsonant(c)}
                    className={`w-11 h-11 rounded-xl font-black text-sm border transition-all ${
                      blendConsonant.char === c.char
                        ? 'bg-sky-500 text-slate-950 border-sky-300 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    {c.char}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Vowel */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-amber-300">2. Chọn Nguyên âm ghép vần:</div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(VOWEL_TONE_MAP).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setBlendVowel(v)}
                    className={`w-11 h-11 rounded-xl font-black text-base border transition-all ${
                      blendVowel === v
                        ? 'bg-amber-400 text-slate-950 border-amber-200 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: 6 Tones */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-emerald-300">3. Chọn Thanh điệu (6 dấu thanh):</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {VIETNAMESE_TONES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setBlendTone(t.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      blendTone === t.id
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-extrabold">
                      <span>{t.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 font-mono">
                        {t.mark}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Live Blended Output */}
          <div className="lg:col-span-5 rounded-3xl bg-slate-900 border border-amber-500/40 p-6 shadow-xl space-y-5">
            <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Bảng Đánh Vần Trực Tiếp
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3">
              <div className="text-xs text-slate-400 font-mono">
                {effectiveConsonantChar} + {blendVowel} + {activeToneObj.name} =
              </div>
              <div className="text-6xl font-black text-white tracking-wide py-2">
                {finalSyllable}
              </div>
              <div className="text-sm font-semibold text-emerald-300">
                “{spokenBlendText}”
              </div>
              {blendConsonant.char === 'C' && effectiveConsonantChar === 'K' && (
                <div className="text-[11px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-3 py-1.5">
                  💡 Quy tắc chính tả: Đứng trước <strong>e, ê, i</strong>, âm Cờ được viết bằng chữ <strong>K</strong>!
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onSpeakVi(spokenBlendText)}
              className="w-full py-3.5 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <Volume2 className="w-5 h-5" />
              <span>Nghe Đánh Vần To ({viVoiceLabel})</span>
            </button>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-xs font-bold text-slate-300">Nghe nhanh cả 6 thanh của vần “{baseSyllable}”:</div>
              <div className="grid grid-cols-6 gap-1.5">
                {VIETNAMESE_TONES.map((t) => {
                  const wordSyl = `${effectiveConsonantChar}${VOWEL_TONE_MAP[blendVowel]?.[t.id] || blendVowel}`;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setBlendTone(t.id);
                        onSpeakVi(wordSyl);
                      }}
                      className="py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sm font-extrabold text-white transition-colors"
                    >
                      {wordSyl}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUBTAB 3: ENGLISH ALPHABET A-Z (NATIVE VOICE + IPA PHONICS)         */}
      {/* =================================================================== */}
      {subTab === 'en' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* 26 Letters Grid */}
          <div className="lg:col-span-7 rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span>🇺🇸🇬🇧 Bảng Chữ Cái Tiếng Anh A–Z &amp; Phonics</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Giọng đọc Tiếng Anh chuẩn bản xứ: <strong className="text-sky-300">{enVoiceLabel}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  onSpeakEnglish(
                    'A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z! Awesome job!'
                  )
                }
                className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
              >
                <Volume2 className="w-4 h-4" />
                <span>Đọc chuẩn A → Z</span>
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
              {ENGLISH_ALPHABET.map((item, idx) => {
                const isSelected = idx === selectedEnIndex;
                return (
                  <button
                    key={item.upper}
                    type="button"
                    onClick={() => {
                      setSelectedEnIndex(idx);
                      onSpeakEnglish(`${item.upper}. ${item.word1.en}.`);
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 active:scale-95 ${
                      isSelected
                        ? 'bg-sky-500 text-slate-950 border-sky-300 shadow-lg shadow-sky-500/20 scale-[1.03]'
                        : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-100'
                    }`}
                  >
                    <span className="text-xl sm:text-2xl font-black">
                      {renderLetterGlyph(item.upper, item.lower)}
                    </span>
                    <span
                      className={`text-[10px] font-mono ${
                        isSelected ? 'text-slate-900 font-bold' : 'text-sky-300'
                      }`}
                    >
                      {item.ipaName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Native English Phonics Card */}
          <div className="lg:col-span-5 rounded-3xl bg-slate-900 border border-sky-500/40 p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-bold">
                Phát Âm Bản Xứ Chuẩn Quốc Tế (IPA)
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Letter {selectedEnIndex + 1}/26
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-5xl sm:text-6xl font-black text-white">
                  {activeEnLetter.upper} <span className="text-sky-400">{activeEnLetter.lower}</span>
                </div>
                <div className="text-xs text-slate-300 flex items-center gap-3 pt-1 font-mono">
                  <span>
                    Letter: <strong className="text-amber-300">{activeEnLetter.ipaName}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Phonics: <strong className="text-emerald-300">{activeEnLetter.phonicsIpa}</strong>
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onSpeakEnglish(
                      `${activeEnLetter.upper}. ${activeEnLetter.phonicsSpeak}. ${activeEnLetter.word1.en}, ${activeEnLetter.word2.en}.`
                    )
                  }
                  className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Nghe Chuẩn</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSpeakEnglish(
                      `${activeEnLetter.upper}. ${activeEnLetter.word1.en}. ${activeEnLetter.word2.en}.`,
                      { slow: true }
                    )
                  }
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5"
                >
                  <Turtle className="w-4 h-4" />
                  <span>Đọc Chậm</span>
                </button>
              </div>
            </div>

            {/* Two Illustrated Vocabulary Cards */}
            <div className="space-y-2.5">
              {[activeEnLetter.word1, activeEnLetter.word2].map((w) => (
                <div
                  key={w.en}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-3xl shrink-0">{w.emoji}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-extrabold text-white">{w.en}</span>
                        <span className="text-xs font-mono text-sky-300">{w.ipa}</span>
                      </div>
                      <div className="text-xs text-slate-400">{w.vi}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSpeakEnglish(w.en)}
                      className="px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 text-xs font-bold flex items-center gap-1"
                      title="Nghe giọng Tiếng Anh chuẩn bản xứ"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>US/UK</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSpeakVi(`Từ tiếng Anh này có nghĩa là: ${w.vi}`)}
                      className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold"
                      title="Nghe nghĩa Tiếng Việt"
                    >
                      VN
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUBTAB 4: AUDIO TREASURE MINI-GAME ("NGHE ÂM TÌM CHỮ")              */}
      {/* =================================================================== */}
      {subTab === 'game' && (
        <div className="max-w-3xl mx-auto rounded-3xl bg-slate-900 border border-rose-500/40 p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setGameLang('vi');
                  setGameState('playing');
                  setPickedOption(null);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  gameLang === 'vi'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-950 text-slate-300 border border-slate-800'
                }`}
              >
                🇻🇳 Đố Chữ Tiếng Việt
              </button>
              <button
                type="button"
                onClick={() => {
                  setGameLang('en');
                  setGameState('playing');
                  setPickedOption(null);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  gameLang === 'en'
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-slate-950 text-slate-300 border border-slate-800'
                }`}
              >
                🇺🇸 Đố Chữ Tiếng Anh Bản Xứ
              </button>
            </div>

            <div className="text-xs font-bold text-amber-300 tabular-nums">
              Vòng #{gameRound} • Đúng: {gameScore} câu
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="text-sm sm:text-base font-extrabold text-white">
                {gamePuzzle.promptLabel}
              </div>
              <p className="text-xs text-slate-400">
                Nhấn nút <strong>Nghe Đọc Âm</strong> rồi chạm vào ô chữ cái đúng bên dưới nhé!
              </p>
            </div>

            <button
              type="button"
              onClick={gamePuzzle.speakFn}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shrink-0 active:scale-95"
            >
              <Volume2 className="w-4 h-4 text-amber-300" />
              <span>Nghe Đọc Âm</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {gamePuzzle.choices.map((ch) => {
              const isPicked = pickedOption === ch.key;
              const isRight = ch.key === gamePuzzle.targetUpper;
              let cardCls =
                'bg-slate-950 hover:bg-slate-800 border-slate-800 text-white';
              if (gameState === 'correct' && isRight) {
                cardCls = 'bg-emerald-950/70 border-emerald-400 text-emerald-200 ring-2 ring-emerald-400';
              } else if (gameState === 'wrong' && isPicked && !isRight) {
                cardCls = 'bg-rose-950/60 border-rose-500 text-rose-200';
              }
              return (
                <button
                  key={ch.key}
                  type="button"
                  onClick={() => handleSelectGameChoice(ch.key)}
                  className={`p-5 rounded-2xl border text-center transition-all space-y-1.5 active:scale-95 ${cardCls}`}
                >
                  <div className="text-3xl font-black">{ch.display}</div>
                  {gameState === 'correct' && isRight && (
                    <div className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{ch.sub}</span>
                    </div>
                  )}
                  {gameState === 'wrong' && isPicked && !isRight && (
                    <div className="text-xs font-bold text-rose-300 flex items-center justify-center gap-1">
                      <XCircle className="w-4 h-4" />
                      <span>Thử lại nhé!</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {gameState === 'correct' && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-3">
              <div className="text-xs sm:text-sm font-extrabold text-emerald-300">
                🎉 Tuyệt vời! Bé đã tìm đúng chữ {gamePuzzle.targetUpper} (+12 XP &amp; +1 Sao)!
              </div>
              <button
                type="button"
                onClick={() => {
                  setGameRound((r) => r + 1);
                  setGameState('playing');
                  setPickedOption(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Câu đố tiếp theo</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
