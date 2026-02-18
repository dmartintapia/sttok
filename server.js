const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, 'data', 'menu.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');
const WHATSAPP_NUMBER = '5491136275604';

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function loadMenu() {
  const content = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(content);
}

function saveMenu(menu) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(menu, null, 2));
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendNotFound(res) {
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Recurso no encontrado' }));
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

function parseJson(bodyText, res) {
  try {
    return JSON.parse(bodyText);
  } catch (error) {
    sendJson(res, 400, { error: 'Formato JSON inválido' });
    return null;
  }
}

function serveStatic(res, filePath) {
  const resolvedPath = path.join(PUBLIC_DIR, filePath);
  if (!resolvedPath.startsWith(PUBLIC_DIR)) {
    sendNotFound(res);
    return;
  }

  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      sendNotFound(res);
      return;
    }

    const ext = path.extname(resolvedPath);
    const typeMap = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg'
    };

    const contentType = typeMap[ext] || 'application/octet-stream';
    fs.readFile(resolvedPath, (readErr, content) => {
      if (readErr) {
        sendNotFound(res);
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
}

function findItem(menu, id) {
  for (const category of menu.categories) {
    const item = category.items.find((entry) => entry.id === id);
    if (item) {
      return item;
    }
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  if (req.method === 'GET' && pathname === '/api/menu') {
    const menu = loadMenu();
    const filtered = {
      categories: menu.categories.map((category) => ({
        ...category,
        items: category.items.filter((item) => item.stock > 0)
      }))
    };
    sendJson(res, 200, { menu: filtered, whatsapp: WHATSAPP_NUMBER });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/admin/menu') {
    const menu = loadMenu();
    sendJson(res, 200, { menu });
    return;
  }

  if (req.method === 'PATCH' && pathname.startsWith('/api/admin/items/')) {
    const id = pathname.replace('/api/admin/items/', '');
    const bodyText = await collectBody(req);
    if (!bodyText) {
      sendJson(res, 400, { error: 'Faltan datos' });
      return;
    }
    const payload = parseJson(bodyText, res);
    if (!payload) {
      return;
    }
    const menu = loadMenu();
    const item = findItem(menu, id);
    if (!item) {
      sendNotFound(res);
      return;
    }

    if (typeof payload.price === 'number') {
      item.price = payload.price;
    }
    if (typeof payload.stock === 'number') {
      item.stock = payload.stock;
    }
    if (typeof payload.name === 'string') {
      item.name = payload.name;
    }
    if (typeof payload.description === 'string') {
      item.description = payload.description;
    }

    saveMenu(menu);
    sendJson(res, 200, { item });
    return;
  }

  if (req.method === 'POST' && pathname.startsWith('/api/admin/items/') && pathname.endsWith('/image')) {
    const id = pathname.replace('/api/admin/items/', '').replace('/image', '');
    const bodyText = await collectBody(req);
    if (!bodyText) {
      sendJson(res, 400, { error: 'Faltan datos' });
      return;
    }
    const payload = parseJson(bodyText, res);
    if (!payload) {
      return;
    }
    if (!payload.imageBase64 || !payload.fileName) {
      sendJson(res, 400, { error: 'Se requieren imageBase64 y fileName' });
      return;
    }

    const menu = loadMenu();
    const item = findItem(menu, id);
    if (!item) {
      sendNotFound(res);
      return;
    }

    const sanitizedName = payload.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(UPLOAD_DIR, sanitizedName);
    const base64Content = payload.imageBase64.split(',').pop();
    fs.writeFileSync(filePath, Buffer.from(base64Content, 'base64'));
    item.image = `/uploads/${sanitizedName}`;
    saveMenu(menu);
    sendJson(res, 200, { item });
    return;
  }

  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    serveStatic(res, 'index.html');
    return;
  }

  if (req.method === 'GET' && pathname === '/admin') {
    serveStatic(res, 'admin.html');
    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/')) {
    const relativePath = pathname.replace(/^\//, '');
    serveStatic(res, relativePath);
    return;
  }

  sendNotFound(res);
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });
}

module.exports = { server };
