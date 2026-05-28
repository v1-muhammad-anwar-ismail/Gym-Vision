<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\LoginHistory;
use App\Models\Otp;

class AccountController extends Controller
{
    public function changePassword(Request $request)
    {
        $request->validate([
            'old_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->old_password, $user->password)) {
            return response()->json(['error' => 'Incorrect old password'], 400);
        }

        $user->update([
            'password' => Hash::make($request->new_password)
        ]);

        return response()->json(['message' => 'Password updated successfully']);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'otp' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        $otpRecord = Otp::where('email', $user->email)
            ->where('otp', $request->otp)
            ->first();

        if (!$otpRecord) {
            return response()->json(['error' => 'Invalid OTP code'], 400);
        }

        if (now()->greaterThan($otpRecord->expires_at)) {
            $otpRecord->delete();
            return response()->json(['error' => 'OTP has expired'], 400);
        }

        // OTP is valid — delete it so it can't be reused
        $otpRecord->delete();

        $user->update([
            'password' => Hash::make($request->new_password)
        ]);

        return response()->json(['message' => 'Password reset successfully']);
    }

    public function unlinkGoogle(Request $request)
    {
        $user = $request->user();

        if (!$user->password) {
            return response()->json(['error' => 'Cannot unlink Google account without setting a password first.'], 400);
        }

        $user->update([
            'google_id' => null
        ]);

        return response()->json(['message' => 'Google account unlinked successfully']);
    }

    public function logHistory(Request $request)
    {
        $request->validate([
            'city' => 'nullable|string',
            'country' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
        ]);

        LoginHistory::create([
            'user_id' => $request->user()->id,
            'ip_address' => $request->ip(),
            'device' => $request->userAgent(),
            'city' => $request->city,
            'country' => $request->country,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'logged_in_at' => now(),
        ]);

        return response()->json(['message' => 'Login history logged']);
    }

    public function getHistory(Request $request)
    {
        $history = $request->user()->loginHistories()->orderBy('logged_in_at', 'desc')->take(10)->get();
        return response()->json($history);
    }
}
