/**
 * PIP Anywhere — Popup Script
 */

const mediaList = document.getElementById('mediaList');
const settingsBlock = document.getElementById('settingsBlock');
const openSettings = document.getElementById('openSettings');

let allVideosCache = [];
let lastInteractionTime = 0; // Throttles polling during user action

const togglePipIcon = document.getElementById('togglePipIcon');
const toggleBigScreen = document.getElementById('toggleBigScreen');
const toggleAdBlocker = document.getElementById('toggleAdBlocker');
const adblockerRow = document.getElementById('adblockerRow');
const adblockerLabel = document.getElementById('adblockerLabel');

let currentTabHostname = '';

// Load settings safely
if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get({ onMediaPipIcon: true, bigScreenMode: false }, (result) => {
        if (togglePipIcon) togglePipIcon.checked = result.onMediaPipIcon;
        if (toggleBigScreen) toggleBigScreen.checked = result.bigScreenMode;
    });
}

// Handle PIP Icon toggle changes
togglePipIcon?.addEventListener('change', () => {
    const enabled = togglePipIcon.checked;
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ onMediaPipIcon: enabled });
    }
});

// Handle Big Screen toggle changes
toggleBigScreen?.addEventListener('change', () => {
    const enabled = toggleBigScreen.checked;
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ bigScreenMode: enabled });
    }
});

// Domain-Specific Ad Blocker Toggle Init & Handler
if (chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0 && tabs[0].url && tabs[0].url.startsWith('http')) {
            currentTabHostname = getHostName(tabs[0].url);

            if (adblockerRow) {
                adblockerRow.style.display = 'flex';
                let shortHost = currentTabHostname.substring(0, 16);
                if (currentTabHostname.length > 16) shortHost += '...';
                adblockerLabel.textContent = `Ads Blocker (${shortHost})`;
            }

            chrome.storage.local.get([`adblockEnabled_${currentTabHostname}`], (result) => {
                const isUserPref = result[`adblockEnabled_${currentTabHostname}`] !== false; // Default true

                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () => {
                        if (window.location.hostname.includes('youtube.com')) {
                            const urlParams = new URLSearchParams(window.location.search);
                            const videoId = urlParams.get('v') || 'default';
                            const disableUntil = localStorage.getItem(`pip_yt_block_${videoId}`);
                            if (disableUntil && Date.now() < parseInt(disableUntil, 10)) {
                                return false; // Auto-disabled script
                            }
                        }
                        return true;
                    }
                }).then((results) => {
                    const isAutoEnabled = results && results[0] && results[0].result;
                    if (toggleAdBlocker) toggleAdBlocker.checked = isUserPref && isAutoEnabled;
                }).catch(() => {
                    if (toggleAdBlocker) toggleAdBlocker.checked = isUserPref;
                });
            });
        }
    });
}

// Handle Ad Blocker Toggle Setting
toggleAdBlocker?.addEventListener('change', () => {
    if (!currentTabHostname) return;
    const enabled = toggleAdBlocker.checked;

    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [`adblockEnabled_${currentTabHostname}`]: enabled });
    }

    if (enabled && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () => {
                        if (window.location.hostname.includes('youtube.com')) {
                            const urlParams = new URLSearchParams(window.location.search);
                            const videoId = urlParams.get('v') || 'default';
                            localStorage.removeItem(`pip_yt_block_${videoId}`);
                        }
                    }
                }).catch(() => { });
            }
        });
    }
});

openSettings.addEventListener('click', () => {
    // chrome:// is universally aliased in Edge, Brave, and Opera to their respective internal schemes.
    // We target the shortcuts page specifically to help users configure Alt+P.
    chrome.tabs.create({ url: "chrome://extensions" }).catch(() => {
        chrome.tabs.create({ url: "chrome://extensions" });
    });
});

