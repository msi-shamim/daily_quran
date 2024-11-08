// background.js

// Constants definition
// Defines time-related constants used throughout the extension
// - HOUR_IN_MINUTES: Represents 60 minutes
// - INITIAL_DELAY_MINUTES: Sets first reminder delay to 1 minute after browser opens
const HOUR_IN_MINUTES = 60;
const INITIAL_DELAY_MINUTES = 1; // Show first reminder after 1 minute of browser open

// Browser Startup Handler
// Triggered when the browser starts
// - Shows initial welcome notification
// - Sets up first reminder alarm
chrome.runtime.onStartup.addListener(async () => {
    // Show initial notification when browser starts
    await showReadingReminder('Welcome back! Time to read a verse from the Holy Quran.');

    // Set up initial reminder
    await chrome.alarms.create('initialReminder', {
        delayInMinutes: INITIAL_DELAY_MINUTES
    });
});

// Extension Installation Handler
// Triggered when the extension is first installed
// - Initializes storage with default values (Chapter 1, Verse 1)
// - Sets up hourly reminder checks
// - Shows welcome notification with "Start Reading" button
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

// Alarm Event Handler
// Manages different types of alarms in the extension
// - Handles initial reminder when browser opens
// - Manages hourly verse check reminders
// - Checks if reminders are enabled before showing notifications
// - Calculates time since last verse was shown
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

// Reading Reminder Function
// Creates and displays notifications to the user
// - Shows customizable message
// - Includes "Read Now" and "Remind Later" buttons
// - Makes notifications persist until user interaction
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

// Notification Button Click Handler
// Manages user interactions with notification buttons
// - "Read Now": Opens extension popup
// - "Remind Later": Snoozes reminder for 15 minutes
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

// Notification Click Handler
// Manages direct clicks on notifications
// - Opens extension popup
// - Clears the clicked notification
chrome.notifications.onClicked.addListener((notificationId) => {
    chrome.action.openPopup();
    chrome.notifications.clear(notificationId);
});

// Browser State Change Handler
// Monitors user activity state changes
// - Checks if user returns after being away
// - Shows welcome back message if sufficient time has passed
// - Manages verse reminder timing based on user activity
chrome.idle.onStateChanged.addListener(async (state) => {
    if (state === 'active') {
        const settings = await chrome.storage.local.get('lastShownTime');
        const hoursSinceLastShow = (Date.now() - settings.lastShownTime) / (1000 * 60 * 60);

        if (hoursSinceLastShow >= 1) {
            await showReadingReminder('Welcome back! Continue your journey with the Holy Quran.');
        }
    }
});

// Keyboard Shortcuts Handler
// Manages keyboard command shortcuts
// - Implements "show_verse" command to open extension popup
chrome.commands.onCommand.addListener((command) => {
    if (command === "show_verse") {
        chrome.action.openPopup();
    }
});