<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AnalysisHistory;
use Illuminate\Support\Facades\Log;

class RepCounterController extends Controller
{
    public function run(Request $request)
    {
        $request->validate([
            'exercise_type' => 'required|string'
        ]);

        $user = $request->user();
        
        // Define paths
        $baseDir = "D:\\Semester 4\\RPL\\Tugas\\GymVision\\lifting_scanner";
        $pythonExecutable = "{$baseDir}\\env\\Scripts\\python.exe";
        
        // Map exercise type to script
        $scriptMap = [
            'Bicep Curl' => 'bicep_curl.py',
            'Lateral Raise' => 'lateral_raise.py'
        ];
        
        $scriptName = $scriptMap[$request->exercise_type] ?? 'bicep_curl.py';
        $scriptPath = "{$baseDir}\\{$scriptName}";
        
        // Command to run python script
        // We capture output which should contain JSON at the very end
        $command = "cd /d \"{$baseDir}\" && \"{$pythonExecutable}\" \"{$scriptPath}\" 2>&1";
        
        Log::info("Running rep counter script: $command");
        
        $output = shell_exec($command);
        
        if (!$output) {
            return response()->json(['error' => 'Failed to execute script or no output returned.'], 500);
        }

        // Try to parse the last line as JSON
        $lines = explode("\n", trim($output));
        $lastLine = end($lines);
        $resultData = json_decode($lastLine, true);

        if (!$resultData) {
            // Fallback: search for valid json
            preg_match('/\{.*\}/', $output, $matches);
            if (isset($matches[0])) {
                $resultData = json_decode($matches[0], true);
            }
        }

        if (!$resultData) {
            Log::error("Failed to parse script output", ['raw' => $output]);
            return response()->json([
                'error' => 'Script executed but failed to return valid JSON results.',
                'raw_output' => $output
            ], 500);
        }

        // Save to Analysis History
        $feedbackText = "Repetition Counter Results:\n";
        $feedbackText .= "- Left Arm: " . ($resultData['left_reps'] ?? 0) . " reps\n";
        $feedbackText .= "- Right Arm: " . ($resultData['right_reps'] ?? 0) . " reps\n";
        $feedbackText .= "Total Reps: " . ($resultData['total_reps'] ?? 0);

        $history = AnalysisHistory::create([
            'user_id' => $user->id,
            'exercise_type' => $request->exercise_type,
            'ai_feedback' => $feedbackText,
            'score' => $resultData['total_reps'] ?? 0,
            'video_path' => null
        ]);

        return response()->json([
            'message' => 'Rep counting session finished successfully',
            'results' => $resultData,
            'history' => $history
        ]);
    }

    public function stop()
    {
        $baseDir = "D:\\Semester 4\\RPL\\Tugas\\GymVision\\lifting_scanner";
        $stopFilePath = "{$baseDir}\\stop.txt";
        file_put_contents($stopFilePath, "stop");
        
        return response()->json(['message' => 'Stop signal sent successfully.']);
    }

    public function saveHistory(Request $request)
    {
        $request->validate([
            'exercise_type' => 'required|string',
            'left_reps' => 'required|integer',
            'right_reps' => 'required|integer',
            'total_reps' => 'required|integer'
        ]);

        $user = $request->user();
        $lang = $request->input('language', 'id');

        if (str_starts_with($lang, 'en')) {
            $feedbackText = "Repetition Counter Results:\n";
            $feedbackText .= "- Left Arm: " . $request->left_reps . " reps\n";
            $feedbackText .= "- Right Arm: " . $request->right_reps . " reps\n";
            $feedbackText .= "Total Reps: " . $request->total_reps;
        } else {
            $feedbackText = "Hasil Penghitung Repetisi:\n";
            $feedbackText .= "- Lengan Kiri: " . $request->left_reps . " repetisi\n";
            $feedbackText .= "- Lengan Kanan: " . $request->right_reps . " repetisi\n";
            $feedbackText .= "Total Repetisi: " . $request->total_reps;
        }

        $thumbnailPath = null;
        if ($request->filled('thumbnail_base64')) {
            try {
                $imageData = base64_decode($request->thumbnail_base64);
                $fileName = 'thumbnails/thumb_rep_' . time() . '_' . uniqid() . '.webp';
                \Illuminate\Support\Facades\Storage::disk('public')->put($fileName, $imageData);
                $thumbnailPath = $fileName;
            } catch (\Exception $e) {
                Log::error('Failed to save rep counter thumbnail: ' . $e->getMessage());
            }
        }

        $history = AnalysisHistory::create([
            'user_id' => $user->id,
            'exercise_type' => $request->exercise_type,
            'ai_feedback' => $feedbackText,
            'score' => $request->total_reps, 
            'video_path' => $thumbnailPath
        ]);

        return response()->json([
            'message' => 'History saved successfully',
            'history' => $history
        ]);
    }
}
