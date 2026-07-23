<?php

declare(strict_types=1);

namespace CardTrain\WalletGateway;

/**
 * Per-wallet CyberSource merchant configuration. Apple Pay (MID …202) and Google
 * Pay (MID …201) are separate merchant IDs, each with its own P12 transaction
 * security key, so each has its own cybs.ini generated at container start
 * (see docker-entrypoint.sh) pointing at its key.
 *
 * All values come from the environment — nothing sensitive is committed.
 */
final class Config
{
    /** @return array{merchantId:string, iniPath:string, paymentSolution:string} */
    public static function forWallet(string $wallet): array
    {
        return match ($wallet) {
            'apple' => [
                'merchantId' => self::env('CYBS_APPLE_MERCHANT_ID'),      // gphk088034609202
                'iniPath' => self::env('CYBS_APPLE_INI', '/app/config/cybs.apple.ini'),
                'paymentSolution' => '001',
            ],
            'google' => [
                'merchantId' => self::env('CYBS_GOOGLE_MERCHANT_ID'),     // gphk088034609201
                'iniPath' => self::env('CYBS_GOOGLE_INI', '/app/config/cybs.google.ini'),
                'paymentSolution' => '012',
            ],
            default => throw new \InvalidArgumentException("unknown wallet: {$wallet}"),
        };
    }

    /** Shared secret the Supabase edge functions present as X-Service-Key. */
    public static function serviceKey(): string
    {
        return self::env('WALLET_SERVICE_KEY');
    }

    public static function env(string $name, ?string $default = null): string
    {
        $v = getenv($name);
        if ($v === false || $v === '') {
            if ($default !== null) {
                return $default;
            }
            throw new \RuntimeException("missing required env var: {$name}");
        }
        return $v;
    }
}
