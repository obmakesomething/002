// ================================
// Global State Management
// ================================

const state = {
    // Document state
    currentDocument: null,
    documentType: null, // 'pdf' or 'epub'

    // PDF specific
    pdfDoc: null,
    currentPage: 1,
    pageCount: 0,
    scale: 1.5,
    rendering: false,

    // EPUB specific
    epubBook: null,
    epubRendition: null,
    epubFontSize: 14,
    epubKeyboardHandler: null,
    epubSettings: {
        fontSize: 14,
        letterSpacing: 0,
        lineHeight: 1.7,
        paragraphSpacing: 0.5,
        fontFamily: '-apple-system, system-ui',
        darkMode: false
    },

    // Translation & Grammar
    selectedText: '',
    currentTranslation: '',
    currentGrammar: '',

    // Vocabulary
    vocabulary: [],

    // Table of Contents
    tableOfContents: []
};

// ================================
// DOM Elements
// ================================

const elements = {
    // File upload
    fileInput: document.getElementById('fileInput'),
    uploadBtn: document.getElementById('uploadBtn'),

    // PDF controls
    prevPageBtn: document.getElementById('prevPage'),
    nextPageBtn: document.getElementById('nextPage'),
    pageNum: document.getElementById('pageNum'),
    pageCount: document.getElementById('pageCount'),
    zoomInBtn: document.getElementById('zoomIn'),
    zoomOutBtn: document.getElementById('zoomOut'),
    zoomLevel: document.getElementById('zoomLevel'),

    // Containers
    pdfContainer: document.getElementById('pdfContainer'),
    pdfCanvas: document.getElementById('pdfCanvas'),
    textLayer: document.getElementById('textLayer'),
    epubContainer: document.getElementById('epubContainer'),
    welcomeMessage: document.getElementById('welcomeMessage'),

    // Translation popup
    translationPopup: document.getElementById('translationPopup'),
    selectedTextEl: document.getElementById('selectedText'),
    translationText: document.getElementById('translationText'),
    grammarText: document.getElementById('grammarText'),
    closePopupBtn: document.getElementById('closePopup'),
    retranslateBtn: document.getElementById('retranslateBtn'),
    addToVocabBtn: document.getElementById('addToVocabBtn'),

    // Table of Contents
    tocList: document.getElementById('tocList'),

    // Vocabulary
    vocabList: document.getElementById('vocabList'),
    vocabTotal: document.getElementById('vocabTotal'),
    vocabToday: document.getElementById('vocabToday'),
    exportVocabBtn: document.getElementById('exportVocab'),
    clearVocabBtn: document.getElementById('clearVocab'),

    // Books list
    booksList: document.getElementById('booksList'),

    // Mobile menu
    menuToggle: document.getElementById('menuToggle'),
    sidebar: document.querySelector('.sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),

    // User info
    userInfo: document.getElementById('userInfo'),
    logoutBtn: document.getElementById('logoutBtn'),

    // Loading overlay
    loadingOverlay: document.getElementById('loadingOverlay')
};

// ================================
// Initialization
// ================================

function init() {
    loadVocabulary();
    setupEventListeners();
    updateVocabStats();
}

function setupEventListeners() {
    // File upload
    if (elements.uploadBtn) {
        elements.uploadBtn.addEventListener('click', () => {
            console.log('Upload button clicked');
            elements.fileInput.click();
        });
        console.log('Upload button event listener registered');
    } else {
        console.error('Upload button not found!');
    }

    if (elements.fileInput) {
        elements.fileInput.addEventListener('change', handleFileSelect);
        console.log('File input event listener registered');
    } else {
        console.error('File input not found!');
    }

    // PDF navigation
    elements.prevPageBtn.addEventListener('click', () => changePage(-1));
    elements.nextPageBtn.addEventListener('click', () => changePage(1));
    elements.zoomInBtn.addEventListener('click', () => changeZoom(0.1));
    elements.zoomOutBtn.addEventListener('click', () => changeZoom(-0.1));

    // Text selection - Disabled, using context menu instead
    // document.addEventListener('mouseup', handleTextSelection);

    // Translation popup
    elements.closePopupBtn.addEventListener('click', closeTranslationPopup);
    elements.retranslateBtn.addEventListener('click', retranslate);
    elements.addToVocabBtn.addEventListener('click', addToVocabulary);

    // Vocabulary actions
    elements.exportVocabBtn.addEventListener('click', exportVocabulary);
    elements.clearVocabBtn.addEventListener('click', clearVocabulary);

    // Sidebar tabs
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchSidebarTab(tabName);
        });
    });

    // Mobile menu toggle
    if (elements.menuToggle) {
        elements.menuToggle.addEventListener('click', toggleMobileMenu);
    }
    if (elements.sidebarOverlay) {
        elements.sidebarOverlay.addEventListener('click', closeMobileMenu);
    }

    // Logout
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', logout);
    }
}

