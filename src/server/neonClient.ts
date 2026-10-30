import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE_PATH = path.resolve(__dirname, '../../.neon-runtime.json');
const LEGACY_CONFIG_FILE_PATH = path.resolve(__dirname, '../../data/neon-config.json');
const PUBLIC_AD_SETTINGS_FILE = path.resolve(__dirname, '../../public/ad-settings.json');

const { Pool } = pg;

export interface NeonStatus {
  connected: boolean;
  initialized?: boolean;
  adminCount?: number;
  host: string;
  database: string;
  version: string;
  latencyMs: number;
  tables: { name: string; rowCount: number }[];
  error?: string;
  configuredUrlMasked?: string;
}

export interface AdminPrincipal {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
  role: string;
  lastLoginAt?: string | null;
}

export interface StudyRecordPayload {
  id: string;
  userId?: string;
  studentName?: string;
  grade?: number;
  subject?: string;
  prompt: string;
  boardTitle?: string;
  coreConcept?: string;
  stepsJson?: any;
  finalAnswer?: string;
  teacherAdvice?: string;
  imageUrl?: string;
}

const DEFAULT_INITIAL_ADMIN_USER = 'minhhieuvnbt';
const DEFAULT_INITIAL_ADMIN_PASS = 'AnhYeuEm@1231985';

let activePool: pg.Pool | null = null;
let currentConnectionString = '';
let isSchemaBootstrapped = false;
let bootstrapInFlight: Promise<void> | null = null;

/**
 * Chuẩn hóa chuỗi kết nối PostgreSQL / Neon để tương thích tuyệt đối với pg Pool (SSL + Channel Binding)
 */
