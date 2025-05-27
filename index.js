import fs from "fs";
import axios from "axios";
import chalk from "chalk";
import Table from "cli-table3";
import HttpsProxyAgent from "https-proxy-agent";

const config = JSON.parse(fs.readFileSync("config.json", "utf-8"));
const TOKENS_FILE = "tokens.txt";
const PROXY_FILE = "proxy.txt";
const LOG_FILE = "log.txt";

function loadTokens() {
  if (!fs.existsSync(TOKENS_FILE)) return [];
  return fs.readFileSync(TOKENS_FILE, "utf-8")
    .split("\n")
    .map(t => t.trim())
    .filter(Boolean);
}

function loadProxies() {
  if (!fs.existsSync(PROXY_FILE)) return [];
  return fs.readFileSync(PROXY_FILE, "utf-8")
    .split("\n")
    .map(p => p.trim())
    .filter(Boolean);
}

function logError(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`);
}

function createAxiosInstance(proxyUrl = null) {
  if (proxyUrl) {
    const agent = new HttpsProxyAgent(proxyUrl);
    return axios.create({ httpsAgent: agent, timeout: 15000 });
  }
  return axios.create({ timeout: 15000 });
}

async function call(axiosInstance, endpoint, token, method = "POST", body = null) {
  const url = config.baseUrl + endpoint;
  const headers = {
    accept: "application/json, text/plain, */*",
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
    token,
    "user-agent": config.userAgent
  };
  try {
    const response = await axiosInstance({
      url,
      method,
      headers,
      data: body,
    });
    return response.data;
  } catch (err) {
    if (err.response?.data?.message) {
      throw new Error(`${err.response.status} ${err.response.statusText}: ${err.response.data.message}`);
    }
    throw new Error(`Request failed (${endpoint}): ${err.message}`);
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processToken(token, index, proxyUrl) {
  console.log(chalk.cyan(`\n🔹 Memulai Token #${index + 1}`));
  const axiosInstance = createAxiosInstance(proxyUrl);
  try {
    const userInfo = await call(axiosInstance, "/api/user/userInfo", token);
    const userData = userInfo.data || {};

    const table = new Table({
      head: [chalk.magenta("Informasi"), chalk.white("Nilai")],
    });

    table.push(
      ["✅ Nickname", userData.nickName || "Unknown"],
      ["✅ Wallet", userData.ethAddress || "Unknown"]
    );
    console.log(table.toString());

    const balance = await call(axiosInstance, "/api/rewards/balance", token, "GET");
    console.log(chalk.yellow(`💰 Point HP : ${balance.balance?.total_rewards ?? 0}`));

    const rewardStatus = await call(axiosInstance, "/api/rewards/daily/check", token);
    console.log(chalk.blue(`📊 Status: ${rewardStatus.message ?? "-"}`));

    if (!rewardStatus.available) {
      console.log(chalk.keyword("orange")("⏳ Done claim, skip"));
      return;
    }

    const claim = await call(axiosInstance, "/api/rewards/daily/claim", token);
    const claimData = claim.data || {};

    if (claimData.amount) {
      console.log(chalk.green(`🎉 Klaim berhasil, HP Point: ${claimData.amount}`));
    } else if (
      claim.message &&
      claim.message.toLowerCase().includes("successfully claimed")
    ) {
      console.log(chalk.green("🎉 Anda telah berhasil mengklaim HP Point hari ini."));
    } else {
      console.log(chalk.red(`❌ Klaim gagal, data tidak sesuai: ${JSON.stringify(claim)}`));
      return;
    }

    const updatedBalance = await call(axiosInstance, "/api/rewards/balance", token, "GET");
    if (updatedBalance.balance) {
      console.log(chalk.green(`💰 HP Point setelah klaim: ${updatedBalance.balance.total_rewards}`));
    } else {
      console.log(chalk.red(`❌ Gagal memperbarui HP Point: ${JSON.stringify(updatedBalance)}`));
    }
  } catch (err) {
    console.log(chalk.red.bold(`❌ Error: ${err.message}`));
    logError(`Token #${index + 1} gagal: ${err.message}`);
  }

  const delay = Math.floor(Math.random() * (config.delayMaxMs - config.delayMinMs + 1)) + config.delayMinMs;
  console.log(chalk.yellow(`⏳ Menunggu ${(delay / 1000).toFixed(2)} detik sebelum lanjut...`));
  await wait(delay);
}

async function countdown(seconds, onFinish) {
  const interval = 1000;
  let remaining = seconds;

  process.stdout.write("\n");
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (remaining < 0) {
        clearInterval(timer);
        console.log(chalk.green("\n⏳ Countdown selesai, memulai putaran baru...\n"));
        onFinish().then(resolve).catch(reject);
      } else {
        const h = Math.floor(remaining / 3600);
        const m = Math.floor((remaining % 3600) / 60);
        const s = remaining % 60;
        process.stdout.write(
          `\r⏳ Menunggu ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} untuk claim selanjutnya`
        );
        remaining--;
      }
    }, interval);

    process.on("SIGINT", () => {
      clearInterval(timer);
      console.log(chalk.red("\n🛑 Program dihentikan oleh pengguna."));
      process.exit(0);
    });
  });
}

async function startRound(tokens, proxies) {
  console.log(chalk.green(`\n🚀 Accounts total : ${tokens.length} akun...`));
  const proxyCount = proxies.length;
  for (let i = 0; i < tokens.length; i++) {
    const proxyUrl = proxyCount > 0 ? proxies[i % proxyCount] : null;
    if(proxyUrl) {
      console.log(chalk.gray(`🔌 Menggunakan proxy: ${proxyUrl}`));
    }
    await processToken(tokens[i], i, proxyUrl);
  }
  console.log(chalk.green("✅ Claim done, next claim waiting 24 hours..."));
  await countdown(config.claimIntervalSeconds, () => startRound(tokens, proxies));
}

(async () => {
  if (!fs.existsSync(TOKENS_FILE)) {
    console.log(chalk.red("❌ File tokens.txt tidak ditemukan!"));
    process.exit(1);
  }

  const tokens = loadTokens();
  const proxies = loadProxies();

  console.log(chalk.cyan.bold("Auto Claim Humanity Protocol 🚀"));
  if(proxies.length > 0) {
    console.log(chalk.cyan(`🔌 Total proxy ditemukan: ${proxies.length}`));
  } else {
    console.log(chalk.cyan("ℹ️ Tidak ada proxy ditemukan, berjalan tanpa proxy."));
  }
  await startRound(tokens, proxies);
})();

