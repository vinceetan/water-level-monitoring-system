<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Setting\UpdateSettingRequest;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;

class SettingController extends Controller
{
    /**
     * GET /api/settings
     *
     * Public endpoint — returns the current monitoring configuration.
     *
     * Used by:
     * - React admin settings page (to populate the form)
     * - React community dashboard (to show threshold levels on the gauge)
     * - ESP32 (to know sampling_interval_seconds and sensor_height_cm)
     *
     * Since this is a single-row table, we just return the first row.
     */
    public function index(): JsonResponse
    {
        $settings = Setting::first();

        if (! $settings) {
            return response()->json([
                'message' => 'No settings configured yet.',
            ], 404);
        }

        return response()->json([
            'settings' => $settings,
        ]);
    }

    /**
     * PUT /api/settings
     *
     * Admin-only — update the monitoring configuration.
     *
     * Since settings is a single-row table, this always updates
     * the first (and only) row. No ID is needed in the URL.
     *
     * Example request body:
     * { "warning_level_percent": 65, "critical_level_percent": 85 }
     *
     * Only the fields you send will be updated (partial update).
     */
    public function update(UpdateSettingRequest $request): JsonResponse
    {
        $settings = Setting::first();

        if (! $settings) {
            return response()->json([
                'message' => 'No settings configured yet. Please seed settings first.',
            ], 404);
        }

        $settings->update($request->validated());

        return response()->json([
            'message'  => 'Settings updated successfully.',
            'settings' => $settings,
        ]);
    }
}
