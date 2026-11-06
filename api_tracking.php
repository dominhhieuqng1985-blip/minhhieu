<?php
/**
 * api_tracking.php – BẢN SỐNG SÓT CUỐI 2025 v4 (phiên bản 07/12/2025 - AVIATIONSTACK)
 * + Nguồn chính: AviationStack (free 100 req/th, mở cho VN, dùng IATA trực tiếp)
 * + Fallback: OpenSky + FR24
 * + Thêm simple logging nếu fail (check error.log)
 * + Lưu ý: Thay YOUR_AVIATIONSTACK_KEY bằng key thật từ https://aviationstack.com/signup/free
 */

header("Content-Type: application/json; charset=utf-8");
date_default_timezone_set("Asia/Ho_Chi_Minh");

// ========== CONFIG ==========
$CACHE_TTL = 15; // giây
$AVS_KEY = "0cb4b001788d6bca76ed48d36154e805"; // ← THAY BẰNG KEY THẬT TỪ https://aviationstack.com/
$AVS_BASE = "http://api.aviationstack.com/v1/flights?access_key=" . $AVS_KEY . "&flight_iata=";
$OPENSKY_URL = "https://opensky-network.org/api/states/all";
$FR24_SEARCH = "https://api.flightradar24.com/common/v1/flight/list.json?query=";

$MAP_FILE = __DIR__ . "/airlines_map.json";
$CACHE_DIR = __DIR__ . "/cache";
$LOG_FILE = __DIR__ . "/error.log"; // Log đơn giản cho debug
$UA = "Mozilla/5.0 (compatible; vemaybay-tracker/5.3; +https://vemaybaynhauyen.com)";
// =============================

function json_out($data) {
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function log_error($msg) {
    $log = date('Y-m-d H:i:s') . " - " . $msg . "\n";
    @file_put_contents($GLOBALS['LOG_FILE'], $log, FILE_APPEND | LOCK_EX);
}

function http_get($url, $timeout = 12) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_USERAGENT => $GLOBALS['UA'],
        CURLOPT_HTTPHEADER => ["Referer: https://vemaybaynhauyen.com/"]
    ]);
    $res = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    if ($error) log_error("HTTP GET error for $url: $error");
    return [$res, $http_code];
}

function safe_put($file, $content) {
    @file_put_contents($file . ".tmp", $content);
    @rename($file . ".tmp", $file);
}

function find_lat_lon($data) {
    if (!is_array($data) && !is_object($data)) return null;
    $arr = (array)$data;
    $lat = $arr['lat'] ?? $arr['latitude'] ?? null;
    $lon = $arr['lon'] ?? $arr['lng'] ?? $arr['long'] ?? $arr['longitude'] ?? null;
    if (is_numeric($lat) && is_numeric($lon)) {
        return ['lat' => floatval($lat), 'lon' => floatval($lon)];
    }
    foreach ($arr as $v) {
        if (is_array($v) || is_object($v)) {
            $r = find_lat_lon($v);
            if ($r) return $r;
        }
    }
    return null;
}

// ===== LOAD AIRLINE MAP =====
if (!is_dir($CACHE_DIR)) mkdir($CACHE_DIR, 0755, true);
$cacheDir = is_writable($CACHE_DIR) ? $CACHE_DIR : sys_get_temp_dir();

$map = [];
if (file_exists($MAP_FILE)) {
    $tmp = json_decode(file_get_contents($MAP_FILE), true);
    if (is_array($tmp)) $map = $tmp;
}

// Forced VN airlines
$vn_fix = ["VN" => "HVN", "VJ" => "VJC", "QH" => "BAV", "VU" => "VAG", "BL" => "PIC"];
foreach ($vn_fix as $iata => $icao) {
    $map[$iata]['icao'] = $icao;
    $map[$iata]['name'] = $map[$iata]['name'] ?? '';
}

// ===== PROCESS =====
$input = trim($_GET['chuyenbay'] ?? '');
if (!$input) json_out(["error" => "Thiếu tham số ?chuyenbay=VN270"]);

$flights = array_unique(array_filter(preg_split('/[,\s;]+/', strtoupper($input))));
$results = [];

