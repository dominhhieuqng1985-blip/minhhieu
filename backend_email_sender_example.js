<?php
// guimail.php - V5.2 LOGO UPDATE - Add Airline Logo to Email
require __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// ==== CẤU HÌNH ====
define('SMTP_HOST', 'smtp.bizflycloud.vn');
define('SMTP_PORT', 587);
define('SMTP_USER', 'nha.uyen@vemaybaynhauyen.com');
define('SMTP_PASS', 'AnhYeuEm@123');
define('ADMIN_EMAIL', 'nha.uyen@vemaybaynhauyen.com');
define('SENDER_NAME', 'Vemaybaynhauyen.com');
define('MAIL_LOG_FILE', __DIR__ . '/mail_error.log');

// CORS & Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit(); }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit(); }

// Logger
function mail_log($level, $message, $context = []) {
    $line = sprintf("[%s] %s: %s %s\n", date('Y-m-d H:i:s'), strtoupper($level), $message, json_encode($context, JSON_UNESCAPED_UNICODE));
    @file_put_contents(MAIL_LOG_FILE, $line, FILE_APPEND | LOCK_EX);
}

function arr_get($arr, $path, $default = null) {
    if (!is_array($arr)) return $default;
    $keys = explode('.', $path);
    $cur = $arr;
    foreach ($keys as $k) {
        if (is_array($cur) && array_key_exists($k, $cur)) $cur = $cur[$k];
        else return $default;
    }
    return $cur;
}

// === MAIN LOGIC ===
$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);

if (!is_array($payload) || !isset($payload['contact'])) {
    echo json_encode(['success' => false, 'message' => 'Dữ liệu đầu vào không hợp lệ']);
    exit();
}

$results = [];

// 1. Gửi mail cho khách
try {
    $custResult = sendCustomerConfirmation($payload);
    $results['customer'] = $custResult ? 'sent' : 'skipped';
} catch (Exception $e) {
    mail_log('error', 'Customer Mail Failed: ' . $e->getMessage());
    $results['customer'] = 'failed: ' . $e->getMessage();
}

// 2. Gửi mail cho Admin (Luôn cố gắng gửi kể cả khi mail khách lỗi)
try {
    if (arr_get($payload, 'status') !== 'thank_you') {
        sendAdminNotification($payload);
        $results['admin'] = 'sent';
    } else {
        $results['admin'] = 'skipped_thank_you';
    }
} catch (Exception $e) {
    mail_log('error', 'Admin Mail Failed: ' . $e->getMessage());
    $results['admin'] = 'failed: ' . $e->getMessage();
}

echo json_encode(['success' => true, 'details' => $results, 'message' => 'Đã xử lý yêu cầu gửi mail.']);


// --- HELPER FUNCTIONS ---
function formatDateTime($dateString, $format = 'H:i d/m/Y') { try { return (new DateTime($dateString))->format($format); } catch(Exception $e) { return 'N/A'; } }

function getPaymentDeadlinePHP($departureTimeStr, $bookingTimeStr) {
    try {
        $bookingTime = new DateTime($bookingTimeStr ?? 'now');
        $departureTime = new DateTime($departureTimeStr ?? $bookingTime->format('Y-m-d H:i:s'));
        $interval = $bookingTime->diff($departureTime);
        $hours = ($interval->days * 24) + $interval->h;
        $deadline = clone $bookingTime;
        if ($hours > 72) $deadline->add(new DateInterval('PT12H'));
        elseif ($hours > 24) $deadline->add(new DateInterval('PT4H'));
        else $deadline->add(new DateInterval('PT1H'));
        $limit = clone $departureTime;
        $limit->sub(new DateInterval('PT4H'));
        if ($deadline > $limit) $deadline = $limit;
        if ($deadline < $bookingTime) {
            $emergencyDeadline = clone $bookingTime;
            $emergencyDeadline->add(new DateInterval('PT30M'));
            $deadline = min($emergencyDeadline, $limit);
        }
        return 'trước ' . $deadline->format('H:i \n\gà\y d/m/Y');
    } catch(Exception $e) { return "trong vòng 4 giờ tới"; }
}

function safe_html($s) { return htmlspecialchars((string)$s); }

function translateTitle($title) {
    $map = ['Mr' => 'Ông', 'Mrs' => 'Bà', 'Miss' => 'Cô', 'Master' => 'Bé trai', 'MissChild' => 'Bé gái'];
    if ($title === 'Miss') return 'Cô/Bé gái';
    return $map[$title] ?? $title;
}

