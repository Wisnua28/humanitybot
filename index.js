const axios = require('axios');
const fs = require('fs');

const TOKEN = fs.readFileSync('token.txt', 'utf8').trim();

const checkIn = async () => {
  try {
    const response = await axios.post(
      'https://testnet.humanity.org/api/user/daily-check-in',
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

