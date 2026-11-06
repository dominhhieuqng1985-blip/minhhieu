<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
// api_db.php - PHIÊN BẢN NÂNG CẤP 2025 V4 - FIX: Remove duplicate function + Full cases + Null checks for json_decode
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
include 'config.php'; // PDO connection + VNPay config
$action = $_GET['action'] ?? ''; // Match chính xác case gốc
$input = json_decode(file_get_contents('php://input'), true) ?? [];
// ==================== HELPER FUNCTIONS ====================
function hashPassword($pass) {
    return password_hash($pass, PASSWORD_DEFAULT);
}
function verifyPassword($pass, $hashed) {
    return password_verify($pass, $hashed);
}
// Helper: Generate random PNR (6 uppercase chars)
function generatePNR() {
    return strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 6));
}
// ==================== VNPAY HELPER FUNCTIONS (MỚI - DỄ MỞ RỘNG) ====================
// Function tạo URL thanh toán VNPay (dễ thêm gateway khác)
function createVNPayUrl($bookingId, $total_amount, $orderInfo = 'Thanh toán đặt vé máy bay') {
    global $vnp_Url, $vnp_TmnCode, $vnp_HashSecret, $vnp_ReturnUrl;
    $vnp_TxnRef = $bookingId; // Sử dụng booking ID làm TxnRef
    $vnp_Amount = $total_amount * 100; // VND x100
    $vnp_CreateDate = date('YmdHis');
    $vnp_ExpireDate = date('YmdHis', strtotime('+15 minutes', time())); // Hết hạn 15p
    $vnp_IpAddr = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $vnp_Locale = 'vn';
    $vnp_OrderType = 'other';
    $inputData = [
        "vnp_Version" => "2.1.0",
        "vnp_TmnCode" => $vnp_TmnCode,
        "vnp_Amount" => $vnp_Amount,
        "vnp_Command" => "pay",
        "vnp_CreateDate" => $vnp_CreateDate,
        "vnp_CurrCode" => "VND",
        "vnp_IpAddr" => $vnp_IpAddr,
        "vnp_Locale" => $vnp_Locale,
        "vnp_OrderInfo" => $orderInfo,
        "vnp_OrderType" => $vnp_OrderType,
        "vnp_ReturnUrl" => $vnp_ReturnUrl,
        "vnp_TxnRef" => $vnp_TxnRef,
        "vnp_ExpireDate" => $vnp_ExpireDate
    ];
    // Optional: Thêm bank_code nếu chỉ định
    global $input;
    if (!empty($input['bank_code'] ?? '')) {
        $inputData['vnp_BankCode'] = $input['bank_code'];
    }
    ksort($inputData);
    $query = "";
    $hashdata = "";
    $i = 0;
    foreach ($inputData as $key => $value) {
        if ($i == 1) {
            $hashdata .= '&' . urlencode($key) . "=" . urlencode($value);
        } else {
            $hashdata .= urlencode($key) . "=" . urlencode($value);
            $i = 1;
        }
        $query .= urlencode($key) . "=" . urlencode($value) . '&';
    }
    $vnpUrl = $vnp_Url . "?" . $query;
    $vnpSecureHash = hash_hmac('sha512', $hashdata, $vnp_HashSecret);
    $vnpUrl .= 'vnp_SecureHash=' . $vnpSecureHash;
    return $vnpUrl;
}
// Function verify VNPay hash (FIX: Remove duplicate)
function verifyVNPayHash($inputData) {
    global $vnp_HashSecret;
    $vnp_SecureHash = $inputData['vnp_SecureHash'] ?? '';
    unset($inputData['vnp_SecureHash']);
    ksort($inputData);
    $hashData = "";
    $i = 0;
    foreach ($inputData as $key => $value) {
        if (substr($key, 0, 4) == "vnp_") { // Chỉ lấy vnp_ params
            if ($i == 1) {
                $hashData .= '&' . urlencode($key) . "=" . urlencode($value);
            } else {
                $hashData .= urlencode($key) . "=" . urlencode($value);
                $i = 1;
            }
        }
    }
    $secureHash = hash_hmac('sha512', $hashData, $vnp_HashSecret);
    return ($secureHash === $vnp_SecureHash);
}
// ==================== SWITCH ACTION ====================
switch ($action) {
    // ==================== USERS ====================
    case 'register':
        $name = trim($input['name'] ?? '');
        $email = trim($input['email'] ?? '');
        $phone = trim($input['phone'] ?? '');
        $password = $input['password'] ?? '';
        $gender = $input['gender'] ?? null;
        $dob = $input['dob'] ?? null;
        $address = trim($input['address'] ?? '');
        $id_card = trim($input['id_card'] ?? '');
        $nationality = trim($input['nationality'] ?? 'Việt Nam');
        if (empty($email) || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'Thiếu email hoặc mật khẩu!']);
            exit;
        }
        try {
            $stmt = $pdo->prepare("SELECT id FROM Users WHERE email = ?");
            $stmt->execute([$email]);
            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => false, 'message' => 'Email đã tồn tại!']);
                exit;
            }
            $hashed = hashPassword($password);
            $stmt = $pdo->prepare("INSERT INTO Users
                (email, name, phone, password, gender, dob, address, id_card, nationality, loyalty_points)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)"); // Thêm loyalty_points mặc định 0
            $stmt->execute([$email, $name, $phone, $hashed, $gender, $dob, $address, $id_card, $nationality]);
            echo json_encode(['success' => true, 'message' => 'Đăng ký thành công!']);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
    case 'login':
        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';
        try {
            $stmt = $pdo->prepare("SELECT * FROM Users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($user && verifyPassword($password, $user['password'])) {
                unset($user['password']);
                echo json_encode(['success' => true, 'user' => $user]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Sai email hoặc mật khẩu!']);
            }
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
    case 'get_users':
        try {
            $stmt = $pdo->query("SELECT IFNULL(id,0) as id,email,name,phone,gender,DATE_FORMAT(dob,'%d/%m/%Y') as dob,address,id_card,nationality,loyalty_points FROM Users ORDER BY id DESC"); // Thêm loyalty_points
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($users);
        } catch (PDOException $e) {
            echo json_encode(['error'=>$e->getMessage()]);
        }
        break;
    case 'admin_update_user':
        $id = $input['id'] ?? 0;
        $name = trim($input['name'] ?? '');
        $phone = trim($input['phone'] ?? '');
        $gender = $input['gender'] ?? null;
        $dob = $input['dob'] ?? null;
        $address = trim($input['address'] ?? '');
        $id_card = trim($input['id_card'] ?? '');
        $nationality = $input['nationality'] ?? 'Việt Nam';
        $loyalty_points = (int)($input['loyalty_points'] ?? 0); // Thêm cập nhật điểm
        try {
            $stmt = $pdo->prepare("UPDATE Users SET name=?,phone=?,gender=?,dob=?,address=?,id_card=?,nationality=?,loyalty_points=? WHERE id=?");
            $stmt->execute([$name,$phone,$gender,$dob,$address,$id_card,$nationality,$loyalty_points,$id]);
            echo json_encode(['success'=>true,'message'=>'Cập nhật thông tin thành công']);
        } catch (PDOException $e) {
            echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
        }
        break;
    case 'admin_reset_password':
        $id = $input['id'] ?? 0;
        $newPass = $input['newPassword'] ?? '123456';
        $hashed = hashPassword($newPass);
        try {
            $stmt = $pdo->prepare("UPDATE Users SET password=? WHERE id=?");
            $stmt->execute([$hashed,$id]);
            echo json_encode(['success'=>true,'message'=>"Đặt lại mật khẩu thành công! Mật khẩu mới: $newPass"]);
        } catch (PDOException $e) {
            echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
        }
        break;
    case 'admin_delete_user':
        $id = $input['id'] ?? 0;
        if(!$id){echo json_encode(['success'=>false,'message'=>'Thiếu ID user']);exit;}
        try{
            $pdo->beginTransaction();
            $pdo->prepare("DELETE FROM Bookings WHERE user_id=?")->execute([$id]);
            $pdo->prepare("DELETE FROM Users WHERE id=?")->execute([$id]);
            $pdo->commit();
            echo json_encode(['success'=>true,'message'=>'Xóa thành viên và tất cả đơn hàng thành công!']);
        }catch(Exception $e){
            $pdo->rollBack();
            echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
        }
        break;
    // ==================== BOOKINGS ====================
    case 'create_booking':
        $user_id = $input['user_id'] ?? null;
        if (!$user_id) {echo json_encode(['success'=>false,'message'=>'Thiếu user_id!']);exit;}
        $passengers = json_encode($input['passengers']??[]);
        $contact = json_encode($input['contact']??[]);
        $ancillaries = json_encode($input['ancillaries']??null);
        $flight = json_encode($input['flight']??[]);
        $bookingDetails = json_encode($input['bookingDetails']??[]);
        $selectedOutboundOption = json_encode($input['selectedOutboundOption']??[]);
        $selectedInboundOption = json_encode($input['selectedInboundOption']??null);
        $bookingTimestamp = date('Y-m-d H:i:s');
        // FIX: Auto-gen id/pnr nếu null để tránh NOT NULL error
        $id = $input['id'] ?? uniqid('BK'); // e.g., BK66a123
        $pnr = $input['pnr'] ?? generatePNR(); // Random 6 chars
        $total_amount = (float)($input['total_amount'] ?? 0);
        $payment_status = $input['payment_status'] ?? 'pending';
        try{
            $stmt = $pdo->prepare("INSERT INTO Bookings (id,pnr,user_id,bookingTimestamp,passengers,contact,ancillaries,flight,bookingDetails,selectedOutboundOption,selectedInboundOption,status,total_amount,payment_status,payment_info,cancellation_reason) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,NULL)");
            $stmt->execute([$id,$pnr,$user_id,$bookingTimestamp,$passengers,$contact,$ancillaries,$flight,$bookingDetails,$selectedOutboundOption,$selectedInboundOption,'pending',$total_amount,$payment_status]);
            echo json_encode(['success'=>true,'message'=>'Đặt vé thành công! ID: ' . $id . ', PNR: ' . $pnr]);
        }catch(PDOException $e){
            echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
        }
        break;
    case 'get_bookings': // Match chính xác 'get_Bookings' (B hoa)
        try{
            $stmt=$pdo->query("SELECT b.*,u.email,u.name as user_name FROM Bookings b LEFT JOIN Users u ON b.user_id=u.id ORDER BY b.bookingTimestamp DESC");
            $bookings=$stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach($bookings as &$b){
                // FIX Warning: Check null trước json_decode
                $b['passengers'] = (!is_null($b['passengers']) ? json_decode($b['passengers'],true) : []);
                $b['contact'] = (!is_null($b['contact']) ? json_decode($b['contact'],true) : []);
                $b['ancillaries'] = (!is_null($b['ancillaries']) ? json_decode($b['ancillaries'],true) : null);
                $b['flight'] = (!is_null($b['flight']) ? json_decode($b['flight'],true) : []);
                $b['bookingDetails'] = (!is_null($b['bookingDetails']) ? json_decode($b['bookingDetails'],true) : []);
                $b['selectedOutboundOption'] = (!is_null($b['selectedOutboundOption']) ? json_decode($b['selectedOutboundOption'],true) : []);
                $b['selectedInboundOption'] = (!is_null($b['selectedInboundOption']) ? json_decode($b['selectedInboundOption'],true) : null);
                $b['payment_info'] = (!is_null($b['payment_info']) ? json_decode($b['payment_info'],true) : []); // Decode payment_info nếu có
            }
            echo json_encode($bookings);
        }catch(PDOException $e){
            echo json_encode(['error'=>$e->getMessage()]);
        }
        break;
    case 'get_my_bookings':
        $userId = $input['userId']??0;
        try{
            $stmt=$pdo->prepare("SELECT * FROM Bookings WHERE user_id=? ORDER BY bookingTimestamp DESC");
            $stmt->execute([$userId]);
            $bookings=$stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach($bookings as &$b){
                // FIX: Add null checks to avoid deprecation
                $b['passengers']= (!is_null($b['passengers']) ? json_decode($b['passengers'],true) : []);
                $b['contact']= (!is_null($b['contact']) ? json_decode($b['contact'],true) : []);
                $b['ancillaries']= (!is_null($b['ancillaries']) ? json_decode($b['ancillaries'],true) : null);
                $b['flight']= (!is_null($b['flight']) ? json_decode($b['flight'],true) : []);
                $b['bookingDetails']= (!is_null($b['bookingDetails']) ? json_decode($b['bookingDetails'],true) : []);
                $b['selectedOutboundOption']= (!is_null($b['selectedOutboundOption']) ? json_decode($b['selectedOutboundOption'],true) : []);
                $b['selectedInboundOption']= (!is_null($b['selectedInboundOption']) ? json_decode($b['selectedInboundOption'],true) : null);
                $b['payment_info']= (!is_null($b['payment_info']) ? json_decode($b['payment_info'],true) : []); // Decode payment_info
            }
            echo json_encode($bookings);
        }catch(PDOException $e){
            echo json_encode(['error'=>$e->getMessage()]);
        }
        break;
    case 'admin_delete_booking':
        $bookingId = $input['bookingId']??$input['id']??$input['pnr']??'';
        if(!$bookingId){echo json_encode(['success'=>false,'message'=>'Thiếu ID/PNR']);exit;}
        try{
            $stmt=$pdo->prepare("DELETE FROM Bookings WHERE id=? OR pnr=?");
            $stmt->execute([$bookingId,$bookingId]);
            echo json_encode(['success'=>true,'message'=>'Xóa booking thành công']);
        }catch(PDOException $e){
            echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
        }
        break;
    case 'admin_update_booking_status':
        $bookingId = $input['bookingId']??'';
        $status = $input['status']??'confirmed';
        $note = $input['admin_note']??'';
        try{
            $stmt=$pdo->prepare("UPDATE Bookings SET status=?, admin_note=? WHERE id=? OR pnr=?");
            $stmt->execute([$status,$note,$bookingId,$bookingId]);
            echo json_encode(['success'=>true,'message'=>'Cập nhật trạng thái thành công']);
        }catch(PDOException $e){
            echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
        }
        break;
    // Case mới: Cập nhật PNR cho Booking
    case 'update_booking_pnr':
        $bookingId = $input['bookingId'] ?? $input['id'] ?? null;
        $newPnr = trim($input['pnr'] ?? '');
        if (!$bookingId || empty($newPnr)) {
            echo json_encode([
                'success' => false,
                'message' => 'Thiếu bookingId hoặc PNR!'
            ]);
            exit;
        }
        try {
            // Không cho trùng PNR
            $check = $pdo->prepare("SELECT id FROM Bookings WHERE pnr = ?");
            $check->execute([$newPnr]);
            if ($check->rowCount() > 0) {
                echo json_encode([
                    'success' => false,
                    'message' => 'PNR đã tồn tại trong hệ thống!'
                ]);
                exit;
            }
            $stmt = $pdo->prepare(
                "UPDATE Bookings SET pnr = ?
                 WHERE id = ? OR pnr = ?"
            );
            $stmt->execute([$newPnr, $bookingId, $bookingId]);
            echo json_encode([
                'success' => true,
                'message' => 'Cập nhật PNR thành công!'
            ]);
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }
        break;
    case 'update_booking_time':
        $bookingId = $input['bookingId'] ?? null;
        $newTime = $input['update_bookingTimestamp'] ?? null;
        if (!$bookingId || !$newTime) {
            echo json_encode([
                'success' => false,
                'message' => 'Thiếu bookingId hoặc update_bookingTimestamp!'
            ]);
            exit;
        }
        try {
            $stmt = $pdo->prepare("
                UPDATE Bookings
                SET update_bookingTimestamp = ?
                WHERE id = ? OR pnr = ?
            ");
            $stmt->execute([$newTime, $bookingId, $bookingId]);
            echo json_encode([
                'success' => true,
                'message' => 'Cập nhật thời gian cập nhật Booking thành công!',
                'update_bookingTimestamp' => $newTime
            ]);
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }
        break;
    // ==================== CHỨC NĂNG MỚI: QUẢN LÝ THANH TOÁN VÀ HỦY VÉ ====================
    // Case mới: Xử lý thanh toán (cập nhật payment_status và lưu info)
    case 'process_payment':
        $bookingId = $input['bookingId'] ?? '';
        $payment_status = $input['payment_status'] ?? 'paid';
        $payment_info = json_encode($input['payment_info'] ?? []); // JSON: {method: 'VNPay', transaction_id: '...'}
        $total_amount = (float)($input['total_amount'] ?? 0);
        if (!$bookingId) {
            echo json_encode(['success' => false, 'message' => 'Thiếu bookingId!']);
            exit;
        }
        try {
            $stmt = $pdo->prepare("UPDATE Bookings SET payment_status=?, payment_info=?, total_amount=? WHERE id=? OR pnr=?");
            $stmt->execute([$payment_status, $payment_info, $total_amount, $bookingId, $bookingId]);
            // Cập nhật điểm loyalty cho user nếu thanh toán thành công
            if ($payment_status === 'paid') {
                $user_id_stmt = $pdo->prepare("SELECT user_id FROM Bookings WHERE id=? OR pnr=?");
                $user_id_stmt->execute([$bookingId, $bookingId]);
                $user_id = $user_id_stmt->fetchColumn();
                if ($user_id) {
                    $points_to_add = (int)($total_amount / 1000); // Ví dụ: 1 điểm mỗi 1000 VND
                    $pdo->prepare("UPDATE Users SET loyalty_points = loyalty_points + ? WHERE id=?")->execute([$points_to_add, $user_id]);
                }
                // Thêm: Tự động confirmed nếu chưa
                $check_status = $pdo->prepare("SELECT status FROM Bookings WHERE id=? OR pnr=?");
                $check_status->execute([$bookingId, $bookingId]);
                $current_status = $check_status->fetchColumn();
                if ($current_status === 'pending') {
                    $pdo->prepare("UPDATE Bookings SET status='confirmed' WHERE id=? OR pnr=?")->execute([$bookingId, $bookingId]);
                }
            }
            echo json_encode(['success' => true, 'message' => 'Xử lý thanh toán thành công!']);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
    // Case mới: Hủy booking (cập nhật status và lý do)
    case 'cancel_booking':
        $bookingId = $input['bookingId'] ?? '';
        $cancellation_reason = trim($input['cancellation_reason'] ?? '');
        if (!$bookingId) {
            echo json_encode(['success' => false, 'message' => 'Thiếu bookingId!']);
            exit;
        }
        try {
            $stmt = $pdo->prepare("UPDATE Bookings SET status='cancelled', payment_status='refunded', cancellation_reason=? WHERE id=? OR pnr=?");
            $stmt->execute([$cancellation_reason, $bookingId, $bookingId]);
            echo json_encode(['success' => true, 'message' => 'Hủy booking thành công!']);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
    // Case mới: Tìm booking theo PNR (cho khách hàng tra cứu nhanh)
    case 'get_booking_by_pnr':
        $pnr = trim($input['pnr'] ?? '');
        if (empty($pnr)) {
            echo json_encode(['success' => false, 'message' => 'Thiếu PNR!']);
            exit;
        }
        try {
            $stmt = $pdo->prepare("SELECT b.*, u.name as user_name FROM Bookings b LEFT JOIN Users u ON b.user_id = u.id WHERE b.pnr = ?");
            $stmt->execute([$pnr]);
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($booking) {
                // FIX: Add null checks
                $booking['passengers'] = (!is_null($booking['passengers']) ? json_decode($booking['passengers'], true) : []);
                $booking['contact'] = (!is_null($booking['contact']) ? json_decode($booking['contact'], true) : []);
                $booking['ancillaries'] = (!is_null($booking['ancillaries']) ? json_decode($booking['ancillaries'], true) : null);
                $booking['flight'] = (!is_null($booking['flight']) ? json_decode($booking['flight'], true) : []);
                $booking['bookingDetails'] = (!is_null($booking['bookingDetails']) ? json_decode($booking['bookingDetails'], true) : []);
                $booking['selectedOutboundOption'] = (!is_null($booking['selectedOutboundOption']) ? json_decode($booking['selectedOutboundOption'], true) : []);
                $booking['selectedInboundOption'] = (!is_null($booking['selectedInboundOption']) ? json_decode($booking['selectedInboundOption'], true) : null);
                $booking['payment_info'] = (!is_null($booking['payment_info']) ? json_decode($booking['payment_info'], true) : []);
                echo json_encode(['success' => true, 'booking' => $booking]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Không tìm thấy booking với PNR này!']);
            }
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
    // Case mới: Lấy lịch sử thanh toán của user (cho dashboard chuyên nghiệp)
    case 'get_payment_history':
        $userId = $input['userId'] ?? 0;
        if (!$userId) {
            echo json_encode(['success' => false, 'message' => 'Thiếu userId!']);
            exit;
        }
        try {
            $stmt = $pdo->prepare("SELECT id, pnr, bookingTimestamp, total_amount, payment_status, payment_info FROM Bookings WHERE user_id = ? ORDER BY bookingTimestamp DESC");
            $stmt->execute([$userId]);
            $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($history as &$h) {
                // FIX: Null check
                $h['payment_info'] = (!is_null($h['payment_info']) ? json_decode($h['payment_info'], true) : []);
            }
            echo json_encode(['success' => true, 'history' => $history]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
    // Case mới: Thanh toán tiền mặt (admin xác nhận)
    case 'cash_payment':
        $bookingId = $input['bookingId'] ?? '';
        $total_amount = (float)($input['total_amount'] ?? 0);
        if (!$bookingId) {
            echo json_encode(['success'=>false,'message'=>'Thiếu bookingId!']);
            exit;
        }
        try {
            $payment_info = json_encode([
                'method' => 'Cash',
                'received_date' => date('Y-m-d H:i:s')
            ]);
            $stmt = $pdo->prepare("UPDATE Bookings SET payment_status='paid', payment_info=?, status='confirmed', total_amount=? WHERE id=? OR pnr=?");
            $stmt->execute([$payment_info, $total_amount, $bookingId, $bookingId]);
            // Cộng loyalty points
            $user_id_stmt = $pdo->prepare("SELECT user_id FROM Bookings WHERE id=? OR pnr=?");
            $user_id_stmt->execute([$bookingId, $bookingId]);
            $user_id = $user_id_stmt->fetchColumn();
            if ($user_id) {
                $points_to_add = (int)($total_amount / 1000);
                $pdo->prepare("UPDATE Users SET loyalty_points = loyalty_points + ? WHERE id=?")->execute([$points_to_add, $user_id]);
            }
            echo json_encode(['success'=>true,'message'=>'Thanh toán tiền mặt thành công! Booking đã được xác nhận.']);
        } catch (PDOException $e) {
            echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
        }
        break;
    // ==================== TÍCH HỢP VNPAY MỚI (KHÔNG ẢNH HƯỞNG CODE CŨ) ====================
    // Case mới: Khởi tạo thanh toán VNPay (gọi sau create_booking nếu cần thanh toán ngay)
    case 'initiate_vnpay_payment':
        $bookingId = $input['bookingId'] ?? '';
        if (empty($bookingId)) {
            echo json_encode(['success' => false, 'message' => 'Thiếu bookingId!']);
            exit;
        }
        try {
            // Lấy total_amount từ DB
            $stmt = $pdo->prepare("SELECT total_amount FROM Bookings WHERE id = ? OR pnr = ?");
            $stmt->execute([$bookingId, $bookingId]);
            $total_amount = $stmt->fetchColumn();
            if (!$total_amount || $total_amount <= 0) {
                echo json_encode(['success' => false, 'message' => 'Không tìm thấy booking hoặc tổng tiền không hợp lệ!']);
                exit;
            }
            $orderInfo = 'Thanh toán booking #' . $bookingId;
            $vnpayUrl = createVNPayUrl($bookingId, $total_amount, $orderInfo);
            echo json_encode(['success' => true, 'payment_url' => $vnpayUrl]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
    // Case mới: Xử lý return URL từ VNPay (GET params, hiển thị cho user, gọi process nếu cần)
    case 'vnpay_return':
        // Lấy tất cả GET params làm input
        $input = $_GET;
        if (!verifyVNPayHash($input)) {
            echo json_encode(['success' => false, 'message' => 'Chữ ký không hợp lệ!']);
            exit;
        }
        $responseCode = $input['vnp_ResponseCode'] ?? '';
        $txnRef = $input['vnp_TxnRef'] ?? '';
        $transactionStatus = $input['vnp_TransactionStatus'] ?? '';
     
        if ($responseCode == '00' && $transactionStatus == '00') {
            // Thành công, gọi process_payment với info từ VNPay
            $payment_info = json_encode([
                'method' => 'VNPay',
                'transaction_no' => $input['vnp_TransactionNo'] ?? '',
                'bank_code' => $input['vnp_BankCode'] ?? '',
                'pay_date' => $input['vnp_PayDate'] ?? ''
            ]);
            // Tạo input giả cho process_payment (có thể gọi trực tiếp function)
            $processInput = [
                'bookingId' => $txnRef,
                'payment_status' => 'paid',
                'payment_info' => $payment_info,
                'total_amount' => ($input['vnp_Amount'] ?? 0) / 100
            ];
            // Gọi process_payment logic (copy từ case trên để tránh phụ thuộc)
            global $pdo;
            $stmt = $pdo->prepare("UPDATE Bookings SET payment_status=?, payment_info=?, total_amount=? WHERE id=? OR pnr=?");
            $stmt->execute(['paid', $payment_info, $processInput['total_amount'], $txnRef, $txnRef]);
            // Cộng loyalty (như process_payment)
            $user_id_stmt = $pdo->prepare("SELECT user_id FROM Bookings WHERE id=? OR pnr=?");
            $user_id_stmt->execute([$txnRef, $txnRef]);
            $user_id = $user_id_stmt->fetchColumn();
            if ($user_id) {
                $points_to_add = (int)($processInput['total_amount'] / 1000);
                $pdo->prepare("UPDATE Users SET loyalty_points = loyalty_points + ? WHERE id=?")->execute([$points_to_add, $user_id]);
            }
            echo json_encode(['success' => true, 'message' => 'Thanh toán thành công! Booking #' . $txnRef . ' đã được xác nhận.']);
        } else {
            // Thất bại
            echo json_encode(['success' => false, 'message' => 'Thanh toán thất bại. Mã lỗi: ' . $responseCode]);
        }
        break;
    // Case mới: Xử lý IPN (server-to-server, cập nhật DB an toàn)
    case 'vnpay_ipn':
        $input = $_GET; // Hoặc POST nếu config
        $vnpData = array_filter($input, function($key) { return substr($key, 0, 4) == 'vnp_'; }, ARRAY_FILTER_USE_KEY);
     
        if (!verifyVNPayHash($vnpData)) {
            echo json_encode(['RspCode' => '97', 'Message' => 'Invalid signature']);
            exit;
        }
     
        $txnRef = $vnpData['vnp_TxnRef'] ?? '';
        $amount = ($vnpData['vnp_Amount'] ?? 0) / 100;
        $responseCode = $vnpData['vnp_ResponseCode'] ?? '';
        $transactionStatus = $vnpData['vnp_TransactionStatus'] ?? '';
     
        try {
            // Lấy booking từ DB
            $stmt = $pdo->prepare("SELECT total_amount, payment_status FROM Bookings WHERE id = ? OR pnr = ?");
            $stmt->execute([$txnRef, $txnRef]);
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);
         
            if (!$booking) {
                echo json_encode(['RspCode' => '01', 'Message' => 'Order not found']);
                exit;
            }
         
            if ($booking['total_amount'] != $amount) {
                echo json_encode(['RspCode' => '04', 'Message' => 'Invalid amount']);
                exit;
            }
         
            if ($booking['payment_status'] !== 'pending') {
                echo json_encode(['RspCode' => '02', 'Message' => 'Order already confirmed']);
                exit;
            }
         
            if ($responseCode == '00' && $transactionStatus == '00') {
                // Thành công: Cập nhật (tương tự process_payment)
                $payment_info = json_encode([
                    'method' => 'VNPay',
                    'transaction_no' => $vnpData['vnp_TransactionNo'] ?? '',
                    'bank_code' => $vnpData['vnp_BankCode'] ?? '',
                    'pay_date' => $vnpData['vnp_PayDate'] ?? ''
                ]);
                $stmt = $pdo->prepare("UPDATE Bookings SET payment_status='paid', payment_info=?, status='confirmed' WHERE id=? OR pnr=?");
                $stmt->execute([$payment_info, $txnRef, $txnRef]);
             
                // Cộng loyalty
                $user_id_stmt = $pdo->prepare("SELECT user_id FROM Bookings WHERE id=? OR pnr=?");
                $user_id_stmt->execute([$txnRef, $txnRef]);
                $user_id = $user_id_stmt->fetchColumn();
                if ($user_id) {
                    $points_to_add = (int)($amount / 1000);
                    $pdo->prepare("UPDATE Users SET loyalty_points = loyalty_points + ? WHERE id=?")->execute([$points_to_add, $user_id]);
                }
             
                echo json_encode(['RspCode' => '00', 'Message' => 'Confirm Success']);
            } else {
                // Thất bại
                $stmt = $pdo->prepare("UPDATE Bookings SET payment_status='failed' WHERE id=? OR pnr=?");
                $stmt->execute([$txnRef, $txnRef]);
                echo json_encode(['RspCode' => '00', 'Message' => 'Confirm Failed']);
            }
        } catch (PDOException $e) {
            echo json_encode(['RspCode' => '99', 'Message' => 'System Error']);
        }
        break;
    // ==================== FEE CONFIGS ====================
    case 'update_fee':
        $config_key = trim($input['config_key']??'');
        $service_type = $input['service_type']??'fixed';
        $service_value = (float)($input['service_value']??0);
        $tax_type = $input['tax_type']??'fixed';
        $tax_value = (float)($input['tax_value']??0);
        $currency = trim($input['currency'] ?? 'VND'); // Thêm currency
        try{
            $stmt=$pdo->prepare("REPLACE INTO FeeConfigs (config_key, service_type, service_value, tax_type, tax_value, currency) VALUES (?,?,?,?,?,?)");
            $stmt->execute([$config_key,$service_type,$service_value,$tax_type,$tax_value,$currency]);
            echo json_encode(['success'=>true,'message'=>'Cập nhật phí thành công!']);
        }catch(PDOException $e){
            echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
        }
        break;
    case 'get_fees':
        try{
            $stmt=$pdo->query("SELECT * FROM FeeConfigs"); // Bao gồm currency mới
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }catch(PDOException $e){
            echo json_encode(['error'=>$e->getMessage()]);
        }
        break;
    // ==================== ADMIN CREDENTIALS (CẬP NHẬT SCHEMA: fullname, created_at, updated_at, last_login) ====================
    // Case: admin_login (thêm update last_login sau khi login thành công)
    case 'admin_login':
        $loginInput = trim($input['email'] ?? ''); // email hoặc user
        $password = $input['password'] ?? '';
        if(!$loginInput || !$password){
            echo json_encode(['success'=>false,'message'=>'Thiếu email hoặc mật khẩu!']);
            exit;
        }
        try{
            $stmt=$pdo->prepare("SELECT * FROM AdminCredentials WHERE email=? OR user=?");
            $stmt->execute([$loginInput,$loginInput]);
            $admin=$stmt->fetch(PDO::FETCH_ASSOC);
            if($admin && password_verify($password,$admin['pass'])){
                unset($admin['pass']);
                // Cập nhật last_login khi login thành công
                $update_stmt = $pdo->prepare("UPDATE AdminCredentials SET last_login = NOW() WHERE id = ?");
                $update_stmt->execute([$admin['id']]);
                echo json_encode(['success'=>true,'admin'=>$admin]);
            }else{
                echo json_encode(['success'=>false,'message'=>'Sai email/user hoặc mật khẩu!']);
            }
        }catch(PDOException $e){
            echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
        }
        break;
    // Case mới: admin_get_info - Lấy thông tin admin theo ID (cho dashboard admin hiện tại)
    case 'admin_get_info':
        $id = (int)($input['id'] ?? 0);
        if (!$id) {
            echo json_encode(['success' => false, 'message' => 'Thiếu ID admin!']);
            exit;
        }
        try {
            $stmt = $pdo->prepare("SELECT id, user, fullname, email, created_at, updated_at, last_login FROM AdminCredentials WHERE id = ?");
            $stmt->execute([$id]);
            $admin = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($admin) {
                echo json_encode(['success' => true, 'admin' => $admin]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Không tìm thấy admin!']);
            }
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
    // Case mới: admin_update_info - Cập nhật thông tin admin (fullname, user, email) theo ID
    case 'admin_update_info':
        $id = (int)($input['id'] ?? 0);
        $fullname = trim($input['fullname'] ?? '');
        $user = trim($input['user'] ?? '');
        $email = trim($input['email'] ?? '');
        if (!$id || empty($fullname) || empty($user) || empty($email)) {
            echo json_encode(['success' => false, 'message' => 'Thiếu ID hoặc thông tin bắt buộc!']);
            exit;
        }
        try {
            // Kiểm tra trùng user/email (trừ chính mình)
            $check_stmt = $pdo->prepare("SELECT id FROM AdminCredentials WHERE (user = ? OR email = ?) AND id != ?");
            $check_stmt->execute([$user, $email, $id]);
            if ($check_stmt->rowCount() > 0) {
                echo json_encode(['success' => false, 'message' => 'User hoặc email đã tồn tại!']);
                exit;
            }
            // UPDATE fullname, user, email, updated_at
            $stmt = $pdo->prepare("UPDATE AdminCredentials SET fullname=?, user=?, email=?, updated_at=NOW() WHERE id=?");
            $stmt->execute([$fullname, $user, $email, $id]);
            echo json_encode(['success' => true, 'message' => 'Cập nhật thông tin admin thành công!']);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
    // Case mới: admin_change_password - Admin tự đổi mật khẩu (cần old_password)
    case 'admin_change_password':
        $id = (int)($input['id'] ?? 0);
        $old_password = $input['old_password'] ?? '';
        $new_password = $input['new_password'] ?? '';
        if (!$id || empty($old_password) || empty($new_password)) {
            echo json_encode(['success' => false, 'message' => 'Thiếu ID hoặc mật khẩu!']);
            exit;
        }
        try {
            $stmt = $pdo->prepare("SELECT pass FROM AdminCredentials WHERE id = ?");
            $stmt->execute([$id]);
            $admin = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$admin || !verifyPassword($old_password, $admin['pass'])) {
                echo json_encode(['success' => false, 'message' => 'Mật khẩu cũ không đúng!']);
                exit;
            }
            $hashed = hashPassword($new_password);
            $update_stmt = $pdo->prepare("UPDATE AdminCredentials SET pass = ?, updated_at = NOW() WHERE id = ?");
            $update_stmt->execute([$hashed, $id]);
            echo json_encode(['success' => true, 'message' => 'Đổi mật khẩu thành công!']);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
    // Case cũ: get_admins (tương đương admin_list_admins) - Cập nhật SELECT fullname
    case 'get_admins':
        try{
            $stmt=$pdo->query("SELECT id,user,fullname,email,created_at,updated_at,last_login FROM AdminCredentials ORDER BY id DESC");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }catch(PDOException $e){
            echo json_encode(['error'=>$e->getMessage()]);
        }
        break;
    // Case cũ: create_admin (tương đương admin_create) - Cập nhật INSERT fullname, created_at, updated_at
    case 'create_admin':
        $fullname = trim($input['fullname']??''); // Thay name bằng fullname
        $user = trim($input['user']??'');
        $email = trim($input['email']??'');
        $password = $input['password']??'123456';
        if(empty($email)||empty($password)||empty($user)){echo json_encode(['success'=>false,'message'=>'Thiếu email/user hoặc mật khẩu!']);exit;}
        try{
            $stmt=$pdo->prepare("SELECT id FROM AdminCredentials WHERE email=? OR user=?");
            $stmt->execute([$email,$user]);
            if($stmt->rowCount()>0){echo json_encode(['success'=>false,'message'=>'Email hoặc user admin đã tồn tại!']);exit;}
            $hashed=hashPassword($password);
            $stmt=$pdo->prepare("INSERT INTO AdminCredentials (user,fullname,email,pass,created_at,updated_at,last_login) VALUES (?,?,?, ?, NOW(), NOW(), NULL)");
            $stmt->execute([$user,$fullname,$email,$hashed]);
            echo json_encode(['success'=>true,'message'=>'Tạo admin thành công!']);
        }catch(PDOException $e){
            echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
        }
        break;
    // Case cũ: update_admin - Cập nhật fullname, user, email, updated_at
    case 'update_admin':
        $id=$input['id']??0;
        $fullname=trim($input['fullname']??''); // Thay name bằng fullname
        $user=trim($input['user']??'');
        $email=trim($input['email']??'');
        if(!$id){echo json_encode(['success'=>false,'message'=>'Thiếu ID admin!']);exit;}
        try{
            $stmt=$pdo->prepare("UPDATE AdminCredentials SET fullname=?,user=?,email=?,updated_at=NOW() WHERE id=?");
            $stmt->execute([$fullname,$user,$email,$id]);
            echo json_encode(['success'=>true,'message'=>'Cập nhật admin thành công!']);
        }catch(PDOException $e){
            echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
        }
        break;
    // Case cũ: reset_admin_password (cho admin khác, khác với change_password) - Thêm updated_at
    case 'reset_admin_password':
        $id=$input['id']??0;
        $newPass=$input['newPassword']??'123456';
        $hashed=hashPassword($newPass);
        if(!$id){echo json_encode(['success'=>false,'message'=>'Thiếu ID admin!']);exit;}
        try{
            $stmt=$pdo->prepare("UPDATE AdminCredentials SET pass=?, updated_at=NOW() WHERE id=?");
            $stmt->execute([$hashed,$id]);
            echo json_encode(['success'=>true,'message'=>"Đặt lại mật khẩu admin thành công! Mật khẩu mới: $newPass"]);
        }catch(PDOException $e){
            echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
        }
        break;
    // Case cũ: delete_admin (tương đương admin_delete)
    case 'delete_admin':
        $id=$input['id']??0;
        if(!$id){echo json_encode(['success'=>false,'message'=>'Thiếu ID admin']);exit;}
        try{
            $stmt=$pdo->prepare("DELETE FROM AdminCredentials WHERE id=?");
            $stmt->execute([$id]);
            echo json_encode(['success'=>true,'message'=>'Xóa admin thành công!']);
        }catch(PDOException $e){
            echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
        }
        break;
    // Case mới: admin_update_last_login - Cập nhật thủ công last_login (nếu cần, ví dụ sync)
    case 'admin_update_last_login':
        $id = (int)($input['id'] ?? 0);
        if (!$id) {
            echo json_encode(['success' => false, 'message' => 'Thiếu ID admin!']);
            exit;
        }
        try {
            $stmt = $pdo->prepare("UPDATE AdminCredentials SET last_login = NOW() WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Cập nhật last_login thành công!']);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
    // Case mới: Cập nhật điểm loyalty (cho admin hoặc tự động sau thanh toán)
    case 'update_loyalty_points':
        $user_id = $input['user_id'] ?? 0;
        $points_delta = (int)($input['points_delta'] ?? 0); // Có thể + hoặc -
        if (!$user_id) {
            echo json_encode(['success' => false, 'message' => 'Thiếu user_id!']);
            exit;
        }
        try {
            $stmt = $pdo->prepare("UPDATE Users SET loyalty_points = loyalty_points + ? WHERE id = ?");
            $stmt->execute([$points_delta, $user_id]);
            echo json_encode(['success' => true, 'message' => 'Cập nhật điểm loyalty thành công!']);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
    default:
        echo json_encode([
            'success' => false,
            'error' => 'Action không hợp lệ!',
            'action_received' => $action
        ]);
        exit;
}
?>