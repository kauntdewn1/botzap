const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const qs = require("querystring");
const http = require("https");
const reincidentes = {};
const nomesDosGrupos = {
  "HacDHmPKghjJfiWUo2vw9u@g.us": "News do MKT",
  "COf6qGHjn27Ca9XyN3Mfh9@g.us": "Digital Flow Network"
};
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.TOKEN;
const INSTANCE = process.env.INSTANCE;

app.get("/", (req, res) => {
  res.status(200).send("Bot tá vivo e rodando, caralho!");
});
app.post("/webhook", async (req, res) => {
  const data = req.body?.data;

  if (!data) return res.sendStatus(200);

  // Boas-vindas quando evento for de entrada
  if (req.body.event_type === "message_create" && data.type === "chat" && data.fromMe === false && data.body === "") {
    const novoMembro = data.author;
    const grupo = data.from;

    const boasVindas = qs.stringify({
      token: TOKEN,
      to: grupo,
      body: `👋 Olá @${novoMembro.replace("@c.us", "")}! 👋 E aí, bem-vindx à FlowHUB!\n\nEu sou a Ariel, seu suporte aqui no grupo — e tô aqui pra te ajudar a tirar o máximo desse ecossistema digital 🌐\n\n👉 Conheça nosso portal: www.flowhub.space\n📥 Baixe os templates gratuitos e comece hoje mesmo\n\nGrupos da Comunidade FLOWHUB:\n🧠 *Flow Growth* → Crescimento, ferramentas e estratégias\n💬 *Digital Flow Network* → Networking, colaborações e negócios\n\nSe apresenta aí e conta o que você faz!\nTamo junto pra crescer. 🙌`
    });

    const options = {
      method: "POST",
      hostname: "api.ultramsg.com",
      path: `/${INSTANCE}/messages/chat`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": boasVindas.length
      }
    };

    const reqWelcome = http.request(options, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => console.log("🙌 Boas-vindas enviadas:", data));
    });

    reqWelcome.write(boasVindas);
    reqWelcome.end();

    return res.sendStatus(200);
  }

  // Resto do bot...
});
  
app.post("/webhook", async (req, res) => {
  console.log("📩 Mensagem recebida:", JSON.stringify(req.body, null, 2));

  const data = req.body?.data;
  if (!data || !data.body) return res.sendStatus(200);

  const msg = data.body.toLowerCase();
  const grupo = data.to;
  const autor = data.from;
  console.log("🚨 INFRAÇÃO DE REGRA DETECTADA");
  console.log("👤 Autor:", data.author);
  console.log("📎 Link:", msg);


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
    // Atualiza contador
    reincidentes[data.author] = (reincidentes[data.author] || 0) + 1;
    const strikes = reincidentes[data.author];

    console.log(`⚠️ Strike ${strikes} registrado para ${data.author}`);

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
    to: data.author,
    body: `@${nomeDoCorno} 👀 Opa... detectei um link aqui.\nStrike: ${strikes}\n...\n\nApaga por favor. Quando chegar em 3, o grupo decide tua vida.`
  });
// STRIKES
reincidentes[data.author] = (reincidentes[data.author] || 0) + 1;
const strikes = reincidentes[data.author];

// INFO
const grupoNome = nomesDosGrupos[data.from] || "um dos grupos da comunidade";
const numero = data.author.replace("@c.us", "");

// AVISO PRIVADO
try {
  const msgPrivada = qs.stringify({
    token: TOKEN,
    to: data.author,
    body: `👀 Opa ${numero}...\nDetectei um link seu no grupo *${grupoNome}*.\n\nStrike: ${strikes}\n🚫 Links são proibidos sem autorização.\n\nPor favor, apaga.\nCom 3 strikes a moderação toma providências.`
  });

  const options = {
    method: "POST",
    hostname: "api.ultramsg.com",
    path: `/${INSTANCE}/messages/chat`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": msgPrivada.length
    }
  };

  const req = http.request(options, res => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => console.log("📤 Aviso PRIVADO enviado:", data));
  });

  req.write(msgPrivada);
  req.end();
} catch (err) {
  console.error("❌ Erro ao mandar no privado:", err.message);
}

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
  
  console.log("✅ Mensagem limpa:", msg);

  res.sendStatus(200);
  }
});

app.listen(3000, "0.0.0.0", () => {
  console.log("BOT ok");
});
