        // --- Constants ---
        const HARDCODED_VOLUME_ORDER = [
            "Old Testament", "New Testament",
            "Book of Mormon", "Doctrine and Covenants",
            "Pearl of Great Price"
        ];

        const VOLUME_ACRONYM_MAP = {
            "D&C": "Doctrine and Covenants",
            "BoM": "Book of Mormon",
            "BofM": "Book of Mormon",
            "OT": "Old Testament",
            "NT": "New Testament",
            "PoGP": "Pearl of Great Price",
            "PGP": "Pearl of Great Price",
            "Ne": "Nephi"
        };

        const STOP_WORDS = new Set(["a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves"]);
        const WORD_CLOUD_LIMIT = 75;
        const RESULT_RENDER_LIMIT = 2000;

        // --- Global Variables ---
        const scriptureCache = {lds: null, currentResults: []};
        let allAvailableVolumes = [];
        let booksMap = new Map();
        let volumeCheckboxElements = [];
        let currentFrequencyData = {1: [], 2: [], 3: [], 4: []};
        let currentVolumeChartData = null;
        let currentSortColumn = "total";
        let currentSortDirection = "desc";
        let firstSearchPerformed = false;
        let currentNgramSize = 1;
        let wordCloudLayout = null;
        let currentCompactActionVerse = null; // To store the active verse for the compact action modal
        let seekScriptures = [];


        // --- DOM Element References ---
        const volumeCheckboxesContainer = document.getElementById("volumeCheckboxes");
        const allVolumesCheckbox = document.getElementById("allVolumesCheckbox");
        const searchInput = document.getElementById("searchInput");
        const searchInputError = document.getElementById("searchInputError");
        const verseTitleFilterInput = document.getElementById("verseTitleFilterInput");
        const verseTitleFilterError = document.getElementById("verseTitleFilterError");
        const regexSearchCheckbox = document.getElementById("regexSearch");
        const caseSensitiveCheckbox = document.getElementById("caseSensitive");
        const columnsByVolumeCheckbox = document.getElementById("columnsByVolume");
        const shuffleResultsCheckbox = document.getElementById("shuffleResults");
        const singleColumnCheckbox = document.getElementById("singleColumn");
        const searchButton = document.getElementById("searchButton");
        const seekMessage = document.getElementById("seekMessage");
        const loadingIndicator = document.getElementById("loadingIndicator");
        const resultsContainer = document.getElementById("resultsContainer");
        const noResultsMessage = document.getElementById("noResults");
        const resultsHeadingText = document.getElementById("resultsHeadingText");
        const searchStatus = document.getElementById("searchStatus");
        const fallbackMessage = document.getElementById("fallbackMessage");
        const howToSearchButton = document.getElementById("howToSearchButton");
        const searchHelpModalOverlay = document.getElementById("searchHelpModalOverlay");
        const searchHelpModalCloseButton = document.getElementById("searchHelpModalCloseButton");
        const explainStatsButton = document.getElementById("explainStatsButton");
        const statsHelpModalOverlay = document.getElementById("statsHelpModalOverlay");
        const statsHelpModalCloseButton = document.getElementById("statsHelpModalCloseButton");
        const showStopWordsButton = document.getElementById("showStopWordsButton");
        const stopWordsModalOverlay = document.getElementById("stopWordsModalOverlay");
        const stopWordsModalCloseButton = document.getElementById("stopWordsModalCloseButton");
        const stopWordsListDisplay = document.getElementById("stopWordsListDisplay");
        const contextDrawerOverlay = document.getElementById("contextDrawerOverlay");
        const contextDrawerCloseButton = document.getElementById("contextDrawerCloseButton");
        const contextDrawerTitle = document.getElementById("contextDrawerTitle");
        const contextDrawerContent = document.getElementById("contextDrawerContent");
        const advancedSearchArea = document.getElementById("advancedSearchArea");
        const scripturesTabButton = document.getElementById("scripturesTabButton");
        const statsTabButton = document.getElementById("statsTabButton");
        const scripturesContent = document.getElementById("scripturesContent");
        const statisticsContent = document.getElementById("statisticsContent");
        const scripturesTabCount = document.getElementById("scripturesTabCount");
        const statsDisplayArea = document.getElementById("statsDisplayArea");
        const statsTotalCount = document.getElementById("statsTotalCount");
        const statsVolumeChartContainer = document.getElementById("statsVolumeChartContainer");
        const statsWordFormsContainer = document.getElementById("statsWordFormsContainer");
        const statsWordFormsList = statsWordFormsContainer.querySelector('.word-form-list');
        const statsWordFormsPlaceholder = statsWordFormsContainer.querySelector('.no-forms');
        const ngramTabContainer = document.getElementById("ngramTabContainer");
        const ngramTabButtons = ngramTabContainer.querySelectorAll(".ngram-tab-button");
        const ngramTabContentContainer = document.getElementById("ngramTabContentContainer");
        const ngramTabContents = ngramTabContentContainer.querySelectorAll(".ngram-tab-content");
        const excludeStopWordsCheckbox = document.getElementById("excludeStopWordsCheckbox");
        const statsWordTable = document.getElementById("statsWordTable");
        const statsWordTableBody = document.getElementById("statsWordTableBody");
        const statsWordTableHeaders = statsWordTable.querySelectorAll("thead th[data-sort]");
        const statsBigramTable = document.getElementById("statsBigramTable");
        const statsBigramTableBody = document.getElementById("statsBigramTableBody");
        const statsBigramTableHeaders = statsBigramTable.querySelectorAll("thead th[data-sort]");
        const statsTrigramTable = document.getElementById("statsTrigramTable");
        const statsTrigramTableBody = document.getElementById("statsTrigramTableBody");
        const statsTrigramTableHeaders = statsTrigramTable.querySelectorAll("thead th[data-sort]");
        const statsQuatgramTable = document.getElementById("statsQuatgramTable");
        const statsQuatgramTableBody = document.getElementById("statsQuatgramTableBody");
        const statsQuatgramTableHeaders = statsQuatgramTable.querySelectorAll("thead th[data-sort]");
        const statsError = document.getElementById("statsError");
        const compactActionModal = document.getElementById("compactActionModal");
        const compactActionModalCloseButton = document.getElementById("compactActionModalCloseButton");
        const compactActionModalTitle = document.getElementById("compactActionModalTitle");
        const compactActionModalVerseRef = document.getElementById("compactActionModalVerseRef");
        // const compactActionModalScripturePreview = document.getElementById("compactActionModalScripturePreview"); // If you use the preview
        const compactActionCopyButton = document.getElementById("compactActionCopyButton");
        const compactActionAddToJournalButton = document.getElementById("compactActionAddToJournalButton");
        const compactActionGoogleSearchButton = document.getElementById("compactActionGoogleSearchButton");
        const compactActionChurchSiteLink = document.getElementById("compactActionChurchSiteLink");

        // Journal DOM Elements
        const journalEditor = document.getElementById("journalEditor");
        const journalPreview = document.getElementById("journalPreview");
        const downloadJournalButton = document.getElementById("downloadJournalButton");
        const copyJournalButton = document.getElementById("copyJournalButton");
        const clearJournalButton = document.getElementById("clearJournalButton");

        // Dark Mode Toggle Elements
        const darkModeToggle = document.getElementById("darkModeToggle");
        const darkModeIcon = document.getElementById("darkModeIcon");

        // --- Modal Elements ---
        const noteModal = document.getElementById('noteModal');
        const modalScriptureTextEl = document.getElementById('modalScriptureText');
        const modalVerseTitleEl = document.getElementById('modalVerseTitle');
        const noteTextarea = document.getElementById('noteTextarea');
        const saveNoteButton = document.getElementById('saveNoteButton');
        const cancelNoteButton = document.getElementById('cancelNoteButton');
        const modalCloseButton = noteModal ? noteModal.querySelector('.modal-close-button') : null;



        // --- Dummy Scripture Data ---
        const DUMMY_SCRIPTURE_DATA = [
            {"volume_title": "Old Testament", "book_title": "Genesis", "book_short_title": "Gen.", "chapter_number": 1, "verse_number": 1, "verse_title": "Genesis 1:1", "scripture_text": "In the beginning God created the heaven and the earth."},
            {"volume_title": "Old Testament", "book_title": "Genesis", "book_short_title": "Gen.", "chapter_number": 1, "verse_number": 2, "verse_title": "Genesis 1:2", "scripture_text": "And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters."},
            {"volume_title": "Old Testament", "book_title": "Genesis", "book_short_title": "Gen.", "chapter_number": 1, "verse_number": 3, "verse_title": "Genesis 1:3", "verse_short_title": "Gen. 1:3", "scripture_text": "And God said, Let there be light: and there was light."},
            {"volume_title": "Old Testament", "book_title": "Genesis", "book_short_title": "Gen.", "chapter_number": 1, "verse_number": 4, "verse_title": "Genesis 1:4", "verse_short_title": "Gen. 1:4", "scripture_text": "And God saw the light, that it was good: and God divided the light from the darkness."},
            {"volume_title": "Old Testament", "book_title": "Genesis", "book_short_title": "Gen.", "chapter_number": 1, "verse_number": 5, "verse_title": "Genesis 1:5", "verse_short_title": "Gen. 1:5", "scripture_text": "And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day."},
            {"volume_title": "Old Testament", "book_title": "Genesis", "book_short_title": "Gen.", "chapter_number": 1, "verse_number": 6, "verse_title": "Genesis 1:6", "verse_short_title": "Gen. 1:6", "scripture_text": "And God said, Let there be a firmament in the midst of the waters, and let it divide the waters from the waters."},
            {"volume_title": "New Testament", "book_title": "John", "book_short_title": "John", "chapter_number": 3, "verse_number": 16, "verse_title": "John 3:16", "verse_short_title": "John 3:16", "scripture_text": "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life."}
        ];


        // --- Utility Functions ---
        function shuffleArray(array) {for (let i = array.length - 1; i > 0; i--) {const j = Math.floor(Math.random() * (i + 1));[array[i], array[j]] = [array[j], array[i]];} }
        function escapeRegex(str) {if (typeof str !== "string") return ""; return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");}
        function normalizeWord(word) {
            if (!word) return "";
            return word.toLowerCase()
                .replace(/^[^\w\s]+|[^\w\s]+$/g, "")
                .replace(/'s$/g, "")
                .replace(/[.,;:!?"'()[\]{}<>]/g, "");
        }
        function formatStat(value, decimalPlaces = 3) {if (typeof value !== 'number' || !isFinite(value)) {return "N/A";} return value.toFixed(decimalPlaces);}
        function formatPercentage(value, decimalPlaces = 1) {if (typeof value !== 'number' || !isFinite(value)) {return "N/A";} return (value * 100).toFixed(decimalPlaces) + '%';}

        // --- Button Feedback ---
        function showButtonFeedback(buttonElement, feedbackHTML, timeoutDuration = 1500) {
            const originalHTML = buttonElement.innerHTML;
            buttonElement.innerHTML = feedbackHTML;
            setTimeout(() => {
                buttonElement.innerHTML = originalHTML;
            }, timeoutDuration);
        }

        async function showSeekScripture() {
            try {
                if (seekScriptures.length === 0) {
                    const resp = await fetch('assets/seek-scriptures.json');
                    seekScriptures = await resp.json();
                }
                if (!Array.isArray(seekScriptures) || seekScriptures.length === 0) return;
                const random = seekScriptures[Math.floor(Math.random() * seekScriptures.length)];
                seekMessage.textContent = random;
                seekMessage.classList.add('show');
                setTimeout(() => {
                    seekMessage.classList.remove('show');
                }, 2000);
            } catch (err) {
                console.error('Error loading seek scriptures', err);
            }
        }

        // --- Note Modal Helper Functions ---
        function showModal() {
            if (noteModal) {
                noteModal.classList.add('active');
                setTimeout(() => {
                    if (noteTextarea) {
                        noteTextarea.focus();
                    }
                }, 50);
            }
        }

        function hideModal() {
            if (noteModal) {
                noteModal.classList.remove('active');
                if (noteTextarea) noteTextarea.value = '';
            }
        }

        // --- Data Fetching and Initialization ---
        async function fetchScriptureData() {
            if (scriptureCache.lds) {
                return scriptureCache.lds;
            }
            loadingIndicator.classList.remove("hidden");
            resultsContainer.innerHTML = "";
            noResultsMessage.classList.add("hidden");
            fallbackMessage.textContent = "";
            clearStatisticsDisplay();
            statsTabButton.disabled = true;
            statsTabButton.classList.remove("active");
            scripturesTabButton.classList.add("active");
            scripturesContent.classList.add("active");
            statisticsContent.classList.remove("active");

            let data;
            let usingFallback = false;

            try {
                const response = await fetch("lds-scriptures.json");
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                data = await response.json();
                if (!Array.isArray(data)) {
                    throw new Error("Scripture data is not in the expected array format.");
                }
            } catch (error) {
                console.warn(`Error loading LDS scriptures from JSON: ${error.message}. Using fallback dummy data.`);
                data = DUMMY_SCRIPTURE_DATA;
                usingFallback = true;
                fallbackMessage.textContent = "⚠️ Could not load full scripture data. Using limited fallback data.";
            }

            function normalizeVolumeName(volumeName) {
                return VOLUME_ACRONYM_MAP[volumeName] || volumeName;
            }

            try {
                scriptureCache.lds = data;
                const foundVolumesSet = new Set();
                booksMap.clear();

                data.forEach((verse) => {
                    if (verse && typeof verse.volume_title === "string" && typeof verse.book_title === "string") {
                        const volumeTitle = normalizeVolumeName(verse.volume_title);
                        foundVolumesSet.add(volumeTitle);
                        if (!booksMap.has(volumeTitle)) booksMap.set(volumeTitle, new Set());
                        booksMap.get(volumeTitle).add(verse.book_title);
                    }
                });

                const orderedVolumes = [];
                const remainingVolumes = new Set(foundVolumesSet);
                HARDCODED_VOLUME_ORDER.forEach((orderedVolume) => {
                    if (remainingVolumes.has(orderedVolume)) {
                        orderedVolumes.push(orderedVolume);
                        remainingVolumes.delete(orderedVolume);
                    }
                });
                const sortedRemaining = Array.from(remainingVolumes).sort();
                allAvailableVolumes = [...orderedVolumes, ...sortedRemaining];

                populateVolumeCheckboxes();
                return data;
            } catch (processingError) {
                console.error("Error processing scripture data (real or fallback):", processingError);
                scripturesContent.innerHTML = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-4xl mx-auto" role="alert"><strong class="font-bold">Data Processing Error!</strong><span class="block sm:inline"> ${processingError.message}</span></div>`;
                scripturesContent.classList.add("active");
                statisticsContent.classList.remove("active");
                resultsHeadingText.textContent = "Error";
                scripturesTabCount.textContent = "!";
                searchStatus.textContent = "Failed to process scripture data.";
                fallbackMessage.textContent = "";
                return [];
            } finally {
                loadingIndicator.classList.add("hidden");
            }
        }
        function populateVolumeCheckboxes() {
            volumeCheckboxesContainer.innerHTML = ""; volumeCheckboxElements = [];
            allAvailableVolumes.forEach((volume) => {
                const div = document.createElement("div"); div.className = "flex items-center";
                const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.id = `vol-${volume.replace(/[^a-zA-Z0-9]/g, "-")}`; checkbox.value = volume; checkbox.checked = true;
                checkbox.className = "w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded volume-checkbox mr-2"; checkbox.addEventListener("change", handleVolumeCheckboxChange);
                const label = document.createElement("label"); label.htmlFor = checkbox.id; label.textContent = volume; label.className = "text-sm text-gray-700 cursor-pointer";
                div.appendChild(checkbox); div.appendChild(label); volumeCheckboxesContainer.appendChild(div); volumeCheckboxElements.push(checkbox);
            }); updateAllVolumesCheckboxState();
        }

        // --- Event Handlers ---
        function handleVolumeCheckboxChange() {updateAllVolumesCheckboxState();}
        allVolumesCheckbox.addEventListener("change", () => {const isChecked = allVolumesCheckbox.checked; volumeCheckboxElements.forEach((checkbox) => (checkbox.checked = isChecked));});
        function updateAllVolumesCheckboxState() {
            const totalCheckboxes = volumeCheckboxElements.length; if (totalCheckboxes === 0) {allVolumesCheckbox.checked = false; allVolumesCheckbox.indeterminate = false; return;}
            const checkedCount = volumeCheckboxElements.filter((checkbox) => checkbox.checked).length;
            if (checkedCount === totalCheckboxes) {allVolumesCheckbox.checked = true; allVolumesCheckbox.indeterminate = false;}
            else if (checkedCount > 0) {allVolumesCheckbox.checked = false; allVolumesCheckbox.indeterminate = true;}
            else {allVolumesCheckbox.checked = false; allVolumesCheckbox.indeterminate = false;}
        }

        // --- Modal Control ---
        function openModal(overlayElement) {overlayElement.classList.add("active");}
        function closeModal(overlayElement) {overlayElement.classList.remove("active");}
        howToSearchButton.addEventListener("click", () => openModal(searchHelpModalOverlay));
        searchHelpModalCloseButton.addEventListener("click", () => closeModal(searchHelpModalOverlay));
        searchHelpModalOverlay.addEventListener("click", (event) => {if (event.target === searchHelpModalOverlay) closeModal(searchHelpModalOverlay);});
        explainStatsButton.addEventListener("click", () => openModal(statsHelpModalOverlay));
        statsHelpModalCloseButton.addEventListener("click", () => closeModal(statsHelpModalOverlay));
        statsHelpModalOverlay.addEventListener("click", (event) => {if (event.target === statsHelpModalOverlay) closeModal(statsHelpModalOverlay);});
        showStopWordsButton.addEventListener("click", () => openModal(stopWordsModalOverlay));
        stopWordsModalCloseButton.addEventListener("click", () => closeModal(stopWordsModalOverlay));
        stopWordsModalOverlay.addEventListener("click", (event) => {if (event.target === stopWordsModalOverlay) closeModal(stopWordsModalOverlay);});
        contextDrawerCloseButton.addEventListener("click", () => closeModal(contextDrawerOverlay));
        contextDrawerOverlay.addEventListener("click", (event) => {if (event.target === contextDrawerOverlay) closeModal(contextDrawerOverlay);});
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                if (searchHelpModalOverlay.classList.contains("active")) closeModal(searchHelpModalOverlay);
                if (statsHelpModalOverlay.classList.contains("active")) closeModal(statsHelpModalOverlay);
                if (stopWordsModalOverlay.classList.contains("active")) closeModal(stopWordsModalOverlay);
                if (contextDrawerOverlay.classList.contains("active")) closeModal(contextDrawerOverlay);
            }
        });

        // --- Advanced Search Area Collapse/Expand ---
        function toggleAdvancedSearchArea(forceCollapse = null) {
            const isCurrentlyCollapsed = advancedSearchArea.classList.contains("collapsed");
            const shouldCollapse = forceCollapse === null ? !isCurrentlyCollapsed : forceCollapse;

            if (shouldCollapse) {
                advancedSearchArea.classList.add("collapsed");
            } else {
                advancedSearchArea.classList.remove("collapsed");
            }
        }
        
        document.getElementById("toggleAdvancedButton").addEventListener("click", () => toggleAdvancedSearchArea());

        // --- Main Tab Switching (Scriptures/Statistics) ---
        function switchTab(tabName) {
            scripturesContent.classList.remove("active");
            statisticsContent.classList.remove("active");
            scripturesTabButton.classList.remove("active");
            statsTabButton.classList.remove("active");

            if (tabName === "scriptures") {
                scripturesContent.classList.add("active");
                scripturesTabButton.classList.add("active");
            } else if (tabName === "statistics") {
                if (!statsTabButton.disabled) {
                    statisticsContent.classList.add("active");
                    statsTabButton.classList.add("active");
                    switchNgramTab(`${currentNgramSize}gram`);
                } else {
                    scripturesContent.classList.add("active");
                    scripturesTabButton.classList.add("active");
                }
            }
        }
        scripturesTabButton.addEventListener("click", () => switchTab("scriptures"));
        statsTabButton.addEventListener("click", () => switchTab("statistics"));

        // --- N-gram Tab Switching (within Statistics) ---
        function switchNgramTab(targetTab) {
            currentNgramSize = parseInt(targetTab.replace('gram', ''), 10);

            ngramTabContents.forEach(content => content.classList.remove('active'));
            ngramTabButtons.forEach(button => button.classList.remove('active'));

            const activeContent = document.getElementById(targetTab + 'Content');
            const activeButton = ngramTabContainer.querySelector(`[data-ngram-tab="${targetTab}"]`);

            if (activeContent) activeContent.classList.add('active');
            if (activeButton) activeButton.classList.add('active');

            if (statisticsContent.classList.contains('active')) {
                if (currentVolumeChartData) {
                    renderVolumeChart(currentVolumeChartData);
                } else {
                    statsVolumeChartContainer.innerHTML = '<p class="text-xs text-gray-500 italic text-center pt-4">Perform a search to generate volume chart.</p>';
                }
                renderFrequencyTable();
                const cloudContainerId = `wordCloudContainer${currentNgramSize}gram`;
                if (document.getElementById(cloudContainerId)) {
                    renderWordCloud(currentNgramSize);
                }
            }
        }
        ngramTabButtons.forEach(button => {
            button.addEventListener('click', () => switchNgramTab(button.dataset.ngramTab));
        });

        // --- Stop Words Checkbox Handler ---
        excludeStopWordsCheckbox.addEventListener('change', () => {
            if (!statsTabButton.disabled && scriptureCache.currentResults.length > 0) {
                try {
                    calculateAndDisplayStatistics(
                        scriptureCache.currentResults,
                        scriptureCache.currentResults.length,
                        searchInput.value.trim(),
                        regexSearchCheckbox.checked
                    );
                    switchNgramTab(`${currentNgramSize}gram`);
                } catch (error) {
                    statsError.textContent = `Error updating statistics: ${error.message}`;
                    statsError.classList.remove('hidden');
                }
            }
        });

        // --- Search Logic ---
        function getSelectedVolumes() {return volumeCheckboxElements.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value);}
        async function performSearch() {

            const originalHTML = searchButton.innerHTML;
            searchButton.innerHTML = 'and ye shall find';
            setTimeout(() => {
                searchButton.innerHTML = originalHTML;
            }, 2000);

            showSeekScripture();

            if (firstSearchPerformed) {toggleAdvancedSearchArea(true);}

            searchInputError.textContent = ""; verseTitleFilterError.textContent = ""; searchStatus.textContent = "";
            resultsContainer.innerHTML = ""; noResultsMessage.classList.add("hidden"); clearStatisticsDisplay(); statsTabButton.disabled = true;
            statsError.classList.add('hidden'); statsError.textContent = '';
            fallbackMessage.textContent = "";
            scriptureCache.currentResults = [];
            switchTab("scriptures");

            let searchTerm = searchInput.value.trim(); const originalSearchTerm = searchTerm;
            const verseTitleFilterTerm = verseTitleFilterInput.value.trim();
            const selectedVolumes = getSelectedVolumes(); let useRegex = regexSearchCheckbox.checked; const isCaseSensitive = caseSensitiveCheckbox.checked;
            const shouldDisplayColumns = columnsByVolumeCheckbox.checked; const shouldShuffle = shuffleResultsCheckbox.checked; let wasAutoConverted = false;

            if (selectedVolumes.length === 0) {resultsContainer.className = ""; resultsHeadingText.textContent = "Results"; scripturesTabCount.textContent = "0"; noResultsMessage.textContent = "Please select at least one volume to search."; noResultsMessage.classList.remove("hidden"); loadingIndicator.classList.add("hidden"); return;}

            let generatedRegexString = null; if (!useRegex && searchTerm) {const andMatch = searchTerm.match(/^(.*?)\s+AND\s+(.*?)$/i); const orMatch = searchTerm.match(/^(.*?)\s+OR\s+(.*?)$/i); if (andMatch) {const term1 = escapeRegex(andMatch[1].trim()); const term2 = escapeRegex(andMatch[2].trim()); generatedRegexString = `(${term1}.*?${term2}|${term2}.*?${term1})`; useRegex = true; wasAutoConverted = true;} else if (orMatch) {const term1 = escapeRegex(orMatch[1].trim()); const term2 = escapeRegex(orMatch[2].trim()); generatedRegexString = `(${term1}|${term2})`; useRegex = true; wasAutoConverted = true;} }
            let mainSearchRegex = null; if (useRegex && (searchTerm || generatedRegexString)) {try {const pattern = generatedRegexString || searchTerm; if (!pattern) throw new Error("Regex pattern is empty."); mainSearchRegex = new RegExp(pattern, isCaseSensitive ? "g" : "gi");} catch (e) {searchInputError.textContent = `Invalid Regex: ${e.message}`; return;} }
            let verseTitleRegex = null;
            if (verseTitleFilterTerm) {
                try {
                    // Create a regex pattern that handles volume name normalization
                    let pattern = verseTitleFilterTerm;
                    Object.entries(VOLUME_ACRONYM_MAP).forEach(([acronym, fullName]) => {
                        // Escape special regex characters in both acronym and full name
                        const escapedAcronym = escapeRegex(acronym);
                        const escapedFullName = escapeRegex(fullName);
                        // Replace acronym with a pattern that matches either acronym or full name
                        pattern = pattern.replace(new RegExp(escapedAcronym, 'gi'), `(?:${escapedAcronym}|${escapedFullName})`);
                    });
                    verseTitleRegex = new RegExp(pattern, "i");
                } catch (e) {
                    verseTitleFilterError.textContent = `Invalid Regex: ${e.message}`;
                    return;
                }
            }

            loadingIndicator.classList.remove("hidden");
            resultsContainer.className = shouldDisplayColumns ? "results-flex-container" : "results-grid-container";
            let results = [];
            try {
                const data = await fetchScriptureData();
                if (!Array.isArray(data) || data.length === 0) {if (!scripturesContent.querySelector(".bg-red-100")) {resultsHeadingText.textContent = "Results"; scripturesTabCount.textContent = "0"; noResultsMessage.textContent = "No scripture data is available to search."; noResultsMessage.classList.remove("hidden");} loadingIndicator.classList.add("hidden"); return;}

                let filteredData = data; const volumesSet = new Set(selectedVolumes); filteredData = filteredData.filter((verse) => verse && typeof verse.volume_title === "string" && volumesSet.has(verse.volume_title));
                if (searchTerm || generatedRegexString) {if (useRegex && mainSearchRegex) {results = filteredData.filter((verse) => verse && typeof verse.scripture_text === "string" && mainSearchRegex.test(verse.scripture_text)); if (mainSearchRegex.global) mainSearchRegex.lastIndex = 0;} else if (!useRegex && searchTerm) {const finalSearchTerm = isCaseSensitive ? searchTerm : searchTerm.toLowerCase(); results = filteredData.filter((verse) => {const text = verse && typeof verse.scripture_text === "string" ? (isCaseSensitive ? verse.scripture_text : verse.scripture_text.toLowerCase()) : ""; return text.includes(finalSearchTerm);});} else {results = filteredData;} } else {results = filteredData;}
                if (verseTitleRegex) {results = results.filter((verse) => verse && typeof verse.verse_title === "string" && verseTitleRegex.test(verse.verse_title)); if (verseTitleRegex.global) verseTitleRegex.lastIndex = 0;}

                scriptureCache.currentResults = results;

                if (shouldShuffle && results.length > 0) {shuffleArray(results);}

                let statusParts = []; if (originalSearchTerm) {statusParts.push(`Searching for "${originalSearchTerm}"`); if (useRegex) statusParts.push(`using ${wasAutoConverted ? "auto-converted " : ""}regex`); else statusParts.push(`as exact phrase`); statusParts.push(isCaseSensitive ? "(case-sensitive)" : "(case-insensitive)");} else {statusParts.push("Showing all verses");} if (verseTitleFilterTerm) statusParts.push(`filtering titles by regex "${verseTitleFilterTerm}"`); if (selectedVolumes.length < allAvailableVolumes.length) statusParts.push(`in selected volumes`); else statusParts.push(`in all volumes`); searchStatus.textContent = statusParts.join(", ") + ".";

                const resultCount = results.length;
                resultsHeadingText.textContent = `Scriptures (${resultCount > RESULT_RENDER_LIMIT ? '>' + RESULT_RENDER_LIMIT : resultCount})`;
                scripturesTabCount.textContent = resultCount > RESULT_RENDER_LIMIT ? `>${RESULT_RENDER_LIMIT}` : resultCount;

                if (resultCount > RESULT_RENDER_LIMIT) {
                    resultsContainer.innerHTML = "";
                    noResultsMessage.innerHTML = `<p class="text-orange-700 font-semibold">Search returned ${resultCount.toLocaleString()} results, which is more than the display limit of ${RESULT_RENDER_LIMIT.toLocaleString()}.</p><p class="text-gray-600 mt-2">Please refine your search terms or filters to narrow down the results.</p>`;
                    noResultsMessage.classList.remove("hidden");
                    statsTabButton.disabled = true;
                    clearStatisticsDisplay();
                    scriptureCache.currentResults = [];
                    if (!firstSearchPerformed) {firstSearchPerformed = true; toggleAdvancedSearchArea(true);}
                } else if (resultCount > 0) {
                    try {
                        displayResults(results, originalSearchTerm, isCaseSensitive, shouldDisplayColumns);
                        calculateAndDisplayStatistics(results, resultCount, originalSearchTerm, useRegex);
                        statsTabButton.disabled = false;
                    } catch (statsErrorCaught) {
                        statsTabButton.disabled = true;
                        clearStatisticsDisplay();
                        scriptureCache.currentResults = [];
                        statsError.textContent = `An error occurred while generating statistics: ${statsErrorCaught.message}. Try refining your search.`;
                        statsError.classList.remove('hidden');
                    }
                    if (!firstSearchPerformed) {firstSearchPerformed = true; toggleAdvancedSearchArea(true);}
                    saveSearchSettings();
                } else {
                    resultsContainer.className = "";
                    noResultsMessage.textContent = "No matches found for your criteria.";
                    noResultsMessage.classList.remove("hidden"); statsTabButton.disabled = true;
                    clearStatisticsDisplay();
                    scriptureCache.currentResults = [];
                }
            } catch (error) {
                resultsContainer.className = "";
                scripturesContent.innerHTML = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-4xl mx-auto" role="alert"><strong class="font-bold">Search Error!</strong><span class="block sm:inline"> ${error.message}</span></div>`;
                resultsHeadingText.textContent = "Error"; scripturesTabCount.textContent = "!"; searchStatus.textContent = "Search failed due to an error.";
                noResultsMessage.classList.add("hidden"); statsTabButton.disabled = true; clearStatisticsDisplay();
                scriptureCache.currentResults = [];
            } finally {loadingIndicator.classList.add("hidden");}
        }

        // --- Scripture Card Display Logic ---
        function createResultCard(verse, searchTerm, isCaseSensitive, isForContextDrawer = false) {
            const card = document.createElement("div");
            const isCompactView = document.getElementById("compactView")?.checked;
            card.className = `result-card flex ${isCompactView ? 'flex-col' : 'flex-row'} overflow-hidden rounded-lg shadow-md bg-white border border-gray-200 ${isCompactView ? 'mb-0.5' : 'mb-3'}`;

            // Main content area
            const contentWrapper = document.createElement("div");
            contentWrapper.className = `flex-grow ${isCompactView ? 'p-2' : 'p-4'} overflow-y-auto relative`;

            const scriptureText = verse?.scripture_text ?? "[Scripture text missing]";
            const verseTitle = verse?.verse_title ?? "[Verse title missing]";

            const bookTitle = verse?.book_title ?? "[Book missing]";
            const chapterNum = verse?.chapter_number ?? "?";
            const verseNum = verse?.verse_number ?? "?";

            let highlightedText = scriptureText;
            if (searchTerm && scriptureText !== "[Scripture text missing]") {
                try {
                    let highlightPattern = searchTerm;
                    let highlightFlags = isCaseSensitive ? "g" : "gi";
                    if (typeof regexSearchCheckbox !== 'undefined' && !regexSearchCheckbox.checked && typeof escapeRegex === 'function') {
                        highlightPattern = escapeRegex(searchTerm);
                    }
                    const regex = new RegExp(highlightPattern, highlightFlags);
                    highlightedText = scriptureText.replace(regex, (match) => `<span class="highlight">${match}</span>`);
                } catch (e) {
                    highlightedText = scriptureText;
                }
            }

            if (isCompactView) {
                const verseTitleDiv = document.createElement("div");
                verseTitleDiv.className = "text-xs text-gray-400 text-center mb-1";
                verseTitleDiv.textContent = verseTitle;
                if (!isForContextDrawer) {
                    verseTitleDiv.classList.add("clickable-heading", "hover:text-gray-600", "cursor-pointer");
                    verseTitleDiv.title = "Click to view context";
                    if (typeof openContextDrawer === 'function') {
                        verseTitleDiv.addEventListener('click', () => openContextDrawer(verse));
                    }
                }
                contentWrapper.appendChild(verseTitleDiv);
            } else {
                const headingElement = document.createElement("h3");
                headingElement.className = "scripture-title-heading font-semibold text-base text-blue-800 mb-2";
                headingElement.textContent = verseTitle;
                if (!isForContextDrawer) {
                    headingElement.classList.add("clickable-heading", "hover:text-blue-600", "cursor-pointer");
                    headingElement.title = "Click to view context";
                    if (typeof openContextDrawer === 'function') {
                        headingElement.addEventListener('click', () => openContextDrawer(verse));
                    }
                }
                contentWrapper.appendChild(headingElement);
            }

            const scriptureParagraph = document.createElement("p");
            scriptureParagraph.className = "text-sm text-gray-700";
            scriptureParagraph.innerHTML = highlightedText;
            contentWrapper.appendChild(scriptureParagraph);

            card.appendChild(contentWrapper); // Content added to card

            // Buttons section
            // --- Buttons section ---
            const buttonsColumn = document.createElement("div");
            // let buttonContainer; // Not needed if compact view doesn't have its own direct button container

            if (isCompactView) {
                // Simplified button column for compact view - just a trigger
                card.classList.add('relative'); // Ensure card is a positioning context if needed
                buttonsColumn.className = "absolute top-0.5 right-0.5 z-10"; // Small adjustment for padding
                const menuButton = document.createElement("button");
                // Add a specific class for this trigger to avoid conflicts with other menu buttons
                menuButton.className = "p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md focus:outline-none compact-card-action-trigger";
                menuButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3 h-3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                </svg>`;
                menuButton.title = "Actions";
                // The verse data will be read from card.dataset.verseData in the event listener (see below)
                buttonsColumn.appendChild(menuButton);
            } else {
                // Original non-compact button column layout (largely unchanged)
                buttonsColumn.className = "flex flex-col items-center justify-start p-1.5 space-y-1.5 bg-slate-50 border-l border-gray-200 w-auto flex-shrink-0";
                const buttonContainer = buttonsColumn; // Buttons are direct children

                const copyData = `> ${scriptureText} (${verseTitle})`;
                const commonButtonClasses = "flex items-center justify-center p-1.5 bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:bg-gray-200 rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500";

                const copyButton = document.createElement("button");
                copyButton.className = `copy-button ${commonButtonClasses}`;
                copyButton.title = "Copy scripture text and title";
                copyButton.dataset.copy = escape(copyData);
                copyButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                    </svg>`;
                buttonContainer.appendChild(copyButton);

                const addJournalButton = document.createElement("button");
                addJournalButton.className = `add-to-journal-button ${commonButtonClasses}`;
                addJournalButton.title = "Add to Journal";
                addJournalButton.dataset.verseTitle = escape(verseTitle);
                addJournalButton.dataset.scriptureText = escape(scriptureText);
                addJournalButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>`;
                buttonContainer.appendChild(addJournalButton);

                const searchGoogleButton = document.createElement("button");
                searchGoogleButton.className = `${commonButtonClasses}`;
                searchGoogleButton.title = "Search scripture text on Google";
                searchGoogleButton.onclick = () => window.open(`https://www.google.com/search?q=${encodeURIComponent(scriptureText)}`, '_blank');
                searchGoogleButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>`;
                buttonContainer.appendChild(searchGoogleButton);

                const searchChurchSiteLink = document.createElement("a");
                searchChurchSiteLink.className = `block ${commonButtonClasses}`;
                searchChurchSiteLink.href = `https://www.churchofjesuschrist.org/search?facet=all&lang=eng&query=${encodeURIComponent(bookTitle)}+${chapterNum}%3A${verseNum}`;
                searchChurchSiteLink.target = "_blank";
                searchChurchSiteLink.rel = "noopener noreferrer";
                searchChurchSiteLink.title = "Search verse on Church Website";
                searchChurchSiteLink.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                    </svg>`;
                buttonContainer.appendChild(searchChurchSiteLink);
            }
            card.appendChild(buttonsColumn); // Add the (now simpler for compact) buttonsColumn

            // Store verse data on the card element itself for easy retrieval by the delegated click handler
            // Ensure 'verse' is the complete scripture object passed into createResultCard
            card.dataset.verseData = JSON.stringify(verse);

            return card;
        }

        function displayResults(results, searchTerm, isCaseSensitive, displayColumns) {
            resultsContainer.innerHTML = "";
            resultsContainer.className = displayColumns ? "results-flex-container" : "results-grid-container";
            noResultsMessage.classList.add("hidden");

            if (displayColumns) {
                const resultsByVolume = results.reduce((acc, verse) => {if (verse && typeof verse.volume_title === "string") {const volume = verse.volume_title; if (!acc[volume]) acc[volume] = []; acc[volume].push(verse);} return acc;}, {});
                const createVolumeColumn = (volumeName, verses) => {
                    const columnDiv = document.createElement("div");
                    columnDiv.className = "volume-column";

                    const headerArea = document.createElement("div");
                    headerArea.className = "volume-column-header-area";

                    const header = document.createElement("h3");
                    header.textContent = volumeName;
                    header.className = "volume-column-header";
                    headerArea.appendChild(header);

                    const subheader = document.createElement("div");
                    subheader.textContent = `${verses.length} scripture${verses.length !== 1 ? "s" : ""}`;
                    subheader.className = "volume-column-subheader";
                    headerArea.appendChild(subheader);

                    columnDiv.appendChild(headerArea);

                    const contentDiv = document.createElement("div");
                    contentDiv.className = "volume-column-content";

                    verses.forEach((verse) => {
                        try {
                            const card = createResultCard(verse, searchTerm, isCaseSensitive, false);
                            if (card && card instanceof Element) {
                                contentDiv.appendChild(card);
                            }
                        } catch (err) {
                            // Skip cards that fail to render
                        }
                    });

                    columnDiv.appendChild(contentDiv);
                    return columnDiv;
                };
                HARDCODED_VOLUME_ORDER.forEach((volumeName) => {if (resultsByVolume[volumeName]?.length > 0) {const column = createVolumeColumn(volumeName, resultsByVolume[volumeName]); resultsContainer.appendChild(column); delete resultsByVolume[volumeName];} });
                Object.keys(resultsByVolume).sort().forEach((volumeName) => {if (resultsByVolume[volumeName].length > 0) {const column = createVolumeColumn(volumeName, resultsByVolume[volumeName]); resultsContainer.appendChild(column);} });
            } else {
                const fragment = document.createDocumentFragment();
                results.forEach((verse) => {
                    const card = createResultCard(verse, searchTerm, isCaseSensitive, false);
                    fragment.appendChild(card);
                });
                resultsContainer.appendChild(fragment);
            }

            // Global event delegation for menus (outside the display condition)
            resultsContainer.addEventListener('click', (e) => {
                const menuButton = e.target.closest('.card-menu-button');
                if (menuButton) {
                    e.stopPropagation();
                    const allMenus = document.querySelectorAll('.card-menu:not(.hidden)');
                    allMenus.forEach(menu => {
                        if (menu !== menuButton.nextElementSibling) {
                            menu.classList.add('hidden');
                        }
                    });
                    const dropdown = menuButton.nextElementSibling;
                    dropdown.classList.toggle('hidden');
                }
            });

            resultsContainer.addEventListener('mouseleave', (e) => {
                const card = e.target.closest('.result-card');
                if (card) {
                    const menu = card.querySelector('.card-menu');
                    if (menu) menu.classList.add('hidden');
                }
            }, true);
        }

        // --- Context Drawer Logic ---
        function openContextDrawer(clickedVerse) {
            if (!scriptureCache.lds || scriptureCache.lds.length === 0) {
                contextDrawerTitle.textContent = "Error";
                contextDrawerContent.innerHTML = '<p class="text-center text-red-500">Scripture data not loaded. Cannot display context.</p>';
                openModal(contextDrawerOverlay);
                return;
            }

            contextDrawerTitle.textContent = `${clickedVerse.book_title} - Chapter ${clickedVerse.chapter_number}`;
            contextDrawerContent.innerHTML = '<p class="text-center text-gray-500">Loading context...</p>';

            const chapterVerses = scriptureCache.lds.filter(
                v => v.book_title === clickedVerse.book_title && v.chapter_number === clickedVerse.chapter_number
            ).sort((a, b) => a.verse_number - b.verse_number);

            if (chapterVerses.length === 0) {
                contextDrawerContent.innerHTML = '<p class="text-center text-gray-500">No verses found for this chapter.</p>';
                openModal(contextDrawerOverlay);
                return;
            }
            const versesToShow = chapterVerses;
            contextDrawerContent.innerHTML = "";
            let currentVerseElement = null;

            versesToShow.forEach(verse => {
                const cardElement = createResultCard(verse, null, false, true);
                if (verse.verse_number === clickedVerse.verse_number) {
                    cardElement.classList.add('current-context-verse');
                    cardElement.id = `context-verse-${verse.verse_number}`;
                    currentVerseElement = cardElement;
                }
                contextDrawerContent.appendChild(cardElement);
            });

            if (versesToShow.length === 0) {
                contextDrawerContent.innerHTML = '<p class="text-center text-gray-500">No surrounding verses to display.</p>';
            }

            openModal(contextDrawerOverlay);

            if (currentVerseElement) {
                setTimeout(() => {
                    currentVerseElement.scrollIntoView({behavior: 'smooth', block: 'center'});
                }, 100);
            }
        }


        // --- N-gram Calculation ---
        function calculateNGrams(results, n, excludeStopWords) {
            const ngramCounts = {};
            const ngramUniqueCounts = {};

            results.forEach((verse) => {
                const text = verse.scripture_text || "";
                const normalizedWords = text.split(/\s+/)
                    .map(normalizeWord)
                    .filter(word => word);

                const wordsToUse = excludeStopWords
                    ? normalizedWords.filter(word => !STOP_WORDS.has(word))
                    : normalizedWords;

                const itemsInThisVerse = new Set();

                if (wordsToUse.length >= n) {
                    for (let i = 0; i <= wordsToUse.length - n; i++) {
                        const item = wordsToUse.slice(i, i + n).join(" ");
                        if (item.trim()) {
                            ngramCounts[item] = (ngramCounts[item] || 0) + 1;
                            if (!itemsInThisVerse.has(item)) {
                                ngramUniqueCounts[item] = (ngramUniqueCounts[item] || 0) + 1;
                                itemsInThisVerse.add(item);
                            }
                        }
                    }
                }
            });

            const frequencyData = Object.keys(ngramCounts)
                .map(item => ({
                    [n === 1 ? 'word' : 'phrase']: item,
                    total: ngramCounts[item],
                    unique: ngramUniqueCounts[item] || 0,
                }))
                .sort((a, b) => b.total - a.total);

            return frequencyData;
        }


        // --- Statistics Calculation and Display ---
        function calculateAndDisplayStatistics(results, totalScripturesMatched, originalSearchTerm, useRegex) {
            statsError.classList.add('hidden'); statsError.textContent = '';
            currentVolumeChartData = null;
            currentFrequencyData = {1: [], 2: [], 3: [], 4: []};

            if (!results || totalScripturesMatched === 0) {clearStatisticsDisplay(); statsTabButton.disabled = true; return;}

            const shouldExcludeStopWords = excludeStopWordsCheckbox.checked;

            const volumeCounts = {};
            let totalWordsCounted = 0;
            const wordTotalCounts = {};
            const wordUniqueCounts = {};
            const wordFormsCounts = {};

            const calculateWordForms = !useRegex && originalSearchTerm && !originalSearchTerm.includes(' ') && !originalSearchTerm.match(/\s+(AND|OR)\s+/i);
            const normalizedSearchTermPrefix = calculateWordForms ? normalizeWord(originalSearchTerm) : null;

            results.forEach((verse) => {
                const volume = verse.volume_title || "Unknown Volume";
                volumeCounts[volume] = (volumeCounts[volume] || 0) + 1;

                const text = verse.scripture_text || "";
                const words = text.split(/\s+/);
                const uniqueWordsInThisVerse = new Set();

                words.forEach((rawWord) => {
                    const word = normalizeWord(rawWord);
                    if (word) {
                        const countThisWord = !shouldExcludeStopWords || !STOP_WORDS.has(word);

                        if (countThisWord) {
                            totalWordsCounted++;
                            wordTotalCounts[word] = (wordTotalCounts[word] || 0) + 1;
                            if (!uniqueWordsInThisVerse.has(word)) {
                                wordUniqueCounts[word] = (wordUniqueCounts[word] || 0) + 1;
                                uniqueWordsInThisVerse.add(word);
                            }
                        }

                        if (calculateWordForms && word.startsWith(normalizedSearchTermPrefix)) {
                            wordFormsCounts[word] = (wordFormsCounts[word] || 0) + 1;
                        }
                    }
                });
            });

            currentFrequencyData[1] = Object.keys(wordTotalCounts).map((word) => {
                const total = wordTotalCounts[word];
                const unique = wordUniqueCounts[word] || 0;
                const freqPerScripture = totalScripturesMatched > 0 ? total / totalScripturesMatched : 0;
                const freqPerWord = totalWordsCounted > 0 ? total / totalWordsCounted : 0;
                const coverage = totalScripturesMatched > 0 ? unique / totalScripturesMatched : 0;
                return {word: word, total: total, unique: unique, freqPerScripture: freqPerScripture, freqPerWord: freqPerWord, coverage: coverage};
            }).sort((a, b) => b.total - a.total);

            currentFrequencyData[2] = calculateNGrams(results, 2, shouldExcludeStopWords);
            currentFrequencyData[3] = calculateNGrams(results, 3, shouldExcludeStopWords);
            currentFrequencyData[4] = calculateNGrams(results, 4, shouldExcludeStopWords);

            statsTotalCount.textContent = totalScripturesMatched;
            renderWordFormsBreakdown(wordFormsCounts, calculateWordForms);

            const volumeChartDataSource = HARDCODED_VOLUME_ORDER.map(volume => ({
                volume: volume,
                count: volumeCounts[volume] || 0
            })).filter(d => d.count > 0);
            Object.keys(volumeCounts).forEach(volume => {
                if (!HARDCODED_VOLUME_ORDER.includes(volume)) {
                    volumeChartDataSource.push({volume: volume, count: volumeCounts[volume]});
                }
            });
            currentVolumeChartData = volumeChartDataSource;
        }

        // --- D3 Volume Chart Rendering ---
        function renderVolumeChart(data) {
            if (!data || data.length === 0) {
                statsVolumeChartContainer.innerHTML = '<p class="text-xs text-gray-500 italic text-center pt-4">No volume data to display.</p>';
                return;
            }
            statsVolumeChartContainer.innerHTML = '';

            setTimeout(() => {
                const containerWidth = statsVolumeChartContainer.clientWidth;
                if (!containerWidth) {
                    statsVolumeChartContainer.innerHTML = '<p class="text-xs text-red-500 italic text-center pt-4">Error rendering chart (container width 0).</p>';
                    return;
                }

                const margin = {top: 10, right: 30, bottom: 20, left: 150};
                const barHeight = 25;
                const height = data.length * barHeight + margin.top + margin.bottom;
                const width = containerWidth - margin.left - margin.right;

                if (width <= 0) {
                    statsVolumeChartContainer.innerHTML = `<p class="text-xs text-red-500 italic text-center pt-4">Error rendering chart.</p>`;
                    return;
                }

                const svg = d3.select("#statsVolumeChartContainer")
                    .append("svg")
                    .attr("width", containerWidth)
                    .attr("height", height)
                    .append("g")
                    .attr("transform", `translate(${margin.left},${margin.top})`);

                const yScale = d3.scaleBand()
                    .domain(data.map(d => d.volume))
                    .range([0, height - margin.top - margin.bottom])
                    .padding(0.2);

                const xScale = d3.scaleLinear()
                    .domain([0, d3.max(data, d => d.count) || 1])
                    .range([0, width]);

                const yAxis = d3.axisLeft(yScale).tickSizeOuter(0);
                svg.append("g")
                    .attr("class", "y axis")
                    .call(yAxis)
                    .selectAll(".tick text")
                    .call(wrapAxisText, margin.left - 10);

                const xAxis = d3.axisBottom(xScale).ticks(Math.min(5, d3.max(data, d => d.count))).tickFormat(d3.format("d"));
                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
                    .call(xAxis);

                svg.selectAll(".bar")
                    .data(data)
                    .enter()
                    .append("rect")
                    .attr("class", "bar")
                    .attr("y", d => yScale(d.volume))
                    .attr("height", yScale.bandwidth())
                    .attr("x", 0)
                    .attr("width", 0)
                    .transition()
                    .duration(500)
                    .attr("width", d => Math.max(0, xScale(d.count)));

                svg.selectAll(".bar-label")
                    .data(data)
                    .enter()
                    .append("text")
                    .attr("class", "bar-label")
                    .attr("y", d => yScale(d.volume) + yScale.bandwidth() / 2)
                    .attr("x", d => Math.max(0, xScale(d.count)) + 5)
                    .text(d => d.count);
            }, 50);
        }
        function wrapAxisText(text, width) {
            text.each(function () {
                const text = d3.select(this);
                const words = text.text().split(/\s+/).reverse();
                let word;
                let line = [];
                let lineNumber = 0;
                const lineHeight = 1.1;
                const y = text.attr("y");
                const dy = parseFloat(text.attr("dy") || 0);
                let tspan = text.text(null).append("tspan").attr("x", -10).attr("y", y).attr("dy", dy + "em");
                while (word = words.pop()) {
                    line.push(word);
                    tspan.text(line.join(" "));
                    if (tspan.node().getComputedTextLength() > width && line.length > 1) {
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = text.append("tspan").attr("x", -10).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                    }
                }
            });
        }

        // --- Word Forms Breakdown Rendering ---
        function renderWordFormsBreakdown(formsData, wasSingleWordSearch) {
            statsWordFormsList.innerHTML = '';

            if (!wasSingleWordSearch) {
                statsWordFormsPlaceholder.textContent = "Perform a non-regex, single-word search to see breakdown.";
                statsWordFormsPlaceholder.classList.remove('hidden');
                statsWordFormsList.classList.add('hidden');
                return;
            }

            const formsArray = Object.entries(formsData)
                .sort(([, countA], [, countB]) => countB - countA);

            if (formsArray.length === 0) {
                statsWordFormsPlaceholder.textContent = "No variations of the search term found in results.";
                statsWordFormsPlaceholder.classList.remove('hidden');
                statsWordFormsList.classList.add('hidden');
            } else {
                statsWordFormsPlaceholder.classList.add('hidden');
                statsWordFormsList.classList.remove('hidden');
                formsArray.forEach(([word, count]) => {
                    const li = document.createElement('li');
                    const wordSpan = document.createElement('span');
                    wordSpan.textContent = word;
                    const countSpan = document.createElement('span');
                    countSpan.textContent = count;
                    li.appendChild(wordSpan);
                    li.appendChild(countSpan);
                    statsWordFormsList.appendChild(li);
                });
            }
        }

        // --- Word Cloud Rendering ---
        function renderWordCloud(ngramSize) {
            const containerId = `wordCloudContainer${ngramSize}gram`;
            const cloudContainer = document.getElementById(containerId);
            if (!cloudContainer) return;

            const statusElement = cloudContainer.querySelector('.wordCloudStatus');
            cloudContainer.innerHTML = '';
            if (statusElement) {
                statusElement.textContent = "Generating word cloud...";
                cloudContainer.appendChild(statusElement);
            } else {
                const newStatus = document.createElement('p');
                newStatus.className = 'wordCloudStatus text-center text-gray-500 p-4';
                newStatus.textContent = "Generating word cloud...";
                cloudContainer.appendChild(newStatus);
            }

            const frequencyData = currentFrequencyData[ngramSize] || [];
            const dataKey = ngramSize === 1 ? 'word' : 'phrase';
            let baseSizeMultiplier = 5;
            if (ngramSize === 2) baseSizeMultiplier = 3.5;
            else if (ngramSize === 3) baseSizeMultiplier = 3;
            else if (ngramSize === 4) baseSizeMultiplier = 2.5;

            const wordData = frequencyData.slice(0, WORD_CLOUD_LIMIT).map(d => ({
                text: d[dataKey],
                size: Math.sqrt(d.total) * baseSizeMultiplier
            }));

            const typeName = ngramSize === 1 ? 'word' :
                ngramSize === 2 ? 'phrase' :
                    ngramSize === 3 ? 'triplet' : 'quartet';

            if (wordData.length === 0) {
                const currentStatus = cloudContainer.querySelector('.wordCloudStatus');
                if (currentStatus) currentStatus.textContent = `Not enough data to generate ${typeName} cloud.`;
                return;
            }

            try {
                const containerWidth = cloudContainer.clientWidth > 0 ? cloudContainer.clientWidth : 300;
                const containerHeight = 250;
                wordCloudLayout = d3.layout.cloud()
                    .size([containerWidth, containerHeight])
                    .words(wordData)
                    .padding(ngramSize === 1 ? 5 : ngramSize === 2 ? 3 : (ngramSize === 3 ? 2 : 1.5))
                    .rotate(() => (ngramSize === 1 && Math.random() > 0.7 ? 90 : 0))
                    .font("sans-serif")
                    .fontSize(d => d.size)
                    .on("end", (words) => drawWordCloud(words, ngramSize, containerId, containerWidth, containerHeight));
                wordCloudLayout.start();
            } catch (error) {
                const currentStatus = cloudContainer.querySelector('.wordCloudStatus');
                if (currentStatus) currentStatus.textContent = `Error generating ${typeName} cloud layout.`;
            }
        }
        function drawWordCloud(words, ngramSize, containerId, width, height) {
            const cloudContainer = document.getElementById(containerId);
            if (!cloudContainer) return;
            cloudContainer.innerHTML = '';
            const typeName = ngramSize === 1 ? 'word' :
                ngramSize === 2 ? 'phrase' :
                    ngramSize === 3 ? 'triplet' : 'quartet';
            try {
                const svg = d3.select(`#${containerId}`).append("svg")
                    .attr("width", width)
                    .attr("height", height)
                    .append("g")
                    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

                svg.selectAll("text")
                    .data(words)
                    .enter().append("text")
                    .style("font-size", d => d.size + "px")
                    .style("font-family", "sans-serif")
                    .style("fill", (d, i) => d3.schemeCategory10[i % 10])
                    .attr("text-anchor", "middle")
                    .attr("transform", d => "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")")
                    .text(d => d.text)
                    .attr("class", "word-cloud-word")
                    .on("click", ngramSize === 1 ? (event, d) => {
                        searchInput.value = d.text;
                        regexSearchCheckbox.checked = false;
                        performSearch();
                    } : null);
            } catch (error) {
                cloudContainer.innerHTML = `<p class="wordCloudStatus text-center text-red-600 p-4">Error drawing ${typeName} cloud.</p>`;
            }
        }

        // --- Frequency Table Rendering (Generic for N-grams) ---
        function renderFrequencyTable() {
            const data = currentFrequencyData[currentNgramSize] || [];
            let tableBody, headers, colspan, defaultSortCol, defaultSortDir, dataKey;

            if (currentNgramSize === 1) {
                tableBody = statsWordTableBody; headers = statsWordTableHeaders; colspan = 6; defaultSortCol = 'total'; defaultSortDir = 'desc'; dataKey = 'word';
            } else if (currentNgramSize === 2) {
                tableBody = statsBigramTableBody; headers = statsBigramTableHeaders; colspan = 3; defaultSortCol = 'total'; defaultSortDir = 'desc'; dataKey = 'phrase';
            } else if (currentNgramSize === 3) {
                tableBody = statsTrigramTableBody; headers = statsTrigramTableHeaders; colspan = 3; defaultSortCol = 'total'; defaultSortDir = 'desc'; dataKey = 'phrase';
            } else if (currentNgramSize === 4) {
                tableBody = statsQuatgramTableBody; headers = statsQuatgramTableHeaders; colspan = 3; defaultSortCol = 'total'; defaultSortDir = 'desc'; dataKey = 'phrase';
            } else {
                return;
            }

            tableBody.innerHTML = "";

            if (!headers || headers.length === 0 || !Array.from(headers).some(th => th.dataset.sort === currentSortColumn)) {
                currentSortColumn = defaultSortCol;
                currentSortDirection = defaultSortDir;
            }

            data.sort((a, b) => {
                let compareA = a[currentSortColumn];
                let compareB = b[currentSortColumn];
                if (currentSortColumn === "word" || (currentSortColumn === "phrase" && currentNgramSize > 1)) {
                    compareA = (compareA || "").toLowerCase();
                    compareB = (compareB || "").toLowerCase();
                } else {
                    compareA = Number(compareA || 0);
                    compareB = Number(compareB || 0);
                }
                if (compareA < compareB) return currentSortDirection === "asc" ? -1 : 1;
                if (compareA > compareB) return currentSortDirection === "asc" ? 1 : -1;
                return 0;
            });

            if (headers) {
                headers.forEach((th) => {
                    th.classList.remove("sorted-asc", "sorted-desc");
                    if (th.dataset.sort === currentSortColumn) {
                        th.classList.add(currentSortDirection === "asc" ? "sorted-asc" : "sorted-desc");
                    }
                });
            }

            const dataToDisplay = data.slice(0, 100);
            const typeName = currentNgramSize === 1 ? 'word' :
                currentNgramSize === 2 ? '2-gram' :
                    currentNgramSize === 3 ? '3-gram' : '4-gram';
            if (dataToDisplay.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="${colspan}" class="text-center text-gray-500 py-4">No ${typeName} frequency data to display.</td></tr>`;
            } else {
                dataToDisplay.forEach((item) => {
                    const row = tableBody.insertRow();
                    row.insertCell().textContent = item[dataKey];
                    row.insertCell().textContent = item.total;
                    row.insertCell().textContent = item.unique;
                    if (currentNgramSize === 1) {
                        row.insertCell().textContent = formatStat(item.freqPerScripture, 3);
                        row.insertCell().textContent = formatPercentage(item.freqPerWord, 2);
                        row.insertCell().textContent = formatPercentage(item.coverage, 1);
                    }
                });
            }
        }

        // --- Sorting Logic (Handles multiple tables) ---
        function handleSort(column, tableType) {
            const targetNgramSize = parseInt(tableType.replace('gram', ''), 10);

            if (targetNgramSize !== currentNgramSize) {
                return;
            }

            if (currentSortColumn === column) {
                currentSortDirection = currentSortDirection === "asc" ? "desc" : "asc";
            } else {
                currentSortColumn = column;
                if (['freqPerScripture', 'freqPerWord', 'coverage', 'total', 'unique'].includes(column)) {
                    currentSortDirection = 'desc';
                } else {
                    currentSortDirection = 'asc';
                }
            }
            renderFrequencyTable();
        }
        document.querySelectorAll('.stats-table th[data-sort]').forEach((th) => {
            let tableType = '1gram';
            if (th.closest('#statsBigramTable')) {tableType = '2gram';}
            else if (th.closest('#statsTrigramTable')) {tableType = '3gram';}
            else if (th.closest('#statsQuatgramTable')) {tableType = '4gram';}
            th.addEventListener("click", () => handleSort(th.dataset.sort, tableType));
        });

        // --- Clear Statistics Display ---
        function clearStatisticsDisplay() {
            statsTotalCount.textContent = "0";
            statsVolumeChartContainer.innerHTML = '<p class="text-xs text-gray-500 italic text-center pt-4">Perform a search to generate volume chart.</p>';
            currentVolumeChartData = null;
            statsWordFormsList.innerHTML = '';
            statsWordFormsPlaceholder.textContent = "Perform a non-regex, single-word search to see breakdown.";
            statsWordFormsPlaceholder.classList.remove('hidden');
            statsWordFormsList.classList.add('hidden');

            statsWordTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-gray-500 py-4">Perform a search to see statistics.</td></tr>`;
            statsBigramTableBody.innerHTML = `<tr><td colspan="3" class="text-center text-gray-500 py-4">Perform a search to see 2-gram statistics.</td></tr>`;
            if (statsTrigramTableBody) {
                statsTrigramTableBody.innerHTML = `<tr><td colspan="3" class="text-center text-gray-500 py-4">Perform a search to see 3-gram statistics.</td></tr>`;
            }
            if (statsQuatgramTableBody) {
                statsQuatgramTableBody.innerHTML = `<tr><td colspan="3" class="text-center text-gray-500 py-4">Perform a search to see 4-gram statistics.</td></tr>`;
            }

            document.querySelectorAll('.wordCloudContainer').forEach(container => {
                const size = container.id.match(/(\d+)gram/)?.[1];
                const type = size === '1' ? 'word' : size === '2' ? 'phrase' : (size === '3' ? 'triplet' : 'quartet');
                container.innerHTML = `<p class="wordCloudStatus text-center text-gray-500 p-4">Perform a search to generate ${type} cloud.</p>`;
            });

            currentFrequencyData = {1: [], 2: [], 3: [], 4: []};
            document.querySelectorAll('.stats-table th[data-sort]').forEach((th) => {th.classList.remove("sorted-asc", "sorted-desc");});
            statsError.classList.add('hidden'); statsError.textContent = '';
            currentNgramSize = 1;
            ngramTabButtons.forEach(btn => btn.classList.remove('active'));
            ngramTabContainer.querySelector('[data-ngram-tab="1gram"]').classList.add('active');
            ngramTabContents.forEach(content => content.classList.remove('active'));
            document.getElementById('1gramContent')?.classList.add('active');
        }

        // --- Event Delegation for Copy and Add to Journal Buttons ---
        document.body.addEventListener("click", async (event) => {
            const copyButton = event.target.closest('.copy-button');
            const addToJournalButton = event.target.closest('.add-to-journal-button');

            // Use the globally defined modal elements:
            // noteModal, modalScriptureTextEl, modalVerseTitleEl, noteTextarea,
            // saveNoteButton, cancelNoteButton are already defined globally.
            // You might need a specific close button for THIS modal if the class '.modal-close-button' is too generic
            // or ensure the global 'modalCloseButton' is the one from 'noteModal'.
            // Let's assume the global 'modalCloseButton' is the one for the 'noteModal'
            // OR, if you changed the HTML for noteModal's close button to have an ID:
            const noteModalSpecificCloseButton = document.getElementById('noteModalCloseButton'); // If you add this ID

            if (copyButton && (resultsContainer.contains(copyButton) || contextDrawerContent.contains(copyButton))) {
                const textToCopy = unescape(copyButton.dataset.copy);
                const copyButtonText = copyButton.innerHTML;
                try {
                    await navigator.clipboard.writeText(textToCopy);
                    showButtonFeedback(copyButton, '<span class="text-green-600">✓ Copied!</span>');
                } catch (err) {
                    copyButton.innerHTML = '<span class="text-red-600">Error</span>';
                    setTimeout(() => {copyButton.innerHTML = copyButtonText;}, 1500);
                }
            } else if (addToJournalButton && (resultsContainer.contains(addToJournalButton) || contextDrawerContent.contains(addToJournalButton))) {

                let noteTextareaKeydownHandlerInstance; // To store the function for later removal
                let overlayClickHandlerInstance;      // To store the overlay click handler

                const verseTitle = unescape(addToJournalButton.dataset.verseTitle);
                const scriptureText = unescape(addToJournalButton.dataset.scriptureText);

                if (modalScriptureTextEl) modalScriptureTextEl.textContent = scriptureText;
                if (modalVerseTitleEl) modalVerseTitleEl.textContent = verseTitle;

                showModal(); // Calls the new global showModal

                const cleanupModalSpecificListeners = () => {
                    if (noteTextarea && noteTextareaKeydownHandlerInstance) {
                        noteTextarea.removeEventListener('keydown', noteTextareaKeydownHandlerInstance);
                    }
                    if (noteModal && overlayClickHandlerInstance) {
                        noteModal.removeEventListener('click', overlayClickHandlerInstance);
                    }
                };

                const handleSaveNote = () => {
                    const userNote = noteTextarea.value.trim();
                    let appendedNote = `> ${scriptureText} (${verseTitle})`;
                    if (userNote) {
                        appendedNote = `${userNote}\n${appendedNote}`;
                    }
                    if (journalEditor.value) {
                        appendedNote = `\n\n${appendedNote}`;
                    }
                    journalEditor.value += appendedNote;

                    updateJournalPreview();
                    journalEditor.scrollTop = journalEditor.scrollHeight;
                    journalEditor.focus();

                    showButtonFeedback(addToJournalButton, '<span class="text-green-600">✓ Added!</span>');
                    hideModal();
                    cleanupModalSpecificListeners();
                };

                const handleCancelNote = () => {
                    hideModal();
                    cleanupModalSpecificListeners();
                };

                // Define the Shift+Enter handler
                noteTextareaKeydownHandlerInstance = (e) => {
                    if (e.key === 'Enter' && e.shiftKey) {
                        e.preventDefault();
                        handleSaveNote();
                    }
                };
                // Add the keydown listener to the textarea
                if (noteTextarea) {
                    noteTextarea.addEventListener('keydown', noteTextareaKeydownHandlerInstance);
                }

                const handleOverlayClick = (e) => {
                    if (e.target === noteModal) {
                        handleCancelNote();
                    }
                };

                // Ensure event listeners are added to the correct global button elements
                if (saveNoteButton) saveNoteButton.addEventListener('click', handleSaveNote, {once: true});
                if (cancelNoteButton) cancelNoteButton.addEventListener('click', handleCancelNote, {once: true});

                // Use the close button specific to noteModal if you gave it an ID,
                // otherwise, the global `modalCloseButton` should be the one from `noteModal`.
                const actualNoteModalCloseButton = noteModal.querySelector('.modal-close-button'); // Get it fresh
                if (actualNoteModalCloseButton) {
                    actualNoteModalCloseButton.addEventListener('click', handleCancelNote, {once: true});
                }

                // For overlay click, you might not want {once: true} if the modal can be re-opened
                // and the listener needs to be active again.
                // It's better to add it here and ensure it's removed in handleSaveNote/handleCancelNote if needed.
                // However, since hideModal() is called which doesn't remove this specific listener,
                // and the main listener here is on document.body, this could lead to multiple overlay listeners
                // if not careful.
                // Simplest for now: if the modal is hidden, this specific click won't match e.target === noteModal.
                // A more robust way for overlay is to have ONE listener on noteModal that checks e.target.
                noteModal.addEventListener('click', handleOverlayClick); // Add it
                // And ensure it's removed:
                const cleanupOverlay = () => noteModal.removeEventListener('click', handleOverlayClick);
                if (saveNoteButton) saveNoteButton.addEventListener('click', cleanupOverlay, {once: true});
                if (cancelNoteButton) cancelNoteButton.addEventListener('click', cleanupOverlay, {once: true});
                if (actualNoteModalCloseButton) actualNoteModalCloseButton.addEventListener('click', cleanupOverlay, {once: true});


            }
        });
        // Optional: Close modal with Escape key
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                if (searchHelpModalOverlay.classList.contains("active")) closeModal(searchHelpModalOverlay);
                if (statsHelpModalOverlay.classList.contains("active")) closeModal(statsHelpModalOverlay);
                if (stopWordsModalOverlay.classList.contains("active")) closeModal(stopWordsModalOverlay);
                if (contextDrawerOverlay.classList.contains("active")) closeModal(contextDrawerOverlay);

                // Check for the noteModal
                if (noteModal && noteModal.classList.contains("active")) {
                    hideModal();
                    // If hideModal doesn't clean up specific listeners from save/cancel buttons
                    // added within the addToJournalButton click, and those buttons were NOT {once:true},
                    // you might need to manually trigger their cleanup here.
                    // But since we are using {once:true}, this should be fine.
                }
            }
        });
        // --- Populate Stop Words Modal ---
        function populateStopWordsModal() {
            stopWordsListDisplay.innerHTML = '';
            const sortedStopWords = Array.from(STOP_WORDS).sort();
            sortedStopWords.forEach(word => {
                const li = document.createElement('li');
                li.textContent = word;
                stopWordsListDisplay.appendChild(li);
            });
        }

        // --- Journal Chat Panel Functionality ---
        const journalButton = document.getElementById("journalButton");
        const closeJournalButton = document.getElementById("closeJournalButton");
        const journalSection = document.getElementById("journalSection");

        function toggleJournalPanel() {
            const isHidden = journalSection.classList.contains("translate-y-full");
            if (isHidden) {
                journalSection.classList.remove("translate-y-full");
                journalButton.classList.add("hidden");
            } else {
                journalSection.classList.add("translate-y-full");
                journalButton.classList.remove("hidden");
            }
        }

        journalButton.addEventListener("click", toggleJournalPanel);
        closeJournalButton.addEventListener("click", toggleJournalPanel);

        function updateJournalPreview() {
            const markdownText = journalEditor.value;
            if (markdownText.trim() === "") {
                journalPreview.innerHTML = '<p class="text-gray-400 italic">Your formatted journal notes will appear here.</p>';
            } else {
                journalPreview.innerHTML = marked.parse(markdownText);
            }
        }

        const editorToggle = document.getElementById("editorToggle");
        const previewToggle = document.getElementById("previewToggle");

        function showEditor() {
            journalEditor.classList.remove("hidden");
            journalPreview.classList.add("hidden");
            editorToggle.classList.remove("bg-gray-200", "text-gray-700");
            editorToggle.classList.add("bg-blue-600", "text-white");
            previewToggle.classList.remove("bg-blue-600", "text-white");
            previewToggle.classList.add("bg-gray-200", "text-gray-700");
        }

        function showPreview() {
            journalEditor.classList.add("hidden");
            journalPreview.classList.remove("hidden");
            previewToggle.classList.remove("bg-gray-200", "text-gray-700");
            previewToggle.classList.add("bg-blue-600", "text-white");
            editorToggle.classList.remove("bg-blue-600", "text-white");
            editorToggle.classList.add("bg-gray-200", "text-gray-700");
            updateJournalPreview();
        }

        editorToggle.addEventListener("click", showEditor);
        previewToggle.addEventListener("click", showPreview);
        journalEditor.addEventListener("input", updateJournalPreview);

        downloadJournalButton.addEventListener("click", () => {
            const content = journalEditor.value;
            const blob = new Blob([content], {type: "text/markdown;charset=utf-8"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "scripture_journal.md";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });



        copyJournalButton.addEventListener("click", async () => {
            const content = journalEditor.value;
            if (!content) {
                alert("Journal is empty. Nothing to copy.");
                return;
            }
            try {
                await navigator.clipboard.writeText(content);
                showButtonFeedback(copyJournalButton, '<span>✓ Copied!</span>')
            } catch (err) {
                alert("Failed to copy journal.");
            }
        });

        clearJournalButton.addEventListener("click", () => {
            if (journalEditor.value.trim() === "") {
                alert("Journal is already empty.");
                return;
            }
            if (confirm("Are you sure you want to clear the entire journal? This action cannot be undone.")) {
                journalEditor.value = "";
                updateJournalPreview();
            }
        });


        // --- Search History Management ---
        const MAX_SEARCH_HISTORY = 30;
        let searchHistory = [];

        function saveSearchSettings() {
            const settings = {
                searchTerm: searchInput.value.trim(),
                verseTitleFilter: verseTitleFilterInput.value.trim(),
                useRegex: regexSearchCheckbox.checked,
                caseSensitive: caseSensitiveCheckbox.checked,
                columnsByVolume: columnsByVolumeCheckbox.checked,
                shuffleResults: shuffleResultsCheckbox.checked,
                selectedVolumes: getSelectedVolumes(),
                timestamp: new Date().toISOString()
            };

            searchHistory.unshift(settings);
            if (searchHistory.length > MAX_SEARCH_HISTORY) {
                searchHistory.pop();
            }
            updateSearchHistoryDisplay();
        }

        function updateSearchHistoryDisplay() {
            const historyList = document.getElementById('searchHistoryList');
            historyList.innerHTML = '';

            searchHistory.forEach((settings, index) => {
                const historyItem = document.createElement('div');
                historyItem.className = 'bg-gray-50 p-4 rounded-lg shadow hover:bg-gray-100 cursor-pointer';

                const timeAgo = new Date(settings.timestamp).toLocaleString();

                historyItem.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div class="flex-grow">
                            <div class="font-semibold text-gray-900">${settings.searchTerm || '(empty search)'}</div>
                            <div class="text-sm text-gray-600">
                                ${settings.verseTitleFilter ? `Title Filter: ${settings.verseTitleFilter}<br>` : ''}
                                Regex: ${settings.useRegex ? '✓' : '✗'} | 
                                Case Sensitive: ${settings.caseSensitive ? '✓' : '✗'} |
                                Selected Volumes: ${settings.selectedVolumes.length}
                            </div>
                            <div class="text-xs text-gray-500 mt-1">${timeAgo}</div>
                        </div>
                    </div>
                `;

                historyItem.addEventListener('click', () => {
                    applySearchSettings(settings);
                });

                historyList.appendChild(historyItem);
            });
        }

        function applySearchSettings(settings) {
            searchInput.value = settings.searchTerm;
            verseTitleFilterInput.value = settings.verseTitleFilter;
            regexSearchCheckbox.checked = settings.useRegex;
            caseSensitiveCheckbox.checked = settings.caseSensitive;
            columnsByVolumeCheckbox.checked = settings.columnsByVolume;
            shuffleResultsCheckbox.checked = settings.shuffleResults;

            // Reset all volume checkboxes first
            volumeCheckboxElements.forEach(checkbox => {
                checkbox.checked = settings.selectedVolumes.includes(checkbox.value);
            });
            updateAllVolumesCheckboxState();

            toggleSearchHistoryPanel(false);
            performSearch();
        }

        // Search History Panel Toggle
        const searchHistoryButton = document.getElementById("searchHistoryButton");
        const closeSearchHistoryButton = document.getElementById("closeSearchHistoryButton");
        const searchHistorySection = document.getElementById("searchHistorySection");

        function toggleSearchHistoryPanel(show = null) {
            const isHidden = searchHistorySection.classList.contains("translate-y-full");
            const shouldShow = show !== null ? show : isHidden;

            if (shouldShow) {
                searchHistorySection.classList.remove("translate-y-full");
                searchHistoryButton.classList.add("hidden");
            } else {
                searchHistorySection.classList.add("translate-y-full");
                searchHistoryButton.classList.remove("hidden");
            }
        }

        searchHistoryButton.addEventListener("click", () => toggleSearchHistoryPanel(true));
        closeSearchHistoryButton.addEventListener("click", () => toggleSearchHistoryPanel(false));

        // --- Initial Setup ---
        let cfmSchedule = null;
        let cfmSelect = null;
        let cfmCheckbox = null;

        async function loadCFMSchedule() {
            try {
                const response = await fetch('cfm2026.json');
                cfmSchedule = await response.json();
                return cfmSchedule;
            } catch (error) {
                return null;
            }
        }

        function parseDateLocal(dateString) {
            const [year, month, day] = dateString.split('-').map(Number);
            return new Date(year, month - 1, day);
        }

        function formatDateRange(startDate, endDate) {
            const start = parseDateLocal(startDate);
            const end = parseDateLocal(endDate);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[start.getMonth()]} ${start.getDate()}-${end.getDate()}`;
        }

        function updateCFMSelect() {
            if (!cfmSchedule || !cfmSelect) return;
            
            cfmSelect.innerHTML = cfmSchedule.map((week, index) => {
                const dateRange = formatDateRange(week.start_date, week.end_date);
                const reading = week.verse_title.replace(/\[|\]/g, '');
                return `<option value="${index}">${dateRange}: ${reading}</option>`;
            }).join('');

            // Set current week
            const today = new Date();
            const currentWeek = cfmSchedule.findIndex(week => {
                const start = parseDateLocal(week.start_date);
                const end = parseDateLocal(week.end_date);
                // include the entire end date so selection works late on the last day
                end.setHours(23, 59, 59, 999);
                return today >= start && today <= end;
            });
            
            if (currentWeek !== -1) {
                cfmSelect.value = currentWeek.toString();
            }
        }

        function handleCFMFilterChange() {
            if (!cfmCheckbox || !cfmSelect) return;

            cfmSelect.disabled = !cfmCheckbox.checked;

            if (cfmCheckbox.checked && cfmSchedule) {
                // Disable random sort and volume columns for a smooth reading experience
                shuffleResultsCheckbox.checked = false;
                columnsByVolumeCheckbox.checked = false;
                singleColumnCheckbox.checked = true;
                document.documentElement.style.setProperty('--results-columns', '1');

                const selectedWeek = cfmSchedule[parseInt(cfmSelect.value)];
                if (selectedWeek) {
                    verseTitleFilterInput.value = selectedWeek.verse_title;
                    if (!verseTitleFilterInput.value.startsWith('^')) {
                        verseTitleFilterInput.value = '^' + verseTitleFilterInput.value;
                    }
                    performSearch();
                }
            }
            if (!cfmCheckbox.checked) {
                singleColumnCheckbox.checked = false;
                document.documentElement.style.setProperty('--results-columns', '4');
            }
        }

        document.addEventListener("DOMContentLoaded", async function () {
            
            // Initialize CFM elements
            cfmSelect = document.getElementById('comeFollowMeSelect');
            cfmCheckbox = document.getElementById('comeFollowMeFilterCheckbox');
            
            // Load CFM schedule and setup
            cfmSchedule = await loadCFMSchedule();
            if (cfmSchedule) {
                updateCFMSelect();
                cfmCheckbox.addEventListener('change', handleCFMFilterChange);
                cfmSelect.addEventListener('change', () => {
                    if (cfmCheckbox.checked) {
                        handleCFMFilterChange();
                    }
                });
            } else {
                cfmSelect.innerHTML = '<option value="">Failed to load schedule</option>';
            }
            searchButton.addEventListener("click", performSearch);
            searchInput.addEventListener("keypress", (e) => {if (e.key === "Enter") performSearch();});
            verseTitleFilterInput.addEventListener("keypress", (e) => {if (e.key === "Enter") performSearch();});

            // Detect if device is mobile
            const isMobile = window.matchMedia("(max-width: 768px)").matches;

            // Set defaults based on device type
            const compactViewCheckbox = document.getElementById("compactView");
            compactViewCheckbox.checked = isMobile;

            shuffleResultsCheckbox.checked = !isMobile;

            columnsByVolumeCheckbox.checked = !isMobile;
            singleColumnCheckbox.checked = false;
            document.documentElement.style.setProperty('--results-columns', '4');
            resultsContainer.className = !isMobile ? "results-flex-container" : "results-grid-container";

            let compactViewDebounceTimeout;

            compactViewCheckbox.addEventListener("change", () => {
                // Update CSS variable immediately for smooth transition
                document.documentElement.style.setProperty('--column-spacing', compactViewCheckbox.checked ? '0.25rem' : '1rem');

                // Add compact class to container for immediate feedback
                resultsContainer.classList.toggle('compact-mode', compactViewCheckbox.checked);

                // Debounce the heavy re-rendering
                clearTimeout(compactViewDebounceTimeout);
                compactViewDebounceTimeout = setTimeout(() => {
                    if (scriptureCache.currentResults && scriptureCache.currentResults.length > 0) {
                        // Batch DOM updates
                        requestAnimationFrame(() => {
                            displayResults(scriptureCache.currentResults, searchInput.value.trim(), caseSensitiveCheckbox.checked, columnsByVolumeCheckbox.checked);
                        });
                    }
                }, 150); // Debounce delay
            });

            columnsByVolumeCheckbox.addEventListener("change", () => {
                const hasResults = scriptureCache.currentResults && scriptureCache.currentResults.length > 0;
                if (hasResults) {
                    displayResults(scriptureCache.currentResults, searchInput.value.trim(), caseSensitiveCheckbox.checked, columnsByVolumeCheckbox.checked);
                } else {
                    resultsContainer.className = columnsByVolumeCheckbox.checked ? "results-flex-container" : "results-grid-container";
                }
            });

            singleColumnCheckbox.addEventListener("change", () => {
                const columns = singleColumnCheckbox.checked ? '1' : '4';
                document.documentElement.style.setProperty('--results-columns', columns);
            });

            // Setup Dark Mode Toggle
            const savedDark = localStorage.getItem('darkMode') === 'true';
            if (savedDark) {
                document.body.classList.add('dark-mode');
                if (darkModeIcon) darkModeIcon.textContent = 'Light';
            }
            if (darkModeToggle) {
                darkModeToggle.addEventListener('click', () => {
                    document.body.classList.toggle('dark-mode');
                    const isDark = document.body.classList.contains('dark-mode');
                    if (darkModeIcon) darkModeIcon.textContent = isDark ? 'Light' : 'Dark';
                    localStorage.setItem('darkMode', isDark);
                });
            }

            howToSearchButton.classList.add('opacity-0', 'pointer-events-none');
            }, 3000);
        });


        // --- Event Listener for Compact Card Action Trigger ---
        // Helper function to handle compact action triggers
        function handleCompactActionTrigger(event) {
            const actionTrigger = event.target.closest('.compact-card-action-trigger');
            if (actionTrigger) {
                event.stopPropagation(); // Prevent other click listeners if any

                const cardElement = actionTrigger.closest('.result-card');
                if (!cardElement || !cardElement.dataset.verseData) {
                    return;
                }
                try {
                    currentCompactActionVerse = JSON.parse(cardElement.dataset.verseData);
                } catch (e) {
                    currentCompactActionVerse = null;
                    return;
                }

                if (!currentCompactActionVerse) {
                    return;
                }

                // Populate and show the compact action modal
                if (compactActionModalTitle) { // Title of the modal itself
                    compactActionModalTitle.textContent = `Actions for:`; // Generic title
                }
                if (compactActionModalVerseRef) { // Specific element for the verse reference
                    compactActionModalVerseRef.textContent = currentCompactActionVerse.verse_title || "Selected Scripture";
                }

                // Dynamically set the Church Site link href when opening the modal
                if (compactActionChurchSiteLink && currentCompactActionVerse.book_title && currentCompactActionVerse.chapter_number && currentCompactActionVerse.verse_number) {
                    compactActionChurchSiteLink.href = `https://www.churchofjesuschrist.org/search?facet=all&lang=eng&query=${encodeURIComponent(currentCompactActionVerse.book_title)}+${currentCompactActionVerse.chapter_number}%3A${currentCompactActionVerse.verse_number}`;
                }

                openModal(compactActionModal);
            }
        }

        // Set up global event delegation for the compact action triggers
        document.addEventListener('click', (event) => {
            // First check if we clicked a compact action trigger
            const actionTrigger = event.target.closest('.compact-card-action-trigger');
            if (!actionTrigger) return;

            // Find the parent card that contains the verse data
            const cardElement = actionTrigger.closest('.result-card');
            if (!cardElement || !cardElement.dataset.verseData) {
                return;
            }

            try {
                currentCompactActionVerse = JSON.parse(cardElement.dataset.verseData);

                // Update modal content
                compactActionModalVerseRef.textContent = currentCompactActionVerse.verse_title || "Selected Scripture";

                // Update church site link
                if (currentCompactActionVerse.book_title && currentCompactActionVerse.chapter_number && currentCompactActionVerse.verse_number) {
                    compactActionChurchSiteLink.href = `https://www.churchofjesuschrist.org/search?facet=all&lang=eng&query=${encodeURIComponent(currentCompactActionVerse.book_title)}+${currentCompactActionVerse.chapter_number}%3A${currentCompactActionVerse.verse_number}`;
                }

                // Show the modal
                openModal(compactActionModal);
            } catch (e) {
                // Silently handle errors
            }
        });


        // --- Compact Action Modal Button Handlers ---
        // Handle close button click
        document.addEventListener('click', (event) => {
            const closeButton = event.target.closest('#compactActionModalCloseButton');
            if (closeButton) {
                closeModal(compactActionModal);
            }
        });

        // Handle modal overlay click
        compactActionModal.addEventListener("click", (event) => {
            if (event.target === compactActionModal) {
                closeModal(compactActionModal);
            }
        });

        // Add Escape key handler
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && compactActionModal.classList.contains("active")) {
                closeModal(compactActionModal);
            }
        });


        // Initialize compact action button handlers once
        if (compactActionCopyButton) {
            compactActionCopyButton.addEventListener('click', async () => {
                if (!currentCompactActionVerse) return;
                const textToCopy = `> ${currentCompactActionVerse.scripture_text} (${currentCompactActionVerse.verse_title})`;
                const originalButtonHTML = compactActionCopyButton.innerHTML;
                try {
                    await navigator.clipboard.writeText(textToCopy);
                    showButtonFeedback(compactActionCopyButton, '<span class="flex items-center space-x-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-green-400"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg><span>Copied!</span></span>', 1500);
                } catch (err) {
                    showButtonFeedback(compactActionCopyButton, '<span class="flex items-center space-x-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-red-400"><path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg><span>Error</span></span>', 1500);
                }
                closeModal(compactActionModal);
            });
        }

        if (compactActionAddToJournalButton) {
            compactActionAddToJournalButton.addEventListener('click', () => {
                if (!currentCompactActionVerse) return;

                // Populate and show the original noteModal for adding a note
                if (modalScriptureTextEl) modalScriptureTextEl.textContent = currentCompactActionVerse.scripture_text;
                if (modalVerseTitleEl) modalVerseTitleEl.textContent = currentCompactActionVerse.verse_title;

                // Create handlers that will be cleaned up
                const handleSaveNote = () => {
                    const userNote = noteTextarea.value.trim();
                    let appendedNote = `> ${currentCompactActionVerse.scripture_text} (${currentCompactActionVerse.verse_title})`;
                    if (userNote) {
                        appendedNote = `${userNote}\n${appendedNote}`;
                    }
                    if (journalEditor.value) {
                        appendedNote = `\n\n${appendedNote}`;
                    }
                    journalEditor.value += appendedNote;
                    updateJournalPreview();
                    journalEditor.scrollTop = journalEditor.scrollHeight;
                    cleanupListeners();
                    hideModal();
                };

                const handleKeydown = (e) => {
                    if (e.key === 'Enter' && e.shiftKey) {
                        e.preventDefault();
                        handleSaveNote();
                    }
                };

                const handleCancelNote = () => {
                    cleanupListeners();
                    hideModal();
                };

                const cleanupListeners = () => {
                    noteTextarea.removeEventListener('keydown', handleKeydown);
                    saveNoteButton.removeEventListener('click', handleSaveNote);
                    if (modalCloseButton) {
                        modalCloseButton.removeEventListener('click', handleCancelNote);
                    }
                    if (noteModal) {
                        noteModal.removeEventListener('click', handleModalClick);
                    }
                };

                const handleModalClick = (e) => {
                    if (e.target === noteModal) {
                        handleCancelNote();
                    }
                };

                // Add all event listeners
                noteTextarea.addEventListener('keydown', handleKeydown);
                saveNoteButton.addEventListener('click', handleSaveNote);
                if (modalCloseButton) {
                    modalCloseButton.addEventListener('click', handleCancelNote);
                }
                if (noteModal) {
                    noteModal.addEventListener('click', handleModalClick);
                }

                showModal();
                noteTextarea.value = '';
                noteTextarea.focus();
                closeModal(compactActionModal);
            });
        }

        if (compactActionGoogleSearchButton) {
            compactActionGoogleSearchButton.addEventListener('click', () => {
                if (!currentCompactActionVerse || !currentCompactActionVerse.scripture_text) return;
                window.open(`https://www.google.com/search?q=${encodeURIComponent(currentCompactActionVerse.scripture_text)}`, '_blank');
                closeModal(compactActionModal);
            });
        }

        // For compactActionChurchSiteLink, the href is set when the modal opens.
        // You might want to add closeModal(compactActionModal) here too if preferred.
        if (compactActionChurchSiteLink) {
            compactActionChurchSiteLink.addEventListener('click', () => {
                // Allow a moment for the new tab to open before closing.
                setTimeout(() => closeModal(compactActionModal), 100);
            });
        }
