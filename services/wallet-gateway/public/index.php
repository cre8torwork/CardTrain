<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use CardTrain\WalletGateway\Config;
use CardTrain\WalletGateway\ServiceAuth;
use CardTrain\WalletGateway\WalletGateway;

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = rtrim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/', '/') ?: '/';

function respond(array $body, int $status): never
{
    http_response_code($status);
    echo json_encode($body);
    exit;
}

// Health check — unauthenticated, no secrets touched.
if ($method === 'GET' && $path === '/health') {
    respond(['ok' => true], 200);
}

if ($method !== 'POST') {
    respond(['error' => 'method not allowed'], 405);
}

// Every payment route is server-to-server only.
if (!ServiceAuth::verify($_SERVER)) {
    respond(['error' => 'unauthorized'], 401);
}

$input = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($input)) {
    respond(['error' => 'invalid JSON body'], 400);
}

$wallet = $input['wallet'] ?? '';
if (!in_array($wallet, ['apple', 'google'], true)) {
    respond(['error' => 'wallet must be apple or google'], 400);
}

$gateway = new WalletGateway();

try {
    $result = match ($path) {
        '/wallet/authorize' => $gateway->authorize(
            $wallet,
            (string) ($input['referenceCode'] ?? ''),
            (string) ($input['amount'] ?? ''),
            (string) ($input['currency'] ?? 'HKD'),
            (string) ($input['token'] ?? ''),
            is_array($input['billTo'] ?? null) ? $input['billTo'] : [],
            (bool) ($input['capture'] ?? true),
            isset($input['cardType']) ? (string) $input['cardType'] : null,
        ),
        '/wallet/capture' => $gateway->capture(
            $wallet,
            (string) ($input['referenceCode'] ?? ''),
            (string) ($input['authRequestId'] ?? ''),
            (string) ($input['amount'] ?? ''),
            (string) ($input['currency'] ?? 'HKD'),
        ),
        '/wallet/reverse' => $gateway->reverse(
            $wallet,
            (string) ($input['referenceCode'] ?? ''),
            (string) ($input['authRequestId'] ?? ''),
            (string) ($input['amount'] ?? ''),
            (string) ($input['currency'] ?? 'HKD'),
        ),
        '/wallet/refund' => $gateway->refund(
            $wallet,
            (string) ($input['referenceCode'] ?? ''),
            (string) ($input['captureRequestId'] ?? ''),
            (string) ($input['amount'] ?? ''),
            (string) ($input['currency'] ?? 'HKD'),
        ),
        default => respond(['error' => 'not found'], 404),
    };
    respond($result, 200);
} catch (\Throwable $e) {
    error_log('[wallet-gateway] ' . $e->getMessage());
    respond(['error' => 'gateway error'], 502);
}
