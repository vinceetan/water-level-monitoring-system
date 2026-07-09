<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates login input.
 *
 * Form Requests are Laravel's way of separating validation logic
 * from controllers. When this class is type-hinted in a controller
 * method, Laravel automatically validates the request BEFORE the
 * controller code runs. If validation fails, Laravel returns a
 * 422 JSON response with error messages — we don't need to write
 * that logic ourselves.
 */
class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * Login is a public endpoint — anyone can attempt to log in.
     * (This is about request authorization, NOT user authentication.)
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * 'required' — field must be present and not empty
     * 'email'    — must be a valid email format
     * 'string'   — must be a string (prevents array injection attacks)
     */
    public function rules(): array
    {
        return [
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ];
    }
}
