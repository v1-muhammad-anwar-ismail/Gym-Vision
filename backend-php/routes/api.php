<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AiConfigController;

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AnalysisController;

// Auth Routes (Public — no token needed)
Route::post('/auth/send-otp', [AuthController::class, 'sendOtp']);
Route::post('/auth/verify-otp', [AuthController::class, 'verifyOtp']);
Route::post('/auth/submit-password', [AuthController::class, 'submitPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

// Public Landing Stats
Route::get('/public/stats', function () {
    $totalUsers = \App\Models\User::count();
    $activeAi = \App\Models\AiConfig::where('is_active', true)->count();
    $totalAnalyses = \App\Models\AnalysisHistory::count();
    return response()->json([
        'total_users' => $totalUsers,
        'active_ai' => $activeAi,
        'total_analyses' => $totalAnalyses,
    ]);
});

Route::post('/public/contact', function (Illuminate\Http\Request $request) {
    $request->validate([
        'name' => 'required|string|max:255',
        'email' => 'required|email|max:255',
        'subject' => 'required|string|max:255',
        'message' => 'required|string',
    ]);

    $data = $request->only(['name', 'email', 'subject', 'message']);

    try {
        Illuminate\Support\Facades\Mail::raw(
            "Name: {$data['name']}\nEmail: {$data['email']}\n\nMessage:\n{$data['message']}",
            function ($mail) use ($data) {
                $mail->to('stanvision1534@gmail.com')
                     ->subject("GymVision Contact: {$data['subject']}");
            }
        );
        return response()->json(['message' => 'Message sent successfully']);
    } catch (\Exception $e) {
        \Illuminate\Support\Facades\Log::error('Contact form email failed: ' . $e->getMessage());
        return response()->json(['message' => 'Failed to send message'], 500);
    }
});

// Protected Routes (require Sanctum token)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // AI Config Routes (Read-only for normal users)
    Route::get('/ai-configs/active', [AiConfigController::class, 'activeConfigs']);

    // Analysis Routes
    Route::post('/analyze', [AnalysisController::class, 'analyze']);
    Route::post('/analyze/upload-chunk', [AnalysisController::class, 'uploadChunk']);
    Route::post('/analyze/process', [AnalysisController::class, 'processChunked']);
    Route::get('/analysis/history', [AnalysisController::class, 'history']);
    Route::get('/analysis/stats', [AnalysisController::class, 'stats']);

    // Profile Routes
    Route::get('/profile', [ProfileController::class, 'getProfile']);
    Route::put('/profile', [ProfileController::class, 'updateProfile']);
    Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar']);
    Route::get('/profile/check-username/{username}', [ProfileController::class, 'checkUsername']);

    // Account Routes
    Route::put('/account/change-password', [AccountController::class, 'changePassword']);
    Route::post('/account/reset-password', [AccountController::class, 'resetPassword']);
    Route::delete('/account/unlink-google', [AccountController::class, 'unlinkGoogle']);
    Route::get('/account/login-history', [AccountController::class, 'getHistory']);
    Route::post('/account/login-history', [AccountController::class, 'logHistory']);

    // Admin Only Routes
    Route::middleware('admin')->group(function () {
        // AI Config Routes
        Route::get('/ai-configs', [AiConfigController::class, 'index']);
        Route::post('/ai-configs', [AiConfigController::class, 'store']);
        Route::put('/ai-configs/{id}', [AiConfigController::class, 'update']);
        Route::delete('/ai-configs/{id}', [AiConfigController::class, 'destroy']);

        // Admin User Routes
        Route::get('/admin/users', [AdminUserController::class, 'index']);
        Route::patch('/admin/users/{id}/toggle-ban', [AdminUserController::class, 'toggleBan']);
        Route::delete('/admin/users/{id}', [AdminUserController::class, 'destroy']);
    });
});
