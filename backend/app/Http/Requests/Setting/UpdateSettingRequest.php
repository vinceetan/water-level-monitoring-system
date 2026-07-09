<?php

namespace App\Http\Requests\Setting;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates settings updates.
 *
 * All fields are 'sometimes' — admin can update just one setting
 * without resending all of them.
 *
 * Range constraints match what makes physical sense:
 * - sensor_height can't be negative or exceed 9999cm (~100m)
 * - percentages must be 0-100
 * - sampling interval must be at least 1 second
 * - critical must be higher than warning (validated in withValidator)
 */
class UpdateSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'sensor_height_cm'          => ['sometimes', 'numeric', 'min:1', 'max:9999.99'],
            'warning_level_percent'     => ['sometimes', 'integer', 'min:1', 'max:99'],
            'critical_level_percent'    => ['sometimes', 'integer', 'min:2', 'max:100'],
            'sampling_interval_seconds' => ['sometimes', 'integer', 'min:1', 'max:3600'],
            'buzzer_enabled'            => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Add custom validation after the basic rules pass.
     *
     * This ensures critical_level is always higher than warning_level.
     * If the admin sets warning=80 and critical=70, that makes no sense —
     * critical should always be the higher threshold.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $warning = $this->input('warning_level_percent');
            $critical = $this->input('critical_level_percent');

            // Only validate if both are being updated in this request
            if ($warning !== null && $critical !== null && $critical <= $warning) {
                $validator->errors()->add(
                    'critical_level_percent',
                    'Critical level must be higher than warning level.'
                );
            }
        });
    }

    public function messages(): array
    {
        return [
            'sampling_interval_seconds.min' => 'Sampling interval must be at least 1 second.',
            'sampling_interval_seconds.max' => 'Sampling interval cannot exceed 3600 seconds (1 hour).',
        ];
    }
}
