<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Otp;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use App\Mail\OtpMail;

class AuthController extends Controller
{
    // =============================================
    // STEP 1: Send OTP to email (always)
    // =============================================
    public function sendOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $email = $request->email;

        // Delete any previous OTPs for this email
        Otp::where('email', $email)->delete();

        // Generate 6-digit OTP
        $otpCode = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);

        // Store OTP with 5-minute expiry
        Otp::create([
            'email' => $email,
            'otp' => $otpCode,
            'expires_at' => now()->addMinutes(5),
        ]);

        // Send OTP via email
        Mail::to($email)->send(new OtpMail($otpCode));

        // Check if user already exists
        $isRegistered = User::where('email', $email)->exists();

        return response()->json([
            'message' => 'OTP sent successfully',
            'is_registered' => $isRegistered,
        ]);
    }

    // =============================================
    // STEP 2: Verify OTP
    // =============================================
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp' => 'required|string',
        ]);

        $otpRecord = Otp::where('email', $request->email)
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

        // Check if user is registered
        $isRegistered = User::where('email', $request->email)->exists();

        return response()->json([
            'message' => 'OTP verified successfully',
            'is_registered' => $isRegistered,
        ]);
    }

    // =============================================
    // STEP 3: Submit Password (login or register)
    // =============================================
    public function submitPassword(Request $request)
    {
        $isRegistered = User::where('email', $request->email)->exists();

        if ($isRegistered) {
            $user = User::where('email', $request->email)->first();

            if (empty($user->password)) {
                // User registered via Google but hasn't set a password yet.
                // We require confirmation to set it.
                $request->validate([
                    'email' => 'required|email',
                    'password' => 'required|string|min:8|confirmed',
                ]);

                $user->update([
                    'password' => Hash::make($request->password)
                ]);

                $token = $user->createToken('auth-token')->plainTextToken;

                return response()->json([
                    'message' => 'Password set successfully',
                    'token' => $token,
                    'user' => $user,
                ]);
            }

            // --- Existing user: verify password ---
            $request->validate([
                'email' => 'required|email',
                'password' => 'required|string',
            ]);

            if (!Hash::check($request->password, $user->password)) {
                return response()->json(['error' => 'Incorrect password'], 401);
            }

            if ($user->is_banned) {
                return response()->json(['error' => 'Your account has been banned. Please contact support.'], 403);
            }

            // Ensure stanvision1534@gmail.com is always admin
            if ($user->email === 'stanvision1534@gmail.com' && $user->role !== 'admin') {
                $user->update(['role' => 'admin']);
            }

            // Generate Sanctum token
            $token = $user->createToken('auth-token')->plainTextToken;

            return response()->json([
                'message' => 'Login successful',
                'token' => $token,
                'user' => $user,
            ]);
        } else {
            // --- New user: create account ---
            $request->validate([
                'email' => 'required|email|unique:users',
                'password' => 'required|string|min:8|confirmed',
            ]);

            $user = User::create([
                'name' => explode('@', $request->email)[0], // Use email prefix as default name
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'email_verified_at' => now(),
                'role' => $request->email === 'stanvision1534@gmail.com' ? 'admin' : 'user',
            ]);

            // Generate Sanctum token
            $token = $user->createToken('auth-token')->plainTextToken;

            return response()->json([
                'message' => 'Registration successful',
                'token' => $token,
                'user' => $user,
            ]);
        }
    }

    // =============================================
    // STEP 4: Reset Password (Public)
    // =============================================
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $otpRecord = Otp::where('email', $request->email)
            ->where('otp', $request->otp)
            ->first();

        if (!$otpRecord) {
            return response()->json(['error' => 'Invalid OTP code'], 400);
        }

        if (now()->greaterThan($otpRecord->expires_at)) {
            $otpRecord->delete();
            return response()->json(['error' => 'OTP has expired'], 400);
        }

        // OTP is valid
        $otpRecord->delete();

        $user = User::where('email', $request->email)->first();
        if ($user) {
            $user->update([
                'password' => Hash::make($request->new_password)
            ]);
        } else {
            return response()->json(['error' => 'User not found'], 404);
        }

        return response()->json(['message' => 'Password reset successfully']);
    }

    // =============================================
    // GOOGLE OAUTH: Redirect
    // =============================================
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->redirect();
    }

    // =============================================
    // GOOGLE OAUTH: Callback
    // =============================================
    public function handleGoogleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->user();

            $user = User::where('email', $googleUser->getEmail())->first();
            $isRegistered = $user !== null;

            if ($user && $user->is_banned) {
                $frontendUrl = env('FRONTEND_URL', 'http://localhost:7000');
                return redirect("{$frontendUrl}/login?error=" . urlencode("Your account has been banned."));
            }

            if ($user) {
                // Update Google info and ensure admin role
                $updateData = [
                    'google_id' => $googleUser->getId(),
                    'role' => $user->email === 'stanvision1534@gmail.com' ? 'admin' : $user->role,
                ];
                
                // Only update avatar if it's empty or already a Google avatar
                if (!$user->avatar || str_contains($user->avatar, 'googleusercontent')) {
                    $updateData['avatar'] = $googleUser->getAvatar();
                }
                
                $user->update($updateData);
            } else {
                // Create new user without password
                $user = User::create([
                    'name' => $googleUser->getName(),
                    'email' => $googleUser->getEmail(),
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                    'email_verified_at' => now(),
                    'role' => $googleUser->getEmail() === 'stanvision1534@gmail.com' ? 'admin' : 'user',
                ]);
            }

            // Generate Sanctum token
            $token = $user->createToken('auth-token')->plainTextToken;

            $frontendUrl = env('FRONTEND_URL', 'http://localhost:7000');
            $registered = $isRegistered ? 'true' : 'false';

            // Redirect to frontend with token and registration status
            return redirect("{$frontendUrl}/login?google_token={$token}&is_registered={$registered}&email={$user->email}");
        } catch (\Exception $e) {
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:7000');
            return redirect("{$frontendUrl}/login?error=" . urlencode($e->getMessage()));
        }
    }
}
