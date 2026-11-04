/**
 * Bộ Chuyển Đổi Dương Lịch -> Âm Lịch Việt Nam (UTC+7), Can Chi & Tính Hưởng Dương / Hưởng Thọ
 * Thuật toán thiên văn Hồ Ngọc Đức (Julian Day + New Moon + Sun Longitude chuẩn múi giờ Việt Nam +7)
 * Hoạt động 100% độc lập cho mọi năm từ 1800 đến 2199.
 */

const PI = Math.PI;

function INT(d: number): number {
  return Math.floor(d);
}

export function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = INT((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd =
    dd +
    INT((153 * m + 2) / 5) +
    365 * y +
    INT(y / 4) -
    INT(y / 100) +
    INT(y / 400) -
    32045;
  if (jd < 2299161) {
    jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
  }
  return jd;
}

function getNewMoonDay(k: number, timeZone: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = PI / 180;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 = Jd1 + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 =
    (0.1734 - 0.000393 * T) * Math.sin(M * dr) +
    0.0021 * Math.sin(2 * dr * M) -
    0.4068 * Math.sin(Mpr * dr) +
    0.0161 * Math.sin(dr * 2 * Mpr) -
    0.0004 * Math.sin(dr * 3 * Mpr) +
    0.0104 * Math.sin(dr * 2 * F) -
    0.0051 * Math.sin(dr * (M + Mpr)) -
    0.0074 * Math.sin(dr * (M - Mpr)) +
    0.0004 * Math.sin(dr * (2 * F + M)) -
    0.0004 * Math.sin(dr * (2 * F - M)) -
    0.0006 * Math.sin(dr * (2 * F + Mpr)) +
    0.001 * Math.sin(dr * (2 * F - Mpr)) +
    0.0005 * Math.sin(dr * (2 * Mpr + M));
  let deltat: number;
  if (T < -11) {
    deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
  } else {
    deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
  }
  const JdNew = Jd1 + C1 - deltat;
  return INT(JdNew + 0.5 + timeZone / 24);
}

function getSunLongitude(jdn: number, timeZone: number): number {
  const T = (jdn - 2451545.5 - timeZone / 24) / 36525;
  const T2 = T * T;
  const dr = PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL = DL + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
  let L = L0 + DL;
  L = L * dr;
  L = L - PI * 2 * INT(L / (PI * 2));
  return INT((L / PI) * 6);
}

function getLunarMonth11(yy: number, timeZone: number): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = INT(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

function getLeapMonthOffset(a11: number, timeZone: number): number {
  const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

export interface LunarDateResult {
  lunarDay: number;
  lunarMonth: number;
  lunarYear: number;
  isLeap: boolean;
  canChiYear: string;
  formattedShort: string; // e.g. "16/08 năm Giáp Thìn"
  formattedFull: string;  // e.g. "Ngày 16 tháng 08 năm Giáp Thìn (2024)"
}

const THIEN_CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const DIA_CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

export function getCanChiYear(lunarYear: number): string {
  const can = THIEN_CAN[(lunarYear + 6) % 10];
  const chi = DIA_CHI[(lunarYear + 8) % 12];
  return `${can} ${chi}`;
}

export function convertSolarToLunarVi(dd: number, mm: number, yy: number, timeZone = 7): LunarDateResult {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone);
  }
  let a11 = getLunarMonth11(yy, timeZone);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, timeZone);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, timeZone);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = INT((monthStart - a11) / 29);
  let lunarLeap = false;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) {
        lunarLeap = true;
      }
    }
  }
  if (lunarMonth > 12) {
    lunarMonth = lunarMonth - 12;
  }
  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1;
  }

  const canChiYear = getCanChiYear(lunarYear);
  const dStr = String(lunarDay).padStart(2, '0');
  const mStr = String(lunarMonth).padStart(2, '0') + (lunarLeap ? ' (nhuận)' : '');
  return {
    lunarDay,
    lunarMonth,
    lunarYear,
    isLeap: lunarLeap,
    canChiYear,
    formattedShort: `${dStr}/${mStr} năm ${canChiYear}`,
    formattedFull: `Ngày ${dStr} tháng ${mStr} năm ${canChiYear} (${lunarYear})`,
  };
}

/**
 * Parse YYYY-MM-DD hoặc DD/MM/YYYY sang Dương lịch chuẩn DD/MM/YYYY và Âm lịch Việt Nam
 */
export function parseSolarInputToDates(rawDate: string): {
  solarFormatted: string;
  lunarFormatted: string;
  year: number;
  lunarYear: number;
} | null {
  const clean = (rawDate || '').trim();
  if (!clean) return null;

  let dd = 0;
  let mm = 0;
  let yy = 0;

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(clean)) {
    const parts = clean.split('-').map(Number);
    yy = parts[0];
    mm = parts[1];
    dd = parts[2];
  } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(clean)) {
    const parts = clean.split(/[\/\-]/).map(Number);
    dd = parts[0];
    mm = parts[1];
    yy = parts[2];
  } else if (/^\d{4}$/.test(clean)) {
    yy = Number(clean);
    mm = 1;
    dd = 1;
  } else {
    return null;
  }

  if (yy < 1800 || yy > 2199 || mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    return null;
  }

  const lunar = convertSolarToLunarVi(dd, mm, yy);
  const solarFormatted = `${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${yy}`;
  return {
    solarFormatted,
    lunarFormatted: lunar.formattedShort,
    year: yy,
    lunarYear: lunar.lunarYear,
  };
}

/**
 * Tính tuổi truyền thống trên bia mộ Việt Nam (Tuổi Âm / Tuổi Ta = Năm mất - Năm sinh + 1)
 * < 60 tuổi: Hưởng Dương
 * >= 60 tuổi: Hưởng Thọ
 */
export function computeVietnameseTombLongevity(
  birthYear: number,
  deathYear: number
): {
  age: number;
  longevityType: 'huong-tho' | 'huong-duong';
  labelVi: string;
} {
  const rawAge = Math.max(1, deathYear - birthYear + 1);
  const longevityType = rawAge >= 60 ? 'huong-tho' : 'huong-duong';
  return {
    age: rawAge,
    longevityType,
    labelVi: longevityType === 'huong-tho' ? 'HƯỞNG THỌ' : 'HƯỞNG DƯƠNG',
  };
}
