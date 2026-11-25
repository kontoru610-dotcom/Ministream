# MiniStream — Panduan pemula

MiniStream adalah website streaming sederhana untuk MP4, M3U8/HLS, dan YouTube. Website memakai Cloudflare Workers untuk menjalankan aplikasi dan Cloudflare D1 untuk menyimpan pengaturan serta statistik klik referral.

## Fitur

- Tampilan responsif untuk ponsel.
- Video MP4, HLS/M3U8, dan YouTube/YouTube Live.
- Dashboard admin dengan password dari Cloudflare Secret.
- Mengubah judul, deskripsi, sumber video, dan tiga URL referral.
- Tombol referral yang terlihat jelas. Setiap klik membuka tab baru dan merotasi link 1 → 2 → 3 → 1.
- Statistik klik untuk masing-masing link.

**Catatan perilaku referral:** tidak ada pop-up tersembunyi saat pengunjung menekan Play, menggeser durasi, atau mengubah volume. Tab referral hanya dibuka saat pengunjung menekan tombol rekomendasi. Ini menjaga kontrol video tetap berfungsi dan menghindari pengalihan tanpa persetujuan.

## A. Siapkan akun dan alat

1. Buat akun di https://dash.cloudflare.com/ jika belum punya.
2. Buat akun GitHub di https://github.com/.
3. Di komputer, pasang Node.js versi LTS dari https://nodejs.org/.
4. Buka terminal/Command Prompt dan cek:
   ```bash
   node -v
   npm -v
   ```
   Untuk langkah awal, komputer lebih mudah digunakan daripada HP.

## B. Upload proyek ke GitHub

1. Ekstrak ZIP MiniStream.
2. Buat repository baru di GitHub, misalnya `ministream`.
3. Pilih repository Public atau Private sesuai kebutuhan.
4. Upload semua isi folder proyek (pastikan `wrangler.toml`, `package.json`, `src`, `public`, dan `migrations` ada di akar repository).
5. Commit perubahan.

## C. Buat database Cloudflare D1

Di terminal, masuk ke folder proyek:
```bash
cd ministream
npm install
npx wrangler login
npx wrangler d1 create ministream-db
```

Cloudflare akan menampilkan `database_id`. Salin ID itu, lalu buka `wrangler.toml` dan ganti:
```toml
database_id = "PASTE_YOUR_DATABASE_ID_HERE"
```
dengan ID database milikmu. Simpan file tersebut.

Jalankan migrasi untuk membuat tabel:
```bash
npx wrangler d1 migrations apply ministream-db --remote
```

## D. Atur password admin

Jalankan:
```bash
npx wrangler secret put ADMIN_PASSWORD
```
Ketik password admin yang kuat saat diminta. Terminal tidak menampilkan karakter password ketika diketik; itu normal. Jangan taruh password di file kode atau GitHub.

## E. Jalankan tes lokal

```bash
npm run dev
```
Buka alamat lokal yang ditampilkan terminal, biasanya `http://localhost:8787`.
- Halaman website: `/`
- Dashboard admin: `/admin.html`

Masuk dashboard memakai password yang dibuat pada langkah D. Atur judul, sumber video, dan tiga link referral.

## F. Deploy ke Cloudflare

```bash
npm run deploy
```
Setelah selesai, terminal akan menampilkan alamat `https://ministream.<subdomain>.workers.dev` (nama dapat berbeda). Buka alamat itu di ponsel.

## G. Hubungkan GitHub untuk update

Cara paling sederhana untuk pemula adalah deploy dari komputer dengan perintah `npm run deploy` setelah mengubah kode. Repository GitHub tetap menjadi tempat menyimpan dan mencadangkan kode.

Jika ingin deploy otomatis setiap push GitHub, buka Cloudflare Dashboard → Workers & Pages → Create → Connect to Git. Pilih repository `ministream`, lalu ikuti konfigurasi build. Karena proyek ini memakai D1 binding dan secret, pastikan binding database bernama `DB` serta secret `ADMIN_PASSWORD` juga diatur pada pengaturan Worker hasil deploy. Jangan membuat dua Worker dengan nama sama.

## H. Cara mengisi sumber video

Di dashboard admin:
- **MP4:** pilih MP4 dan masukkan direct URL file `.mp4`.
- **M3U8/HLS:** pilih M3U8/HLS dan masukkan URL playlist `.m3u8`. Server sumber video harus mengizinkan CORS untuk pemutaran HLS di browser.
- **YouTube:** pilih YouTube dan masukkan URL video atau live YouTube. Tidak semua siaran dapat di-embed; pemilik video harus mengizinkannya.

Gunakan hanya video yang kamu miliki atau punya izin untuk disiarkan. Pastikan penyedia video mengizinkan hotlinking/embedding dan trafik dari domainmu.

## I. Cara kerja referral

Tombol “Buka rekomendasi berikutnya” membuka `/go/next` di tab baru. Worker mengubah urutan link di D1, mencatat klik, lalu mengalihkan tab baru ke URL referral berikutnya. Pengunjung dapat melihat tombol sebelum menekannya. Pengaturan link dapat diganti dari dashboard.

## Troubleshooting

- **Dashboard password ditolak:** pastikan `ADMIN_PASSWORD` sudah dibuat untuk Worker yang sama.
- **Website error database:** periksa `database_id`, binding bernama `DB`, dan jalankan migrasi remote.
- **Video MP4 tidak jalan:** pastikan URL langsung ke file video dan server mengizinkan akses lintas domain.
- **HLS tidak jalan:** periksa URL `.m3u8`, file segmen, dan header CORS server sumber.
- **YouTube tidak bisa diputar:** coba URL video biasa dan pastikan embedding diizinkan.
- **Tab referral tidak terbuka:** browser mungkin memblokir tab baru; pastikan pengunjung menekan tombol rekomendasi secara langsung.

## Struktur folder

```text
ministream/
├── migrations/
│   └── 0001_init.sql
├── public/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── admin.html
│   ├── admin.css
│   └── admin.js
├── src/
│   └── worker.js
├── package.json
├── wrangler.toml
└── README_ID.md
```
