// background.js
const HOUR_IN_MINUTES = 60;

chrome.runtime.onInstalled.addListener(async () => {
    // Initialize storage with first verse
    await chrome.storage.local.set({
        currentChapter: 1,
        currentVerse: 1,
        lastShownTime: Date.now()
    });

    // Create alarm for hourly checks
    await chrome.alarms.create('checkVerseTime', {
        periodInMinutes: HOUR_IN_MINUTES
    });

    // Show welcome notification
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Daily Quran Verses',
        message: 'Extension installed successfully. Click the icon to start reading.',
        priority: 2
    });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'checkVerseTime') {
        try {
            const result = await chrome.storage.local.get('lastShownTime');
            const hoursSinceLastShow = (Date.now() - result.lastShownTime) / (1000 * 60 * 60);

            if (hoursSinceLastShow >= 1) {
                // Show notification
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'Time for Quran',
                    message: 'It\'s time to read your next verse. Click to open.',
                    priority: 2,
                    buttons: [{ title: 'Open Verse' }]
                });
            }
        } catch (error) {
            console.error('Error checking verse time:', error);
        }
    }
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (buttonIndex === 0) {
        chrome.action.openPopup();
    }
});

// Handle notification clicks
chrome.notifications.onClicked.addListener(() => {
    chrome.action.openPopup();
});
