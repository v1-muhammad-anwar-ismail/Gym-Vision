import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UploadCloud, FileVideo, X, Activity, Play, AlertCircle, Cpu, Camera, Video, Square } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import './Analysis.css';

const backendUrl = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:7001');
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk

interface AiConfig {
  id: number;
  provider: string;
  model: string;
}

const Analysis: React.FC = () => {
  const { t, lang } = useLanguage();
  const token = localStorage.getItem('auth_token');
  
  const [exerciseType, setExerciseType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [aiConfigs, setAiConfigs] = useState<AiConfig[]>([]);
  const [aiConfigId, setAiConfigId] = useState<string>('');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'processing'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Camera Feature States & Refs ---
  const [inputMode, setInputMode] = useState<'upload' | 'camera'>('upload');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const resultSectionRef = useRef<HTMLDivElement>(null);

  // Memoize the video object URL so it only changes when `file` changes,
  // not on every re-render (prevents video flickering on input typing)
  const videoUrl = useMemo(() => {
    if (file) return URL.createObjectURL(file);
    return null;
  }, [file]);

  // Auto-scroll to result section when analysis completes
  useEffect(() => {
    if (result && !isAnalyzing && resultSectionRef.current) {
      setTimeout(() => {
        resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [result, isAnalyzing]);

  useEffect(() => {
    // Fetch active AI configs for the dropdown
    const fetchAiConfigs = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/ai-configs/active`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setAiConfigs(data);
          if (data.length > 0) {
            setAiConfigId(data[0].id.toString());
          }
        }
      } catch (err) {
        console.error('Failed to fetch AI configs', err);
      }
    };
    
    if (token) {
      fetchAiConfigs();
    }

    // Cleanup camera on unmount
    return () => {
      stopCamera();
    };
  }, [token]);

  // --- Camera Logic ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
      setError(null);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Failed to access camera. Please ensure you have granted permission.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
  };

  const toggleInputMode = (mode: 'upload' | 'camera') => {
    if (isRecording || isAnalyzing) return;
    setInputMode(mode);
    setFile(null); // clear existing file
    setResult(null);
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    
    chunksRef.current = [];
    
    // Try to record in mp4, fallback to webm
    let options = { mimeType: 'video/mp4' };
    if (!MediaRecorder.isTypeSupported('video/mp4')) {
      options = { mimeType: 'video/webm' };
    }

    try {
      const recorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        clearInterval(timerRef.current!);
        // Create file from chunks
        const blob = new Blob(chunksRef.current, { type: options.mimeType });
        const ext = options.mimeType.includes('mp4') ? 'mp4' : 'webm';
        const newFile = new File([blob], `recording_${Date.now()}.${ext}`, { type: options.mimeType });
        
        // Stop camera and set the recorded file as the active file
        stopCamera();
        setFile(newFile);
        setIsRecording(false); // Safety net to ensure recording state clears
        setInputMode('upload'); // Switch back to upload view to show the recorded file ready for analysis
      };

      recorder.start(1000); // collect chunks every second
      setIsRecording(true);
      setRecordingTime(0);
      
      // Max 2 minutes timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 119) {
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (err) {
      console.error("MediaRecorder error:", err);
      setError("Failed to start recording. Format might not be supported.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // --- Upload Logic ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndSetFile = async (selectedFile: File) => {
    // ONLY ACCEPT MP4
    if (!selectedFile.type.startsWith('video/mp4') && !selectedFile.name.toLowerCase().endsWith('.mp4')) {
      setError(t('an_invalid_file') || 'Please upload a valid MP4 video file (.mp4). For other formats, use the camera feature.');
      return;
    }

    // Check duration
    const checkDuration = new Promise<boolean>((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration <= 120); // 2 minutes
      };
      video.onerror = () => resolve(true); // Skip validation if format unreadable
      video.src = URL.createObjectURL(selectedFile);
    });

    const isDurationValid = await checkDuration;
    if (!isDurationValid) {
      setError(t('an_max_duration_err'));
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await validateAndSetFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    if (!aiConfigId) {
      setError(t('an_err_select_ai'));
      return;
    }
    
    setIsAnalyzing(true);
    setUploadProgress(0);
    setUploadPhase('uploading');
    setError(null);
    setResult(null);

    try {
      if (file.size > CHUNK_SIZE) {
        // --- CHUNKED UPLOAD ---
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const uploadId = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 8);

        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const start = chunkIndex * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          const formData = new FormData();
          formData.append('chunk', chunk, file.name);
          formData.append('chunk_index', chunkIndex.toString());
          formData.append('total_chunks', totalChunks.toString());
          formData.append('upload_id', uploadId);
          formData.append('original_name', file.name);

          const res = await fetch(`${backendUrl}/api/analyze/upload-chunk`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Chunk upload failed at part ${chunkIndex + 1}`);
          }

          setUploadProgress(Math.round(((chunkIndex + 1) / totalChunks) * 100));
        }

        // All chunks uploaded, now trigger analysis
        setUploadPhase('processing');

        const analyzeRes = await fetch(`${backendUrl}/api/analyze/process`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            upload_id: uploadId,
            exercise_type: exerciseType || 'General Workout',
            original_name: file.name,
            ai_config_id: aiConfigId,
            language: lang
          }),
        });

        const data = await analyzeRes.json();
        if (!analyzeRes.ok) {
          throw new Error(data.error || 'Analysis failed.');
        }

        setResult(data.data);
      } else {
        // --- SINGLE UPLOAD (small file) via XHR for progress ---
        await new Promise<void>((resolve, reject) => {
          const formData = new FormData();
          formData.append('video', file);
          formData.append('exercise_type', exerciseType || 'General Workout');
          formData.append('ai_config_id', aiConfigId);
          formData.append('language', lang);

          const xhr = new XMLHttpRequest();
          
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              setUploadProgress(Math.round((event.loaded / event.total) * 100));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                setUploadPhase('processing');
                setResult(data.data);
                resolve();
              } catch {
                reject(new Error('Error parsing response.'));
              }
            } else {
              try {
                const data = JSON.parse(xhr.responseText);
                reject(new Error(data.error || data.message || 'Server error.'));
              } catch {
                reject(new Error('Server error (Status ' + xhr.status + ').'));
              }
            }
          };

          xhr.onerror = () => reject(new Error('Network error. Check server connection.'));

          xhr.open('POST', `${backendUrl}/api/analyze`, true);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.send(formData);
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
      setUploadPhase('idle');
    }
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 80) return 'good';
    if (score >= 60) return 'average';
    return 'poor';
  };

  const getScoreText = (score: number) => {
    if (score >= 80) return t('an_score_good');
    if (score >= 60) return t('an_score_avg');
    return t('an_score_poor');
  };

  const translateCvKey = (key: string, lang: string) => {
    let result = key.replace(/_/g, ' ').toUpperCase();
    if (lang === 'id') {
      result = result.replace('LEFT SHOULDER', 'BAHU KIRI');
      result = result.replace('RIGHT SHOULDER', 'BAHU KANAN');
      result = result.replace('LEFT ELBOW', 'SIKU KIRI');
      result = result.replace('RIGHT ELBOW', 'SIKU KANAN');
      result = result.replace('LEFT HIP', 'PINGGUL KIRI');
      result = result.replace('RIGHT HIP', 'PINGGUL KANAN');
      result = result.replace('LEFT KNEE', 'LUTUT KIRI');
      result = result.replace('RIGHT KNEE', 'LUTUT KANAN');
      result = result.replace('LEFT WRIST', 'PERGELANGAN TANGAN KIRI');
      result = result.replace('RIGHT WRIST', 'PERGELANGAN TANGAN KANAN');
      result = result.replace('LEFT ANKLE', 'PERGELANGAN KAKI KIRI');
      result = result.replace('RIGHT ANKLE', 'PERGELANGAN KAKI KANAN');
      result = result.replace('MAX', 'MAKS');
      result = result.replace('ROM', 'RENTANG GERAK');
    }
    return result;
  };

  const resetAnalysis = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setUploadProgress(0);
    setExerciseType('');
    if (inputMode === 'camera') {
        startCamera();
    }
  };

  return (
    <div className="analysis-page">
      <div className="analysis-header">
        <h2>
          <Activity size={28} color="var(--primary-neon)" />
          {t('an_title')}
        </h2>
        <p>{t('an_subtitle')}</p>
      </div>
      
      {error && (
        <div className="analysis-alert error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}
      
      <div className="analysis-content">
        {/* Left Col: Upload/Record Form */}
        <div className="analysis-card">
          
          <div className="form-group">
            <label>{t('an_ai_provider') || 'Model AI'}</label>
            <button
              type="button"
              className="analysis-input ai-selector-btn"
              onClick={() => setIsAiModalOpen(true)}
              disabled={isAnalyzing || aiConfigs.length === 0}
            >
              {aiConfigs.length === 0 ? (
                'Tidak ada AI yang aktif (hubungi admin)'
              ) : (
                aiConfigs.find(c => c.id.toString() === aiConfigId)?.model || 'Pilih Model AI'
              )}
            </button>
          </div>

          <div className="form-group">
            <label>{t('an_exercise_type')}</label>
            <input 
              type="text"
              className="analysis-input"
              placeholder={t('an_exercise_placeholder')}
              value={exerciseType}
              onChange={(e) => setExerciseType(e.target.value)}
              disabled={isAnalyzing}
            />
          </div>
          
          <div className="form-group">
            <label>Input Method</label>
            <div className="input-mode-tabs">
              <button 
                className={`tab-btn ${inputMode === 'upload' ? 'active' : ''}`}
                onClick={() => toggleInputMode('upload')}
                disabled={isRecording || isAnalyzing}
              >
                <UploadCloud size={18} /> Upload Video
              </button>
              <button 
                className={`tab-btn ${inputMode === 'camera' ? 'active' : ''}`}
                onClick={() => toggleInputMode('camera')}
                disabled={isRecording || isAnalyzing}
              >
                <Camera size={18} /> Record Camera
              </button>
            </div>
            
            {/* UPLOAD MODE */}
            {inputMode === 'upload' && (
              <>
                <div 
                  className={`upload-dropzone ${isDragging ? 'drag-active' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="file-input" 
                    accept="video/mp4,.mp4"
                    onChange={handleFileChange}
                    disabled={isAnalyzing}
                  />
                  <UploadCloud size={48} className="upload-icon" />
                  <p>{t('an_upload_desc') || 'Drag & drop an MP4 file here, or click to browse'}</p>
                  <span className="upload-hint">
                    Supports strictly MP4 only (Max 2GB) <br/>
                    <span style={{ color: 'var(--primary-neon)', fontWeight: 500 }}>
                      {t('an_max_duration_hint')}
                    </span>
                  </span>
                </div>
                
                {file && (
                  <div className="selected-file">
                    <div className="file-info">
                      <FileVideo size={20} color="var(--primary-neon)" />
                      <div>
                        <div className="file-name">{file.name}</div>
                        <div className="file-size">
                          {file.size >= 1073741824 
                            ? (file.size / 1073741824).toFixed(2) + ' GB'
                            : (file.size / (1024 * 1024)).toFixed(2) + ' MB'}
                        </div>
                      </div>
                    </div>
                    {!isAnalyzing && (
                      <button className="btn-remove-file" onClick={() => { setFile(null); setResult(null); }}>
                        <X size={18} />
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* CAMERA MODE */}
            {inputMode === 'camera' && (
              <div className="camera-container">
                <div className="camera-preview-wrapper">
                  <video 
                    ref={liveVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className={`live-video ${!isCameraActive ? 'hidden' : ''}`} 
                  />
                  {!isCameraActive && !error && (
                    <div className="camera-placeholder">
                      <Video size={40} opacity={0.5} />
                      <p>Requesting camera access...</p>
                    </div>
                  )}
                  {isRecording && (
                    <div className="recording-indicator">
                      <span className="recording-dot"></span>
                      {formatTime(recordingTime)} / 02:00
                    </div>
                  )}
                </div>
                
                {isCameraActive && (
                  <div className="camera-controls">
                    {!isRecording ? (
                      <button className="btn-record start" onClick={startRecording}>
                        <div className="record-circle"></div>
                        Start Recording
                      </button>
                    ) : (
                      <button className="btn-record stop" onClick={stopRecording}>
                        <Square size={16} fill="currentColor" />
                        Stop Recording
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <button 
            className="btn-analyze"
            onClick={handleAnalyze}
            disabled={!file || isAnalyzing || exerciseType.trim() === '' || !aiConfigId || isRecording}
          >
            {isAnalyzing 
              ? (uploadPhase === 'uploading'
                  ? `${t('an_uploading')} ${uploadProgress}%`
                  : t('an_analyzing'))
              : t('an_analyze_btn')}
          </button>
          
          {/* Upload Progress Bar */}
          {isAnalyzing && uploadPhase === 'uploading' && (
            <>
              <div className="upload-progress-bar">
                <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <div className="upload-progress-text">
                {uploadProgress}% — {file && file.size > CHUNK_SIZE ? `${t('an_chunk_upload')} (${Math.ceil(file.size / CHUNK_SIZE)} parts)` : t('an_uploading')}
              </div>
            </>
          )}

          {/* New Analysis Button */}
          {result && !isAnalyzing && (
            <button 
              className="btn-analyze" 
              onClick={resetAnalysis}
              style={{ background: 'transparent', border: '1px solid var(--primary-neon)', color: 'var(--primary-neon)', marginTop: '12px' }}
            >
              {t('an_new_analysis')}
            </button>
          )}
        </div>

        {/* Right Col: Result or Loading */}
        <div ref={resultSectionRef}>
          {isAnalyzing && uploadPhase === 'processing' && (
            <div className="analysis-card analysis-loading">
              <div className="scan-line-container">
                <div className="scan-line"></div>
                <Activity size={48} color="var(--primary-neon)" opacity={0.3} />
              </div>
              <h3>{t('an_analyzing')}</h3>
              <p>{t('an_analyzing_desc')}</p>
            </div>
          )}

          {isAnalyzing && uploadPhase === 'uploading' && (
            <div className="analysis-card analysis-loading">
              <div className="scan-line-container">
                <div className="scan-line"></div>
                <UploadCloud size={48} color="var(--primary-neon)" opacity={0.3} />
              </div>
              <h3>{t('an_uploading')} {uploadProgress}%</h3>
              <p>{file && file.size > CHUNK_SIZE 
                ? `Uploading in chunks (${Math.ceil(file.size / CHUNK_SIZE)} parts)...` 
                : t('an_analyzing_desc')}</p>
            </div>
          )}
          
          {result && !isAnalyzing && (
            <div className="analysis-result-card">
              <div className="analysis-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="result-video-container">
                    {videoUrl && (
                      <video 
                        className="result-video" 
                        controls 
                        src={videoUrl} 
                      />
                    )}
                </div>
              </div>
              
              <div className="analysis-card">
                <div className="score-circle-container">
                  <div className={`score-circle ${getScoreColorClass(result.history.score)}`}>
                    {result.history.score}
                  </div>
                  <div className="score-text">
                    <h4>{getScoreText(result.history.score)}</h4>
                    <p>{t('an_score')} (0-100)</p>
                  </div>
                </div>
                
                <div className="ai-feedback-box" style={{ marginTop: '24px' }}>
                  <div className="ai-feedback-header">
                    <Activity size={18} /> {t('an_feedback')}
                  </div>
                  <pre className="ai-feedback-content">
                    {result.history.ai_feedback}
                  </pre>
                  
                  {result.cv_data && Object.keys(result.cv_data).length > 0 && (
                    <div className="cv-data-grid">
                      {Object.entries(result.cv_data).map(([key, value]) => (
                        <div className="cv-stat" key={key}>
                          <span className="cv-stat-label">{translateCvKey(key, lang)}</span>
                          <span className="cv-stat-value">
                            {String(value)}{key.toLowerCase().includes('frames') ? '' : '°'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {!result && !isAnalyzing && (
            <div className="analysis-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', opacity: 0.5, textAlign: 'center' }}>
              <Play size={48} style={{ marginBottom: '16px' }} />
              <p>{t('an_placeholder')}</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Selection Modal */}
      {isAiModalOpen && (
        <div className="ai-modal-overlay" onClick={() => setIsAiModalOpen(false)}>
          <div className="ai-modal-content" onClick={e => e.stopPropagation()}>
            <div className="ai-modal-header">
              <h3><Cpu size={20} /> {t('an_select_ai')}</h3>
              <button className="btn-close-modal" onClick={() => setIsAiModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <p className="ai-modal-desc">{t('an_select_ai_desc')}</p>
            
            <div className="ai-radio-group">
              {aiConfigs.map(config => (
                <label 
                  key={config.id} 
                  className={`ai-radio-label ${aiConfigId === config.id.toString() ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="ai_model"
                    value={config.id}
                    checked={aiConfigId === config.id.toString()}
                    onChange={(e) => {
                      setAiConfigId(e.target.value);
                      setIsAiModalOpen(false);
                    }}
                    className="ai-radio-input"
                  />
                  <div className="ai-radio-content">
                    <div className="ai-radio-model">{config.model}</div>
                    <div className="ai-radio-provider">{config.provider}</div>
                  </div>
                  <div className="ai-radio-indicator"></div>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analysis;
