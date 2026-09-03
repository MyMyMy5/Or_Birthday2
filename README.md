# Or Birthday 2

This is a locally hosted birthday website with an Edit Mode for changing layouts, colors, sections, notes, photos, videos, and songs.

## One-click setup — recommended

The launchers automatically detect the computer type, obtain a private compatible Node.js runtime if one is not already installed, download the project packages, start the local server, and open the website in the default browser. Administrator access is not required.

An internet connection is required during the first run. The first setup may take a few minutes; later starts are much faster.

### Windows

1. Download the repository as a ZIP and extract it. Do not run the launcher while it is still inside the ZIP preview.
2. Open the extracted `Or_Birthday2` folder.
3. Double-click **`Start-Or-Birthday-Windows.bat`**.
4. If Windows asks whether the script may run, allow it.
5. Keep the opened window running while using the website. The browser opens automatically.

### macOS

1. Download the repository as a ZIP and extract it.
2. Open the extracted `Or_Birthday2` folder.
3. Double-click **`Start-Or-Birthday-macOS.command`**.
4. If macOS blocks the first launch, Control-click the file, choose **Open**, and then confirm **Open**. This is normally required only once for downloaded scripts.
5. Keep the Terminal window running while using the website. The browser opens automatically.

To stop the website, close its launcher window or press **Ctrl+C** on Windows / **Control+C** on macOS. If Windows asks `Terminate batch job (Y/N)?`, type **Y** and press Enter.

The automatic setup stores its private runtime in `.runtime` and its packages in `node_modules`, both inside the project folder. These can be removed and downloaded again without affecting photos, songs, or saved website settings.

## Important: do not open `index.html` directly

Use the appropriate launcher above. Double-clicking `index.html` uses the browser's `file://` mode, where loading, uploading, deleting, and restoring media may not work correctly.

## Manual setup — optional

The following instructions are only needed if you prefer to install and run Node.js yourself instead of using the automatic launcher.

### Requirements

- [Node.js](https://nodejs.org/) **24 LTS** (recommended). Node.js 22.12 or later within the 22.x LTS line is also supported.
- A current version of Chrome, Edge, Firefox, or Safari
- An internet connection during the first installation

You only need to install Node.js once when using the manual setup.

### Windows manual setup

1. Download and install the LTS version of Node.js from [nodejs.org](https://nodejs.org/). Keep the default installer options.
2. Close and reopen PowerShell or Windows Terminal after the installation.
3. In File Explorer, open the project folder—the folder containing `package.json`, `server.js`, and `index.html`.
4. Right-click an empty area in that folder and choose **Open in Terminal**. Alternatively, enter `powershell` in File Explorer's address bar and press Enter.
5. Confirm that Node.js and npm are available:

   ```powershell
   node --version
   npm --version
   ```

6. Install the project dependencies:

   ```powershell
   npm ci
   ```

7. Start the website:

   ```powershell
   node server.js
   ```

8. Wait for this message:

   ```text
   Server running on http://localhost:3000
   ```

9. Open [http://localhost:3000](http://localhost:3000) in your browser.

Keep the terminal window open while using the site. To stop the server, return to the terminal and press **Ctrl+C**.

### macOS manual setup

1. Download and install the LTS macOS installer from [nodejs.org](https://nodejs.org/). If you already use Homebrew, `brew install node` is also suitable.
2. Close and reopen Terminal after the installation.
3. Confirm that Node.js and npm are available:

   ```bash
   node --version
   npm --version
   ```

4. Change to the project folder. An easy way to avoid typing the path is to type `cd ` (including the space), drag the project folder from Finder into Terminal, and press Return.
5. Install the project dependencies:

   ```bash
   npm ci
   ```

6. Start the website:

   ```bash
   node server.js
   ```

7. Wait for this message:

   ```text
   Server running on http://localhost:3000
   ```

8. Open [http://localhost:3000](http://localhost:3000) in Safari, Chrome, or Firefox.

Keep Terminal open while using the site. To stop the server, return to Terminal and press **Control+C**.

## Starting it again later

Use the same Windows or macOS launcher each time. It skips downloads when the correct runtime and packages are already present.

For a manual start, open a terminal in the project folder and run:

```text
node server.js
```

Then visit [http://localhost:3000](http://localhost:3000). You do not need to run `npm ci` every time; run it again only after `package.json` or `package-lock.json` changes. The automatic launcher performs this check for you.

## Transferring your customized version to another computer

There are two kinds of saved data:

1. **Uploaded photos, videos, and songs** are written into the `Images` and `Songs` folders. Send the entire project folder so these files are included. Deleted media is moved into the `Deleted` folder rather than permanently erased.
2. **Layouts, colors, notes, ordering, hidden sections, and other settings** are stored in the current browser. They do not automatically move with the project folder.

To transfer the browser settings:

1. On the original computer, start the server and open the website.
2. Enable **Edit Mode**.
3. Select **Export Settings** and save the exported JSON file.
4. Send that JSON file together with the complete project folder.
5. On the other computer, start the website, enable **Edit Mode**, select **Import Settings**, and choose the JSON file.
6. Reload the page if the imported changes are not immediately visible.

Settings are also separate between browsers and browser profiles. For example, settings created in Chrome will not automatically appear in Safari.

## Optional verification

To run the automated test suite from the project folder:

```text
npm test
```

The tests are not required for normal use.

## Troubleshooting

### `node` or `npm` is not recognized / command not found

Install Node.js from [nodejs.org](https://nodejs.org/), then completely close and reopen the terminal. If the command still fails, restart the computer so the updated system path is loaded.

### `npm ci` fails

Make sure the terminal is in the folder containing `package.json` and `package-lock.json`, and use a supported LTS version: Node.js 24 LTS is recommended, while Node.js 22.12 or later within the 22.x line is also supported. Avoid experimental or odd-numbered releases.

If the error says the lock file is out of sync with `package.json`, use:

```text
npm install
```

### The automatic launcher cannot download Node.js or the packages

- Confirm that the computer is connected to the internet and try again.
- Temporarily disconnect a VPN or restrictive proxy if it blocks `nodejs.org` or `registry.npmjs.org`.
- Keep the project in a writable location such as Documents or the Desktop, not inside a read-only ZIP preview.
- The launcher verifies the official Node.js download with its SHA-256 checksum before using it. A verification failure is intentionally treated as an error; download the repository again or retry on a trusted connection.

The automatic launcher does not require administrator access and does not change the computer-wide Node.js installation.

### Port 3000 is already in use

Either stop the other program using port 3000 or start this project on another port.

Windows PowerShell:

```powershell
$env:PORT=3001
node server.js
```

macOS Terminal:

```bash
PORT=3001 node server.js
```

Then open [http://localhost:3001](http://localhost:3001).

### Photos or songs are missing

- Confirm that the entire `Images` and `Songs` folders were copied.
- Do not rename those folders or change their capitalization.
- Confirm that the terminal shows the server is running, and use the `localhost` address rather than opening `index.html` directly.
- Try a hard refresh: **Ctrl+F5** on Windows or **Command+Shift+R** on macOS.

### Uploading or deleting media does not work

Confirm that the website address begins with `http://localhost:` and that the terminal running `server.js` is still open. The project folder must also be in a location where the current user can create and modify files.

### Customizations are missing in another browser

Use **Export Settings** in the browser containing the customizations and **Import Settings** in the other browser. Browser privacy tools, clearing site data, or private/incognito mode can remove or isolate saved settings.

## Local-use note

The included server is intended for use on a trusted local computer. Do not expose it directly to the public internet without adding authentication, upload limits, and other production security protections.
