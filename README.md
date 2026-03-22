# PIP Anywhere

**PIP Anywhere** is a professional-grade Chrome extension that delivers a seamless Picture-in-Picture (PIP) experience on any website, paired with a sophisticated multi-layered ad blocker. Whether you're on YouTube, Netflix, Zee5, or a niche video player, PIP Anywhere keeps your viewing area clean and your video floating while you work.

## 🚀 Key Features

*   **Universal Picture-in-Picture**: Works on virtually any HTML5 video, including those inside IFrames and deep Shadow DOMs.
*   **Advanced Ad Blocking**:
    *   **Network Protection**: Blocks 50+ known ad-serving domains (Brave-style protection).
    *   **YouTube Specific**: Auto-skips skippable ads, fast-forwards unskippable ads (16x speed), and suppresses the "Ad blocker violated terms" warning.
    *   **Cosmetic Filtering**: Hides ad banners and video overlays on all supported websites.
*   **Customizable PIP Icon**:
    *   **On-Video Toggle**: A convenient floating button appears when you hover over a video.
    *   **Settings Persistence**: Use the extension popup to enable or disable the on-video icon globally. 
    *   **Real-time Sync**: Toggling settings in the popup updates all open tabs and frames instantly.
*   **Intelligent Highlighting**: The floating icon automatically highlights (with a vibrant purple gradient) when Picture-in-Picture is active.
*   **Keyboard Efficiency**: Toggle PIP instantly with `Alt + P`.

## 🛠️ Usage

### Method 1: Floating Icon
1. Hover over any video.
2. Click the **PIP icon** (it appears near the top-right by default).
3. The icon will glow when PIP is active. Click it again to return the video to the tab.

### Method 2: Keyboard Shortcut
1. Press `Alt + P` on any tab with a video.
2. The extension automatically picks the "best" video on the page (usually the largest playing one).

### Method 3: Extension Popup (Media Hub)
1. Click the extension icon in your toolbar to see all active media across all tabs.
2. Controls (Play, Pause, Rewind, Seek) and a per-video PIP button are available.
3. Use the **On-media PIP Icon** toggle at the bottom to show/hide the floating button on videos.

## 🔧 Technical Logic & Bypasses

*   **DRM & Restrictions**: PIP Anywhere aggressively removes `disablePictureInPicture` attributes and overrides JavaScript blocks that sites use to prevent PIP.
*   **YouTube Bypass**: Uses a "Stealth Mode" for ad blocking on YouTube (using opacity and pointer-events) to avoid detection by YouTube's anti-adblock scripts.
*   **Shadow DOM Discovery**: Uses recursive tree-walking to find video elements buried inside isolated shadow roots (common on modern streaming platforms).

## 🔒 Privacy & Performance

*   **Local Processing**: All logic runs on your machine. No cloud processing or data collection.
*   **Resource Efficient**: Ad blocking is handled via `declarativeNetRequest` (Manifest V3), which is extremely fast and light on memory.
*   **Zero Analytics**: We don't track what you watch or where you browse.

## 👨‍💻 Credits

**Author**: Mirjan Ali Sha  
*Concept, Development & Advanced Adblock Logic*
