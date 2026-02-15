/**
 * PIP Anywhere — Background Service Worker
 * @author Mirjan Ali Sha <mastools.help@gmail.com>
 * Handles keyboard shortcut command and relays toggle commands to all frames.
 * Uses a simple broadcast strategy to maximize compatibility.
 */

// Core PIP Toggle Logic
const togglePIP = (tab) => {
    if (!tab?.id) return;

    // Check if we can script this tab
    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) return;

    // Broadcast to ALL frames in the tab.
    // Each frame decides if it has a video worth toggling.
    // This removes complex arbitration that might fail due to timing or cross-origin issues.
    chrome.tabs.sendMessage(tab.id, { type: 'toggle-pip' }).catch(() => {
        // If message fails (content script not ready?), inject it dynamically
        // This handles cases where extension was just installed/reloaded but page wasn't
        chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            files: ['content.js']
        }).then(() => {
            // Retry toggle after injection
            setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, { type: 'toggle-pip' });
            }, 100);
        }).catch(e => console.warn('Injection failed:', e));
    });
};

// Handle Extension Icon Click
chrome.action.onClicked.addListener(togglePIP);

// Handle Keyboard Shortcut
chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-pip') {
        chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
            if (tab) togglePIP(tab);
        });
    }
});