// ================================
// File Handling
// ================================

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();

    if (!fileName.endsWith('.pdf') && !fileName.endsWith('.epub')) {
        alert('Please select a PDF or EPUB file');
        return;
    }

    showLoading(true, 'Uploading to server...');

    try {
        // Step 1: Upload to server
        const formData = new FormData();
        formData.append('book', file);

        const uploadResponse = await fetch('/api/books/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include' // Include session cookies
        });

        if (!uploadResponse.ok) {
            // Try to get error message
            const contentType = uploadResponse.headers.get('content-type');
            let errorMessage = 'Upload failed';

            if (contentType && contentType.includes('application/json')) {
                const error = await uploadResponse.json();
                errorMessage = error.error || errorMessage;
            } else {
                // Server returned HTML (likely error page)
                const text = await uploadResponse.text();
                console.error('Server error (HTML):', text.substring(0, 500));
                errorMessage = `Server error (${uploadResponse.status}): ${uploadResponse.statusText}`;
            }

            throw new Error(errorMessage);
        }

        const uploadData = await uploadResponse.json();
        console.log('Book uploaded:', uploadData);

        // Step 2: Load the file in viewer
        // handleFile will show its own loading messages
        await handleFile(file);

        // Step 3: Refresh books list
        await loadBooksList();

        // Step 4: Hide welcome message
        elements.welcomeMessage.style.display = 'none';

        // Step 5: Show success message
        showSuccessMessage(`📚 ${file.name} uploaded successfully!`);

    } catch (error) {
        console.error('Error uploading file:', error);
        alert('Error uploading file: ' + error.message);
        showLoading(false);
    } finally {
        // Reset file input
        event.target.value = '';
    }
}

async function handleFile(file) {
    const fileName = file.name.toLowerCase();

    // Hide welcome message
    if (elements.welcomeMessage) {
        elements.welcomeMessage.style.display = 'none';
    }

    // Reset scroll position
    if (elements.pdfContainer) {
        elements.pdfContainer.scrollTop = 0;
        elements.pdfContainer.scrollLeft = 0;
    }

    if (fileName.endsWith('.pdf')) {
        await loadPDF(file);
    } else if (fileName.endsWith('.epub')) {
        await loadEPUB(file);
    }
}

function showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--system-green);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-size: 17px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        animation: slideDown 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ================================
// PDF Handling
// ================================

async function loadPDF(file) {
    try {
        state.documentType = 'pdf';

        showLoading(true, 'Loading PDF document...');
        const arrayBuffer = await file.arrayBuffer();

        showLoading(true, 'Parsing PDF structure...');
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        state.pdfDoc = await loadingTask.promise;
        state.pageCount = state.pdfDoc.numPages;
        state.currentPage = 1;

        // Show PDF container
        elements.pdfContainer.style.display = 'flex';
        elements.epubContainer.style.display = 'none';

        // Update UI
        elements.pageCount.textContent = state.pageCount;
        elements.prevPageBtn.disabled = false;
        elements.nextPageBtn.disabled = false;

        // Enable zoom controls for PDF
        elements.zoomIn.disabled = false;
        elements.zoomOut.disabled = false;
        elements.zoomLevel.textContent = Math.round(state.scale * 100) + '%';

        // Load first page
        showLoading(true, 'Rendering page 1...');
        await renderPage(state.currentPage);

        showLoading(false);

        // Load table of contents in background
        loadPDFTableOfContents().catch(err => {
            console.error('Failed to load PDF TOC:', err);
        });

    } catch (error) {
        showLoading(false);
        console.error('PDF loading error:', error);
        alert('Failed to load PDF: ' + error.message);
    }
}

async function renderPage(pageNum) {
    if (state.rendering) return;
    state.rendering = true;

    const page = await state.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: state.scale });

    const canvas = elements.pdfCanvas;
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };

    await page.render(renderContext).promise;

    // Render text layer for selection
    await renderTextLayer(page, viewport);

    // Update UI
    state.currentPage = pageNum;
    elements.pageNum.textContent = pageNum;
    elements.prevPageBtn.disabled = pageNum <= 1;
    elements.nextPageBtn.disabled = pageNum >= state.pageCount;

    state.rendering = false;
}

async function renderTextLayer(page, viewport) {
    const textContent = await page.getTextContent();
    const textLayer = elements.textLayer;

    // Clear existing text layer
    textLayer.innerHTML = '';
    textLayer.style.width = viewport.width + 'px';
    textLayer.style.height = viewport.height + 'px';

    // Render text items
    textContent.items.forEach(item => {
        const span = document.createElement('span');
        const tx = pdfjsLib.Util.transform(
            viewport.transform,
            item.transform
        );

        const fontSize = Math.abs(tx[3]);
        const left = tx[4];
        const top = viewport.height - tx[5] - fontSize; // Convert from PDF coordinate system

        span.textContent = item.str;
        span.style.left = left + 'px';
        span.style.top = top + 'px';
        span.style.fontSize = fontSize + 'px';
        span.style.fontFamily = item.fontName;

        textLayer.appendChild(span);
    });
}

async function loadPDFTableOfContents() {
    try {
        const outline = await state.pdfDoc.getOutline();
        if (outline && outline.length > 0) {
            state.tableOfContents = outline;
            renderTableOfContents(outline);
        } else {
            elements.tocList.innerHTML = '<li class="toc-item" style="color: #999;">No table of contents available</li>';
        }
    } catch (error) {
        console.error('Error loading PDF table of contents:', error);
        elements.tocList.innerHTML = '<li class="toc-item" style="color: #999;">Error loading TOC</li>';
    }
}

function changePage(delta) {
    if (state.documentType === 'epub') {
        // EPUB navigation
        if (delta > 0) {
            state.epubRendition.next();
        } else {
            state.epubRendition.prev();
        }
    } else {
        // PDF navigation
        const newPage = state.currentPage + delta;
        if (newPage >= 1 && newPage <= state.pageCount) {
            renderPage(newPage);
        }
    }
}

