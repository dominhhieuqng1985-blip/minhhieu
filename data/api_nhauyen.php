<?php
// Nạp Guzzle
require 'vendor/autoload.php';
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

// Thiết lập header để trả về JSON
header('Content-Type: application/json; charset=UTF-8');

// Thư mục lưu logo
define('LOGO_DIR', '/home/pabuzo.vn/public_html/logos/');

// Mảng các API key dự phòng (mới nhất trước)
$api_keys = [
    "7ba04bf2b5fcffd482b8f3deea1f10a4373303fa951779826231da493ad9ecad",
    "e92aa99985726d4d588247984c2c46e30ef4e6e8f53600efa4ebdaa04feeb8cf",
    "5a3df8500e151a0998745935ae394aba4118b417e5c0e081c989a8bf97c20458",
    "4e0f461cfd562797a1fcb8cd6962c1b8ed30428288666f938bc4318fa80eebfc",
	"23c168d4107209ada9068793465a5919504717dbcb7e1ab363031c8e97b12bde",
];

// Hàm tải và lưu logo
function downloadAndSaveLogo($url, $airline, $logo_dir) {
    if (!$url || file_exists($logo_dir . $airline . '.png')) {
        return 'https://pabuzo.vn/logos/' . $airline . '.png';
    }
    try {
        $client = new Client();
        $response = $client->get($url);
        $image = $response->getBody()->getContents();
        $filename = $logo_dir . $airline . '.png';
       
        // Đảm bảo thư mục logos tồn tại
        if (!is_dir($logo_dir)) {
            mkdir($logo_dir, 0755, true);
        }
       
        file_put_contents($filename, $image);
        // Đặt quyền cho file
        chmod($filename, 0644);
        return 'https://pabuzo.vn/logos/' . $airline . '.png';
    } catch (Exception $e) {
        return 'Không có thông tin';
    }
}

// Hàm gọi API SerpApi với fallback toàn bộ key
function getFlightData($departure_id, $arrival_id, $outbound_date, $type = 'one_way', $return_date = null, $currency = 'VND', $hl = 'vi') {
    global $api_keys;
    $client = new Client(['timeout' => 40]);

    // Query cơ bản
    $base_query = [
        'engine' => 'google_flights',
        'departure_id' => $departure_id,
        'arrival_id' => $arrival_id,
        'outbound_date' => $outbound_date,
        'currency' => $currency,
        'hl' => $hl,
        'gl' => 'vn',
        'type' => ($type === 'round_trip') ? 1 : 2,
        'adults' => 1
    ];

    if ($type === 'round_trip' && $return_date) {
        $base_query['return_date'] = $return_date;
    }

    // Thử từng key
    foreach ($api_keys as $idx => $api_key) {
        $query = array_merge($base_query, ['api_key' => $api_key]);
        $url = 'https://serpapi.com/search.json?' . http_build_query($query);

        try {
            $response = $client->get($url);
            if ($response->getStatusCode() === 200) {
                $data = json_decode($response->getBody()->getContents(), true);
                if (!isset($data['error'])) {
                    error_log("API SUCCESS với key #$idx");
                    return $data;
                }
            }
        } catch (RequestException $e) {
            $status = $e->getResponse() ? $e->getResponse()->getStatusCode() : 'NO';
            error_log("Key #$idx lỗi HTTP $status: " . $e->getMessage());
            if (!in_array($status, [429, 403])) {
                // Nếu không phải rate limit hoặc invalid key → dừng luôn (lỗi mạng)
                return ['error' => 'Lỗi mạng tạm thời'];
            }
        } catch (Exception $e) {
            error_log("Key #$idx EXCEPTION: " . $e->getMessage());
        }
    }

    return ['error' => 'Tất cả API key tạm thời không khả dụng. Thử lại sau 5-10 phút.'];
}

// Hàm xử lý và định dạng dữ liệu JSON (giữ nguyên 100% code gốc)
function formatFlightData($data) {
    // Mảng ánh xạ logo và hành lý
    $airline_info = [
        'Vietnam Airlines' => [
            'logo' => 'https://pabuzo.vn/logos/vietnam-airlines.png',
            'default_carry_on' => '7kg',
            'default_checked' => '23kg'
        ],
        'Vietjet' => [
            'logo' => 'https://pabuzo.vn/logos/vietjet.png',
            'default_carry_on' => '7kg',
            'default_checked' => '0kg'
        ],
        'Bamboo Airways' => [
            'logo' => 'https://pabuzo.vn/logos/bamboo-airways.png',
            'default_carry_on' => '7kg',
            'default_checked' => '20kg'
        ],
        'Vietravel Airlines' => [
            'logo' => 'https://pabuzo.vn/logos/vietravel-airlines.png',
            'default_carry_on' => '7kg',
            'default_checked' => '20kg'
        ]
    ];
    $result = [
        'status' => 'success',
        'best_flights' => [],
        'other_flights' => [],
        'airports' => []
    ];
    if (isset($data['error'])) {
        return [
            'status' => 'error',
            'message' => $data['error']
        ];
    }
    // Xử lý best_flights
    if (isset($data['best_flights'])) {
        foreach ($data['best_flights'] as $flight) {
            // Bỏ qua chuyến bay có giá 0 hoặc NA
            if (!isset($flight['price']) || $flight['price'] <= 0) {
                continue;
            }
            $result['best_flights'][] = formatFlightDetails($flight, $airline_info);
        }
    }
    // Xử lý other_flights
    if (isset($data['other_flights'])) {
        foreach ($data['other_flights'] as $flight) {
            // Bỏ qua chuyến bay có giá 0 hoặc NA
            if (!isset($flight['price']) || $flight['price'] <= 0) {
                continue;
            }
            $result['other_flights'][] = formatFlightDetails($flight, $airline_info);
        }
    }
    // Xử lý thông tin sân bay
    if (isset($data['airports'])) {
        $result['airports'] = $data['airports'];
    }
    return $result;
}

