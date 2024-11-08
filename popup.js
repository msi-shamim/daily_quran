// popup.js

// Global Constants
// Defines key constants for the Quran application
// - Total chapters (114), verses (6236), and juzs (30)
// - API base URL and editions for Arabic and Bengali translation
const TOTAL_CHAPTERS = 114;
const TOTAL_VERSES = 6236;
const TOTAL_JUZS = 30;
const BASE_URL = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1';
const QURAN_EDITION = 'ara-quranacademy';
const TRANSLATION_EDITION = 'ben-muhiuddinkhan';

// VerseManager Class Definition
// Main class that handles all verse-related operations
// - Initializes DOM elements
// - Manages verse display and navigation
// - Handles API interactions
class VerseManager {

    // Class Constructor
    // Initializes class properties and DOM element references
    // - Stores Quran metadata
    // - Maintains current verse position
    // - References all UI elements (loading, error, verse display, info sections)

    constructor() {
        this.quranInfo = null;
        this.currentPosition = { chapter: 1, verse: 1 };
        this.loadingElement = document.getElementById('loading');
        this.errorElement = document.getElementById('error');
        this.arabicElement = document.getElementById('arabic');
        this.translationElement = document.getElementById('translation');
        this.chapterInfoElement = document.getElementById('chapterInfo');
        this.bismillahElement = document.getElementById('bismillah');
        this.revelationInfoElement = document.getElementById('revelationInfo');
        this.sajdaWarningElement = document.getElementById('sajdaWarning');
        this.metaInfoElement = document.getElementById('metaInfo');
        this.progressBarElement = document.getElementById('progressBar');
    }

    // Initialization Method
    // Starts up the verse manager
    // - Loads Quran metadata
    // - Retrieves last saved position from storage
    // - Displays initial verse
    async initialize() {
        try {
            // Load Quran information first
            await this.loadQuranInfo();

            // Load current position from storage
            const stored = await chrome.storage.local.get(['currentChapter', 'currentVerse']);
            this.currentPosition.chapter = stored.currentChapter || 1;
            this.currentPosition.verse = stored.currentVerse || 1;

            await this.displayVerse();
        } catch (error) {
            this.showError('Failed to initialize. Please check your internet connection.');
            console.error('Initialization error:', error);
        }
    }

    // Quran Info Loader
    // Fetches and validates Quran metadata from API
    // - Gets chapter information
    // - Ensures data integrity
    async loadQuranInfo() {
        const response = await fetch(`${BASE_URL}/info.json`);
        const data = await response.json();

        if (!data || !data.chapters) {
            throw new Error('Invalid Quran data received');
        }

        this.quranInfo = data;
    }

    // UI State Management Methods
    // Controls loading and error states
    // - Shows/hides loading spinner
    // - Displays error messages
    // - Manages visibility of verse elements
    showLoading(show = true) {
        this.loadingElement.style.display = show ? 'block' : 'none';
        this.arabicElement.style.display = show ? 'none' : 'block';
        this.translationElement.style.display = show ? 'none' : 'block';
    }

    showError(message) {
        this.errorElement.textContent = message;
        this.errorElement.style.display = 'block';
        this.showLoading(false);
    }

