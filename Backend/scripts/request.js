import http from 'http';

async function fetchJson(path) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'localhost',
      port: 4000,
      path,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    };
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const txt = Buffer.concat(chunks).toString('utf8');
        let parsed = txt;
        try { parsed = JSON.parse(txt); } catch (e) { parsed = txt; }
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    req.on('error', (e) => resolve({ error: String(e) }));
    req.end();
  });
}

(async () => {
  const endpoints = [
    '/api/health',
    '/api/stock',
    '/api/reports/sales?from=2026-01-01&to=2026-01-08',
    '/api/sales/10',
    '/api/returns'
  ];

  for (const ep of endpoints) {
    const r = await fetchJson(ep);
    console.log('\n=== ' + ep + ' ===');
    console.log('status:', r.status ?? 'ERR');
    console.log(typeof r.data === 'string' ? r.data.slice(0,1000) : JSON.stringify(r.data, null, 2));
  }
  process.exit(0);
})();
