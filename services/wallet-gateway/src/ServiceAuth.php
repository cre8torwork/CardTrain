<?php

declare(strict_types=1);

namespace CardTrain\WalletGateway;

/**
 * This service is called only server-to-server by the Supabase edge functions,
 * never by a browser. It is gated by a shared secret in the X-Service-Key header
 * (constant-time compared). The wallet MIDs / P12 keys never leave this service.
 */
final class ServiceAuth
{
    public static function verify(array $server): bool
    {
        $presented = $server['HTTP_X_SERVICE_KEY'] ?? '';
        $expected = Config::serviceKey();
        return $presented !== '' && hash_equals($expected, $presented);
    }
}
