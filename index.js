const fs = require("fs");
const axios = require("axios");
const chalk = require("chalk");
const Table = require("cli-table3");

// Header ASCII art dengan warna putih, muncul saat program start
console.log(chalk.white(`
               ██╗      ██████╗ ██╗     
               ██║     ██╔═══██╗██║     
               ██║     ██║   ██║██║     
               ██║     ██║   ██║██║     
               ███████╗╚██████╔╝███████╗
               ╚══════╝ ╚═════╝ ╚══════╝

              AUTO CLAIM DAILY HUMANITY PROTOCOL
                         |KAMU JOMBLO YA|
`));

// Config & data files
const BASE_URL = "https://testnet.humanity.org";
const TOKEN_FILE = "token.txt";
const PROXY_FILE = "proxy.txt";

// Load tokens
function loadTokens() {
  if (!fs.existsSync(TOKEN_FILE)) {
    console.log(chalk.red(`❌ File ${TOKEN_FILE} tidak ditemukan!`));
    process.exit(1);
  }
  const data = fs.readFileSync(TOKEN_FILE, "utf-8");
  return data
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

// Load proxies
function loadProxies() {
  if (!fs.existsSync(PROXY_FILE)) {
    return [];
  }
  const data = fs.readFileSync(PROXY_FILE, "utf-8");
  return data
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

// Axios instance with optional proxy
function createAxiosInstance(proxy) {
  const config = {
    timeout: 15000,
    headers: {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
  };
  if (proxy) {
    try {
      const url = new URL(proxy);
      config.proxy = {
        protocol: url.protocol.replace(":", ""),
        host: url.hostname,
        port: Number(url.port),
        auth: {
          username: url.username,
          password: url.password,
        },
      };
    } catch (e) {
      console.log(chalk.red(`❌ Format proxy salah: ${proxy}`));
      process.exit(1);
    }
  }
  return axios.create(config);
}

// API call wrapper
async function call(endpoint, token, method = "POST", body = null, axiosInstance) {
  const url = BASE_URL + endpoint;
  const headers = {
    authorization: `Bearer ${token}`,
    token: token,
  };
  try {
    let response;
    if (method.toUpperCase() === "GET") {
      response = await axiosInstance.get(url, { headers });
    } else {
      response = await axiosInstance.post(url, body || {}, { headers });
    }
    return response.data;
  } catch (error) {
    if (error.response) {
      const msg = error.response.data?.message || error.response.statusText;
      throw new Error(`${error.response.status} ${error.response.statusText}: ${msg}`);
    } else {
      throw new Error(error.message);
    }
  }
}

// Process each token
async function processToken(token, index, proxy) {
  console.log(chalk.cyan(`\n🔹 Memulai Token #${index + 1}`));
  const axiosInstance = createAxiosInstance(proxy);
  try {
    const userInfo = await call("/api/user/userInfo", token, "POST", null, axiosInstance);
    const userData = userInfo.data || {};
    // Table for user info
    const table = new Table({
      head: [chalk.magenta("Informasi"), chalk.white("Nilai")],
      colWidths: [20, 50],
    });
    table.push(
      [chalk.cyan("✅ Nickname"), userData.nickName || "Unknown"],
      [chalk.cyan("✅ Wallet"), userData.ethAddress || "Unknown"]
    );
    console.log(table.toString());

    const balance = await call("/api/rewards/balance", token, "GET", null, axiosInstance);
    const totalRewards = balance.balance?.total_rewards || 0;
    console.log(chalk.yellow(`💰 Point HP : ${totalRewards}`));

    const rewardStatus = await call("/api/rewards/daily/check", token, "POST", null, axiosInstance);
    const statusMessage = rewardStatus.message || "-";
    console.log(chalk.blue(`📊 Status: ${statusMessage}`));

    if (!rewardStatus.available) {
      console.log(chalk.hex("#FFA500")("⏳ Sudah klaim hari ini, skip..."));
      return;
    }

    const claim = await call("/api/rewards/daily/claim", token, "POST", null, axiosInstance);
    const claimData = claim.data || {};
    if (claimData.amount) {
      console.log(chalk.green(`🎉 Klaim berhasil, HP Point: ${claimData.amount}`));
    } else if (claim.message && claim.message.includes("successfully claimed")) {
      console.log(chalk.green("🎉 Anda telah berhasil mengklaim HP Point hari ini."));
    } else {
      console.log(chalk.red(`❌ Klaim gagal, data tidak sesuai: ${JSON.stringify(claim)}`));
      return;
    }

    const updatedBalance = await call("/api/rewards/balance", token, "GET", null, axiosInstance);
    if (updatedBalance.balance) {
      console.log(chalk.green(`💰 HP Point setelah klaim: ${updatedBalance.balance.total_rewards}`));
    } else {
      console.log(chalk.red(`❌ Gagal memperbarui HP Point: ${JSON.stringify(updatedBalance)}`));
    }
  } catch (err) {
    console.log(chalk.red(`❌ Error: ${err.message}`));
  }
  const delay = Math.floor(Math.random() * (20000 - 15000 + 1) + 15000) / 1000;
  console.log(chalk.yellow(`⏳ Menunggu ${delay.toFixed(2)} detik sebelum lanjut...`));
  await new Promise((r) => setTimeout(r, delay * 1000));
}

// Countdown timer
function countdown(seconds, onFinish) {
  let remaining = seconds;
  process.stdout.write("\n");
  const interval = setInterval(() => {
    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;
    process.stdout.write(`\r⏳ Menunggu ${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")} untuk claim selanjutnya... `);
    remaining--;
    if (remaining < 0) {
      clearInterval(interval);
      console.log("\n" + chalk.green("⏳ Countdown selesai, memulai putaran baru..."));
      onFinish();
    }
  }, 1000);

  // Handle Ctrl+C
  process.on("SIGINT", () => {
    clearInterval(interval);
    console.log("\n" + chalk.red("🛑 Program dihentikan oleh pengguna."));
    process.exit(0);
  });
}

// Main loop
async function startRound() {
  const tokens = loadTokens();
  const proxies = loadProxies();

  console.log(chalk.cyan("\nAuto Claim Humanity Protocol 🚀"));
  console.log(chalk.green(`🔌 Total proxy ditemukan: ${proxies.length}\n`));
  console.log(chalk.green(`🚀 Accounts total : ${tokens.length} akun...`));

  for (let i = 0; i < tokens.length; i++) {
    const proxy = proxies.length > 0 ? proxies[i % proxies.length] : null;
    if (proxy) {
      console.log(chalk.green(`🔌 Menggunakan proxy: ${proxy}`));
    }
    await processToken(tokens[i], i, proxy);
  }

  console.log(chalk.green("✅ Claim done, next claim waiting 24 hours..."));
  countdown(24 * 60 * 60, startRound);
}

// Run
startRound();