    // Verse Fetching Method
    // Handles API calls to get verse content
    // - Fetches both Arabic verse and translation
    // - Validates API responses
    async fetchVerse(edition) {
        const response = await fetch(
            `${BASE_URL}/editions/${edition}/${this.currentPosition.chapter}/${this.currentPosition.verse}.json`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    // Bismillah Display Handler
    // Manages the display of Bismillah
    // - Shows for all chapters except 1 and 9
    // - Follows traditional Quran formatting
    updateBismillah() {
        // Show Bismillah for all chapters except chapter 1 and 9
        this.bismillahElement.style.display =
            (this.currentPosition.chapter !== 1 && this.currentPosition.chapter !== 9) ? 'block' : 'none';
    }

    // Sajda (Prostration) Checker
    // Verifies if current verse contains prostration
    // - Checks verse metadata for sajda
    // - Displays warning if necessary
    checkForSajda() {
        const chapter = this.quranInfo.chapters[this.currentPosition.chapter - 1];
        const verseInfo = chapter.verses.find(v => v.verse === this.currentPosition.verse);
        return verseInfo?.sajda || false;
    }


    // Verse Display Method
    // Core method for showing verse content
    // - Updates all UI elements with verse data
    // - Shows Arabic text and translation
    // - Displays chapter info and metadata
    // - Updates progress bar
    // - Handles errors gracefully
    async displayVerse() {
        try {
            this.showLoading(true);
            this.errorElement.style.display = 'none';
            this.sajdaWarningElement.style.display = 'none';

            // Update Bismillah display
            this.updateBismillah();

            // Check for Sajda before fetching the verse
            if (this.checkForSajda()) {
                this.sajdaWarningElement.style.display = 'block';
            }

            // Fetch verse and translation
            const [verseData, translationData] = await Promise.all([
                this.fetchVerse(QURAN_EDITION),
                this.fetchVerse(TRANSLATION_EDITION)
            ]);

            // Verify verse data
            if (!verseData?.text || !translationData?.text) {
                throw new Error('Invalid verse data received');
            }

            // Get current chapter data
            const chapter = this.quranInfo.chapters[this.currentPosition.chapter - 1];
            const verseInfo = chapter.verses.find(v => v.verse === this.currentPosition.verse);

            // Update display
            this.arabicElement.textContent = verseData.text;
            this.translationElement.textContent = translationData.text;

            // Update chapter info with Arabic name
            this.chapterInfoElement.textContent =
                `${chapter.arabicname} - ${chapter.name} (${chapter.englishname})`;

            // Update revelation info
            this.revelationInfoElement.textContent =
                `Revealed in ${chapter.revelation}`;

            // Update meta info
            this.metaInfoElement.textContent =
                `Juz ${verseInfo.juz} | Page ${verseInfo.page} | Line ${verseInfo.line}`;

            // Update progress bar
            const totalVersesSoFar = this.calculateTotalVersesSoFar();
            const progress = (totalVersesSoFar / TOTAL_VERSES) * 100;
            this.progressBarElement.style.width = `${progress}%`;

            this.showLoading(false);

            // Update last shown time
            await chrome.storage.local.set({ lastShownTime: Date.now() });
        } catch (error) {
            this.showError('Failed to load verse. Please check your internet connection.');
            console.error('Display verse error:', error);
        }
    }

    // Progress Calculator
    // Calculates reading progress
    // - Counts total verses read so far
    // - Used for progress bar display
    calculateTotalVersesSoFar() {
        let total = 0;
        for (let i = 0; i < this.currentPosition.chapter - 1; i++) {
            total += this.quranInfo.chapters[i].verses.length;
        }
        total += this.currentPosition.verse;
        return total;
    }

    // Verse Navigation Method
    // Handles movement to next verse
    // - Manages chapter transitions
    // - Checks for Quran completion
    // - Validates sajda verses
    // - Updates storage with new position
    async moveToNextVerse() {
        try {
            const currentChapter = this.quranInfo.chapters[this.currentPosition.chapter - 1];
            const totalVersesInChapter = currentChapter.verses.length;

            if (this.currentPosition.verse >= totalVersesInChapter) {
                // Move to next chapter
                if (this.currentPosition.chapter >= TOTAL_CHAPTERS) {
                    this.showError('Congratulations! You have completed the Holy Quran.');
                    return;
                }
                this.currentPosition.chapter++;
                this.currentPosition.verse = 1;
            } else {
                this.currentPosition.verse++;
            }

            // Check if next verse has sajda
            if (this.checkForSajda()) {
                const confirmSajda = confirm(
                    'The next verse contains a sajda (prostration). Are you ready to proceed?'
                );
                if (!confirmSajda) {
                    return;
                }
            }

            await chrome.storage.local.set({
                currentChapter: this.currentPosition.chapter,
                currentVerse: this.currentPosition.verse,
                lastShownTime: Date.now()
            });

            await this.displayVerse();
        } catch (error) {
            this.showError('Failed to move to next verse. Please try again.');
            console.error('Move to next verse error:', error);
        }
    }
}

// DOM Content Load Handler
// Initializes the application when popup opens
// - Creates VerseManager instance
// - Sets up event listeners for buttons
// Initialize when popup opens
document.addEventListener('DOMContentLoaded', async () => {
    const verseManager = new VerseManager();
    await verseManager.initialize();

    // Set up button listeners
    document.getElementById('closeBtn').addEventListener('click', () => window.close());
    document.getElementById('nextBtn').addEventListener('click', () => verseManager.moveToNextVerse());
});