function changeZoom(delta) {
    if (state.documentType === 'epub') {
        // EPUB font size adjustment
        const currentSize = parseInt(state.epubFontSize || 19);
        const newSize = Math.max(14, Math.min(32, currentSize + delta * 2));
        state.epubFontSize = newSize;
        state.epubRendition.themes.fontSize(newSize + 'px');
        elements.zoomLevel.textContent = newSize + 'px';
    } else {
        // PDF zoom
        state.scale = Math.max(0.5, Math.min(3, state.scale + delta));
        elements.zoomLevel.textContent = Math.round(state.scale * 100) + '%';
        renderPage(state.currentPage);
    }
}

// ================================
// EPUB Handling
// ================================

async function loadEPUB(file) {
    try {
        state.documentType = 'epub';

        // Step 1: Read file
        showLoading(true, 'Reading EPUB file...');
        const arrayBuffer = await file.arrayBuffer();

        // Step 2: Parse EPUB structure
        showLoading(true, 'Parsing EPUB structure...');

        // Check if ePub is available
        if (typeof ePub === 'undefined' && typeof window.ePub === 'undefined') {
            throw new Error('EPUB.js library not loaded. Please refresh the page.');
        }

        // Create book instance and open the arrayBuffer
        const epubConstructor = typeof ePub !== 'undefined' ? ePub : window.ePub;
        state.epubBook = epubConstructor();
        await state.epubBook.open(arrayBuffer);

        // Show EPUB container
        elements.pdfContainer.style.display = 'none';
        elements.epubContainer.style.display = 'block';

        // Enable navigation buttons for EPUB
        elements.prevPageBtn.disabled = false;
        elements.nextPageBtn.disabled = false;
        elements.pageNum.textContent = 'EPUB';
        elements.pageCount.textContent = 'Reader';

        // Disable zoom for EPUB (use font settings instead)
        elements.zoomIn.disabled = true;
        elements.zoomOut.disabled = true;
        elements.zoomLevel.textContent = 'Font';

        // Step 3: Render first page
        showLoading(true, 'Rendering content...');
        state.epubRendition = state.epubBook.renderTo(elements.epubContainer, {
            width: '100%',
            height: '100%',
            spread: 'none',
            flow: 'paginated'
        });

        await state.epubRendition.display();

        // Register and apply EPUB themes
        registerEPUBThemes();
        applyEPUBSettings();

        // Setup EPUB settings event listeners
        setupEPUBSettingsListeners();

        // Hide loading once content is visible
        showLoading(false);

        // Load table of contents in background (don't block)
        loadEPUBTableOfContents().catch(err => {
            console.error('Failed to load TOC:', err);
        });

        // Enable text selection
        setupEPUBTextSelection();

        // Setup keyboard navigation for EPUB
        setupEPUBKeyboardNav();

    } catch (error) {
        showLoading(false);
        console.error('EPUB loading error:', error);
        alert('Failed to load EPUB: ' + error.message);
    }
}

async function loadEPUBTableOfContents() {
    try {
        const navigation = await state.epubBook.loaded.navigation;
        if (navigation.toc && navigation.toc.length > 0) {
            state.tableOfContents = navigation.toc;
            renderEPUBTableOfContents(navigation.toc);
        } else {
            elements.tocList.innerHTML = '<li class="toc-item" style="color: #999;">No table of contents available</li>';
        }
    } catch (error) {
        console.error('Error loading EPUB table of contents:', error);
        elements.tocList.innerHTML = '<li class="toc-item" style="color: #999;">Error loading TOC</li>';
    }
}

function renderEPUBTableOfContents(toc, level = 1) {
    elements.tocList.innerHTML = '';

    function addTocItems(items, parentElement, depth) {
        items.forEach(item => {
            const li = document.createElement('li');
            li.className = `toc-item level-${depth}`;
            li.textContent = item.label;
            li.addEventListener('click', () => {
                state.epubRendition.display(item.href);
            });
            parentElement.appendChild(li);

            if (item.subitems && item.subitems.length > 0) {
                addTocItems(item.subitems, parentElement, depth + 1);
            }
        });
    }

    addTocItems(toc, elements.tocList, level);
}

function setupEPUBTextSelection() {
    state.epubRendition.on('selected', (cfiRange, contents) => {
        const selection = contents.window.getSelection();
        const text = selection.toString().trim();

        if (text.length > 0) {
            state.selectedText = text;
            showTranslationPopup(text);
        }
    });
}

function setupEPUBKeyboardNav() {
    // Remove previous keyboard listener if exists
    if (state.epubKeyboardHandler) {
        document.removeEventListener('keydown', state.epubKeyboardHandler);
    }

    // Create new keyboard handler
    state.epubKeyboardHandler = (e) => {
        if (state.documentType !== 'epub') return;

        // Only handle if not typing in input/textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                state.epubRendition.prev();
                break;
            case 'ArrowRight':
                e.preventDefault();
                state.epubRendition.next();
                break;
            case 'ArrowUp':
                e.preventDefault();
                state.epubRendition.prev();
                break;
            case 'ArrowDown':
                e.preventDefault();
                state.epubRendition.next();
                break;
        }
    };

    document.addEventListener('keydown', state.epubKeyboardHandler);
}

// ================================
// EPUB Typography Settings
// ================================

