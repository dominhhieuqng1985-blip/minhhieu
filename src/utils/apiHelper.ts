/**
 * Safe API response parser to prevent JSON parse errors like:
 * "Unexpected token '<', " <html><hea"... is not valid JSON"
 */
export async function safeParseJson<T = any>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  
  if (!contentType.includes("application/json")) {
    const rawText = await response.text();
    // Check if server returned an HTML error page (e.g. 502, 504, 413, 404 from proxy or Vite)
    if (rawText.includes("<!DOCTYPE") || rawText.includes("<html") || rawText.includes("<head>")) {
      if (response.status === 413) {
        throw new Error("Dung lượng tệp quá lớn vượt quá giới hạn tải lên của máy chủ (HTTP 413). Vui lòng thử dùng đường link video hoặc dùng chức năng Tự động cắt chia phần 10 phút.");
      }
      if (response.status === 504 || response.status === 502) {
        throw new Error("Thời gian xử lý quá lâu (Gateway Timeout). Đối với video dài hoặc dung lượng lớn, hãy sử dụng tính năng 'Cắt video thành các phần 10 phút' để xử lý mượt mà.");
      }
      if (response.status === 404) {
        throw new Error(`Đường dẫn API không tìm thấy (HTTP 404). Vui lòng tải lại trang.`);
      }
      if (response.status === 200) {
        throw new Error("Kết nối mạng tải tệp bị gián đoạn giữa chừng do đường truyền. Vui lòng bấm 'Thử Lại Ngay' hoặc sử dụng link video trực tiếp.");
      }
      throw new Error(`Máy chủ phản hồi trang lỗi HTML (Mã lỗi ${response.status} ${response.statusText}). Vui lòng thử lại với video dung lượng nhỏ hơn hoặc sử dụng tính năng chia phần 10 phút.`);
    }

    try {
      // Maybe it's json without proper header
      return JSON.parse(rawText) as T;
    } catch {
      throw new Error(rawText || `Máy chủ phản hồi với mã lỗi ${response.status} (${response.statusText})`);
    }
  }

  try {
    return (await response.json()) as T;
  } catch (err: any) {
    throw new Error(`Không thể phân tích dữ liệu JSON từ máy chủ: ${err.message || 'Lỗi định dạng dữ liệu'}`);
  }
}
