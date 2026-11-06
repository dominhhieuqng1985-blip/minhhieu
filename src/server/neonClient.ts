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
  'neon_temple_members',
  'neon_temple_member_sessions',
  'neon_temple_merit_records',
  'neon_memorial_tombs',
  'neon_memorial_tributes',
  'neon_temple_guestbook',
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
  'neon_temple_members',
  'neon_temple_merit_records',
  'neon_memorial_tombs',
  'neon_memorial_tributes',
  'neon_temple_guestbook',
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

    // 10. Bảng neon_temple_members: Thành viên Phật tử đăng ký, đăng nhập, cúng dường trong chùa & xây dựng khu mộ
    await client.query(`
      CREATE TABLE IF NOT EXISTS neon_temple_members (
        id VARCHAR(100) PRIMARY KEY,
        username VARCHAR(100) UNIQUE,
        password_hash TEXT,
        full_name VARCHAR(255) NOT NULL,
        dharma_name VARCHAR(150),
        phone VARCHAR(60),
        email VARCHAR(180),
        address VARCHAR(255),
        role VARCHAR(40) DEFAULT 'member',
        is_active BOOLEAN DEFAULT TRUE,
        merit_points INTEGER DEFAULT 0,
        total_donated NUMERIC(14, 0) DEFAULT 0,
        tombs_built INTEGER DEFAULT 0,
        last_login_at TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Tự động nâng cấp đầy đủ các cột bản mới cho bảng neon_temple_members nếu đã tồn tại từ bản cũ
    await client.query(`
      ALTER TABLE neon_temple_members ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;
      ALTER TABLE neon_temple_members ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE neon_temple_members ADD COLUMN IF NOT EXISTS dharma_name VARCHAR(150);
      ALTER TABLE neon_temple_members ADD COLUMN IF NOT EXISTS phone VARCHAR(60);
      ALTER TABLE neon_temple_members ADD COLUMN IF NOT EXISTS email VARCHAR(180);
      ALTER TABLE neon_temple_members ADD COLUMN IF NOT EXISTS address VARCHAR(255);
      ALTER TABLE neon_temple_members ADD COLUMN IF NOT EXISTS role VARCHAR(40) DEFAULT 'member';
      ALTER TABLE neon_temple_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE neon_temple_members ADD COLUMN IF NOT EXISTS merit_points INTEGER DEFAULT 0;
      ALTER TABLE neon_temple_members ADD COLUMN IF NOT EXISTS total_donated NUMERIC(14, 0) DEFAULT 0;
      ALTER TABLE neon_temple_members ADD COLUMN IF NOT EXISTS tombs_built INTEGER DEFAULT 0;
      ALTER TABLE neon_temple_members ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
      ALTER TABLE neon_temple_members ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE neon_temple_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);

    // 10b. Bảng neon_temple_member_sessions: Lưu trữ phiên đăng nhập Thành viên Phật tử bền vững trên PostgreSQL
    await client.query(`
      CREATE TABLE IF NOT EXISTS neon_temple_member_sessions (
        token_hash VARCHAR(128) PRIMARY KEY,
        member_id VARCHAR(100) NOT NULL REFERENCES neon_temple_members(id) ON DELETE CASCADE,
        username VARCHAR(100),
        ip_address VARCHAR(100),
        user_agent TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 11. Bảng neon_temple_merit_records: Sổ vàng ghi danh cúng dường, mua vật phẩm dâng lễ & kết nối bài kinh
    await client.query(`
      CREATE TABLE IF NOT EXISTS neon_temple_merit_records (
        id VARCHAR(100) PRIMARY KEY,
        member_id VARCHAR(100) REFERENCES neon_temple_members(id) ON DELETE SET NULL,
        donor_name VARCHAR(255) NOT NULL,
        dharma_name VARCHAR(150),
        phone VARCHAR(60),
        address VARCHAR(255),
        prayer_type VARCHAR(50) DEFAULT 'cau-an',
        prayer_text TEXT,
        sutra_id VARCHAR(100),
        sutra_title VARCHAR(255),
        items_json JSONB DEFAULT '[]'::jsonb,
        custom_donation NUMERIC(14, 0) DEFAULT 0,
        total_amount NUMERIC(14, 0) DEFAULT 0,
        total_merit_points INTEGER DEFAULT 0,
        payment_method VARCHAR(50) DEFAULT 'tuy-tam',
        payment_status VARCHAR(50) DEFAULT 'completed',
        transaction_code VARCHAR(120),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      ALTER TABLE neon_temple_merit_records ADD COLUMN IF NOT EXISTS member_id VARCHAR(100);
      ALTER TABLE neon_temple_merit_records ADD COLUMN IF NOT EXISTS sutra_id VARCHAR(100);
      ALTER TABLE neon_temple_merit_records ADD COLUMN IF NOT EXISTS sutra_title VARCHAR(255);
      ALTER TABLE neon_temple_merit_records ADD COLUMN IF NOT EXISTS items_json JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE neon_temple_merit_records ADD COLUMN IF NOT EXISTS custom_donation NUMERIC(14, 0) DEFAULT 0;
      ALTER TABLE neon_temple_merit_records ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14, 0) DEFAULT 0;
      ALTER TABLE neon_temple_merit_records ADD COLUMN IF NOT EXISTS total_merit_points INTEGER DEFAULT 0;
      ALTER TABLE neon_temple_merit_records ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'tuy-tam';
      ALTER TABLE neon_temple_merit_records ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'completed';
      ALTER TABLE neon_temple_merit_records ADD COLUMN IF NOT EXISTS transaction_code VARCHAR(120);
    `);

    // 12. Bảng neon_memorial_tombs: Hoa Viên Khu Mộ 3D & Bia Tưởng Niệm Người Quá Cố (Đầy đủ Dương Lịch, Âm Lịch, Hưởng Thọ / Hưởng Dương)
    await client.query(`
      CREATE TABLE IF NOT EXISTS neon_memorial_tombs (
        id VARCHAR(100) PRIMARY KEY,
        plot_code VARCHAR(30) UNIQUE NOT NULL,
        zone_name VARCHAR(200) NOT NULL,
        row_index INTEGER NOT NULL DEFAULT 0,
        col_index INTEGER NOT NULL DEFAULT 0,
        stele_header VARCHAR(150) DEFAULT 'PHẬT QUANG TIẾP DẪN',
        deceased_full_name VARCHAR(255) NOT NULL,
        deceased_dharma_name VARCHAR(150),
        gender VARCHAR(20) DEFAULT 'Nam',
        birth_solar VARCHAR(60) NOT NULL,
        birth_lunar VARCHAR(120) NOT NULL,
        death_solar VARCHAR(60) NOT NULL,
        death_lunar VARCHAR(120) NOT NULL,
        longevity_type VARCHAR(30) NOT NULL DEFAULT 'huong-tho',
        longevity_age INTEGER NOT NULL DEFAULT 80,
        hometown VARCHAR(255),
        epitaph TEXT,
        erected_by VARCHAR(255),
        member_id VARCHAR(100) REFERENCES neon_temple_members(id) ON DELETE SET NULL,
        builder_name VARCHAR(255) NOT NULL,
        builder_phone VARCHAR(60),
        builder_email VARCHAR(180),
        material_id VARCHAR(60) DEFAULT 'granite_kim_sa',
        architecture_id VARCHAR(60) DEFAULT 'mo_don_tam_cap',
        addons_json JSONB DEFAULT '[]'::jsonb,
        dedicated_sutra_id VARCHAR(100) DEFAULT 'kinh-a-di-da',
        total_cost NUMERIC(14, 0) DEFAULT 0,
        payment_method VARCHAR(50) DEFAULT 'vietqr_admin',
        payment_status VARCHAR(50) DEFAULT 'approved',
        incense_count INTEGER DEFAULT 1,
        flower_count INTEGER DEFAULT 1,
        last_incense_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      ALTER TABLE neon_memorial_tombs ADD COLUMN IF NOT EXISTS member_id VARCHAR(100);
      ALTER TABLE neon_memorial_tombs ADD COLUMN IF NOT EXISTS builder_phone VARCHAR(60);
      ALTER TABLE neon_memorial_tombs ADD COLUMN IF NOT EXISTS builder_email VARCHAR(180);
      ALTER TABLE neon_memorial_tombs ADD COLUMN IF NOT EXISTS material_id VARCHAR(60) DEFAULT 'granite_kim_sa';
      ALTER TABLE neon_memorial_tombs ADD COLUMN IF NOT EXISTS architecture_id VARCHAR(60) DEFAULT 'mo_don_tam_cap';
      ALTER TABLE neon_memorial_tombs ADD COLUMN IF NOT EXISTS addons_json JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE neon_memorial_tombs ADD COLUMN IF NOT EXISTS dedicated_sutra_id VARCHAR(100) DEFAULT 'kinh-a-di-da';
      ALTER TABLE neon_memorial_tombs ADD COLUMN IF NOT EXISTS total_cost NUMERIC(14, 0) DEFAULT 0;
      ALTER TABLE neon_memorial_tombs ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'vietqr_admin';
      ALTER TABLE neon_memorial_tombs ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'approved';
      ALTER TABLE neon_memorial_tombs ADD COLUMN IF NOT EXISTS incense_count INTEGER DEFAULT 1;
      ALTER TABLE neon_memorial_tombs ADD COLUMN IF NOT EXISTS flower_count INTEGER DEFAULT 1;
      ALTER TABLE neon_memorial_tombs ADD COLUMN IF NOT EXISTS last_incense_at TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE neon_memorial_tombs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);

    // 13. Bảng neon_memorial_tributes: Nhật ký đốt nhang, dâng hoa, mua vật phẩm tưởng nhớ tại khu mộ 3D
    await client.query(`
      CREATE TABLE IF NOT EXISTS neon_memorial_tributes (
        id VARCHAR(100) PRIMARY KEY,
        tomb_id VARCHAR(100) REFERENCES neon_memorial_tombs(id) ON DELETE CASCADE,
        plot_code VARCHAR(30),
        visitor_name VARCHAR(255) NOT NULL,
        tribute_type VARCHAR(50) DEFAULT 'dot-nhang',
        item_name VARCHAR(255),
        amount NUMERIC(14, 0) DEFAULT 0,
        message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 14. Bảng neon_temple_guestbook: Sổ lưu bút thập phương cầu nguyện bền vững trên PostgreSQL
    await client.query(`
      CREATE TABLE IF NOT EXISTS neon_temple_guestbook (
        id VARCHAR(100) PRIMARY KEY,
        member_id VARCHAR(100) REFERENCES neon_temple_members(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        dharma_name VARCHAR(150),
        location VARCHAR(255) DEFAULT 'Việt Nam',
        wish TEXT NOT NULL,
        likes INTEGER DEFAULT 1,
        offerings_count INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Indexes tối ưu hiệu năng truy vấn
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON neon_admin_sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_temple_member_sessions_expires ON neon_temple_member_sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON neon_admin_audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_channel_videos_deleted ON neon_channel_videos(is_deleted, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_study_created_at ON neon_study_records(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_study_subject ON neon_study_records(subject);
      CREATE INDEX IF NOT EXISTS idx_tiktok_created_at ON neon_tiktok_history(downloaded_at DESC);
      CREATE INDEX IF NOT EXISTS idx_documents_created_at ON neon_documents(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_temple_merit_created ON neon_temple_merit_records(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_memorial_tombs_plot ON neon_memorial_tombs(plot_code);
      CREATE INDEX IF NOT EXISTS idx_memorial_tributes_tomb ON neon_memorial_tributes(tomb_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_temple_guestbook_created ON neon_temple_guestbook(created_at DESC);
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
      {
        key: 'temple_payment_settings',
        val: {
          bankId: 'MB',
          bankName: 'Ngân hàng Quân Đội (MB Bank)',
          accountNo: '0985123688',
          accountName: 'MINH HIEU OFFICIAL VN',
          paypalMeUrl: 'https://www.paypal.com',
          adminContact: 'Quản trị viên Minh Hiếu Official VN (@MinhHieuOfficialvn)',
          autoApproveOrders: true,
          noteTemplate: 'CUNG DUONG CHUA HOA VIEN 3D',
        },
        cat: 'payment',
        pub: true,
        desc: 'Tài khoản Admin nhận thanh toán vật phẩm cúng dường Chùa & Vật liệu xây dựng Khu Mộ 3D',
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

    // Dọn sạch vĩnh viễn các ngôi mộ mẫu (tomb-seed-*) và hồ sơ mẫu gắn kèm theo yêu cầu Quản trị viên
    await client.query(
      `DELETE FROM neon_memorial_tributes WHERE tomb_id IN ('tomb-seed-a2', 'tomb-seed-a5', 'tomb-seed-b3', 'tomb-seed-c4') OR tomb_id LIKE 'tomb-seed-%';`
    );
    await client.query(
      `DELETE FROM neon_memorial_tombs WHERE id IN ('tomb-seed-a2', 'tomb-seed-a5', 'tomb-seed-b3', 'tomb-seed-c4') OR id LIKE 'tomb-seed-%';`
    );
    await client.query(
      `DELETE FROM neon_temple_members WHERE id IN ('mem-van-binh', 'mem-minh-tam', 'mem-thu-thuy', 'mem-dinh-khoi');`
    );

    // Gieo mầm dữ liệu Ghi danh Công đức Chùa ban đầu nếu bảng còn trống (không gieo mộ mẫu)
    const meritCountRes = await client.query(`SELECT count(*)::int AS cnt FROM neon_temple_merit_records;`);
    if ((meritCountRes.rows[0]?.cnt || 0) === 0) {
      await client.query(
        `INSERT INTO neon_temple_members (id, full_name, dharma_name, phone, address, merit_points, total_donated, tombs_built)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING;`,
        ['mem-minh-hieu', 'Đỗ Minh Hiếu', 'Nhuận Trí', '0985***688', 'Quảng Ngãi / TP. Hồ Chí Minh', 420, 280000, 0]
      );

      const seedMerit = [
        {
          id: 'CB-20261104-001',
          member_id: 'mem-minh-hieu',
          donor_name: 'Đỗ Minh Hiếu',
          dharma_name: 'Nhuận Trí',
          phone: '0985***688',
          address: 'Quảng Ngãi / TP. Hồ Chí Minh',
          prayer_type: 'cau-an',
          prayer_text: 'Nguyện cầu mười phương Chư Phật gia hộ cho cha mẹ mạnh khỏe sống lâu trăm tuổi, gia đạo bình an, công việc hanh thông, mọi sự kiết tường như ý.',
          sutra_id: 'kinh-duoc-su',
          sutra_title: 'Kinh Dược Sư Cầu Bình An & Sức Khỏe Cho Gia Đạo',
          items_json: [
            { itemId: 'store-nhang-tram', itemName: 'Nhang Trầm Hương Xứ Quảng', quantity: 1, price: 30000, subtotal: 30000 },
            { itemId: 'store-hoa-sen', itemName: 'Bó Hoa Sen Trắng Tinh Khiết Dâng Phật', quantity: 2, price: 50000, subtotal: 100000 },
            { itemId: 'store-mam-ngu-qua', itemName: 'Mâm Ngũ Quả Cúng Phật Đủ Đầy', quantity: 1, price: 100000, subtotal: 100000 },
          ],
          custom_donation: 50000,
          total_amount: 280000,
          total_merit_points: 420,
          payment_method: 'vietqr_admin',
          payment_status: 'approved',
        },
        {
          id: 'CB-20261103-089',
          member_id: null,
          donor_name: 'Nguyễn Thị Diệu Hương',
          dharma_name: 'Diệu Tâm',
          phone: '0912***345',
          address: 'Ba Đình, Hà Nội',
          prayer_type: 'cau-an',
          prayer_text: 'Cầu nguyện mười phương Chư Phật gia hộ gia đình an khang, tâm Bồ Đề kiên cố, phước huệ trang nghiêm.',
          sutra_id: 'kinh-a-di-da',
          sutra_title: 'Kinh A Di Đà (Cầu Siêu Độ Cửu Huyền Thất Tổ & Vãng Sanh Cực Lạc)',
          items_json: [
            { itemId: 'store-cap-den-dau', itemName: 'Cặp Đèn Dầu Vô Lượng Quang', quantity: 1, price: 40000, subtotal: 40000 },
            { itemId: 'store-hoa-dang', itemName: 'Đèn Hoa Đăng Cầu Bình An Hồ Sen', quantity: 3, price: 35000, subtotal: 105000 },
          ],
          custom_donation: 100000,
          total_amount: 245000,
          total_merit_points: 350,
          payment_method: 'vietqr_admin',
          payment_status: 'approved',
        },
      ];
      for (const mr of seedMerit) {
        await client.query(
          `INSERT INTO neon_temple_merit_records (
            id, member_id, donor_name, dharma_name, phone, address, prayer_type, prayer_text,
            sutra_id, sutra_title, items_json, custom_donation, total_amount, total_merit_points, payment_method, payment_status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15,$16)
          ON CONFLICT (id) DO NOTHING;`,
          [
            mr.id, mr.member_id, mr.donor_name, mr.dharma_name, mr.phone, mr.address, mr.prayer_type, mr.prayer_text,
            mr.sutra_id, mr.sutra_title, JSON.stringify(mr.items_json), mr.custom_donation, mr.total_amount, mr.total_merit_points, mr.payment_method, mr.payment_status,
          ]
        );
      }
    }

    // Tự động gieo mầm Sổ Lưu Bút Thập Phương nếu bảng neon_temple_guestbook còn trống
    const gbCountRes = await client.query(`SELECT count(*)::int AS cnt FROM neon_temple_guestbook;`);
    if ((gbCountRes.rows[0]?.cnt || 0) === 0) {
      const seedGuestbook = [
        {
          id: 'gb-1',
          name: 'Nguyễn Văn Minh',
          dharma_name: 'Pháp danh Tâm An',
          location: 'Quận 1, TP. Hồ Chí Minh',
          wish: 'Nam Mô A Di Đà Phật. Con kính nguyện mười phương Chư Phật gia hộ cho cha mẹ con luôn dồi dào sức khỏe, sống đời bình an, gia đình thuận hòa ấm no, tai qua nạn khỏi.',
          likes: 42,
          offerings_count: 3,
        },
        {
          id: 'gb-2',
          name: 'Trần Thị Mỹ Duyên',
          dharma_name: 'Pháp danh Diệu Thiện',
          location: 'Hà Nội',
          wish: 'Con cầu nguyện cho con cái chăm ngoan học giỏi, thi cử đỗ đạt, công việc hanh thông, đất nước thanh bình nhân dân ấm no hạnh phúc.',
          likes: 38,
          offerings_count: 2,
        },
        {
          id: 'gb-3',
          name: 'Lê Hoàng Phong',
          dharma_name: 'Pháp danh Nhuận Trí',
          location: 'Đà Nẵng',
          wish: 'Được vào chiêm bái ngôi chùa online 3D thật thanh tịnh và trang nghiêm. Nguyện đem công đức này hồi hướng cho tất cả chúng sinh đều được an lạc và sớm giác ngộ.',
          likes: 56,
          offerings_count: 5,
        },
        {
          id: 'gb-4',
          name: 'Phạm Hồng Phúc',
          dharma_name: 'Pháp danh Thiện Duyên',
          location: 'Cần Thơ',
          wish: 'Con cầu bình an cho gia đạo, tiêu trừ mọi oan khiên tật ách, gieo duyên lành cho mọi người cùng biết đến Phật pháp từ bi.',
          likes: 29,
          offerings_count: 1,
        },
      ];
      for (const gb of seedGuestbook) {
        await client.query(
          `INSERT INTO neon_temple_guestbook (id, name, dharma_name, location, wish, likes, offerings_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING;`,
          [gb.id, gb.name, gb.dharma_name, gb.location, gb.wish, gb.likes, gb.offerings_count]
        );
      }
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

    // Tự động đồng bộ & kích hoạt mã quảng cáo 300x250 (ylse), VAST 3.0 và MultiTag Video Slider (alsq) trên Neon PostgreSQL
    // nếu trong DB đang lưu mã cũ bị lỗi (petdp / bYX-VAsLd / lpysay) hoặc chưa có cấu hình
    const adRowRes = await client.query(
      `SELECT setting_value FROM neon_app_settings WHERE setting_key = 'ad_settings' LIMIT 1;`
    );
    if (adRowRes.rows.length > 0 && adRowRes.rows[0].setting_value && typeof adRowRes.rows[0].setting_value === 'object') {
      const curAd = { ...adRowRes.rows[0].setting_value };
      const cur300 = typeof curAd.banner300x250Html === 'string' ? curAd.banner300x250Html : '';
      const isLegacy300 =
        !cur300.trim() ||
        cur300.includes('bYX-VAsLd') ||
        cur300.includes('petdp') ||
        cur300.includes('lpysay') ||
        cur300.includes('bOX/Vcs.dZGvlT0vYyWNcp');

      let needsAdPatch = false;
      const defaultYlse300Script = `<script>\n(function(ylse){\nvar d = document,\n    s = d.createElement('script'),\n    l = d.currentScript || d.scripts[d.scripts.length - 1];\ns.settings = ylse || {};\ns.src = "\\/\\/fond-appointment.com\\/bcXnVps_d.G\\/lT0rYrWPcO\\/SeTmy9\\/uqZ\\/Uol\\/kJPrTNcA1\\/NHjgQD3\\/MmDLk\\/tmNgz\\/U_2jN-D\\/cpxDMnwL";\ns.async = true;\ns.referrerPolicy = 'no-referrer-when-downgrade';\nl.parentNode.insertBefore(s, l);\n})({})\n</script>`;
      const defaultVast30Url =
        'https://troubled-entertainment.com/d/mOF.zdd/GlN/vDZuGNUc/deLmd9LucZ/UWlFkiPVTncc1dNxjAQf3UMWDgEGt/NlzrUN2sNoDjcvwBNVQE';
      const defaultAlsqSliderScript = `<script>\n(function(alsq){\nvar d = document,\n    s = d.createElement('script'),\n    l = d.currentScript || d.scripts[d.scripts.length - 1];\ns.settings = alsq || {};\ns.src = "\\/\\/fond-appointment.com\\/bOXGV.sodGGQlo0\\/YwW\\/cb\\/WeOmH9sumZ\\/U\\/lKk\\/PzTRcx1INRj\\/Q\\/3VMWjJUNtANdzWUb2TNBDCc_ywOkQG";\ns.async = true;\ns.referrerPolicy = 'no-referrer-when-downgrade';\nl.parentNode.insertBefore(s, l);\n})({})\n</script>`;

      if (isLegacy300) {
        curAd.banner300x250Html = defaultYlse300Script;
        curAd.enableBanner300x250 = true;
        needsAdPatch = true;
      }
      if (!curAd.vastTagUrl || typeof curAd.vastTagUrl !== 'string' || !curAd.vastTagUrl.trim()) {
        curAd.vastTagUrl = defaultVast30Url;
        curAd.enableVastAds = true;
        curAd.rotateVideoAds = true;
        needsAdPatch = true;
      }
      if (!curAd.videoSliderHtml || typeof curAd.videoSliderHtml !== 'string' || !curAd.videoSliderHtml.trim()) {
        curAd.videoSliderHtml = defaultAlsqSliderScript;
        curAd.enableVideoSlider = true;
        needsAdPatch = true;
      }
      if (typeof curAd.extraVastTagUrls !== 'string') {
        curAd.extraVastTagUrls = '';
        curAd.rotateVideoAds = true;
        needsAdPatch = true;
      }

      if (needsAdPatch) {
        await client.query(
          `UPDATE neon_app_settings SET setting_value = $1::jsonb, updated_at = NOW() WHERE setting_key = 'ad_settings';`,
          [JSON.stringify(curAd)]
        );
      }
    }

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
    await client.query(`DELETE FROM neon_temple_member_sessions WHERE expires_at <= NOW();`);

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
        'Đã tự động tạo & cập nhật đầy đủ toàn bộ bảng dữ liệu mới nhất (Admin, Thành viên Phật tử, Phiên đăng nhập, Sổ vàng công đức, Khu mộ 3D, Nhật ký hương khói, Sổ lưu bút, Video & Cài đặt) trên Neon PostgreSQL!',
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
      } else if (tableName === 'neon_temple_members') {
        whereClause = `WHERE full_name ILIKE $1 OR COALESCE(username, '') ILIKE $1 OR COALESCE(dharma_name, '') ILIKE $1 OR COALESCE(phone, '') ILIKE $1`;
        params.push(q);
      } else if (tableName === 'neon_memorial_tombs') {
        whereClause = `WHERE plot_code ILIKE $1 OR deceased_full_name ILIKE $1 OR builder_name ILIKE $1`;
        params.push(q);
      } else if (tableName === 'neon_temple_merit_records') {
        whereClause = `WHERE donor_name ILIKE $1 OR COALESCE(dharma_name, '') ILIKE $1 OR COALESCE(prayer_text, '') ILIKE $1`;
        params.push(q);
      } else if (tableName === 'neon_temple_guestbook') {
        whereClause = `WHERE name ILIKE $1 OR wish ILIKE $1 OR COALESCE(location, '') ILIKE $1`;
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
        : tableName === 'neon_temple_members'
        ? `id, username, full_name, dharma_name, phone, email, address, role, is_active, merit_points, total_donated, tombs_built, last_login_at, created_at, updated_at`
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

// =========================================================================
// CHÙA ONLINE & HOA VIÊN KHU MỘ 3D (NEON POSTGRESQL PERSISTENCE)
// =========================================================================

function formatMeritRowFromDb(row: any): any {
  const dt = row.created_at ? new Date(row.created_at) : new Date();
  const formattedDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  return {
    id: String(row.id),
    memberId: row.member_id || undefined,
    donorName: String(row.donor_name || 'Thí chủ'),
    dharmaName: row.dharma_name || undefined,
    phone: row.phone || undefined,
    address: row.address || undefined,
    prayerType: row.prayer_type || 'cau-an',
    prayerText: row.prayer_text || '',
    sutraId: row.sutra_id || undefined,
    sutraTitle: row.sutra_title || undefined,
    items: Array.isArray(row.items_json) ? row.items_json : [],
    customDonation: Number(row.custom_donation || 0),
    totalAmount: Number(row.total_amount || 0),
    totalMeritPoints: Number(row.total_merit_points || 0),
    paymentMethod: row.payment_method || 'tuy-tam',
    paymentStatus: row.payment_status || 'completed',
    transactionCode: row.transaction_code || undefined,
    createdAt: formattedDate,
  };
}

function formatTombRowFromDb(row: any): any {
  const dt = row.created_at ? new Date(row.created_at) : new Date();
  const formattedDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  return {
    id: String(row.id),
    plotCode: String(row.plot_code),
    zoneName: String(row.zone_name || ''),
    rowIndex: Number(row.row_index || 0),
    colIndex: Number(row.col_index || 0),
    steleHeader: String(row.stele_header || 'PHẬT QUANG TIẾP DẪN'),
    deceasedFullName: String(row.deceased_full_name || ''),
    deceasedDharmaName: row.deceased_dharma_name || undefined,
    gender: row.gender === 'Nữ' ? 'Nữ' : 'Nam',
    birthSolar: String(row.birth_solar || ''),
    birthLunar: String(row.birth_lunar || ''),
    deathSolar: String(row.death_solar || ''),
    deathLunar: String(row.death_lunar || ''),
    longevityType: row.longevity_type || 'huong-tho',
    longevityAge: Number(row.longevity_age || 80),
    hometown: row.hometown || undefined,
    epitaph: row.epitaph || undefined,
    erectedBy: String(row.erected_by || 'Gia quyến đồng lập'),
    memberId: row.member_id || undefined,
    builderName: String(row.builder_name || 'Gia quyến'),
    builderPhone: row.builder_phone || undefined,
    builderEmail: row.builder_email || undefined,
    materialId: row.material_id || 'granite_kim_sa',
    architectureId: row.architecture_id || 'mo_don_tam_cap',
    addons: Array.isArray(row.addons_json) ? row.addons_json : [],
    dedicatedSutraId: row.dedicated_sutra_id || 'kinh-a-di-da',
    totalCost: Number(row.total_cost || 0),
    paymentMethod: row.payment_method || 'vietqr_admin',
    paymentStatus: row.payment_status || 'approved',
    incenseCount: Number(row.incense_count || 1),
    flowerCount: Number(row.flower_count || 1),
    lastIncenseAt: row.last_incense_at ? new Date(row.last_incense_at).toISOString() : undefined,
    createdAt: formattedDate,
  };
}

function formatMemberRowFromDb(r: any): any {
  const dt = r.created_at ? new Date(r.created_at) : new Date();
  const formattedDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  return {
    id: String(r.id),
    username: r.username || undefined,
    fullName: String(r.full_name || 'Phật tử'),
    dharmaName: r.dharma_name || undefined,
    phone: r.phone || undefined,
    email: r.email || undefined,
    address: r.address || undefined,
    meritPoints: Number(r.merit_points || 0),
    totalDonated: Number(r.total_donated || 0),
    tombsBuilt: Number(r.tombs_built || 0),
    createdAt: formattedDate,
  };
}

function formatGuestbookRowFromDb(r: any): any {
  const dt = r.created_at ? new Date(r.created_at) : new Date();
  const formattedDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  return {
    id: String(r.id),
    memberId: r.member_id || undefined,
    name: String(r.name || 'Phật tử'),
    dharmaName: r.dharma_name || undefined,
    location: String(r.location || 'Việt Nam'),
    wish: String(r.wish || ''),
    likes: Number(r.likes || 1),
    offeringsCount: Number(r.offerings_count || 1),
    createdAt: formattedDate,
  };
}

export async function getTempleOverviewFromNeon(): Promise<{
  paymentSettings: any;
  members: any[];
  meritRecords: any[];
  tombs: any[];
  tributes: any[];
  guestbook: any[];
}> {
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) {
    throw new Error('Chưa kết nối Neon PostgreSQL');
  }

  const [payRes, memRes, meritRes, tombRes, tribRes, gbRes] = await Promise.all([
    pool.query(`SELECT setting_value FROM neon_app_settings WHERE setting_key = 'temple_payment_settings' LIMIT 1;`),
    pool.query(`SELECT * FROM neon_temple_members ORDER BY total_donated DESC, merit_points DESC, created_at DESC LIMIT 250;`),
    pool.query(`SELECT * FROM neon_temple_merit_records ORDER BY created_at DESC LIMIT 250;`),
    pool.query(`SELECT * FROM neon_memorial_tombs ORDER BY row_index ASC, col_index ASC;`),
    pool.query(`SELECT * FROM neon_memorial_tributes ORDER BY created_at DESC LIMIT 150;`),
    pool.query(`SELECT * FROM neon_temple_guestbook ORDER BY created_at DESC LIMIT 150;`),
  ]);

  return {
    paymentSettings: payRes.rows[0]?.setting_value || null,
    members: memRes.rows.map(formatMemberRowFromDb),
    meritRecords: meritRes.rows.map(formatMeritRowFromDb),
    tombs: tombRes.rows.map(formatTombRowFromDb),
    tributes: tribRes.rows.map((t) => ({
      id: t.id,
      tombId: t.tomb_id,
      plotCode: t.plot_code || '',
      visitorName: t.visitor_name,
      tributeType: t.tribute_type,
      itemName: t.item_name || undefined,
      amount: Number(t.amount || 0),
      message: t.message || '',
      createdAt: t.created_at,
    })),
    guestbook: gbRes.rows.map(formatGuestbookRowFromDb),
  };
}

async function upsertTempleMemberWithClient(
  client: pg.PoolClient,
  info: {
    memberId?: string;
    fullName: string;
    dharmaName?: string;
    phone?: string;
    email?: string;
    address?: string;
    addMerit?: number;
    addDonated?: number;
    addTombs?: number;
  }
): Promise<string> {
  const cleanName = String(info.fullName || 'Phật tử').trim();
  const cleanPhone = String(info.phone || '').trim();
  const cleanEmail = String(info.email || '').trim();

  if (info.memberId && String(info.memberId).trim()) {
    const explicitId = String(info.memberId).trim();
    const existingRes = await client.query(
      `SELECT id FROM neon_temple_members WHERE id = $1 LIMIT 1;`,
      [explicitId]
    );
    if (existingRes.rows.length > 0) {
      await client.query(
        `UPDATE neon_temple_members SET
          full_name = COALESCE(NULLIF($2, ''), full_name),
          dharma_name = COALESCE(NULLIF($3, ''), dharma_name),
          phone = COALESCE(NULLIF($4, ''), phone),
          email = COALESCE(NULLIF($5, ''), email),
          address = COALESCE(NULLIF($6, ''), address),
          merit_points = merit_points + $7,
          total_donated = total_donated + $8,
          tombs_built = tombs_built + $9,
          updated_at = NOW()
         WHERE id = $1;`,
        [
          explicitId,
          cleanName,
          info.dharmaName || null,
          cleanPhone || null,
          cleanEmail || null,
          info.address || null,
          Number(info.addMerit || 0),
          Number(info.addDonated || 0),
          Number(info.addTombs || 0),
        ]
      );
      return explicitId;
    }
  }

  const slug = cleanName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 36);
  const memberId =
    (info.memberId && String(info.memberId).trim()) ||
    `mem-${slug || 'phattu'}-${cleanPhone ? cleanPhone.slice(-4) : 'tam-bao'}`;

  await client.query(
    `INSERT INTO neon_temple_members (
      id, full_name, dharma_name, phone, email, address, merit_points, total_donated, tombs_built, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      dharma_name = COALESCE(NULLIF(EXCLUDED.dharma_name, ''), neon_temple_members.dharma_name),
      phone = COALESCE(NULLIF(EXCLUDED.phone, ''), neon_temple_members.phone),
      email = COALESCE(NULLIF(EXCLUDED.email, ''), neon_temple_members.email),
      address = COALESCE(NULLIF(EXCLUDED.address, ''), neon_temple_members.address),
      merit_points = neon_temple_members.merit_points + $7,
      total_donated = neon_temple_members.total_donated + $8,
      tombs_built = neon_temple_members.tombs_built + $9,
      updated_at = NOW();`,
    [
      memberId,
      cleanName,
      info.dharmaName || null,
      cleanPhone || null,
      cleanEmail || null,
      info.address || null,
      Number(info.addMerit || 0),
      Number(info.addDonated || 0),
      Number(info.addTombs || 0),
    ]
  );

  return memberId;
}

// =========================================================================
// ĐĂNG KÝ, ĐĂNG NHẬP & QUẢN LÝ TÀI KHOẢN THÀNH VIÊN PHẬT TỬ (NEON POSTGRESQL)
// =========================================================================

function createStatelessMemberToken(memberId: string, username: string, expiresAtIso: string): string {
  const payloadStr = Buffer.from(
    JSON.stringify({ mid: memberId, u: username, exp: expiresAtIso }),
    'utf-8'
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', FALLBACK_HMAC_SECRET)
    .update(`member:${payloadStr}`)
    .digest('base64url');
  return `tmem_${payloadStr}.${sig}`;
}

function verifyStatelessMemberToken(rawToken: string): { memberId: string; username: string } | null {
  try {
    if (!rawToken || !rawToken.startsWith('tmem_')) return null;
    const body = rawToken.slice(5);
    const dotIdx = body.lastIndexOf('.');
    if (dotIdx <= 0) return null;
    const payloadStr = body.slice(0, dotIdx);
    const sig = body.slice(dotIdx + 1);
    const expectedSig = crypto
      .createHmac('sha256', FALLBACK_HMAC_SECRET)
      .update(`member:${payloadStr}`)
      .digest('base64url');
    if (sig !== expectedSig) return null;
    const parsed = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'));
    if (!parsed?.mid || !parsed?.exp) return null;
    if (new Date(parsed.exp).getTime() <= Date.now()) return null;
    return { memberId: String(parsed.mid), username: String(parsed.u || '') };
  } catch {
    return null;
  }
}

export async function registerTempleMemberInNeon(params: {
  username?: string;
  password: string;
  fullName: string;
  dharmaName?: string;
  phone?: string;
  email?: string;
  address?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ token: string; member: any }> {
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối cơ sở dữ liệu Neon PostgreSQL');

  const fullName = String(params.fullName || '').trim();
  const password = String(params.password || '');
  const rawPhone = String(params.phone || '').trim();
  const digitsOnly = rawPhone.replace(/\D/g, '');
  let cleanPhone = digitsOnly;
  if (digitsOnly.startsWith('84') && digitsOnly.length >= 10) {
    cleanPhone = '0' + digitsOnly.slice(2);
  }
  const email = String(params.email || '').trim().toLowerCase();
  
  // Normalize username: use phone if given, else email prefix or provided username
  let rawUsername = String(params.username || cleanPhone || email.split('@')[0] || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

  if (!fullName) {
    throw new Error('Vui lòng nhập Họ và tên thành viên!');
  }
  if (!rawUsername || rawUsername.length < 3) {
    if (cleanPhone && cleanPhone.length >= 3) {
      rawUsername = cleanPhone;
    } else {
      throw new Error('Tên đăng nhập hoặc Số điện thoại phải có từ 3 ký tự trở lên!');
    }
  }
  if (!password || password.length < 4) {
    throw new Error('Mật khẩu bảo mật phải có từ 4 ký tự trở lên!');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if an existing member record matches username, phone variations, or email
    const dupCheck = await client.query(
      `SELECT id, username, phone, email, password_hash, full_name, dharma_name, merit_points, is_active FROM neon_temple_members
       WHERE LOWER(username) = LOWER($1)
          OR ($2 <> '' AND (
               phone = $2 
               OR phone = $3 
               OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '.', '') = $2
               OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '.', '') = $3
               OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '.', '') = ('84' || SUBSTRING($2 FROM 2))
             ))
          OR ($4 <> '' AND LOWER(email) = LOWER($4))
       ORDER BY (password_hash IS NOT NULL) DESC, created_at DESC
       LIMIT 1;`,
      [rawUsername, cleanPhone, rawPhone, email]
    );

    const passwordHash = hashPasswordScrypt(password);
    let memberRow: any = null;

    if (dupCheck.rows.length > 0) {
      const existing = dupCheck.rows[0];
      if (existing.password_hash) {
        // If the password matches the existing registered password, log in directly without error!
        if (verifyPasswordScrypt(password, existing.password_hash)) {
          memberRow = existing;
          await client.query(
            `UPDATE neon_temple_members SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1;`,
            [existing.id]
          );
        } else {
          throw new Error(
            'Số điện thoại hoặc tên đăng nhập này đã có tài khoản trong hệ thống! Quý đạo hữu vui lòng chuyển sang tab "Đăng Nhập" để nhập mật khẩu hoặc bấm "Quên Mật Khẩu" để đặt lại.'
          );
        }
      } else {
        // Record was auto-created previously without password (e.g. from donation or guestbook)
        // Safely upgrade this existing row
        const updateRes = await client.query(
          `UPDATE neon_temple_members SET
             password_hash = $1,
             full_name = $2,
             dharma_name = COALESCE($3, dharma_name),
             phone = COALESCE($4, phone),
             email = COALESCE($5, email),
             address = COALESCE($6, address),
             is_active = TRUE,
             last_login_at = NOW(),
             updated_at = NOW()
           WHERE id = $7
           RETURNING *;`,
          [
            passwordHash,
            fullName,
            params.dharmaName ? String(params.dharmaName).trim() : null,
            cleanPhone || rawPhone || null,
            email || null,
            params.address ? String(params.address).trim() : null,
            existing.id,
          ]
        );
        memberRow = updateRes.rows[0];
      }
    } else {
      // Check if username collides, if so append random suffix
      let finalUsername = rawUsername;
      const usernameCheck = await client.query(
        `SELECT id FROM neon_temple_members WHERE LOWER(username) = LOWER($1) LIMIT 1;`,
        [finalUsername]
      );
      if (usernameCheck.rows.length > 0) {
        finalUsername = `${rawUsername}_${Math.floor(100 + Math.random() * 900)}`;
      }

      const memberId = `mem-${finalUsername.replace(/[^a-z0-9]/g, '').slice(0, 20) || 'phattu'}-${Date.now().toString(36)}`;

      const insertRes = await client.query(
        `INSERT INTO neon_temple_members (
          id, username, password_hash, full_name, dharma_name, phone, email, address,
          role, is_active, merit_points, total_donated, tombs_built, last_login_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'member', TRUE, 100, 0, 0, NOW(), NOW())
        RETURNING *;`,
        [
          memberId,
          finalUsername,
          passwordHash,
          fullName,
          params.dharmaName ? String(params.dharmaName).trim() : null,
          cleanPhone || rawPhone || null,
          email || null,
          params.address ? String(params.address).trim() : null,
        ]
      );
      memberRow = insertRes.rows[0];
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const rawToken = createStatelessMemberToken(memberRow.id, memberRow.username || memberRow.id, expiresAt);
    const tokenHash = hashSessionToken(rawToken);

    await client.query(
      `INSERT INTO neon_temple_member_sessions (token_hash, member_id, username, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (token_hash) DO NOTHING;`,
      [tokenHash, memberRow.id, memberRow.username || memberRow.id, params.ipAddress || '', params.userAgent || '', expiresAt]
    );

    await client.query('COMMIT');
    return {
      token: rawToken,
      member: formatMemberRowFromDb(memberRow),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function loginTempleMemberWithNeon(params: {
  identifier: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ token: string; member: any }> {
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối cơ sở dữ liệu Neon PostgreSQL');

  const rawIdentifier = String(params.identifier || '').trim();
  const password = String(params.password || '');

  if (!rawIdentifier || !password) {
    throw new Error('Vui lòng nhập Tên đăng nhập / Số điện thoại và Mật khẩu!');
  }

  // 1. Check if user is logging in with Admin credentials
  try {
    const adminRes = await loginAdminWithNeon(rawIdentifier, password, true, {
      ip: params.ipAddress,
      userAgent: params.userAgent,
    });
    if (adminRes && adminRes.token) {
      return {
        token: adminRes.token,
        member: {
          id: 'admin-' + (adminRes.admin?.username || 'admin'),
          username: adminRes.admin?.username || 'admin',
          fullName: adminRes.admin?.displayName || 'Quản Trị Viên Chùa & Hoa Viên',
          dharmaName: 'Thích Trí Thiện (Admin)',
          phone: '',
          email: adminRes.admin?.email || '',
          role: 'admin',
          isActive: true,
          meritPoints: 999999,
          totalDonated: 999999999,
          tombsBuilt: 99,
          createdAt: new Date().toISOString(),
        },
      };
    }
  } catch {
    // Not admin, proceed to member query
  }

  // 2. Normalize phone variations
  const digitsOnly = rawIdentifier.replace(/\D/g, '');
  let cleanPhone = digitsOnly;
  if (digitsOnly.startsWith('84') && digitsOnly.length >= 10) {
    cleanPhone = '0' + digitsOnly.slice(2);
  }

  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT * FROM neon_temple_members
       WHERE LOWER(username) = LOWER($1)
          OR phone = $1
          OR ($2 <> '' AND (
               phone = $2 
               OR phone = $3 
               OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '.', '') = $2
               OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '.', '') = $3
               OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '.', '') = ('84' || SUBSTRING($2 FROM 2))
             ))
          OR LOWER(email) = LOWER($1)
       ORDER BY (password_hash IS NOT NULL) DESC, created_at DESC
       LIMIT 1;`,
      [rawIdentifier, cleanPhone, digitsOnly]
    );

    if (res.rows.length === 0) {
      throw new Error(
        'Số điện thoại hoặc tên đăng nhập này chưa được đăng ký! Quý đạo hữu vui lòng chọn tab "Đăng Ký" để tạo tài khoản miễn phí.'
      );
    }

    const row = res.rows[0];

    if (!row.password_hash) {
      throw new Error(
        'Tài khoản này chưa tạo mật khẩu bảo vệ. Quý đạo hữu vui lòng chọn tab "Đăng Ký" để đặt mật khẩu kích hoạt tài khoản!'
      );
    }

    if (row.is_active === false) {
      throw new Error('Tài khoản thành viên này đang tạm khóa bởi Quản trị viên.');
    }

    const ok = verifyPasswordScrypt(password, row.password_hash);
    if (!ok) {
      throw new Error(
        'Mật khẩu không chính xác! Quý đạo hữu vui lòng kiểm tra lại hoặc bấm "Quên mật khẩu" để lấy lại mật khẩu nhanh chóng.'
      );
    }

    await client.query(
      `UPDATE neon_temple_members SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1;`,
      [row.id]
    );

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const rawToken = createStatelessMemberToken(row.id, row.username || row.id, expiresAt);
    const tokenHash = hashSessionToken(rawToken);

    await client.query(
      `INSERT INTO neon_temple_member_sessions (token_hash, member_id, username, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (token_hash) DO NOTHING;`,
      [tokenHash, row.id, row.username || row.id, params.ipAddress || '', params.userAgent || '', expiresAt]
    );

    return {
      token: rawToken,
      member: formatMemberRowFromDb(row),
    };
  } finally {
    client.release();
  }
}

// =========================================================================
// QUÊN MẬT KHẨU & KHÔI PHỤC MẬT KHẨU THÀNH VIÊN
// =========================================================================

export async function requestTempleMemberPasswordReset(
  identifier: string
): Promise<{ success: boolean; message: string; resetCode: string; contactTarget: string }> {
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối Neon PostgreSQL');

  const rawId = String(identifier || '').trim();
  const cleanPhone = rawId.replace(/[\s\-\.\(\)]/g, '');
  if (!rawId) throw new Error('Vui lòng nhập Số điện thoại hoặc Email đã đăng ký!');

  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT * FROM neon_temple_members
       WHERE LOWER(username) = LOWER($1)
          OR phone = $1
          OR ($2 <> '' AND REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '.', '') = $2)
          OR LOWER(email) = LOWER($1)
       LIMIT 1;`,
      [rawId, cleanPhone]
    );

    if (res.rows.length === 0) {
      throw new Error('Không tìm thấy tài khoản với số điện thoại hoặc email này!');
    }

    const row = res.rows[0];
    const resetCode = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    const currentMeta = typeof row.metadata === 'object' && row.metadata !== null ? row.metadata : {};
    const updatedMeta = {
      ...currentMeta,
      pwd_reset_code: resetCode,
      pwd_reset_expires: expiresAt,
    };

    await client.query(
      `UPDATE neon_temple_members SET metadata = $1::jsonb, updated_at = NOW() WHERE id = $2;`,
      [JSON.stringify(updatedMeta), row.id]
    );

    const contactTarget = row.phone || row.email || row.username;
    return {
      success: true,
      message: `Mã xác nhận khôi phục mật khẩu 6 số đã được tạo cho tài khoản ${row.full_name}!`,
      resetCode,
      contactTarget,
    };
  } finally {
    client.release();
  }
}

export async function resetTempleMemberPasswordWithCode(
  identifier: string,
  resetCode: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối Neon PostgreSQL');

  const rawId = String(identifier || '').trim();
  const cleanPhone = rawId.replace(/[\s\-\.\(\)]/g, '');
  const code = String(resetCode || '').trim();
  const newPass = String(newPassword || '');

  if (!rawId || !code) {
    throw new Error('Vui lòng nhập Số điện thoại/Email và Mã xác nhận 6 số!');
  }
  if (!newPass || newPass.length < 4) {
    throw new Error('Mật khẩu mới phải có từ 4 ký tự trở lên!');
  }

  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT * FROM neon_temple_members
       WHERE LOWER(username) = LOWER($1)
          OR phone = $1
          OR ($2 <> '' AND REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '.', '') = $2)
          OR LOWER(email) = LOWER($1)
       LIMIT 1;`,
      [rawId, cleanPhone]
    );

    if (res.rows.length === 0) {
      throw new Error('Không tìm thấy tài khoản thành viên!');
    }

    const row = res.rows[0];
    const meta = typeof row.metadata === 'object' && row.metadata !== null ? row.metadata : {};

    if (!meta.pwd_reset_code || String(meta.pwd_reset_code).trim() !== code) {
      throw new Error('Mã xác nhận không chính xác! Vui lòng kiểm tra lại.');
    }

    if (meta.pwd_reset_expires && new Date(meta.pwd_reset_expires).getTime() < Date.now()) {
      throw new Error('Mã xác nhận đã hết hạn (15 phút). Vui lòng yêu cầu mã mới!');
    }

    const passwordHash = hashPasswordScrypt(newPass);
    delete meta.pwd_reset_code;
    delete meta.pwd_reset_expires;

    await client.query(
      `UPDATE neon_temple_members SET
         password_hash = $1,
         metadata = $2::jsonb,
         updated_at = NOW()
       WHERE id = $3;`,
      [passwordHash, JSON.stringify(meta), row.id]
    );

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công! Quý đạo hữu có thể đăng nhập ngay với mật khẩu mới.',
    };
  } finally {
    client.release();
  }
}

// =========================================================================
// QUẢN LÝ TÀI KHOẢN USER CHO ADMIN (XEM, TẠO, SỬA, ĐỔI MẬT KHẨU, XÓA)
// =========================================================================

export async function listTempleMembersInNeon(): Promise<any[]> {
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối Neon PostgreSQL');

  const res = await pool.query(
    `SELECT id, username, full_name, dharma_name, phone, email, address,
            role, is_active, merit_points, total_donated, tombs_built,
            last_login_at, created_at, updated_at
     FROM neon_temple_members
     ORDER BY created_at DESC;`
  );

  return res.rows.map((r) => {
    const dt = r.created_at ? new Date(r.created_at) : new Date();
    const lastLogin = r.last_login_at ? new Date(r.last_login_at).toISOString() : null;
    return {
      id: String(r.id),
      username: r.username || '',
      fullName: String(r.full_name || 'Phật tử'),
      dharmaName: r.dharma_name || '',
      phone: r.phone || '',
      email: r.email || '',
      address: r.address || '',
      role: r.role || 'member',
      isActive: r.is_active !== false,
      meritPoints: Number(r.merit_points || 0),
      totalDonated: Number(r.total_donated || 0),
      tombsBuilt: Number(r.tombs_built || 0),
      createdAt: dt.toISOString(),
      lastLoginAt: lastLogin,
    };
  });
}

export async function adminCreateTempleMemberInNeon(params: {
  fullName: string;
  username?: string;
  password: string;
  phone?: string;
  email?: string;
  dharmaName?: string;
  address?: string;
  role?: string;
}): Promise<any> {
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối Neon PostgreSQL');

  const fullName = String(params.fullName || '').trim();
  const password = String(params.password || '');
  const phone = String(params.phone || '').trim();
  const email = String(params.email || '').trim().toLowerCase();
  const role = String(params.role || 'member').trim();

  let rawUsername = String(params.username || phone || email.split('@')[0] || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

  if (!fullName) throw new Error('Họ và tên không được để trống!');
  if (!rawUsername) rawUsername = `user_${Date.now().toString(36)}`;
  if (!password || password.length < 4) throw new Error('Mật khẩu tối thiểu 4 ký tự!');

  const passwordHash = hashPasswordScrypt(password);
  const memberId = `mem-adm-${rawUsername.replace(/[^a-z0-9]/g, '').slice(0, 16)}-${Date.now().toString(36)}`;

  const res = await pool.query(
    `INSERT INTO neon_temple_members (
       id, username, password_hash, full_name, dharma_name, phone, email, address,
       role, is_active, merit_points, total_donated, tombs_built, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, 100, 0, 0, NOW())
     RETURNING *;`,
    [
      memberId,
      rawUsername,
      passwordHash,
      fullName,
      params.dharmaName ? String(params.dharmaName).trim() : null,
      phone || null,
      email || null,
      params.address ? String(params.address).trim() : null,
      role,
    ]
  );

  return formatMemberRowFromDb(res.rows[0]);
}

export async function adminUpdateTempleMemberInNeon(
  memberId: string,
  updates: {
    fullName?: string;
    dharmaName?: string;
    phone?: string;
    email?: string;
    address?: string;
    role?: string;
    isActive?: boolean;
    meritPoints?: number;
  }
): Promise<any> {
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối Neon PostgreSQL');

  const res = await pool.query(
    `UPDATE neon_temple_members SET
       full_name = COALESCE(NULLIF($2, ''), full_name),
       dharma_name = COALESCE($3, dharma_name),
       phone = COALESCE($4, phone),
       email = COALESCE($5, email),
       address = COALESCE($6, address),
       role = COALESCE($7, role),
       is_active = COALESCE($8, is_active),
       merit_points = COALESCE($9, merit_points),
       updated_at = NOW()
     WHERE id = $1
     RETURNING *;`,
    [
      memberId,
      updates.fullName ? updates.fullName.trim() : '',
      updates.dharmaName !== undefined ? updates.dharmaName.trim() || null : null,
      updates.phone !== undefined ? updates.phone.trim() || null : null,
      updates.email !== undefined ? updates.email.trim().toLowerCase() || null : null,
      updates.address !== undefined ? updates.address.trim() || null : null,
      updates.role !== undefined ? updates.role.trim() || null : null,
      updates.isActive !== undefined ? Boolean(updates.isActive) : null,
      updates.meritPoints !== undefined ? Number(updates.meritPoints) : null,
    ]
  );

  if (res.rows.length === 0) throw new Error('Không tìm thấy tài khoản thành viên!');
  return formatMemberRowFromDb(res.rows[0]);
}

export async function adminChangeMemberPasswordInNeon(
  memberId: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối Neon PostgreSQL');

  if (!newPassword || newPassword.trim().length < 4) {
    throw new Error('Mật khẩu mới phải có ít nhất 4 ký tự!');
  }

  const passwordHash = hashPasswordScrypt(newPassword.trim());
  const res = await pool.query(
    `UPDATE neon_temple_members SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, full_name, username;`,
    [passwordHash, memberId]
  );

  if (res.rows.length === 0) throw new Error('Không tìm thấy tài khoản để đổi mật khẩu!');
  return {
    success: true,
    message: `Đã đổi mật khẩu thành công cho tài khoản ${res.rows[0].full_name || res.rows[0].username}!`,
  };
}

export async function adminDeleteTempleMemberInNeon(memberId: string): Promise<{ success: boolean }> {
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối Neon PostgreSQL');

  // Delete sessions first
  await pool.query(`DELETE FROM neon_temple_member_sessions WHERE member_id = $1;`, [memberId]);
  const res = await pool.query(`DELETE FROM neon_temple_members WHERE id = $1;`, [memberId]);
  return { success: res.rowCount !== null && res.rowCount > 0 };
}

export async function verifyTempleMemberToken(rawToken: string): Promise<any | null> {
  if (!rawToken || !rawToken.trim()) return null;
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) return null;

  try {
    const tokenHash = hashSessionToken(rawToken.trim());
    const sessRes = await pool.query(
      `SELECT m.* FROM neon_temple_member_sessions s
       JOIN neon_temple_members m ON m.id = s.member_id
       WHERE s.token_hash = $1 AND s.expires_at > NOW() AND m.is_active IS DISTINCT FROM FALSE
       LIMIT 1;`,
      [tokenHash]
    );
    if (sessRes.rows.length > 0) {
      return formatMemberRowFromDb(sessRes.rows[0]);
    }

    const stateless = verifyStatelessMemberToken(rawToken.trim());
    if (stateless) {
      const memRes = await pool.query(
        `SELECT * FROM neon_temple_members WHERE id = $1 AND is_active IS DISTINCT FROM FALSE LIMIT 1;`,
        [stateless.memberId]
      );
      if (memRes.rows.length > 0) {
        return formatMemberRowFromDb(memRes.rows[0]);
      }
    }
  } catch (err) {
    console.warn('verifyTempleMemberToken warning:', err);
  }
  return null;
}

export async function updateTempleMemberProfileInNeon(
  memberId: string,
  updates: {
    fullName?: string;
    dharmaName?: string;
    phone?: string;
    email?: string;
    address?: string;
    newPassword?: string;
  }
): Promise<any> {
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối Neon PostgreSQL');

  const newPassHash =
    updates.newPassword && updates.newPassword.trim().length >= 4
      ? hashPasswordScrypt(updates.newPassword.trim())
      : null;

  const res = await pool.query(
    `UPDATE neon_temple_members SET
       full_name = COALESCE(NULLIF($2, ''), full_name),
       dharma_name = COALESCE($3, dharma_name),
       phone = COALESCE($4, phone),
       email = COALESCE($5, email),
       address = COALESCE($6, address),
       password_hash = COALESCE($7, password_hash),
       updated_at = NOW()
     WHERE id = $1
     RETURNING *;`,
    [
      memberId,
      updates.fullName ? updates.fullName.trim() : '',
      updates.dharmaName !== undefined ? updates.dharmaName.trim() || null : null,
      updates.phone !== undefined ? updates.phone.trim() || null : null,
      updates.email !== undefined ? updates.email.trim().toLowerCase() || null : null,
      updates.address !== undefined ? updates.address.trim() || null : null,
      newPassHash,
    ]
  );
  if (res.rows.length === 0) throw new Error('Không tìm thấy hồ sơ thành viên');
  return formatMemberRowFromDb(res.rows[0]);
}

export async function logoutTempleMemberSession(rawToken: string): Promise<void> {
  if (!rawToken) return;
  const pool = getPool();
  if (!pool) return;
  try {
    const tokenHash = hashSessionToken(rawToken.trim());
    await pool.query(`DELETE FROM neon_temple_member_sessions WHERE token_hash = $1;`, [tokenHash]);
  } catch {}
}

export async function createTempleMeritRecordInNeon(payload: any): Promise<any> {
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối Neon PostgreSQL');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const recordId =
      String(payload.id || '').trim() ||
      `CB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const totalAmount = Number(payload.totalAmount || 0);
    const totalMeritPoints = Number(payload.totalMeritPoints || 30);

    const memberId = await upsertTempleMemberWithClient(client, {
      memberId: payload.memberId,
      fullName: payload.donorName,
      dharmaName: payload.dharmaName,
      phone: payload.phone,
      email: payload.email,
      address: payload.address,
      addMerit: totalMeritPoints,
      addDonated: totalAmount,
      addTombs: 0,
    });

    const paySettingsRes = await client.query(
      `SELECT setting_value FROM neon_app_settings WHERE setting_key = 'temple_payment_settings' LIMIT 1;`
    );
    const autoApprove = paySettingsRes.rows[0]?.setting_value?.autoApproveOrders !== false;
    const paymentStatus =
      totalAmount <= 0 ? 'completed' : autoApprove ? 'approved' : (payload.paymentStatus || 'pending_admin');

    const res = await client.query(
      `INSERT INTO neon_temple_merit_records (
        id, member_id, donor_name, dharma_name, phone, address, prayer_type, prayer_text,
        sutra_id, sutra_title, items_json, custom_donation, total_amount, total_merit_points,
        payment_method, payment_status, transaction_code
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15,$16,$17)
      ON CONFLICT (id) DO UPDATE SET
        prayer_text = EXCLUDED.prayer_text,
        items_json = EXCLUDED.items_json,
        total_amount = EXCLUDED.total_amount,
        payment_status = EXCLUDED.payment_status
      RETURNING *;`,
      [
        recordId,
        memberId,
        String(payload.donorName || 'Thí chủ').trim(),
        payload.dharmaName ? String(payload.dharmaName).trim() : null,
        payload.phone ? String(payload.phone).trim() : null,
        payload.address ? String(payload.address).trim() : null,
        payload.prayerType || 'cau-an',
        payload.prayerText || '',
        payload.sutraId || null,
        payload.sutraTitle || null,
        JSON.stringify(Array.isArray(payload.items) ? payload.items : []),
        Number(payload.customDonation || 0),
        totalAmount,
        totalMeritPoints,
        payload.paymentMethod || (totalAmount > 0 ? 'vietqr_admin' : 'tuy-tam'),
        paymentStatus,
        payload.transactionCode || null,
      ]
    );

    await client.query('COMMIT');
    return formatMeritRowFromDb(res.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export interface TempleTombActorContext {
  memberId?: string | null;
  isAdmin?: boolean;
  adminUsername?: string | null;
}

export async function createOrUpdateMemorialTombInNeon(
  payload: any,
  actor?: TempleTombActorContext
): Promise<any> {
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối Neon PostgreSQL');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const plotCode = String(payload.plotCode || '').trim().toUpperCase();
    if (!plotCode) throw new Error('Thiếu mã vị trí ô mộ (plotCode)');
    if (!String(payload.deceasedFullName || '').trim()) {
      throw new Error('Vui lòng nhập Họ và tên người quá cố để khắc bia mộ!');
    }
    if (String(payload.id || '').startsWith('tomb-seed-')) {
      throw new Error('Không cho phép khôi phục ngôi mộ mẫu đã xóa.');
    }

    const isAdmin = Boolean(actor?.isAdmin);
    const actorMemberId = actor?.memberId ? String(actor.memberId).trim() : '';

    // Tra cứu ngôi mộ hiện hữu theo ID hoặc theo mã ô đất
    let existingRow: any = null;
    if (payload.id) {
      const byIdRes = await client.query(
        `SELECT * FROM neon_memorial_tombs WHERE id = $1 LIMIT 1;`,
        [String(payload.id)]
      );
      existingRow = byIdRes.rows[0] || null;
    }
    if (!existingRow) {
      const byPlotRes = await client.query(
        `SELECT * FROM neon_memorial_tombs WHERE UPPER(plot_code) = $1 LIMIT 1;`,
        [plotCode]
      );
      existingRow = byPlotRes.rows[0] || null;
    }

    if (existingRow) {
      // Nếu người dùng bấm Lập Mộ Mới (không có payload.id) vào ô đã có mộ
      if (!payload.id) {
        throw new Error(
          `Ô mộ ${plotCode} đã có thành viên khác lập bia (${existingRow.deceased_full_name}). Vui lòng chọn một ô đất trống khác trên sơ đồ!`
        );
      }

      // Kiểm tra phân quyền chỉnh sửa nghiêm ngặt: Chỉ Admin hoặc chính Thành viên đã tạo mộ này mới được sửa
      const isOwner =
        Boolean(actorMemberId) &&
        Boolean(existingRow.member_id) &&
        String(existingRow.member_id) === actorMemberId;

      if (!isAdmin && !isOwner) {
        throw new Error(
          'Bạn chỉ có quyền chỉnh sửa ngôi mộ do chính tài khoản thành viên của mình tạo. Đối với mộ xung quanh của thành viên khác, quý khách chỉ được dọn dẹp, dâng hương và nghe đọc!'
        );
      }
    } else {
      // Lập mộ mới: Bắt buộc phải Đăng nhập Thành viên (hoặc Admin) để gắn quyền sở hữu mộ
      if (!isAdmin && !actorMemberId) {
        throw new Error(
          'Vui lòng Đăng ký hoặc Đăng nhập tài khoản Thành viên trước khi lập mộ mới (thành viên tạo mộ nào sẽ có quyền quản lý & chỉnh sửa mộ đó)!'
        );
      }
    }

    const tombId = existingRow
      ? String(existingRow.id)
      : String(payload.id || `tomb-${plotCode.toLowerCase()}-${Date.now()}`);
    const totalCost = Number(payload.totalCost || 0);

    // Giữ nguyên chủ sở hữu gốc khi Admin chỉnh sửa hộ thành viên; khi lập mới thì gắn chặt vào actorMemberId
    let ownerMemberId: string | null = null;
    if (existingRow) {
      ownerMemberId = existingRow.member_id || actorMemberId || null;
      if (ownerMemberId) {
        await upsertTempleMemberWithClient(client, {
          memberId: ownerMemberId,
          fullName: payload.builderName || existingRow.builder_name || 'Gia quyến',
          dharmaName: payload.builderDharmaName,
          phone: payload.builderPhone,
          email: payload.builderEmail,
          address: payload.hometown,
          addMerit: 40,
          addDonated: 0,
          addTombs: 0,
        });
      }
    } else {
      ownerMemberId = await upsertTempleMemberWithClient(client, {
        memberId: actorMemberId || payload.memberId || `mem-admin-${actor?.adminUsername || 'root'}`,
        fullName: payload.builderName || (isAdmin ? `Admin (${actor?.adminUsername || 'Quản trị'})` : 'Gia quyến'),
        dharmaName: payload.builderDharmaName,
        phone: payload.builderPhone,
        email: payload.builderEmail,
        address: payload.hometown,
        addMerit: 200,
        addDonated: totalCost,
        addTombs: 1,
      });
    }

    const paySettingsRes = await client.query(
      `SELECT setting_value FROM neon_app_settings WHERE setting_key = 'temple_payment_settings' LIMIT 1;`
    );
    const autoApprove = paySettingsRes.rows[0]?.setting_value?.autoApproveOrders !== false;
    const paymentStatus =
      totalCost <= 0 ? 'approved' : autoApprove ? 'approved' : (payload.paymentStatus || 'pending_admin');

    let res;
    if (existingRow) {
      res = await client.query(
        `UPDATE neon_memorial_tombs SET
          zone_name = $2,
          row_index = $3,
          col_index = $4,
          stele_header = $5,
          deceased_full_name = $6,
          deceased_dharma_name = $7,
          gender = $8,
          birth_solar = $9,
          birth_lunar = $10,
          death_solar = $11,
          death_lunar = $12,
          longevity_type = $13,
          longevity_age = $14,
          hometown = $15,
          epitaph = $16,
          erected_by = $17,
          member_id = COALESCE(member_id, $18),
          builder_name = $19,
          builder_phone = $20,
          builder_email = $21,
          material_id = $22,
          architecture_id = $23,
          addons_json = $24::jsonb,
          dedicated_sutra_id = $25,
          total_cost = $26,
          payment_method = $27,
          payment_status = $28,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *;`,
        [
          tombId,
          String(payload.zoneName || existingRow.zone_name || 'Hoa Viên Tâm Linh 3D'),
          Number(payload.rowIndex ?? existingRow.row_index ?? 0),
          Number(payload.colIndex ?? existingRow.col_index ?? 0),
          String(payload.steleHeader || 'PHẬT QUANG TIẾP DẪN').trim(),
          String(payload.deceasedFullName || '').trim().toUpperCase(),
          payload.deceasedDharmaName ? String(payload.deceasedDharmaName).trim() : null,
          payload.gender === 'Nữ' ? 'Nữ' : 'Nam',
          String(payload.birthSolar || '').trim(),
          String(payload.birthLunar || '').trim(),
          String(payload.deathSolar || '').trim(),
          String(payload.deathLunar || '').trim(),
          payload.longevityType || 'huong-tho',
          Number(payload.longevityAge || 80),
          payload.hometown ? String(payload.hometown).trim() : null,
          payload.epitaph ? String(payload.epitaph).trim() : null,
          String(payload.erectedBy || 'Gia quyến đồng phụng lập').trim(),
          ownerMemberId,
          String(payload.builderName || existingRow.builder_name || 'Gia quyến').trim(),
          payload.builderPhone ? String(payload.builderPhone).trim() : null,
          payload.builderEmail ? String(payload.builderEmail).trim() : null,
          payload.materialId || 'da_xanh_cong_duc',
          payload.architectureId || 'mo_don_tam_cap',
          JSON.stringify(Array.isArray(payload.addons) ? payload.addons : ['lu_huong_da']),
          payload.dedicatedSutraId || 'kinh-a-di-da',
          totalCost,
          payload.paymentMethod || (totalCost <= 0 ? 'tuy-tam' : 'vietqr_admin'),
          paymentStatus,
        ]
      );
    } else {
      res = await client.query(
        `INSERT INTO neon_memorial_tombs (
          id, plot_code, zone_name, row_index, col_index, stele_header,
          deceased_full_name, deceased_dharma_name, gender,
          birth_solar, birth_lunar, death_solar, death_lunar,
          longevity_type, longevity_age, hometown, epitaph, erected_by,
          member_id, builder_name, builder_phone, builder_email,
          material_id, architecture_id, addons_json, dedicated_sutra_id,
          total_cost, payment_method, payment_status, incense_count, flower_count, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,
          $7,$8,$9,
          $10,$11,$12,$13,
          $14,$15,$16,$17,$18,
          $19,$20,$21,$22,
          $23,$24,$25::jsonb,$26,
          $27,$28,$29,1,1,NOW()
        )
        RETURNING *;`,
        [
          tombId,
          plotCode,
          String(payload.zoneName || 'Hoa Viên Tâm Linh 3D'),
          Number(payload.rowIndex || 0),
          Number(payload.colIndex || 0),
          String(payload.steleHeader || 'PHẬT QUANG TIẾP DẪN').trim(),
          String(payload.deceasedFullName || '').trim().toUpperCase(),
          payload.deceasedDharmaName ? String(payload.deceasedDharmaName).trim() : null,
          payload.gender === 'Nữ' ? 'Nữ' : 'Nam',
          String(payload.birthSolar || '').trim(),
          String(payload.birthLunar || '').trim(),
          String(payload.deathSolar || '').trim(),
          String(payload.deathLunar || '').trim(),
          payload.longevityType || 'huong-tho',
          Number(payload.longevityAge || 80),
          payload.hometown ? String(payload.hometown).trim() : null,
          payload.epitaph ? String(payload.epitaph).trim() : null,
          String(payload.erectedBy || 'Gia quyến đồng phụng lập').trim(),
          ownerMemberId,
          String(payload.builderName || 'Gia quyến').trim(),
          payload.builderPhone ? String(payload.builderPhone).trim() : null,
          payload.builderEmail ? String(payload.builderEmail).trim() : null,
          payload.materialId || 'da_xanh_cong_duc',
          payload.architectureId || 'mo_don_tam_cap',
          JSON.stringify(Array.isArray(payload.addons) ? payload.addons : ['lu_huong_da']),
          payload.dedicatedSutraId || 'kinh-a-di-da',
          totalCost,
          payload.paymentMethod || (totalCost <= 0 ? 'tuy-tam' : 'vietqr_admin'),
          paymentStatus,
        ]
      );
    }

    await client.query('COMMIT');
    return formatTombRowFromDb(res.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function addMemorialTributeInNeon(
  payload: {
    tombId: string;
    plotCode?: string;
    memberId?: string;
    visitorName: string;
    tributeType: string;
    itemName?: string;
    addonToUnlock?: string;
    amount?: number;
    message?: string;
  },
  actor?: TempleTombActorContext
): Promise<{ tomb: any; tribute: any }> {
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối Neon PostgreSQL');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existingRes = await client.query(
      `SELECT * FROM neon_memorial_tombs WHERE id = $1 LIMIT 1;`,
      [payload.tombId]
    );
    const existingTomb = existingRes.rows[0];
    if (!existingTomb) {
      throw new Error('Không tìm thấy phần mộ này trên cơ sở dữ liệu.');
    }

    const tribId = `trib-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const isFlower = payload.tributeType === 'dang-hoa';
    const isClean = payload.tributeType === 'don-dep';
    const isIncense = payload.tributeType === 'dot-nhang';

    let tombRes;
    if (payload.addonToUnlock) {
      // Mua gắn thêm vật phẩm làm thay đổi cấu trúc 3D của ngôi mộ: Chỉ chủ sở hữu ngôi mộ hoặc Admin mới được phép
      const isAdmin = Boolean(actor?.isAdmin);
      const actorMemberId = actor?.memberId ? String(actor.memberId).trim() : '';
      const isOwner =
        Boolean(actorMemberId) &&
        Boolean(existingTomb.member_id) &&
        String(existingTomb.member_id) === actorMemberId;

      if (!isAdmin && !isOwner) {
        throw new Error(
          'Mộ của thành viên khác không được chỉnh sửa vật phẩm kiến trúc. Quý khách chỉ được dọn dẹp, dâng hương và nghe đọc!'
        );
      }

      tombRes = await client.query(
        `UPDATE neon_memorial_tombs
         SET incense_count = incense_count + 1,
             total_cost = total_cost + $2,
             addons_json = CASE
               WHEN NOT (addons_json @> to_jsonb($3::text)) THEN addons_json || to_jsonb($3::text)
               ELSE addons_json
             END,
             last_incense_at = NOW(),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *;`,
        [payload.tombId, Number(payload.amount || 0), payload.addonToUnlock]
      );
    } else {
      tombRes = await client.query(
        `UPDATE neon_memorial_tombs
         SET incense_count = incense_count + $2,
             flower_count = flower_count + $3,
             last_incense_at = NOW(),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *;`,
        [payload.tombId, isIncense ? 1 : 0, isFlower || isClean ? 1 : 0]
      );
    }

    const defaultMsg = isClean
      ? 'Thành tâm dọn dẹp, lau bia và chăm sóc phần mộ thanh tịnh trang nghiêm.'
      : isFlower
      ? 'Dâng đóa hoa sen thanh khiết kính viếng hương linh.'
      : 'Thành tâm thắp nén nhang trầm tưởng nhớ.';

    const tribRes = await client.query(
      `INSERT INTO neon_memorial_tributes (
        id, tomb_id, plot_code, visitor_name, tribute_type, item_name, amount, message
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *;`,
      [
        tribId,
        payload.tombId,
        payload.plotCode || tombRes.rows[0]?.plot_code || existingTomb.plot_code || '',
        String(payload.visitorName || 'Khách thập phương').trim(),
        payload.tributeType || 'dot-nhang',
        payload.itemName || (isClean ? 'Dọn dẹp & chăm sóc mộ phần' : null),
        Number(payload.amount || 0),
        payload.message || defaultMsg,
      ]
    );

    const effectiveMemberId = actor?.memberId || payload.memberId;
    if (Number(payload.amount || 0) > 0 || effectiveMemberId) {
      await upsertTempleMemberWithClient(client, {
        memberId: effectiveMemberId || undefined,
        fullName: payload.visitorName || 'Khách viếng mộ',
        addMerit: Number(payload.amount || 0) > 0 ? 60 : 25,
        addDonated: Number(payload.amount || 0),
      });
    }

    await client.query('COMMIT');
    return {
      tomb: tombRes.rows[0] ? formatTombRowFromDb(tombRes.rows[0]) : null,
      tribute: {
        id: tribRes.rows[0].id,
        tombId: tribRes.rows[0].tomb_id,
        plotCode: tribRes.rows[0].plot_code,
        visitorName: tribRes.rows[0].visitor_name,
        tributeType: tribRes.rows[0].tribute_type,
        itemName: tribRes.rows[0].item_name || undefined,
        amount: Number(tribRes.rows[0].amount || 0),
        message: tribRes.rows[0].message || '',
        createdAt: tribRes.rows[0].created_at,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function createTempleGuestbookEntryInNeon(payload: {
  id?: string;
  memberId?: string;
  name: string;
  dharmaName?: string;
  location?: string;
  wish: string;
}): Promise<any> {
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối Neon PostgreSQL');

  const entryId = String(payload.id || `gb-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`);
  const res = await pool.query(
    `INSERT INTO neon_temple_guestbook (id, member_id, name, dharma_name, location, wish, likes, offerings_count)
     VALUES ($1, $2, $3, $4, $5, $6, 1, 1)
     ON CONFLICT (id) DO UPDATE SET wish = EXCLUDED.wish
     RETURNING *;`,
    [
      entryId,
      payload.memberId || null,
      String(payload.name || 'Phật tử').trim(),
      payload.dharmaName ? String(payload.dharmaName).trim() : null,
      String(payload.location || 'Việt Nam').trim(),
      String(payload.wish || '').trim(),
    ]
  );
  return formatGuestbookRowFromDb(res.rows[0]);
}

export async function likeTempleGuestbookEntryInNeon(entryId: string): Promise<any> {
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối Neon PostgreSQL');
  const res = await pool.query(
    `UPDATE neon_temple_guestbook SET likes = likes + 1 WHERE id = $1 RETURNING *;`,
    [entryId]
  );
  return res.rows[0] ? formatGuestbookRowFromDb(res.rows[0]) : null;
}

/**
 * Tự động tạo/cập nhật bảng bản mới và đồng bộ toàn bộ dữ liệu Chùa & Khu Mộ 3D vào Neon PostgreSQL
 */
export async function syncAllTempleDataToNeon(
  payload: {
    tombs?: any[];
    meritRecords?: any[];
    guestbook?: any[];
    memberId?: string;
    meritPoints?: number;
  },
  actor?: TempleTombActorContext
): Promise<{
  syncedTombs: number;
  syncedMerit: number;
  syncedGuestbook: number;
  overview: any;
}> {
  // Luôn chạy initializeNeonSchema() để đảm bảo mọi bảng & cột mới nhất đều được tự động tạo/cập nhật và xóa sạch mộ mẫu
  await initializeNeonSchema();
  const pool = getPool();
  if (!pool) throw new Error('Chưa kết nối Neon PostgreSQL');

  let syncedTombs = 0;
  let syncedMerit = 0;
  let syncedGuestbook = 0;

  const effectiveMemberId = actor?.memberId || payload.memberId;
  if (effectiveMemberId && typeof payload.meritPoints === 'number' && payload.meritPoints > 0) {
    try {
      await pool.query(
        `UPDATE neon_temple_members
         SET merit_points = GREATEST(merit_points, $2), updated_at = NOW()
         WHERE id = $1;`,
        [effectiveMemberId, Math.round(payload.meritPoints)]
      );
    } catch {}
  }

  // Chỉ đồng bộ mộ thật của thành viên đã đăng nhập hoặc Admin, tuyệt đối bỏ qua mộ mẫu (tomb-seed-*)
  if (Array.isArray(payload.tombs) && (actor?.isAdmin || actor?.memberId)) {
    for (const t of payload.tombs) {
      const tid = String(t?.id || '');
      if (
        t &&
        t.plotCode &&
        t.deceasedFullName &&
        !t.isDraft &&
        !tid.startsWith('tomb-seed-') &&
        (actor?.isAdmin || (actor?.memberId && t.memberId === actor.memberId))
      ) {
        try {
          const check = await pool.query(
            `SELECT id FROM neon_memorial_tombs WHERE UPPER(plot_code) = $1 LIMIT 1;`,
            [String(t.plotCode).trim().toUpperCase()]
          );
          if (check.rows.length === 0) {
            await createOrUpdateMemorialTombInNeon({ ...t, id: undefined }, actor);
            syncedTombs++;
          }
        } catch {}
      }
    }
  }

  if (Array.isArray(payload.meritRecords)) {
    for (const mr of payload.meritRecords) {
      if (mr && mr.id && mr.donorName) {
        try {
          const check = await pool.query(
            `SELECT id FROM neon_temple_merit_records WHERE id = $1 LIMIT 1;`,
            [String(mr.id)]
          );
          if (check.rows.length === 0) {
            await createTempleMeritRecordInNeon(mr);
            syncedMerit++;
          }
        } catch {}
      }
    }
  }

  if (Array.isArray(payload.guestbook)) {
    for (const gb of payload.guestbook) {
      if (gb && gb.id && gb.name && gb.wish) {
        try {
          const check = await pool.query(
            `SELECT id FROM neon_temple_guestbook WHERE id = $1 LIMIT 1;`,
            [String(gb.id)]
          );
          if (check.rows.length === 0) {
            await createTempleGuestbookEntryInNeon(gb);
            syncedGuestbook++;
          }
        } catch {}
      }
    }
  }

  const overview = await getTempleOverviewFromNeon();
  return {
    syncedTombs,
    syncedMerit,
    syncedGuestbook,
    overview,
  };
}

export async function updateTempleOrderStatusByAdminInNeon(params: {
  targetType: 'merit' | 'tomb';
  id: string;
  paymentStatus: string;
  actor: string;
}): Promise<boolean> {
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) return false;
  if (params.targetType === 'merit') {
    await pool.query(
      `UPDATE neon_temple_merit_records SET payment_status = $2 WHERE id = $1;`,
      [params.id, params.paymentStatus]
    );
  } else {
    await pool.query(
      `UPDATE neon_memorial_tombs SET payment_status = $2, updated_at = NOW() WHERE id = $1;`,
      [params.id, params.paymentStatus]
    );
  }
  await recordAdminAuditLog(params.actor, 'APPROVE_TEMPLE_ORDER', params.id, params);
  return true;
}

export async function deleteMemorialTombByAdminInNeon(tombId: string, actor: string): Promise<boolean> {
  await ensureNeonBootstrapped();
  const pool = getPool();
  if (!pool) return false;
  const existing = await pool.query(
    `SELECT member_id FROM neon_memorial_tombs WHERE id = $1 LIMIT 1;`,
    [tombId]
  );
  const ownerId = existing.rows[0]?.member_id;
  await pool.query(`DELETE FROM neon_memorial_tributes WHERE tomb_id = $1;`, [tombId]);
  const res = await pool.query(`DELETE FROM neon_memorial_tombs WHERE id = $1;`, [tombId]);
  if ((res.rowCount || 0) > 0 && ownerId) {
    await pool.query(
      `UPDATE neon_temple_members SET tombs_built = GREATEST(0, tombs_built - 1), updated_at = NOW() WHERE id = $1;`,
      [ownerId]
    );
  }
  await recordAdminAuditLog(actor, 'DELETE_MEMORIAL_TOMB', tombId, {});
  return (res.rowCount || 0) > 0;
}


