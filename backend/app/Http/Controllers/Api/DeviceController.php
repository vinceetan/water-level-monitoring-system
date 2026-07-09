<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Device\StoreDeviceRequest;
use App\Http\Requests\Device\UpdateDeviceRequest;
use App\Models\Device;
use Illuminate\Http\JsonResponse;

class DeviceController extends Controller
{
    /**
     * GET /api/devices
     *
     * List all active devices.
     * Both admin and community users can view devices.
     *
     * 'withCount' adds a 'sensor_readings_count' field to each device
     * without loading all the readings. This is efficient — it does a
     * single COUNT query instead of loading thousands of rows.
     *
     * 'latest()' orders by created_at descending (newest first).
     */
    public function index(): JsonResponse
    {
        $devices = Device::where('is_active', true)
            ->withCount('sensorReadings')
            ->latest()
            ->get();

        return response()->json([
            'devices' => $devices,
        ]);
    }

    /**
     * GET /api/devices/{device}
     *
     * Show a single device with its latest sensor reading.
     *
     * 'with' is eager loading — it loads the related data in a single
     * query instead of making separate queries (N+1 problem prevention).
     *
     * We load only the latest sensor reading using a constrained eager load.
     */
    public function show(Device $device): JsonResponse
    {
        // Load the latest sensor reading for this device
        $device->load([
            'sensorReadings' => function ($query) {
                $query->latest()->limit(1);
            },
        ]);

        // Also add the total reading count
        $device->loadCount('sensorReadings');

        return response()->json([
            'device' => $device,
        ]);
    }

    /**
     * POST /api/devices
     *
     * Register a new ESP32 device.
     * Admin-only (enforced by route middleware + StoreDeviceRequest).
     *
     * After creating the device, the admin will program the device_code
     * into the ESP32 firmware so it can identify itself when sending data.
     */
    public function store(StoreDeviceRequest $request): JsonResponse
    {
        $device = Device::create($request->validated());

        return response()->json([
            'message' => 'Device registered successfully.',
            'device'  => $device,
        ], 201);
    }

    /**
     * PUT /api/devices/{device}
     *
     * Update a device's information.
     * Admin-only (enforced by route middleware + UpdateDeviceRequest).
     *
     * 'validated()' returns only the fields that passed validation,
     * so if the admin only sends { "location": "New Bridge" },
     * only the location field gets updated.
     */
    public function update(UpdateDeviceRequest $request, Device $device): JsonResponse
    {
        $device->update($request->validated());

        return response()->json([
            'message' => 'Device updated successfully.',
            'device'  => $device,
        ]);
    }

    /**
     * DELETE /api/devices/{device}
     *
     * Soft-deactivate a device (set is_active = false).
     *
     * We do NOT hard-delete because:
     * 1. sensor_readings rows reference this device_id
     * 2. alerts rows reference this device_id
     * 3. We want to preserve historical data for charts and reports
     *
     * The device will no longer appear in the active device list,
     * and the ESP32 won't be able to submit new readings for it.
     */
    public function destroy(Device $device): JsonResponse
    {
        $device->update(['is_active' => false]);

        return response()->json([
            'message' => 'Device deactivated successfully.',
        ]);
    }
}
