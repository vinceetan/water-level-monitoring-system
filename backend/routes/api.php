<?php

use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DeviceController;
use App\Http\Controllers\Api\SensorReadingController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| All routes here are automatically prefixed with /api
|
| Route structure:
|   1. Public routes     → No auth. Community dashboard data.
|   2. ESP32 routes      → Auth required, not admin-only.
|   3. Admin routes      → Auth + admin role required.
|
| Community users do NOT log in — they see public data directly.
| Only admins authenticate to manage devices, alerts, and settings.
|
*/

// ---------------------------------------------------------------
// Public Routes (no authentication required)
// Community dashboard data — anyone can view
// ---------------------------------------------------------------

Route::post('/login', [AuthController::class, 'login']);

// Devices — public read access
Route::get('/devices', [DeviceController::class, 'index']);
Route::get('/devices/{device}', [DeviceController::class, 'show']);

// Sensor Readings — public read access
Route::get('/sensor-readings', [SensorReadingController::class, 'index']);
Route::get('/sensor-readings/latest', [SensorReadingController::class, 'latest']);

// Alerts — public read access
Route::get('/alerts', [AlertController::class, 'index']);
Route::get('/alerts/history', [AlertController::class, 'history']);

// Settings — public read access (ESP32 + React both need this)
Route::get('/settings', [SettingController::class, 'index']);

// ---------------------------------------------------------------
// ESP32 Routes (authentication required, but NOT admin-only)
// The ESP32 authenticates with its own Sanctum token.
// ---------------------------------------------------------------

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/sensor-readings', [SensorReadingController::class, 'store']);
});

// ---------------------------------------------------------------
// Admin Routes (authentication + admin role required)
// ---------------------------------------------------------------

Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Dashboard — aggregated stats
    Route::get('/admin/dashboard', [DashboardController::class, 'index']);

    // User management
    Route::post('/register', [AuthController::class, 'register']);
    Route::get('/admin/users', [UserController::class, 'index']);
    Route::get('/admin/users/{user}', [UserController::class, 'show']);
    Route::put('/admin/users/{user}', [UserController::class, 'update']);
    Route::delete('/admin/users/{user}', [UserController::class, 'destroy']);

    // Devices — write operations
    Route::post('/devices', [DeviceController::class, 'store']);
    Route::put('/devices/{device}', [DeviceController::class, 'update']);
    Route::delete('/devices/{device}', [DeviceController::class, 'destroy']);

    // Alerts — write operations
    Route::post('/alerts', [AlertController::class, 'store']);
    Route::put('/alerts/{alert}', [AlertController::class, 'update']);
    Route::delete('/alerts/{alert}', [AlertController::class, 'destroy']);

    // Settings — write operations
    Route::put('/settings', [SettingController::class, 'update']);
});
