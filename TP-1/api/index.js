const http = require('http');

const port = process.env.PORT || 3000;

const serveur = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('ok');
    return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('not found');
});

serveur.listen(port, () => {
  console.log(`Serveur lance sur http://localhost:${port}`);
});
