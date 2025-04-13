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

  const excecoes = [
    "5562983231110@c.us", // <- TEU NÚMERO
    "5564992660522@c.us", // <- OUTRO ADM, SE TIVER
    "5562996604044@c.us",
  ];

  if (excecoes.includes(autor)) {
    console.log("👑 É um dos brabos, não expulsa:", autor);
    return res.sendStatus(200); // ignora a mensagem
  }


  const regex = /(http|www\.|\.com|\.net|\.org|bit\.ly|wa\.me|t\.me)/i;

  if (regex.test(msg)) {
    console.log("🛑 Link detectado:", msg);
  
    // Apagar a mensagem original
    try {
      await axios.get(`https://api.ultramsg.com/${INSTANCE}/messages/delete`, {
        params: {
          token: TOKEN,
          id: data.id // ID da mensagem recebida
        }
      });
      console.log("🧹 Mensagem deletada:", data.id);
    } catch (err) {
      console.error("❌ Erro ao deletar:", err.response?.data || err.message);
    }
  
    // AVISO IMEDIATO
try {
  const avisoInstantaneo = qs.stringify({
    token: TOKEN,
    to: data.from,
    body: `👀 Opa... _detectei um link aqui._\n🚫 Links são proibidos. Quer divulgar algo? Nos chame no particular antes :)\n\n❗ Apaga por favor, foi uma advertência pois links relevantes serão autorizados sim. Fale com um @admin.`
  });

  const options1 = {
    method: "POST",
    hostname: "api.ultramsg.com",
    path: `/${INSTANCE}/messages/chat`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": avisoInstantaneo.length
    }
  };

  const req1 = http.request(options1, res => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => console.log("📤 Aviso imediato enviado:", data));
  });

  req1.write(avisoInstantaneo);
  req1.end();
} catch (err) {
  console.error("❌ Erro ao enviar aviso imediato:", err.message);
}

// AGENDAR AVISO CORPORATIVO APÓS 1 MINUTO
setTimeout(() => {
  try {
    const avisoCorporativo = qs.stringify({
      token: TOKEN,
      to: data.from,
      body: `📢 Aviso automático:\n\n🔗 Links não são permitidos sem consulta prévia.\n👥 Respeite os membros e as diretrizes do grupo.\n🚨 Reincidência pode resultar em expulsão.\n\nObrigado por colaborar com a organização deste espaço.`
    });

    const options2 = {
      method: "POST",
      hostname: "api.ultramsg.com",
      path: `/${INSTANCE}/messages/chat`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": avisoCorporativo.length
      }
    };

    const req2 = http.request(options2, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => console.log("📤 Aviso corporativo enviado:", data));
    });

    req2.write(avisoCorporativo);
    req2.end();
  } catch (err) {
    console.error("❌ Erro ao enviar aviso corporativo:", err.message);
  }
}, 60000); // 60 segundos
  
  
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
  console.log("✅ Mensagem limpa:", msg);

  res.sendStatus(200);
  }
});

app.listen(3000, "0.0.0.0", () => {
  console.log("BOT ok");
});
