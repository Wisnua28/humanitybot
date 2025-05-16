const fs = require('fs');
const axios = require('axios');

// Baca token dari file token.txt
const TOKEN_PATH = 'token.txt';

if (!fs.existsSync(TOKEN_PATH)) {
  console.error('File token.txt tidak ditemukan. Harap buat file token.txt dan masukkan token Anda.');
  process.exit(1);
}

const TOKEN = fs.readFileSync(TOKEN_PATH, 'utf8').trim();

const checkIn = async () => {
  try {
    const response = await axios.post(
      'https://api.humanityprotocol.io/api/user/daily-check-in',
      {},
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
        },
      }
    );

    console.log('✅ Check-in sukses:', response.data);
  } catch (error) {
    console.error('❌ Gagal check-in:', error.response?.data || error.message);
  }
};

checkIn();
