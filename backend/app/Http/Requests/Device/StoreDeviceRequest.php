<?php

namespace App\Http\Requests\Device;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates input when creating a new device.
 *
 * Only admins can create devices — enforced by route middleware,
 * but we double-check here (defense-in-depth).
 */
class StoreDeviceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isAdmin();
    }

    /**
     * Validation rules for creating a device.
     *
     * 'unique:devices,device_code' — ensures no two devices share the same code.
     * This is critical because the ESP32 identifies itself by this code.
     * If two devices had the same code, we wouldn't know which one sent the data.
     */
    public function rules(): array
    {
        return [
            'device_name' => 'required|string|max:255',
            'device_code' => 'required|string|max:100|unique:devices',
            'location'    => 'required|string|max:255',
            'latitude'    => 'nullable|numeric|between:-90,90',
            'longitude'   => 'nullable|numeric|between:-180,180',
        ];
    }

    public function messages(): array
    {
        return [
            'device_code.unique' => 'This device code is already registered.',
        ];
    }
}
