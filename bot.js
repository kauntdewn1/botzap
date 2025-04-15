const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const qs = require("querystring");
const http = require("https");
const rateLimit = require("express-rate-limit");
const yaml = require("yaml");
const fs = require("fs");
const Database = require("./db");
const winston = require('winston');
require("dotenv").config();

// Carrega configurações
const config = yaml.parse(fs.readFileSync("./config.yaml", "utf8"));

// Configura logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: config.logging.file,
      maxsize: config.logging.max_size,
      maxFiles: config.logging.max_files
    }),
    new winston.transports.Console()
  ]
});

// Inicializa banco de dados
const db = new Database(config.database.path, config);

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.TOKEN;
const INSTANCE = process.env.INSTANCE;
const PORT = process.env.PORT || 3000;

// Configura rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de 100 requisições por janela
}));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).send('Something broke!');
});

// Função para enviar mensagem
async function sendMessage(to, body) {
  const message = qs.stringify({
    token: TOKEN,
    to,
    body
  });

  const options = {
    method: "POST",
    hostname: "api.ultramsg.com",
    path: `/${INSTANCE}/messages/chat?token=${TOKEN}`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": message.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        logger.info(`Message sent to ${to}:`, data);
        resolve(data);
      });
    });

    req.on("error", error => {
      logger.error("Error sending message:", error);
      reject(error);
    });

    req.write(message);
    req.end();
  });
}

// Função para processar comandos
async function processCommand(command, args, author, group) {
  if (!config.commands.list.some(cmd => cmd.name === command)) {
    return "Comando não reconhecido. Use /help para ver a lista de comandos.";
  }

  const cmdConfig = config.commands.list.find(cmd => cmd.name === command);
  
  if (cmdConfig.admin_only && !config.admins.includes(author)) {
    return "Você não tem permissão para usar este comando.";
  }

  switch (command) {
    case "strikes":
      if (!args[0]) return "Uso: /strikes @usuario";
      const userId = args[0].replace("@", "") + "@c.us";
      const strikes = await db.getStrikes(userId);
      return `Strikes de ${args[0]}: ${strikes}`;

    case "reset":
      if (!args[0]) return "Uso: /reset @usuario";
      const resetUserId = args[0].replace("@", "") + "@c.us";
      await db.resetStrikes(resetUserId);
      await db.logModeration("reset", resetUserId, author, "Strikes resetados");
      return `Strikes de ${args[0]} resetados com sucesso.`;

    case "ban":
      if (!args[0]) return "Uso: /ban @usuario [motivo]";
      const banUserId = args[0].replace("@", "") + "@c.us";
      const reason = args.slice(1).join(" ") || "Violação das regras do grupo";
      await db.banUser(banUserId, reason, author);
      
      // Envia mensagem de banimento
      const banMessage = config.moderation.ban_message
        .replace("{user}", args[0])
        .replace("{reason}", reason);
      
      await sendMessage(group, banMessage);
      return `Usuário ${args[0]} banido com sucesso.`;

    case "warn":
      if (!args[0]) return "Uso: /warn @usuario [motivo]";
      const warnUserId = args[0].replace("@", "") + "@c.us";
      const warnReason = args.slice(1).join(" ") || "Aviso geral";
      await db.addStrike(warnUserId);
      await db.logModeration("warn", warnUserId, author, warnReason);
      
      const strikesCount = await db.getStrikes(warnUserId);
      const warnMessage = config.moderation.warning_messages.private
        .replace("{user}", args[0])
        .replace("{group_name}", config.groups[group] || "este grupo")
        .replace("{strikes}", strikesCount);
      
      await sendMessage(warnUserId, warnMessage);
      return `Aviso enviado para ${args[0]}.`;

    case "help":
      logger.info("Comando help solicitado por:", author);
      let helpMessage = "🤖 *Comandos Disponíveis*\n\n";
      config.commands.list.forEach(cmd => {
        if (!cmd.admin_only || config.admins.includes(author)) {
          helpMessage += `*${cmd.usage}*\n${cmd.description}\n\n`;
        }
      });
      await sendMessage(group, helpMessage);
      break;

    default:
      return "Comando não implementado.";
  }
}