function registerEPUBThemes() {
    if (!state.epubRendition) return;

    // Light theme
    state.epubRendition.themes.register('light', {
        body: {
            'background-color': '#FFFFFF !important',
            'color': '#000000 !important'
        }
    });

    // Dark theme
    state.epubRendition.themes.register('dark', {
        body: {
            'background-color': '#1C1C1E !important',
            'color': '#E5E5EA !important'
        },
        'p, div, span': {
            'color': '#E5E5EA !important'
        },
        'a': {
            'color': '#007AFF !important'
        }
    });
}

function applyEPUBSettings() {
    if (!state.epubRendition) return;

    const s = state.epubSettings;

    // Font size
    state.epubRendition.themes.fontSize(`${s.fontSize}pt`);

    // Font family
    state.epubRendition.themes.font(s.fontFamily);

    // Theme (dark/light)
    state.epubRendition.themes.select(s.darkMode ? 'dark' : 'light');

    // Letter spacing, line height, paragraph spacing
    const customCSS = `
        body {
            letter-spacing: ${s.letterSpacing}em !important;
            line-height: ${s.lineHeight} !important;
        }
        p {
            margin-bottom: ${s.paragraphSpacing * s.lineHeight}em !important;
        }
    `;

    state.epubRendition.themes.override('custom', customCSS);
}

function setupEPUBSettingsListeners() {
    // Dark mode toggle
    const darkModeToggle = document.getElementById('epubDarkMode');
    if (darkModeToggle) {
        darkModeToggle.checked = state.epubSettings.darkMode;
        darkModeToggle.addEventListener('change', (e) => {
            state.epubSettings.darkMode = e.target.checked;
            applyEPUBSettings();
        });
    }

    // Font size slider and input
    const fontSizeSlider = document.getElementById('epubFontSizeSlider');
    const fontSizeInput = document.getElementById('epubFontSizeInput');

    if (fontSizeSlider && fontSizeInput) {
        fontSizeSlider.value = state.epubSettings.fontSize;
        fontSizeInput.value = state.epubSettings.fontSize;

        const updateFontSize = (value) => {
            state.epubSettings.fontSize = parseInt(value);
            fontSizeSlider.value = value;
            fontSizeInput.value = value;
            applyEPUBSettings();
        };

        fontSizeSlider.addEventListener('input', (e) => updateFontSize(e.target.value));
        fontSizeInput.addEventListener('change', (e) => updateFontSize(e.target.value));
    }

    // Letter spacing
    const letterSpacingSlider = document.getElementById('epubLetterSpacingSlider');
    const letterSpacingValue = document.getElementById('epubLetterSpacingValue');

    if (letterSpacingSlider && letterSpacingValue) {
        letterSpacingSlider.value = state.epubSettings.letterSpacing * 100;
        letterSpacingValue.textContent = state.epubSettings.letterSpacing.toFixed(2) + 'em';

        letterSpacingSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value) / 100;
            state.epubSettings.letterSpacing = value;
            letterSpacingValue.textContent = value.toFixed(2) + 'em';
            applyEPUBSettings();
        });
    }

    // Line height
    const lineHeightSlider = document.getElementById('epubLineHeightSlider');
    const lineHeightValue = document.getElementById('epubLineHeightValue');

    if (lineHeightSlider && lineHeightValue) {
        lineHeightSlider.value = state.epubSettings.lineHeight * 10;
        lineHeightValue.textContent = state.epubSettings.lineHeight.toFixed(1);

        lineHeightSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value) / 10;
            state.epubSettings.lineHeight = value;
            lineHeightValue.textContent = value.toFixed(1);
            applyEPUBSettings();
        });
    }

    // Paragraph spacing
    const paragraphSpacingSlider = document.getElementById('epubParagraphSpacingSlider');
    const paragraphSpacingValue = document.getElementById('epubParagraphSpacingValue');

    if (paragraphSpacingSlider && paragraphSpacingValue) {
        paragraphSpacingSlider.value = state.epubSettings.paragraphSpacing * 10;
        paragraphSpacingValue.textContent = state.epubSettings.paragraphSpacing.toFixed(1) + 'x';

        paragraphSpacingSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value) / 10;
            state.epubSettings.paragraphSpacing = value;
            paragraphSpacingValue.textContent = value.toFixed(1) + 'x';
            applyEPUBSettings();
        });
    }

    // Font family
    const fontFamilySelect = document.getElementById('epubFontFamily');
    if (fontFamilySelect) {
        fontFamilySelect.value = state.epubSettings.fontFamily;
        fontFamilySelect.addEventListener('change', (e) => {
            state.epubSettings.fontFamily = e.target.value;
            applyEPUBSettings();
        });
    }

    // Reset button
    const resetButton = document.getElementById('resetEpubSettings');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            // Reset to defaults
            state.epubSettings = {
                fontSize: 14,
                letterSpacing: 0,
                lineHeight: 1.7,
                paragraphSpacing: 0.5,
                fontFamily: '-apple-system, system-ui',
                darkMode: false
            };

            // Update UI
            if (darkModeToggle) darkModeToggle.checked = false;
            if (fontSizeSlider) fontSizeSlider.value = 14;
            if (fontSizeInput) fontSizeInput.value = 14;
            if (letterSpacingSlider) letterSpacingSlider.value = 0;
            if (letterSpacingValue) letterSpacingValue.textContent = '0.00em';
            if (lineHeightSlider) lineHeightSlider.value = 17;
            if (lineHeightValue) lineHeightValue.textContent = '1.7';
            if (paragraphSpacingSlider) paragraphSpacingSlider.value = 5;
            if (paragraphSpacingValue) paragraphSpacingValue.textContent = '0.5x';
            if (fontFamilySelect) fontFamilySelect.value = '-apple-system, system-ui';

            applyEPUBSettings();
        });
    }
}

