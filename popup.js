// popup.js
const TOTAL_CHAPTERS = 114;
const TOTAL_VERSES = 6236;
const TOTAL_JUZS = 30;
const BASE_URL = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1';
const QURAN_EDITION = 'ara-quranacademy';
const TRANSLATION_EDITION = 'ben-muhiuddinkhan';

class VerseManager {
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

    async loadQuranInfo() {
        const response = await fetch(`${BASE_URL}/info.json`);
        const data = await response.json();

        if (!data || !data.chapters) {
            throw new Error('Invalid Quran data received');
        }

        this.quranInfo = data;
    }

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

    async fetchVerse(edition) {
        const response = await fetch(
            `${BASE_URL}/editions/${edition}/${this.currentPosition.chapter}/${this.currentPosition.verse}.json`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    updateBismillah() {
        // Show Bismillah for all chapters except chapter 1 and 9
        this.bismillahElement.style.display =
            (this.currentPosition.chapter !== 1 && this.currentPosition.chapter !== 9) ? 'block' : 'none';
    }

    checkForSajda() {
        const chapter = this.quranInfo.chapters[this.currentPosition.chapter - 1];
        const verseInfo = chapter.verses.find(v => v.verse === this.currentPosition.verse);
        return verseInfo?.sajda || false;
    }

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

    calculateTotalVersesSoFar() {
        let total = 0;
        for (let i = 0; i < this.currentPosition.chapter - 1; i++) {
            total += this.quranInfo.chapters[i].verses.length;
        }
        total += this.currentPosition.verse;
        return total;
    }

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

// Initialize when popup opens
document.addEventListener('DOMContentLoaded', async () => {
    const verseManager = new VerseManager();
    await verseManager.initialize();

    // Set up button listeners
    document.getElementById('closeBtn').addEventListener('click', () => window.close());
    document.getElementById('nextBtn').addEventListener('click', () => verseManager.moveToNextVerse());
});
