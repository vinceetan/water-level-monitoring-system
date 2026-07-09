<?php

namespace App\Http\Requests\Device;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates input when updating an existing device.
 *
 * Key difference from StoreDeviceRequest:
 * - Fields use 'sometimes' instead of 'required', meaning you can
 *   send only the fields you want to update (partial updates).
 * - device_code uniqueness check ignores the current device's own row.
 *   Without this, updating a device's name would fail because its
 *   own device_code "already exists."
 */
class UpdateDeviceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isAdmin();
    }

    public function rules(): array
    {
        // $this->route('device') gets the {device} parameter from the URL
        // e.g., PUT /api/devices/3 → $this->route('device') = 3
        $deviceId = $this->route('device');

        return [
            'device_name' => ['sometimes', 'string', 'max:100'],
            'device_code' => [
                'sometimes', 'string', 'max:50',
                Rule::unique('devices', 'device_code')->ignore($deviceId),
            ],
            'location'    => ['sometimes', 'string', 'max:255'],
            'latitude'    => ['nullable', 'numeric', 'between:-90,90'],
            'longitude'   => ['nullable', 'numeric', 'between:-180,180'],
            'is_active'   => ['sometimes', 'boolean'],
        ];
    }
}
