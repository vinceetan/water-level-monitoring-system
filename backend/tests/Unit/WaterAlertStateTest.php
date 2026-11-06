<?php

namespace Tests\Unit;

use App\Services\WaterAlertState;
use PHPUnit\Framework\TestCase;

class WaterAlertStateTest extends TestCase
{
    public function test_measurement_status_uses_existing_centimeter_thresholds(): void
    {
        $this->assertSame('SAFE', WaterAlertState::measurementStatus(199.9, 200.0, 250.0));
        $this->assertSame('WARNING', WaterAlertState::measurementStatus(200.0, 200.0, 250.0));
        $this->assertSame('WARNING', WaterAlertState::measurementStatus(249.9, 200.0, 250.0));
        $this->assertSame('CRITICAL', WaterAlertState::measurementStatus(250.0, 200.0, 250.0));
    }

    public function test_float_switch_forces_overall_critical_without_using_measurement(): void
    {
        $this->assertSame(
            'CRITICAL',
            WaterAlertState::overallAlertState('SAFE', WaterAlertState::FLOAT_ACTIVATED)
        );
        $this->assertSame(
            'WARNING',
            WaterAlertState::overallAlertState('WARNING', WaterAlertState::FLOAT_INACTIVE)
        );
        $this->assertSame(
            'CRITICAL',
            WaterAlertState::overallAlertState('CRITICAL', WaterAlertState::FLOAT_INACTIVE)
        );
        $this->assertSame(
            'UNAVAILABLE',
            WaterAlertState::overallAlertState(null, WaterAlertState::FLOAT_UNKNOWN)
        );
    }

    public function test_unknown_float_values_are_not_treated_as_safe(): void
    {
        $this->assertSame('unknown', WaterAlertState::normalizeFloatSwitchStatus('bogus'));
        $this->assertSame('unknown', WaterAlertState::normalizeFloatSwitchStatus(null));
    }
}
