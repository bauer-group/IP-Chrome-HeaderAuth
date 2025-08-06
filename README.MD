Here's an improved README draft for the bauer-group/IP-Chrome-HeaderAuth repository, based on your request and the build information found in package.json. If you want even more details (e.g., API, architecture, contributing), please clarify your needs.

---

# IP Chrome HeaderAuth

**IP Chrome HeaderAuth** is a Chrome extension designed to send authentication headers for application access. This tool is useful for environments requiring header-based authentication, such as corporate web applications or internal tools.

## Features

- Sends custom authentication headers with web requests.
- Easily configurable via extension options.
- Supports TypeScript for maintainable code and future enhancements.

## Getting Started

### Prerequisites

- Node.js (recommended v20+)
- npm (Node Package Manager)
- Chrome browser

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/bauer-group/IP-Chrome-HeaderAuth.git
   cd IP-Chrome-HeaderAuth
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Build Instructions

The build process bundles the extension for Chrome. Key scripts and their purpose:

- `npm run build`: Builds the project, updates the version, copies assets, and zips the final package.
- `npm run clean`: Removes all build artifacts (`dist`, `dist-zip`).
- `npm run build-icons`: Builds icon assets for the extension.
- Intermediate scripts:
  - `_version-update`: Updates the extension version.
  - `_copy`: Copies necessary files and assets to the distribution folder.
  - `_zip`: Zips the build output with the current version.

**To build the extension:**
```bash
npm run build
```

**To clean build artifacts:**
```bash
npm run clean
```

**To build icons separately:**
```bash
npm run build-icons
```

### Manual Installation in Chrome

1. Build the extension (`npm run build`).
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode".
4. Click "Load unpacked" and select the `dist` folder in your project directory.

### Usage

- Configure the extension via the options page (`options.html` in the extension popup).
- The extension automatically attaches authentication headers to outgoing requests based on your configuration.

## Contributing

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a pull request.

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

For questions or support, please open an issue on GitHub.

