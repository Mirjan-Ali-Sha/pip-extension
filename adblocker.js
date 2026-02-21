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
            const skipSelectors = [
                '.ytp-skip-ad-button',
                '.ytp-ad-skip-button',
                '.ytp-ad-skip-button-modern',
                'button.ytp-ad-skip-button',
                '.ytp-ad-skip-button-slot button',
                '.videoAdUiSkipButton',
                '[id="skip-button:8"] button',
                '.ytp-ad-skip-button-container button',
                'button[class*="skip"]'
            ];

            for (const sel of skipSelectors) {
                const btn = document.querySelector(sel);
                if (btn && btn.offsetParent !== null) {
                    btn.click();
                    return true;
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
            const video = document.querySelector('video');
            if (!video) return;

            if (isAdPlaying()) {
                // Mute during ad
                if (savedVolume === null && !video.muted) {
                    savedVolume = video.volume;
                    video.muted = true;
                }

                // Speed up to maximum
                if (!adSpeedApplied) {
                    try {
                        video.playbackRate = 16;
                    } catch (e) {
                        // Some players cap the rate; try lower
                        try { video.playbackRate = 8; } catch (e2) { /* ignore */ }
                    }
                    adSpeedApplied = true;
                }

                // Try to skip to end
                if (video.duration && isFinite(video.duration) && video.duration > 0) {
                    video.currentTime = video.duration - 0.1;
                }

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
                    const vid = document.querySelector('video');
                    if (vid) {
                        try { vid.playbackRate = 1; } catch (e) { /* ignore */ }
                    }
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
                    el.style.setProperty('display', 'none', 'important');
                });
            });
        }

        // Main YouTube ad-blocker loop
        function youtubeAdBlockerLoop() {
            tryClickSkip();
            fastForwardAd();
            hideYouTubeAdElements();
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

    // ─── General Cosmetic Ad Filter (All Sites) ──────────────────────

    function hideGeneralAds() {
        const adSelectors = [
            'ins.adsbygoogle',
            '[id*="google_ads"]',
            '[id*="ad-slot"]',
            '[id*="ad_slot"]',
            '[class*="ad-banner"]',
            '[class*="ad-container"]',
            '[class*="ad-wrapper"]',
            '[class*="adsbygoogle"]',
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

    console.log('[PIP Anywhere] Ad Blocker active.');
})();
