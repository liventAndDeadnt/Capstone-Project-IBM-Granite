# 💧 Aplikasi Pengingat Minum Air

Aplikasi web sederhana untuk membantu pengguna menjaga pola minum air dengan membuat pengingat sebagai Projek akhir dari IBM Skillsbuild. Dibuat dengan IBM Granite (& ChatGPT :v) **HTML, CSS, dan JavaScript** 


---

## ✨ Fitur Utama
- ⏰ **Pengingat Minum Air**  
  Pengguna dapat mengatur interval waktu minum air (misalnya setiap 1 jam).  
- 🔔 **Notifikasi Browser**  
  Menggunakan notifikasi bawaan browser untuk mengingatkan pengguna.  
- 🌗 **Mode Terang & Gelap (Dark Mode)**  
  Mendukung tampilan tema terang dan gelap dengan toggle.  
- 📊 **Pelacak Konsumsi Air Harian**  
  Hitung berapa banyak gelas air yang sudah diminum dalam sehari.  
- 💾 **Menyimpan Data di LocalStorage**  
  Semua preferensi dan progress tersimpan di browser, sehingga tetap ada meskipun halaman ditutup.  

---

## 📂 Struktur Proyek
```
/project-root
│── index.html        # Struktur utama halaman
│── style.css         # Styling tampilan (tema terang & gelap)
│── script.js         # Logika utama aplikasi (pengingat & notifikasi)
│── README.md         # Dokumentasi proyek
```

---

## 🚀 Cara Menjalankan
1. **Clone / Unduh repository ini**
   ```bash
   git clone https://github.com/liventAndDeadnt/Capstone-Project-IBM-Granite.git
   ```
   atau cukup unduh file `.zip`.

2. **Buka file `index.html` di browser**  
   Tidak perlu server tambahan, cukup buka langsung.

3. **Aktifkan notifikasi browser**  
   Saat pertama kali membuka, aplikasi akan meminta izin untuk menampilkan notifikasi.

---

## 📖 Cara Menggunakan
1. Masukkan **target jumlah gelas air** per hari.  
2. Tentukan **interval pengingat** (contoh: setiap 60 menit).  
3. Klik tombol **Mulai Pengingat**.  
4. Browser akan memberikan notifikasi sesuai jadwal.  
5. Centang gelas yang sudah diminum → progress akan tercatat.  
6. Tema bisa diganti ke **mode gelap** atau **mode terang** melalui tombol toggle.  

---

## ⚠️ Catatan
- Notifikasi hanya akan berjalan jika browser mendukung **Notification API**.  
- Jika tab ditutup, notifikasi tetap berjalan selama browser masih aktif.  
- Data hanya tersimpan di **localStorage**, jadi tidak tersinkronisasi antar perangkat.  

---

  
