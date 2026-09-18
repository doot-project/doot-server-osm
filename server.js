const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Direktori cache
const CACHE_DIR = path.join(__dirname, 'cache');
const TEMP_DIR = os.tmpdir();
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// Auto-detect IP RDP / VPS publik
function getRdpIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '172.232.228.96';
}

// Konfigurasi
const CONFIG_FILE = path.join(__dirname, 'config.json');
let serverConfig = {
  ip_rdp: `${getRdpIp()}:${PORT}`, // Contoh: 172.232.228.96:3000
  fixed_web_url: ""
};

if (fs.existsSync(CONFIG_FILE)) {
  try {
    serverConfig = { ...serverConfig, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
  } catch (e) {}
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(serverConfig, null, 2));
  } catch (e) {}
}

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Growtopia 32-bit items.dat hash algorithm
function calculateHash(buf) {
  let hash = 0x55555555;
  for (let i = 0; i < buf.length; i++) {
    hash = ((hash >>> 27) + (hash << 5) + buf[i]) >>> 0;
  }
  return hash;
}

// Mengambil OSM LINK dan OSM PATH
function getOsmData(req) {
  const ipRdp = serverConfig.ip_rdp || `${getRdpIp()}:${PORT}`;
  
  // Format OSM PATH: <ip_rdp>/cache/
  let osmPath = ipRdp.endsWith('/') ? `${ipRdp}cache/` : `${ipRdp}/cache/`;
  if (osmPath.startsWith('http://')) osmPath = osmPath.replace('http://', '');
  if (osmPath.startsWith('https://')) osmPath = osmPath.replace('https://', '');

  // Format OSM LINK: http://<ip_rdp>/ atau domain web
  let osmLink = `http://${ipRdp}/`;
  if (serverConfig.fixed_web_url && serverConfig.fixed_web_url.trim() !== '') {
    osmLink = serverConfig.fixed_web_url.endsWith('/') ? serverConfig.fixed_web_url : `${serverConfig.fixed_web_url}/`;
  } else if (req) {
    const host = req.headers['x-forwarded-host'] || req.get('host');
    if (host && host.includes('vercel.app')) {
      osmLink = `https://${host}/`;
    }
  }

  const itemsPath = path.join(CACHE_DIR, 'items.dat');
  let hashSigned = 0, hashUnsigned = 0, hashHex = '0x00000000', version = 0, itemCount = 0, sizeKb = '0 KB', exists = false;

  if (fs.existsSync(itemsPath)) {
    const buf = fs.readFileSync(itemsPath);
    const hash = calculateHash(buf);
    hashSigned = hash | 0;
    hashUnsigned = hash;
    hashHex = '0x' + hash.toString(16).toUpperCase().padStart(8, '0');
    version = buf.length >= 2 ? buf.readUInt16LE(0) : 0;
    itemCount = buf.length >= 6 ? buf.readUInt32LE(2) : 0;
    sizeKb = `${(buf.length / 1024).toFixed(2)} KB`;
    exists = true;
  }

  return {
    exists,
    ip_rdp: ipRdp,
    osm_link: osmLink,
    osm_path: osmPath, // Contoh: 172.232.228.96:3000/cache/
    hash_signed: hashSigned,
    hash_unsigned: hashUnsigned,
    hash_hex: hashHex,
    item_count: itemCount,
    version: version,
    size_kb: sizeKb
  };
}

// ================= UNIVERSAL CACHE ROUTING (ANTI-STUCK) ================= //
app.get(/.*items\.dat$/, (req, res) => {
  const filePath = path.join(CACHE_DIR, 'items.dat');
  if (!fs.existsSync(filePath)) return res.status(404).send('items.dat belum ada');
  
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');
  if (req.query.download === '1') res.setHeader('Content-Disposition', 'attachment; filename="items.dat"');
  fs.createReadStream(filePath).pipe(res);
});

// Melayani file cache (/cache/...)
app.use('/cache', express.static(CACHE_DIR, {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');
  }
}));

// Route fallback untuk aset cache (.rttex, .wav, dll)
app.get(/.*\.(rttex|wav|mp3|txt|dat|png)$/, (req, res, next) => {
  const fileName = path.basename(req.path);
  const possiblePaths = [
    path.join(CACHE_DIR, req.path),
    path.join(CACHE_DIR, fileName)
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p) && !fs.statSync(p).isDirectory()) {
      return res.sendFile(p);
    }
  }
  next();
});

// ================= API ENDPOINTS ================= //

