# Humanity Protocol Auto Claim Bot (Node.js)

Auto claim Humanity Protocol testnet rewards menggunakan Node.js dengan dukungan multi akun dan proxy.

---

## Fitur

- Auto klaim daily reward Humanity Protocol.
- Support multi akun (multi token).
- Support proxy HTTP/HTTPS dengan format `http://username:password@ip:port`.
- Delay random antar akun untuk menghindari blokir.
- Menampilkan informasi user, wallet, dan point HP.
- Menunggu 24 jam otomatis sebelum klaim ulang.

---

## Persiapan

1. Clone repositori

```bash
git clone https://github.com/Wisnua28/humanitybot.git
cd humanitybot
```
2. Install dependensi
Pastikan sudah install Node.js (versi 16 ke atas disarankan).

```bash
npm install
```
3. Memasukkan token
```bash
nano tokens.txt
```

4. Memasukkan proxy (opsional)
```bash
nano proxy.txt
```

Menjalankan bot :
```bash
node index.js
```








