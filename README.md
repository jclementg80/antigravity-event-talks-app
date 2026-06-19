# BigQuery Release Notes Center (antigravity-event-talks-app)

A modern, highly-polished web application built using Python Flask, plain vanilla HTML, JavaScript, and CSS that fetches Google BigQuery release notes from the official Google Cloud feed, parses them dynamically, and provides an integrated, interactive Tweet/X Composer with live post-preview and auto-fit truncation utility.

## Architecture & Data Flow

```mermaid
flowchart TD
    User([User's Browser])
    Flask[Flask Web Server]
    GFeed[Google BQ Release Notes XML Feed]
    Cache[(In-Memory Cache)]
    IsCached{Is Data Cached?}
    
    User -->|1. Access Webpage| Flask
    User -->|2. GET /api/releases| Flask
    Flask -->|3. Check Cache| IsCached
    
    IsCached -->|Yes| User
    IsCached -->|No or Force Refresh| GFeed
    GFeed -->|4. XML Data| Flask
    Flask -->|5. Parse using BeautifulSoup| Flask
    Flask -->|6. Store in Cache| Cache
    Flask -->|7. JSON Response| User
    
    User -->|8. Click Tweet / X Post| User
    User -->|9. Compose & Preview| User
    User -->|10. Web Intent (x.com)| X[X / Twitter Platform]
```

## Features

*   **Vibrant Glassmorphic Aesthetics**: Modern dark mode backdrop with vibrant glows, responsive typography, custom scrollbars, and smooth micro-animations.
*   **Automatic Feeds Parsing**: Reads and slices Google's BigQuery Release Notes Atom Feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`) into individual updates (`Features`, `Changes`, `Fixes`, `Deprecated`, `General`) on the fly.
*   **Real-time Filters**: Search updates instantly by keywords or filter by category pills. Category pills dynamically list count metrics.
*   **Dynamic Skeleton Loaders**: Shimmer animated skeleton panels during loading states.
*   **X Post Composer**:
    *   **Live Preview Card**: Updates instantly as you type, formatting hashtags (`#`), mentions (`@`), and hyperlinks like a real X post.
    *   **t.co Link Estimation**: Accurately measures character limits by simulating X's 23-character link wrapping behavior.
    *   **Auto-Fit Tool**: Automatically truncates description texts to fit exactly within X's 280-character limit without cutting off URLs or custom tags.
    *   **Hashtag & Reference Link toggles**: Enable/disable prepended tags or direct release-note anchor links in one click.

## File Structure

*   `app.py`: Flask application entry point. Fetches the Atom feed, sanitizes links, caches items in-memory for 10 minutes, and parses XML sections.
*   `requirements.txt`: Python package dependency configuration.
*   `templates/index.html`: Dashboard layout containing widgets, search bars, stats cards, and the mock-preview composer modal.
*   `static/style.css`: Glassmorphic styling rules, keyframes, color themes, and responsive design queries.
*   `static/app.js`: Main state orchestrator, search filter routines, UI handlers, circular progress ring calculators, and URL copy operations.
*   `.gitignore`: Safe rules to prevent committing Python runtime caches, virtual env folders, and IDE configurations.

## Running Locally

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/jclementg80/antigravity-event-talks-app.git
    cd antigravity-event-talks-app
    ```

2.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Start the Server**:
    ```bash
    python app.py
    ```

4.  **Access the Dashboard**:
    Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your web browser.
