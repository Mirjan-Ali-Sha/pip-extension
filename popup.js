/**
 * PIP Anywhere — Popup Script
 */

const mediaList = document.getElementById('mediaList');
const settingsBlock = document.getElementById('settingsBlock');
const openSettings = document.getElementById('openSettings');

let allVideosCache = [];
let lastInteractionTime = 0; // Throttles polling during user action

const togglePipIcon = document.getElementById('togglePipIcon');

// Load settings safely
if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get({ onMediaPipIcon: true }, (result) => {
        if (togglePipIcon) togglePipIcon.checked = result.onMediaPipIcon;
    });
}

// Handle toggle changes safely
togglePipIcon?.addEventListener('change', () => {
    const enabled = togglePipIcon.checked;
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ onMediaPipIcon: enabled });
    }

    // Save to storage (content scripts will listen for changes via chrome.storage.onChanged)
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ onMediaPipIcon: enabled });
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
                        const netflixTitle = document.querySelector('.video-title h4, .player-status-main-title, .preview-title, .fallback-text');
                        if (netflixTitle) topTitle = netflixTitle.innerText || topTitle;
                        else if (topTitle === 'Netflix') topTitle = 'Playing on Netflix';
                    } else if (hn.includes('hotstar.com')) {
                        const hotstarTitle = document.querySelector('h1.title, .show-name, .tray-title');
                        if (hotstarTitle) topTitle = hotstarTitle.innerText || topTitle;
                    }

                    if (navigator.mediaSession && navigator.mediaSession.metadata) {
                        if (navigator.mediaSession.metadata.title && (!topTitle || topTitle.length < 5 || hn.includes('hotstar'))) {
                            topTitle = navigator.mediaSession.metadata.title;
                        }
                        if (navigator.mediaSession.metadata.artist && !topArtist) {
                            topArtist = navigator.mediaSession.metadata.artist;
                        }
                    }

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
                        // 1. Check YouTube specific ID
                        const urlParams = new URLSearchParams(window.location.search);
                        const ytId = urlParams.get('v');
                        if (hn.includes('youtube.com') && ytId) {
                            return `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
                        }

                        // 2. Check navigator.mediaSession
                        if (navigator.mediaSession && navigator.mediaSession.metadata && navigator.mediaSession.metadata.artwork) {
                            const artwork = navigator.mediaSession.metadata.artwork;
                            if (artwork.length > 0) return artwork[artwork.length - 1].src;
                        }

                        // 3. Check video poster
                        if (v.poster) return v.poster;

                        // 4. Check Open Graph image (Movie posters often here)
                        const ogImg = document.querySelector('meta[property="og:image"]') || document.querySelector('meta[name="twitter:image"]');
                        if (ogImg && ogImg.content) {
                            let src = ogImg.content;
                            if (src.startsWith('//')) src = 'https:' + src;
                            if (src.startsWith('/')) src = window.location.origin + src;
                            return src;
                        }

                        // 5. Check Zee5 specific poster elements
                        const z5Poster = document.querySelector('.posterContainer img, .videoThumb img');
                        if (z5Poster && z5Poster.src) return z5Poster.src;

                        return '';
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
                }
            });
        });

        mediaList.appendChild(card);
    });
}

// Initialize and auto-refresh every 1s while popup is open
loadAllMedia();
setInterval(loadAllMedia, 1000);
