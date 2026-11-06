// Connects Supper Swipe to an AH account, once, on your own computer: node scripts/ah-login.mjs
// A browser window opens at AH's login page and you log in there yourself. AH's answer is meant for its app, so an
// ordinary browser can't catch it; this watches for it, then hands it to Supper Swipe in your normal browser, which
// holds the site password. The password and the code are never printed or saved.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TEST_URL = process.env.AH_TEST_URL; // for checking this script without a real login
const LOGIN = TEST_URL || 'https://login.ah.nl/login?client_id=appie-ios&redirect_uri=appie://login-exit&response_type=code';
const SITE = 'https://supper-swipe.netlify.app/';
const BROWSERS = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'];
const TIME_LIMIT_MS = 600000;
const FOUND = /appie:\/\/login-exit\?[^"\s\\]*?code=([^&"\s\\]+)/;

const path = BROWSERS.find(existsSync);
if (!path) throw new Error('No Chrome or Edge found');
const port = 9400 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'ah-login-'));
const browser = spawn(path, ['--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check', ...(TEST_URL ? ['--headless=new'] : []), 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(done => setTimeout(done, ms));

async function pageSocket() {
  for (let i = 0; i < 80; i++) {
    try {
      const page = (await (await fetch('http://127.0.0.1:' + port + '/json')).json()).find(p => p.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(150);
  }
  throw new Error('The browser did not start');
}

function waitForCode(ws) {
  return new Promise((done, fail) => {
    setTimeout(() => fail(new Error('No login after 10 minutes')), TIME_LIMIT_MS);
    browser.on('exit', () => fail(new Error('The browser was closed before the login finished')));
    ws.onmessage = m => {
      const found = FOUND.exec(m.data);
      if (found) done(decodeURIComponent(found[1]));
    };
  });
}

let failed = false;
try {
  const ws = new WebSocket(await pageSocket());
  await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
  const code = waitForCode(ws);
  let id = 0;
  for (const [method, params] of [['Page.enable'], ['Network.enable'], ['Page.navigate', { url: LOGIN }]]) ws.send(JSON.stringify({ id: ++id, method, params: params || {} }));
  console.log('Log in to AH in the window that just opened.');
  const found = await code;
  if (TEST_URL) console.log('Captured: ' + found);
  else {
    const url = SITE + '#ah-code=' + encodeURIComponent(found);
    if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '""', url], { stdio: 'ignore', windowsVerbatimArguments: true });
    else spawn('open', [url], { stdio: 'ignore' });
    console.log('Got it. Supper Swipe is opening in your normal browser and should say AH is connected.');
  }
} catch (err) {
  failed = true;
  console.error(err.message);
} finally {
  browser.kill();
  await sleep(500);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* the browser may still hold a file */ }
  process.exit(failed ? 1 : 0);
}
