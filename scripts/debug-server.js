const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number.parseInt(process.argv[2] || '3333', 10);
const logDir = '.claude-debug';
const logFile = path.join(logDir, 'debug.log');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Clear previous log on start
fs.writeFileSync(logFile, '');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200);
    res.end('ok');
    return;
  }

  if (req.url === '/debug' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { label, data, file, line, lang } = JSON.parse(body);
        const entry = `[${new Date().toISOString()}] [${lang || '?'}] ${file || ''}:${line || ''} | ${label}${data ? ` | ${JSON.stringify(data)}` : ''}\n`;
        fs.appendFileSync(logFile, entry);
        res.writeHead(200);
        res.end('ok');
      } catch {
        // Fallback: write raw body
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] RAW | ${body}\n`);
        res.writeHead(200);
        res.end('ok');
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(port, () => {
  console.log(`Debug server listening on :${port}`);
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
