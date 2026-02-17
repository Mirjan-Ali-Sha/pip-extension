# PIP Anywhere

**PIP Anywhere** is a powerful and lightweight Chrome extension that enables Picture-in-Picture (PIP) mode on almost any video on the web. Whether it's YouTube, Netflix, Hotstar, or a custom video player, PIP Anywhere attempts to liberate your video from the browser tab, allowing you to watch while you work, browse, or multi-task.

## Key Features

*   **Universal Compatibility**: Works on the vast majority of websites containing HTML5 videos.
*   **Smart Detection**: Automatically finds the most relevant video on the page, even inside iframes or Shadow DOMs.
*   **Overlay Button**: Adds a convenient, unobtrusive button to compatible video players.
*   **Keyboard Shortcut**: Toggle PIP instantly with `Alt + P`.
*   **Draggable & Resizable**: Uses the browser's native PIP window, which can be moved and resized freely.
*   **Performance Friendly**: Lightweight script that doesn't drain your resources.

## Installation

Since this extension is currently in development/unpacked state:

1.  Open Chrome (or Edge/Brave) and navigate to `chrome://extensions`.
2.  Enable **Developer mode** (usually a toggle in the top-right corner).
3.  Click **Load unpacked**.
4.  Select the `pip-extension` folder.
5.  The extension is now installed and active!

## Usage

### Method 1: Overlay Button
1.  Navigate to a page with a video (e.g., YouTube).
2.  Hover your mouse over the video player.
3.  Click the **PIP** icon that appears on the right side of the video (approx. 15% from the top).

### Method 2: Keyboard Shortcut
1.  While on a page with a video, press `Alt + P`.
2.  The "best" video on the page (usually the largest or currently playing one) will pop out.

### Method 3: Toolbar Icon
1.  Pin the extension icon to your browser toolbar.
2.  Click the icon to toggle PIP for the current tab.

## Troubleshooting

*   **Button not appearing?**
    *   Try moving your mouse over the video.
    *   Ensure the video is actually playing or has loaded.
    *   Refresh the page.
*   **PIP blocked?**
    *   Some sites aggressively block PIP. This extension tries to bypass standard restrictions, but DRM-heavy sites might still have limitations.
    *   Clicking "Play" *before* trying to enter PIP often resolves issues.

## Privacy Policy

**PIP Anywhere respects your privacy.**
*   This extension runs entirely locally on your device.
*   It does **not** collect, store, or transmit any user data, browsing history, or video usage statistics.
*   Permissions are only used to detect video elements on the pages you visit.

## Credits

**Author**: Mirjan Ali Sha  
*Concept & Development*