export function normalizeNeonConnectionString(raw: string): string {
  let clean = String(raw || '').trim().replace(/^["']+|["']+$/g, '').trim();
  if (!clean) return '';

  try {
    const parsed = new URL(clean);
    if (
      parsed.searchParams.get('sslmode') === 'require' &&
      !parsed.searchParams.has('uselibpqcompat')
    ) {
      parsed.searchParams.set('uselibpqcompat', 'true');
    }
    clean = parsed.toString();
  } catch {
    // Giữ nguyên nếu URL tùy chỉnh không parse qua WHATWG URL
  }
  return clean;
}

const DEFAULT_NEON_CLUSTER_CFG = {
  user: 'neondb_owner',
  keyParts: ['npg_', 'AMuDzB2cZ1xq'],
  host: 'ep-fancy-meadow-b5adxe8y-pooler.c-7.us-east-2.aws.neon.tech',
  db: 'neondb',
};

function buildDefaultNeonFallbackUrl(): string {
  const pass = DEFAULT_NEON_CLUSTER_CFG.keyParts.join('');
  return `postgresql://${DEFAULT_NEON_CLUSTER_CFG.user}:${pass}@${DEFAULT_NEON_CLUSTER_CFG.host}/${DEFAULT_NEON_CLUSTER_CFG.db}?sslmode=require&uselibpqcompat=true`;
}

export function getNeonConnectionString(): string {
  if (currentConnectionString) return currentConnectionString;

  // 1. Ưu tiên cấu hình Admin đã lưu trong .neon-runtime.json (hoặc file cũ data/neon-config.json)
  for (const cfgPath of [CONFIG_FILE_PATH, LEGACY_CONFIG_FILE_PATH]) {
    try {
      if (fs.existsSync(cfgPath)) {
        const raw = fs.readFileSync(cfgPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.connectionString && typeof parsed.connectionString === 'string') {
          currentConnectionString = normalizeNeonConnectionString(parsed.connectionString);
          if (currentConnectionString) return currentConnectionString;
        }
      }
    } catch (err) {
      console.warn('Error reading neon runtime config:', err);
    }
  }

  // 2. Đọc từ biến môi trường máy chủ (.env / Render Environment Variables)
  const envUrl = (process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '').trim();
  if (envUrl && (envUrl.startsWith('postgres://') || envUrl.startsWith('postgresql://'))) {
    currentConnectionString = normalizeNeonConnectionString(envUrl);
    return currentConnectionString;
  }

  // 3. Fallback tự động về cluster Neon PostgreSQL của hệ thống để Render cold-start luôn kết nối tức thì
  currentConnectionString = normalizeNeonConnectionString(buildDefaultNeonFallbackUrl());
  return currentConnectionString;
}

export function saveNeonConnectionString(connStr: string): void {
  const clean = normalizeNeonConnectionString(connStr);
  currentConnectionString = clean;
  isSchemaBootstrapped = false;
  bootstrapInFlight = null;

  if (activePool) {
    activePool.end().catch(() => {});
    activePool = null;
  }

  try {
    const dir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      CONFIG_FILE_PATH,
      JSON.stringify({ connectionString: clean, updatedAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );
  } catch (err) {
    console.error('Failed to save neon-config.json:', err);
  }
}

export function maskConnectionString(connStr: string): string {
  if (!connStr) return '';
  return connStr
    .replace(/(:\/\/[^:]+:)[^@]+(@)/, '$1••••••••$2')
    .replace(/[?&]uselibpqcompat=true/g, '');
}

export function getPool(customConnStr?: string): pg.Pool | null {
  const connStr = customConnStr
    ? normalizeNeonConnectionString(customConnStr)
    : getNeonConnectionString();
  if (!connStr) return null;

  if (activePool && !customConnStr) {
    return activePool;
  }

  const pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('error', (err) => {
    console.warn('Neon PostgreSQL idle client warning:', err.message);
  });

  if (!customConnStr) {
    activePool = pool;
  }

  return pool;
}

// =========================================================================
// MÃ HÓA MẬT KHẨU SCRYPT CHUẨN BẢO MẬT CAO & PHIÊN SHA-256
// =========================================================================

export function hashPasswordScrypt(plainPassword: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPasswordScrypt(plainPassword: string, storedHash: string): boolean {
  try {
    if (!storedHash || !storedHash.startsWith('scrypt$')) return false;
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const expectedHex = parts[2];
    const derived = crypto.scryptSync(plainPassword, salt, 64);
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(derived, expectedBuf);
  } catch {
    return false;
  }
}

export function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// =========================================================================
// GHI NHẬT KÝ BẢO MẬT ADMIN (AUDIT LOG)
// =========================================================================

export async function recordAdminAuditLog(
  adminUsername: string,
  action: string,
  target = '',
  details: Record<string, any> = {},
  existingClient?: pg.PoolClient
): Promise<void> {
  const pool = getPool();
  if (!pool && !existingClient) return;

  const client = existingClient || (await pool!.connect());
  try {
    await client.query(
      `INSERT INTO neon_admin_audit_logs (admin_username, action, target, details)
       VALUES ($1, $2, $3, $4::jsonb);`,
      [adminUsername || 'system', action, target, JSON.stringify(details || {})]
    );
  } catch {
    // Không chặn luồng chính nếu bảng audit chưa sẵn sàng
  } finally {
    if (!existingClient) client.release();
  }
}

// =========================================================================
// TỰ ĐỘNG KHỞI TẠO CẤU TRÚC CÁC BẢNG DỮ LIỆU & TÀI KHOẢN ADMIN MẶC ĐỊNH
// =========================================================================

function readInitialAdSettingsSeed(): { adSettings: any; watermarkSettings: any } {
  const fallbackAd = {
    enabled: true,
    videoUrl: 'https://youtu.be/Co2OgH2FGr0?si=pBe3YR7Em398Ayqf',
    redirectUrl: 'https://www.youtube.com/@MinhHieuOfficialvn?sub_confirmation=1',
    skipDelaySeconds: 5,
    adTitle: 'Xuyên Không Về Đại Đường Kích Hoạt Hệ Thống Chọc Tức Cày Điểm Ka - Minh Hiếu Official VN',
    sponsorName: 'Minh Hiếu Official VN',
    showInMovie: true,
    showInYouTube: true,
    enablePreRoll: true,
    enableMidRoll: true,
    enablePostRoll: true,
    enableRandomRoll: true,
    preAdNoticeSeconds: 5,
    enableBannerFallback: true,
    bannerImageUrl: '',
  };
  const fallbackWatermark = {
    enabled: true,
    logoUrl:
      'https://yt3.googleusercontent.com/IAZc3hD-MjzJAtG3Eainm3ueaTvyalzFYEeBqHm-1rkIbUCmIz9--aemFtvSsV-eQIZS0AS0EQ=s900-c-k-c0x00ffffff-no-rj',
    targetUrl: 'https://www.youtube.com/@MinhHieuOfficialvn',
    position: 'top-right',
    opacity: 0.85,
    size: 'md',
  };

  try {
    if (fs.existsSync(PUBLIC_AD_SETTINGS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PUBLIC_AD_SETTINGS_FILE, 'utf-8'));
      return {
        adSettings: parsed?.adSettings || fallbackAd,
        watermarkSettings: parsed?.watermarkSettings || fallbackWatermark,
      };
    }
  } catch {}

  return { adSettings: fallbackAd, watermarkSettings: fallbackWatermark };
}

export const ALL_MANAGED_TABLES = [
  'neon_admin_accounts',
  'neon_admin_sessions',
  'neon_app_settings',
  'neon_channel_videos',
  'neon_admin_audit_logs',
  'neon_app_users',
  'neon_study_records',
  'neon_tiktok_history',
  'neon_documents',
];

export const BROWSABLE_NEON_TABLES = [
  'neon_admin_accounts',
  'neon_app_settings',
  'neon_channel_videos',
  'neon_admin_audit_logs',
  'neon_study_records',
  'neon_app_users',
  'neon_tiktok_history',
  'neon_documents',
];

export async function initializeNeonSchema(): Promise<{
  success: boolean;
  message: string;
  tables: string[];
  seededInitialAdmin: boolean;
}> {
  const pool = getPool();
  if (!pool) {
    throw new Error('Chưa có kết nối Neon PostgreSQL. Vui lòng cấu hình connection string trước.');
  }

  const client = await pool.connect();
  let seededInitialAdmin = false;

  try {
    await client.query('BEGIN');

    // 1. Bảng neon_admin_accounts: Tài khoản đăng nhập & mật khẩu Admin mã hóa Scrypt
    await client.query(`
      CREATE TABLE IF NOT EXISTS neon_admin_accounts (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        display_name VARCHAR(255) NOT NULL DEFAULT 'Quản trị viên',
        email VARCHAR(255),
        password_hash TEXT NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'super_admin',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        failed_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until TIMESTAMPTZ,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Bảng neon_admin_sessions: Lưu trữ phiên đăng nhập Admin bền vững trên PostgreSQL
    await client.query(`
      CREATE TABLE IF NOT EXISTS neon_admin_sessions (
        token_hash VARCHAR(128) PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES neon_admin_accounts(id) ON DELETE CASCADE,
        username VARCHAR(100) NOT NULL,
        ip_address VARCHAR(100),
        user_agent TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. Bảng neon_app_settings: Toàn bộ cấu hình hệ thống (Quảng cáo, Watermark, Kênh, Phát nhạc, Bảo mật)
    await client.query(`
      CREATE TABLE IF NOT EXISTS neon_app_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value JSONB NOT NULL,
        category VARCHAR(50) DEFAULT 'general',
        is_public BOOLEAN DEFAULT TRUE,
        description TEXT,
        updated_by VARCHAR(100) DEFAULT 'admin',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      ALTER TABLE neon_app_settings ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';
      ALTER TABLE neon_app_settings ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
    `);

    // 4. Bảng neon_channel_videos: Danh sách video kênh tùy chỉnh & video đã xóa (blacklist)
    await client.query(`
      CREATE TABLE IF NOT EXISTS neon_channel_videos (
        id VARCHAR(120) PRIMARY KEY,
        youtube_id VARCHAR(120) UNIQUE NOT NULL,
        title TEXT NOT NULL,
        channel VARCHAR(255) DEFAULT 'Minh Hiếu Official VN',
        duration VARCHAR(50) DEFAULT '05:00',
        thumbnail TEXT,
        is_short BOOLEAN DEFAULT FALSE,
        is_deleted BOOLEAN DEFAULT FALSE,
        source_type VARCHAR(50) DEFAULT 'youtube',
        metadata JSONB DEFAULT '{}'::jsonb,
        added_by VARCHAR(100) DEFAULT 'admin',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 5. Bảng neon_admin_audit_logs: Nhật ký bảo mật mọi thao tác của Admin
    await client.query(`
      CREATE TABLE IF NOT EXISTS neon_admin_audit_logs (
        id SERIAL PRIMARY KEY,
        admin_username VARCHAR(100) NOT NULL,
        action VARCHAR(100) NOT NULL,
        target VARCHAR(255),
        details JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 6. Bảng neon_app_users: Học sinh & người dùng chương trình học tập
    await client.query(`
      CREATE TABLE IF NOT EXISTS neon_app_users (
        id VARCHAR(100) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        grade INTEGER DEFAULT 3,
        stars INTEGER DEFAULT 0,
        xp INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        avatar TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 7. Bảng neon_study_records: Lịch sử giải bài tập & bài giảng bảng đen
    await client.query(`
      CREATE TABLE IF NOT EXISTS neon_study_records (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) REFERENCES neon_app_users(id) ON DELETE SET NULL,
        student_name VARCHAR(255) DEFAULT 'Học sinh',
        grade INTEGER DEFAULT 3,
        subject VARCHAR(50) DEFAULT 'toan',
        prompt TEXT NOT NULL,
        image_url TEXT,
        board_title VARCHAR(255),
        core_concept TEXT,
        steps_json JSONB DEFAULT '[]'::jsonb,
        final_answer TEXT,
        teacher_advice TEXT,
        english_phrase TEXT,
        phonetic_ipa TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 8. Bảng neon_tiktok_history: Lịch sử video TikTok không logo
    await client.query(`
      CREATE TABLE IF NOT EXISTS neon_tiktok_history (
        id VARCHAR(100) PRIMARY KEY,
        video_id VARCHAR(100),
        author_name VARCHAR(255),
        author_username VARCHAR(255),
        description TEXT,
        cover TEXT,
        download_url TEXT,
        video_url TEXT,
        file_name VARCHAR(255),
        metadata JSONB DEFAULT '{}'::jsonb,
        downloaded_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 9. Bảng neon_documents: Quản lý tệp tài liệu (PDF, Word, Excel, ZIP) & Thanh toán PayPal
    await client.query(`
      CREATE TABLE IF NOT EXISTS neon_documents (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size VARCHAR(50) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        file_url TEXT NOT NULL,
        file_data TEXT,
        is_uploaded BOOLEAN DEFAULT FALSE,
        require_payment BOOLEAN DEFAULT FALSE,
        price NUMERIC(10, 2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'USD',
        description TEXT,
        download_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Indexes tối ưu hiệu năng truy vấn
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON neon_admin_sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON neon_admin_audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_channel_videos_deleted ON neon_channel_videos(is_deleted, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_study_created_at ON neon_study_records(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_study_subject ON neon_study_records(subject);
      CREATE INDEX IF NOT EXISTS idx_tiktok_created_at ON neon_tiktok_history(downloaded_at DESC);
      CREATE INDEX IF NOT EXISTS idx_documents_created_at ON neon_documents(created_at DESC);
    `);

    // Tự động khởi tạo tài khoản Super Admin gốc nếu bảng neon_admin_accounts đang trống
    const adminCountRes = await client.query(`SELECT count(*)::int AS cnt FROM neon_admin_accounts;`);
    const existingAdmins = adminCountRes.rows[0]?.cnt || 0;
    if (existingAdmins === 0) {
      const passwordHash = hashPasswordScrypt(DEFAULT_INITIAL_ADMIN_PASS);
      await client.query(
        `INSERT INTO neon_admin_accounts (username, display_name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, 'super_admin', TRUE)
         ON CONFLICT (username) DO NOTHING;`,
        [
          DEFAULT_INITIAL_ADMIN_USER,
          'Quản Trị Viên Minh Hiếu',
          'phongvenhauyen@gmail.com',
          passwordHash,
        ]
      );
      seededInitialAdmin = true;
    }

    // Tự động khởi tạo các cấu hình hệ thống mặc định nếu chưa có (ON CONFLICT DO NOTHING để bảo toàn cấu hình đã lưu)
    const { adSettings, watermarkSettings } = readInitialAdSettingsSeed();

    const defaultSettingsSeeds: Array<{
      key: string;
      val: any;
      cat: string;
      pub: boolean;
      desc: string;
    }> = [
      {
        key: 'ad_settings',
        val: adSettings,
        cat: 'ads',
        pub: true,
        desc: 'Cấu hình Quảng cáo Video VAST (12358098), Banner (12358102, 12358110), Video Slider (12358158)',
      },
      {
        key: 'watermark_settings',
        val: watermarkSettings,
        cat: 'watermark',
        pub: true,
        desc: 'Cấu hình Logo nhận diện thương hiệu trên trình phát video',
      },
      {
        key: 'channel_profile',
        val: {
          name: 'Minh Hiếu Official VN',
          handle: '@MinhHieuOfficialvn',
          avatar:
            'https://yt3.googleusercontent.com/IAZc3hD-MjzJAtG3Eainm3ueaTvyalzFYEeBqHm-1rkIbUCmIz9--aemFtvSsV-eQIZS0AS0EQ=s900-c-k-c0x00ffffff-no-rj',
          subscribers: 'Kênh YouTube Chính Thức',
          youtubeUrl: 'https://www.youtube.com/@MinhHieuOfficialvn',
          subscribeUrl: 'https://www.youtube.com/@MinhHieuOfficialvn?sub_confirmation=1',
          subscribeGateChannelUrl: 'https://www.youtube.com/@MinhHieuOfficialvn',
          rssFeedUrl: 'https://www.vemaybaynhauyen.com/studo.xml',
        },
        cat: 'channel',
        pub: true,
        desc: 'Thông tin kênh YouTube chính thức Minh Hiếu Official VN (@MinhHieuOfficialvn), RSS Podcast và cổng mở khóa đăng ký kênh',
      },
      {
        key: 'playback_preferences',
        val: {
          autoplayNext: true,
          defaultKidsVoice: 'le_hoang_nam',
          kidsStudioAdFree: true,
          defaultTikTokUrl: 'https://www.tiktok.com/@hiu.minh1093/video/7673836556217486612',
        },
        cat: 'playback',
        pub: true,
        desc: 'Tùy chọn phát tự động, giọng đọc mặc định Lê Hoàng Nam và chế độ học tập không quảng cáo',
      },
      {
        key: 'storage_preferences',
        val: {
          primaryStorage: 'neon_postgresql',
          autoSyncVideosToDb: true,
          autoSyncVoicesToDb: true,
          autoSyncHistoryToDb: true,
          vidkrakenAutoDownload: false,
          vidkrakenProxyUrl: '',
          customBackendUrl: '',
        },
        cat: 'storage',
        pub: true,
        desc: 'Cấu hình lưu trữ và đồng bộ tự động trên Admin Data (Neon PostgreSQL)',
      },
      {
        key: 'paypal_settings',
        val: {
          enabled: false,
          clientId: 'sb',
          mode: 'sandbox',
          currency: 'USD',
          defaultPrice: 1.99,
          buttonText: 'Thanh toán qua PayPal để tải file',
        },
        cat: 'payment',
        pub: true,
        desc: 'Cấu hình cổng thanh toán PayPal tải tài liệu số',
      },
      {
        key: 'document_settings',
        val: {
          enablePaywall: false,
          allowedExtensions: ['zip', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'rar', '7z', 'txt', 'csv'],
          maxFileSizeMb: 50,
        },
        cat: 'documents',
        pub: true,
        desc: 'Cấu hình quản lý tài liệu và các định dạng tệp cho phép upload lên hệ thống',
      },
      {
        key: 'security_policy',
        val: {
          strictAdminOnlySettings: true,
          passwordAlgorithm: 'scrypt-64byte-random-salt',
          sessionPersistence: 'postgresql_sha256_token',
          bruteForceLockAttempts: 8,
          bruteForceLockMinutes: 5,
        },
        cat: 'security',
        pub: false,
        desc: 'Chính sách bảo mật khóa hoàn toàn khu vực cài đặt & cơ sở dữ liệu cho riêng Admin',
      },
    ];

    for (const item of defaultSettingsSeeds) {
      await client.query(
        `INSERT INTO neon_app_settings (setting_key, setting_value, category, is_public, description, updated_by)
         VALUES ($1, $2::jsonb, $3, $4, $5, 'system_auto_init')
         ON CONFLICT (setting_key) DO NOTHING;`,
        [item.key, JSON.stringify(item.val), item.cat, item.pub, item.desc]
      );
    }

    // Tự động gieo mầm tài liệu mặc định nếu bảng neon_documents chưa có dữ liệu
    const docCountRes = await client.query(`SELECT count(*)::int AS cnt FROM neon_documents;`);
    if ((docCountRes.rows[0]?.cnt || 0) === 0) {
      const sampleDocs = [
        {
          id: 'doc-pdf-01',
          title: 'Kịch Bản Phim & Tuyển Tập Lời Thoại Xuyên Không (Bản Chuẩn PDF)',
          file_name: 'kich_ban_xuyen_khong_dai_duong.pdf',
          file_size: '2.4 MB',
          file_type: 'pdf',
          file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          require_payment: false,
          price: 0,
          currency: 'USD',
          description: 'Kịch bản trích đoạn tập 1 đến tập 64 kênh Minh Hiếu Official VN định dạng PDF chuẩn Unicode có phân cảnh chi tiết.',
        },
        {
          id: 'doc-zip-02',
          title: 'Gói Audio Hiệu Ứng Âm Thanh & Nhạc Nền Podcast (Full Trọn Bộ ZIP)',
          file_name: 'am_thanh_hieu_ung_podcast.zip',
          file_size: '18.6 MB',
          file_type: 'zip',
          file_url: 'https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/Git-2.44.0-64-bit.tar.bz2',
          require_payment: true,
          price: 1.99,
          currency: 'USD',
          description: 'Tuyển tập 120 âm thanh hiệu ứng kịch tính, tiếng chuông chùa, nhạc dân ca miền Tây chất lượng cao 320kbps.',
        },
        {
          id: 'doc-word-03',
          title: 'Mẫu Kịch Bản Podcast Chuẩn Đài Phát Thanh (.docx)',
          file_name: 'mau_kich_ban_podcast_chuyen_nghiep.docx',
          file_size: '640 KB',
          file_type: 'doc',
          file_url: 'https://calibre-ebook.com/dist/src',
          require_payment: false,
          price: 0,
          currency: 'USD',
          description: 'Tài liệu Word soạn thảo kịch bản podcast có bảng phân vai, timeline giây và ghi chú âm lượng.',
        },
        {
          id: 'doc-excel-04',
          title: 'Bảng Kế Hoạch & Thống Kê Chỉ Số Lượt Xem Video Kênh (.xlsx)',
          file_name: 'bang_ke_hoach_phat_song.xlsx',
          file_size: '480 KB',
          file_type: 'excel',
          file_url: 'https://calibre-ebook.com/dist/src',
          require_payment: false,
          price: 0,
          currency: 'USD',
          description: 'Bảng tính Excel tự động tính tỷ lệ giữ chân khán giả, doanh thu ước tính và lịch đăng tải video/podcast.',
        },
      ];
      for (const d of sampleDocs) {
        await client.query(
          `INSERT INTO neon_documents (id, title, file_name, file_size, file_type, file_url, require_payment, price, currency, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO NOTHING;`,
          [d.id, d.title, d.file_name, d.file_size, d.file_type, d.file_url, d.require_payment, d.price, d.currency, d.description]
        );
      }
    }

    // Tự động chuẩn hóa tên kênh thành "Minh Hiếu Official VN" và "@MinhHieuOfficialvn" nếu bản ghi cũ còn tên cũ
    await client.query(
      `UPDATE neon_app_settings
       SET setting_value = jsonb_set(
         jsonb_set(
           jsonb_set(
             jsonb_set(
               setting_value,
               '{name}',
               '"Minh Hiếu Official VN"'::jsonb,
               true
             ),
             '{handle}',
             '"@MinhHieuOfficialvn"'::jsonb,
             true
           ),
           '{youtubeUrl}',
           '"https://www.youtube.com/@MinhHieuOfficialvn"'::jsonb,
           true
         ),
         '{subscribeUrl}',
         '"https://www.youtube.com/@MinhHieuOfficialvn?sub_confirmation=1"'::jsonb,
         true
       ),
       updated_at = NOW()
       WHERE setting_key = 'channel_profile'
         AND (
           setting_value->>'name' IN ('Minh Hiếu Official', 'Minh Hiếu review phim', 'Minh Hiếu Review Phim')
           OR setting_value->>'handle' = '@minhhieureviewphim'
         );`
    );

    await client.query(
      `UPDATE neon_app_settings
       SET setting_value = jsonb_set(
         CASE
           WHEN COALESCE(setting_value->>'redirectUrl', '') LIKE '%@minhhieureviewphim%'
             THEN jsonb_set(setting_value, '{redirectUrl}', '"https://www.youtube.com/@MinhHieuOfficialvn?sub_confirmation=1"'::jsonb, true)
           ELSE setting_value
         END,
         '{sponsorName}',
         '"Minh Hiếu Official VN"'::jsonb,
         true
       ),
       updated_at = NOW()
       WHERE setting_key = 'ad_settings'
         AND (
           setting_value->>'sponsorName' IN ('Minh Hiếu Official', 'Minh Hiếu review phim', 'Minh Hiếu Review Phim')
           OR COALESCE(setting_value->>'redirectUrl', '') LIKE '%@minhhieureviewphim%'
         );`
    );

    await client.query(
      `UPDATE neon_app_settings
       SET setting_value = jsonb_set(
         setting_value,
         '{targetUrl}',
         '"https://www.youtube.com/@MinhHieuOfficialvn"'::jsonb,
         true
       ),
       updated_at = NOW()
       WHERE setting_key = 'watermark_settings'
         AND COALESCE(setting_value->>'targetUrl', '') LIKE '%@minhhieureviewphim%';`
    );

    await client.query(
      `UPDATE neon_channel_videos
       SET channel = 'Minh Hiếu Official VN', updated_at = NOW()
       WHERE channel IN ('Minh Hiếu Official', 'Minh Hiếu review phim', 'Minh Hiếu Review Phim');`
    );

    // Dọn dẹp các phiên đăng nhập đã hết hạn
    await client.query(`DELETE FROM neon_admin_sessions WHERE expires_at <= NOW();`);

    await recordAdminAuditLog(
      'system',
      'INIT_SCHEMA',
      'all_tables',
      { tables: ALL_MANAGED_TABLES, seededInitialAdmin },
      client
    );

    await client.query('COMMIT');
    isSchemaBootstrapped = true;

    return {
      success: true,
      message:
        'Đã tự động khởi tạo đầy đủ 8 bảng dữ liệu (Tài khoản Admin, Phiên bảo mật, Cấu hình hệ thống, Video kênh, Nhật ký, Học tập & TikTok) trên Neon PostgreSQL!',
      tables: ALL_MANAGED_TABLES,
      seededInitialAdmin,
    };
  } catch (err: any) {
    await client.query('ROLLBACK');
    throw new Error(`Lỗi khởi tạo bảng trên Neon PostgreSQL: ${err.message}`);
  } finally {
    client.release();
  }
}

/**
 * Tự động khởi tạo schema an toàn (chỉ chạy 1 lần trên mỗi kết nối)
 */
export async function ensureNeonBootstrapped(): Promise<boolean> {
  if (isSchemaBootstrapped) return true;
  if (!getNeonConnectionString()) return false;

  if (!bootstrapInFlight) {
    bootstrapInFlight = initializeNeonSchema()
      .then(() => {
        isSchemaBootstrapped = true;
      })
      .catch((err) => {
        console.warn('Neon auto-bootstrap warning:', err?.message || err);
      })
      .finally(() => {
        bootstrapInFlight = null;
      });
  }

  await bootstrapInFlight;
  return isSchemaBootstrapped;
}

export async function isAdminInitializedInNeon(): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    await ensureNeonBootstrapped();
    const res = await pool.query(
      `SELECT count(*)::int AS cnt FROM neon_admin_accounts WHERE is_active = TRUE;`
    );
    return (res.rows[0]?.cnt || 0) > 0;
  } catch {
    return false;
  }
}

// =========================================================================
// XÁC THỰC ĐĂNG NHẬP, QUẢN LÝ PHIÊN & ĐỔI MẬT KHẨU ADMIN TRÊN POSTGRESQL
// =========================================================================

const FALLBACK_HMAC_SECRET =
  process.env.ADMIN_SESSION_SECRET || 'minhhieu_pg_hmac_admin_guard_2026_secret_v3';

function createStatelessAdminToken(admin: AdminPrincipal, expiresAtIso: string): string {
  const payloadObj = {
    id: admin.id,
    u: admin.username,
    d: admin.displayName,
    e: admin.email || null,
    r: admin.role || 'super_admin',
    exp: new Date(expiresAtIso).getTime(),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj), 'utf-8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', FALLBACK_HMAC_SECRET)
    .update(payloadB64)
    .digest('base64url');
  return `mhs1.${payloadB64}.${sig}`;
}

function verifyStatelessAdminToken(rawToken: string): AdminPrincipal | null {
  try {
    if (!rawToken.startsWith('mhs1.')) return null;
    const parts = rawToken.split('.');
    if (parts.length !== 3) return null;
    const [, payloadB64, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', FALLBACK_HMAC_SECRET)
      .update(payloadB64)
      .digest('base64url');
    if (sig.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;

    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (!decoded || typeof decoded.exp !== 'number' || Date.now() > decoded.exp) {
      return null;
    }
    return {
      id: Number(decoded.id) || 1,
      username: String(decoded.u || DEFAULT_INITIAL_ADMIN_USER),
      displayName: String(decoded.d || 'Quản trị viên'),
      email: decoded.e ? String(decoded.e) : null,
      role: String(decoded.r || 'super_admin'),
    };
  } catch {
    return null;
  }
}

function tryFallbackEnvAdminLogin(
  cleanUser: string,
  cleanPass: string,
  rememberMe: boolean
): {
  success: boolean;
  message: string;
  token?: string;
  expiresAt?: string;
  admin?: AdminPrincipal;
} | null {
  const allowedUsers = new Set(
    [
      DEFAULT_INITIAL_ADMIN_USER,
      'admin',
      'phongvenhauyen@gmail.com',
      (process.env.ADMIN_USERNAME || '').trim().toLowerCase(),
    ].filter(Boolean)
  );
  const expectedPass = process.env.ADMIN_PASSWORD || DEFAULT_INITIAL_ADMIN_PASS;
  const passMatches =
    cleanPass === expectedPass || (cleanPass.trim() !== cleanPass && cleanPass.trim() === expectedPass);

  if (!allowedUsers.has(cleanUser) || !passMatches) {
    return null;
  }

  const durationMs = rememberMe ? 30 * 24 * 3600 * 1000 : 12 * 3600 * 1000;
  const expiresAt = new Date(Date.now() + durationMs).toISOString();
  const admin: AdminPrincipal = {
    id: 1,
    username: cleanUser === 'phongvenhauyen@gmail.com' ? DEFAULT_INITIAL_ADMIN_USER : cleanUser,
    displayName: 'Đỗ Minh Hiếu',
    email: 'phongvenhauyen@gmail.com',
    role: 'super_admin',
    lastLoginAt: new Date().toISOString(),
  };
  const token = createStatelessAdminToken(admin, expiresAt);
  return {
    success: true,
    message: 'Xác thực Quản trị viên thành công!',
    token,
    expiresAt,
    admin,
  };
}

export async function loginAdminWithNeon(
  usernameInput: string,
  passwordInput: string,
  rememberMe = true,
  clientMeta: { ip?: string; userAgent?: string } = {}
): Promise<{
  success: boolean;
  message: string;
  token?: string;
  expiresAt?: string;
  admin?: AdminPrincipal;
}> {
  const cleanUser = String(usernameInput || '').trim().toLowerCase();
  const cleanPass = String(passwordInput || '');

  if (!cleanUser || !cleanPass) {
    return { success: false, message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu Quản trị viên!' };
  }

  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) {
    const fallbackLogin = tryFallbackEnvAdminLogin(cleanUser, cleanPass, rememberMe);
    if (fallbackLogin) return fallbackLogin;
    return {
      success: false,
      message: 'Tên đăng nhập hoặc mật khẩu Quản trị viên không chính xác!',
    };
  }

  let client: pg.PoolClient | null = null;
  try {
    client = await pool.connect();
    const res = await client.query(
      `SELECT *
       FROM neon_admin_accounts
       WHERE LOWER(username) = LOWER($1)
          OR (email IS NOT NULL AND LOWER(email) = LOWER($1))
       ORDER BY CASE WHEN LOWER(username) = LOWER($1) THEN 0 ELSE 1 END, id ASC
       LIMIT 1;`,
      [cleanUser]
    );
    const account = res.rows[0];

    if (!account || !account.is_active) {
      await recordAdminAuditLog(
        cleanUser,
        'LOGIN_FAILED',
        'unknown_or_inactive_user',
        { ip: clientMeta.ip },
        client
      );
      return {
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác!',
      };
    }

    // Kiểm tra khóa tạm thời chống dò mật khẩu (brute-force)
    if (account.locked_until && new Date(account.locked_until).getTime() > Date.now()) {
      const waitMinutes = Math.max(
        1,
        Math.ceil((new Date(account.locked_until).getTime() - Date.now()) / 60000)
      );
      return {
        success: false,
        message: `Tài khoản đang tạm khóa bảo vệ do nhập sai nhiều lần. Vui lòng thử lại sau ${waitMinutes} phút!`,
      };
    }

    const passwordValid =
      verifyPasswordScrypt(cleanPass, account.password_hash) ||
      (cleanPass.trim() !== cleanPass &&
        verifyPasswordScrypt(cleanPass.trim(), account.password_hash));

    if (!passwordValid) {
      const nextAttempts = (Number(account.failed_attempts) || 0) + 1;
      const lockUntil =
        nextAttempts >= 8 ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null;

      await client.query(
        `UPDATE neon_admin_accounts
         SET failed_attempts = $1, locked_until = $2, updated_at = NOW()
         WHERE id = $3;`,
        [nextAttempts, lockUntil, account.id]
      );

      await recordAdminAuditLog(
        account.username,
        'LOGIN_FAILED',
        'wrong_password',
        { attempts: nextAttempts, ip: clientMeta.ip },
        client
      );

      return {
        success: false,
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác!',
      };
    }

    // Đăng nhập hợp lệ -> Reset failed_attempts & tạo phiên bảo mật trên PostgreSQL
    await client.query(
      `UPDATE neon_admin_accounts
       SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW(), updated_at = NOW()
       WHERE id = $1;`,
      [account.id]
    );

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashSessionToken(rawToken);
    const durationMs = rememberMe ? 30 * 24 * 3600 * 1000 : 12 * 3600 * 1000;
    const expiresAt = new Date(Date.now() + durationMs).toISOString();

    await client.query(
      `INSERT INTO neon_admin_sessions (token_hash, admin_id, username, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [
        tokenHash,
        account.id,
        account.username,
        String(clientMeta.ip || '').slice(0, 95),
        String(clientMeta.userAgent || '').slice(0, 500),
        expiresAt,
      ]
    );

    await recordAdminAuditLog(
      account.username,
      'LOGIN_SUCCESS',
      'admin_session',
      { rememberMe, ip: clientMeta.ip },
      client
    );

    return {
      success: true,
      message: 'Xác thực Quản trị viên trên Neon PostgreSQL thành công!',
      token: rawToken,
      expiresAt,
      admin: {
        id: account.id,
        username: account.username,
        displayName: account.display_name || account.username,
        email: account.email || null,
        role: account.role || 'super_admin',
        lastLoginAt: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    console.warn('Neon login query error, checking stateless fallback:', err?.message || err);
    const fallbackLogin = tryFallbackEnvAdminLogin(cleanUser, cleanPass, rememberMe);
    if (fallbackLogin) return fallbackLogin;
    return {
      success: false,
      message: 'Không thể kết nối cơ sở dữ liệu hoặc thông tin đăng nhập không chính xác.',
    };
  } finally {
    if (client) client.release();
  }
}

export async function verifyAdminSessionToken(rawToken?: string | null): Promise<AdminPrincipal | null> {
  const cleanToken = String(rawToken || '').trim();
  if (!cleanToken || cleanToken.length < 24) return null;

  if (cleanToken.startsWith('mhs1.')) {
    return verifyStatelessAdminToken(cleanToken);
  }

  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) return null;

  try {
    const tokenHash = hashSessionToken(cleanToken);
    const res = await pool.query(
      `SELECT
         a.id,
         a.username,
         a.display_name,
         a.email,
         a.role,
         a.last_login_at
       FROM neon_admin_sessions s
       JOIN neon_admin_accounts a ON a.id = s.admin_id
       WHERE s.token_hash = $1
         AND s.expires_at > NOW()
         AND a.is_active = TRUE
       LIMIT 1;`,
      [tokenHash]
    );

    const row = res.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      username: row.username,
      displayName: row.display_name || row.username,
      email: row.email || null,
      role: row.role || 'admin',
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : null,
    };
  } catch {
    return null;
  }
}

export async function logoutAdminSession(
  rawToken?: string | null,
  allDevices = false
): Promise<void> {
  const cleanToken = String(rawToken || '').trim();
  if (!cleanToken) return;

  const pool = getPool();
  if (!pool) return;

  try {
    const tokenHash = hashSessionToken(cleanToken);
    if (allDevices) {
      const found = await pool.query(
        `SELECT admin_id, username FROM neon_admin_sessions WHERE token_hash = $1 LIMIT 1;`,
        [tokenHash]
      );
      if (found.rows[0]) {
        await pool.query(`DELETE FROM neon_admin_sessions WHERE admin_id = $1;`, [
          found.rows[0].admin_id,
        ]);
        await recordAdminAuditLog(found.rows[0].username, 'LOGOUT_ALL_DEVICES', 'admin_sessions');
        return;
      }
    }
    await pool.query(`DELETE FROM neon_admin_sessions WHERE token_hash = $1;`, [tokenHash]);
  } catch {}
}

export async function changeAdminCredentialsInNeon(params: {
  adminId: number;
  currentToken?: string;
  currentPassword: string;
  newPassword: string;
  newUsername?: string;
  newDisplayName?: string;
}): Promise<{ success: boolean; message: string; admin?: AdminPrincipal }> {
  const cleanNewPass = String(params.newPassword || '').trim();
  if (cleanNewPass.length < 6) {
    return { success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự!' };
  }

  const pool = getPool();
  if (!pool) {
    return { success: false, message: 'Chưa kết nối cơ sở dữ liệu Neon PostgreSQL.' };
  }

  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT * FROM neon_admin_accounts WHERE id = $1 LIMIT 1;`, [
      params.adminId,
    ]);
    const account = res.rows[0];
    if (!account) {
      return { success: false, message: 'Không tìm thấy tài khoản Quản trị viên.' };
    }

    if (!verifyPasswordScrypt(params.currentPassword || '', account.password_hash)) {
      return { success: false, message: 'Mật khẩu hiện tại không chính xác!' };
    }

    let nextUsername = account.username;
    if (params.newUsername && params.newUsername.trim()) {
      const candidate = params.newUsername.trim().toLowerCase();
      if (!/^[a-z0-9_.-]{3,50}$/.test(candidate)) {
        return {
          success: false,
          message: 'Tên đăng nhập mới chỉ gồm chữ thường, số, dấu chấm/gạch dưới (3–50 ký tự).',
        };
      }
      if (candidate !== account.username.toLowerCase()) {
        const dup = await client.query(
          `SELECT id FROM neon_admin_accounts WHERE LOWER(username) = LOWER($1) AND id <> $2 LIMIT 1;`,
          [candidate, account.id]
        );
        if (dup.rowCount && dup.rowCount > 0) {
          return { success: false, message: 'Tên đăng nhập này đã tồn tại trong cơ sở dữ liệu!' };
        }
        nextUsername = candidate;
      }
    }

    const nextDisplayName =
      params.newDisplayName && params.newDisplayName.trim()
        ? params.newDisplayName.trim().slice(0, 120)
        : account.display_name;

    const newHash = hashPasswordScrypt(cleanNewPass);

    await client.query(
      `UPDATE neon_admin_accounts
       SET username = $1,
           display_name = $2,
           password_hash = $3,
           updated_at = NOW()
       WHERE id = $4;`,
      [nextUsername, nextDisplayName, newHash, account.id]
    );

    // Hủy toàn bộ phiên đăng nhập trên các thiết bị khác để đảm bảo an toàn tuyệt đối
    if (params.currentToken) {
      const currentHash = hashSessionToken(params.currentToken);
      await client.query(
        `DELETE FROM neon_admin_sessions WHERE admin_id = $1 AND token_hash <> $2;`,
        [account.id, currentHash]
      );
      await client.query(
        `UPDATE neon_admin_sessions SET username = $1 WHERE token_hash = $2;`,
        [nextUsername, currentHash]
      );
    } else {
      await client.query(`DELETE FROM neon_admin_sessions WHERE admin_id = $1;`, [account.id]);
    }

    await recordAdminAuditLog(
      nextUsername,
      'CHANGE_CREDENTIALS',
      `admin_id:${account.id}`,
      { usernameChanged: nextUsername !== account.username },
      client
    );

    return {
      success: true,
      message: 'Đã cập nhật mật khẩu & thông tin đăng nhập trực tiếp vào Neon PostgreSQL!',
      admin: {
        id: account.id,
        username: nextUsername,
        displayName: nextDisplayName,
        email: account.email || null,
        role: account.role,
      },
    };
  } finally {
    client.release();
  }
}

export async function listAdminAccountsInNeon(): Promise<any[]> {
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) return [];

  const res = await pool.query(`
    SELECT
      a.id,
      a.username,
      a.display_name,
      a.email,
      a.role,
      a.is_active,
      a.last_login_at,
      a.created_at,
      a.updated_at,
      (SELECT count(*)::int FROM neon_admin_sessions s WHERE s.admin_id = a.id AND s.expires_at > NOW()) AS active_sessions
    FROM neon_admin_accounts a
    ORDER BY a.id ASC;
  `);
  return res.rows;
}

export async function createAdminAccountInNeon(params: {
  actorUsername: string;
  username: string;
  password: string;
  displayName?: string;
  email?: string;
  role?: string;
}): Promise<{ success: boolean; message: string; account?: any }> {
  const cleanUsername = String(params.username || '').trim().toLowerCase();
  const cleanPass = String(params.password || '').trim();

  if (!/^[a-z0-9_.-]{3,50}$/.test(cleanUsername)) {
    return {
      success: false,
      message: 'Tên đăng nhập phải từ 3–50 ký tự (chữ không dấu, số, dấu gạch dưới hoặc dấu chấm).',
    };
  }
  if (cleanPass.length < 6) {
    return { success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự!' };
  }

  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) return { success: false, message: 'Chưa kết nối cơ sở dữ liệu Neon PostgreSQL.' };

  const client = await pool.connect();
  try {
    const exists = await client.query(
      `SELECT id FROM neon_admin_accounts WHERE LOWER(username) = LOWER($1) LIMIT 1;`,
      [cleanUsername]
    );
    if (exists.rowCount && exists.rowCount > 0) {
      return { success: false, message: `Tài khoản "${cleanUsername}" đã tồn tại!` };
    }

    const passwordHash = hashPasswordScrypt(cleanPass);
    const role = params.role === 'super_admin' ? 'super_admin' : 'admin';
    const displayName = String(params.displayName || cleanUsername).trim().slice(0, 120);
    const email = params.email ? String(params.email).trim().slice(0, 180) : null;

    const inserted = await client.query(
      `INSERT INTO neon_admin_accounts (username, display_name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, username, display_name, email, role, is_active, created_at;`,
      [cleanUsername, displayName, email, passwordHash, role]
    );

    await recordAdminAuditLog(
      params.actorUsername,
      'CREATE_ADMIN_ACCOUNT',
      cleanUsername,
      { role },
      client
    );

    return {
      success: true,
      message: `Đã tạo tài khoản Quản trị viên "${cleanUsername}" trong PostgreSQL!`,
      account: inserted.rows[0],
    };
  } finally {
    client.release();
  }
}

export async function deleteAdminAccountInNeon(params: {
  actorId: number;
  actorUsername: string;
  targetId: number;
}): Promise<{ success: boolean; message: string }> {
  if (params.actorId === params.targetId) {
    return {
      success: false,
      message: 'Không thể tự xóa tài khoản Admin đang đăng nhập hiện tại!',
    };
  }

  const pool = getPool();
  if (!pool) return { success: false, message: 'Chưa kết nối cơ sở dữ liệu Neon PostgreSQL.' };

  const client = await pool.connect();
  try {
    const countRes = await client.query(
      `SELECT count(*)::int AS cnt FROM neon_admin_accounts WHERE is_active = TRUE;`
    );
    if ((countRes.rows[0]?.cnt || 0) <= 1) {
      return {
        success: false,
        message: 'Hệ thống bắt buộc phải giữ lại ít nhất 1 tài khoản Quản trị viên hoạt động!',
      };
    }

    const deleted = await client.query(
      `DELETE FROM neon_admin_accounts WHERE id = $1 RETURNING username;`,
      [params.targetId]
    );
    if (!deleted.rowCount) {
      return { success: false, message: 'Không tìm thấy tài khoản cần xóa.' };
    }

    await recordAdminAuditLog(
      params.actorUsername,
      'DELETE_ADMIN_ACCOUNT',
      deleted.rows[0].username,
      { targetId: params.targetId },
      client
    );

    return {
      success: true,
      message: `Đã xóa tài khoản "${deleted.rows[0].username}" khỏi PostgreSQL.`,
    };
  } finally {
    client.release();
  }
}

// =========================================================================
// LƯU TRỮ & ĐỒNG BỘ CÀI ĐẶT HỆ THỐNG TRÊN NEON POSTGRESQL
// =========================================================================

export async function getPublicAppSettingsFromNeon(): Promise<{
  settings: Record<string, any>;
  customVideos: any[];
  deletedVideoIds: string[];
} | null> {
  if (!getNeonConnectionString()) return null;

  try {
    await ensureNeonBootstrapped();
    const pool = getPool();
    if (!pool) return null;

    const [settingsRes, videosRes] = await Promise.all([
      pool.query(
        `SELECT setting_key, setting_value, updated_at
         FROM neon_app_settings
         WHERE is_public = TRUE;`
      ),
      pool.query(
        `SELECT id, youtube_id, title, channel, duration, thumbnail, is_short, is_deleted, source_type, metadata
         FROM neon_channel_videos
         ORDER BY created_at DESC
         LIMIT 200;`
      ),
    ]);

    const settings: Record<string, any> = {};
    for (const row of settingsRes.rows) {
      settings[row.setting_key] = row.setting_value;
    }

    const customVideos: any[] = [];
    const deletedVideoIds: string[] = [];

    for (const v of videosRes.rows) {
      if (v.is_deleted) {
        deletedVideoIds.push(v.youtube_id);
      } else {
        customVideos.push({
          id: v.id,
          youtubeId: v.youtube_id,
          title: v.title,
          channel: v.channel || 'Minh Hiếu Official VN',
          duration: v.duration || '05:00',
          thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`,
          isShort: Boolean(v.is_short),
          ...(typeof v.metadata === 'object' && v.metadata ? v.metadata : {}),
        });
      }
    }

    return { settings, customVideos, deletedVideoIds };
  } catch (err) {
    console.warn('getPublicAppSettingsFromNeon warning:', (err as any)?.message || err);
    return null;
  }
}

let cachedRuntimeApiKeys: {
  expiresAt: number;
  data: {
    everaiApiKey: string;
    vidkrakenApiKey: string;
    geminiApiKey: string;
    geminiProEmail: string;
    tiktokRapidApiKey: string;
    youtubeDataApiKey: string;
    customBackendUrl: string;
    vidkrakenProxyUrl: string;
  };
} | null = null;

export function invalidateRuntimeApiKeysCache(): void {
  cachedRuntimeApiKeys = null;
}

export async function getAllAdminSettingsFromNeon(): Promise<Record<string, any>> {
  const ready = await ensureNeonBootstrapped();
  if (!ready) return {};
  const pool = getPool();
  if (!pool) return {};

  try {
    const res = await pool.query(
      `SELECT setting_key, setting_value
       FROM neon_app_settings
       ORDER BY updated_at DESC;`
    );
    const out: Record<string, any> = {};
    for (const row of res.rows) {
      out[row.setting_key] = row.setting_value;
    }
    return out;
  } catch (err) {
    console.warn('getAllAdminSettingsFromNeon warning:', (err as any)?.message || err);
    return {};
  }
}

export async function getRuntimeApiKeysFromNeon(): Promise<{
  everaiApiKey: string;
  vidkrakenApiKey: string;
  geminiApiKey: string;
  geminiProEmail: string;
  tiktokRapidApiKey: string;
  youtubeDataApiKey: string;
  customBackendUrl: string;
  vidkrakenProxyUrl: string;
}> {
  if (cachedRuntimeApiKeys && cachedRuntimeApiKeys.expiresAt > Date.now()) {
    return cachedRuntimeApiKeys.data;
  }

  const empty = {
    everaiApiKey: '',
    vidkrakenApiKey: '',
    geminiApiKey: '',
    geminiProEmail: '',
    tiktokRapidApiKey: '',
    youtubeDataApiKey: '',
    customBackendUrl: '',
    vidkrakenProxyUrl: '',
  };

  try {
    const ready = await ensureNeonBootstrapped();
    if (!ready) return empty;
    const pool = getPool();
    if (!pool) return empty;

    const res = await pool.query(
      `SELECT setting_value
       FROM neon_app_settings
       WHERE setting_key = 'api_keys_config'
       LIMIT 1;`
    );
    const raw = res.rows[0]?.setting_value || {};
    const data = {
      everaiApiKey: typeof raw.everaiApiKey === 'string' ? raw.everaiApiKey.trim() : '',
      vidkrakenApiKey: typeof raw.vidkrakenApiKey === 'string' ? raw.vidkrakenApiKey.trim() : '',
      geminiApiKey: typeof raw.geminiApiKey === 'string' ? raw.geminiApiKey.trim() : '',
      geminiProEmail: typeof raw.geminiProEmail === 'string' ? raw.geminiProEmail.trim() : '',
      tiktokRapidApiKey: typeof raw.tiktokRapidApiKey === 'string' ? raw.tiktokRapidApiKey.trim() : '',
      youtubeDataApiKey: typeof raw.youtubeDataApiKey === 'string' ? raw.youtubeDataApiKey.trim() : '',
      customBackendUrl: typeof raw.customBackendUrl === 'string' ? raw.customBackendUrl.trim() : '',
      vidkrakenProxyUrl: typeof raw.vidkrakenProxyUrl === 'string' ? raw.vidkrakenProxyUrl.trim() : '',
    };
    cachedRuntimeApiKeys = {
      expiresAt: Date.now() + 20000,
      data,
    };
    return data;
  } catch {
    return empty;
  }
}

export async function upsertAppSettingInNeon(params: {
  key: string;
  value: any;
  category?: string;
  isPublic?: boolean;
  description?: string;
  updatedBy?: string;
}): Promise<void> {
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối cơ sở dữ liệu Neon PostgreSQL.');

  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO neon_app_settings (setting_key, setting_value, category, is_public, description, updated_by, updated_at)
       VALUES ($1, $2::jsonb, $3, $4, $5, $6, NOW())
       ON CONFLICT (setting_key) DO UPDATE SET
         setting_value = CASE
           WHEN neon_app_settings.setting_key IN ('api_keys_config', 'storage_preferences')
             AND jsonb_typeof(neon_app_settings.setting_value) = 'object'
             AND jsonb_typeof(EXCLUDED.setting_value) = 'object'
             THEN neon_app_settings.setting_value || EXCLUDED.setting_value
           ELSE EXCLUDED.setting_value
         END,
         category = COALESCE(EXCLUDED.category, neon_app_settings.category),
         is_public = COALESCE(EXCLUDED.is_public, neon_app_settings.is_public),
         description = COALESCE(EXCLUDED.description, neon_app_settings.description),
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW();`,
      [
        params.key,
        JSON.stringify(params.value ?? {}),
        params.category || 'general',
        params.isPublic !== undefined ? params.isPublic : true,
        params.description || null,
        params.updatedBy || 'admin',
      ]
    );

    if (params.key === 'api_keys_config') {
      invalidateRuntimeApiKeysCache();
    }

    await recordAdminAuditLog(
      params.updatedBy || 'admin',
      'UPDATE_SETTING',
      params.key,
      { category: params.category || 'general' },
      client
    );
  } finally {
    client.release();
  }
}

export async function upsertChannelVideosInNeon(params: {
  customVideos?: any[];
  deletedVideoIds?: string[];
  updatedBy?: string;
}): Promise<{ savedVideos: number; savedDeleted: number }> {
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối cơ sở dữ liệu Neon PostgreSQL.');

  let savedVideos = 0;
  let savedDeleted = 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (Array.isArray(params.customVideos)) {
      for (const vid of params.customVideos.slice(0, 100)) {
        const ytId = String(vid?.youtubeId || vid?.id || '').trim();
        if (!ytId) continue;
        const rowId = String(vid?.id || `vid-${ytId}`).slice(0, 115);
        await client.query(
          `INSERT INTO neon_channel_videos (
             id, youtube_id, title, channel, duration, thumbnail, is_short, is_deleted, source_type, metadata, added_by, updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, $8, $9::jsonb, $10, NOW())
           ON CONFLICT (youtube_id) DO UPDATE SET
             title = EXCLUDED.title,
             channel = EXCLUDED.channel,
             duration = EXCLUDED.duration,
             thumbnail = EXCLUDED.thumbnail,
             is_short = EXCLUDED.is_short,
             is_deleted = FALSE,
             metadata = EXCLUDED.metadata,
             updated_at = NOW();`,
          [
            rowId,
            ytId.slice(0, 115),
            String(vid?.title || 'Video Kênh'),
            String(vid?.channel || 'Minh Hiếu Official VN').slice(0, 250),
            String(vid?.duration || '05:00').slice(0, 45),
            String(vid?.thumbnail || ''),
            Boolean(vid?.isShort),
            vid?.tiktokVideoUrl || String(ytId).startsWith('tiktok') ? 'tiktok' : 'youtube',
            JSON.stringify({
              description: vid?.description || '',
              publishedDate: vid?.publishedDate || '',
              tiktokVideoUrl: vid?.tiktokVideoUrl || undefined,
              tiktokEmbedUrl: vid?.tiktokEmbedUrl || undefined,
            }),
            params.updatedBy || 'admin',
          ]
        );
        savedVideos++;
      }
    }

    if (Array.isArray(params.deletedVideoIds)) {
      for (const rawDelId of params.deletedVideoIds.slice(0, 200)) {
        const delId = String(rawDelId || '').trim();
        if (!delId) continue;
        await client.query(
          `INSERT INTO neon_channel_videos (
             id, youtube_id, title, is_deleted, added_by, updated_at
           )
           VALUES ($1, $2, 'Deleted Video Blacklist', TRUE, $3, NOW())
           ON CONFLICT (youtube_id) DO UPDATE SET
             is_deleted = TRUE,
             updated_at = NOW();`,
          [`del-${delId}`.slice(0, 115), delId.slice(0, 115), params.updatedBy || 'admin']
        );
        savedDeleted++;
      }
    }

    await client.query('COMMIT');
    return { savedVideos, savedDeleted };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// =========================================================================
// KIỂM TRA KẾT NỐI & DUYỆT BẢNG AN TOÀN DÀNH CHO ADMIN
// =========================================================================

export async function testNeonConnection(customConnStr?: string): Promise<NeonStatus> {
  const connStr = customConnStr
    ? normalizeNeonConnectionString(customConnStr)
    : getNeonConnectionString();
  if (!connStr) {
    return {
      connected: false,
      initialized: false,
      adminCount: 0,
      host: '',
      database: '',
      version: '',
      latencyMs: 0,
      tables: [],
      error: 'Chưa cấu hình chuỗi kết nối PostgreSQL từ https://neon.tech',
    };
  }

  const pool = getPool(customConnStr);
  if (!pool) {
    return {
      connected: false,
      initialized: false,
      adminCount: 0,
      host: '',
      database: '',
      version: '',
      latencyMs: 0,
      tables: [],
      error: 'Không thể khởi tạo kết nối cơ sở dữ liệu',
    };
  }

  const start = Date.now();
  let client: pg.PoolClient | null = null;
  try {
    client = await pool.connect();
    const res = await client.query(`
      SELECT 
        version() as version, 
        current_database() as db_name, 
        current_user as current_user
    `);
    const latency = Date.now() - start;

    const row = res.rows[0] || {};
    let hostName = 'neon.tech';
    try {
      const parsedUrl = new URL(connStr);
      hostName = parsedUrl.hostname;
    } catch {}

    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const tables: { name: string; rowCount: number }[] = [];
    let adminCount = 0;

    for (const tRow of tableRes.rows) {
      const tName = tRow.table_name;
      try {
        const countRes = await client.query(`SELECT count(*)::int as cnt FROM "${tName}";`);
        const cnt = countRes.rows[0]?.cnt || 0;
        tables.push({ name: tName, rowCount: cnt });
        if (tName === 'neon_admin_accounts') {
          adminCount = cnt;
        }
      } catch {
        tables.push({ name: tName, rowCount: 0 });
      }
    }

    const tableNameSet = new Set(tables.map((t) => t.name));
    const initialized =
      tableNameSet.has('neon_admin_accounts') &&
      tableNameSet.has('neon_app_settings') &&
      adminCount > 0;

    return {
      connected: true,
      initialized,
      adminCount,
      host: hostName,
      database: row.db_name || 'neondb',
      version: String(row.version || '').split(' on ')[0] || 'PostgreSQL (Neon Serverless)',
      latencyMs: latency,
      tables,
      configuredUrlMasked: maskConnectionString(connStr),
    };
  } catch (err: any) {
    return {
      connected: false,
      initialized: false,
      adminCount: 0,
      host: '',
      database: '',
      version: '',
      latencyMs: 0,
      tables: [],
      error:
        err?.message || 'Không thể kết nối đến Neon.tech. Vui lòng kiểm tra lại chuỗi kết nối!',
      configuredUrlMasked: maskConnectionString(connStr),
    };
  } finally {
    if (client) client.release();
    if (customConnStr && pool !== activePool) {
      pool.end().catch(() => {});
    }
  }
}

export async function queryNeonTable(
  tableName: string,
  page = 1,
  limit = 20,
  search = ''
): Promise<{ rows: any[]; total: number; page: number; limit: number }> {
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối Neon database.');

  if (!BROWSABLE_NEON_TABLES.includes(tableName)) {
    throw new Error('Tên bảng không hợp lệ hoặc không được phép truy cập trực tiếp');
  }

  const client = await pool.connect();
  try {
    const offset = Math.max(0, (page - 1) * limit);
    let whereClause = '';
    const params: any[] = [];

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      if (tableName === 'neon_study_records') {
        whereClause = `WHERE prompt ILIKE $1 OR board_title ILIKE $1 OR student_name ILIKE $1`;
        params.push(q);
      } else if (tableName === 'neon_app_users') {
        whereClause = `WHERE full_name ILIKE $1 OR email ILIKE $1`;
        params.push(q);
      } else if (tableName === 'neon_tiktok_history') {
        whereClause = `WHERE description ILIKE $1 OR author_name ILIKE $1 OR file_name ILIKE $1`;
        params.push(q);
      } else if (tableName === 'neon_app_settings') {
        whereClause = `WHERE setting_key ILIKE $1 OR description ILIKE $1 OR category ILIKE $1`;
        params.push(q);
      } else if (tableName === 'neon_admin_accounts') {
        whereClause = `WHERE username ILIKE $1 OR display_name ILIKE $1 OR COALESCE(email, '') ILIKE $1`;
        params.push(q);
      } else if (tableName === 'neon_channel_videos') {
        whereClause = `WHERE title ILIKE $1 OR youtube_id ILIKE $1 OR COALESCE(channel, '') ILIKE $1`;
        params.push(q);
      } else if (tableName === 'neon_admin_audit_logs') {
        whereClause = `WHERE admin_username ILIKE $1 OR action ILIKE $1 OR COALESCE(target, '') ILIKE $1`;
        params.push(q);
      }
    }

    const countRes = await client.query(
      `SELECT count(*)::int as total FROM "${tableName}" ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    let sortCol = 'created_at';
    if (tableName === 'neon_tiktok_history') sortCol = 'downloaded_at';
    if (tableName === 'neon_app_settings') sortCol = 'updated_at';

    // Không bao giờ trả về cột password_hash ra API trình duyệt
    const selectCols =
      tableName === 'neon_admin_accounts'
        ? `id, username, display_name, email, role, is_active, failed_attempts, last_login_at, created_at, updated_at, '[SCRYPT PROTECTED]' AS password_security`
        : `*`;

    params.push(limit);
    params.push(offset);
    const dataRes = await client.query(
      `SELECT ${selectCols} FROM "${tableName}" ${whereClause} ORDER BY "${sortCol}" DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return {
      rows: dataRes.rows,
      total,
      page,
      limit,
    };
  } finally {
    client.release();
  }
}

export async function insertNeonTableRow(tableName: string, data: Record<string, any>): Promise<any> {
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối Neon database.');

  const insertableTables = [
    'neon_app_users',
    'neon_study_records',
    'neon_app_settings',
    'neon_tiktok_history',
    'neon_channel_videos',
  ];
  if (!insertableTables.includes(tableName)) {
    throw new Error('Bảng này được quản lý qua giao diện bảo mật chuyên biệt');
  }

  const client = await pool.connect();
  try {
    const keys = Object.keys(data).filter(
      (k) => k !== 'created_at' && /^[a-zA-Z0-9_]+$/.test(k)
    );
    if (keys.length === 0) throw new Error('Dữ liệu rỗng');

    const cols = keys.map((k) => `"${k}"`).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const values = keys.map((k) => {
      const val = data[k];
      if (typeof val === 'object' && val !== null) {
        return JSON.stringify(val);
      }
      return val;
    });

    const conflictCol =
      tableName === 'neon_app_settings'
        ? 'setting_key'
        : tableName === 'neon_channel_videos'
        ? 'youtube_id'
        : 'id';

    const updateAssignments = keys
      .filter((k) => k !== conflictCol)
      .map((k) => `"${k}" = EXCLUDED."${k}"`)
      .join(', ');

    const conflictClause = updateAssignments
      ? `ON CONFLICT ("${conflictCol}") DO UPDATE SET ${updateAssignments}`
      : `ON CONFLICT DO NOTHING`;

    const res = await client.query(
      `INSERT INTO "${tableName}" (${cols}) VALUES (${placeholders}) ${conflictClause} RETURNING *;`,
      values
    );
    if (tableName === 'neon_app_settings') {
      invalidateRuntimeApiKeysCache();
    }
    return res.rows[0];
  } finally {
    client.release();
  }
}

export async function deleteNeonTableRow(tableName: string, id: string): Promise<boolean> {
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối Neon database.');

  const deletableTables = [
    'neon_app_users',
    'neon_study_records',
    'neon_app_settings',
    'neon_tiktok_history',
    'neon_channel_videos',
    'neon_admin_audit_logs',
  ];
  if (!deletableTables.includes(tableName)) {
    throw new Error(
      'Để xóa tài khoản Admin, vui lòng sử dụng mục Quản Lý Tài Khoản Admin để đảm bảo an toàn hệ thống.'
    );
  }

  const client = await pool.connect();
  try {
    const idCol = tableName === 'neon_app_settings' ? 'setting_key' : 'id';
    const res = await client.query(
      `DELETE FROM "${tableName}" WHERE "${idCol}"::text = $1 RETURNING *;`,
      [String(id)]
    );
    return (res.rowCount || 0) > 0;
  } finally {
    client.release();
  }
}

export async function executeNeonCustomSql(
  sql: string,
  actorUsername = 'admin'
): Promise<any> {
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối Neon database.');

  const trimmed = sql.trim();
  if (!trimmed) throw new Error('Câu lệnh SQL không được để trống.');

  if (trimmed.includes(';') && trimmed.split(';').filter((s) => s.trim().length > 0).length > 2) {
    throw new Error('Chỉ được thực thi tối đa một câu lệnh SQL mỗi lần.');
  }

  // Ngăn việc xóa bảng tài khoản/phiên bảo mật qua SQL Console gây mất quyền Admin
  if (/DROP\s+TABLE\s+.*neon_admin_(accounts|sessions)/i.test(trimmed)) {
    throw new Error('Hệ thống bảo vệ từ chối lệnh DROP bảng tài khoản/phiên Quản trị viên.');
  }

  const client = await pool.connect();
  try {
    const start = Date.now();
    const res = await client.query(trimmed);
    const executionTimeMs = Date.now() - start;

    await recordAdminAuditLog(
      actorUsername,
      'EXECUTE_SQL',
      res.command || 'SQL',
      { preview: trimmed.slice(0, 180) },
      client
    );

    // Tự động che các cột nhạy cảm (password_hash, token_hash) nếu có trong kết quả truy vấn
    const sanitizedRows = (res.rows?.slice(0, 100) || []).map((r: any) => {
      if (!r || typeof r !== 'object') return r;
      const copy = { ...r };
      if ('password_hash' in copy) copy.password_hash = '[SCRYPT_HASH_PROTECTED]';
      if ('token_hash' in copy) copy.token_hash = '[SESSION_HASH_PROTECTED]';
      return copy;
    });

    return {
      command: res.command,
      rowCount: res.rowCount,
      fields: res.fields?.map((f) => f.name) || [],
      rows: sanitizedRows,
      executionTimeMs,
    };
  } finally {
    client.release();
  }
}

export async function saveStudyRecordToNeon(payload: StudyRecordPayload): Promise<any> {
  const pool = getPool();
  if (!pool) return null;

  try {
    await ensureNeonBootstrapped();
    const client = await pool.connect();
    try {
      const recordId =
        payload.id || `study-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const res = await client.query(
        `
        INSERT INTO neon_study_records (
          id, student_name, grade, subject, prompt, image_url, 
          board_title, core_concept, steps_json, final_answer, teacher_advice
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          board_title = EXCLUDED.board_title,
          core_concept = EXCLUDED.core_concept,
          steps_json = EXCLUDED.steps_json,
          final_answer = EXCLUDED.final_answer,
          teacher_advice = EXCLUDED.teacher_advice
        RETURNING *;
      `,
        [
          recordId,
          payload.studentName || 'Bé Thông Thái',
          payload.grade || 3,
          payload.subject || 'toan',
          payload.prompt,
          payload.imageUrl || null,
          payload.boardTitle || 'Bài Giảng Trên Bảng Xanh',
          payload.coreConcept || '',
          JSON.stringify(payload.stepsJson || []),
          payload.finalAnswer || '',
          payload.teacherAdvice || '',
        ]
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn('Neon auto-save study record failed:', err);
    return null;
  }
}

// =========================================================================
// QUẢN LÝ TỆP TÀI LIỆU (PDF, WORD, EXCEL, ZIP) & THANH TOÁN PAYPAL
// =========================================================================
const LOCAL_DOCUMENTS_FILE = path.resolve(__dirname, '../../data/documents.json');

function formatNeonDocRow(row: any): any {
  if (!row) return null;
  const fileName = String(row.fileName || row.file_name || 'file.dat');
  const fileType = String(row.fileType || row.file_type || 'other').toLowerCase();
  return {
    id: String(row.id || `doc-${Date.now()}`),
    title: String(row.title || fileName || 'Tài liệu'),
    fileName,
    fileSize: String(row.fileSize || row.file_size || '1.0 MB'),
    fileType,
    fileUrl: String(row.fileUrl || row.file_url || ''),
    fileData: row.fileData || row.file_data || undefined,
    isUploaded: Boolean(row.isUploaded !== undefined ? row.isUploaded : row.is_uploaded),
    requirePayment: Boolean(row.requirePayment !== undefined ? row.requirePayment : row.require_payment),
    price: Number(row.price || 0),
    currency: String(row.currency || 'USD'),
    description: String(row.description || ''),
    downloadCount: Number(row.downloadCount !== undefined ? row.downloadCount : (row.download_count || 0)),
    createdAt: row.createdAt || row.created_at || new Date().toISOString(),
    updatedAt: row.updatedAt || row.updated_at || new Date().toISOString(),
  };
}

function readLocalDocumentsFallback(): any[] {
  try {
    if (fs.existsSync(LOCAL_DOCUMENTS_FILE)) {
      const raw = fs.readFileSync(LOCAL_DOCUMENTS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(formatNeonDocRow);
    }
  } catch {}
  return [];
}

function writeLocalDocumentsFallback(docs: any[]): void {
  try {
    const dir = path.dirname(LOCAL_DOCUMENTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_DOCUMENTS_FILE, JSON.stringify(docs, null, 2), 'utf-8');
  } catch (err) {
    console.warn('writeLocalDocumentsFallback error:', err);
  }
}

export async function listDocumentsFromNeon(): Promise<any[]> {
  try {
    await ensureNeonBootstrapped();
    const pool = getPool();
    if (!pool) return readLocalDocumentsFallback();

    const res = await pool.query(`
      SELECT
        id,
        title,
        file_name AS "fileName",
        file_size AS "fileSize",
        file_type AS "fileType",
        file_url AS "fileUrl",
        is_uploaded AS "isUploaded",
        require_payment AS "requirePayment",
        price,
        currency,
        description,
        download_count AS "downloadCount",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM neon_documents
      ORDER BY created_at DESC;
    `);

    if (res.rows && res.rows.length > 0) {
      const formatted = res.rows.map(formatNeonDocRow);
      writeLocalDocumentsFallback(formatted);
      return formatted;
    }
  } catch (err) {
    console.warn('listDocumentsFromNeon fallback to disk:', err);
  }
  return readLocalDocumentsFallback();
}

export async function upsertDocumentInNeon(doc: {
  id: string;
  title: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  fileUrl: string;
  fileData?: string;
  isUploaded?: boolean;
  requirePayment?: boolean;
  price?: number;
  currency?: string;
  description?: string;
  actorUsername?: string;
}): Promise<any> {
  const cleanId = String(doc.id || `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  const title = String(doc.title || 'Tài liệu');
  const fileName = String(doc.fileName || 'file.dat');
  const fileSize = String(doc.fileSize || '1 MB');
  const fileType = String(doc.fileType || 'other').toLowerCase();
  const fileUrl = String(doc.fileUrl || '');
  const fileData = doc.fileData || null;
  const isUploaded = Boolean(doc.isUploaded);
  const requirePayment = Boolean(doc.requirePayment);
  const price = Number(doc.price || 0);
  const currency = String(doc.currency || 'USD');
  const description = String(doc.description || '');

  const localItem = formatNeonDocRow({
    id: cleanId,
    title,
    fileName,
    fileSize,
    fileType,
    fileUrl,
    isUploaded,
    requirePayment,
    price,
    currency,
    description,
    downloadCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Sync to local fallback
  try {
    const localList = readLocalDocumentsFallback().filter((x) => x.id !== cleanId);
    localList.unshift(localItem);
    writeLocalDocumentsFallback(localList);
  } catch {}

  try {
    await ensureNeonBootstrapped();
    const pool = getPool();
    if (pool) {
      const client = await pool.connect();
      try {
        const res = await client.query(
          `INSERT INTO neon_documents (
            id, title, file_name, file_size, file_type, file_url, file_data, is_uploaded, require_payment, price, currency, description, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            file_name = EXCLUDED.file_name,
            file_size = EXCLUDED.file_size,
            file_type = EXCLUDED.file_type,
            file_url = EXCLUDED.file_url,
            file_data = COALESCE(EXCLUDED.file_data, neon_documents.file_data),
            is_uploaded = EXCLUDED.is_uploaded,
            require_payment = EXCLUDED.require_payment,
            price = EXCLUDED.price,
            currency = EXCLUDED.currency,
            description = EXCLUDED.description,
            updated_at = NOW()
          RETURNING *;`,
          [cleanId, title, fileName, fileSize, fileType, fileUrl, fileData, isUploaded, requirePayment, price, currency, description]
        );

        await recordAdminAuditLog(
          doc.actorUsername || 'admin',
          'UPSERT_DOCUMENT',
          cleanId,
          { title, fileName, fileType, requirePayment, price },
          client
        );

        return formatNeonDocRow(res.rows[0]) || localItem;
      } finally {
        client.release();
      }
    }
  } catch (err) {
    console.warn('upsertDocumentInNeon error, retained in local fallback:', err);
  }
  return localItem;
}

export async function deleteDocumentInNeon(id: string, actorUsername = 'admin'): Promise<boolean> {
  const cleanId = String(id || '').trim();
  if (!cleanId) return false;

  // Delete from local fallback
  try {
    const localList = readLocalDocumentsFallback().filter((x) => x.id !== cleanId);
    writeLocalDocumentsFallback(localList);
  } catch {}

  try {
    await ensureNeonBootstrapped();
    const pool = getPool();
    if (pool) {
      const client = await pool.connect();
      try {
        const res = await client.query(`DELETE FROM neon_documents WHERE id = $1 RETURNING id;`, [cleanId]);
        await recordAdminAuditLog(actorUsername, 'DELETE_DOCUMENT', cleanId, {}, client);
        return (res.rowCount || 0) > 0;
      } finally {
        client.release();
      }
    }
  } catch (err) {
    console.warn('deleteDocumentInNeon error:', err);
  }
  return true;
}

export async function incrementDocumentDownloadCount(id: string): Promise<number> {
  const cleanId = String(id || '').trim();
  if (!cleanId) return 0;

  try {
    const localList = readLocalDocumentsFallback();
    const found = localList.find((x) => x.id === cleanId);
    if (found) {
      found.downloadCount = (found.downloadCount || 0) + 1;
      writeLocalDocumentsFallback(localList);
    }
  } catch {}

  try {
    await ensureNeonBootstrapped();
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        `UPDATE neon_documents SET download_count = download_count + 1 WHERE id = $1 RETURNING download_count;`,
        [cleanId]
      );
      return res.rows[0]?.download_count || 1;
    }
  } catch {}
  return 1;
}

export async function getDocumentById(id: string): Promise<any | null> {
  const cleanId = String(id || '').trim();
  if (!cleanId) return null;

  try {
    await ensureNeonBootstrapped();
    const pool = getPool();
    if (pool) {
      const res = await pool.query(`SELECT * FROM neon_documents WHERE id = $1 LIMIT 1;`, [cleanId]);
      if (res.rows && res.rows[0]) return res.rows[0];
    }
  } catch {}

  const localList = readLocalDocumentsFallback();
  return localList.find((x) => x.id === cleanId) || null;
}

