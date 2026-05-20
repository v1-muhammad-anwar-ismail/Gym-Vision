<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\User;

class ProfileController extends Controller
{
    public function getProfile(Request $request)
    {
        return response()->json($request->user());
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'nullable|string|max:255|unique:users,username,' . $user->id,
            'age' => 'nullable|integer|min:0|max:120',
            'location' => 'nullable|string|max:255',
        ]);

        $user->update($request->only('name', 'username', 'age', 'location'));

        return response()->json(['message' => 'Profile updated successfully', 'user' => $user]);
    }

    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:20480',
        ]);

        $user = $request->user();

        if ($request->hasFile('avatar')) {
            $file = $request->file('avatar');
            $imageContent = file_get_contents($file->getRealPath());
            $image = imagecreatefromstring($imageContent);
            
            if ($image !== false) {
                $filename = 'avatars/' . uniqid() . '.webp';
                
                // Enable alpha channel for transparent PNG/GIF to WebP
                imagepalettetotruecolor($image);
                imagealphablending($image, true);
                imagesavealpha($image, true);
                
                ob_start();
                imagewebp($image, null, 80); // 80% quality
                $webpData = ob_get_clean();
                imagedestroy($image);
                
                Storage::disk('public')->put($filename, $webpData);
                
                // Generate full URL for the avatar
                $avatarUrl = asset('storage/' . $filename);
                
                $user->update(['avatar' => $avatarUrl]);

                return response()->json(['message' => 'Avatar uploaded and converted to WebP successfully', 'avatar_url' => $avatarUrl]);
            } else {
                return response()->json(['error' => 'Failed to process image'], 500);
            }
        }

        return response()->json(['error' => 'No file uploaded'], 400);
    }

    public function checkUsername($username, Request $request)
    {
        $user = $request->user();
        
        $exists = User::where('username', $username)
            ->where('id', '!=', $user->id)
            ->exists();

        return response()->json(['available' => !$exists]);
    }
}
