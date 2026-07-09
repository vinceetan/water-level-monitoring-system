<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Role-based access control middleware.
 *
 * Usage in routes:
 *   Route::middleware('role:admin')     → only admins
 *   Route::middleware('role:community') → only community users
 *
 * How Laravel middleware works:
 * 1. The request hits this middleware AFTER auth:sanctum has run
 * 2. We check the user's role against the required role
 * 3. If it matches, we call $next($request) to pass it along
 * 4. If not, we return a 403 Forbidden response immediately
 *
 * The $role parameter comes from the route definition:
 *   'role:admin' → $role = 'admin'
 */
class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $role  The required role (e.g., 'admin' or 'community')
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        // At this point, auth:sanctum has already run.
        // If we get here, we know the user is authenticated.
        // Now we just need to check their role.

        if ($request->user()->role !== $role) {
            return response()->json([
                'message' => "Forbidden. Required role: {$role}.",
            ], 403);
        }

        // Role matches — let the request continue to the controller
        return $next($request);
    }
}
