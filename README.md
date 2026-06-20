# Better Coomer / Kemono

A browser extension that enhances the user experience on the Coomer and Kemono websites.

---

### Tech Stack

- **TypeScript**
- **Webpack**
- **Browser APIs** (Chrome & Firefox)
- **IndexedDB** abstraction for persistent data

---

### Features

- Automatically adds a **"Viewed"** tag to posts you've visited
- Adds an **audio player** for posts with audio attachments
- **Mark as Unread** button to remove the "Viewed" status from any post
- **Data management interface** to browse, filter, and manage stored artists and posts
- **24-hour API enrichment** — automatically fetches artist thumbnails, banners, post counts, and post metadata in the background
- **Popup stats** showing total tracked artists and posts

---

### Supported Sites

The extension activates on an **explicit allowlist** of hostnames.  Adding
support for a new host requires a code change and rebuild.

- `coomer.st`
- `kemono.cr`

---

### Supported Browsers

- Google Chrome (Manifest V3)
- Mozilla Firefox (Manifest V2)

---

### Installation & Build

#### 1. Clone the repository

```bash
git clone https://github.com/SirSalamandra/better-coomer-kemono.git
cd better-coomer-kemono
```

#### 2. Install dependencies

```bash
npm install
```

#### 3. Build the extension

```bash
# Build for Chrome
npm run build chrome

# Build for Firefox
npm run build firefox
```

Output is generated in the `dist/` directory.

#### 4. Load the extension

- **Chrome:** `chrome://extensions` → Enable Developer mode → Load unpacked → select `dist/`
- **Firefox:** `about:debugging` → This Firefox → Load Temporary Add-on → select any file in `dist/`

---

### Contributing

Contributions are welcome! Please open an issue or submit a pull request for improvements or new features.

### License

This project is licensed under the MIT License. See the LICENSE file for more details.