function formatDateSimple($dateString) { if (!$dateString) return 'N/A'; try { return (new DateTime($dateString))->format('d/m/Y'); } catch(Exception $e) { return 'N/A'; } }
function formatTime($dateString) { if (!$dateString) return 'N/A'; try { return (new DateTime($dateString))->format('H:i'); } catch(Exception $e) { return 'N/A'; } }

// --- MAIN EMAIL GENERATOR ---
function generateETicketHTML($data) {
    $pnr = safe_html(arr_get($data, 'pnr', 'N/A'));
    $id = safe_html(arr_get($data, 'id', 'N/A'));
    $status = arr_get($data, 'status', 'pending');
    $payment_status = arr_get($data, 'payment_status', 'pending');
    $contact = arr_get($data, 'contact', []);
    $passengers = arr_get($data, 'passengers', []);
    $flights = arr_get($data, 'bookingDetails.selected_flights', []);
    $bookingTime = arr_get($data, 'bookingTimestamp');
    $admin_note = safe_html(arr_get($data, 'admin_note', ''));
    
    // Dynamic Status Logic
    $paymentStatusText = "CHƯA THANH TOÁN";
    $paymentStatusColor = "#f59e0b"; // Orange
    $bookingStatusText = "ĐÃ XÁC NHẬN";
    $bookingStatusColor = "#3b82f6"; // Blue
    $deadlineMsg = '';
    
    $eTicketNumberHtml = ''; 

    if ($status === 'cancelled') {
        $paymentStatusText = "ĐÃ HỦY";
        $paymentStatusColor = "#ef4444"; // Red
        $bookingStatusText = "ĐÃ HỦY";
        $bookingStatusColor = "#ef4444";
        $deadlineMsg = "Đơn hàng này đã bị hủy. Vé không còn hiệu lực.";
    } elseif ($status === 'delayed') {
        $paymentStatusText = "THAY ĐỔI LỊCH BAY";
        $paymentStatusColor = "#ea580c"; // Orange-600
        $bookingStatusText = "BỊ HOÃN / DELAY";
        $bookingStatusColor = "#ea580c";
        $deadlineMsg = "Lịch bay của quý khách đã có sự thay đổi. " . ($admin_note ? "<strong>Chi tiết: " . $admin_note . "</strong>" : "Vui lòng kiểm tra thông tin chuyến bay mới bên dưới hoặc liên hệ đại lý.");
    } elseif ($status === 'thank_you') {
        $paymentStatusText = "HOÀN THÀNH";
        $paymentStatusColor = "#22c55e"; // Green
        $bookingStatusText = "HOÀN TẤT";
        $bookingStatusColor = "#15803d"; // Dark Green
        $deadlineMsg = "Chuyến bay đã hoàn tất. Cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ.";
    } elseif ($payment_status === 'paid' || $status === 'paid' || $status === 'confirmed') {
        $paymentStatusText = "ĐÃ THANH TOÁN";
        $paymentStatusColor = "#22c55e"; // Green
        $bookingStatusText = "ĐÃ XÁC NHẬN";
        $deadlineMsg = "Vé đã được thanh toán và có giá trị sử dụng để làm thủ tục bay.";
        
        // Generate E-Ticket Number Logic
        $cleanId = preg_replace('/\D/', '', $id);
        $cleanId = str_pad($cleanId, 10, '0', STR_PAD_RIGHT);
        $cleanId = substr($cleanId, 0, 10);
        $generatedTkt = "738-" . $cleanId;
        
        $eTicketNumberHtml = "<div style='margin-top: 5px;'><span style='font-weight: bold;'>Số vé điện tử:</span> <span style='color: #15803d; font-weight: bold; font-family: monospace; font-size: 16px;'>{$generatedTkt}</span></div>";
    } else {
        $depTime = arr_get($data, 'bookingDetails.selected_flights.0.flights.0.departure_airport.time', '');
        $deadline = getPaymentDeadlinePHP($depTime, $bookingTime);
        $deadlineMsg = "Quý khách vui lòng hoàn tất thanh toán cho đơn hàng này {$deadline} để đảm bảo vé được xuất thành công.";
    }

    $qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" . urlencode($pnr);

    $outboundFareTitle = safe_html(arr_get($data, 'selectedOutboundOption.together.option_title', 'Phổ thông'));
    $outboundBaggage = arr_get($data, 'selectedOutboundOption.together.baggage_prices', []);
    $outboundExtra = safe_html(arr_get($data, 'ancillaries.outboundBaggage.name'));
    $inboundFareTitle = safe_html(arr_get($data, 'selectedInboundOption.together.option_title'));
    $inboundBaggage = arr_get($data, 'selectedInboundOption.together.baggage_prices', []);
    $inboundExtra = safe_html(arr_get($data, 'ancillaries.inboundBaggage.name'));

    // Build HTML string
    $html = "<div style='font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 20px; color: #333;'>
    <div style='max-width: 800px; margin: 0 auto; background-color: white; border: 4px solid #e5e7eb; padding: 20px;'>
        
        <table width='100%' style='border-bottom: 2px solid #b91c1c; padding-bottom: 10px; margin-bottom: 20px;'><tr><td align='left'><span style='font-size: 24px; font-weight: bold; color: #0056b3;'>Nhã Uyên</span><span style='font-size: 24px; font-weight: bold; color: #b91c1c;'> AIR</span><div style='font-size: 12px; color: #666;'>vemaybaynhauyen.com</div></td><td align='right' valign='middle'><div style='font-weight: bold; font-size: 14px;'>Hotline hỗ trợ</div><div style='color: #b91c1c; font-size: 20px; font-weight: bold;'>0961000240</div></td></tr></table>
        <div style='text-align: center; margin-bottom: 20px;'><h1 style='color: #b91c1c; margin: 0; font-size: 24px; text-transform: uppercase;'>VÉ ĐIỆN TỬ VÀ XÁC NHẬN HÀNH TRÌNH</h1><p style='font-size: 13px; color: #555; margin-top: 5px;'>Đây không phải là thẻ lên tàu bay.</p></div>
        <div style='border: 1px solid #ccc; padding: 15px; border-radius: 8px; margin-bottom: 25px; position: relative;'><div style='position: absolute; top: -10px; left: 15px; background: #fff; padding: 0 5px; font-size: 12px; color: #666; font-weight: bold;'>Mã đặt chỗ</div><table width='100%'><tr><td width='100' align='center'><img src='{$qrUrl}' width='80' height='80' alt='QR'></td><td align='center'><div style='font-size: 12px; color: #888;'>QR Code for PNR {$pnr}</div><div style='font-size: 36px; font-weight: bold; color: #b91c1c; letter-spacing: 2px;'>{$pnr}</div></td></tr></table></div>

        <h2 style='background-color: #b91c1c; color: white; padding: 8px; margin: 0; font-size: 16px; font-weight: bold;'>1. Thông tin đặt chỗ</h2>
        <div style='border: 1px solid #ddd; border-top: 0; padding: 15px; margin-bottom: 20px; font-size: 14px;'><table width='100%'><tr>
            <td width='50%' valign='top' style='padding-right: 10px;'>
                <div style='font-weight: bold;'>Mã đơn hàng:</div><div style='color: #0056b3; font-weight: bold; margin-bottom: 10px;'>{$id}</div>
                <div style='font-weight: bold;'>Trạng thái đặt chỗ:</div><div style='color: {$bookingStatusColor}; font-weight: bold; margin-bottom: 10px;'>{$bookingStatusText}</div>
                <div style='font-weight: bold;'>Trạng thái thanh toán:</div><div style='color: {$paymentStatusColor}; font-weight: bold; margin-bottom: 10px; text-transform: uppercase;'>{$paymentStatusText}</div>
                {$eTicketNumberHtml}
            </td>
            <td width='50%' valign='top'><div style='font-weight: bold;'>Ngày giờ đặt:</div><div style='margin-bottom: 10px;'>" . formatDateTime($bookingTime) . "</div><div style='font-weight: bold;'>Liên lạc:</div><div style='margin-bottom: 5px;'>" . safe_html($contact['fullName']) . "</div><div style='margin-bottom: 5px;'>" . safe_html($contact['email']) . "</div><div style='margin-bottom: 10px;'>" . safe_html($contact['phone']) . "</div></td>
        </tr></table></div>

        <h2 style='background-color: #b91c1c; color: white; padding: 8px; margin: 0; font-size: 16px; font-weight: bold;'>2. Thông tin hành khách</h2>
        <div style='border: 1px solid #ddd; border-top: 0; padding: 0; margin-bottom: 20px;'><table width='100%' cellpadding='8' cellspacing='0' style='font-size: 14px; border-collapse: collapse;'><tr style='background-color: #f3f4f6;'><th align='left' style='border-bottom: 1px solid #ccc;'>Hành khách</th><th align='left' style='border-bottom: 1px solid #ccc;'>Ngày sinh</th><th align='left' style='border-bottom: 1px solid #ccc;'>CCCD/Passport</th></tr>";
        foreach ($passengers as $p) { 
            $title = arr_get($p, 'title', '');
            $type = arr_get($p, 'type', 'Adult');
            if (($type === 'Child' || $type === 'Infant') && $title === 'Miss') $title = 'MissChild';
            
            $html .= "<tr><td style='border-bottom: 1px solid #eee;'>" . translateTitle($title) . " " . strtoupper(safe_html($p['fullName'])) . "</td><td style='border-bottom: 1px solid #eee;'>" . formatDateSimple(arr_get($p, 'dob')) . "</td><td style='border-bottom: 1px solid #eee;'>" . safe_html(arr_get($p, 'idNumber', '')) . "</td></tr>"; 
        }
    $html .= "</table><div style='padding: 10px 15px; background-color: #fff; border-top: 1px solid #eee;'><div style='font-weight: bold; margin-bottom: 5px; font-size: 15px;'>Hành lý & Dịch vụ</div><div style='font-size: 13px; line-height: 1.5;'><div style='margin-bottom: 5px;'><strong>Chuyến đi: {$outboundFareTitle}</strong><br>";
        foreach($outboundBaggage as $bag) $html .= "- {$bag}<br>";
        if ($outboundExtra) $html .= "<span style='color: #0056b3;'>- Mua thêm: {$outboundExtra}</span><br>";
    $html .= "</div>";
    if ($inboundFareTitle) { $html .= "<div style='margin-top: 8px;'><strong>Chuyến về: {$inboundFareTitle}</strong><br>"; foreach($inboundBaggage as $bag) $html .= "- {$bag}<br>"; if ($inboundExtra) $html .= "<span style='color: #0056b3;'>- Mua thêm: {$inboundExtra}</span><br>"; $html .= "</div>"; }
    $html .= "</div></div></div>
    
        <h2 style='background-color: #b91c1c; color: white; padding: 8px; margin: 0; font-size: 16px; font-weight: bold;'>3. Chi tiết hành trình</h2>
        <div style='border: 1px solid #ddd; border-top: 0; padding: 0; margin-bottom: 20px;'><table width='100%' cellpadding='8' cellspacing='0' style='font-size: 13px; border-collapse: collapse;'><tr style='background-color: #f3f4f6;'><th align='left' style='border-bottom: 1px solid #ccc;'>Chuyến bay</th><th align='left' style='border-bottom: 1px solid #ccc;'>Ngày</th><th align='left' style='border-bottom: 1px solid #ccc;'>Hành trình</th><th align='left' style='border-bottom: 1px solid #ccc;'>Giờ đi</th><th align='left' style='border-bottom: 1px solid #ccc;'>Giờ đến</th><th align='left' style='border-bottom: 1px solid #ccc;'>Hạng</th><th align='left' style='border-bottom: 1px solid #ccc;'>Trạng thái</th></tr>";
        foreach ($flights as $leg) {
            $isReturn = strpos(strtolower($leg['type']), 'về') !== false;
            $fare = $isReturn ? $inboundFareTitle : $outboundFareTitle;
            foreach ($leg['flights'] as $f) {
                $dep = $f['departure_airport']; $arr = $f['arrival_airport'];
                $depTimeVal = $dep['time'];
                $arrTimeVal = $arr['time'];
                
                // Add Logo Logic Here
                $logoUrl = arr_get($f, 'airline_logo');
                $logoHtml = $logoUrl ? "<img src='{$logoUrl}' width='25' height='25' style='vertical-align:middle; margin-right:5px; object-fit:contain;' alt='Logo'>" : "";
                
                $html .= "<tr>
                    <td style='border-bottom: 1px solid #eee;'>
                        <div style='margin-bottom:2px;'>{$logoHtml}<strong>" . safe_html($f['airline']) . "</strong></div>
                        <div style='font-size:11px; color:#555;'>" . safe_html($f['flight_number']) . "</div>
                    </td>
                    <td style='border-bottom: 1px solid #eee;'>" . formatDateSimple($depTimeVal) . "</td>
                    <td style='border-bottom: 1px solid #eee;'><strong>" . safe_html($dep['id']) . "</strong> &#8594; <strong>" . safe_html($arr['id']) . "</strong></td>
                    <td style='border-bottom: 1px solid #eee; font-weight: bold;'>" . formatTime($depTimeVal) . "</td>
                    <td style='border-bottom: 1px solid #eee; font-weight: bold;'>" . formatTime($arrTimeVal) . "</td>
                    <td style='border-bottom: 1px solid #eee;'>{$fare}</td>
                    <td style='border-bottom: 1px solid #eee; color: {$bookingStatusColor};'>{$bookingStatusText}</td>
                </tr>";
            }
        }
    $html .= "</table></div>

        <h2 style='background-color: #b91c1c; color: white; padding: 8px; margin: 0; font-size: 16px; font-weight: bold;'>4. Lưu ý quan trọng</h2>
        <div style='border: 1px solid #ddd; border-top: 0; padding: 15px; margin-bottom: 20px; font-size: 14px; line-height: 1.6;'>
            <p><strong style='color:{$paymentStatusColor}'>".($status === 'delayed' ? 'Thông báo' : ($payment_status === 'paid' ? 'Thông báo' : 'Thanh toán')).":</strong> {$deadlineMsg}</p>
            <p><strong>Giấy tờ:</strong> Vui lòng mang theo giấy tờ tùy thân hợp lệ (CCCD, Passport) khi làm thủ tục tại sân bay.</p>
            <p><strong>Thời gian:</strong> Có mặt tại sân bay trước giờ khởi hành ít nhất 90 phút (Nội địa) và 180 phút (Quốc tế).</p>
        </div>

        <div style='text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 15px;'>
            Cảm ơn quý khách đã sử dụng dịch vụ của Vemaybaynhauyen.com. Chúc quý khách một chuyến bay tốt đẹp!
        </div>
    </div></div>";
    
    return $html;
}

