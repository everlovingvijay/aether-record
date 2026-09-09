/* AetherRecord - Application Logic (HTML5 captureStream Version) */

// UI State Elements
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const panelUpload = document.getElementById('panel-upload');
const panelConfig = document.getElementById('panel-config');
const panelSuccess = document.getElementById('panel-success');

const videoTitle = document.getElementById('video-title');
const videoMeta = document.getElementById('video-meta');
const changeFileBtn = document.getElementById('change-file-btn');

const toggleMic = document.getElementById('toggle-mic');
const toggleAutostop = document.getElementById('toggle-autostop');
const recordBtn = document.getElementById('record-btn');

const recordingOverlay = document.getElementById('recording-overlay');
const recordingVideo = document.getElementById('recording-video');
const resultPreview = document.getElementById('result-preview');

const downloadBtn = document.getElementById('download-btn');
const recordAgainBtn = document.getElementById('record-again-btn');

// State Variables
let selectedFile = null;
let videoUrl = null;
let videoStream = null;
let micStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let finalRecordedStream = null;
let selectedMimeType = '';
let selectedExtension = 'webm';

// Global Web Audio nodes for routing and mixing
let audioContext = null;
let videoSourceNode = null;
let micSourceNode = null;
let mixDestination = null;

// Initialize Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  setupUploadEvents();
  setupConfigEvents();
  setupRecordingEvents();
});

// 1. File Upload and Drag & Drop Setup
function setupUploadEvents() {
  // Click on dropzone triggers file input
  uploadZone.addEventListener('click', () => fileInput.click());

  // Handle file selection
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  });

  // Drag over effects
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  });
}

function handleFileSelection(file) {
  // Validate that it's a video file
  if (!file.type.startsWith('video/')) {
    alert('Please upload a valid video file (MP4, WebM, etc.).');
    return;
  }

  selectedFile = file;

  // Revoke existing URL if any
  if (videoUrl) {
    URL.revokeObjectURL(videoUrl);
  }

  // Create Object URL for playback
  videoUrl = URL.createObjectURL(file);
  recordingVideo.src = videoUrl;
  recordingVideo.load();

  // Update UI Metadata
  videoTitle.textContent = file.name;
  
  // Format File Size
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
  
  // Wait for metadata to load to get duration & dimensions
  recordingVideo.onloadedmetadata = () => {
    const minutes = Math.floor(recordingVideo.duration / 60);
    const seconds = Math.floor(recordingVideo.duration % 60).toString().padStart(2, '0');
    const width = recordingVideo.videoWidth;
    const height = recordingVideo.videoHeight;
    
    videoMeta.textContent = `${sizeMB} MB • ${minutes}:${seconds} • ${width}x${height}px`;
  };

  // Switch panels
  panelUpload.style.display = 'none';
  panelConfig.style.display = 'block';
  panelSuccess.style.display = 'none';
}

// 2. Configuration Setup
function setupConfigEvents() {
  changeFileBtn.addEventListener('click', () => {
    panelConfig.style.display = 'none';
    panelUpload.style.display = 'block';
    fileInput.value = '';
    selectedFile = null;
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      videoUrl = null;
    }
  });
}

// 3. Recording Mechanics
function setupRecordingEvents() {
  recordBtn.addEventListener('click', startRecordingFlow);
  
  // Handle auto-stop on video completion
  recordingVideo.addEventListener('ended', () => {
    if (toggleAutostop.checked && mediaRecorder && mediaRecorder.state !== 'inactive') {
      stopRecordingFlow();
    }
  });

  // Global listener for Escape key to stop recording manually
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('recording-active')) {
      stopRecordingFlow();
    }
  });

  // Action button handlers in success page
  recordAgainBtn.addEventListener('click', () => {
    panelSuccess.style.display = 'none';
    panelConfig.style.display = 'block';
    
    // Clear preview source
    if (resultPreview.src) {
      URL.revokeObjectURL(resultPreview.src);
      resultPreview.src = '';
    }
  });
}

// Initialize Web Audio Routing nodes
function initAudioRouting() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    mixDestination = audioContext.createMediaStreamDestination();
    
    // Connect the HTML5 Video node into our Web Audio graph.
    // This can only be done ONCE per video element lifetime.
    videoSourceNode = audioContext.createMediaElementSource(recordingVideo);
    
    // Connect the video audio source to:
    // 1. System speakers (so the user can hear the video during recording)
    videoSourceNode.connect(audioContext.destination);
    // 2. The mixed output recorder node
    videoSourceNode.connect(mixDestination);
  }
}

