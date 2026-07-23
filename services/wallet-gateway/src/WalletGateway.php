<?php

declare(strict_types=1);

namespace CardTrain\WalletGateway;

/**
 * Builds and submits Simple Order API (name-value pair) requests for the wallet
 * rails. Field names follow the CyberSource Apple Pay / Google Pay Simple Order
 * developer guides (Cybersource decryption method):
 *   - Google Pay: paymentSolution 012, encryptedPayment_data = base64 token.
 *   - Apple Pay:  paymentSolution 001, encryptedPayment_data = base64(paymentData),
 *                 plus a fixed encryptedPayment_descriptor and card_cardType.
 *
 * The actual SDK call is isolated in send(); everything above it is pure request
 * shaping, so it can be reasoned about without the SDK or a P12 present.
 */
final class WalletGateway
{
    // Fixed descriptor for Apple Pay in-app/web ("FID=COMMON.APPLE.INAPP.PAYMENT").
    private const APPLE_DESCRIPTOR = 'RklEPUNPTU1PTi5BUFBMRS5JTkFQUC5QQVlNRU5U';

    /**
     * Authorize (or Sale, when capture=true) a wallet payment.
     *
     * @param array{firstName?:string,lastName?:string,email?:string,street1?:string,city?:string,state?:string,postalCode?:string,country?:string} $billTo
     */
    public function authorize(
        string $wallet,       // 'apple' | 'google'
        string $referenceCode,
        string $amount,       // decimal string, e.g. "10.00"
        string $currency,     // "HKD"
        string $token,        // base64 wallet token
        array $billTo,
        bool $capture,        // true => Sale (auth+capture); false => Authorization only
        ?string $cardType = null, // Apple: "001" Visa / "002" Mastercard
    ): array {
        $cfg = Config::forWallet($wallet);

        $request = [
            'merchantID' => $cfg['merchantId'],
            'merchantReferenceCode' => $referenceCode,
            'ccAuthService_run' => 'true',
            'paymentSolution' => $cfg['paymentSolution'],
            'encryptedPayment_data' => $token,
            'purchaseTotals_currency' => $currency,
            'purchaseTotals_grandTotalAmount' => $amount,
        ];
        if ($capture) {
            $request['ccCaptureService_run'] = 'true';
        }
        if ($wallet === 'apple') {
            $request['encryptedPayment_descriptor'] = self::APPLE_DESCRIPTOR;
            if ($cardType !== null) {
                $request['card_cardType'] = $cardType;
            }
        }
        foreach ($this->billToFields($billTo) as $k => $v) {
            $request[$k] = $v;
        }

        return $this->send($wallet, $request);
    }

    /** Capture a prior authorization (shop goods, on shipment). */
    public function capture(string $wallet, string $referenceCode, string $authRequestId, string $amount, string $currency): array
    {
        return $this->send($wallet, [
            'merchantID' => Config::forWallet($wallet)['merchantId'],
            'merchantReferenceCode' => $referenceCode,
            'ccCaptureService_run' => 'true',
            'ccCaptureService_authRequestID' => $authRequestId,
            'purchaseTotals_currency' => $currency,
            'purchaseTotals_grandTotalAmount' => $amount,
        ]);
    }

    /** Reverse an authorization hold before capture. */
    public function reverse(string $wallet, string $referenceCode, string $authRequestId, string $amount, string $currency): array
    {
        return $this->send($wallet, [
            'merchantID' => Config::forWallet($wallet)['merchantId'],
            'merchantReferenceCode' => $referenceCode,
            'ccAuthReversalService_run' => 'true',
            'ccAuthReversalService_authRequestID' => $authRequestId,
            'purchaseTotals_currency' => $currency,
            'purchaseTotals_grandTotalAmount' => $amount,
        ]);
    }

    /** Refund a captured payment (follow-on credit). Partial or full. */
    public function refund(string $wallet, string $referenceCode, string $captureRequestId, string $amount, string $currency): array
    {
        return $this->send($wallet, [
            'merchantID' => Config::forWallet($wallet)['merchantId'],
            'merchantReferenceCode' => $referenceCode,
            'ccCreditService_run' => 'true',
            'ccCreditService_captureRequestID' => $captureRequestId,
            'purchaseTotals_currency' => $currency,
            'purchaseTotals_grandTotalAmount' => $amount,
        ]);
    }

    /** @return array<string,string> */
    private function billToFields(array $billTo): array
    {
        $map = [
            'firstName' => 'billTo_firstName',
            'lastName' => 'billTo_lastName',
            'email' => 'billTo_email',
            'street1' => 'billTo_street1',
            'city' => 'billTo_city',
            'state' => 'billTo_state',
            'postalCode' => 'billTo_postalCode',
            'country' => 'billTo_country',
        ];
        $out = [];
        foreach ($map as $src => $field) {
            if (!empty($billTo[$src])) {
                $out[$field] = (string) $billTo[$src];
            }
        }
        return $out;
    }

    /**
     * The one SDK boundary. Points the SDK at the wallet's cybs.ini (which carries
     * that MID's P12), runs the transaction, and normalizes the reply.
     *
     * NOTE: finalize the client construction against the installed cybersource/sdk-php
     * version — the legacy SDK reads cybs.ini from the CYBS_INI path. Everything
     * feeding this method is already the correct Simple Order field set.
     */
    private function send(string $wallet, array $request): array
    {
        $cfg = Config::forWallet($wallet);
        putenv('CYBS_INI=' . $cfg['iniPath']); // select this MID's config + P12

        $client = new \CybsNameValuePairClient();
        $reply = $client->runTransaction($request);

        return [
            'decision' => $reply['decision'] ?? 'ERROR',
            'reasonCode' => isset($reply['reasonCode']) ? (int) $reply['reasonCode'] : null,
            'requestId' => $reply['requestID'] ?? null,
            'raw' => $reply,
        ];
    }
}
