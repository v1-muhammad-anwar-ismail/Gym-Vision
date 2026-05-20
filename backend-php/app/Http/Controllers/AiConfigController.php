<?php

namespace App\Http\Controllers;

use App\Models\AiConfig;
use Illuminate\Http\Request;

class AiConfigController extends Controller
{
    public function index()
    {
        return response()->json(AiConfig::all());
    }

    public function activeConfigs()
    {
        return response()->json(AiConfig::where('is_active', true)->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'provider' => 'required|string',
            'model' => 'required|string',
            'api_key' => 'nullable|string',
            'base_url' => 'nullable|string|url',
            'is_active' => 'boolean',
        ]);

        $config = AiConfig::create($request->only(['provider', 'model', 'api_key', 'base_url', 'is_active']));
        return response()->json(['message' => 'AI Config created', 'data' => $config], 201);
    }

    public function update(Request $request, $id)
    {
        $config = AiConfig::findOrFail($id);
        
        $request->validate([
            'provider' => 'sometimes|string',
            'model' => 'sometimes|string',
            'api_key' => 'nullable|string',
            'base_url' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $config->update($request->only(['provider', 'model', 'api_key', 'base_url', 'is_active']));
        return response()->json(['message' => 'AI Config updated', 'data' => $config]);
    }

    public function destroy($id)
    {
        $config = AiConfig::findOrFail($id);
        $config->delete();
        
        return response()->json(['message' => 'AI Config deleted successfully']);
    }
}
