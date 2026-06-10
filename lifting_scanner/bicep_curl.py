import cv2
import mediapipe as mp
import numpy as np
import time

# Inisialisasi MediaPipe Pose
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

# Fungsi untuk menghitung sudut dari 3 titik (Bahu, Siku, Pergelangan Tangan)
def calculate_angle(a, b, c):
    a = np.array(a) # Titik Pertama (Bahu)
    b = np.array(b) # Titik Tengah/Engsel (Siku)
    c = np.array(c) # Titik Akhir (Pergelangan Tangan)
    
    # Menghitung radian dan mengonversinya ke derajat
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians*180.0/np.pi)
    
    if angle > 180.0:
        angle = 360 - angle
    
    return angle

# Membuka Web Kamera (Angka 0 biasanya untuk kamera bawaan laptop)
cap = cv2.VideoCapture(0)

# Variabel untuk menghitung repetisi Bicep Curl
counter_left = 0 
counter_right = 0
stage_left = None 
stage_right = None

app_state = "STARTUP" 
start_time = time.time()
countdown_duration = 5 # Mau hitung mundur 5 detik

with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break
        
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image.flags.writeable = False
        results = pose.process(image) # MediaPipe tetap jalan biar bisa gambar kerangka
        image.flags.writeable = True
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        
        # startup
        if app_state == "STARTUP":
            # Hitung berapa detik yang sudah berlalu
            elapsed_time = time.time() - start_time
            remaining_time = countdown_duration - int(elapsed_time)
            
            if remaining_time > 0:
                # Bikin layar agak gelap (opsional, biar teksnya jelas)
                cv2.rectangle(image, (0, 0), (640, 480), (0, 0, 0), 1) # border tipis, atau ganti -1 + cv2.addWeighted untuk transparan
                
                # Tampilkan instruksi persiapan
                cv2.putText(image, "SIAP-SIAP LE!", (170, 150), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 255), 3, cv2.LINE_AA)
                cv2.putText(image, "- Taruh kamera di depan badan", (120, 220), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2, cv2.LINE_AA)
                cv2.putText(image, "- Mundur sampai seluruh tangan terlihat", (60, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2, cv2.LINE_AA)
                
                # Tampilkan angka hitung mundur raksasa di tengah
                cv2.putText(image, str(remaining_time), (280, 380), cv2.FONT_HERSHEY_SIMPLEX, 4, (0, 0, 255), 5, cv2.LINE_AA)
            else:
                # Waktu habis! Pindah state ke TRACKING
                app_state = "TRACKING"

        # STATE: TRACKING 
        elif app_state == "TRACKING":
        
        # Mengambil kordinat (Landmarks)
            try:
                landmarks = results.pose_landmarks.landmark
                
                # Mengambil titik untuk Lengan Kiri
                # 11 = Bahu Kiri, 13 = Siku Kiri, 15 = Pergelangan Tangan Kiri
                # shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
                            # ,landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].z]
                            
                
                # right_elbow = [landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].y]
                        #  ,landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].z]
                # print("nilai elbow : ", elbow)
                
                # right_wrist = [landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].y]
                        #  ,landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].z]
                # z_wrist = landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].z
                # print("nilai z wrist : ", wrist.z)
                # print("nilai wrist : ", wrist)            
                
                right_shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y
                left_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y
                # print("nilai shoulder : ", shoulder)
                left_elbow_x = landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].x
                left_elbow_y = landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].y
                left_elbow_z = landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].z
                
                right_elbow_x = landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].x
                right_elbow_y = landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].y
                right_elbow_z = landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].z
                
                left_wrist_x = landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x
                left_wrist_y = landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y
                left_wrist_z = landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].z
                
                right_wrist_x = landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].x
                right_wrist_y = landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].y
                right_wrist_z = landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].z
                
                left_shoulder_vis = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].visibility
                left_elbow_vis = landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].visibility
                left_wrist_vis = landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].visibility
                
                right_shoulder_vis = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].visibility
                right_elbow_vis = landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].visibility
                right_wrist_vis = landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].visibility
                
                elbow_left = [left_elbow_x, left_elbow_y]
                wrist_left = [left_wrist_x, left_wrist_y]
                elbow_right = [right_elbow_x, right_elbow_y]
                wrist_right = [right_wrist_x, right_wrist_y]
                
                # KORDINAT TELAPAK TANGAN
                
            
                
                # KOMPUTASI KIRI ----------------------------------------------------------
                # Menghitung sudut
                angle_left = calculate_angle(left_shoulder, elbow_left, wrist_left)
                # print("nilai angle : ", angle)
                
                # Menampilkan angka sudut langsung di atas siku
                cv2.putText(image, str(int(angle_left)), 
                            tuple(np.multiply(elbow_left, [640, 480]).astype(int)), 
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2, cv2.LINE_AA
                                    )
                
                # KOMPUTASI KANAN ----------------------------------------------------------
                # Menghitung sudut
                angle_right = calculate_angle(right_shoulder, elbow_right, wrist_right)
                # print("nilai angle kanan : ", angle_right)
                
                # Menampilkan angka sudut langsung di atas siku
                cv2.putText(image, str(int(angle_right)), 
                            tuple(np.multiply(elbow_right, [640, 480]).astype(int)), 
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2, cv2.LINE_AA
                                    )
                
                shoulder_width = abs(left_shoulder[0] - right_shoulder[0])
                is_wobbling_left = False
                is_wobbling_right = False
                
                if shoulder_width > 0.15: #ngadep depan
                    # print("ngadep depan")
                    diff_x_left = abs(left_elbow_x - left_wrist_x)
                    diff_x_right = abs(right_elbow_x - right_wrist_x)
                    # print("nilai diff x right : ", diff_x_right)
                    if diff_x_left > 0.1:
                        is_wobbling_left = True
                    if diff_x_right > 0.1:
                        is_wobbling_right = True
                        # print("nilai diff x right : ", diff_x_right)
                else : 
                    # print("ngadep samping")
                    diff_z_left = abs(left_elbow_z - left_wrist_z)
                    diff_z_right = abs(right_elbow_z - right_wrist_z)
                    # print("nilai diff z right : ", diff_z_right)
                    if diff_z_left > 0.3:
                        is_wobbling_left = True
                    if diff_z_right > 0.3:
                        is_wobbling_right = True
                        # print("nilai diff z right : ", diff_z_right)

                
                if left_shoulder_vis > 0.7 or left_elbow_vis > 0.7 or left_wrist_vis > 0.7:
                    if is_wobbling_left:
                        cv2.putText(image, "Tangan Kiri lurusin Le", (50, 100),
                                    cv2. FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1, cv2.LINE_AA)
                    # Logika Penghitung Bicep Curl
                    if angle_left > 169:
                        stage_left = "TURUN"
                    if angle_left < 35 and stage_left == "TURUN":
                        stage_left = "NAIK"
                        counter_left += 1
                # else :
                #     print("Tangan Kiri lu mana wok")
                
                # shoulder_width_right = abs(right_shoulder[0] - left_shoulder[0])
                # is_wobbling_right = False
                
                # if shoulder_width_right > 0.15: #ngadep depan
                #     print("ngadep depan")
                #     diff_x = abs(right_elbow_x - right_wrist_x)
                #     if diff_x > 0.22:
                #         is_wobbling_right = True
                # else : 
                #     print("ngadep samping")
                #     diff_z = abs(right_elbow_z - right_wrist_z)
                #     if diff_z > 0.5:
                #         is_wobbling_right = True
                                    
                if right_shoulder_vis > 0.7 or right_elbow_vis > 0.7 or right_wrist_vis > 0.7:
                    if is_wobbling_right:
                        cv2.putText(image, "Tangan Kanan lurusin Le", (350, 100),
                                    cv2. FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1, cv2.LINE_AA)
                    # Logika Penghitung Bicep Curl
                    if angle_right > 169:
                        stage_right = "TURUN"
                    if angle_right < 35 and stage_right == "TURUN":
                        stage_right = "NAIK"
                        counter_right += 1
                # else : 
                #     print("tangan kanan lu mana wok")
                #     pass

            except Exception as e:
                # print(f"Error occurred: {e}")
                pass # Abaikan jika tidak ada badan yang terdeteksi
        
        
            # Membuat kotak UI untuk menampilkan status di layar
            #cv2.rectangle(kanvas, titik_awal, titik_akhir, warna_BGR, ketebalan)
            cv2.rectangle(image, (0,0), (225,73), (245,117,16), -1)
            cv2.rectangle(image, (425,0), (670,73), (245,117,16), -1) #kanan
            
            # cv2.putText(kanvas, teks, posisi_koordinat, jenis_font, ukuran_font, warna, ketebalan, jenis_garis)
            # Menampilkan Repetisi (kiri)
            cv2.putText(image, 'REPS_KIRI', (15,12), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,0,0), 1, cv2.LINE_AA)
            cv2.putText(image, str(counter_left), 
                        (10,60), 
                        cv2.FONT_HERSHEY_SIMPLEX, 2, (255,255,255), 2, cv2.LINE_AA)
            # Menampilkan Status Gerakan (Naik/Turun)
            cv2.putText(image, 'STAGE', (65,12), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,0,0), 1, cv2.LINE_AA)
            cv2.putText(image, stage_left, 
                        (60,60), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,255), 1, cv2.LINE_AA)
            
            # Menampilkan Repetisi (kanan)
            cv2.putText(image, 'REPS_KANAN', (400,12), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,0,0), 1, cv2.LINE_AA)
            cv2.putText(image, str(counter_right), 
                        (400,60), 
                        cv2.FONT_HERSHEY_SIMPLEX, 2, (255,255,255), 2, cv2.LINE_AA)
            cv2.putText(image, 'STAGE', (440,12), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,0,0), 1, cv2.LINE_AA)
            cv2.putText(image, stage_right, 
                        (440,60), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,255), 1, cv2.LINE_AA)

        # Menggambar kerangka di atas badan pengguna
        mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS,
                                mp_drawing.DrawingSpec(color=(245,117,66), thickness=2, circle_radius=2), 
                                mp_drawing.DrawingSpec(color=(245,66,230), thickness=2, circle_radius=2) 
                                 )               
        
        # Menampilkan video ke layar
        cv2.imshow('Lifting Scanner - Bicep Curl', image)

        # Tekan tombol 'q' di keyboard untuk keluar dari aplikasi
        if cv2.waitKey(10) & 0xFF == ord('q'):
            break

cap.release()
cv2.destroyAllWindows()

# .\env\Scripts\Activate.ps1