# Universal OSM GTPS &bull; Anti-Stuck Cache Manager

Website OnSuperMain (OSM) dan CDN Cache Manager untuk Growtopia Private Server (GTPS) yang kompatibel dengan **semua source GTPS** (C++, Lua, C#, Node.js, Python).

## 🚀 Fitur Utama
- **Terkunci ke 1 Master Web**: Tidak perlu membuat OSM baru, link web ini sendiri langsung menjadi CDN resmi.
- **Universal Anti-Stuck**: Menangani semua jalur request `items.dat` (`/items.dat`, `/cache/items.dat`, `/cache/src/items.dat`) tanpa error 404.
- **Multi-File & ZIP Cache Uploader**: Mendukung upload file `.rttex`, audio `.wav`, dan otomatis ekstrak file `cache.zip`.
- **Auto Re-Hash 32-bit**: Otomatis menghitung ulang hash resmi Growtopia saat `items.dat` diupload.
- **Siap Deploy ke Vercel**: Dilengkapi `vercel.json` dan `api/index.js` untuk hosting gratis dengan domain HTTPS resmi (`*.vercel.app`).

## 📁 Struktur File Repository

```text
├── api/
│   └── index.js          # Entrypoint serverless function untuk Vercel
├── cache/
│   └── items.dat         # File items.dat aktif
├── public/
│   ├── index.html        # Dashboard web minimalis
│   ├── style.css         # Styling modern dark theme
│   └── app.js            # Logika frontend & auto-copy
├── server.js             # Backend Express server
├── package.json          # Dependensi project (express, multer, cors)
├── vercel.json           # Konfigurasi routing Vercel
├── config.json           # Konfigurasi IP RDP & port
├── onsuper_main.lua      # Contoh script hook Lua untuk server GTPS
└── .gitignore            # Mencegah node_modules terupload ke GitHub
```

## 🌐 Cara Deploy ke Vercel (Gratis)
1. Upload/Push repository ini ke akun **GitHub** Anda.
2. Buka [vercel.com](https://vercel.com) & login.
3. Klik **Add New Project** &rarr; Pilih repository ini dari GitHub.
4. Klik **Deploy** tanpa perlu mengubah pengaturan build.
5. Selesai! Web OSM Anda akan langsung aktif dengan domain `https://nama-web.vercel.app/`.

## 💻 Parameter OnSuperMain untuk Server Game
- **OSM LINK** : `https://nama-web.vercel.app/`
- **OSM PATH** : `172.232.228.96:3000/cache/` (atau `<IP_RDP>/cache/`)
- **ITEMS HASH**: Dilihat langsung di dashboard web Anda.