// ================================
// Table of Contents (PDF)
// ================================

function renderTableOfContents(outline, level = 1) {
    elements.tocList.innerHTML = '';

    function addOutlineItems(items, parentElement, depth) {
        items.forEach(item => {
            const li = document.createElement('li');
            li.className = `toc-item level-${depth}`;
            li.textContent = item.title;

            li.addEventListener('click', async () => {
                if (item.dest) {
                    const dest = typeof item.dest === 'string'
                        ? await state.pdfDoc.getDestination(item.dest)
                        : item.dest;

                    if (dest) {
                        const pageIndex = await state.pdfDoc.getPageIndex(dest[0]);
                        await renderPage(pageIndex + 1);
                    }
                }
            });

            parentElement.appendChild(li);

            if (item.items && item.items.length > 0) {
                addOutlineItems(item.items, parentElement, depth + 1);
            }
        });
    }

    addOutlineItems(outline, elements.tocList, level);
}

// ================================
// Text Selection & Translation
// ================================

function handleTextSelection(event) {
    if (state.documentType !== 'pdf') return;

    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length > 0) {
        state.selectedText = text;
        showTranslationPopup(text);
    }
}

async function showTranslationPopup(text) {
    // Show popup
    elements.translationPopup.classList.remove('hidden');
    elements.selectedTextEl.textContent = text;

    // Reset content
    elements.translationText.textContent = 'Loading translation...';
    elements.translationText.classList.add('loading');
    elements.grammarText.textContent = 'Analyzing grammar...';
    elements.grammarText.classList.add('loading');

    // Load translation and grammar
    await loadTranslation(text);
    await loadGrammarExplanation(text);
}

function closeTranslationPopup() {
    elements.translationPopup.classList.add('hidden');
}

async function retranslate() {
    if (state.selectedText) {
        showTranslationPopup(state.selectedText);
    }
}

// ================================
// Translation Service
// ================================

