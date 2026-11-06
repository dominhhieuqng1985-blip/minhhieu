// utils/lunarCalc.ts

// Hằng số lịch âm
const JULIAN_DATE_1900_01_31 = 2415050; // Ngày 31/01/1900 Dương lịch (Mùng 1 Tết Canh Tý)

const LUNAR_MONTH_DAYS = [
    0x4ae0, 0xa570, 0x5268, 0xd260, 0xd950, 0x6554, 0x56a0, 0x9ad0, 0x55d2, 0x4ae0, // 1900-1909
    0xa5b6, 0xa4d0, 0xd250, 0xd255, 0xb540, 0xd6a0, 0xada2, 0x95b0, 0x4977, 0x4970, // 1910-1919
    0xa4b0, 0xb4b5, 0x6a50, 0x6d40, 0xab54, 0x2b60, 0x9570, 0x52f2, 0x4970, 0x6566, // 1920-1929
    0xd4a0, 0xea50, 0x6a95, 0x5ad0, 0x2b60, 0x86e3, 0x92e0, 0xc8d7, 0xc950, 0xd4a0, // 1930-1939
    0xd8a6, 0xb550, 0x56a0, 0xa5b4, 0x25d0, 0x92d0, 0xd2b2, 0xa950, 0xb557, 0x6ca0, // 1940-1949
    0xb550, 0x5355, 0x4da0, 0xa5d0, 0x4573, 0x52d0, 0xa9a8, 0xe950, 0x6aa0, 0xaea6, // 1950-1959
    0xab50, 0x4b60, 0xaae4, 0xa570, 0x5260, 0xf263, 0xd950, 0x5b57, 0x56a0, 0x96d0, // 1960-1969
    0x4dd5, 0x4ad0, 0xa4d0, 0xd4d4, 0xd250, 0xd558, 0xb540, 0xb5a0, 0x195a6, 0x95b0, // 1970-1979
    0x49b0, 0xa974, 0xa4b0, 0xb27a, 0x6a50, 0x6d40, 0xaf46, 0xab60, 0x9570, 0x4af5, // 1980-1989
    0x4970, 0x64b0, 0x74a3, 0xea50, 0x6b58, 0x55c0, 0xab60, 0x96d5, 0x92e0, 0xc960, // 1990-1999
    0xd954, 0xd4a0, 0xda50, 0x7552, 0x56a0, 0xabb7, 0x25d0, 0x92d0, 0xcab5, 0xa950, // 2000-2009
    0xb4a0, 0xbaa4, 0xad50, 0x55d9, 0x4ba0, 0xa5b0, 0x15176, 0x52b0, 0xa930, 0x7954, // 2010-2019
    0x6aa0, 0xad50, 0x5b52, 0x4b60, 0xa6e6, 0xa4e0, 0xd260, 0xea65, 0xd530, 0x5aa0, // 2020-2029
    0x76a3, 0x96d0, 0x4bd7, 0x4ad0, 0xa4d0, 0x1d0b6, 0xd250, 0xd520, 0xdd45, 0xb5a0, // 2030-2039
    0x56d0, 0x55b2, 0x49b0, 0xa577, 0xa4b0, 0xaa50, 0x1b255, 0x6d20, 0xada0    // 2040-2049
];

// Chuyển ngày Dương lịch sang Julian Date
const solarToJulian = (dd: number, mm: number, yy: number) => {
    let y = yy;
    let m = mm;
    if (m > 2) {
        m = m - 3;
    } else {
        m = m + 9;
        y = y - 1;
    }
    const c = Math.floor(y / 100);
    const ya = y - 100 * c;
    const j = Math.floor(146097 * c / 4) + Math.floor(1461 * ya / 4) + Math.floor((153 * m + 2) / 5) + dd + 1721119;
    return j;
};

// Hàm chính chuyển đổi (Giới hạn 1900 - 2049)
// Đây là thuật toán tra bảng (Table Lookup) nhanh và chính xác cho khoảng thời gian phổ biến
export const getLunarDate = (date: Date): { day: number, month: number, isLeap: boolean } => {
    const dd = date.getDate();
    const mm = date.getMonth() + 1;
    const yy = date.getFullYear();

    // Giới hạn dữ liệu bảng
    if (yy < 1900 || yy > 2049) {
        return { day: dd, month: mm, isLeap: false }; // Fallback về dương lịch nếu ngoài vùng phủ
    }

    let offset = solarToJulian(dd, mm, yy) - JULIAN_DATE_1900_01_31;
    let iYear, daysOfYear = 0;

    for (iYear = 1900; iYear < 2050 && offset > 0; iYear++) {
        daysOfYear = getLunarYearDays(iYear);
        offset -= daysOfYear;
    }

    if (offset < 0) {
        offset += daysOfYear;
        iYear--;
    }

    const lunarYear = iYear;
    const leapMonth = getLeapMonth(lunarYear);
    let isLeap = false;

    let iMonth = 1;
    let daysOfMonth = 0;

    for (iMonth = 1; iMonth < 13 && offset > 0; iMonth++) {
        // Tháng nhuận
        if (leapMonth > 0 && iMonth === (leapMonth + 1) && !isLeap) {
            --iMonth;
            isLeap = true;
            daysOfMonth = getLeapMonthDays(lunarYear);
        } else {
            daysOfMonth = getLunarMonthDays(lunarYear, iMonth);
        }

        offset -= daysOfMonth;

        if (isLeap && iMonth === (leapMonth + 1)) {
            isLeap = false;
        }
    }

    if (offset === 0 && leapMonth > 0 && iMonth === leapMonth + 1) {
        if (isLeap) {
            isLeap = false;
        } else {
            isLeap = true;
            --iMonth;
        }
    }

    if (offset < 0) {
        offset += daysOfMonth;
        --iMonth;
    }

    return {
        day: offset + 1,
        month: iMonth,
        isLeap: isLeap
    };
};

// Helper: Lấy bit nhuận
function getLeapMonth(year: number) {
    return LUNAR_MONTH_DAYS[year - 1900] & 0xf;
}

// Helper: Lấy số ngày của tháng nhuận
function getLeapMonthDays(year: number) {
    if (getLeapMonth(year)) {
        return (LUNAR_MONTH_DAYS[year - 1900] & 0x10000) ? 30 : 29;
    }
    return 0;
}

// Helper: Lấy số ngày của tháng âm thường
function getLunarMonthDays(year: number, month: number) {
    return (LUNAR_MONTH_DAYS[year - 1900] & (0x10000 >> month)) ? 30 : 29;
}

// Helper: Lấy tổng số ngày trong năm âm lịch
function getLunarYearDays(year: number) {
    let sum = 348;
    for (let i = 0x8000; i > 0x8; i >>= 1) {
        sum += (LUNAR_MONTH_DAYS[year - 1900] & i) ? 1 : 0;
    }
    return sum + getLeapMonthDays(year);
}