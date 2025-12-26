import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: "lapinarp-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 600000 }
  })
);

// Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.login(process.env.DISCORD_TOKEN);

// WL questions
const QUESTIONS = [
  "1. ¿Qué es el MetaGaming (MG)?",
  "2. Si mueres y reapareces en el hospital (PK), ¿qué debes hacer?",
  "3. ¿Qué es el PowerGaming (PG)?",
  "4. Te están atracando con un arma en la cabeza. ¿Cómo actúas?",
  "5. ¿Qué significa OOC (Out Of Character)?",
  "6. ¿Qué es el VDM (Vehicle Deathmatch)?",
  "7. ¿Cuál es el procedimiento si ves a alguien incumpliendo las normas?",
  "8. ¿Qué es el Combat Logging?",
  "9. ¿Qué es el Bunny Jump?",
  "10. ¿Está permitido hablar de temas de la vida real (fútbol, política, clima real) por el chat de voz del juego?",
  "11. ¿Qué es el RDM (Random Deathmatch)?",
  "12. ¿Qué significa \"Valorar la vida\"?"
];

// Store WL submissions and attempts
const userAttempts = {}; // { userId: { attempts: 0, completed: false } }

// OAuth callback
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("No se recibió código de autorización");

  try {
    const params = new URLSearchParams();
    params.append("client_id", process.env.CLIENT_ID);
    params.append("client_secret", process.env.CLIENT_SECRET);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", `https://wl-discord.onrender.com/callback`);
    params.append("scope", "identify guilds email");

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });

    const tokenData = await tokenRes.json();
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = await userRes.json();

    req.session.user = userData;
    res.redirect("/instructions.html"); // página de instrucciones
  } catch (err) {
    console.error(err);
    res.send("Error en autorización");
  }
});

// Serve instructions page
app.get("/instructions.html", (req, res) => {
  if (!req.session.user) return res.redirect("/");
  res.sendFile(path.join(__dirname, "instructions.html"));
});

// Serve WL form
app.get("/form.html", (req, res) => {
  if (!req.session.user) return res.redirect("/");
  const attempts = userAttempts[req.session.user.id]?.attempts || 0;
  if (attempts >= 3)
    return res.send("Has agotado tus 3 intentos de WL.");
  res.sendFile(path.join(__dirname, "form.html"));
});

// WL submission
app.post("/submit-wl", async (req, res) => {
  if (!req.session.user) return res.status(403).send("No autorizado");

  const userId = req.session.user.id;

  if (!userAttempts[userId]) userAttempts[userId] = { attempts: 0, completed: false };
  const userData = userAttempts[userId];

  if (userData.completed) return res.status(403).send("Ya completaste la WL");

  userData.attempts++;
  const answers = QUESTIONS.map((q, i) => req.body[`q${i + 1}`] || "No respondió");

  // Enviar a WL_CHANNEL_ID
  const wlChannel = await client.channels.fetch(process.env.WL_CHANNEL_ID);
  await wlChannel.send(
    `<@${userId}> envió su WL:\n${answers.join("\n")}`
  );

  // Evaluar aleatoriamente (simulación)
  const accepted = Math.random() < 0.5;
  userData.completed = true;

  // Embed para RESULT_CHANNEL_ID
  const embed = new EmbedBuilder()
    .setTitle("Resultado WL")
    .setDescription(`La WL de <@${userId}> ha sido ${accepted ? "ACEPTADA ✅" : "RECHAZADA ❌"}`)
    .addFields(answers.map((a, i) => ({ name: QUESTIONS[i], value: a })))
    .setColor(accepted ? 0x00ff00 : 0xff0000)
    .setImage(
      accepted
        ? "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGowbHhkaXJyeXcwanFjenNnbTV4ZTZhaGViMjN1cXIyODk2emcwNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/RGxQHSsRUP753rvYHs/giphy.gif"
        : "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGxiZzhnaXU1czFqMWVjNjNxNzVnMnB0N2VpdTdmNndlbHh6d2U1eiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/2iD1cNf6tslgWDLn6n/giphy.gif"
    );

  const resultChannel = await client.channels.fetch(process.env.RESULT_CHANNEL_ID);
  await resultChannel.send({ embeds: [embed] });

  // Asignar rol
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const member = await guild.members.fetch(userId);
    await member.roles.add(accepted ? process.env.ROLE_ACCEPTED : process.env.ROLE_REJECTED);
  } catch (err) {
    console.error("Error asignando rol:", err);
  }

  res.send({ accepted });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
