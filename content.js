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
            updateButtons(true);

            video.addEventListener('leavepictureinpicture', () => {
                updateButtons(false);
            }, { once: true });

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

        parent.appendChild(btn);
    }

    function updateButtons(active) {
        document.querySelectorAll(`.${PIP_BUTTON_CLASS}`).forEach(btn => {
            btn.classList.toggle(PIP_ACTIVE_CLASS, active);
        });
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

    // Message from background
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
        }
    });

    // Periodic scan
    function scan() {
        const videos = findAllVideos();
        videos.forEach(v => {
            enablePIP(v);
            attachButton(v);
        });
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

})();
