/**
 * PIP Anywhere — Background Service Worker
 * @author Mirjan Ali Sha <mastools.help@gmail.com>
 * Handles keyboard shortcut command and relays toggle commands to all frames.
 * Uses a simple broadcast strategy to maximize compatibility.
 */

// Core PIP Toggle Logic
const togglePIP = (tab) => {
    if (!tab?.id) return;

    // Check if we can script this tab (skip internal browser pages across all Chromium dialects)
    const url = tab.url || '';
    if (url.startsWith('chrome://') || url.startsWith('edge://') || 
        url.startsWith('brave://') || url.startsWith('about:') || 
        url.startsWith('view-source:')) return;

    // Broadcast to ALL frames in the tab.
    // Each frame decides if it has a video worth toggling.
    chrome.tabs.sendMessage(tab.id, { type: 'toggle-pip' }).catch(() => {
        // If message fails (content script not ready/extension reloaded), inject scripts dynamically.
        // We inject both content.js (PIP) and adblocker.js so they start working immediately.
        chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            files: ['content.js', 'adblocker.js']
        }).then(() => {
            // Retry toggle after injection
            setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, { type: 'toggle-pip' });
            }, 100);
        }).catch(e => console.warn('Injection failed:', e));
    });
};

// Handle Keyboard Shortcut
chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-pip') {
        // Programmatically open the popup (this ensures Alt+P always shows the Media Hub)
        if (chrome.action && chrome.action.openPopup) {
            chrome.action.openPopup().catch(err => console.warn('openPopup failed:', err));
        } else {
            // Fallback for older browsers or if openPopup fails: toggle PIP directly in active tab
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) togglePIP(tabs[0]);
            });
        }
    }
});
