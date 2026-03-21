/**
 * PIP Anywhere — Popup Script
 */

const mediaList = document.getElementById('mediaList');
const settingsBlock = document.getElementById('settingsBlock');
const openSettings = document.getElementById('openSettings');

let allVideosCache = [];

openSettings.addEventListener('click', () => {
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

async function loadAllMedia() {
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
                        root.querySelectorAll('*').forEach(n => {
                            if (n.tagName === 'VIDEO') {
                                const rect = n.getBoundingClientRect();
                                if (rect.width > 20 && rect.height > 20) videos.push(n);
                            }
                            if (n.shadowRoot) videos = videos.concat(findAllVideos(n.shadowRoot));
                        });
                        return videos;
                    }
                    const vs = findAllVideos();
                    if (vs.length === 0) return null;
                    
                    return vs.map(v => {
                        if (!v.dataset.pipId) v.dataset.pipId = Math.random().toString(36).substring(2, 10);
                        return {
                            id: v.dataset.pipId,
                            playing: !v.paused && !v.ended && v.readyState > 2,
                            pip: document.pictureInPictureElement === v,
                            currentTime: v.currentTime || 0,
                            duration: v.duration || 0,
                            poster: v.poster || '',
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
    } catch(e) { return 'unknown'; }
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
                        document.exitPictureInPicture().catch(()=>{});
                    } else {
                        if (v.hasAttribute('disablepictureinpicture')) v.removeAttribute('disablepictureinpicture');
                        try { v.disablePictureInPicture = false; } catch (e) {}
                        v.requestPictureInPicture().catch(()=>{});
                    }
                }
            }
        },
        args: [videoId, command, isMultiPip]
    }).then(() => {
        setTimeout(loadAllMedia, 400);
    }).catch(e => {
        setTimeout(loadAllMedia, 400);
    });
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
    
    const iconRewind = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 19l-9-7 9-7v14z"></path><path d="M22 19l-9-7 9-7v14z"></path></svg>`;
    const iconForward = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 19l9-7-9-7v14z"></path><path d="M2 19l9-7-9-7v14z"></path></svg>`;
    const iconPlay = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    const iconPause = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
    const iconPip = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"></rect><rect x="12" y="10" width="8" height="6" rx="1" fill="currentColor" opacity="1"></rect></svg>`;
    
    allVideosCache.forEach(v => {
        const card = document.createElement('div');
        card.className = `gmc-card`;
        
        const isPlaying = v.playing;
        let favIcon = v.favIconUrl ? `<img src="${v.favIconUrl}" onerror="this.style.display='none'"/>` : ``;
        let hostName = getHostName(v.tabUrl);
        let posterUrl = v.poster || v.favIconUrl || 'icons/icon128.png';
        
        let pct = 0;
        if (v.duration > 0) {
            pct = (v.currentTime / v.duration) * 100;
            if (pct > 100) pct = 100;
            if (pct < 0) pct = 0;
        }

        let mTitle = v.mediaTitle || v.tabTitle || 'Unknown Media';
        let mArtist = v.mediaArtist || 'Media source';
        
        card.innerHTML = `
            <div class="card-top">
                <div class="thumbnail-box" style="background-image: url('${posterUrl}')"></div>
                
                <div class="card-info">
                    <div class="info-header">
                        <div class="domain-group">${favIcon} ${hostName}</div>
                        <button class="btn-icon-small btn-pip ${v.pip ? 'active' : ''}" data-cmd="pip" title="Picture-in-Picture">
                            ${iconPip}
                        </button>
                    </div>
                    
                    <div class="media-title" title="${mTitle}">${mTitle}</div>
                    <div class="media-subtitle" title="${mArtist}">${mArtist}</div>
                </div>
                
                <button class="play-btn-large btn-play" data-cmd="${isPlaying ? 'pause' : 'play'}">
                    ${isPlaying ? iconPause : iconPlay}
                </button>
            </div>
            
            <div class="progress-row">
                <button class="seek-btn" data-cmd="backward" title="-10s">${iconRewind}</button>
                <div class="progress-track" title="Seek (approx)">
                    <div class="progress-fill" style="width: ${pct}%"></div>
                    <div class="progress-knob" style="left: ${pct}%"></div>
                </div>
                <button class="seek-btn" data-cmd="forward" title="+10s">${iconForward}</button>
            </div>
        `;
        
        card.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const cmd = btn.dataset.cmd;
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

// Initialize
loadAllMedia();
