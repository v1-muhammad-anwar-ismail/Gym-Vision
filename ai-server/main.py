from fastapi import FastAPI, HTTPException
import uvicorn
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
import requests
import json
import urllib.request

load_dotenv()
PORT = int(os.getenv("PORT", 7002))

app = FastAPI(title="GymVision AI Server")

class AnalysisRequest(BaseModel):
    video_path: str
    exercise_type: str
    provider: str = "OpenRouter"
    model: str = "deepseek/deepseek-chat"
    api_key: str = ""
    base_url: str = "https://openrouter.ai/api/v1"
    language: str = "id"

# Download MediaPipe model if not exists
MODEL_PATH = 'pose_landmarker_lite.task'
MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
if not os.path.exists(MODEL_PATH):
    print("Downloading MediaPipe Pose model...")
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)

def calculate_angle(a, b, c):
    a = np.array(a) # First
    b = np.array(b) # Mid
    c = np.array(c) # End
    
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians*180.0/np.pi)
    
    if angle > 180.0:
        angle = 360 - angle
        
    return angle

def analyze_video_cv(video_path, exercise_type):
    if not os.path.exists(video_path):
        raise ValueError(f"Video file not found at path: {video_path}")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Failed to open video at path: {video_path}")
    
    # ============================================================
    # Track ALL major joint angles for comprehensive fitness analysis
    # BlazePose Landmark Indices:
    #   11/12: L/R Shoulder   13/14: L/R Elbow    15/16: L/R Wrist
    #   23/24: L/R Hip        25/26: L/R Knee     27/28: L/R Ankle
    # ============================================================
    
    # Define all joints to track: (name, point_a, point_b_vertex, point_c)
    joint_definitions = {
        # Upper body
        "left_shoulder":  (23, 11, 13),  # hip-shoulder-elbow
        "right_shoulder": (24, 12, 14),
        "left_elbow":     (11, 13, 15),  # shoulder-elbow-wrist
        "right_elbow":    (12, 14, 16),
        # Core / Trunk
        "left_hip":       (11, 23, 25),  # shoulder-hip-knee
        "right_hip":      (12, 24, 26),
        # Lower body
        "left_knee":      (23, 25, 27),  # hip-knee-ankle
        "right_knee":     (24, 26, 28),
    }
    
    # Initialize trackers: min, max for each joint
    joint_data = {name: {"min": 180.0, "max": 0.0} for name in joint_definitions}
    frame_count = 0
    
    base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO)
        
    with vision.PoseLandmarker.create_from_options(options) as landmarker:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            timestamp_ms = int(cap.get(cv2.CAP_PROP_POS_MSEC))
            if timestamp_ms < 0:
                continue
                
            image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image)
            
            results = landmarker.detect_for_video(mp_image, timestamp_ms)
            
            if results.pose_landmarks and len(results.pose_landmarks) > 0:
                landmarks = results.pose_landmarks[0]
                frame_count += 1
                
                for name, (idx_a, idx_b, idx_c) in joint_definitions.items():
                    a = [landmarks[idx_a].x, landmarks[idx_a].y]
                    b = [landmarks[idx_b].x, landmarks[idx_b].y]
                    c = [landmarks[idx_c].x, landmarks[idx_c].y]
                    
                    angle = calculate_angle(a, b, c)
                    if angle < joint_data[name]["min"]:
                        joint_data[name]["min"] = angle
                    if angle > joint_data[name]["max"]:
                        joint_data[name]["max"] = angle
                    
    cap.release()
    
    # Build comprehensive result with ROM (Range of Motion)
    cv_result = {}
    for name, data in joint_data.items():
        label = name.replace("_", " ").title()
        cv_result[f"{label} Min"] = round(data["min"], 1)
        cv_result[f"{label} Max"] = round(data["max"], 1)
        cv_result[f"{label} ROM"] = round(data["max"] - data["min"], 1)
    
    cv_result["frames_analyzed"] = frame_count
    
    return cv_result

