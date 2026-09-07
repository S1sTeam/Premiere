const { spawn, exec } = require('child_process');
const fs = require('fs');
const net = require('net');

const http = require('http');

const PORT = 3001;
const url = `http://localhost:${PORT}`;

function startRedirects() {
  [80, 3000].forEach((redirectPort) => {
    try {
      const server = http.createServer((req, res) => {
        res.writeHead(302, { Location: `http://localhost:${PORT}${req.url}` });
        res.end();
      });
      server.on('error', () => {});
      server.listen(redirectPort, () => {
        console.log(`[Premire IDE] Redirect from port ${redirectPort} to ${PORT} active.`);
      });
    } catch (_) {}
  });
}

startRedirects();

function openWindow() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  console.log(`\x1b[32m[Premire IDE]\x1b[0m Opening desktop window at ${url}...`);

  if (fs.existsSync(edgePath)) {
    spawn(edgePath, [`--app=${url}`, '--start-maximized', '--window-size=1680,1050'], {
      detached: true,
      stdio: 'ignore',
    });
  } else if (fs.existsSync(chromePath)) {
    spawn(chromePath, [`--app=${url}`, '--start-maximized', '--window-size=1680,1050'], {
      detached: true,
      stdio: 'ignore',
    });
  } else {
    exec(`start ${url}`);
  }
}

// Check if port is already running
const client = net.connect({ port: PORT, host: '127.0.0.1' }, () => {
  console.log(`\x1b[36m[Premire IDE]\x1b[0m Server is already running on port ${PORT}.`);
  client.end();
  openWindow();
});

client.on('error', () => {
  // Not running, start dev server
  console.log('\x1b[36m[Premire IDE]\x1b[0m Starting Premire server on port ' + PORT + '...');

  const vite = spawn('npm', ['run', 'dev:src'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
  });

  setTimeout(() => {
    openWindow();
  }, 1800);

  process.on('SIGINT', () => {
    vite.kill();
    process.exit();
  });
});
