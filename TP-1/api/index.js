const http = require('http');
const { Pool } = require('pg');

const port = Number.parseInt(process.env.PORT || '3000', 10);

const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number.parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function waitForDatabase(maxAttempts = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connection established');
      return;
    } catch (error) {
      console.error(`Database connection attempt ${attempt}/${maxAttempts} failed`);

      if (attempt === maxAttempts) {
        throw error;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, delayMs);
      });
    }
  }
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

const serveur = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      await pool.query('SELECT 1');
      sendJson(res, 200, { status: 'ok', database: 'up' });
      return;
    }

    if (req.method === 'GET' && req.url === '/notes') {
      const result = await pool.query(
        'SELECT id, title, content, created_at FROM notes ORDER BY created_at DESC',
      );
      sendJson(res, 200, result.rows);
      return;
    }

    if (req.method === 'POST' && req.url === '/notes') {
      const { title, content } = await parseJsonBody(req);

      if (!title || !content) {
        sendJson(res, 400, { error: 'title and content are required' });
        return;
      }

      const result = await pool.query(
        'INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING id, title, content, created_at',
        [title, content],
      );

      sendJson(res, 201, result.rows[0]);
      return;
    }

    sendJson(res, 404, { error: 'not found' });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: 'internal server error' });
  }
});

waitForDatabase()
  .then(() => {
    serveur.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Unable to start API', error);
    process.exit(1);
  });
