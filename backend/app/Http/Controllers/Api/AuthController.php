<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Login a user and return a Sanctum token.
     *
     * Flow:
     * 1. LoginRequest validates email & password are present (auto 422 if not)
     * 2. We look up the user by email
     * 3. We verify the password against the stored hash
     * 4. We create a Sanctum token
     * 5. We return the user data + token
     *
     * React will store this token and send it as:
     * Authorization: Bearer <token>
     */
    public function login(LoginRequest $request): JsonResponse
    {
        // Find the user by email
        $user = User::where('email', $request->email)->first();

        // Check if user exists AND password matches
        // Hash::check() compares plain text against bcrypt hash
        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid email or password.',
            ], 401);
        }

        // Create a Sanctum token
        // The string 'auth-token' is a label — useful if you later want
        // to distinguish between different token types (e.g., 'esp32-token')
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'user'    => $user,  // $hidden ensures password is excluded
            'token'   => $token,
        ]);
    }

    /**
     * Register a new community user (admin-only).
     *
     * The RegisterRequest handles:
     * - Authorization: only admins can access this (403 if not)
     * - Validation: full_name, email, password rules (422 if invalid)
     *
     * By the time this method runs, we know:
     * 1. The request is from an authenticated admin
     * 2. All input is valid
     * 3. The email is unique
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'full_name' => $request->full_name,
            'email'     => $request->email,
            'password'  => $request->password, // Auto-hashed by the 'hashed' cast
        ]);

        // Set the role explicitly — NOT from user input (security)
        $user->role = 'community';
        $user->save();

        return response()->json([
            'message' => 'User registered successfully.',
            'user'    => $user,
        ], 201); // 201 = Created
    }

    /**
     * Logout the current user (revoke their token).
     *
     * This deletes the specific token used for this request,
     * NOT all of the user's tokens. So if they're logged in on
     * multiple devices, only this session is ended.
     */
    public function logout(Request $request): JsonResponse
    {
        // Delete the token that was used to authenticate this request
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }
}
