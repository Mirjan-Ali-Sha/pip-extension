/**
 * PIP Anywhere — Popup Script
 * Handles toggle button and status display.
 */

const toggleBtn = document.getElementById('toggleBtn');
const btnText = document.getElementById('btnText');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

let currentStatus = { active: false, hasVideo: false };

/**
 * Query the content script for current PIP status.
 */
async function checkStatus() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
            setStatus('no-video', 'No active tab');
            return;
        }

        chrome.tabs.sendMessage(tab.id, { type: 'get-status' }, (response) => {
            if (chrome.runtime.lastError) {
                setStatus('no-video', 'No video detected');
                return;
            }

            if (response) {
                currentStatus = response;
                if (response.active) {
                    setStatus('active', 'PIP is active');
                    toggleBtn.classList.add('active');
                    btnText.textContent = 'Exit PIP';
                } else if (response.hasVideo) {
                    setStatus('has-video', 'Video detected — ready');
                    toggleBtn.classList.remove('active');
                    btnText.textContent = 'Enter PIP';
                } else {
                    setStatus('no-video', 'No video detected');
                }

                toggleBtn.disabled = !response.hasVideo && !response.active;
            }
        });
    } catch (e) {
        setStatus('no-video', 'Unable to check status');
    }
}

/**
 * Update the status bar UI.
 */
function setStatus(state, text) {
    statusDot.className = 'status-dot ' + state;
    statusText.textContent = text;
}

/**
 * Send toggle command to content script.
 */
async function handleToggle() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        toggleBtn.disabled = true;
        btnText.textContent = 'Toggling...';

        chrome.tabs.sendMessage(tab.id, { type: 'toggle-pip' }, () => {
            // Re-check status after a brief delay
            setTimeout(checkStatus, 500);
        });
    } catch (e) {
        console.warn('[PIP Anywhere] Toggle error:', e);
        checkStatus();
    }
}

// Event listeners
toggleBtn.addEventListener('click', handleToggle);

// Listen for status updates from content script
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'pip-status') {
        if (msg.active) {
            setStatus('active', 'PIP is active');
            toggleBtn.classList.add('active');
            btnText.textContent = 'Exit PIP';
            toggleBtn.disabled = false;
        } else {
            setStatus('has-video', 'Video detected — ready');
            toggleBtn.classList.remove('active');
            btnText.textContent = 'Enter PIP';
            toggleBtn.disabled = false;
        }
    }
});

// Initial check
checkStatus();
