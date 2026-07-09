<?php

namespace App\Http\Requests\SensorReading;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates sensor reading data from the ESP32.
 *
 * The ESP32 sends: device_code, distance_cm, water_level_percent
 *
 * Note: The ESP32 sends 'device_code' (a string like "ESP32-001"),
 * NOT 'device_id' (a number). This is because the ESP32 doesn't
 * know its database ID — it only knows its unique code that was
 * programmed into its firmware.
 *
 * The controller will look up the device_id from the device_code.
 */
class StoreSensorReadingRequest extends FormRequest
{
    /**
     * Any authenticated user can submit readings.
     * (In practice, this will be the ESP32's token.)
     */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'device_code'         => ['required', 'string', 'exists:devices,device_code'],
            'distance_cm'         => ['required', 'numeric', 'min:0', 'max:9999.99'],
            'water_level_percent' => ['required', 'numeric', 'min:0', 'max:100'],
        ];
    }

    /**
     * Custom error messages for ESP32-friendly responses.
     */
    public function messages(): array
    {
        return [
            'device_code.exists' => 'Device not found. Check your device_code.',
            'distance_cm.max'    => 'distance_cm exceeds maximum (9999.99).',
        ];
    }
}
