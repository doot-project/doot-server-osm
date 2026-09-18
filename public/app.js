// OSM GTPS Public - Client Script

document.addEventListener('DOMContentLoaded', () => {
  const el = {
    valOsmLink: document.getElementById('valOsmLink'),
    valOsmPath: document.getElementById('valOsmPath'),
    valHashSigned: document.getElementById('valHashSigned'),
    valHashHex: document.getElementById('valHashHex'),
    valItemsSize: document.getElementById('valItemsSize'),
    valItemCount: document.getElementById('valItemCount'),
    inputRdpIp: document.getElementById('inputRdpIp'),
    btnSaveRdp: document.getElementById('btnSaveRdp'),
    codeCpp: document.getElementById('codeCpp'),
    codeLua: document.getElementById('codeLua'),
    codeCSharp: document.getElementById('codeCSharp'),
    codeNodejs: document.getElementById('codeNodejs'),
    fileItemsInput: document.getElementById('fileItemsInput'),
    fileCacheInput: document.getElementById('fileCacheInput'),
    fileTableBody: document.getElementById('fileTableBody'),
    btnRefreshFiles: document.getElementById('btnRefreshFiles'),
    toast: document.getElementById('toast')
  };

  // 1. Memuat data OSM
  async function loadData() {
    try {
      const res = await fetch('/api/osm');
      const json = await res.json();
      const d = json.data;

      el.valOsmLink.textContent = d.osm_link;
      el.valOsmPath.textContent = d.osm_path;
      el.inputRdpIp.value = d.ip_rdp || '';

      if (d.exists) {
        el.valHashSigned.textContent = d.hash_signed;
        el.valHashHex.textContent = `Hex: ${d.hash_hex} (Unsigned: ${d.hash_unsigned})`;
        el.valItemsSize.textContent = `${d.size_kb} (v${d.version})`;
        el.valItemCount.textContent = `Total: ${d.item_count.toLocaleString()} items`;
      } else {
        el.valHashSigned.textContent = 'Belum Ada';
        el.valHashHex.textContent = 'Upload items.dat di bawah';
        el.valItemsSize.textContent = 'File kosong';
        el.valItemCount.textContent = 'Total: 0 items';
      }

      if (json.snippets) {
        el.codeCpp.textContent = json.snippets.cpp;
        el.codeLua.textContent = json.snippets.lua;
        el.codeCSharp.textContent = json.snippets.csharp;
        el.codeNodejs.textContent = json.snippets.nodejs;
      }
    } catch (err) {
      console.error('Error loadData:', err);
    }
  }

  // 2. Simpan IP RDP
  el.btnSaveRdp.addEventListener('click', async () => {
    const ip = el.inputRdpIp.value.trim();
    if (!ip) return showToast('Harap isi IP RDP!');

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip_rdp: ip })
      });
      const json = await res.json();
      if (json.success) {
        showToast('IP RDP berhasil disimpan! OSM PATH diperbarui.');
        loadData();
      }
    } catch (e) {
      showToast('Gagal simpan IP: ' + e.message);
    }
  });

  // 3. Upload items.dat
  el.fileItemsInput.addEventListener('change', () => {
    if (el.fileItemsInput.files.length === 0) return;
    const fd = new FormData();
    fd.append('file', el.fileItemsInput.files[0]);

    showToast('Mengunggah & menghitung hash items.dat...');
    fetch('/api/upload/items', { method: 'POST', body: fd })
      .then(r => r.json())
      .then(res => {
        el.fileItemsInput.value = '';
        if (res.success) {
          showToast('items.dat berhasil diperbarui!');
          loadData();
          loadFiles();
        } else {
          showToast('Gagal: ' + res.message);
        }
      })
      .catch(e => showToast('Error: ' + e.message));
  });

  // 4. Upload File Cache (.rttex, audio, atau .zip)
  el.fileCacheInput.addEventListener('change', () => {
    if (el.fileCacheInput.files.length === 0) return;
    const fd = new FormData();
    for (let i = 0; i < el.fileCacheInput.files.length; i++) {
      fd.append('files', el.fileCacheInput.files[i]);
    }

    showToast(`Mengunggah ${el.fileCacheInput.files.length} file cache...`);
    fetch('/api/upload/cache', { method: 'POST', body: fd })
      .then(r => r.json())
      .then(res => {
        el.fileCacheInput.value = '';
        if (res.success) {
          showToast(res.message);
          loadFiles();
        } else {
          showToast('Gagal: ' + res.message);
        }
      })
      .catch(e => showToast('Error: ' + e.message));
  });

  // 5. Daftar File Cache
  async function loadFiles() {
    try {
      const res = await fetch('/api/files');
      const json = await res.json();
      const files = json.files || [];

      if (files.length === 0) {
        el.fileTableBody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding:1rem; color:var(--muted)">Folder cache masih kosong.</td></tr>`;
        return;
      }

      el.fileTableBody.innerHTML = files.map(f => `
        <tr>
          <td><a href="/cache/${f.path}" target="_blank" style="color:var(--accent); font-weight:600">${f.name}</a></td>
          <td>${f.size}</td>
          <td>${new Date(f.updated_at).toLocaleString()}</td>
          <td><button class="btn-del" data-path="${f.path}">Hapus</button></td>
        </tr>
      `).join('');

      document.querySelectorAll('.btn-del').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = btn.getAttribute('data-path');
          if (confirm(`Hapus file "${p}"?`)) {
            fetch(`/api/files?path=${encodeURIComponent(p)}`, { method: 'DELETE' })
              .then(r => r.json())
              .then(res => {
                showToast(res.message);
                loadFiles();
                if (p.includes('items.dat')) loadData();
              });
          }
        });
      });
    } catch (e) {
      el.fileTableBody.innerHTML = `<tr><td colspan="4" class="text-center">Gagal memuat file.</td></tr>`;
    }
  }

  el.btnRefreshFiles.addEventListener('click', loadFiles);

  // 6. Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.getAttribute('data-tab');
      document.getElementById(target).classList.add('active');
    });
  });

  // 7. Tombol Copy
  document.querySelectorAll('.btn-copy, .btn-code-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        navigator.clipboard.writeText(targetEl.textContent).then(() => {
          const orig = btn.textContent;
          btn.textContent = 'Tersalin! ✓';
          setTimeout(() => { btn.textContent = orig; }, 2000);
        });
      }
    });
  });

  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.style.display = 'block';
    setTimeout(() => { el.toast.style.display = 'none'; }, 4000);
  }

  loadData();
  loadFiles();
});
