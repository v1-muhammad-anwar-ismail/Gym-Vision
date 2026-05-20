<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\ExerciseCategory;

class ExerciseCategoryController extends Controller
{
    public function index()
    {
        $categories = ExerciseCategory::all();
        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:exercise_categories,name|max:255',
            'type' => 'required|string|in:analysis,rep_counter',
            'description' => 'nullable|string',
            'python_script' => 'nullable|string',
            'python_code' => 'nullable|string'
        ]);

        $category = ExerciseCategory::create([
            'name' => $validated['name'],
            'type' => $validated['type'],
            'description' => $validated['description'],
            'python_script' => $validated['python_script'],
        ]);

        // Write the python code to the lifting_scanner directory if provided
        if (!empty($validated['python_script']) && !empty($validated['python_code'])) {
            // Use base_path() to support both Windows and Production Linux servers
            $baseDir = base_path('lifting_scanner');
            
            if (!file_exists($baseDir)) {
                mkdir($baseDir, 0777, true);
            }
            
            $filePath = $baseDir . DIRECTORY_SEPARATOR . basename($validated['python_script']);
            file_put_contents($filePath, $validated['python_code']);
        }

        return response()->json(['message' => 'Category created successfully', 'category' => $category], 201);
    }

    public function destroy($id)
    {
        $category = ExerciseCategory::find($id);
        if (!$category) {
            return response()->json(['message' => 'Category not found'], 404);
        }

        $category->delete();
        return response()->json(['message' => 'Category deleted successfully']);
    }
}
