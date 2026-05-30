<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use App\Models\AnalysisHistory;
use App\Models\AiConfig;
use Illuminate\Support\Facades\Log;

class AnalysisController extends Controller
{
    /**
     * Single-file upload + analyze (for small files < 5MB)
     */
    public function analyze(Request $request)
    {
        $request->validate([
            'video' => 'required|file|mimes:mp4,mov,avi,mkv|max:2097152', // max 2GB (in KB)
            'exercise_type' => 'required|string',
            'ai_config_id' => 'nullable|integer',
        ]);

        $user = $request->user();

        // 1. Get AI config
        $aiConfig = $request->ai_config_id 
            ? AiConfig::where('id', $request->ai_config_id)->where('is_active', true)->first()
            : AiConfig::where('is_active', true)->first();
            
        if (!$aiConfig) {
            return response()->json(['error' => 'No active AI Provider configured. Please contact administrator.'], 500);
        }

        // 2. Save video
        $file = $request->file('video');
        $filename = time() . '_' . $file->getClientOriginalName();
        $path = $file->storeAs('videos', $filename, 'public');
        
        $absolutePath = Storage::disk('public')->path($path);

        // 3. Call Python AI Server
        $language = $request->input('language', 'id');
        return $this->processWithPython($absolutePath, $request->exercise_type, $aiConfig, $user, $path, $language);
    }

    /**
     * Receive a single chunk of a large file
     */
    public function uploadChunk(Request $request)
    {
        $request->validate([
            'chunk' => 'required|file',
            'chunk_index' => 'required|integer|min:0',
            'total_chunks' => 'required|integer|min:1',
            'upload_id' => 'required|string',
            'original_name' => 'required|string',
        ]);

        $uploadId = $request->upload_id;
        $chunkIndex = (int) $request->chunk_index;
        $totalChunks = (int) $request->total_chunks;

        // Store chunk in a temp directory
        $chunkDir = "chunks" . DIRECTORY_SEPARATOR . $uploadId;
        $chunk = $request->file('chunk');
        $chunk->storeAs($chunkDir, "chunk_{$chunkIndex}", 'local');

        return response()->json([
            'message' => 'Chunk uploaded',
            'chunk_index' => $chunkIndex,
            'total_chunks' => $totalChunks,
        ]);
    }

    /**
     * Process (merge chunks + analyze) after all chunks are uploaded
     */
    public function processChunked(Request $request)
    {
        $request->validate([
            'upload_id' => 'required|string',
            'exercise_type' => 'required|string',
            'original_name' => 'required|string',
            'ai_config_id' => 'nullable|integer',
        ]);

        $user = $request->user();
        $uploadId = $request->upload_id;
        $originalName = $request->original_name;

        // 1. Get AI config
        $aiConfig = $request->ai_config_id 
            ? AiConfig::where('id', $request->ai_config_id)->where('is_active', true)->first()
            : AiConfig::where('is_active', true)->first();
            
        if (!$aiConfig) {
            return response()->json(['error' => 'No active AI Provider configured. Please contact administrator.'], 500);
        }

        // 2. Merge chunks
        $chunkDir = "chunks" . DIRECTORY_SEPARATOR . $uploadId;
        $absoluteChunkDir = Storage::disk('local')->path($chunkDir);
        
        if (!is_dir($absoluteChunkDir)) {
            return response()->json(['error' => 'Upload chunks not found. Please try again. Path checked: ' . $absoluteChunkDir], 404);
        }

        $chunkFiles = glob($absoluteChunkDir . DIRECTORY_SEPARATOR . 'chunk_*');
        
        // Sort numerically by chunk index
        usort($chunkFiles, function($a, $b) {
            $indexA = (int) str_replace('chunk_', '', basename($a));
            $indexB = (int) str_replace('chunk_', '', basename($b));
            return $indexA - $indexB;
        });

        $filename = time() . '_' . preg_replace('/[^A-Za-z0-9_.\-]/', '_', $originalName);
        $outputPath = "videos" . DIRECTORY_SEPARATOR . $filename;
        $absoluteOutputPath = Storage::disk('public')->path($outputPath);
        
        // Ensure the videos directory exists
        Storage::disk('public')->makeDirectory('videos');

        // Merge all chunks into a single file
        $outputFile = fopen($absoluteOutputPath, 'wb');
        if (!$outputFile) {
            return response()->json(['error' => 'Failed to create output file.'], 500);
        }

        foreach ($chunkFiles as $chunkFile) {
            $chunkContent = fopen($chunkFile, 'rb');
            if ($chunkContent) {
                while (!feof($chunkContent)) {
                    fwrite($outputFile, fread($chunkContent, 8192));
                }
                fclose($chunkContent);
            }
        }
        fclose($outputFile);

        // 3. Clean up chunk files
        foreach ($chunkFiles as $chunkFile) {
            @unlink($chunkFile);
        }
        @rmdir($absoluteChunkDir);

        // 4. Call Python AI Server
        $language = $request->input('language', 'id');
        return $this->processWithPython($absoluteOutputPath, $request->exercise_type, $aiConfig, $user, $outputPath, $language);
    }

