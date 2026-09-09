# AetherRecord 🎬

A modern, zero-dependency browser-based screen and video recorder tailored for macOS and all modern web browsers.

🌐 **Live Demo:** [https://everlovingvijay.github.io/aether-record/](https://everlovingvijay.github.io/aether-record/)

---

## ✨ Features

- **No Window/Screen Prompts:** Captures video streams directly using `HTMLMediaElement.captureStream()`—no clumsy screen selection dialogs.
- **Pure Video Only:** Decoded media frames are captured directly from the element. Controls, overlays, mouse cursors, and other tabs are **never** recorded.
- **Native Resolution Detection:** Automatically preserves the exact native resolution (1080p, 4K, etc.) of your uploaded video.
- **Crystal-Clear Sound:** Direct Web Audio routing captures internal video audio cleanly without microphone feedback.
- **Optional Voiceover Mixing:** Toggle microphone recording to speak over the video, mixing tracks with Web Audio API.
- **Direct MP4 & WebM Output:** Generates native `.mp4` video files in modern browsers with graceful fallback to `.webm`.
- **100% Private & In-Browser:** All decoding, audio mixing, and encoding occur entirely inside your browser. No video data ever touches a server.

---

## 🚀 How to Use

1. Visit the [Live Web App](https://everlovingvijay.github.io/aether-record/).
2. Drag and drop any video (`.mp4`, `.webm`, `.mov`).
3. Configure settings (e.g. Auto-Stop on End, Microphone Voiceover).
4. Click **Start Recording**.
5. When finished, your recording will automatically download.

---

## 💻 Local Development

Run locally with any static web server:

```bash
# Using Python
python3 -m http.server 8000

# Using Ruby
ruby -run -e httpd . -p 8000
```

Open `http://localhost:8000` in Google Chrome, Microsoft Edge, Safari, or Arc.
