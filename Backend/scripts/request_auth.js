import http from 'http';

function httpRequest(method, path, body=null, token=null) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost',
      port: 4000,
      path,
      method,
      headers: {
        'Accept': 'application/json',
      }
    };
    if (data) {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(data);
    }
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;

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
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  console.log('Logging in as admin/admin123');
  const login = await httpRequest('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
  console.log('login status', login.status);
  console.log(login.data);
  if (login.status !== 200 || !login.data || !login.data.token) {
    console.error('Login failed — cannot continue');
    process.exit(2);
  }
  const token = login.data.token;

  const endpoints = [
    '/api/stock',
    '/api/reports/sales?from=2026-01-01&to=2026-01-08',
    '/api/sales/10',
    '/api/returns'
  ];

  for (const ep of endpoints) {
    const r = await httpRequest('GET', ep, null, token);
    console.log('\n=== ' + ep + ' ===');
    console.log('status:', r.status);
    console.log(typeof r.data === 'string' ? r.data.slice(0,1000) : JSON.stringify(r.data, null, 2));
  }
  process.exit(0);
})();
