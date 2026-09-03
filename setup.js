'use strict';

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const PROJECT_ROOT = __dirname;
const RUNTIME_DIRECTORY = path.join(PROJECT_ROOT, '.runtime');
const PACKAGE_LOCK = path.join(PROJECT_ROOT, 'package-lock.json');
const SERVER_FILE = path.join(PROJECT_ROOT, 'server.js');
const FIRST_PORT = 3000;
const LAST_PORT = 3010;

function parseNodeVersion(value) {
  const match = String(value || '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
}

function isSupportedNodeVersion(value) {
  const version = parseNodeVersion(value);
  if (!version) return false;
  if (version.major === 20) return version.minor >= 19;
  if (version.major === 22) return version.minor >= 12;
  return version.major >= 24;
}

function getPlatformName(platform = process.platform) {
  if (platform === 'win32') return 'Windows';
  if (platform === 'darwin') return 'macOS';
  return null;
}

function dependencyStateHash() {
  if (!fs.existsSync(PACKAGE_LOCK)) {
    throw new Error('package-lock.json is missing. Download the complete project folder and try again.');
  }
  return crypto.createHash('sha256').update(fs.readFileSync(PACKAGE_LOCK)).digest('hex');
}

function dependencyMarkerPath() {
  return path.join(
    RUNTIME_DIRECTORY,
    `dependencies-${process.platform}-${process.arch}.sha256`
  );
}

function dependenciesAreCurrent(expectedHash) {
  const marker = dependencyMarkerPath();
  const requiredPackages = [
    path.join(PROJECT_ROOT, 'node_modules', 'express', 'package.json'),
    path.join(PROJECT_ROOT, 'node_modules', 'multer', 'package.json')
  ];

  if (!requiredPackages.every((file) => fs.existsSync(file))) return false;
  if (!fs.existsSync(marker)) return false;
  return fs.readFileSync(marker, 'utf8').trim() === expectedHash;
}

function installDependencies() {
  const expectedHash = dependencyStateHash();
  if (dependenciesAreCurrent(expectedHash)) {
    console.log('Project packages are already installed.');
    return;
  }

  console.log('Installing the project packages. This can take a few minutes on the first run...');
  const npmCommand = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const npmArgs = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npm.cmd ci --no-audit --no-fund']
    : ['ci', '--no-audit', '--no-fund'];
  const result = spawnSync(npmCommand, npmArgs, {
    cwd: PROJECT_ROOT,
    env: process.env,
    stdio: 'inherit'
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Package installation failed with exit code ${result.status}.`);
  }

  fs.mkdirSync(RUNTIME_DIRECTORY, { recursive: true });
  fs.writeFileSync(dependencyMarkerPath(), `${expectedHash}\n`, 'utf8');
  console.log('Project packages installed successfully.');
}

function checkHealth(port, timeoutMs = 800) {
  return new Promise((resolve) => {
    const request = http.get({
      hostname: '127.0.0.1',
      port,
      path: '/api/health',
      timeout: timeoutMs
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(response.statusCode === 200 && parsed.status === 'ok');
        } catch (_) {
          resolve(false);
        }
      });
    });
    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });
    request.on('error', () => resolve(false));
  });
}

function portIsAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    // Match server.js, which listens on the default local interfaces.
    server.listen(port);
  });
}

async function findRunningSite() {
  for (let port = FIRST_PORT; port <= LAST_PORT; port += 1) {
    if (await checkHealth(port, 250)) return port;
  }
  return null;
}

async function findAvailablePort() {
  for (let port = FIRST_PORT; port <= LAST_PORT; port += 1) {
    if (await portIsAvailable(port)) return port;
  }
  throw new Error(`No available local port was found between ${FIRST_PORT} and ${LAST_PORT}.`);
}

function openBrowser(url) {
  if (process.env.OR_BIRTHDAY_NO_BROWSER === '1') return;

  let opener;
  let args;
  if (process.platform === 'win32') {
    opener = 'cmd.exe';
    args = ['/c', 'start', '', url];
  } else {
    opener = 'open';
    args = [url];
  }

  const browser = spawn(opener, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  browser.unref();
}

async function waitForServer(port, child, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`The local server stopped unexpectedly with exit code ${child.exitCode}.`);
    }
    if (await checkHealth(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('The local server did not become ready in time.');
}

async function startSite() {
  const runningPort = await findRunningSite();
  if (runningPort !== null) {
    const runningUrl = `http://localhost:${runningPort}`;
    console.log(`Or Birthday is already running at ${runningUrl}`);
    openBrowser(runningUrl);
    return;
  }

  installDependencies();

  if (!fs.existsSync(SERVER_FILE)) {
    throw new Error('server.js is missing. Download the complete project folder and try again.');
  }

  const port = await findAvailablePort();
  const url = `http://localhost:${port}`;
  const child = spawn(process.execPath, [SERVER_FILE], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, PORT: String(port) },
    stdio: 'inherit'
  });

  child.once('error', (error) => {
    console.error(`Could not start the local server: ${error.message}`);
  });

  try {
    await waitForServer(port, child);
  } catch (error) {
    if (child.exitCode === null) child.kill();
    throw error;
  }

  console.log('');
  console.log(`The website is ready: ${url}`);
  console.log('Your browser should open automatically.');
  console.log('Keep this window open while using the website.');
  console.log('Press Ctrl+C or close this window to stop it.');
  console.log('');
  openBrowser(url);

  await new Promise((resolve) => child.once('exit', resolve));
}

async function main() {
  const platformName = getPlatformName();
  if (!platformName) {
    throw new Error('This automatic launcher supports Windows and macOS only.');
  }
  if (!isSupportedNodeVersion(process.version)) {
    throw new Error(`Unsupported Node.js version ${process.version}. Use the supplied ${platformName} launcher so it can download a compatible version.`);
  }

  console.log(`Detected ${platformName} (${process.arch}).`);
  console.log(`Using Node.js ${process.version}.`);
  await startSite();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('');
    console.error(`Setup could not finish: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  parseNodeVersion,
  isSupportedNodeVersion,
  getPlatformName,
  dependencyStateHash,
  checkHealth,
  portIsAvailable
};
