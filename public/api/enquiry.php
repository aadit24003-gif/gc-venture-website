<?php
/**
 * Enquiry handler for quote, contact and support forms.
 * - POST only, Origin/Referer check, honeypot, per-IP rate limit
 * - Server-side validation and sanitisation (never trusts the browser)
 * - Emails the team (with optional attachment) and appends to a CSV backup
 * - Responds with JSON for fetch() requests, or redirects to /thank-you/
 */
declare(strict_types=1);

$config = require __DIR__ . '/config.php';

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$wantsJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

function respond(bool $ok, int $status = 200, string $error = ''): void
{
    global $wantsJson;
    http_response_code($status);
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error]);
    } elseif ($ok) {
        header('Location: /thank-you/', true, 303);
    } else {
        header('Content-Type: text/html; charset=utf-8');
        echo '<!doctype html><meta charset="utf-8"><title>Submission error</title><p>' . htmlspecialchars($error) .
            '</p><p><a href="javascript:history.back()">Go back and try again</a></p>';
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(false, 405, 'Method not allowed.');
}

// Origin / Referer check
$origin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';
$host = $origin ? strtolower((string) parse_url($origin, PHP_URL_HOST)) : '';
if ($host === '' || !in_array($host, $config['allowed_hosts'], true)) {
    respond(false, 403, 'Submission not allowed from this origin.');
}

// Honeypot: bots fill hidden fields. Pretend success, do nothing.
if (!empty($_POST['website'])) {
    respond(true);
}

// Rate limit per IP (hashed, stored in temp dir)
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$bucket = sys_get_temp_dir() . '/itr_rl_' . hash('sha256', $ip . __DIR__);
$now = time();
$hits = [];
if (is_file($bucket)) {
    $hits = array_filter(
        array_map('intval', explode(',', (string) file_get_contents($bucket))),
        fn ($t) => $t > $now - $config['rate_window_secs']
    );
}
if (count($hits) >= $config['rate_limit']) {
    respond(false, 429, 'Too many submissions. Please wait a few minutes or contact us on WhatsApp.');
}
$hits[] = $now;
@file_put_contents($bucket, implode(',', $hits), LOCK_EX);

// ── Input helpers ─────────────────────────────────────────
function field(string $key, int $max = 500): string
{
    $v = $_POST[$key] ?? '';
    if (is_array($v)) {
        return '';
    }
    $v = trim(strip_tags((string) $v));
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
    return mb_substr($v, 0, $max);
}
function oneLine(string $v): string
{
    return trim(preg_replace('/[\r\n]+/', ' ', $v) ?? '');
}

$type = field('form_type', 20) === 'support' ? 'support' : 'quote';
$data = [
    'name'     => oneLine(field('name', 120)),
    'company'  => oneLine(field('company', 160)),
    'email'    => oneLine(field('email', 160)),
    'phone'    => oneLine(field('phone', 24)),
    'city'     => oneLine(field('city', 80)),
    'quantity' => oneLine(field('quantity', 10)),
    'message'  => field('message', 4000),
];
$errors = [];
if ($data['name'] === '') $errors[] = 'Name is required.';
if ($data['company'] === '') $errors[] = 'Company is required.';
if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) $errors[] = 'A valid email is required.';
if (!preg_match('/^[0-9+\-\s()]{8,20}$/', $data['phone'])) $errors[] = 'A valid phone number is required.';

$details = [];
if ($type === 'quote') {
    if ($data['city'] === '') $errors[] = 'City is required.';
    if (!ctype_digit($data['quantity']) || (int) $data['quantity'] < 1) $errors[] = 'Quantity must be a whole number.';
    $equipment = array_slice(array_map(fn ($e) => oneLine(mb_substr(strip_tags((string) $e), 0, 40)), (array) ($_POST['equipment'] ?? [])), 0, 12);
    $details = [
        'Enquiry type'  => field('enquiry_type', 20) === 'enterprise' ? 'Enterprise / bulk' : 'Standard',
        'Equipment'     => implode(', ', $equipment),
        'Product'       => oneLine(field('product', 160)) ?: oneLine(field('product_slug', 160)),
        'Chosen configuration' => oneLine(field('config_choice', 300)),
        'Quantity'      => $data['quantity'],
        'City'          => $data['city'],
        'Duration'      => oneLine(field('duration', 60)),
        'Needed by'     => oneLine(field('needed_by', 20)),
        'Configuration' => field('configuration', 2000),
        'Software'      => field('software', 2000),
        'Budget'        => oneLine(field('budget', 120)),
    ];
} else {
    if ($data['message'] === '') $errors[] = 'Please describe the issue.';
    $details = [
        'Issue type' => oneLine(field('issue_type', 60)),
        'Priority'   => oneLine(field('priority', 60)),
        'Equipment'  => oneLine(field('equipment', 200)),
    ];
}
if ($errors) {
    respond(false, 422, implode(' ', $errors));
}

