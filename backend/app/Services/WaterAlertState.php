<?php

namespace App\Services;

class WaterAlertState
{
    public const FLOAT_ALERT_TITLE = 'CRITICAL: Float Switch Activated';

    public const FLOAT_INACTIVE = 'inactive';
    public const FLOAT_ACTIVATED = 'activated';
    public const FLOAT_UNKNOWN = 'unknown';

    public static function normalizeFloatSwitchStatus(mixed $status): string
    {
        if (! is_string($status)) {
            return self::FLOAT_UNKNOWN;
        }

        $value = strtolower(trim($status));

        return in_array($value, [self::FLOAT_INACTIVE, self::FLOAT_ACTIVATED, self::FLOAT_UNKNOWN], true)
            ? $value
            : self::FLOAT_UNKNOWN;
    }

    public static function measurementStatus(float $waterLevelCm, float $warningLevelCm, float $criticalLevelCm): string
    {
        if ($waterLevelCm >= $criticalLevelCm) {
            return 'CRITICAL';
        }

        if ($waterLevelCm >= $warningLevelCm) {
            return 'WARNING';
        }

        return 'SAFE';
    }

    public static function overallAlertState(?string $measurementStatus, string $floatSwitchStatus): string
    {
        if (self::normalizeFloatSwitchStatus($floatSwitchStatus) === self::FLOAT_ACTIVATED) {
            return 'CRITICAL';
        }

        if (! $measurementStatus || $measurementStatus === 'UNAVAILABLE') {
            return 'UNAVAILABLE';
        }

        return $measurementStatus;
    }

    public static function cacheKey(int $deviceId): string
    {
        return "float_switch_status:{$deviceId}";
    }
}
