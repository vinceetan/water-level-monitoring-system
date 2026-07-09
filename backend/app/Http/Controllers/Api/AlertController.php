<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Alert\StoreAlertRequest;
use App\Http\Requests\Alert\UpdateAlertRequest;
use App\Models\Alert;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlertController extends Controller
{
    /**
     * GET /api/alerts
     *
     * Public endpoint — returns currently active alerts.
     *
     * An alert is considered "active" when:
     * 1. is_active = true, AND
     * 2. It either has no expiry date, OR the expiry date hasn't passed yet
     *
     * This is what the community dashboard shows — current warnings
     * that people need to be aware of right now.
     */
    public function index(): JsonResponse
    {
        $alerts = Alert::where('is_active', true)
            ->where(function ($query) {
                // Include alerts with no expiry OR not yet expired
                $query->whereNull('expires_at')
                      ->orWhere('expires_at', '>', now());
            })
            ->with('device:id,device_name,location')
            ->latest()
            ->get();

        return response()->json([
            'alerts' => $alerts,
        ]);
    }

    /**
     * GET /api/alerts/history
     *
     * Public endpoint — returns all alerts (active + inactive + expired).
     *
     * Supports optional filtering:
     *   ?severity=CRITICAL     → filter by severity level
     *   ?alert_type=SYSTEM     → filter by type (SYSTEM or MANUAL)
     *   ?device_id=1           → filter by device
     *   ?limit=50              → limit results (default: 50)
     *
     * Community users can browse past alerts to understand patterns.
     * Admin uses this for the alert history management page.
     */
    public function history(Request $request): JsonResponse
    {
        $query = Alert::with([
            'device:id,device_name,location',
            'user:id,full_name',
        ]);

        // Optional filters
        if ($request->has('severity')) {
            $query->where('severity', $request->severity);
        }

        if ($request->has('alert_type')) {
            $query->where('alert_type', $request->alert_type);
        }

        if ($request->has('device_id')) {
            $query->where('device_id', $request->device_id);
        }

        $limit = min($request->input('limit', 50), 200);

        $alerts = $query->latest()->limit($limit)->get();

        return response()->json([
            'alerts' => $alerts,
        ]);
    }

    /**
     * POST /api/alerts
     *
     * Admin-only — create a manual alert.
     *
     * The admin sends alerts like:
     * - "Evacuation advisory for riverside areas"
     * - "Scheduled dam release at 3:00 PM"
     * - "Water level sensor maintenance — data may be interrupted"
     *
     * The alert_type is automatically set to 'MANUAL'.
     * The user_id is automatically set to the admin who created it.
     */
    public function store(StoreAlertRequest $request): JsonResponse
    {
        $alert = Alert::create([
            ...$request->validated(),
            'alert_type' => 'MANUAL',
            'user_id'    => $request->user()->id,
        ]);

        // Load relationships for the response
        $alert->load([
            'device:id,device_name,location',
            'user:id,full_name',
        ]);

        return response()->json([
            'message' => 'Alert created successfully.',
            'alert'   => $alert,
        ], 201);
    }

    /**
     * PUT /api/alerts/{alert}
     *
     * Admin-only — update an existing alert.
     *
     * Common use cases:
     * - Edit the message after sending
     * - Deactivate an alert (is_active = false)
     * - Extend the expiry date
     */
    public function update(UpdateAlertRequest $request, Alert $alert): JsonResponse
    {
        $alert->update($request->validated());

        $alert->load([
            'device:id,device_name,location',
            'user:id,full_name',
        ]);

        return response()->json([
            'message' => 'Alert updated successfully.',
            'alert'   => $alert,
        ]);
    }

    /**
     * DELETE /api/alerts/{alert}
     *
     * Admin-only — deactivate an alert (soft delete).
     *
     * Like devices, we don't hard-delete. We set is_active = false
     * so the alert disappears from the community view but is
     * preserved in history for records.
     */
    public function destroy(Alert $alert): JsonResponse
    {
        $alert->update(['is_active' => false]);

        return response()->json([
            'message' => 'Alert deactivated successfully.',
        ]);
    }
}
