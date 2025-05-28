Humanity Protocol Auto Claim Bot (Node.js)
Automatically claim Humanity Protocol testnet rewards using Node.js with support for multiple accounts and proxies.

Features
Automatically claim daily Humanity Protocol rewards.

Supports multiple accounts (multiple tokens).

Supports HTTP/HTTPS proxies with the format http://username:password@ip:port.

Random delay between accounts to avoid blocking.

Displays user info, wallet address, and HP points.

Automatically waits 24 hours before the next claim cycle.
---



1. Clone the repository
```bash
git clone https://github.com/Wisnua28/humanitybot.git
cd humanitybot
```

2. Install dependensi
Make sure Node.js is installed (version 16 or higher is recommended).
```bash
npm install axios chalk cli-table3 https-proxy-agent
```

3. Add your tokens
Edit the tokens.txt file and paste your tokens, one token per line.
```bash
nano tokens.txt
```

4. Add proxies (optional)
Edit the proxy.txt file and paste your proxies, one proxy per line, using the format:
http://username:password@ip:port
```bash
nano proxy.txt
```

5. Run the bot
```bash
node index.js
```