async function loadTranslation(text) {
    try {
        // Using MyMemory Translation API (Free, no API key required)
        const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ko`
        );

        const data = await response.json();

        if (data.responseStatus === 200 && data.responseData) {
            state.currentTranslation = data.responseData.translatedText;
            elements.translationText.textContent = state.currentTranslation;
            elements.translationText.classList.remove('loading');
        } else {
            throw new Error('Translation failed');
        }
    } catch (error) {
        console.error('Translation error:', error);
        elements.translationText.textContent = '❌ Translation failed. Please try again.';
        elements.translationText.classList.remove('loading');
    }
}

// ================================
// Grammar Explanation
// ================================

async function loadGrammarExplanation(text) {
    try {
        // For grammar explanation, we'll use a simple pattern-based approach
        // In a production app, you'd want to use a proper NLP API
        const explanation = analyzeGrammar(text);

        state.currentGrammar = explanation;
        elements.grammarText.innerHTML = explanation;
        elements.grammarText.classList.remove('loading');
    } catch (error) {
        console.error('Grammar analysis error:', error);
        elements.grammarText.textContent = '❌ Grammar analysis failed.';
        elements.grammarText.classList.remove('loading');
    }
}

function analyzeGrammar(text) {
    // Simple grammar analysis
    let analysis = '<ul>';

    // Sentence type
    if (text.endsWith('?')) {
        analysis += '<li><strong>Type:</strong> Question (의문문)</li>';
    } else if (text.endsWith('!')) {
        analysis += '<li><strong>Type:</strong> Exclamation (감탄문)</li>';
    } else {
        analysis += '<li><strong>Type:</strong> Statement (평서문)</li>';
    }

    // Tense detection
    if (text.match(/\b(is|are|am)\b/i)) {
        analysis += '<li><strong>Tense:</strong> Present Simple (현재 시제)</li>';
    } else if (text.match(/\b(was|were)\b/i)) {
        analysis += '<li><strong>Tense:</strong> Past Simple (과거 시제)</li>';
    } else if (text.match(/\b(will|shall)\b/i)) {
        analysis += '<li><strong>Tense:</strong> Future (미래 시제)</li>';
    } else if (text.match(/\b(have|has|had)\b.*\b\w+ed\b/i)) {
        analysis += '<li><strong>Tense:</strong> Perfect (완료 시제)</li>';
    }

    // Detect modal verbs
    const modals = text.match(/\b(can|could|may|might|must|should|would|will)\b/gi);
    if (modals) {
        analysis += `<li><strong>Modal Verbs:</strong> ${modals.join(', ')} (조동사)</li>`;
    }

    // Detect passive voice
    if (text.match(/\b(is|are|was|were|been)\b.*\b\w+ed\b/i)) {
        analysis += '<li><strong>Voice:</strong> Passive (수동태)</li>';
    }

    // Word count
    const words = text.split(/\s+/).length;
    analysis += `<li><strong>Word Count:</strong> ${words}</li>`;

    analysis += '</ul>';

    return analysis;
}

// ================================
// Vocabulary Management
// ================================

function loadVocabulary() {
    const saved = localStorage.getItem('vocabulary');
    if (saved) {
        state.vocabulary = JSON.parse(saved);
    }
}

function saveVocabulary() {
    localStorage.setItem('vocabulary', JSON.stringify(state.vocabulary));
    updateVocabStats();
    renderVocabularyList();
}

function addToVocabulary() {
    if (!state.selectedText || !state.currentTranslation) return;

    // Check if already exists
    const exists = state.vocabulary.some(item => item.word === state.selectedText);
    if (exists) {
        alert('This word is already in your vocabulary!');
        return;
    }

    const vocabItem = {
        word: state.selectedText,
        translation: state.currentTranslation,
        grammar: state.currentGrammar,
        date: new Date().toISOString(),
        reviewCount: 0
    };

    state.vocabulary.unshift(vocabItem);
    saveVocabulary();

    alert('✅ Added to vocabulary!');
}

function updateVocabStats() {
    elements.vocabTotal.textContent = state.vocabulary.length;

    const today = new Date().toDateString();
    const todayCount = state.vocabulary.filter(item => {
        const itemDate = new Date(item.date).toDateString();
        return itemDate === today;
    }).length;

    elements.vocabToday.textContent = todayCount;
}

function renderVocabularyList() {
    if (state.vocabulary.length === 0) {
        elements.vocabList.innerHTML = '<p style="color: #999; text-align: center; margin-top: 2rem;">No words saved yet</p>';
        return;
    }

    elements.vocabList.innerHTML = '';

    state.vocabulary.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'vocab-item';
        div.innerHTML = `
            <div class="vocab-word">${item.word}</div>
            <div class="vocab-translation">${item.translation}</div>
        `;

        div.addEventListener('click', () => {
            showVocabularyDetail(item);
        });

        elements.vocabList.appendChild(div);
    });
}

function showVocabularyDetail(item) {
    elements.translationPopup.classList.remove('hidden');
    elements.selectedTextEl.textContent = item.word;
    elements.translationText.textContent = item.translation;
    elements.translationText.classList.remove('loading');
    elements.grammarText.innerHTML = item.grammar;
    elements.grammarText.classList.remove('loading');
}

function exportVocabulary() {
    if (state.vocabulary.length === 0) {
        alert('No vocabulary to export!');
        return;
    }

    const data = JSON.stringify(state.vocabulary, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `vocabulary_${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

function clearVocabulary() {
    if (!confirm('Are you sure you want to clear all vocabulary? This cannot be undone.')) {
        return;
    }

    state.vocabulary = [];
    saveVocabulary();
}

// ================================
// Utility Functions
// ================================

function showLoading(show, message = 'Loading...') {
    if (show) {
        elements.loadingOverlay.classList.remove('hidden');
        const messageElement = elements.loadingOverlay.querySelector('p');
        if (messageElement) {
            messageElement.textContent = message;
        }
    } else {
        elements.loadingOverlay.classList.add('hidden');
    }
}

// ================================
// Bionic Reading Functions
// ================================

const bionicSettings = {
    enabled: false,
    fixation: 2,
    saccade: 1,
    opacity: 70,
    mode: 'letters',
    apply: 'all'
};

function setupBionicEventListeners() {
    // Sidebar tabs
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchSidebarTab(tabName);
        });
    });

    // Bionic settings
    document.getElementById('bionicEnabled').addEventListener('change', (e) => {
        bionicSettings.enabled = e.target.checked;
        if (bionicSettings.enabled) {
            applyBionicReading();
        } else {
            removeBionicReading();
        }
    });

    document.getElementById('fixationLevel').addEventListener('input', (e) => {
        bionicSettings.fixation = parseInt(e.target.value);
        document.getElementById('fixationValue').textContent = e.target.value;
    });

    document.getElementById('saccadeLevel').addEventListener('input', (e) => {
        bionicSettings.saccade = parseInt(e.target.value);
        document.getElementById('saccadeValue').textContent = e.target.value;
    });

    document.getElementById('opacityLevel').addEventListener('input', (e) => {
        bionicSettings.opacity = parseInt(e.target.value);
        document.getElementById('opacityValue').textContent = e.target.value + '%';
    });

    document.getElementById('bionicMode').addEventListener('change', (e) => {
        bionicSettings.mode = e.target.value;
    });

    document.getElementById('bionicApply').addEventListener('change', (e) => {
        bionicSettings.apply = e.target.value;
    });

    document.getElementById('applyBionic').addEventListener('click', () => {
        if (bionicSettings.enabled) {
            applyBionicReading();
        }
    });

    document.getElementById('bionicToggle').addEventListener('click', () => {
        switchSidebarTab('bionic');
    });
}

function switchSidebarTab(tabName) {
    // Update tabs
    document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.sidebar-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tabName + 'Content').classList.add('active');
}

function applyBionicReading() {
    const container = state.documentType === 'epub' ? elements.epubContainer : elements.textLayer;

    if (!container) return;

    // Get all text nodes
    const textNodes = getTextNodes(container);

    textNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            const words = node.textContent.split(/\s+/);
            const fragment = document.createDocumentFragment();

            words.forEach((word, index) => {
                if (index > 0) {
                    fragment.appendChild(document.createTextNode(' '));
                }

                // Apply saccade (skip some words)
                if (index % (bionicSettings.saccade + 1) !== 0) {
                    fragment.appendChild(document.createTextNode(word));
                    return;
                }

                const processed = processBionicWord(word);
                fragment.appendChild(processed);
            });

            node.parentNode.replaceChild(fragment, node);
        }
    });
}

