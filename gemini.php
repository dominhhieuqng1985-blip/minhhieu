<?php
// /home/vemaybaynhauyen.com/public_html/api/gemini.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: https://vemaybaynhauyen.com');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Chỉ chấp nhận POST']);
    exit;
}

// === THAY API KEY MỚI TẠI ĐÂY ===
$API_KEY = 'AIzaSyCqTsunDPO1n7sE4dRWv4JrlQ3SRoe5IUM'; // <<<-- ĐỔI KEY MỚI Ở ĐÂY

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['task'])) {
    echo json_encode(['error' => 'Thiếu task']);
    exit;
}

$task = $input['task'];
$payload = $input['payload'] ?? [];

$system = "TRẢ LỜI CHỈ BẰNG JSON, KHÔNG DÙNG ```json, KHÔNG THÊM CHỮ, KHÔNG GIẢI THÍCH.";

date_default_timezone_set('Asia/Ho_Chi_Minh');
$today = date('Y-m-d');

if ($task === 'planner') {
    // Đồng bộ 100% với AIPlanner.tsx
    $departureId = $payload['departureId'] ?? 'SGN';
    $promptText = $payload['promptText'] ?? '';

    if (!$departureId || !$promptText) {
        echo json_encode(['error' => 'Cần departureId và promptText']);
        exit;
    }

$airports = [
    'SGN' => 'TP. Hồ Chí Minh', 'HAN' => 'Hà Nội', 'DAD' => 'Đà Nẵng',
    'PQC' => 'Phú Quốc', 'CXR' => 'Nha Trang', 'DLI' => 'Đà Lạt',
    'HUI' => 'Huế', 'HPH' => 'Hải Phòng', 'VDO' => 'Vân Đồn',
    'VII' => 'Vinh', 'THD' => 'Thanh Hóa', 'BMV' => 'Buôn Ma Thuột',
    'PXU' => 'Pleiku', 'UIH' => 'Quy Nhơn', 'TBB' => 'Tuy Hòa',
    'VCA' => 'Cần Thơ', 'VCS' => 'Côn Đảo', 'CAH' => 'Cà Mau',
    'VKG' => 'Rạch Giá', 'PHA' => 'Phan Thiết', 'DIN' => 'Điện Biên',
    'VDH' => 'Đồng Hới', 'VCL' => 'Chu Lai'
];
$departureAirport = $airports[$departureId] ?? $departureId;

    $userPrompt = "Bạn là một trợ lý du lịch AI chuyên nghiệp. Phân tích yêu cầu: \"$promptText\"\nĐiểm khởi hành: \"$departureAirport\"\nNgày hôm nay: $today\n\n";

    $userPrompt .= "Phân loại yêu cầu:\n";
    $userPrompt .= "- Loại A: Người dùng nhập tên thành phố/địa danh cụ thể → gợi ý hoạt động TẠI đó.\n";
    $userPrompt .= "- Loại B: Người dùng mô tả mong muốn (biển, lạnh, nghỉ dưỡng...) → gợi ý 3 điểm đến khác nhau.\n\n";

    $userPrompt .= "Trả về đúng 3 gợi ý dưới dạng JSON array, mỗi object có:\n";
    $userPrompt .= "- destinationName: string\n";
    $userPrompt .= "- airportCode: string (IATA 3 chữ, hợp lệ)\n";
    $userPrompt .= "- description: string (2-3 câu hấp dẫn)\n";
    $userPrompt .= "- activities: array 2-3 string\n";
    $userPrompt .= "- suggestedOutboundDate: YYYY-MM-DD (từ $today + ít nhất 3 ngày)\n";
    $userPrompt .= "- suggestedReturnDate: YYYY-MM-DD (sau ngày đi, tùy chọn)\n\n";

    $userPrompt .= "Ví dụ: [{\"destinationName\":\"Phú Quốc\",\"airportCode\":\"PQC\",\"description\":\"Đảo ngọc với biển xanh...\",\"activities\":[\"Tắm biển\",\"Lặn ngắm san hô\",\"Ăn hải sản\"],\"suggestedOutboundDate\":\"2025-11-20\",\"suggestedReturnDate\":\"2025-11-24\"}]";

    $prompt = "$system\n$userPrompt";

} elseif ($task === 'news') {
    // Đồng bộ 100% với NewsSection.tsx
    $prompt = "$system\nTạo 4 tin tức hàng không Việt Nam gần đây nhất bằng tiếng Việt. Mỗi tin phải có:\n";
    $prompt .= "- title: string (tiêu đề hấp dẫn)\n";
    $prompt .= "- source: string (VnExpress, Tuổi Trẻ, VietnamNet, Báo Giao Thông...)\n";
    $prompt .= "- summary: string (2-3 câu tóm tắt)\n";
    $prompt .= "- link: string (URL giả hợp lý, ví dụ: https://vnexpress.net/duong-bay-moi-sgn-han-1234567)\n";
    $prompt .= "- imageUrl: string (URL ảnh công khai từ Unsplash hoặc Pexels, nếu không có thì bỏ qua)\n\n";
    $prompt .= "Ví dụ: [{\"title\":\"Vietnam Airlines mở đường bay mới Sài Gòn - Seoul\",\"source\":\"VnExpress\",\"summary\":\"Từ 15/12...\",\"link\":\"https://vnexpress.net/vna-mo-duong-bay-moi-123\",\"imageUrl\":\"https://images.unsplash.com/...\"}]";

} else {
    echo json_encode(['error' => 'Task không hỗ trợ']);
    exit;
}

// Gọi Gemini
$ch = curl_init("https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=$API_KEY");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode([
        "contents" => [["parts" => [["text" => $prompt]]]],
        "generationConfig" => [
            "temperature" => 0.7,
            "responseMimeType" => "application/json"
        ]
    ]),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_SSL_VERIFYPEER => true
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code !== 200) {
    $err = json_decode($response, true);
    $msg = $err['error']['message'] ?? 'Lỗi Google API';
    echo json_encode(['error' => $msg]);
    exit;
}

$data = json_decode($response, true);
$text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';

// Làm sạch JSON
$clean = trim($text);
$clean = preg_replace('/^```json\s*|\s*```$/i', '', $clean);
if (preg_match('/\[[\s\S]*\]/', $clean, $m)) {
    $clean = $m[0];
}

$json = json_decode($clean, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(['error' => 'JSON parse failed', 'raw' => substr($clean, 0, 500)]);
    exit;
}

echo json_encode($json, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
?>