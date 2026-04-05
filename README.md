# PIP Anywhere

**PIP Anywhere** is a professional-grade Chrome extension that delivers a seamless Picture-in-Picture (PIP) experience on any website, paired with a sophisticated multi-layered ad blocker that aggressively intercepts client-side and Server-Side Ad Insertion (SSAI). Whether you're on YouTube, Netflix, Hotstar, Zee5, or a niche video player, PIP Anywhere keeps your viewing area clean and your video floating while you work.

## 🚀 Key Features

### Universal Picture-in-Picture (PIP)
*   **Forceful Execution**: Works on virtually any HTML5 video, bypassing built-in restrictions like `disablePictureInPicture` and slicing right through thick Shadow DOMs to find the player.
*   **Customizable Hover Icon**: A smooth, non-intrusive floating button appears securely anchored over your video frames. It glows dynamically with a vibrant purple gradient when PIP is actively spawned.
*   **Global Kill-Switch**: A setting in the intuitive popup dashboard instantly strips the PIP hover icon across all open tabs by utilizing CSS runtime layers (`data-pip-hide-icon`) if you desire a clutter-free native player.
*   **Keyboard Efficiency**: Toggle PIP instantly on the largest playing video with `Alt + P`.

### The Media Hub Dashboard (Popup)
*   **Cross-Tab Controller**: Open the extension popup to view beautiful, cleanly rendered cards displaying every active media source across your entire browser.
*   **Metadata Extraction**: Extracts proper Titles, Artists, and High-Resolution Thumbnail Posters from `navigator.mediaSession`, `og:image` tags, and custom platform heuristics.
*   **Live Scrubber**: Control video play, pause, rewind, forward, and natively skip to any timeline position right from the extension window.
*   **Click-to-Tab Routing**: Click any player card to instantly un-minimize and focus the original tab.

### State-of-the-Art Ad Blocking
PIP Anywhere utilizes a unique triple-layered strategy for eliminating ad friction:
1.  **Network Protection (`declarativeNetRequest`)**: Intercepts thousands of trackers and drops server-side endpoints dead in their tracks (e.g., blocking `*/midroll`, `*/preroll` natively for services like Hotstar).
2.  **Ultra-fast DOM Scraping**: Employs highly efficient (zero-reflow) script injectors that read the native `.textContent` of elements completely avoiding layout-thrashing lag.
3.  **Cosmetic Filtering**: Aggressively hides tracking beacons, sponsored sidebars, and banner containers from your viewport continuously tracking dynamically rendered DOM changes via smart `MutationObservers`.

#### 📺 YouTube Anti-Ban Stealth
*   **Instant Skipper**: Auto-clicks explicitly available skip buttons flawlessly.
*   **Temporal Distortion**: For unskippable ad blocks, the extension boosts playback natively to `16x` speed and auto-mutes. 
*   **Penalty Guardian**: Detects YouTube's "Ad blocker violated terms" warnings, attempts to click "Dismiss," and if backed into a corner, auto-disables the ad-block loop temporarily to guarantee continuous playback.
*   **Domain-based Toggle Reset**: If disabled, you can simply flick the "Ads Blocker (This Site)" toggle manually in the popup, and the extension fires a surgical strike to wipe the penalty flags (`pip_yt_block`) out of YouTube's `localStorage` and resume blocking!

#### 🏏 Hotstar SSAI Bypassing
*   **Continuous Frame Seeking**: Bypasses embedded Server-Side Ad Injections by compounding `video.playbackRate = 16` alongside aggressive `video.currentTime += 2` jumps to force the media buffer out of the ad block and back to the show.
*   **Hidden State Interception**: Captures proprietary hidden React states (like `[data-testid="bbtype-video"]`) to realize when Hotstar switches server feeds dynamically.

## 🛠️ Usage

### Method 1: The Media Hub (Best for Multitasking)
1. Click the extension icon in your toolbar to see all active media across all tabs.
2. Control playback natively, or hit the Picture-in-Picture button right on the card.
3. Use the **Domain-Specific Ad Blocker** toggle to physically enable or rest the blocker per site.
4. Toggle **Big Screen Mode (Beta)** or the universal **On-media PIP Icon** directly.

### Method 2: Floating Icon
1. Hover over any video.
2. Click the floating **PIP icon**.
3. The icon will glow. Click it again to return the video to the tab.

### Method 3: Big Screen Mode (Beta)
Turn any video into a native full-viewport theater experience immediately without triggering the browser's native full-screen. This stretches the player across the width of the screen while preserving comments and recommended feeds safely anchored below the spacer injection!

### Method 4: Adaptive Ads Blocker
1. **Auto-Skip**: The extension automatically identifies and clicks "Skip Ad" buttons on YouTube and Hotstar as soon as they become available.
2. **Fast-Forward & Mute**: For unskippable ads, the player is automatically set to **16x speed** and muted to minimize the interruption.
3. **Manual Override**: If you wish to disable ad-blocking for a specific site, use the **Ads Blocker (This Site)** toggle in the extension popup.
    - *Note*: If the extension detects a strict anti-adblock ban (e.g., on YouTube), it may auto-disable to preserve video playback. You can manually re-enable it at any time to clear the penalty and resume blocking.

## 🔒 Privacy First: Zero Tracking, Zero Data Collection

Your privacy is the core pillar of PIP Anywhere's design. We believe your viewing habits are your own business.

*   **No Data Collection**: PIP Anywhere **does not collect, store, or transmit** any personal data, browsing history, or media preferences.
*   **Zero Tracking**: There are no hidden analytics, no telemetry, and no cookies used for tracking. We have no way of knowing what you watch or where you browse.
*   **100% Local Processing**: All code, from ad-skipping logic to the Media Hub dashboard, runs entirely within your browser environment. No external servers are ever contacted for "processing" your media.
*   **Open & Transparent**: The extension operates using standard Manifest V3 APIs, ensuring it follows the latest security and privacy standards required by modern browsers.
*   **Resource Efficient**: Unlike "heavyweight" blockers, PIP Anywhere is optimized to use minimal CPU and Memory, ensuring your browser remains fast and responsive.

## 👨‍💻 Credits

**Author**: Mirjan Ali Sha  
*Concept, Development & Advanced Logic Architecture*