// Hàm định dạng chi tiết chuyến bay (giữ nguyên 100% code gốc)
function formatFlightDetails($flight, $airline_info) {
    $formatted = [
        'flights' => [],
        'price_net' => isset($flight['price']) ? (int)$flight['price'] : 0, // Giá vé net
        'currency' => $flight['currency'] ?? 'VND',
        'type' => $flight['type'] ?? 'one_way',
        'baggage' => [
            'carry_on' => $flight['baggage']['carry_on'] ?? 'Không có thông tin',
            'checked' => $flight['baggage']['checked'] ?? 'Không có thông tin'
        ],
        'total_duration' => $flight['total_duration'] ?? 0,
        'layovers' => $flight['layovers'] ?? []
    ];
    foreach ($flight['flights'] as $leg) {
        $airline = $leg['airline'] ?? 'Không có thông tin';
        $logo_url = isset($leg['airline_logo']) ? $leg['airline_logo'] : ($airline_info[$airline]['logo'] ?? null);
       
        // Tải và lưu logo nếu có
        if ($logo_url && strpos($logo_url, 'pabuzo.vn') === false) {
            $logo_url = downloadAndSaveLogo($logo_url, str_replace(' ', '_', $airline), LOGO_DIR);
        }
        // Chuẩn hóa số hiệu chuyến bay
        $flight_number = $leg['flight_number'] ?? 'Không có thông tin';
        if ($flight_number !== 'Không có thông tin') {
            $flight_number = str_replace(['VJ', 'QH', 'VN', 'VU'], ['VJ ', 'QH ', 'VN ', 'VU '], $flight_number);
        }
        // Lấy loại tàu bay và nguồn dữ liệu
        $airplane = $leg['airplane'] ?? 'Không xác định';
        $airplane_source = isset($leg['airplane']) ? 'api' : 'unknown';
        // Lấy loại vé
        $travel_class = $leg['travel_class'] ?? 'Economy'; // Sử dụng travel_class từ SerpApi
        // Lấy thông tin hành lý mặc định nếu API không cung cấp
        $carry_on = $flight['baggage']['carry_on'] ?? ($airline_info[$airline]['default_carry_on'] ?? 'Không có thông tin');
        $checked = $flight['baggage']['checked'] ?? ($airline_info[$airline]['default_checked'] ?? 'Không có thông tin');
        // Thêm thông tin bổ sung (legroom, extensions)
        $legroom = $leg['legroom'] ?? 'Không có thông tin';
        $extensions = $leg['extensions'] ?? [];
        $formatted['flights'][] = [
            'departure_airport' => [
                'name' => $leg['departure_airport']['name'] ?? 'Không có thông tin',
                'id' => $leg['departure_airport']['id'] ?? '',
                'time' => $leg['departure_airport']['time'] ?? ''
            ],
            'arrival_airport' => [
                'name' => $leg['arrival_airport']['name'] ?? 'Không có thông tin',
                'id' => $leg['arrival_airport']['id'] ?? '',
                'time' => $leg['arrival_airport']['time'] ?? ''
            ],
            'airline' => $airline,
            'airline_logo' => $logo_url ?? 'Không có thông tin',
            'flight_number' => $flight_number,
            'duration' => $leg['duration'] ?? 0,
            'airplane' => $airplane,
            'airplane_source' => $airplane_source,
            'travel_class' => $travel_class,
            'legroom' => $legroom,
            'extensions' => $extensions
        ];
        // Cập nhật thông tin hành lý
        $formatted['baggage'] = [
            'carry_on' => $carry_on,
            'checked' => $checked
        ];
    }
    return $formatted;
}

// Lấy tham số từ query string
$departure_id = $_GET['departure_id'] ?? 'SGN';
$arrival_id = $_GET['arrival_id'] ?? 'HAN';
$outbound_date = $_GET['outbound_date'] ?? '2025-10-26';
$type = $_GET['type'] ?? 'one_way'; // Mặc định là một chiều
$return_date = $_GET['return_date'] ?? null;
$currency = $_GET['currency'] ?? 'VND';
$hl = $_GET['hl'] ?? 'vi';

// Kiểm tra type hợp lệ
if (!in_array($type, ['one_way', 'round_trip'])) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Tham số type phải là "one_way" hoặc "round_trip"'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Nếu là khứ hồi nhưng thiếu return_date
if ($type === 'round_trip' && !$return_date) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Tham số return_date là bắt buộc đối với chuyến bay khứ hồi'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Gọi API và lấy dữ liệu
$flight_data = getFlightData($departure_id, $arrival_id, $outbound_date, $type, $return_date, $currency, $hl);

// Định dạng dữ liệu thành JSON
$json_response = formatFlightData($flight_data);

// Trả về JSON
echo json_encode($json_response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>