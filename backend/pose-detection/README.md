# Pose Detection Module

This module uses OpenCV and MediaPipe to detect body pose from a webcam feed and exposes the calculated angles via a local API.

## Prerequisites

- Python 3.7+
- A webcam

## Installation

1. Navigate to this directory:
   ```bash
   cd backend/pose-detection
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

1. Run the server:
   ```bash
   python pose_server.py
   ```

2. The server will start on `http://localhost:5000`.

## API Endpoints

### `GET /pose`

Returns the current pose data in JSON format, compatible with the JAEL frontend.

**Response Example:**
```json
{
  "time": 12.5,
  "pose": {
    "leftShoulderAngle": 45.2,
    "rightShoulderAngle": 10.5,
    "leftElbowAngle": 160.0,
    "rightElbowAngle": 175.0,
    "leftHandShape": "open",
    "rightHandShape": "open",
    "leftFoot": "M",
    "rightFoot": "M"
  }
}
```

### `GET /video_feed`

Returns a MJPEG stream of the webcam feed with pose landmarks and calculated angles drawn on it. You can view this in a browser.

## Troubleshooting

- **Camera not found**: Ensure your webcam is connected and not being used by another application.
- **Permission denied**: You may need to grant terminal permission to access the camera.

