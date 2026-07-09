<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /**
     * GET /api/admin/users
     *
     * Admin-only — list all users.
     *
     * Returns all users with their role. The admin uses this to
     * see who has access to the system and manage accounts.
     *
     * Note: Since community users no longer log in, this is mainly
     * for managing other admin accounts. Kept flexible for future use.
     */
    public function index(): JsonResponse
    {
        $users = User::latest()->get();

        return response()->json([
            'users' => $users,
        ]);
    }

    /**
     * GET /api/admin/users/{user}
     *
     * Admin-only — show a single user's details.
     */
    public function show(User $user): JsonResponse
    {
        // Load the count of alerts this user has sent (if admin)
        $user->loadCount('alerts');

        return response()->json([
            'user' => $user,
        ]);
    }

    /**
     * PUT /api/admin/users/{user}
     *
     * Admin-only — update a user's info (name, email, role).
     *
     * Use cases:
     * - Change a user's name or email
     * - Promote a community user to admin (or demote)
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'full_name' => ['sometimes', 'string', 'max:100'],
            'email'     => ['sometimes', 'email', 'max:100', 'unique:users,email,' . $user->id],
            'role'      => ['sometimes', 'in:admin,community'],
            'password'  => ['sometimes', 'string', 'min:8'],
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'User updated successfully.',
            'user'    => $user,
        ]);
    }

    /**
     * DELETE /api/admin/users/{user}
     *
     * Admin-only — delete a user account.
     *
     * Safety: An admin cannot delete their own account.
     * This prevents accidentally locking yourself out.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        // Prevent self-deletion
        if ($request->user()->id === $user->id) {
            return response()->json([
                'message' => 'You cannot delete your own account.',
            ], 403);
        }

        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully.',
        ]);
    }
}
