<?php

namespace App\Http\Requests\Alert;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates input when updating an alert.
 *
 * Admins might update an alert to:
 * - Change the message
 * - Deactivate it (is_active = false)
 * - Extend/change the expiry date
 */
class UpdateAlertRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'title'      => ['sometimes', 'string', 'max:150'],
            'message'    => ['sometimes', 'string'],
            'image_url'  => ['nullable', 'string', 'max:255'],
            'severity'   => ['sometimes', 'in:INFO,WARNING,CRITICAL'],
            'is_active'  => ['sometimes', 'boolean'],
            'expires_at' => ['nullable', 'date'],
        ];
    }
}
