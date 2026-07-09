<?php

namespace App\Http\Requests\Alert;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates input when creating a manual alert.
 *
 * Manual alerts are sent by admins to warn the community.
 * System alerts are created automatically by code (not through this request).
 */
class StoreAlertRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'device_id' => ['nullable', 'integer', 'exists:devices,id'],
            'title'     => ['required', 'string', 'max:150'],
            'message'   => ['required', 'string'],
            'image_url' => ['nullable', 'string', 'max:255'],
            'severity'  => ['required', 'in:INFO,WARNING,CRITICAL'],
            'expires_at' => ['nullable', 'date', 'after:now'],
        ];
    }

    public function messages(): array
    {
        return [
            'severity.in'      => 'Severity must be INFO, WARNING, or CRITICAL.',
            'expires_at.after'  => 'Expiry date must be in the future.',
            'device_id.exists'  => 'The specified device does not exist.',
        ];
    }
}