// Attachment (support only)
$attachment = null;
if ($type === 'support' && isset($_FILES['attachment']) && $_FILES['attachment']['error'] !== UPLOAD_ERR_NO_FILE) {
    $f = $_FILES['attachment'];
    if ($f['error'] !== UPLOAD_ERR_OK || $f['size'] > $config['max_upload_bytes']) {
        respond(false, 422, 'Attachment must be a JPG, PNG or PDF under 5 MB.');
    }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']) ?: '';
    if (!in_array($mime, $config['allowed_mime'], true)) {
        respond(false, 422, 'Attachment must be a JPG, PNG or PDF under 5 MB.');
    }
    $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'application/pdf' => 'pdf'][$mime];
    $attachment = ['name' => 'attachment.' . $ext, 'mime' => $mime, 'data' => file_get_contents($f['tmp_name'])];
}

// ── Compose email ─────────────────────────────────────────
$source = oneLine(field('source_page', 200));
$subject = $type === 'support'
    ? sprintf('Support request: %s (%s)', $details['Issue type'] ?: 'General', $data['company'])
    : sprintf('%s quote: %s x %s, %s (%s)', $details['Enquiry type'], $data['quantity'], $details['Equipment'] ?: ($details['Product'] ?: 'equipment'), $data['city'], $data['company']);

$lines = [
    'Name: ' . $data['name'],
    'Company: ' . $data['company'],
    'Email: ' . $data['email'],
    'Phone: ' . $data['phone'],
];
foreach ($details as $k => $v) {
    if ($v !== '') $lines[] = "$k: $v";
}
if ($data['message'] !== '') $lines[] = "\nMessage:\n" . $data['message'];
$lines[] = "\nSubmitted from: " . ($source ?: 'unknown page');
$lines[] = 'Time: ' . date('Y-m-d H:i:s T');
$bodyText = implode("\n", $lines);

$fromName = '=?UTF-8?B?' . base64_encode($config['from_name']) . '?=';
$headers = [
    'From: ' . $fromName . ' <' . $config['from_email'] . '>',
    'Reply-To: ' . $data['email'],
    'MIME-Version: 1.0',
];
if ($attachment) {
    $boundary = 'itr_' . bin2hex(random_bytes(12));
    $headers[] = 'Content-Type: multipart/mixed; boundary="' . $boundary . '"';
    $body = "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n$bodyText\r\n"
        . "--$boundary\r\nContent-Type: {$attachment['mime']}; name=\"{$attachment['name']}\"\r\n"
        . "Content-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"{$attachment['name']}\"\r\n\r\n"
        . chunk_split(base64_encode($attachment['data'])) . "--$boundary--";
} else {
    $headers[] = 'Content-Type: text/plain; charset=UTF-8';
    $body = $bodyText;
}

$to = implode(', ', $config['recipients'][$type]);
$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$sent = @mail($to, $encodedSubject, $body, implode("\r\n", $headers));

// CSV backup (formula-injection safe)
$row = array_map(
    fn ($v) => preg_match('/^[=+\-@]/', (string) $v) ? "'" . $v : $v,
    [date('c'), $type, $data['name'], $data['company'], $data['email'], $data['phone'], $data['city'], $data['quantity'],
     json_encode($details, JSON_UNESCAPED_UNICODE), $data['message'], $source, $sent ? 'emailed' : 'EMAIL FAILED']
);
$logDir = dirname($config['log_file']);
if (!is_dir($logDir)) @mkdir($logDir, 0750, true);
if ($fh = @fopen($config['log_file'], 'a')) {
    flock($fh, LOCK_EX);
    fputcsv($fh, $row);
    flock($fh, LOCK_UN);
    fclose($fh);
    $logged = true;
} else {
    $logged = false;
}

if (!$sent && !$logged) {
    respond(false, 500, 'We could not record your request. Please call or WhatsApp us.');
}
respond(true);
