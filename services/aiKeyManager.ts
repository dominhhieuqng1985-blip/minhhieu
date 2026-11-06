
/**
 * DỊCH VỤ QUẢN LÝ API KEY THÔNG MINH
 * Giúp tự động xoay vòng nhiều Key để tránh lỗi 429 (Quota Exceeded).
 */

const VALID_KEYS: string[] = [];

let currentKeyIndex = 0;

/**
 * Lấy một API Key bất kỳ từ danh sách.
 * Sử dụng thuật toán Round-Robin (xoay vòng) để chia đều tải cho các Key.
 */
export const getSmartApiKey = (): string => {
    if (VALID_KEYS.length === 0) {
        console.error("CRITICAL: Không tìm thấy API Key nào! Vui lòng kiểm tra file services/aiKeyManager.ts");
        return "";
    }

    // Lấy key hiện tại
    const key = VALID_KEYS[currentKeyIndex];
    
    // Chuyển index sang key tiếp theo cho lần gọi sau (Vòng tròn: 0 -> 1 -> 2 -> 3 -> 0)
    currentKeyIndex = (currentKeyIndex + 1) % VALID_KEYS.length;
    
    // Log nhẹ để debug (có thể comment lại khi chạy production)
    // console.log(`[AI Key Manager] Using Key #${currentKeyIndex} (Total: ${VALID_KEYS.length})`);
    
    return key;
};

/**
 * Helper để kiểm tra xem lỗi có phải do hết Quota hay không
 */
export const isQuotaError = (error: any): boolean => {
    const msg = error?.message?.toLowerCase() || "";
    return msg.includes("429") || msg.includes("quota") || msg.includes("resource exhausted");
};
