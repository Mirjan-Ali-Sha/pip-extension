/**
 * PIP Anywhere — Ad Blocker Content Script
 * @author Mirjan Ali Sha <mastools.help@gmail.com>
 *
 * Dual approach:
 * 1. YouTube Ad Skipper — auto-clicks skip buttons, fast-forwards unskippable ads
 * 2. General Cosmetic Filter — hides common ad containers on all sites
 */

(function () {
    'use strict';

    if (window.__pipAdBlockerInjected) return;
    window.__pipAdBlockerInjected = true;

    // ─── Domain-level Ad Blocker State Tracking ─────────────────────
    let isUserAdblockEnabled = true;
    const currentHost = window.location.hostname.replace('www.', '');

    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([`adblockEnabled_${currentHost}`], (result) => {
            if (result[`adblockEnabled_${currentHost}`] !== undefined) {
                isUserAdblockEnabled = result[`adblockEnabled_${currentHost}`];
            }
        });

        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes[`adblockEnabled_${currentHost}`]) {
                isUserAdblockEnabled = changes[`adblockEnabled_${currentHost}`].newValue;
            }
        });
    }

    const isYouTube = window.location.hostname.includes('youtube.com');

    // ─── YouTube Ad Skipper ───────────────────────────────────────────

    if (isYouTube) {
        let savedVolume = null;
        let adSpeedApplied = false;

        /**
         * Attempt to click skip buttons.
         * Returns true if a skip button was found and clicked.
         */
        function tryClickSkip() {
            const player = document.querySelector('.html5-video-player');
            if (!player) return false;

            const skipSelectors = [
                '.ytp-skip-ad-button',
                '.ytp-ad-skip-button',
                '.ytp-ad-skip-button-modern',
                'button.ytp-ad-skip-button',
                '.ytp-ad-skip-button-slot button',
                '.videoAdUiSkipButton',
                '[id^="skip-button"] button',
                '.ytp-ad-skip-button-container button',
                'button[class*="skip"]',
                '.ytp-ad-text.ytp-ad-skip-button-text'
            ];

            for (const sel of skipSelectors) {
                const buttons = player.querySelectorAll(sel);
                for (const btn of buttons) {
                    if (btn && btn.offsetParent !== null) {
                        btn.click();
                        return true;
                    }
                }
            }
            
            // Text-based fallback for dynamically obfuscated buttons
            const allButtons = player.querySelectorAll('button, .ytp-ad-text');
            for (const btn of allButtons) {
                if (btn && btn.offsetParent !== null) {
                    const text = btn.innerText.toLowerCase();
                    if (text === 'skip ad' || text === 'skip ads' || text === 'skip') {
                        btn.click();
                        return true;
                    }
                }
            }
            
            return false;
        }

        /**
         * Detect if an ad is currently playing.
         */
        function isAdPlaying() {
            const player = document.querySelector('.html5-video-player');
            if (!player) return false;
            return player.classList.contains('ad-showing') ||
                player.classList.contains('ad-interrupting');
        }

        /**
         * Fast-forward through unskippable ads.
         */
        function fastForwardAd() {
            const player = document.querySelector('.html5-video-player');
            if (!player) return;

            const video = player.querySelector('video');
            if (!video) return;

            if (isAdPlaying()) {
                // Mute during ad
                if (savedVolume === null && !video.muted) {
                    savedVolume = video.volume;
                    video.muted = true;
                }

                // Speed up to maximum constantly
                try {
                    video.playbackRate = 16;
                } catch (e) {
                    // Some players cap the rate; try lower
                    try { video.playbackRate = 8; } catch (e2) { /* ignore */ }
                }
                adSpeedApplied = true;

                // Keep trying to click skip
                tryClickSkip();

            } else {
                // Ad ended — restore settings
                if (savedVolume !== null) {
                    video.muted = false;
                    video.volume = savedVolume;
                    savedVolume = null;
                }
                if (adSpeedApplied) {
                    try { video.playbackRate = 1; } catch (e) { /* ignore */ }
                    adSpeedApplied = false;
                }
            }
        }

        /**
         * Hide YouTube overlay and companion ads.
         */
        function hideYouTubeAdElements() {
            const adSelectors = [
                '.ytp-ad-overlay-container',
                '.ytp-ad-overlay-slot',
                '.ytp-ad-overlay-image',
                '.ytp-ad-overlay-close-button',
                '#player-ads',
                '#masthead-ad',
                '#promotions',
                'ytd-promoted-sparkles-web-renderer',
                'ytd-promoted-video-renderer',
                'ytd-display-ad-renderer',
                'ytd-companion-slot-renderer',
                'ytd-action-companion-ad-renderer',
                'ytd-in-feed-ad-layout-renderer',
                'ytd-ad-slot-renderer',
                'ytd-banner-promo-renderer',
                'ytd-statement-banner-renderer',
                'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
                '.ytd-merch-shelf-renderer',
                '.ytd-promoted-sparkles-text-search-renderer',
                '#below ytd-merch-shelf-renderer',
                'tp-yt-paper-dialog:has(#mealbar-promo-renderer)',      // promo popups
                '.ytp-ad-message-container',
                '.ytp-ad-text',
                '.ytp-ad-preview-container',
                '.ytp-ad-player-overlay-instream-info'
            ];

            adSelectors.forEach(sel => {
                document.querySelectorAll(sel).forEach(el => {
                    el.style.setProperty('opacity', '0', 'important');
                    el.style.setProperty('pointer-events', 'none', 'important');
                });
            });
        }

        let hideCosmetic = true;
        let skipAdsEnabled = true;
        let antiAdblockCloseAttempts = 0;

        // Force reset YouTube-specific bans on toggle change (if the user manually overrides)
        if (chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, area) => {
                if (area === 'local' && changes[`adblockEnabled_${currentHost}`]) {
                    if (changes[`adblockEnabled_${currentHost}`].newValue === true) {
                        const urlParams = new URLSearchParams(window.location.search);
                        const videoId = urlParams.get('v') || 'default';
                        localStorage.removeItem(`pip_yt_block_${videoId}`);
                        skipAdsEnabled = true;
                        hideCosmetic = true;
                    }
                }
            });
        }

        /**
         * Detect anti-adblock enforcement and disable cosmetic filters if needed.
         */
        function checkAndBypassAntiAdblock() {
            const selectors = [
                'ytd-enforcement-message-view-model',
                'tp-yt-paper-dialog',
                '#error-screen',
                '.ytp-error',
                'ytd-popup-container'
            ];
            
            let enforcementEl = null;
            
            // Helper to pierce shadow DOM for text
            function hasAdblockText(node) {
                if (!node) return false;
                const text = (node.innerText || node.textContent || '').toLowerCase();
                if (text.includes('ad blocker') || text.includes('allow youtube ads')) return true;
                if (node.shadowRoot) {
                    if (hasAdblockText(node.shadowRoot)) return true;
                }
                for (let i = 0; i < node.children.length; i++) {
                    if (hasAdblockText(node.children[i])) return true;
                }
                return false;
            }

            for (const sel of selectors) {
                try {
                    const elements = document.querySelectorAll(sel);
                    for (const el of elements) {
                        const rect = el.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            if (hasAdblockText(el)) {
                                enforcementEl = el;
                                break;
                            }
                        }
                    }
                    if (enforcementEl) break;
                } catch(e) {}
            }
            
            if (enforcementEl) {
                // 1st try: Attempt to find a dismiss/close button and click it
                // Need to pierce shadow DOM to find close buttons as well
                let closeBtn = enforcementEl.querySelector('#dismiss-button, .ytp-ad-overlay-close-button, button[aria-label="Close"], button[aria-label="Dismiss"]');
                if (!closeBtn && enforcementEl.shadowRoot) {
                     closeBtn = enforcementEl.shadowRoot.querySelector('#dismiss-button, button[aria-label="Close"]');
                }
                
                if (closeBtn && antiAdblockCloseAttempts < 3) {
                    closeBtn.click();
                    antiAdblockCloseAttempts++;
                    // Resume video if it was paused
                    const vid = document.querySelector('video');
                    if (vid && vid.paused) vid.play().catch(()=>{});
                    console.log('[PIP Anywhere] Attempted to dismiss YouTube anti-adblock modal.');
                    return true;
                }
                
                // If no close button, or we tried too many times (strict block):
                const urlParams = new URLSearchParams(window.location.search);
                const videoId = urlParams.get('v') || 'default';
                const blockKey = `pip_yt_block_${videoId}`;
                
                const disableUntil = localStorage.getItem(blockKey);
                if (!disableUntil || Date.now() > parseInt(disableUntil, 10)) {
                    // Disable for 10 minutes (600,000ms) for this specific URL
                    localStorage.setItem(blockKey, Date.now() + 600000);
                    console.log(`[PIP Anywhere] YouTube strict block detected for video ${videoId}. Temporarily disabling adblock features for 10 mins.`);
                    window.location.reload();
                    return true;
                }
            }
            return false;
        }

        // Initialize based on current video's block status
        const urlParams = new URLSearchParams(window.location.search);
        const videoId = urlParams.get('v') || 'default';
        const blockKey = `pip_yt_block_${videoId}`;
        const disableUntil = localStorage.getItem(blockKey);
        
        if (disableUntil && Date.now() < parseInt(disableUntil, 10)) {
            hideCosmetic = false;
            skipAdsEnabled = false;
            const remaining = Math.round((parseInt(disableUntil, 10) - Date.now()) / 1000 / 60);
            console.log(`[PIP Anywhere] YouTube ad features disabled for this video for ~${remaining} more minutes.`);
        } else if (disableUntil) {
            localStorage.removeItem(blockKey);
        }

        // Main YouTube ad-blocker loop
        function youtubeAdBlockerLoop() {
            if (!isUserAdblockEnabled) return;
            if (checkAndBypassAntiAdblock()) return;

            if (skipAdsEnabled) {
                tryClickSkip();
                fastForwardAd();
            }
            
            if (hideCosmetic) {
                hideYouTubeAdElements();
            }
        }

        // Run frequently for responsive ad skipping
        setInterval(youtubeAdBlockerLoop, 300);

        // Also observe DOM changes for new ad elements
        const ytObserver = new MutationObserver((mutations) => {
            let shouldCheck = false;
            for (const m of mutations) {
                if (m.addedNodes.length > 0 || m.type === 'attributes') {
                    shouldCheck = true;
                    break;
                }
            }
            if (shouldCheck) {
                youtubeAdBlockerLoop();
            }
        });

        // Start observing once body is ready
        const startYTObserver = () => {
            const target = document.querySelector('.html5-video-player') || document.body;
            if (target) {
                ytObserver.observe(target, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['class']
                });
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startYTObserver);
        } else {
            startYTObserver();
        }

        console.log('[PIP Anywhere] YouTube Ad Skipper active.');
    }

    // ─── Hotstar Ad Skipper ───────────────────────────────────────────

    const isHotstar = window.location.hostname.includes('hotstar.com');

    if (isHotstar) {
        let savedVolume = null;

        function hotstarAdBlockerLoop() {
            if (!isUserAdblockEnabled) return;
            // 1. Specific Selectors only (No heavy DOM lookups like innerText)
            const skipSelectors = [
                '.ad-skip-btn',
                '.skip-button',
                '.skip-btn',
                '[aria-label*="skip" i]',
                '[aria-label*="Skip Ad" i]',
                '[class*="skip-button" i]',
                '[class*="SkipBtn" i]',
                'button.ad-skip'
            ];

            let isAdPlaying = false;

            // 1. Efficient Text Check (No Reflow unless matched)
            const elements = document.querySelectorAll('span, div, button, a');
            for (let i = 0; i < elements.length; i++) {
                const el = elements[i];
                if (el.childElementCount > 2) continue; // Skip wrappers

                const txt = (el.textContent || '').trim().toLowerCase();
                if (!txt || txt.length > 25) continue; // Ignore empty or long texts

                const isSkipBtn = (txt === 'skip ad' || txt === 'skip ads' || txt === 'skip');
                const isAdBadge = (txt === 'advertisement' || txt === 'ad' || txt.startsWith('ad 1 of') || txt.startsWith('ad 2 of'));

                if (isSkipBtn) {
                    if (el.offsetWidth > 0 || el.offsetHeight > 0) {
                        el.click();
                        isAdPlaying = true;
                    }
                } else if (isAdBadge) {
                    if (el.offsetWidth > 0 || el.offsetHeight > 0) {
                        isAdPlaying = true;
                    }
                }
            }

            // 2. Attempt to click skip buttons (Attribute Fallback)
            if (!isAdPlaying) {
                for (const sel of skipSelectors) {
                    const buttons = document.querySelectorAll(sel);
                    for (const btn of buttons) {
                        if (btn && btn.offsetParent !== null) {
                            btn.click();
                            isAdPlaying = true;
                        }
                    }
                }
            }

            const video = document.querySelector('video');
            if (!video) return;

            // 3. Check Ad Indicators with specific selectors only
            if (!isAdPlaying) {
                const adIndicators = document.querySelectorAll(
                    '[class*="ad-container" i], ' +
                    '[class*="AdBadge" i], ' +
                    '[class*="advert-badge" i], ' +
                    '[class*="advertisement" i], ' +
                    '[data-testid="bbtype-video" i]'
                );
                for (const ind of adIndicators) {
                    if (ind && ind.offsetParent !== null) {
                        isAdPlaying = true;
                        break;
                    }
                }
            }

            // 4. Fast-forward if ad is playing
            if (isAdPlaying) {
                if (savedVolume === null && !video.muted) {
                    savedVolume = video.volume;
                    video.muted = true;
                }
                try { video.playbackRate = 16; } catch (e) {}
                try { video.currentTime += 2; } catch (e) {} // Extra boost for SSAI ad segments
            } else {
                if (savedVolume !== null) {
                    video.muted = false;
                    video.volume = savedVolume;
                    savedVolume = null;
                }
                try { 
                    if (video.playbackRate > 2) video.playbackRate = 1; 
                } catch (e) {}
            }
        }

        // Run interval only (no heavy body mutation observer)
        setInterval(hotstarAdBlockerLoop, 600);

        console.log('[PIP Anywhere] Hotstar Ad Skipper active (Lightweight).');
    }

    // ─── General Cosmetic Ad Filter (All Sites) ──────────────────────

    function hideGeneralAds() {
        if (!isUserAdblockEnabled) return;
        
        const adSelectors = [
            'ins.adsbygoogle',
            '[id*="google_ads"]',
            '[id*="ad-slot"]',
            '[id*="ad_slot"]',
            '[class^="ad-banner"]', '[class*=" ad-banner"]', '[class*="-ad-banner"]',
            '[class^="ad-container"]', '[class*=" ad-container"]', '[class*="-ad-container"]',
            '[class^="ad-wrapper"]', '[class*=" ad-wrapper"]', '[class*="-ad-wrapper"]',
            '[class^="ad-slot"]', '[class*=" ad-slot"]', '[class*="-ad-slot"]',
            '[class*="adsbygoogle"]',
            '[data-testid="bbtype-video"]',
            'iframe[src*="doubleclick.net"]',
            'iframe[src*="googlesyndication.com"]',
            'iframe[src*="googleadservices.com"]',
            'iframe[id*="google_ads"]',
            '[data-ad]',
            '[data-ad-slot]',
            '[data-ad-client]',
            '[data-adunit]',
            '.ad-placeholder',
            '.sponsored-content',
            '.advertisement',
            'div[aria-label="advertisement"]',
            'aside[aria-label="Sponsored"]'
        ];

        adSelectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                if (el.offsetHeight > 0) {
                    el.style.setProperty('display', 'none', 'important');
                }
            });
        });
    }

    const isZee5 = window.location.hostname.includes('zee5.com');

    if (!isYouTube && !isZee5 && !isHotstar) {
        // Run cosmetic filter periodically (catches dynamically loaded ads)
        hideGeneralAds();
        setInterval(hideGeneralAds, 2000);

        // Observe for new ad elements
        new MutationObserver(() => {
            hideGeneralAds();
        }).observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    console.log('[PIP Anywhere] Ad Blocker active.');
})();