// GET /api/osm
app.get('/api/osm', (req, res) => {
  const d = getOsmData(req);
  res.json({
    success: true,
    data: d,
    snippets: {
      cpp: `// C++ Proton / GTServer / Standard
varList.Insert("OnSuperMainStartAcceptLogonHrdcronrxr");
varList.Insert(${d.hash_signed});
varList.Insert("${d.osm_link}");
varList.Insert("${d.osm_path}");
varList.Insert(0);
SendVariantList(peer, varList);`,

      lua: `-- Lua GTPS
player:sendVariant({ "OnSuperMainStartAcceptLogonHrdcronrxr", ${d.hash_signed}, "${d.osm_link}", "${d.osm_path}" })`,

      csharp: `// C# .NET (Kernir)
varList.Add("OnSuperMainStartAcceptLogonHrdcronrxr");
varList.Add(${d.hash_signed});
varList.Add("${d.osm_link}");
varList.Add("${d.osm_path}");
varList.Add(0);
peer.Send(varList);`,

      nodejs: `// Node.js (Growtopia-js)
peer.sendVariant(["OnSuperMainStartAcceptLogonHrdcronrxr", ${d.hash_signed}, "${d.osm_link}", "${d.osm_path}", 0]);`
    }
  });
});

// POST /api/config (Update IP RDP)
app.post('/api/config', (req, res) => {
  if (req.body.ip_rdp) serverConfig.ip_rdp = req.body.ip_rdp.trim();
  if (req.body.fixed_web_url !== undefined) serverConfig.fixed_web_url = req.body.fixed_web_url.trim();
  saveConfig();
  res.json({ success: true, message: 'Konfigurasi IP RDP disimpan!', data: getOsmData(req) });
});

// Multer Storage untuk Upload Cache
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, TEMP_DIR);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

// POST /api/upload/items (Upload items.dat)
app.post('/api/upload/items', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Tidak ada file items.dat' });
  const target = path.join(CACHE_DIR, 'items.dat');
  fs.copyFileSync(req.file.path, target);
  fs.unlinkSync(req.file.path);
  res.json({ success: true, message: 'items.dat berhasil diupdate!', data: getOsmData(req) });
});

// POST /api/upload/cache (Upload Aset Cache: .rttex, audio, atau .zip)
app.post('/api/upload/cache', upload.array('files', 100), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'Tidak ada file cache yang diunggah' });
  }

  let zipFound = false;
  req.files.forEach(file => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.zip') {
      zipFound = true;
      // Ekstrak file zip ke folder cache otomatis menggunakan PowerShell Expand-Archive
      const zipPath = file.path;
      const cmd = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${CACHE_DIR}' -Force"`;
      exec(cmd, (err) => {
        fs.unlinkSync(zipPath);
        if (err) console.error('Gagal ekstrak zip:', err.message);
      });
    } else {
      // Pindahkan langsung ke CACHE_DIR
      const targetPath = path.join(CACHE_DIR, file.originalname);
      fs.copyFileSync(file.path, targetPath);
      fs.unlinkSync(file.path);
    }
  });

  const msg = zipFound 
    ? 'File ZIP cache berhasil diunggah dan diekstrak ke folder cache!'
    : `Berhasil mengunggah ${req.files.length} file ke folder cache!`;

  res.json({ success: true, message: msg });
});

// GET /api/files (Melihat daftar semua file di folder cache)
app.get('/api/files', (req, res) => {
  if (!fs.existsSync(CACHE_DIR)) return res.json({ success: true, files: [] });
  
  function scan(dir, rel = '') {
    let list = [];
    const entries = fs.readdirSync(dir);
    for (const name of entries) {
      const full = path.join(dir, name);
      const relPath = rel ? `${rel}/${name}` : name;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        list = list.concat(scan(full, relPath));
      } else {
        list.push({
          name: name,
          path: relPath,
          size: stat.size > 1024 * 1024 ? `${(stat.size / 1024 / 1024).toFixed(2)} MB` : `${(stat.size / 1024).toFixed(2)} KB`,
          updated_at: stat.mtime
        });
      }
    }
    return list;
  }

  const files = scan(CACHE_DIR);
  res.json({ success: true, files });
});

// DELETE /api/files (Hapus file cache)
app.delete('/api/files', (req, res) => {
  const rel = req.query.path;
  if (!rel) return res.status(400).json({ success: false, message: 'Path tidak ada' });
  const target = path.join(CACHE_DIR, rel);
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
    return res.json({ success: true, message: `File ${rel} dihapus` });
  }
  res.status(404).json({ success: false, message: 'File tidak ditemukan' });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    const d = getOsmData();
    console.log(`=======================================================`);
    console.log(`  OSM GTPS PUBLIC SERVER BERJALAN                      `);
    console.log(`  - Dashboard Web : http://localhost:${PORT}           `);
    console.log(`  - OSM LINK      : ${d.osm_link}                      `);
    console.log(`  - OSM PATH      : ${d.osm_path}                      `);
    console.log(`=======================================================`);
  });
}

module.exports = app;