async function loadAllMedia(force = false) {
    // If not forced (polling), skip if user is currently interacting
    if (!force && (Date.now() - lastInteractionTime < 2500)) return;

    allVideosCache = [];
    try {
        const tabs = await chrome.tabs.query({});
        const validTabs = tabs.filter(t => t.url && (t.url.startsWith('http') || t.url.startsWith('file')));

        const promises = validTabs.map(tab => {
            return chrome.scripting.executeScript({
                target: { tabId: tab.id, allFrames: true },
                func: () => {
                    let topTitle = document.title || '';
                    let topArtist = '';
                    const hn = window.location.hostname;

                    if (hn.includes('youtube.com')) {
                        const titleEl = document.querySelector('h1.ytd-video-primary-info-renderer, ytd-watch-metadata h1');
                        if (titleEl) topTitle = titleEl.innerText || topTitle;

                        const artistEl = document.querySelector('#owner-name a, ytd-channel-name a, .ytp-title-channel-name');
                        if (artistEl) topArtist = artistEl.innerText;
                    } else if (hn.includes('netflix.com')) {
                        const netflixTitle = document.querySelector('.video-title, .player-status-main-title, [data-uia="video-title"], .ellipsize-text, .player-status-title h4');
                        if (netflixTitle) topTitle = netflixTitle.innerText || topTitle;

                        if (topTitle === 'Netflix') topTitle = 'Playing on Netflix';
                    } else if (hn.includes('hotstar.com')) {
                        // Aggressive Hotstar Show Title Search
                        const selectors = [
                            'h1[class*="title" i]', 'h2[class*="title" i]',
                            '.show-title', '.content-title', '.watch-title', '.title-name',
                            '.title-container h1', '.video-title', '.title-text'
                        ];
                        for (const sel of selectors) {
                            const el = document.querySelector(sel);
                            if (el && el.innerText && el.innerText.length > 3) {
                                topTitle = el.innerText;
                                break;
                            }
                        }

                        // Clean up generic JioHotstar page titles
                        if (topTitle.includes('JioHotstar') || topTitle.includes('Watch TV Shows')) {
                            topTitle = topTitle.replace(/JioHotstar\s*-\s*/i, '')
                                .replace(/\s*-\s*Watch TV Shows.*$/i, '')
                                .trim();
                        }
                    }

                    if (navigator.mediaSession && navigator.mediaSession.metadata) {
                        const meta = navigator.mediaSession.metadata;
                        // Only override if the mediaSession title looks more specific than our generic site title
                        if (meta.title && meta.title.length > 5 && !meta.title.includes('JioHotstar') && meta.title !== 'Netflix') {
                            topTitle = meta.title;
                        }
                        if (meta.artist && !topArtist) {
                            topArtist = meta.artist;
                        }
                    }

                    // Final fallback cleanup for any site
                    if (topTitle.length > 60) topTitle = topTitle.substring(0, 57) + '...';

                    function findAllVideos(root = document) {
                        let videos = [];
                        root.querySelectorAll('video').forEach(n => {
                            const rect = n.getBoundingClientRect();
                            const style = window.getComputedStyle(n);

                            // Native Chrome Media Control follows these heuristics:
                            // 1. Must be reasonably sized (streaming players)
                            // 2. Must be visible (display, visibility, opacity)
                            // 3. MOST IMPORTANT: Must have actually been played or be currently playing

                            const hasBeenPlayed = n.currentTime > 0 || !n.paused || (n.played && n.played.length > 0);
                            const isVisible = rect.width > 30 && rect.height > 30 &&
                                style.display !== 'none' &&
                                style.visibility !== 'hidden' &&
                                style.opacity !== '0';

                            // Amazon often has background videos that are "ready" but not meant for users.
                            // Streaming sites like AirtelXstream sometimes have videos hidden behind overlays.
                            if (isVisible && hasBeenPlayed && n.readyState >= 1) {
                                videos.push(n);
                            }
                        });

                        // Recursive check for shadow DOMs
                        root.querySelectorAll('*').forEach(n => {
                            if (n.shadowRoot) {
                                videos = videos.concat(findAllVideos(n.shadowRoot));
                            }
                        });

                        return videos;
                    }
                    function getBestThumbnail(v) {
                        const urlParams = new URLSearchParams(window.location.search);
                        const ytId = urlParams.get('v');

                        // 1. YouTube Specific High-Res
                        if (hn.includes('youtube.com') && ytId) {
                            return `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
                        }

                        // 2. Navigator.mediaSession Artwork (highest quality if set)
                        if (navigator.mediaSession && navigator.mediaSession.metadata && navigator.mediaSession.metadata.artwork) {
                            const artwork = navigator.mediaSession.metadata.artwork;
                            if (artwork.length > 0) return artwork[artwork.length - 1].src;
                        }

                        // 3. Platform-Specific Heuristics (Netflix, Hotstar, Zee5)
                        if (hn.includes('netflix.com')) {
                            const netflixImg = document.querySelector('.video-title img, .player-poster img, [data-uia="mini-modal-video"] img, .ellipsize-text + img');
                            if (netflixImg && netflixImg.src && !netflixImg.src.includes('logo')) return netflixImg.src;
                        } else if (hn.includes('hotstar.com')) {
                            const hotstarImg = document.querySelector('.poster-container img, .tile-image img, .tray-image img, .detail-image img');
                            if (hotstarImg && hotstarImg.src) return hotstarImg.src;
                        } else if (hn.includes('zee5.com')) {
                            const z5Img = document.querySelector('.posterContainer img, .videoThumb img, .main-poster img');
                            if (z5Img && z5Img.src) return z5Img.src;
                        }

                        // 4. Video Poster Attribute
                        if (v.poster) return v.poster;

                        // 5. OpenGraph & Meta Metadata (High to Low priority)
                        const metaSelectors = [
                            'meta[property="og:image:secure_url"]',
                            'meta[property="og:image"]',
                            'meta[name="twitter:image"]',
                            'link[rel="image_src"]',
                            'link[rel="shortcut icon"]'
                        ];
                        for (const sel of metaSelectors) {
                            const el = document.querySelector(sel);
                            const content = el ? (el.content || el.href) : null;
                            if (content && content.length > 10 && !content.includes('favicon')) {
                                let src = content;
                                if (src.startsWith('//')) src = 'https:' + src;
                                if (src.startsWith('/')) src = window.location.origin + src;
                                return src;
                            }
                        }

                        // 6. Largest Image Area Fallback
                        // Scans the page for the largest visible image (likely the show poster/billboard)
                        let bestImg = '';
                        let maxArea = 0;
                        document.querySelectorAll('img').forEach(img => {
                            const rect = img.getBoundingClientRect();
                            const area = rect.width * rect.height;
                            if (area > maxArea && rect.width > 100 && rect.height > 100) {
                                // Filter out common UI elements (logos, profile pics)
                                const src = img.src || '';
                                if (!src.includes('logo') && !src.includes('avatar') && !src.includes('icon')) {
                                    maxArea = area;
                                    bestImg = src;
                                }
                            }
                        });

                        return bestImg || '';
                    }

                    const vs = findAllVideos();
                    if (vs.length === 0) return null;

                    // Fallback Artist/Source to Site name if not found
                    if (!topArtist) {
                        const host = window.location.hostname.replace('www.', '');
                        topArtist = host.charAt(0).toUpperCase() + host.slice(1).split('.')[0];
                        // If it's a known service, capitalize better
                        if (host.includes('youtube')) topArtist = 'YouTube';
                        if (host.includes('netflix')) topArtist = 'Netflix';
                        if (host.includes('amazon')) topArtist = 'Amazon';
                        if (host.includes('hotstar')) topArtist = 'Hotstar';
                        if (host.includes('airtelxstream')) topArtist = 'AirtelXstream';
                    }

                    return vs.map(v => {
                        if (!v.dataset.pipId) v.dataset.pipId = Math.random().toString(36).substring(2, 10);
                        return {
                            id: v.dataset.pipId,
                            playing: !v.paused && !v.ended && v.readyState > 2,
                            pip: document.pictureInPictureElement === v,
                            muted: v.muted,
                            currentTime: v.currentTime || 0,
                            duration: v.duration || 0,
                            poster: getBestThumbnail(v),
                            mediaTitle: topTitle,
                            mediaArtist: topArtist
                        };
                    });
                }
            }).then(results => {
                let frameVideos = [];
                for (let r of results) {
                    if (r.result) {
                        frameVideos = frameVideos.concat(r.result);
                    }
                }
                if (frameVideos.length > 0) {
                    frameVideos.forEach(v => {
                        v.tabId = tab.id;
                        v.tabTitle = tab.title;
                        v.tabUrl = tab.url;
                        v.favIconUrl = tab.favIconUrl;
                    });
                    return frameVideos;
                }
                return null;
            }).catch(e => null);
        });

        const gathered = await Promise.all(promises);
        gathered.forEach(res => {
            if (res) allVideosCache = allVideosCache.concat(res);
        });

        renderMediaList();

    } catch (e) {
        mediaList.innerHTML = '<div class="empty-state">Error scanning tabs.</div>';
    }
}

function getHostName(url) {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch (e) { return 'unknown'; }
}

function sendCommand(tabId, videoId, command) {
    const isMultiPip = localStorage.getItem('multiple_pip') === 'true';

    chrome.scripting.executeScript({
        target: { tabId: tabId, allFrames: true },
        func: (vid, cmd, multiPip) => {
            function findAllVideos(root = document) {
                let videos = [];
                root.querySelectorAll('*').forEach(n => {
                    if (n.tagName === 'VIDEO') videos.push(n);
                    if (n.shadowRoot) videos = videos.concat(findAllVideos(n.shadowRoot));
                });
                return videos;
            }
            const v = findAllVideos().find(x => x.dataset.pipId === vid);
            if (v) {
                if (cmd === 'play') v.play();
                else if (cmd === 'pause') v.pause();
                else if (cmd === 'forward') v.currentTime += 10;
                else if (cmd === 'backward') v.currentTime -= 10;
                else if (cmd === 'mute') v.muted = true;
                else if (cmd === 'unmute') v.muted = false;
                else if (cmd === 'pip') {
                    if (document.pictureInPictureElement === v) {
                        document.exitPictureInPicture().catch(() => { });
                    } else {
                        if (v.hasAttribute('disablepictureinpicture')) v.removeAttribute('disablepictureinpicture');
                        try { v.disablePictureInPicture = false; } catch (e) { }
                        v.requestPictureInPicture().catch(() => { });
                    }
                }
            }
        },
        args: [videoId, command, isMultiPip]
    }).then(() => {
        // Force a refresh after a reasonable delay for state to sync
        setTimeout(() => loadAllMedia(true), 600);
    }).catch(e => {
        setTimeout(() => loadAllMedia(true), 600);
    });
}

function getThemeColor(host) {
    if (host.includes('youtube')) return '#60412e'; // Orange-brown like screenshot
    if (host.includes('netflix')) return '#232937'; // Dark blue-grey
    if (host.includes('amazon')) return '#232f3e'; // Amazon Navy
    if (host.includes('hotstar')) return '#0d1d2e'; // Hotstar Blue
    return '#292a2d'; // Default
}

function renderMediaList() {
    if (allVideosCache.length === 0) {
        mediaList.innerHTML = '<div class="empty-state">No active media found.</div>';
        settingsBlock.style.display = 'none';
        return;
    }

    settingsBlock.style.display = 'flex';

    // Sort: pip first, then playing first
    allVideosCache.sort((a, b) => {
        if (a.pip && !b.pip) return -1;
        if (!a.pip && b.pip) return 1;
        return (b.playing ? 1 : 0) - (a.playing ? 1 : 0);
    });

    mediaList.innerHTML = '';

    // Solid SVG Icons for Media Centre
    const iconRewind = `<svg width="18" height="18" viewBox="0 0 24 24"><path d="M11 18l-9-6 9-6v12zm11 0l-9-6 9-6v12z"/></svg>`;
    const iconForward = `<svg width="18" height="18" viewBox="0 0 24 24"><path d="M13 6v12l9-6-9-6zm-11 0v12l9-6-9-6z"/></svg>`;
    const iconPlay = `<svg width="22" height="22" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
    const iconPause = `<svg width="22" height="22" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
    const iconUnmute = `<svg width="18" height="18" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
    const iconMute = `<svg width="18" height="18" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
    const iconPip = `<svg width="18" height="18" viewBox="0 0 24 24"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zm-10-7h9v6h-9z"/></svg>`;

    allVideosCache.forEach(v => {
        const card = document.createElement('div');
        card.className = `media-card`;

        const isPlaying = v.playing;
        let favIcon = v.favIconUrl ? `<img src="${v.favIconUrl}" onerror="this.style.display='none'"/>` : ``;
        let hostName = getHostName(v.tabUrl);
        let posterUrl = v.poster || v.favIconUrl || 'icons/icon128.png';

        let mTitle = v.mediaTitle || v.tabTitle || 'Unknown Media';
        let mArtist = v.mediaArtist || 'Media source';

        const themeColor = getThemeColor(hostName);

        let pct = 0;
        if (v.duration > 0) {
            pct = (v.currentTime / v.duration) * 100;
            if (pct > 100) pct = 100;
            if (pct < 0) pct = 0;
        }

        // Click-to-Tab (whole card but skip buttons)
        card.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('.progress-bar-container')) return;
            chrome.tabs.update(v.tabId, { active: true });
            chrome.windows.update(v.windowId, { focused: true });
        });

        card.innerHTML = `
            <div class="card-left" style="background-color: ${themeColor}">
                <div class="info-top">
                    <div class="domain-group">${favIcon} ${hostName}</div>
                    <div class="media-title" title="${mTitle}">${mTitle}</div>
                    <div class="media-subtitle" title="${mArtist}">${mArtist}</div>
                </div>
                
                <div class="control-row">
                    <button class="btn-ctrl" data-cmd="backward" title="Rewind 10s">${iconRewind}</button>
                    <button class="btn-ctrl btn-play" data-cmd="${isPlaying ? 'pause' : 'play'}" title="${isPlaying ? 'Pause' : 'Play'}">
                        ${isPlaying ? iconPause : iconPlay}
                    </button>
                    <button class="btn-ctrl" data-cmd="forward" title="Forward 10s">${iconForward}</button>
                    <div class="divider-vertical"></div>
                    <button class="btn-ctrl btn-mute" data-cmd="${v.muted ? 'unmute' : 'mute'}" title="${v.muted ? 'Unmute' : 'Mute'}">
                        ${v.muted ? iconMute : iconUnmute}
                    </button>
                    <div class="divider-vertical"></div>
                    <button class="btn-ctrl btn-pip ${v.pip ? 'active-pip' : ''}" data-cmd="pip" title="Picture-in-Picture">
                        ${iconPip}
                    </button>
                </div>
            </div>
            
            <div class="card-right" style="background-color: ${themeColor}">
                <div class="thumbnail-bg" style="background-image: url('${posterUrl}')"></div>
                <button class="btn-dismiss" title="Dismiss" data-tabid="${v.tabId}">
                     <svg width="14" height="14" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
            </div>

            <div class="progress-bar-container">
                <div class="progress-bar-interactive" data-vid="${v.id}">
                    <div class="progress-fill-bold" style="width: ${pct}%"></div>
                </div>
            </div>
        `;

        // Dismiss button logic (Close tab or just hide?)
        // Standard media control usually just closes the session, but here we'll offer a way to close the tab.
        card.querySelector('.btn-dismiss').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Close this tab?')) {
                chrome.tabs.remove(v.tabId);
            }
        });

        // Interactive Seeker Logic
        const seeker = card.querySelector('.progress-bar-interactive');
        seeker.addEventListener('click', (e) => {
            e.stopPropagation();
            lastInteractionTime = Date.now();
            const rect = seeker.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const clickedPct = x / rect.width;
            const seekTime = clickedPct * v.duration;

            // Send seek command (using script injection for precision)
            chrome.scripting.executeScript({
                target: { tabId: v.tabId, allFrames: true },
                func: (vid, time) => {
                    function findV(root = document) {
                        let res = [...root.querySelectorAll('video')];
                        root.querySelectorAll('*').forEach(n => { if (n.shadowRoot) res = res.concat(findV(n.shadowRoot)); });
                        return res;
                    }
                    const video = findV().find(x => x.dataset.pipId === vid);
                    if (video && isFinite(time)) video.currentTime = time;
                },
                args: [v.id, seekTime]
            });

            // Visual feedback (instant update)
            card.querySelector('.progress-fill-bold').style.width = `${clickedPct * 100}%`;
        });

        card.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click (tab switch)
                const cmd = btn.dataset.cmd;
                lastInteractionTime = Date.now();
                sendCommand(v.tabId, v.id, cmd);

                if (cmd === 'pause') {
                    btn.dataset.cmd = 'play';
                    btn.innerHTML = iconPlay;
                } else if (cmd === 'play') {
                    btn.dataset.cmd = 'pause';
                    btn.innerHTML = iconPause;
                } else if (cmd === 'mute') {
                    btn.dataset.cmd = 'unmute';
                    btn.innerHTML = iconMute;
                } else if (cmd === 'unmute') {
                    btn.dataset.cmd = 'mute';
                    btn.innerHTML = iconUnmute;
                }
            });
        });

        mediaList.appendChild(card);
    });
}

// Initialize and auto-refresh every 1s while popup is open
loadAllMedia();
setInterval(loadAllMedia, 1000);