function processBionicWord(word) {
    const span = document.createElement('span');

    if (word.length <= 1) {
        span.textContent = word;
        return span;
    }

    let fixationCount;
    if (bionicSettings.mode === 'syllables') {
        fixationCount = Math.ceil(countSyllables(word) / 2);
    } else {
        fixationCount = Math.min(bionicSettings.fixation, Math.ceil(word.length / 2));
    }

    const boldPart = word.substring(0, fixationCount);
    const normalPart = word.substring(fixationCount);

    const boldSpan = document.createElement('span');
    boldSpan.className = 'bionic-bold';
    boldSpan.style.opacity = bionicSettings.opacity / 100;
    boldSpan.textContent = boldPart;

    const normalSpan = document.createElement('span');
    normalSpan.className = 'bionic-text';
    normalSpan.textContent = normalPart;

    span.appendChild(boldSpan);
    span.appendChild(normalSpan);

    return span;
}

function countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');

    const syllables = word.match(/[aeiouy]{1,2}/g);
    return syllables ? syllables.length : 1;
}

function removeBionicReading() {
    const container = state.documentType === 'epub' ? elements.epubContainer : elements.textLayer;

    if (!container) return;

    const bionicElements = container.querySelectorAll('.bionic-bold, .bionic-text');
    bionicElements.forEach(el => {
        const text = el.textContent;
        el.replaceWith(document.createTextNode(text));
    });
}

function getTextNodes(node) {
    const textNodes = [];

    function traverse(n) {
        if (n.nodeType === Node.TEXT_NODE) {
            textNodes.push(n);
        } else {
            n.childNodes.forEach(child => traverse(child));
        }
    }

    traverse(node);
    return textNodes;
}

// ================================
// Authentication & Backend Integration
// ================================

async function checkAuthentication() {
    try {
        const response = await fetch('/api/auth/check', {
            credentials: 'include'
        });
        const data = await response.json();

        if (!data.authenticated) {
            window.location.href = '/login.html';
            return false;
        }

        // Display user info
        elements.userInfo.textContent = `👤 ${data.username}`;
        return true;
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/login.html';
        return false;
    }
}

async function logout() {
    try {
        await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Logout failed');
    }
}

// Add logout button handler
document.getElementById('logoutBtn').addEventListener('click', logout);

// ================================
// Backend API Integration for Vocabulary
// ================================

async function syncVocabularyWithBackend() {
    try {
        const response = await fetch('/api/vocabulary', {
            credentials: 'include'
        });
        if (response.ok) {
            const vocabulary = await response.json();
            state.vocabulary = vocabulary.map(item => ({
                word: item.word,
                translation: item.translation,
                grammar: item.grammar,
                date: item.created_at,
                reviewCount: item.review_count || 0
            }));
            renderVocabularyList();
            updateVocabStats();
        }
    } catch (error) {
        console.error('Error syncing vocabulary:', error);
    }
}

// Override addToVocabulary to use backend
async function addToVocabularyWithBackend() {
    if (!state.selectedText || !state.currentTranslation) return;

    try {
        const response = await fetch('/api/vocabulary', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                word: state.selectedText,
                translation: state.currentTranslation,
                grammar: state.currentGrammar,
                context: ''
            })
        });

        if (response.ok) {
            alert('✅ Added to vocabulary!');
            await syncVocabularyWithBackend();
        } else {
            const data = await response.json();
            alert('❌ ' + (data.error || 'Failed to add vocabulary'));
        }
    } catch (error) {
        console.error('Error adding vocabulary:', error);
        alert('❌ Failed to add vocabulary');
    }
}

// Replace the addToVocabulary function
elements.addToVocabBtn.removeEventListener('click', addToVocabulary);
elements.addToVocabBtn.addEventListener('click', addToVocabularyWithBackend);

// ================================
// Initialize App with Authentication
// ================================

async function initializeApp() {
    // Initialize event listeners first
    init();

    const authenticated = await checkAuthentication();

    if (authenticated) {
        setupBionicEventListeners();
        await syncVocabularyWithBackend();
        await loadBooksList();
    }
}

// ================================
// Sidebar Functions
// ================================

function switchSidebarTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });

    // Update content sections
    document.querySelectorAll('.sidebar-content').forEach(content => {
        content.classList.remove('active');
    });

    const targetContent = document.getElementById(`${tabName}Content`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
}

function toggleMobileMenu() {
    elements.sidebar.classList.toggle('show');
    elements.sidebarOverlay.classList.toggle('show');
}

function closeMobileMenu() {
    elements.sidebar.classList.remove('show');
    elements.sidebarOverlay.classList.remove('show');
}

// ================================
// Books List Functions
// ================================

let allBooks = []; // Store all books for filtering
let selectedCategory = 'all';

async function loadBooksList() {
    try {
        const response = await fetch('/api/books', {
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error('Failed to load books');
        }

        allBooks = await response.json();

        // Populate category filter
        populateCategoryFilter();

        // Display books
        displayBooksList(allBooks);

        // Setup filter event listener
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                selectedCategory = e.target.value;
                filterAndDisplayBooks();
            });
        }
    } catch (error) {
        console.error('Load books error:', error);
        elements.booksList.innerHTML = '<p style="color: #999; text-align: center; margin-top: 2rem; font-size: 11px;">Failed to load books</p>';
    }
}

function populateCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;

    // Extract unique categories
    const categories = [...new Set(allBooks.map(book => book.category).filter(Boolean))].sort();

    // Build options HTML
    let optionsHTML = '<option value="all">All Categories</option>';
    categories.forEach(category => {
        optionsHTML += `<option value="${category}">${category}</option>`;
    });

    categoryFilter.innerHTML = optionsHTML;
}

function filterAndDisplayBooks() {
    let filteredBooks = allBooks;

    // Filter by category
    if (selectedCategory !== 'all') {
        filteredBooks = filteredBooks.filter(book => book.category === selectedCategory);
    }

    displayBooksList(filteredBooks);
}

function displayBooksList(books) {
    if (!books || books.length === 0) {
        elements.booksList.innerHTML = '<p style="color: #999; text-align: center; margin-top: 2rem; font-size: 11px;">No books found</p>';
        return;
    }

    elements.booksList.innerHTML = books.map(book => {
        const fileType = book.file_type === 'application/pdf' ? 'PDF' : 'EPUB';
        const fileSize = (book.file_size / 1024 / 1024).toFixed(2);
        const uploadDate = new Date(book.uploaded_at).toLocaleDateString('ko-KR');
        const source = book.source || 'uploaded';
        const sourceIcon = source === 'collection' ? '📚' : '📁';
        const category = book.category ? `<span style="font-size: 9px; color: var(--system-gray);">· ${book.category}</span>` : '';

        return `
            <div class="book-item" data-book-id="${book.id}" data-file-path="${book.file_path}" data-source="${source}" data-category="${book.category || ''}">
                <div class="book-title">${sourceIcon} ${book.title}</div>
                <div class="book-meta">
                    <span class="book-type">${fileType}</span>
                    <span>${fileSize} MB</span>
                </div>
                <div class="book-meta" style="margin-top: 4px;">
                    <span style="font-size: 8px; color: var(--gray-500);">${uploadDate} ${category}</span>
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers to book items
    document.querySelectorAll('.book-item').forEach(item => {
        item.addEventListener('click', async () => {
            const bookId = item.dataset.bookId;
            const filePath = item.dataset.filePath;
            const source = item.dataset.source;
            await loadBookFromServer(bookId, filePath, source);
            closeMobileMenu();
        });
    });
}

async function loadBookFromServer(bookId, filePath, source = 'uploaded') {
    try {
        showLoading(true, 'Loading book from server...');

        // Determine the correct path based on source
        const basePath = source === 'collection' ? '/books' : '/uploads';
        const fetchUrl = `${basePath}/${filePath}`;

        console.log(`Loading book from: ${fetchUrl} (source: ${source})`);

        // Fetch the book file
        const response = await fetch(fetchUrl, {
            credentials: 'include'
        });

        if (!response.ok) {
            console.error(`Failed to load book: ${response.status} ${response.statusText}`);
            throw new Error(`Failed to load book file (${response.status})`);
        }

        const blob = await response.blob();
        const fileName = filePath.split('/').pop() || filePath;
        const file = new File([blob], fileName, { type: blob.type });

        // Load the book (handleFile will show its own loading messages)
        await handleFile(file);

        // Mark as active
        document.querySelectorAll('.book-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.bookId === bookId) {
                item.classList.add('active');
            }
        });

        // Switch to TOC tab
        switchSidebarTab('toc');

        // Loading will be hidden by handleFile
    } catch (error) {
        console.error('Load book from server error:', error);
        alert('Failed to load book: ' + error.message);
        showLoading(false);
    }
}

// ================================
// Context Menu
// ================================

const contextMenu = document.getElementById('contextMenu');
let contextMenuSelectedText = '';

// Prevent default context menu
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();

    // Check if text is selected
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText && selectedText.length > 0) {
        contextMenuSelectedText = selectedText;

        // Position context menu
        contextMenu.style.left = e.pageX + 'px';
        contextMenu.style.top = e.pageY + 'px';
        contextMenu.classList.add('show');
    } else {
        contextMenu.classList.remove('show');
    }
});

// Hide context menu on click outside
document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
        contextMenu.classList.remove('show');
    }
});

// Context menu actions
document.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', async () => {
        const action = item.dataset.action;
        contextMenu.classList.remove('show');

        switch (action) {
            case 'translate':
                state.selectedText = contextMenuSelectedText;
                showTranslationPopup(contextMenuSelectedText);
                break;

            case 'grammar':
                state.selectedText = contextMenuSelectedText;
                await loadGrammarExplanation(contextMenuSelectedText);
                showTranslationPopup(contextMenuSelectedText);
                break;

            case 'highlight-yellow':
                highlightSelection('#ffeb3b');
                break;

            case 'highlight-red':
                highlightSelection('#ff5252');
                break;

            case 'highlight-green':
                highlightSelection('#69f0ae');
                break;

            case 'add-vocab':
                if (contextMenuSelectedText) {
                    state.selectedText = contextMenuSelectedText;
                    await loadTranslation(contextMenuSelectedText);
                    await loadGrammarExplanation(contextMenuSelectedText);
                    await addToVocabularyWithBackend();
                }
                break;

            case 'copy':
                navigator.clipboard.writeText(contextMenuSelectedText);
                break;
        }
    });
});

function highlightSelection(color) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.style.backgroundColor = color;
        span.style.padding = '2px 0';

        try {
            range.surroundContents(span);
        } catch (e) {
            // If can't wrap (crosses boundaries), just mark for now
            console.log('Could not highlight:', e);
        }
    }
}

// Call initialization
initializeApp();
