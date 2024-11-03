// background.js
const HOUR_IN_MINUTES = 60;
const INITIAL_DELAY_MINUTES = 1; // Show first reminder after 1 minute of browser open

// Track browser startup
chrome.runtime.onStartup.addListener(async () => {
    // Show initial notification when browser starts
    await showReadingReminder('Welcome back! Time to read a verse from the Holy Quran.');

    // Set up initial reminder
    await chrome.alarms.create('initialReminder', {
        delayInMinutes: INITIAL_DELAY_MINUTES
    });
});

chrome.runtime.onInstalled.addListener(async () => {
    // Initialize storage with first verse
    await chrome.storage.local.set({
        currentChapter: 1,
        currentVerse: 1,
        lastShownTime: Date.now(),
        remindersEnabled: true  // Default: enable reminders
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
        message: 'Extension installed successfully. Click to start your journey with the Holy Quran.',
        priority: 2,
        buttons: [
            { title: 'Start Reading' }
        ]
    });
});

// Handle different types of alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
    try {
        const settings = await chrome.storage.local.get(['remindersEnabled', 'lastShownTime']);

        if (!settings.remindersEnabled) {
            return;
        }

        if (alarm.name === 'initialReminder') {
            // Show reminder when browser first opens
            await showReadingReminder('Begin your browsing with a verse from the Holy Quran.');
        }
        else if (alarm.name === 'checkVerseTime') {
            const hoursSinceLastShow = (Date.now() - settings.lastShownTime) / (1000 * 60 * 60);

            if (hoursSinceLastShow >= 1) {
                await showReadingReminder('It\'s time for your hourly Quran verse.');
            }
        }
    } catch (error) {
        console.error('Error handling alarm:', error);
    }
});

// Function to show reading reminder
async function showReadingReminder(message) {
    const notification = await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Time for Quran',
        message: message,
        priority: 2,
        buttons: [
            { title: 'Read Now' },
            { title: 'Remind Later' }
        ],
        requireInteraction: true  // Notification will stay until user interacts
    });
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (buttonIndex === 0) {
        // Read Now
        chrome.action.openPopup();
        chrome.notifications.clear(notificationId);
    } else if (buttonIndex === 1) {
        // Remind Later (in 15 minutes)
        chrome.alarms.create('reminderSnooze', {
            delayInMinutes: 15
        });
        chrome.notifications.clear(notificationId);
    }
});

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
    chrome.action.openPopup();
    chrome.notifications.clear(notificationId);
});

// Listen for changes in browser state
chrome.idle.onStateChanged.addListener(async (state) => {
    if (state === 'active') {
        const settings = await chrome.storage.local.get('lastShownTime');
        const hoursSinceLastShow = (Date.now() - settings.lastShownTime) / (1000 * 60 * 60);

        if (hoursSinceLastShow >= 1) {
            await showReadingReminder('Welcome back! Continue your journey with the Holy Quran.');
        }
    }
});

// Add commands for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
    if (command === "show_verse") {
        chrome.action.openPopup();
    }
});
