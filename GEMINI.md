# Project: Better SU

## Project Overview

This is a web browser extension for Chrome and Firefox that enhances the user experience on `kemono.cr` and `coomer.cr`. It's built with TypeScript and bundled with Webpack.

The core functionality of the extension is to track which posts a user has visited and visually mark them with a "Viewed" tag. It also adds an audio player to posts that have audio attachments.

The extension is composed of:
- A background script (`background.ts`) that orchestrates the logic.
- A content script (`content.ts`) that manipulates the DOM of the target websites.
- A popup (`popup.html`, `popup.ts`) which is currently a placeholder.
- An IndexedDB database (`indexedDbManager.ts`) to store data about visited posts and artists.

## Building and Running

### Prerequisites
- Node.js and npm installed.

### Build
To build the extension, run the following commands:
```bash
npm install
```

For Chrome:
```bash
npm run build chrome
```

For Firefox:
```bash
npm run build firefox
```
The packed extension will be located in the `dist` directory.

### Running

To run the extension, you need to load the `dist` directory as an unpacked extension in your browser.

**Chrome:**
1. Navigate to `chrome://extensions`.
2. Enable "Developer mode".
3. Click "Load unpacked" and select the `dist` directory.

**Firefox:**
1. Navigate to `about:debugging`.
2. Click "This Firefox".
3. Click "Load Temporary Add-on" and select any file in the `dist` directory.

## Development Conventions

### Code Style
The project uses TypeScript with a strictness level that is not fully enforced (`"strict": false` in `tsconfig.json`). It follows standard TypeScript/JavaScript conventions.

### Testing
There are no explicit test files or testing frameworks configured in the project.

### Contribution
The `README.md` file encourages contributions via pull requests and issues.

## Development Log

### Session: 2025-11-21

**Feature: "Mark as Unread"**

- **Goal:** Allow users to manually remove the "Viewed" status from a post.
- **Implementation Steps:**
    1.  **UI:** Added a clickable "x" button next to the "Viewed" tag on post cards (`src/helpers/helpers.ts`).
    2.  **Event Handling:** Implemented a delegated event listener in the `capture` phase in `src/content.ts` to handle clicks on the "x" button, preventing the parent card's click event from firing.
    3.  **Logic:**
        - The content script sends a `RemoveViewTag` message to the background script.
        - The background script (`src/background.ts`) deletes the post record from IndexedDB.
        - The background script sends a `RemoveViewTagFromUI` message back to the content script, which then removes the "Viewed" tag from the DOM.
- **Status:** The feature is fully implemented, tested, and confirmed to be working. The project has been successfully built.
- **Documentation:** Created a `documentation/ideas.md` file to track future feature ideas.