// Rota de verificação de status
app.get("/", (req, res) => {
  res.status(200).send("BOT RODANDO NA PISTA, CHEIO DE ÓDIO!");
});

app.post("/webhook", async (req, res) => {
  try {
    logger.info("Webhook recebido:", JSON.stringify(req.body));
    
    const { from, body, type, sender } = req.body;

    logger.info("Mensagem recebida:", req.body);

    const data = req.body?.data;
    if (!data) return res.sendStatus(200);

    // Verifica se o usuário está banido
    if (await db.isBanned(data.author)) {
      logger.info(`Mensagem de usuário banido ignorada: ${data.author}`);
      return res.sendStatus(200);
    }

    // Processa comandos
    if (data.body.startsWith(config.commands.prefix)) {
      const [command, ...args] = data.body.slice(1).split(" ");
      const response = await processCommand(command, args, data.author, data.from);
      await sendMessage(data.from, response);
      return res.sendStatus(200);
    }

    // Boas-vindas quando evento for de entrada
    if (req.body.event_type === "message_create" && data.type === "chat" && data.fromMe === false && data.body === "") {
      const novoMembro = data.author;
      const grupo = data.from;

      const boasVindas = config.bot.welcome_message
        .replace("{user}", novoMembro.replace("@c.us", ""))
        .replace("{bot_name}", config.bot.name);

      await sendMessage(grupo, boasVindas);
      return res.sendStatus(200);
    }

    if (!data.body) return res.sendStatus(200);

    const msg = data.body.toLowerCase();
    const grupo = data.to;
    const autor = data.from;

    if (config.admins.includes(autor)) {
      logger.info("Mensagem de admin ignorada:", autor);
      return res.sendStatus(200);
    }

    const regex = new RegExp(config.moderation.link_regex, "i");

    if (regex.test(msg)) {
      logger.info("Link detectado:", { autor, msg });
      
      // Atualiza contador no banco de dados
      await db.addStrike(data.author);
      const strikes = await db.getStrikes(data.author);

      logger.info(`Strike ${strikes} registrado para ${data.author}`);

      // Apagar a mensagem original
      try {
        await axios.get(`https://api.ultramsg.com/${INSTANCE}/messages/delete`, {
          params: {
            token: TOKEN,
            id: data.id
          }
        });
        logger.info("Mensagem deletada:", data.id);
      } catch (err) {
        logger.error("Erro ao deletar:", err);
      }

      // Verifica se deve banir
      if (strikes >= config.moderation.max_strikes) {
        await db.banUser(data.author, "Excesso de links", "system");
        const banMessage = config.moderation.ban_message
          .replace("{user}", data.author.replace("@c.us", ""))
          .replace("{reason}", "Excesso de links");
        await sendMessage(grupo, banMessage);
        return res.sendStatus(200);
      }

      // AVISO IMEDIATO
      try {
        const numero = data.author.replace("@c.us", "");
        const grupoNome = config.groups[data.from] || "um dos grupos da comunidade";
        
        const avisoInstantaneo = config.moderation.warning_messages.immediate
          .replace("{user}", numero)
          .replace("{strikes}", strikes);

        await sendMessage(data.author, avisoInstantaneo);

        // AVISO PRIVADO
        const msgPrivada = config.moderation.warning_messages.private
          .replace("{user}", numero)
          .replace("{group_name}", grupoNome)
          .replace("{strikes}", strikes);

        await sendMessage(data.author, msgPrivada);

        // AGENDAR AVISO CORPORATIVO APÓS 1 MINUTO
        setTimeout(async () => {
          try {
            await sendMessage(data.from, config.moderation.warning_messages.corporate);
          } catch (err) {
            logger.error("Erro ao enviar aviso corporativo:", err);
          }
        }, 60000);
      } catch (err) {
        logger.error("Erro ao enviar avisos:", err);
      }
    }

    logger.info("Mensagem processada:", msg);
    res.sendStatus(200);
  } catch (error) {
    logger.error("Erro no webhook:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down...');
  db.close();
  process.exit(0);
});

app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Bot rodando na porta ${PORT}`);
});
