const fs = require("fs");
const axios = require("axios");
const readline = require("readline");
const chalk = require("chalk");

// ===== Konstanta
const BASE_URL = "https://testnet.humanity.org";
const TOKEN_FILE = "token.txt";
const PROXY_FILE = "proxy.txt";

// ===== Helper
function loadFileLines(filepath) {
  if (!fs.existsSync(filepath)) return [];
  return fs.readFileSync(filepath, "utf-8")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== Data
const tokens = loadFileLines(TOKEN_FILE);
const proxies = loadFileLines(PROXY_FILE);
console.log(chalk.cyan.bold("Auto Claim Humanity Protocol 🚀"));
console.log(chalk.yellow(`🔌 Total proxy ditemukan: ${proxies.length}\n`));
console.log(chalk.green(`🚀 Accounts total : ${tokens.length} akun...`));

// ===== Fungsi utama
async function callApi(endpoint, token, proxy, method = "POST", body = {}) {
  const url = BASE_URL + endpoint;
  const headers = {
    accept: "application/json, text/plain, */*",
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
    token: token,
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
  };

  const axiosConfig = {
    method,
    url,
    headers,
    timeout: 15000
  };

  if (method === "POST") {
    axiosConfig.data = body;
  }

  if (proxy) {
    const parsed = new URL(proxy);
    axiosConfig.proxy = {
      protocol: parsed.protocol.replace(":", ""),
      host: parsed.hostname,
      port: parseInt(parsed.port),
      auth: parsed.username && parsed.password ? {
        username: parsed.username,
        password: parsed.password
      } : undefined
    };
  }

  try {
    const response = await axios(axiosConfig);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`${error.response.status} ${error.response.statusText}: ${error.response.data.message || "Unknown error"}`);
    } else {
      throw new Error(`Request failed: ${error.message}`);
    }
  }
}

async function processToken(token, index) {
  const proxy = proxies.length > 0 ? proxies[index % proxies.length] : null;
  if (proxy) console.log(chalk.gray(`🔌 Menggunakan proxy: ${proxy}`));
  console.log(chalk.cyan(`\n🔹 Memulai Token #${index + 1}`));
  try {
    const userInfo = await callApi("/api/user/userInfo", token, proxy, "GET");
    const user = userInfo.data || {};
    console.log(`✅ Nickname : ${user.nickName}`);
    console.log(`✅ Wallet   : ${user.ethAddress}`);

    const balance = await callApi("/api/rewards/balance", token, proxy, "GET");
    console.log(chalk.yellow(`💰 HP Point : ${balance.balance?.total_rewards || 0}`));

    const status = await callApi("/api/rewards/daily/check", token, proxy, "GET");
    console.log(chalk.blue(`📊 Status : ${status.message}`));

    if (!status.available) {
      console.log(chalk.keyword("orange")("⏳ Sudah klaim hari ini, skip..."));
      return;
    }

    const claim = await callApi("/api/rewards/daily/claim", token, proxy);
    const claimAmount = claim?.data?.amount;
    if (claimAmount) {
      console.log(chalk.green(`🎉 Klaim berhasil! HP Point +${claimAmount}`));
    } else {
      console.log(chalk.green(`🎉 ${claim.message}`));
    }

    const updated = await callApi("/api/rewards/balance", token, proxy, "GET");
    console.log(chalk.green(`💰 Total setelah klaim: ${updated.balance?.total_rewards}`));
  } catch (err) {
    console.log(chalk.red(`❌ Error: ${err.message}`));
  }

  const wait = getRandomInt(15000, 20000);
  console.log(chalk.yellow(`⏳ Menunggu ${(wait / 1000).toFixed(2)} detik sebelum lanjut...`));
  await delay(wait);
}

async function startRound() {
  for (let i = 0; i < tokens.length; i++) {
    await processToken(tokens[i], i);
  }
  console.log(chalk.green("✅ Claim done, next claim waiting 24 hours...\n"));
  await countdown(24 * 60 * 60);
  await startRound();
}

async function countdown(seconds) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const interval = setInterval(() => {
    const hrs = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(chalk.yellow(`⏳ Menunggu ${hrs}:${mins}:${secs} untuk claim selanjutnya...`));
    seconds--;
    if (seconds < 0) {
      clearInterval(interval);
      rl.close();
      process.stdout.write("\n");
    }
  }, 1000);

  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

startRound();
