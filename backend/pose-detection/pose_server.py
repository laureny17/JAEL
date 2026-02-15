import cv2
import mediapipe as mp
import numpy as np
from flask import Flask, Response, jsonify
import time
import threading

app = Flask(__name__)

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    smooth_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)
mp_drawing = mp.solutions.drawing_utils

# Global variable to store the latest pose data
current_pose_data = {
    "time": 0,
    "pose": {
        "leftShoulderAngle": 0,
        "rightShoulderAngle": 0,
        "leftElbowAngle": 180,
        "rightElbowAngle": 180,
        "leftHandShape": "open",
        "rightHandShape": "open",
        "leftFoot": "M",
        "rightFoot": "M"
    }
}

# Global variable for video frame
output_frame = None
lock = threading.Lock()

def calculate_angle(a, b, c):
    """
    Calculates the angle at point b formed by points a and c.
    a, b, c are arrays/lists of [x, y].
    Returns angle in degrees.
    """
    a = np.array(a) # First point
    b = np.array(b) # Vertex point
    c = np.array(c) # End point
    
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    
    if angle > 180.0:
        angle = 360 - angle
        
    return angle

def calculate_shoulder_angle(shoulder, elbow, hip):
    """
    Calculates the shoulder angle relative to the torso line.
    0 = arm hanging at side (aligned with torso)
    90 = arm horizontal
    180 = arm straight overhead
    """
    # Vector for torso (shoulder to hip)
    # Vector for arm (shoulder to elbow)
    
    # We want the angle between the vector (shoulder->hip) and (shoulder->elbow)
    return calculate_angle(hip, shoulder, elbow)

def process_webcam():
    global output_frame, current_pose_data
    
    cap = cv2.VideoCapture(0)
    start_time = time.time()
    
    while True:
        success, frame = cap.read()
        if not success:
            continue

        # Convert the BGR image to RGB
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image.flags.writeable = False
        
        # Process the image and find poses
        results = pose.process(image)
        
        # Draw the pose annotation on the image
        image.flags.writeable = True
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        
        if results.pose_landmarks:
            mp_drawing.draw_landmarks(
                image,
                results.pose_landmarks,
                mp_pose.POSE_CONNECTIONS
            )
            
            landmarks = results.pose_landmarks.landmark
            
            # Get coordinates
            # Left side
            l_shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x,
                          landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
            l_elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].x,
                       landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].y]
            l_wrist = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x,
                       landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y]
            l_hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x,
                     landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
            
            # Right side
            r_shoulder = [landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x,
                          landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y]
            r_elbow = [landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].x,
                       landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].y]
            r_wrist = [landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].x,
                       landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].y]
            r_hip = [landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x,
                     landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y]
            
            # Calculate angles
            # Shoulder Angle: Angle between Torso (Shoulder->Hip) and Arm (Shoulder->Elbow)
            l_shoulder_angle = calculate_shoulder_angle(l_shoulder, l_elbow, l_hip)
            r_shoulder_angle = calculate_shoulder_angle(r_shoulder, r_elbow, r_hip)
            
            # Elbow Angle: Angle between Upper Arm (Elbow->Shoulder) and Forearm (Elbow->Wrist)
            l_elbow_angle = calculate_angle(l_shoulder, l_elbow, l_wrist)
            r_elbow_angle = calculate_angle(r_shoulder, r_elbow, r_wrist)
            
            # Update global data
            with lock:
                current_pose_data = {
                    "time": time.time() - start_time,
                    "pose": {
                        "leftShoulderAngle": round(l_shoulder_angle, 2),
                        "rightShoulderAngle": round(r_shoulder_angle, 2),
                        "leftElbowAngle": round(l_elbow_angle, 2),
                        "rightElbowAngle": round(r_elbow_angle, 2),
                        "leftHandShape": "open", # Placeholder
                        "rightHandShape": "open", # Placeholder
                        "leftFoot": "M", # Placeholder
                        "rightFoot": "M" # Placeholder
                    }
                }
                
            # Visualize angles on frame
            cv2.putText(image, f"L Shoulder: {int(l_shoulder_angle)}", 
                        tuple(np.multiply(l_shoulder, [640, 480]).astype(int)), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2, cv2.LINE_AA)
            cv2.putText(image, f"L Elbow: {int(l_elbow_angle)}", 
                        tuple(np.multiply(l_elbow, [640, 480]).astype(int)), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2, cv2.LINE_AA)
            
        with lock:
            output_frame = image.copy()
            
    cap.release()

def generate_frames():
    global output_frame
    while True:
        with lock:
            if output_frame is None:
                continue
            (flag, encodedImage) = cv2.imencode(".jpg", output_frame)
            if not flag:
                continue
        yield(b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + 
              bytearray(encodedImage) + b'\r\n')

@app.route("/video_feed")
def video_feed():
    return Response(generate_frames(),
                    mimetype = "multipart/x-mixed-replace; boundary=frame")

@app.route("/pose")
def get_pose():
    with lock:
        return jsonify(current_pose_data)

if __name__ == "__main__":
    # Start webcam processing in a separate thread
    t = threading.Thread(target=process_webcam)
    t.daemon = True
    t.start()
    
    # Start Flask server
    app.run(host="0.0.0.0", port=5000, debug=False)

