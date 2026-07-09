<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates registration input.
 *
 * Only admins can register new users (community accounts).
 * The authorize() method checks for this.
 */
class RegisterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * Only authenticated admins can create new users.
     * This runs BEFORE validation — so if a non-admin tries,
     * they get a 403 Forbidden response immediately.
     */
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isAdmin();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * 'max:100'          — matches your VARCHAR(100) column length
     * 'unique:users'     — checks the users table for duplicate emails
     * 'min:8'            — minimum password length for security
     * 'confirmed'        — requires a matching 'password_confirmation' field
     */
    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'max:100'],
            'email'     => ['required', 'email', 'max:100', 'unique:users,email'],
            'password'  => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }

    /**
     * Custom error messages for clearer feedback.
     *
     * By default, Laravel says "The email has already been taken."
     * We can customize these to be more user-friendly.
     */
    public function messages(): array
    {
        return [
            'email.unique'      => 'A user with this email already exists.',
            'password.confirmed' => 'Password and confirmation do not match.',
        ];
    }
}