foreach ($flights as $f) {

    if (!preg_match('/^([A-Z]{1,3})(\d{1,4}[A-Z]?)$/', $f, $m)) {
        $results[$f] = ["error" => "Sai định dạng"];
        continue;
    }

    $iata = $m[1];
    $num = $m[2];

    if (!isset($map[$iata]['icao'])) {
        $results[$f] = ["error" => "Không hỗ trợ hãng $iata"];
        continue;
    }

    $callsign = $map[$iata]['icao'] . $num;
    $cache_file = $cacheDir . "/" . $callsign . ".json";

    $result = [
        "input" => $f,
        "callsign" => $callsign,
        "airline" => $map[$iata]['name'] ?? $iata,
        "found" => false,
        "source" => null,
        "data" => null,
        "fr24_link" => "https://www.flightradar24.com/$f"
    ];

    // === CACHE ===
    if (file_exists($cache_file) && time() - filemtime($cache_file) < $CACHE_TTL) {
        $d = json_decode(file_get_contents($cache_file), true);
        if ($d && isset($d['lat'])) {
            $result['found'] = true;
            $result['source'] = ($d['source'] ?? "cache") . " (cache)";
            $result['data'] = $d;
            $results[$f] = $result;
            continue;
        }
    }

    $found = false;

    // ============================================================
    // 1) AVIATIONSTACK – NGUỒN CHÍNH 2025 (nếu có key)
    // ============================================================
    if ($AVS_KEY !== "YOUR_AVIATIONSTACK_KEY") {
        $avs_url = $AVS_BASE . $f;
        [$rAvs, $codeAvs] = http_get($avs_url);
        if ($codeAvs == 200 && $rAvs && ($jAvs = json_decode($rAvs, true)) && isset($jAvs['data']) && !empty($jAvs['data'][0])) {
            $flightData = $jAvs['data'][0];
            if (!empty($flightData['latitude']) && !empty($flightData['longitude'])) {
                $data = [
                    "lat" => $flightData['latitude'],
                    "lon" => $flightData['longitude'],
                    "altitude" => $flightData['altitude'] ?? null,
                    "speed" => $flightData['speed_horizontal'] ?? null,
                    "heading" => $flightData['direction'] ?? null,
                    "flight" => $flightData['flight_iata'] ?? $f,
                    "source" => "aviationstack",
                    "updated" => time()
                ];
                safe_put($cache_file, json_encode($data));
                $result['found'] = true;
                $result['source'] = "aviationstack";
                $result['data'] = $data;
                $results[$f] = $result;
                $found = true;
            }
        } else {
            log_error("AviationStack fail for $f: code $codeAvs");
        }
    } else {
        log_error("AviationStack key not set for $f – skipping");
    }

    // ============================================================
    // FALLBACK: OPENSKY (nếu chưa found)
    // ============================================================
    if (!$found) {
        [$r2] = http_get($OPENSKY_URL);
        if ($r2 && ($o = json_decode($r2, true)) && !empty($o['states'])) {
            foreach ($o['states'] as $s) {
                if (str_replace(" ", "", $s[1]) == $callsign && $s[5] && $s[6]) {
                    $data = [
                        "lat" => $s[6], "lon" => $s[5],
                        "altitude" => $s[7] ?? null,
                        "speed" => $s[9] ?? null,
                        "heading" => $s[10] ?? null,
                        "source" => "opensky",
                        "updated" => time()
                    ];
                    safe_put($cache_file, json_encode($data));
                    $result['found'] = true;
                    $result['source'] = "opensky";
                    $result['data'] = $data;
                    $results[$f] = $result;
                    $found = true;
                    break;
                }
            }
        } else {
            log_error("OpenSky fail for $f");
        }
    }

    // ============================================================
    // BACKUP: FR24 (nếu chưa found)
    // ============================================================
    if (!$found) {
        [$r3] = http_get($FR24_SEARCH . $f);
        if ($r3 && ($pos = find_lat_lon(json_decode($r3, true)))) {
            $data = [
                "lat" => $pos['lat'], "lon" => $pos['lon'],
                "source" => "fr24",
                "updated" => time()
            ];
            safe_put($cache_file, json_encode($data));
            $result['found'] = true;
            $result['source'] = "fr24";
            $result['data'] = $data;
            $results[$f] = $result;
            $found = true;
        } else {
            log_error("FR24 fail for $f");
        }
    }

    // ============================================================
    // KHÔNG TÌM THẤY
    // ============================================================
    if (!$found) {
        $result['data'] = [
            "message" => "Không thấy tín hiệu LIVE",
            "details" => ["Chưa cất cánh", "Đã hạ cánh", "Bay vùng yếu sóng", "ADS-B mất tín hiệu"],
            "tip" => "Thử lại sau 5–15 phút. Hoặc check FR24 link."
        ];
        $results[$f] = $result;
        log_error("No data found for $f");
    }
}

json_out([
    "status" => "ok",
    "timestamp" => time(),
    "query" => $input,
    "total" => count($results),
    "results" => $results,
    "author" => "vemaybaynhauyen.com – Tracking chuẩn nhất Việt Nam 12/2025 v4",
    "cache" => "TTL {$CACHE_TTL}s",
    "note" => "Nguồn chính: AviationStack (set key để full power). Fallback OpenSky/FR24. Check error.log nếu fail."
]);
?>