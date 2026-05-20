<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AnalysisHistory extends Model
{
    use HasFactory;

    protected $table = 'analysis_history';

    protected $fillable = [
        'user_id',
        'video_path',
        'exercise_type',
        'ai_feedback',
        'score',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
