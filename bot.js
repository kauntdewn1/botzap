const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const qs = require("querystring");
const http = require("https");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.TOKEN;
const INSTANCE = process.env.INSTANCE;

app.get("/", (req, res) => {
  res.status(200).send("Bot tá vivo e rodando, caralho!");
});

app.post("/webhook", async (req, res) => {
  console.log("📩 Mensagem recebida:", JSON.stringify(req.body, null, 2));

  const data = req.body?.data;
  if (!data || !data.body) return res.sendStatus(200);

  const msg = data.body.toLowerCase();
  const grupo = data.to;
  const autor = data.from;

  const regex = /(http|www\.|\.com|\.net|\.org|bit\.ly|wa\.me|t\.me)/i;

  if (regex.test(msg)) {
    console.log("🛑 Link detectado:", msg);

    const aviso = qs.stringify({
      token: TOKEN,
      to: autor,
      body: "🚨 Você foi removido por compartilhar link proibido."
    });

    const options = {
      method: "POST",
      hostname: "api.ultramsg.com",
      path: `/${INSTANCE}/messages/chat`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": aviso.length
      }
    };

    const reqSend = http.request(options, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => console.log("📤 Aviso enviado:", data));
    });
    reqSend.write(aviso);
    reqSend.end();

    try {
      const resKick = await axios.get(`https://api.ultramsg.com/${INSTANCE}/groups/leave`, {
        params: {
          token: TOKEN,
          groupId: grupo,
          participant: autor
        }
      });
      console.log("👢 CHUTEI o corno do grupo:", autor);
    } catch (err) {
      console.error("❌ Erro ao chutar:", err.response?.data || err.message);
    }
  } else {
    console.log("✅ Mensagem limpa:", msg);
  }

  res.sendStatus(200);
});

app.listen(3000, "0.0.0.0", () => {
  console.log("BOT ok");
});
