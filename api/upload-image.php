<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error'=>'POST only']); exit; }

const FIREBASE_PROJECT_ID = 'gen-lang-client-0087310115';
const ADMIN_EMAILS = ['samtobeng@gmail.com', 'usitakatelvin@gmail.com'];
function fail(int $code, string $message): never { http_response_code($code); echo json_encode(['error'=>$message]); exit; }
function b64url_decode(string $s): string|false { return base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4), true); }
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) fail(401, 'Login required.');
$token = $m[1]; $parts = explode('.', $token);
if (count($parts) !== 3) fail(401, 'Invalid login token.');
$header = json_decode((string)b64url_decode($parts[0]), true);
$claims = json_decode((string)b64url_decode($parts[1]), true);
$signature = b64url_decode($parts[2]);
if (!is_array($header) || !is_array($claims) || !$signature || ($header['alg'] ?? '') !== 'RS256' || empty($header['kid'])) fail(401, 'Invalid login token.');
$issuer = 'https://securetoken.google.com/' . FIREBASE_PROJECT_ID;
if (($claims['aud'] ?? '') !== FIREBASE_PROJECT_ID || ($claims['iss'] ?? '') !== $issuer || (int)($claims['exp'] ?? 0) <= time() || (int)($claims['iat'] ?? 0) > time() + 60) fail(401, 'Expired or invalid login token.');
$email = strtolower((string)($claims['email'] ?? ''));
if (empty($claims['email_verified']) || !in_array($email, ADMIN_EMAILS, true)) fail(403, 'Administrator access required.');
$certUrl = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
$certs = json_decode((string)@file_get_contents($certUrl), true);
$cert = is_array($certs) ? ($certs[$header['kid']] ?? null) : null;
if (!$cert) fail(401, 'Unable to validate login token.');
if (openssl_verify($parts[0] . '.' . $parts[1], $signature, $cert, OPENSSL_ALGO_SHA256) !== 1) fail(401, 'Invalid login signature.');

$folder = (string)($_POST['folder'] ?? 'products');
$allowed = ['products','receipts','banners'];
if (!in_array($folder, $allowed, true)) fail(400, 'Invalid upload folder.');
if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) fail(400, 'Image upload failed.');
$file = $_FILES['image'];
if ((int)$file['size'] > 8 * 1024 * 1024) fail(413, 'Image must be 8MB or smaller.');
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
$exts = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp','image/gif'=>'gif'];
if (!isset($exts[$mime])) fail(415, 'Only JPG, PNG, WEBP or GIF images are accepted.');
$base = dirname(__DIR__);
$targetDir = $base . '/uploads/' . $folder;
if (!is_dir($targetDir) && !mkdir($targetDir, 0755, true)) fail(500, 'Could not create upload directory.');
$name = bin2hex(random_bytes(16)) . '.' . $exts[$mime];
if (!move_uploaded_file($file['tmp_name'], $targetDir . '/' . $name)) fail(500, 'Could not save uploaded image.');
$url = '/uploads/' . $folder . '/' . $name;
echo json_encode(['url'=>$url, 'name'=>$name]);