    /**
     * Shared logic: call Python AI Server and save history
     */
    private function processWithPython(string $absolutePath, string $exerciseType, AiConfig $aiConfig, $user, string $storagePath, string $language = 'id')
    {
        $pythonServerUrl = env('PYTHON_SERVER_URL', 'http://127.0.0.1:7002');
        
        try {
            $response = Http::timeout(300)->post("$pythonServerUrl/analyze", [
                'video_path' => $absolutePath,
                'exercise_type' => $exerciseType,
                'provider' => $aiConfig->provider,
                'model' => $aiConfig->model,
                'api_key' => $aiConfig->api_key,
                'base_url' => $aiConfig->base_url ?? '',
                'language' => $language,
            ]);

            if (!$response->successful()) {
                Log::error('Python AI Server error: ' . $response->body());
                return response()->json(['error' => 'AI Server processing failed: ' . ($response->json('detail') ?? $response->body())], 500);
            }

            $aiResult = $response->json();
            
            // Handle Thumbnail Extraction
            $thumbnailPath = null;
            if (isset($aiResult['thumbnail_base64']) && !empty($aiResult['thumbnail_base64'])) {
                try {
                    $imageData = base64_decode($aiResult['thumbnail_base64']);
                    $fileName = 'thumbnails/thumb_' . time() . '_' . uniqid() . '.webp';
                    \Illuminate\Support\Facades\Storage::disk('public')->put($fileName, $imageData);
                    $thumbnailPath = $fileName;
                } catch (\Exception $e) {
                    Log::error('Failed to save thumbnail: ' . $e->getMessage());
                }
            }

            // Save to history
            $history = AnalysisHistory::create([
                'user_id' => $user->id,
                'video_path' => $thumbnailPath,
                'exercise_type' => $exerciseType,
                'ai_feedback' => $aiResult['ai_feedback'] ?? 'Analisis selesai tanpa feedback tambahan.',
                'score' => $aiResult['score'] ?? 0,
            ]);

            return response()->json([
                'message' => 'Analysis complete',
                'data' => [
                    'history' => $history,
                    'cv_data' => $aiResult['cv_data'] ?? null
                ]
            ]);

        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Cannot connect to Python AI Server: ' . $e->getMessage());
            return response()->json(['error' => 'Tidak bisa terhubung ke AI Server. Pastikan Python server sudah berjalan di port 7002.'], 500);
        } catch (\Exception $e) {
            Log::error('Analysis Exception: ' . $e->getMessage());
            return response()->json(['error' => 'Analysis error: ' . $e->getMessage()], 500);
        } finally {
            // ALWAYS delete the video file after processing (whether success or fail)
            if (file_exists($absolutePath)) {
                @unlink($absolutePath);
            }
        }
    }

    public function history(Request $request)
    {
        $user = $request->user();
        $histories = AnalysisHistory::where('user_id', $user->id)->orderBy('created_at', 'desc')->get();
        return response()->json($histories);
    }

    public function stats(Request $request)
    {
        $user = $request->user();
        $histories = AnalysisHistory::where('user_id', $user->id)
            ->orderBy('created_at', 'asc')
            ->get();

        $totalAnalyses = $histories->count();
        $averageScore = $totalAnalyses > 0 ? round($histories->avg('score'), 1) : 0;
        
        $lastWorkout = $histories->last();

        // Score trend (group by date, take average score per day)
        $scoreTrend = $histories->groupBy(function ($item) {
            return \Carbon\Carbon::parse($item->created_at)->format('Y-m-d');
        })->map(function ($group, $date) {
            return [
                'date' => $date,
                'score' => round($group->avg('score'), 1),
                'count' => $group->count(),
            ];
        })->values();

        // Exercise breakdown (count per exercise type)
        $exerciseBreakdown = $histories->groupBy('exercise_type')->map(function ($group, $type) {
            return [
                'name' => $type,
                'count' => $group->count(),
                'avg_score' => round($group->avg('score'), 1),
            ];
        })->values();

        return response()->json([
            'total_analyses' => $totalAnalyses,
            'average_score' => $averageScore,
            'last_workout' => $lastWorkout ? [
                'exercise_type' => $lastWorkout->exercise_type,
                'score' => $lastWorkout->score,
                'date' => $lastWorkout->created_at,
            ] : null,
            'score_trend' => $scoreTrend,
            'exercise_breakdown' => $exerciseBreakdown,
        ]);
    }
}
