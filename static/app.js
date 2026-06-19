// Application State
let appState = {
    releases: [],          // Raw releases array from API
    filteredReleases: [],  // Currently filtered releases
    currentCategory: 'all',
    searchQuery: '',
    selectedUpdate: null,  // Currently selected update for tweeting
    includeLink: true,
    includeTags: true
};

// UI Elements
const els = {
    notesGrid: document.getElementById('notes-grid'),
    skeletonLoader: document.getElementById('skeleton-loader'),
    emptyState: document.getElementById('empty-state'),
    refreshBtn: document.getElementById('refresh-btn'),
    refreshSpinner: document.getElementById('refresh-spinner'),
    searchInput: document.getElementById('search-input'),
    categoryFilters: document.getElementById('category-filters'),
    lastSyncTime: document.getElementById('last-sync-time'),
    activeFilterBar: document.getElementById('active-filter-bar'),
    activeFilterText: document.getElementById('active-filter-text'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    
    // Stats
    statTotal: document.getElementById('stat-total'),
    statFeatures: document.getElementById('stat-features'),
    statFixes: document.getElementById('stat-fixes'),
    
    // Category Counts
    countAll: document.getElementById('count-all'),
    countFeature: document.getElementById('count-feature'),
    countChanged: document.getElementById('count-changed'),
    countFixed: document.getElementById('count-fixed'),
    countDeprecated: document.getElementById('count-deprecated'),
    countGeneral: document.getElementById('count-general'),
    
    // Modal
    tweetModal: document.getElementById('tweet-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    cancelModalBtn: document.getElementById('cancel-modal-btn'),
    publishTweetBtn: document.getElementById('publish-tweet-btn'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    previewText: document.getElementById('preview-text'),
    charCount: document.getElementById('char-count'),
    charProgressCircle: document.getElementById('char-progress-circle'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message'),
    
    // Helpers
    btnHelperTruncate: document.getElementById('btn-helper-truncate'),
    btnHelperLink: document.getElementById('btn-helper-link'),
    btnHelperTags: document.getElementById('btn-helper-tags')
};

// SVG Icons
const icons = {
    calendar: `<svg class="calendar-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    externalLink: `<svg class="external-link-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
    tweet: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases(false);
    setupEventListeners();
    setupProgressRing();
});

// Fetch Release Notes from API
async function fetchReleases(forceRefresh = false) {
    setLoadingState(true);
    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.status === 'success' || result.status === 'warning') {
            appState.releases = result.data;
            updateStatsAndCounts();
            filterAndRenderNotes();
            
            // Format cache sync time
            const syncDate = new Date(result.cached_at * 1000);
            els.lastSyncTime.textContent = `Last synced: ${syncDate.toLocaleTimeString()}`;
            
            if (result.status === 'warning') {
                showToast(result.message, 'warning');
            }
        } else {
            showToast('Failed to load release notes: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showToast('Network error while fetching release notes.', 'danger');
    } finally {
        setLoadingState(false);
    }
}

// Toggle loading spinner and skeleton layout
function setLoadingState(isLoading) {
    if (isLoading) {
        els.refreshSpinner.classList.add('spinning');
        els.refreshBtn.disabled = true;
        els.notesGrid.style.display = 'none';
        els.emptyState.style.display = 'none';
        els.skeletonLoader.style.display = 'flex';
    } else {
        els.refreshSpinner.classList.remove('spinning');
        els.refreshBtn.disabled = false;
        els.skeletonLoader.style.display = 'none';
        els.notesGrid.style.display = 'flex';
    }
}

// Event Listeners setup
function setupEventListeners() {
    // Refresh Button
    els.refreshBtn.addEventListener('click', () => fetchReleases(true));
    
    // Search input (with basic input listener)
    els.searchInput.addEventListener('input', (e) => {
        appState.searchQuery = e.target.value.toLowerCase().trim();
        filterAndRenderNotes();
    });
    
    // Category pill clicks
    els.categoryFilters.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        
        // Update active class
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        appState.currentCategory = btn.dataset.category;
        filterAndRenderNotes();
    });
    
    // Clear search and filter button
    els.clearSearchBtn.addEventListener('click', () => {
        els.searchInput.value = '';
        appState.searchQuery = '';
        
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.filter-btn[data-category="all"]').classList.add('active');
        appState.currentCategory = 'all';
        
        filterAndRenderNotes();
    });
    
    // Modal Close buttons
    els.closeModalBtn.addEventListener('click', closeModal);
    els.cancelModalBtn.addEventListener('click', closeModal);
    
    // Close modal on click outside
    els.tweetModal.addEventListener('click', (e) => {
        if (e.target === els.tweetModal) closeModal();
    });
    
    // Textarea input changes
    els.tweetTextarea.addEventListener('input', () => {
        updateTweetPreview();
    });
    
    // Helper Buttons in Composer
    els.btnHelperLink.addEventListener('click', () => {
        appState.includeLink = !appState.includeLink;
        els.btnHelperLink.classList.toggle('active', appState.includeLink);
        regenerateTweetText();
    });
    
    els.btnHelperTags.addEventListener('click', () => {
        appState.includeTags = !appState.includeTags;
        els.btnHelperTags.classList.toggle('active', appState.includeTags);
        regenerateTweetText();
    });
    
    els.btnHelperTruncate.addEventListener('click', () => {
        autoFitTweetText();
    });
    
    // Publish tweet button
    els.publishTweetBtn.addEventListener('click', publishTweet);
}

// Compute counts of categories and update sidebar
function updateStatsAndCounts() {
    const counts = {
        all: appState.releases.length,
        feature: 0,
        changed: 0,
        fixed: 0,
        deprecated: 0,
        general: 0
    };
    
    appState.releases.forEach(rel => {
        const type = rel.type.toLowerCase();
        if (counts[type] !== undefined) {
            counts[type]++;
        } else {
            counts.general++;
        }
    });
    
    // Update labels
    els.statTotal.textContent = counts.all;
    els.statFeatures.textContent = counts.feature;
    els.statFixes.textContent = counts.fixed;
    
    // Update badge counts in sidebar
    els.countAll.textContent = counts.all;
    els.countFeature.textContent = counts.feature;
    els.countChanged.textContent = counts.changed;
    els.countFixed.textContent = counts.fixed;
    els.countDeprecated.textContent = counts.deprecated;
    els.countGeneral.textContent = counts.general;
}

// Filter notes matching category & search, then render
function filterAndRenderNotes() {
    const { releases, currentCategory, searchQuery } = appState;
    
    // Filter
    appState.filteredReleases = releases.filter(rel => {
        // Match category
        const matchesCategory = currentCategory === 'all' || rel.type.toLowerCase() === currentCategory;
        
        // Match search query (searches title, plain-text content, and type)
        const matchesSearch = !searchQuery || 
            rel.date.toLowerCase().includes(searchQuery) ||
            rel.type.toLowerCase().includes(searchQuery) ||
            rel.text.toLowerCase().includes(searchQuery);
            
        return matchesCategory && matchesSearch;
    });
    
    // Update active filter bar visibility and text
    if (currentCategory !== 'all' || searchQuery) {
        els.activeFilterBar.style.display = 'flex';
        let statusText = `Showing: ${currentCategory === 'all' ? 'All' : capitalize(currentCategory)} updates`;
        if (searchQuery) {
            statusText += ` matching "${searchQuery}"`;
        }
        statusText += ` (${appState.filteredReleases.length} found)`;
        els.activeFilterText.textContent = statusText;
    } else {
        els.activeFilterBar.style.display = 'none';
    }
    
    // Render
    renderNotes();
}

// Group releases by Date and render cards
function renderNotes() {
    els.notesGrid.innerHTML = '';
    
    if (appState.filteredReleases.length === 0) {
        els.emptyState.style.display = 'flex';
        return;
    }
    
    els.emptyState.style.display = 'none';
    
    // Group filtered releases by date
    const grouped = {};
    appState.filteredReleases.forEach(rel => {
        if (!grouped[rel.date]) {
            grouped[rel.date] = [];
        }
        grouped[rel.date].push(rel);
    });
    
    // Render group cards
    Object.keys(grouped).forEach(date => {
        const items = grouped[date];
        const firstItem = items[0];
        
        // Card container
        const card = document.createElement('div');
        card.className = 'release-group-card';
        
        // Header
        const header = document.createElement('div');
        header.className = 'release-group-header';
        
        header.innerHTML = `
            <div class="release-date-area">
                ${icons.calendar}
                <h3>${date}</h3>
            </div>
            ${firstItem.link ? `
                <a href="${firstItem.link}" target="_blank" rel="noopener noreferrer" class="source-link-btn">
                    <span>Source</span>
                    ${icons.externalLink}
                </a>
            ` : ''}
        `;
        card.appendChild(header);
        
        // Add items under this date
        items.forEach(item => {
            const updateItem = document.createElement('div');
            updateItem.className = 'update-item';
            
            const badgeClass = `type-badge-${item.type.toLowerCase()}`;
            
            updateItem.innerHTML = `
                <div class="update-item-header">
                    <span class="type-badge ${badgeClass}">${item.type}</span>
                    <div class="update-item-actions">
                        <button class="action-icon-btn copy-btn" data-id="${item.id}" title="Copy Direct Link">
                            ${icons.copy}
                        </button>
                        <button class="action-icon-btn tweet-btn tweet-btn-hover" data-id="${item.id}" title="Compose X / Twitter Post">
                            ${icons.tweet}
                        </button>
                    </div>
                </div>
                <div class="update-content-rich">
                    ${item.html}
                </div>
            `;
            
            // Set up actions
            updateItem.querySelector('.copy-btn').addEventListener('click', () => {
                copyLink(item.link);
            });
            
            updateItem.querySelector('.tweet-btn').addEventListener('click', () => {
                openTweetComposer(item);
            });
            
            card.appendChild(updateItem);
        });
        
        els.notesGrid.appendChild(card);
    });
}

// Copy Link to Clipboard
function copyLink(link) {
    if (!link) {
        showToast('No link available for this entry.', 'warning');
        return;
    }
    
    navigator.clipboard.writeText(link).then(() => {
        showToast('Direct link copied to clipboard!');
    }).catch(err => {
        console.error('Copy failed:', err);
        showToast('Failed to copy link. Manual copy: ' + link, 'danger');
    });
}

// Show Toast message
function showToast(message, type = 'success') {
    els.toastMessage.textContent = message;
    
    // Style toast depending on type
    els.toast.className = 'toast show';
    if (type === 'warning') {
        els.toast.style.borderColor = 'var(--color-changed)';
    } else if (type === 'danger') {
        els.toast.style.borderColor = 'var(--color-deprecated)';
    } else {
        els.toast.style.borderColor = 'var(--primary)';
    }
    
    setTimeout(() => {
        els.toast.classList.remove('show');
    }, 3000);
}

// Tweet Composer Logic
function openTweetComposer(update) {
    appState.selectedUpdate = update;
    
    // Set helper buttons active states
    appState.includeLink = true;
    appState.includeTags = true;
    els.btnHelperLink.classList.add('active');
    els.btnHelperTags.classList.add('active');
    
    regenerateTweetText();
    
    // Show Modal
    els.tweetModal.style.display = 'flex';
    els.tweetTextarea.focus();
}

function regenerateTweetText() {
    if (!appState.selectedUpdate) return;
    
    const update = appState.selectedUpdate;
    
    // Construct default draft components
    // Format: "BigQuery Update [June 17, 2026] ➔ Feature: You can enable autonomous embedding generation..."
    let mainBody = `BigQuery Update [${update.date}] ➔ ${update.type}:\n\n${update.text}`;
    let tags = appState.includeTags ? `\n\n#BigQuery #GoogleCloud` : '';
    let link = appState.includeLink && update.link ? `\n\n${update.link}` : '';
    
    els.tweetTextarea.value = mainBody + tags + link;
    updateTweetPreview();
}

// Truncates text fields intelligently to fit inside 280-char limit
function autoFitTweetText() {
    if (!appState.selectedUpdate) return;
    
    const update = appState.selectedUpdate;
    const tags = appState.includeTags ? `\n\n#BigQuery #GoogleCloud` : '';
    // Calculate URL length accurately. X intents treat URLs as 23 characters (t.co wrap).
    const linkLength = (appState.includeLink && update.link) ? 23 + 2 : 0; // +2 for newlines
    const tagsLength = tags.length;
    
    const maxBodyLength = 280 - linkLength - tagsLength;
    
    let header = `BigQuery Update [${update.date}] ➔ ${update.type}:\n\n`;
    let remainingForContent = maxBodyLength - header.length;
    
    if (remainingForContent < 10) {
        showToast("Text is too short to auto-fit properly.", "warning");
        return;
    }
    
    let bodyText = update.text;
    if (bodyText.length > remainingForContent) {
        bodyText = bodyText.substring(0, remainingForContent - 3) + '...';
    }
    
    let link = (appState.includeLink && update.link) ? `\n\n${update.link}` : '';
    
    els.tweetTextarea.value = header + bodyText + tags + link;
    updateTweetPreview();
    showToast("Text auto-fitted to 280-character limit!", "success");
}

function updateTweetPreview() {
    const text = els.tweetTextarea.value;
    
    // Calculate character count (treating HTTP URLs as 23 chars for realism!)
    const urlRegex = /https?:\/\/[^\s]+/g;
    let adjustedText = text;
    let urlMatches = text.match(urlRegex) || [];
    
    // Replace URL matches with a 23-char string to simulate t.co wrapping
    urlMatches.forEach(url => {
        adjustedText = adjustedText.replace(url, 'a'.repeat(23));
    });
    
    const charCount = adjustedText.length;
    const remaining = 280 - charCount;
    
    // Update circular progress and labels
    els.charCount.textContent = remaining;
    
    if (remaining < 0) {
        els.charCount.className = 'char-count-text danger';
        els.publishTweetBtn.disabled = true;
    } else if (remaining <= 20) {
        els.charCount.className = 'char-count-text warning';
        els.publishTweetBtn.disabled = false;
    } else {
        els.charCount.className = 'char-count-text';
        els.publishTweetBtn.disabled = false;
    }
    
    updateCircularProgress(charCount);
    
    // Set up Preview body HTML (highlight hashtags, links, tags in blue)
    let previewHtml = escapeHtml(text);
    
    // Highlight links
    previewHtml = previewHtml.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank">${url}</a>`;
    });
    
    // Highlight hashtags
    previewHtml = previewHtml.replace(/#(\w+)/g, '<span style="color: #1d9bf0;">#$1</span>');
    
    // Highlight mentions
    previewHtml = previewHtml.replace(/@(\w+)/g, '<span style="color: #1d9bf0;">@$1</span>');
    
    els.previewText.innerHTML = previewHtml || '<span style="color: #71767b; font-style: italic;">Draft content will appear here...</span>';
}

// circular character progress bar calculation
let ringCircumference = 0;
function setupProgressRing() {
    const radius = els.charProgressCircle.r.baseVal.value;
    ringCircumference = 2 * Math.PI * radius;
    els.charProgressCircle.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
    els.charProgressCircle.style.strokeDashoffset = ringCircumference;
}

function updateCircularProgress(charCount) {
    if (ringCircumference === 0) return;
    
    const percent = Math.min(charCount / 280, 1);
    const offset = ringCircumference - (percent * ringCircumference);
    els.charProgressCircle.style.strokeDashoffset = offset;
    
    // Color transitions based on remaining
    if (charCount > 280) {
        els.charProgressCircle.style.stroke = 'var(--color-deprecated)';
    } else if (charCount >= 260) {
        els.charProgressCircle.style.stroke = 'var(--color-changed)';
    } else {
        els.charProgressCircle.style.stroke = 'var(--primary)';
    }
}

// Publish tweet opening X Web Share Intent
function publishTweet() {
    const text = els.tweetTextarea.value;
    if (!text.trim()) return;
    
    const xShareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(xShareUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
    closeModal();
}

function closeModal() {
    els.tweetModal.style.display = 'none';
    appState.selectedUpdate = null;
}

// Helper utility functions
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
