<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Twilio\Rest\Client;

class TwilioService
{
    /**
     * Send an SMS using the Twilio API.
     * Requires TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, and TARGET_PHONE_NUMBER in .env
     */
    public static function sendSms(string $message): bool
    {
        $sid = env('TWILIO_SID');
        $token = env('TWILIO_AUTH_TOKEN');
        $fromNumber = env('TWILIO_PHONE_NUMBER');
        $toNumber = env('TARGET_PHONE_NUMBER');

        if (empty($sid) || empty($token) || empty($fromNumber) || empty($toNumber)) {
            Log::info("Twilio SMS skipped (missing credentials in .env): {$message}");
            return false;
        }

        try {
            $client = new Client($sid, $token);
            
            $client->messages->create(
                $toNumber,
                [
                    'from' => $fromNumber,
                    'body' => $message
                ]
            );

            return true;
        } catch (\Exception $e) {
            Log::error('Twilio SMS Exception: ' . $e->getMessage());
            return false;
        }
    }
}
