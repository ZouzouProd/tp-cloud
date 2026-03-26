const http = require('http');

const serveur = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World 🚀');
});

serveur.listen(3000, () => {
  console.log('Serveur lancé sur http://localhost:3000');
});