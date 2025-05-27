import fs from "fs";
import axios from "axios";
import chalk from "chalk";
import Table from "cli-table3";

// Load tokens
const TOKENS = fs.readFileSync("tokens.txt", "utf-8").split("\n").filter(Boolean);
// Load proxies
const PROXIES = fs.existsSync("proxy.txt")
  ? fs.readFileSync("proxy.txt", "utf-8").split("\n").filter(Boolean)
  : [];

const BASE_URL = "https://testnet.humanity.org";

console.log(chalk.cyan("Auto Claim Humanity Protocol 🚀"));
console.log(chalk.green(`🔌 Total proxy ditemukan: ${PROXIES.length}`));
console.log("");

function getProxy(index) {
  if (PROXIES.length === 0) return null;
  return PROXIES[index % PROXIES.length];
}

async function callAPI(endpoint, token, proxy, method = "POST", body = {}) {
  const url = BASE_URL + endpoint;
  const headers = {
    accept: "application/json, text/plain, */*",
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
    token: token,
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  };
  const axiosConfig = {
    method,
    url,
    headers,
    data: method === "POST" ? body : undefined,
    proxy: false,
    timeout: 15000,
  };

  if (proxy) {
    try {
      const proxyUrl = new URL(proxy);
      axiosConfig.proxy = {
        host: proxyUrl.hostname,
        port: Number(proxyUrl.port),
      };
      if (proxyUrl.username && proxyUrl.password) {
        axiosConfig.proxy.auth = {
          username: proxyUrl.username,
          password: proxyUrl.password,
        };
      }
    } catch {
      // Invalid proxy format, ignore proxy
      axiosConfig.proxy = false;
    }
  }

  const response = await axios(axiosConfig);
  return response.data;
}

async function processToken(token, index) {
  console.log(chalk.green(`🔹 Memulai Token #${index + 1}`));

  const proxy = getProxy(index);
  if (proxy) {
    console.log(chalk.green(`🔌 Menggunakan proxy: ${proxy}`));
  }

  try {
    const userInfo = await callAPI("/api/user/userInfo", token, proxy);
    const user = userInfo.data || {};

    const table = new Table({
      head: [chalk.cyan("Informasi"), chalk.white("Nilai")],
      style: { head: [], border: [] },
      colWidths: [15, 50],
    });

    table.push(
      ["✅ Nickname", user.nickName || "Unknown"],
      ["✅ Wallet", user.ethAddress || "Unknown"]
    );
    console.log(table.toString());

    const balance = await callAPI("/api/rewards/balance", token, proxy, "GET");
    console.log(chalk.yellow(`💰 Point HP : ${balance.balance?.total_rewards ?? 0}`));

    const status = await callAPI("/api/rewards/daily/check", token, proxy);
    console.log(chalk.blue(`📊 Status: ${status.message || "-"}`));

    if (!status.available) {
      console.log(chalk.hex("#FFA500")("⏳ Sudah klaim hari ini, skip..."));
      return;
    }

    const claim = await callAPI("/api/rewards/daily/claim", token, proxy);
    const claimData = claim.data || {};
    if (claimData.amount) {
      console.log(chalk.green(`🎉 Klaim berhasil, HP Point: ${claimData.amount}`));
    } else if (claim.message && claim.message.includes("successfully claimed")) {
      console.log(chalk.green("🎉 Anda telah berhasil mengklaim HP Point hari ini."));
    } else {
      console.log(chalk.red(`❌ Klaim gagal, data tidak sesuai: ${JSON.stringify(claim)}`));
      return;
    }

    const updatedBalance = await callAPI("/api/rewards/balance", token, proxy, "GET");
    if (updatedBalance.balance) {
      console.log(chalk.green(`💰 HP Point setelah klaim: ${updatedBalance.balance.total_rewards}`));
    } else {
      console.log(chalk.red(`❌ Gagal memperbarui HP Point: ${JSON.stringify(updatedBalance)}`));
    }
  } catch (err) {
    console.log(chalk.red(`❌ Error: ${err.message || err}`));
  }

  const delay = (Math.random() * (20 - 15) + 15) * 1000;
  console.log(chalk.yellow(`⏳ Menunggu ${(delay / 1000).toFixed(2)} detik sebelum lanjut...`));
  await new Promise((r) => setTimeout(r, delay));
}

async function startRound() {
  console.log(chalk.green(`🚀 Accounts total : ${TOKENS.length} akun...`));
  for (let i = 0; i < TOKENS.length; i++) {
    await processToken(TOKENS[i], i);
  }
  console.log(chalk.green("✅ Claim done, next claim waiting 24 hours..."));
  await countdown(24 * 60 * 60);
}

async function countdown(seconds) {
  while (seconds > 0) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    process.stdout.write(`\r⏳ Menunggu ${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")} untuk claim selanjutnya`);
    await new Promise((r) => setTimeout(r, 1000));
    seconds--;
  }
  console.log("\n");
  await startRound();
}

(async () => {
  await startRound();
})();