def call_ai_api(req: AnalysisRequest, cv_data: dict):
    # Build readable data string, excluding frames_analyzed from the angle list
    angle_lines = []
    for k, v in cv_data.items():
        if k == "frames_analyzed":
            continue
        angle_lines.append(f"    - {k}: {v}°")
    cv_str = "\n".join(angle_lines)
    
    # Determine feedback language
    lang_name = "Indonesian (Bahasa Indonesia)" if req.language == "id" else "English"
    
    prompt = f"""You are an expert AI Fitness Coach and Biomechanics Analyst. 
A user just recorded themselves performing: "{req.exercise_type}".
Computer vision (MediaPipe Pose) has tracked 8 major joints across {cv_data.get('frames_analyzed', 'N/A')} video frames and extracted the following kinematic data (Min angle, Max angle, and Range of Motion for each joint on both sides):

{cv_str}

ANALYSIS INSTRUCTIONS:
1. Translate this raw data into human-friendly advice. Do NOT quote exact numbers or use technical terms like "ROM 176,5°" as this confuses normal users.
2. Tell the user whether their movement was correct/good based on the symmetry and range of motion.
3. Provide practical, actionable tips and solutions for their next set (e.g., "Keep your back straight", "Lower the dumbbells further down", "Make sure both arms move at the same speed").
4. Keep the tone encouraging, conversational, and acting like a professional personal trainer.
5. Provide the feedback in {lang_name}, max 3-4 sentences.

Provide your response as a JSON object with exactly these keys:
- "feedback": The conversational feedback string based on the above instructions.
- "score": An integer 0-100 representing overall form quality.

Return ONLY the raw JSON object. No markdown, no code blocks, no extra text."""
    
    is_gemini = "generativelanguage.googleapis.com" in req.base_url or "gemini" in req.provider.lower() or "google" in req.provider.lower()
    
    try:
        if is_gemini:
            # Smart Gemini URL construction
            base = req.base_url.rstrip('/')
            # Remove trailing path components if user included them
            if '/v1beta' in base or '/v1/' in base:
                base = base.split('/v1')[0]
            
            # Try v1beta first (most models), fallback to v1
            url = f"{base}/v1beta/models/{req.model}:generateContent?key={req.api_key}"
            payload = {
                "contents": [{"parts":[{"text": prompt}]}]
            }
            headers = {"Content-Type": "application/json"}
            res = requests.post(url, json=payload, headers=headers, timeout=120)
            
            # If v1beta fails with 404, try v1
            if res.status_code == 404:
                print(f"Gemini v1beta 404, trying v1...")
                url = f"{base}/v1/models/{req.model}:generateContent?key={req.api_key}"
                res = requests.post(url, json=payload, headers=headers, timeout=120)
            
            if not res.ok:
                error_detail = res.text[:300] if res.text else f"HTTP {res.status_code}"
                print(f"Gemini API Error ({res.status_code}): {error_detail}")
                return {"feedback": f"Gemini API Error ({res.status_code}): Model '{req.model}' mungkin tidak tersedia. Coba gunakan model lain seperti 'gemini-2.0-flash'.", "score": 0}
            
            data = res.json()
            text_response = data['candidates'][0]['content']['parts'][0]['text']
        else:
            url = f"{req.base_url}/chat/completions"
            payload = {
                "model": req.model,
                "messages": [{"role": "user", "content": prompt}]
            }
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {req.api_key}"
            }
            res = requests.post(url, json=payload, headers=headers, timeout=120)
            
            if not res.ok:
                error_detail = res.text[:300] if res.text else f"HTTP {res.status_code}"
                print(f"API Error ({res.status_code}): {error_detail}")
                return {"feedback": f"API Error ({res.status_code}): Pastikan API Key dan model '{req.model}' valid.", "score": 0}
            
            data = res.json()
            text_response = data['choices'][0]['message']['content']
            
        try:
            clean_text = text_response.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.startswith("```"):
                clean_text = clean_text[3:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            clean_text = clean_text.strip()
            
            result = json.loads(clean_text)
            return result
        except Exception as parse_e:
            print("JSON Parse Error:", parse_e)
            return {"feedback": text_response, "score": 80}
            
    except requests.exceptions.Timeout:
        print("API Timeout Error")
        return {"feedback": f"Timeout: API {req.provider} tidak merespons dalam 120 detik. Coba lagi.", "score": 0}
    except Exception as e:
        print(f"API Error: {str(e)}")
        return {"feedback": f"Gagal menghubungi API {req.provider}: {str(e)}", "score": 0}

@app.get("/")
def read_root():
    return {"status": "ok", "message": "GymVision AI Server is running"}

@app.post("/analyze")
def analyze_video(req: AnalysisRequest):
    try:
        # 1. Computer Vision Processing
        cv_data = analyze_video_cv(req.video_path, req.exercise_type)
        
        # 2. Call LLM API with the extracted data
        ai_result = call_ai_api(req, cv_data)
        
        return {
            "status": "success",
            "exercise_type": req.exercise_type,
            "video_path": req.video_path,
            "cv_data": cv_data,
            "ai_feedback": ai_result.get("feedback", "Analisis selesai."),
            "score": ai_result.get("score", 85)
        }
    except Exception as e:
        print(f"Analyze Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
