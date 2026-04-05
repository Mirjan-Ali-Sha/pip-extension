/**
 * PIP Anywhere — Content Script
 * @author Mirjan Ali Sha <mastools.help@gmail.com>
 * Finds video elements (including in Shadow DOM), removes PIP restrictions,
 * and handles toggle logic across frames.
 */

(function () {
    'use strict';

    // Avoid double injection
    if (window.__pipAnywhereInjected) return;
    window.__pipAnywhereInjected = true;

    const PIP_BUTTON_CLASS = 'pip-anywhere-btn';
    const PIP_ACTIVE_CLASS = 'pip-anywhere-active';

    let onMediaPipIconEnabled = true;
    let bigScreenModeEnabled = false;

    // Load initial settings safely
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get({ onMediaPipIcon: true, bigScreenMode: false }, (result) => {
            onMediaPipIconEnabled = result.onMediaPipIcon;
            bigScreenModeEnabled = result.bigScreenMode;
            if (!onMediaPipIconEnabled) {
                removeAllButtons();
            } else {
                document.documentElement.removeAttribute('data-pip-hide-icon');
            }
            syncBigScreenMode();
        });
    }

    // ─── Video Discovery ──────────────────────────────────────────────

    /**
     * Recursively find all video elements in a root (including shadow roots).
     */
    function findAllVideos(root = document) {
        let videos = [];

        // Standard query
        const nodes = root.querySelectorAll('*');

        // Check root itself
        if (root.tagName === 'VIDEO') videos.push(root);

        // Check children
        nodes.forEach(node => {
            if (node.tagName === 'VIDEO') {
                videos.push(node);
            }
            // Check open shadow roots (limited access, but better than nothing)
            if (node.shadowRoot) {
                videos = videos.concat(findAllVideos(node.shadowRoot));
            }
        });

        return videos;
    }

    /**
     * Find the "best" video to target for PIP.
     * Criteria:
     * 1. Is it currently playing?
     * 2. Size (area)
     */
    function findBestVideo() {
        const videos = findAllVideos();
        if (videos.length === 0) return null;

        // Filter out tiny videos (ads, thumbnails)
        const candidates = videos.filter(v => {
            const rect = v.getBoundingClientRect();
            // Must be at least 150x100 visible
            return rect.width > 150 && rect.height > 100;
        });

        if (candidates.length === 0) return videos[0]; // Fallback to any video

        // Sort: Playing > Size
        candidates.sort((a, b) => {
            const aPlaying = !a.paused && !a.ended && a.readyState > 2;
            const bPlaying = !b.paused && !b.ended && b.readyState > 2;

            if (aPlaying !== bPlaying) return bPlaying - aPlaying; // Playing first

            const aArea = (a.videoWidth * a.videoHeight) || (a.clientWidth * a.clientHeight);
            const bArea = (b.videoWidth * b.videoHeight) || (b.clientWidth * b.clientHeight);
            return bArea - aArea; // Largest first
        });

        return candidates[0];
    }

    // ─── PIP Logic ────────────────────────────────────────────────────

    /**
     * Remove PIP restrictions from a video element.
     */
    function enablePIP(video) {
        if (!video) return;

        // 1. Remove HTML attribute
        if (video.hasAttribute('disablepictureinpicture')) {
            video.removeAttribute('disablepictureinpicture');
        }

        // 2. Override JS property
        try {
            Object.defineProperty(video, 'disablePictureInPicture', {
                get: () => false,
                set: () => { },
                configurable: true
            });
        } catch (e) {
            video.disablePictureInPicture = false;
        }

        // 3. Check parents recursively
        let parent = video.parentElement;
        while (parent) {
            if (parent.hasAttribute('disablepictureinpicture')) {
                parent.removeAttribute('disablepictureinpicture');
            }
            parent = parent.parentElement;
        }
    }

    /**
     * Toggle PIP logic.
     * If called from background script (Alt+P or Icon click), checks if this frame has a playing video.
     */
    async function togglePIP(fromUserAction = false) {
        // If PIP is active in this document, exit it
        if (document.pictureInPictureElement) {
            try {
                await document.exitPictureInPicture();
                updateButtons(false);
            } catch (e) {
                console.warn('[PIP] Exit failed:', e);
            }
            return;
        }

        const video = findBestVideo();
        if (!video) {
            if (fromUserAction) {
                // Background script handles error messaging if no frame responds
            }
            return false; // Did not handle
        }

        // If from global toggle (Alt+P/Icon), proceed if video found.
        // We removed strict checks (paused/size) to match behavior of other extensions that work for user.
        if (fromUserAction) {
            // Just proceed. finding 'best' likely already filtered out tiny ones?
            // findBestVideo filters < 150x100. Retaining that minimum sanity check.
        }

        enablePIP(video);

        try {
            await video.requestPictureInPicture();
            // State update is handled by global listeners now
            return true; // Handled
        } catch (e) {
            console.error('[PIP] Enter failed:', e);
            if (fromUserAction) showToast('Failed to enter PIP. Try clicking play first.');
            return false;
        }
    }

    // ─── UI Overlay ───────────────────────────────────────────────────

    // ─── UI Overlay ───────────────────────────────────────────────────

    function attachButton(video) {
        if (!onMediaPipIconEnabled) return;
        if (video.clientWidth < 100) return; // Ignore very small videos

        // Find a valid parent that has dimensions (so top: 50% works)
        let parent = video.parentElement;
        let foundParent = false;

        // Try up to 3 levels up to find a container that matches video size roughly
        // or just has non-zero height
        for (let i = 0; i < 3; i++) {
            if (!parent) break;
            const style = getComputedStyle(parent);
            if (parent.clientHeight > 50 && style.display !== 'none' && style.visibility !== 'hidden') {
                foundParent = true;
                break;
            }
            parent = parent.parentElement;
        }

        if (!foundParent || !parent) return;

        // Avoid duplicates in THIS parent
        if (parent.querySelector(`.${PIP_BUTTON_CLASS}`)) return;

        // Ensure positioning context on the parent so absolute positioning works
        const pos = getComputedStyle(parent).position;
        if (pos === 'static') {
            parent.style.position = 'relative';
        }

        const btn = document.createElement('button');
        btn.className = PIP_BUTTON_CLASS;
        btn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <rect x="12" y="10" width="8" height="6" rx="1" fill="currentColor" opacity="0.4"/>
            </svg>
        `;
        btn.title = 'Toggle Picture-in-Picture';

        // Handle click event (Stop propagation absolutely)
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation(); // Ensure no other handlers run
            togglePIP(false);
        };

        // Also capture mousedown to prevent parent click handlers
        btn.onmousedown = (e) => e.stopPropagation();

        // Initial state sync: Highlight if PIP is already active for this video
        if (document.pictureInPictureElement && (document.pictureInPictureElement === video || document.pictureInPictureElement.dataset.pipId === video.dataset.pipId)) {
            btn.classList.add(PIP_ACTIVE_CLASS);
        }

        parent.appendChild(btn);
    }

    function updateButtons(active, root = document) {
        // Query current root
        root.querySelectorAll(`.${PIP_BUTTON_CLASS}`).forEach(btn => {
            btn.classList.toggle(PIP_ACTIVE_CLASS, active);
        });
        
        // Recurse into shadow roots
        root.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) updateButtons(active, el.shadowRoot);
        });
    }

    function removeAllButtons() {
        // Unfailingly hide via CSS global flag
        document.documentElement.setAttribute('data-pip-hide-icon', 'true');
        
        // Also cleanly remove from standard dom and shadow roots if accessible
        try {
            document.querySelectorAll(`.${PIP_BUTTON_CLASS}`).forEach(btn => btn.remove());
            document.querySelectorAll('*').forEach(el => {
                if (el.shadowRoot) {
                    el.shadowRoot.querySelectorAll(`.${PIP_BUTTON_CLASS}`).forEach(btn => btn.remove());
                }
            });
        } catch (e) {
            console.warn('[PIP Anywhere] Soft warning: Could not traverse all shadow roots to remove nodes. CSS hiding applied as fallback.');
        }
    }

    const BIG_SCREEN_CONTAINER_CLASS = 'pip-anywhere-big-screen-active';
    const BIG_SCREEN_COLUMN_CLASS = 'pip-anywhere-column-flow';
    const INCLUDED_BIG_SCREEN_DOMAINS = [
        'zee5.com'
    ];

    function syncBigScreenMode() {
        const hostname = location.hostname.toLowerCase();
        if (!INCLUDED_BIG_SCREEN_DOMAINS.some(d => hostname.includes(d))) return;

        const isYT = hostname.includes('youtube.com');
        const isZee = hostname.includes('zee5.com');
        
        if (!bigScreenModeEnabled) {
            document.documentElement.removeAttribute('data-pip-big-screen');
            document.documentElement.style.removeProperty('padding-top');
            
            document.querySelectorAll(`.${BIG_SCREEN_CONTAINER_CLASS}`).forEach(el => {
                el.classList.remove(BIG_SCREEN_CONTAINER_CLASS);
                const video = el.querySelector('video');
                if (video) {
                    video.style.removeProperty('width');
                    video.style.removeProperty('height');
                }
            });
            document.querySelectorAll('.pip-anywhere-ancestor-flatten').forEach(el => {
                el.classList.remove('pip-anywhere-ancestor-flatten');
            });
            const spacer = document.getElementById('pip-anywhere-spacer');
            if (spacer) spacer.remove();
            return;
        }

        // 1. Site-specific: Trigger native theater mode or re-renders
        if (isYT || isZee) {
            if (!document.documentElement.hasAttribute('data-pip-big-screen')) {
                if (isYT) {
                    const watch = document.querySelector('ytd-watch-flexy');
                    if (watch && !watch.hasAttribute('theater')) {
                        const btn = document.querySelector('.ytp-size-button');
                        if (btn) btn.click();
                    }
                }
                // All major platforms need time to re-render
                [100, 300, 600, 1000].forEach(delay => {
                    setTimeout(() => window.dispatchEvent(new Event('resize')), delay);
                });
            }
            document.documentElement.setAttribute('data-pip-big-screen', 'true');
            if (isYT) return; // YouTube handles the rest via Theater Mode
        }

        const video = findBestVideo();
        if (!video) return;

        // 2. Identify best player container
        let container = video.parentElement;
        let bestContainer = container;
        let temp = container;
        for (let i = 0; i < 8; i++) {
            if (!temp || temp === document.body) break;
            const id = (temp.id || '').toLowerCase();
            const cls = (temp.className || '').toLowerCase();
            if (id.includes('player') || cls.includes('player') || id.includes('video-player') || id.includes('zee')) {
                bestContainer = temp;
                break; 
            }
            if (temp.clientHeight > 100) bestContainer = temp;
            temp = temp.parentElement;
        }

        if (bestContainer) {
            document.documentElement.setAttribute('data-pip-big-screen', 'true');
            bestContainer.classList.add(BIG_SCREEN_CONTAINER_CLASS);
            
            // 3. Propagate "column flow" to parents smoothly
            let layoutParent = bestContainer.parentElement;
            for (let i = 0; i < 12; i++) {
                if (!layoutParent || layoutParent === document.documentElement) break;
                const style = getComputedStyle(layoutParent);
                if (style.display.includes('flex') || style.display.includes('grid')) {
                    layoutParent.classList.add(BIG_SCREEN_COLUMN_CLASS);
                }
                layoutParent = layoutParent.parentElement;
            }

            video.style.setProperty('width', '100%', 'important');
            video.style.setProperty('height', '100%', 'important');

            // 4. Flatten ancestors to allow absolute positioning relative to body
            let p = bestContainer.parentElement;
            while (p && p !== document.body) {
                p.classList.add('pip-anywhere-ancestor-flatten');
                p = p.parentElement;
            }

            // 5. Inject a physical placeholder to push content down (guaranteed visibility of titles)
            if (!document.getElementById('pip-anywhere-spacer')) {
                const spacer = document.createElement('div');
                spacer.id = 'pip-anywhere-spacer';
                // Find a good place to insert (after header)
                const header = document.querySelector('header') || document.body.firstChild;
                if (header) {
                    header.after(spacer);
                } else {
                    document.body.prepend(spacer);
                }
            }
        }
    }

    function showToast(msg) {
        const t = document.createElement('div');
        t.className = 'pip-anywhere-toast';
        t.textContent = msg;
        document.body.appendChild(t);
        requestAnimationFrame(() => t.classList.add('pip-anywhere-toast-show'));
        setTimeout(() => {
            t.classList.remove('pip-anywhere-toast-show');
            setTimeout(() => t.remove(), 300);
        }, 2000);
    }

    // ─── Listeners & Observers ────────────────────────────────────────

    // Message from background or popup
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.type === 'toggle-pip') {
            togglePIP(true).then(handled => {
                sendResponse({ handled });
            });
            return true; // async
        } else if (msg.type === 'get-status') {
            const video = findBestVideo();
            sendResponse({
                active: !!document.pictureInPictureElement,
                hasVideo: !!video,
                playing: video ? (!video.paused && !video.ended) : false,
                size: video ? (video.clientWidth * video.clientHeight) : 0,
                isMainFrame: window.self === window.top
            });
        } else if (msg.type === 'ping-videos') {
            const vs = findAllVideos();
            if (vs.length > 0) {
                const list = vs.map(v => {
                    if (!v.dataset.pipId) v.dataset.pipId = Math.random().toString(36).substring(2, 10);
                    return {
                        id: v.dataset.pipId,
                        playing: !v.paused && !v.ended && v.readyState > 2,
                        pip: document.pictureInPictureElement === v
                    };
                });
                chrome.runtime.sendMessage({ type: 'pong-videos', tabId: msg.tabId, videos: list });
            }
        } else if (msg.type === 'video-command') {
            const vs = findAllVideos();
            const v = vs.find(x => x.dataset.pipId === msg.id);
            if (v) {
                if (msg.command === 'play') v.play();
                else if (msg.command === 'pause') v.pause();
                else if (msg.command === 'forward') v.currentTime += 10;
                else if (msg.command === 'backward') v.currentTime -= 10;
                else if (msg.command === 'pip') {
                    if (document.pictureInPictureElement === v) document.exitPictureInPicture();
                    else { enablePIP(v); v.requestPictureInPicture(); }
                }
                sendResponse({ success: true });
            }
        }
    });

    // Listen for real-time settings changes across all frames/tabs
    if (chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local') {
                if (changes.onMediaPipIcon) {
                    onMediaPipIconEnabled = changes.onMediaPipIcon.newValue;
                    if (!onMediaPipIconEnabled) {
                        removeAllButtons();
                    } else {
                        document.documentElement.removeAttribute('data-pip-hide-icon');
                        scan();
                    }
                }
                if (changes.bigScreenMode) {
                    bigScreenModeEnabled = changes.bigScreenMode.newValue;
                    syncBigScreenMode();
                }
            }
        });
    }
    
    // Global PIP event listeners to catch all state changes
    document.addEventListener('enterpictureinpicture', () => updateButtons(true), true);
    document.addEventListener('leavepictureinpicture', () => updateButtons(false), true);

    // Periodic scan
    function scan() {
        const videos = findAllVideos();
        videos.forEach(v => {
            enablePIP(v);
            attachButton(v);
        });
        syncBigScreenMode();
    }

    scan();

    // Comprehensive Observer
    new MutationObserver((mutations) => {
        let shouldScan = false;
        for (const m of mutations) {
            if (m.addedNodes.length > 0) shouldScan = true;
        }
        if (shouldScan) scan();
    }).observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
    });

    // Fallback interval
    setInterval(scan, 1500);

    // ─── Shortcut Fallback ────────────────────────────────────────────
    // Since chrome.commands can be flaky or unbound, we listen manually too.
    document.addEventListener('keydown', (e) => {
        if (e.altKey && (e.code === 'KeyP' || e.key === 'p' || e.key === 'P')) {
            // We don't preventDefault() immediately to avoid breaking other things
            // unless we are sure we handled it.
            togglePIP(true);
        }
    });

})();
