import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { Activity, Target, AlertTriangle, Square, ArrowLeft } from 'lucide-react';
import Swal from 'sweetalert2';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './RepCounter.css';
import type { Pose as PoseType, Results } from '@mediapipe/pose';
import type { Camera as CameraType } from '@mediapipe/camera_utils';

const Pose = (window as any).Pose;
const POSE_CONNECTIONS = (window as any).POSE_CONNECTIONS;
const drawConnectors = (window as any).drawConnectors;
const drawLandmarks = (window as any).drawLandmarks;

const backendUrl = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:7001');

interface Category {
  id: number;
  name: string;
  type: string;
  description: string;
}

const RepCounter: React.FC = () => {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);
  
  // State to force re-render for displaying reps on React UI (optional, we draw on canvas mainly)
  const [result, setResult] = useState<any>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const navigate = useNavigate();

  // Refs for tracking
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<CameraType | null>(null);
  const poseRef = useRef<PoseType | null>(null);
  const categoryRef = useRef<string>(''); // Keep track for the callback

  const repsLeft = useRef(0);
  const repsRight = useRef(0);
  const stageLeft = useRef<string>('-');
  const stageRight = useRef<string>('-');

  useEffect(() => {
    fetchCategories();
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      handleStopCamera(); // Cleanup on unmount
    };
  }, []);

  // Update ref when state changes so the callback always has the latest category
  useEffect(() => {
    categoryRef.current = selectedCategory;
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/exercise-categories`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      const repCategories = data.filter((c: Category) => c.type === 'rep_counter');
      setCategories(repCategories);
      if (repCategories.length > 0) {
        setSelectedCategory(repCategories[0].name);
      }
    } catch (err) {
      console.error('Failed to fetch categories', err);
      setCategories([
        { id: 1, name: 'Bicep Curl', type: 'rep_counter', description: '' },
        { id: 2, name: 'Lateral Raise', type: 'rep_counter', description: '' }
      ]);
      setSelectedCategory('Bicep Curl');
    }
  };

  const calculateAngle = (a: any, b: any, c: any) => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) {
      angle = 360.0 - angle;
    }
    return angle;
  };

  const onResults = (results: Results) => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Draw the video frame
    canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

    if (results.poseLandmarks) {
      const landmarks = results.poseLandmarks;
      
      // Get necessary landmarks
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const leftElbow = landmarks[13];
      const rightElbow = landmarks[14];
      const leftWrist = landmarks[15];
      const rightWrist = landmarks[16];
      const leftHip = landmarks[23];
      const rightHip = landmarks[24];

      const currentCategory = categoryRef.current?.toLowerCase() || '';

      if (currentCategory.includes('bicep')) {
        // BICEP CURL LOGIC (Shoulder -> Elbow -> Wrist)
        const angleLeft = calculateAngle(leftShoulder, leftElbow, leftWrist);
        const angleRight = calculateAngle(rightShoulder, rightElbow, rightWrist);

        // Draw Angles at Elbows
        canvasCtx.fillStyle = 'white';
        canvasCtx.font = '24px Arial';
        if (leftElbow.visibility && leftElbow.visibility > 0.7) {
            canvasCtx.fillText(Math.round(angleLeft).toString(), leftElbow.x * canvasRef.current.width, leftElbow.y * canvasRef.current.height);
        }
        if (rightElbow.visibility && rightElbow.visibility > 0.7) {
            canvasCtx.fillText(Math.round(angleRight).toString(), rightElbow.x * canvasRef.current.width, rightElbow.y * canvasRef.current.height);
        }

        // Left Arm logic
        if (leftShoulder.visibility && leftShoulder.visibility > 0.7) {
          if (angleLeft > 160) {
            stageLeft.current = "TURUN";
          }
          if (angleLeft < 35 && stageLeft.current === "TURUN") {
            stageLeft.current = "NAIK";
            repsLeft.current += 1;
          }
        }

        // Right Arm logic
        if (rightShoulder.visibility && rightShoulder.visibility > 0.7) {
          if (angleRight > 160) {
            stageRight.current = "TURUN";
          }
          if (angleRight < 35 && stageRight.current === "TURUN") {
            stageRight.current = "NAIK";
            repsRight.current += 1;
          }
        }

      } else if (currentCategory.includes('lateral')) {
        // LATERAL RAISE LOGIC (Hip -> Shoulder -> Elbow)
        const angleLeft = calculateAngle(leftHip, leftShoulder, leftElbow);
        const angleRight = calculateAngle(rightHip, rightShoulder, rightElbow);

        // Draw Angles at Shoulders or Elbows (We draw near elbow like python did)
        canvasCtx.fillStyle = 'white';
        canvasCtx.font = '24px Arial';
        if (leftElbow.visibility && leftElbow.visibility > 0.7) {
            canvasCtx.fillText(Math.round(angleLeft).toString(), leftElbow.x * canvasRef.current.width, leftElbow.y * canvasRef.current.height);
        }
        if (rightElbow.visibility && rightElbow.visibility > 0.7) {
            canvasCtx.fillText(Math.round(angleRight).toString(), rightElbow.x * canvasRef.current.width, rightElbow.y * canvasRef.current.height);
        }

        // Left Arm logic
        if (leftShoulder.visibility && leftShoulder.visibility > 0.7) {
          if (angleLeft < 30) {
            stageLeft.current = "TURUN";
          }
          if (angleLeft > 75 && stageLeft.current === "TURUN") {
            stageLeft.current = "NAIK";
            repsLeft.current += 1;
          }
        }

        // Right Arm logic
        if (rightShoulder.visibility && rightShoulder.visibility > 0.7) {
          if (angleRight < 30) {
            stageRight.current = "TURUN";
          }
          if (angleRight > 75 && stageRight.current === "TURUN") {
            stageRight.current = "NAIK";
            repsRight.current += 1;
          }
        }
      }

      // Draw Landmarks
      drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#f542e6', lineWidth: 2 });
      drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#f57542', lineWidth: 2, radius: 2 });
    }

    // Draw UI Boxes (Simulating OpenCV putText)
    canvasCtx.fillStyle = 'rgba(245, 117, 22, 0.8)';
    canvasCtx.fillRect(0, 0, 225, 73); // Left box
    canvasCtx.fillRect(canvasRef.current.width - 245, 0, 245, 73); // Right box

    canvasCtx.fillStyle = 'black';
    canvasCtx.font = '14px Arial';
    canvasCtx.fillText('REPS_KIRI', 15, 20);
    canvasCtx.fillText('STAGE', 115, 20);
    
    canvasCtx.fillStyle = 'white';
    canvasCtx.font = 'bold 36px Arial';
    canvasCtx.fillText(repsLeft.current.toString(), 15, 60);
    canvasCtx.font = '20px Arial';
    canvasCtx.fillText(stageLeft.current, 115, 55);

    canvasCtx.fillStyle = 'black';
    canvasCtx.font = '14px Arial';
    canvasCtx.fillText('REPS_KANAN', canvasRef.current.width - 230, 20);
    canvasCtx.fillText('STAGE', canvasRef.current.width - 100, 20);
    
    canvasCtx.fillStyle = 'white';
    canvasCtx.font = 'bold 36px Arial';
    canvasCtx.fillText(repsRight.current.toString(), canvasRef.current.width - 230, 60);
    canvasCtx.font = '20px Arial';
    canvasCtx.fillText(stageRight.current, canvasRef.current.width - 100, 55);

    canvasCtx.restore();

    // Update React state so the summary below the camera updates too
    setResult({
      left_reps: repsLeft.current,
      right_reps: repsRight.current,
      total_reps: repsLeft.current + repsRight.current
    });
  };

  const handleStartCamera = async () => {
    if (!selectedCategory) return;
    
    setError(null);
    setResult(null);
    repsLeft.current = 0;
    repsRight.current = 0;
    stageLeft.current = "-";
    stageRight.current = "-";

    try {
      setIsStarting(true);
      
      // Initialize Mediapipe Pose
      const pose = new Pose({locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }});
      
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      pose.onResults(onResults);
      poseRef.current = pose;

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready before starting loop
        videoRef.current.onloadedmetadata = () => {
            if (canvasRef.current && videoRef.current) {
               canvasRef.current.width = videoRef.current.videoWidth || 640;
               canvasRef.current.height = videoRef.current.videoHeight || 480;
            }
            
            // Start processing loop
            let isRunning = true;
            cameraRef.current = { stop: () => { isRunning = false; } } as any;
            
            const processFrame = async () => {
                if (!isRunning || !videoRef.current || !poseRef.current) return;
                
                try {
                    await poseRef.current.send({ image: videoRef.current });
                } catch(e) {
                    console.error("Pose processing error:", e);
                }
                
                // Keep looping
                requestAnimationFrame(processFrame);
            };
            
            processFrame();
        };
      }

      toast.success('Kamera & AI berhasil dimulai!');
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      setError('Gagal memulai AI Tracker. Pastikan Anda memberi izin kamera.');
      setIsStarting(false);
    }
  };

  const handleStopCamera = async () => {
    // Capture thumbnail right before stopping
    let thumbnailBase64 = null;
    if (canvasRef.current) {
        try {
            thumbnailBase64 = canvasRef.current.toDataURL('image/webp', 0.8);
            // Remove 'data:image/webp;base64,' prefix
            thumbnailBase64 = thumbnailBase64.split(',')[1];
        } catch(e) {
            console.error("Failed to capture thumbnail", e);
        }
    }

    if (cameraRef.current) {
      await cameraRef.current.stop();
      cameraRef.current = null;
    }
    
    // Stop media stream tracks
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    if (poseRef.current) {
      poseRef.current.close();
      poseRef.current = null;
    }
    
    if (repsLeft.current > 0 || repsRight.current > 0) {
        try {
            await fetch(`${backendUrl}/api/rep-counter/save-history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    exercise_type: selectedCategory,
                    left_reps: repsLeft.current,
                    right_reps: repsRight.current,
                    total_reps: repsLeft.current + repsRight.current,
                    language: localStorage.getItem('app_language') || 'id',
                    thumbnail_base64: thumbnailBase64
                })
            });
            toast.success(t('rep_saved') || 'Results saved to history!');
        } catch(e) {
            console.error("Failed to save history", e);
        }
    }

    setIsStarting(false);
    toast.info('Kamera dimatikan.');
  };

  const openMobileCategorySelect = async () => {
    const inputOptions: Record<string, string> = {};
    categories.forEach(cat => {
      inputOptions[cat.name] = cat.name;
    });

    const { value: category } = await Swal.fire({
      title: t('rep_category_label') || 'Select Category',
      input: 'radio',
      inputOptions,
      inputValue: selectedCategory,
      showCancelButton: true,
      confirmButtonText: 'Pilih',
      cancelButtonText: 'Batal',
      background: '#111',
      color: '#fff',
      customClass: {
        popup: 'my-swal-popup',
        confirmButton: 'btn-primary',
        cancelButton: 'btn-secondary',
        input: 'my-swal-radio-container'
      }
    });

    if (category) {
      handleTabClick(category);
    }
  };

  const handleTabClick = (catName: string) => {
    if (!isStarting) {
      setSelectedCategory(catName);
      toast.success(`Kategori diubah ke ${catName}`, { position: 'bottom-right', autoClose: 1500 });
    }
  };

  return (
    <div className="rep-counter-container">
      <ToastContainer theme="dark" />
      <button className="back-button" onClick={() => navigate('/dashboard/services')} title={t('rep_back') || 'Back'}>
        <ArrowLeft size={24} />
      </button>

      <div className="rep-counter-card">
        <div className="card-header">
          <div className="icon-wrapper">
            <Target size={32} />
          </div>
          <div>
            <h1>{t('rep_title')}</h1>
            <p>{t('rep_subtitle')}</p>
          </div>
        </div>

        <div className="card-body">
          <div className="warning-box">
            <AlertTriangle size={24} color="#FFC107" />
            <p>
              <strong>Fitur ini menggunakan AI lokal di browser Anda.</strong> Pastikan wajah dan badan Anda terlihat jelas.
            </p>
          </div>

          <div className="form-group">
            <label className="section-label">{t('rep_category_label')}</label>
            
            {isMobile ? (
              <button 
                className="mobile-category-btn" 
                onClick={openMobileCategorySelect}
                disabled={isStarting}
              >
                {selectedCategory || 'Select Category...'}
              </button>
            ) : (
              <div className="category-tabs">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    className={`category-tab ${selectedCategory === cat.name ? 'active' : ''}`}
                    onClick={() => handleTabClick(cat.name)}
                    disabled={isStarting}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="camera-container" style={{ display: isStarting ? 'block' : 'none', marginTop: '20px', marginBottom: '20px' }}>
            <video 
              ref={videoRef} 
              autoPlay
              playsInline 
              muted
              style={{ display: 'none' }} // Hide video, show only canvas
            />
            <canvas
              ref={canvasRef}
              className="output_canvas"
              style={{ display: 'block', width: '100%', height: 'auto', borderRadius: '12px' }}
            ></canvas>
          </div>

          {result && (
            <div className="result-box">
              <h3>{t('rep_result_title')} ({selectedCategory})</h3>
              <div className="result-stats">
                <div className="stat">
                  <span className="stat-label">{t('rep_left_arm')}</span>
                  <span className="stat-value">{result.left_reps}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">{t('rep_right_arm')}</span>
                  <span className="stat-value">{result.right_reps}</span>
                </div>
                <div className="stat total">
                  <span className="stat-label">{t('rep_total')}</span>
                  <span className="stat-value">{result.total_reps}</span>
                </div>
              </div>
            </div>
          )}

          {isStarting ? (
            <button 
              className="btn-stop-camera"
              onClick={handleStopCamera}
            >
              <Square size={20} fill="currentColor" />
              Hentikan Kamera
            </button>
          ) : (
            <button 
              className="btn-start-camera"
              onClick={handleStartCamera}
              disabled={!selectedCategory}
            >
              <Activity size={20} />
              {t('rep_start')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepCounter;
