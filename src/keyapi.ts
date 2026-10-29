// Danh sách các API Key dự phòng
export const API_KEYS = [
  "AIzaSyDTc9kMd8czevy4MQ3-aZF_TcADft23wFk",
  "AIzaSyAv2xTd4JONO9fxLUJc6Mzvp4WtU_bERdM",
  "AIzaSyAYqWGgR1d9Yze1IONYNXDHCsJt5s1e420",
  "AIzaSyCxV_mhsSnp_nUPZSZKyyrQS6GhEz5lSIg",
  "AIzaSyBLW8F7MDGmbjs-alu51o9a12LRBeRM6-4",
  "AIzaSyAIMRmh3fYf5CXyBeDH5AUydfTkgd3M61A",
  "AIzaSyANOMiCscISHJzAwbgy8rS4T_TUx7Og6PA",
  "AIzaSyDuC_rTslzs22dSYMejfNE8FhaGXzopOGM",
  "AIzaSyAszrkQFoiutZnHIVwKSvJrlltCTRcGNKw",
  "AIzaSyCyDyDI4LnSWddn2Iia7_nibBCbvfncync",
  "AIzaSyDgpe7aogSpVsvQhjtMbTf2HqO29RYjErY",
  "AIzaSyAMKS05bbxIjFV8oRrm39kjs4iS_gYMnlc",
  "AIzaSyDmiNDPuRwY6kyRAHT_gFET5wRuvi847ys",
];

let currentKeyIndex = 0;

// Hàm lấy key tiếp theo theo vòng lặp (Round-robin)
// Mỗi lần gọi sẽ lấy 1 key mới, nếu hết sẽ quay lại từ đầu
export function getNextApiKey(): string {
  const key = API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  console.log(`Đang sử dụng API Key ở vị trí thứ ${currentKeyIndex === 0 ? API_KEYS.length : currentKeyIndex}`);
  return key;
}