async function startRecordingFlow() {
  recordedChunks = [];
  videoStream = null;
  micStream = null;
  finalRecordedStream = null;

  try {
    // 1. Initialize Web Audio Context and nodes
    initAudioRouting();

    // Resume AudioContext if suspended (browser security requirement)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    // 2. Capture Video Element Stream Directly (Zero-Prompt, Native Resolution)
    if (recordingVideo.captureStream) {
      videoStream = recordingVideo.captureStream();
    } else if (recordingVideo.mozCaptureStream) {
      videoStream = recordingVideo.mozCaptureStream();
    } else {
      throw new Error("captureStream() is not supported in this browser. Please use Chrome, Edge, Safari, or Firefox.");
    }

    // 3. Connect Microphone if option is enabled
    const mixMicEnabled = toggleMic.checked;
    if (mixMicEnabled) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micSourceNode = audioContext.createMediaStreamSource(micStream);
        micSourceNode.connect(mixDestination);
      } catch (micErr) {
        console.warn("Failed to acquire microphone stream:", micErr);
        alert("Could not access microphone. Recording will proceed with video audio only.");
      }
    }

    // 4. Combine the captured Video element track and final mixed audio track
    const videoTrack = videoStream.getVideoTracks()[0];
    if (!videoTrack) {
      throw new Error("No video track found in the video element stream. Make sure the video is fully loaded.");
    }

    // The audio output will be captured from the Web Audio mixer destination
    const audioTrack = mixDestination.stream.getAudioTracks()[0];
    
    const tracksToRecord = [videoTrack];
    if (audioTrack) {
      tracksToRecord.push(audioTrack);
    }

    finalRecordedStream = new MediaStream(tracksToRecord);

    // 5. Initialize MediaRecorder with dynamic MIME type detection
    const mimeTypesToCheck = [
      { mime: 'video/mp4;codecs=avc1.64003E,mp4a.40.2', ext: 'mp4' },
      { mime: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' },
      { mime: 'video/mp4', ext: 'mp4' },
      { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
      { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' },
      { mime: 'video/webm', ext: 'webm' }
    ];

    let options = {};
    selectedMimeType = '';
    selectedExtension = 'webm';

    for (const item of mimeTypesToCheck) {
      if (MediaRecorder.isTypeSupported(item.mime)) {
        options = { mimeType: item.mime };
        selectedMimeType = item.mime;
        selectedExtension = item.ext;
        break;
      }
    }

    if (!selectedMimeType) {
      options = {};
      selectedMimeType = 'default';
      selectedExtension = 'webm';
    }

    console.log(`Using MIME type: ${selectedMimeType}, extension: ${selectedExtension}`);
    mediaRecorder = new MediaRecorder(finalRecordedStream, options);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = saveRecordedData;

    // 6. Put page into recording state (displays video full screen for monitoring)
    document.body.classList.add('recording-active');
    
    // Play the video and start the recorder
    recordingVideo.currentTime = 0;
    recordingVideo.muted = false; // Ensure unmuted so sound is heard and recorded
    
    setTimeout(() => {
      recordingVideo.play()
        .then(() => {
          mediaRecorder.start(1000); // chunk every 1 sec
        })
        .catch(err => {
          console.error("Playback failed:", err);
          stopRecordingFlow();
          alert("Error starting video playback. Make sure you interact with the page first.");
        });
    }, 100);

  } catch (err) {
    console.error("Failed to start recording:", err);
    alert("Could not start recording. Error: " + err.message);
    cleanupStreams();
  }
}

function stopRecordingFlow() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  
  // Pause the recording video
  recordingVideo.pause();
  
  // Remove recording overlay styles
  document.body.classList.remove('recording-active');
  
  cleanupStreams();
}

function cleanupStreams() {
  // Disconnect microphone source node if active
  if (micSourceNode) {
    micSourceNode.disconnect();
    micSourceNode = null;
  }

  // Stop microphone hardware tracks
  if (micStream) {
    micStream.getTracks().forEach(track => track.stop());
    micStream = null;
  }

  // Stop the media tracks generated by captureStream()
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
}

function saveRecordedData() {
  if (recordedChunks.length === 0) {
    alert("Recording completed, but no video data was captured.");
    return;
  }

  // Create a blob containing the recorded video data in the correct format
  const blob = new Blob(recordedChunks, { type: selectedMimeType === 'default' ? 'video/webm' : selectedMimeType });
  const recordedUrl = URL.createObjectURL(blob);

  // Load preview in UI
  resultPreview.src = recordedUrl;

  // Generate automated filename
  const now = new Date();
  const dateStr = now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0');
  const filename = `recording_${dateStr}.${selectedExtension}`;

  // Set up download button action
  downloadBtn.onclick = () => {
    const a = document.createElement('a');
    a.href = recordedUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Automatically trigger the download
  downloadBtn.click();

  // Show success state panel
  panelConfig.style.display = 'none';
  panelSuccess.style.display = 'block';
}