function createMailer() {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = SMTP_HOST;
    $mail->SMTPAuth = true;
    $mail->Username = SMTP_USER;
    $mail->Password = SMTP_PASS;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = SMTP_PORT;
    $mail->setFrom(SMTP_USER, SENDER_NAME);
    $mail->CharSet = 'UTF-8';
    return $mail;
}

function sendCustomerConfirmation($payload) {
    $email = arr_get($payload, 'contact.email');
    if (!$email) return false;
    
    $status = arr_get($payload, 'status');
    $payment_status = arr_get($payload, 'payment_status');
    $pnr = arr_get($payload, 'pnr');
    
    $subject = "[XÁC NHẬN] Đơn hàng {$pnr}";
    
    if ($status === 'cancelled') {
        $subject = "[HỦY VÉ] Thông báo đơn hàng {$pnr}";
    } elseif ($status === 'delayed') {
        $subject = "[THAY ĐỔI LỊCH BAY] Thông báo quan trọng đơn hàng {$pnr}";
    } elseif ($status === 'thank_you') {
        $subject = "[CẢM ƠN] Cảm ơn quý khách đã sử dụng dịch vụ";
    } elseif ($payment_status === 'paid' || $status === 'paid' || $status === 'confirmed') {
        $subject = "[VÉ ĐIỆN TỬ] Đơn hàng {$pnr} - Đã xuất vé";
    }

    $mail = createMailer();
    $mail->addAddress($email);
    $mail->Subject = $subject;
    $mail->isHTML(true);
    $mail->Body = generateETicketHTML($payload);
    $mail->send();
    return true;
}

function sendAdminNotification($payload) {
    $mail = createMailer();
    $mail->addAddress(ADMIN_EMAIL);
    $status = arr_get($payload, 'status', 'pending');
    
    $subjectPrefix = strtoupper($status);
    if ($status === 'delayed') $subjectPrefix = 'DELAY/CHANGE';
    
    $mail->Subject = '[ADMIN - ' . $subjectPrefix . '] Booking: ' . arr_get($payload, 'pnr');
    $mail->isHTML(true);
    $mail->Body = generateETicketHTML($payload);
    $mail->send();
}
?>