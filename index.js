const express = require("express");
const fetch = require("node-fetch");
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } = require("discord.js");
require("dotenv").config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const WL_CHANNEL_ID = process.env.WL_CHANNEL_ID;
const RESULT_CHANNEL_ID = process.env.RESULT_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

// Roles
const ROLE_ACCEPTED = process.env.ROLE_ACCEPTED;
const ROLE_REJECTED = process.env.ROLE_REJECTED;

// GIFs
const GIF_ACCEPT = "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnh3N3duYXA4OW0wMG1samVyZTUxdzk1ZWF2MGh6dHhrYWJ5MzBsMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/sOzVzt9IWu2ECjLVfF/giphy.gif";
const GIF_REJECT = "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2VveW9waW94OGFicmcyeGZzZDZ1cG4zb3Y5eXh2OTFyMTE3OGZuNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/bGtF6Y5QRjmvjqamoL/giphy.gif";

// Preguntas WL
const preguntas = [
  "¿Qué es el MetaGaming (MG)?",
  "Si mueres y reapareces en el hospital (PK), ¿qué debes hacer?",
  "¿Qué es el PowerGaming (PG)?",
  "Te están atracando con un arma en la cabeza. ¿Cómo actúas?",
  "¿Qué significa OOC (Out Of Character)?",
  "¿Qué es el VDM (Vehicle Deathmatch)?",
  "¿Cuál es el procedimiento si ves a alguien incumpliendo las normas?",
  "¿Qué es el Combat Logging?",
  "¿Qué es el Bunny Jump?",
  "¿Está permitido hablar de temas de la vida real por el chat de voz?",
  "¿Qué es el RDM (Random Deathmatch)?",
  "¿Qué significa valorar la vida?"
];

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Anti-doble WL en memoria (puede migrarse a DB)
const wlUsers = {}; // { discordId: {status:"Aceptado"/"Rechazado"} }

// --- Página inicio ---
app.get("/", (req, res) => {
  const oauthLink = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com/callback&scope=identify+guilds+email+openid`;
  res.send(`
    <html>
      <head>
        <title>WL Piña RP</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <div class="card">
          <img src="/logo.png" class="logo">
          <h1>La Piña RP</h1>
          <div class="subtitle">Sistema Oficial de Whitelist</div>
          <div class="instructions">
            • Lee cuidadosamente cada pregunta.<br>
            • Tienes <b>15 minutos</b> para completar la WL.<br>
            • No podrás editar respuestas.<br>
            • Solo puedes enviar la WL <b>una vez</b>.
          </div>
          <a href="${oauthLink}"><button class="btn">Conectar con Discord y Comenzar</button></a>
          <div class="footer">© 2025 La Piña RP</div>
        </div>
      </body>
    </html>
  `);
});

// --- Callback OAuth2 ---
app.get("https://discord.com/oauth2/authorize?client_id=1453271207490355284&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds+email+openid", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.send("❌ No se recibió código OAuth2");

    const params = new URLSearchParams();
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "https://wl-discord.onrender.com/callback");

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: params,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) return res.send(`❌ Error OAuth2: ${tokenData.error_description}`);

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = await userRes.json();
    const discordId = userData.id;
    const username = userData.username;

    // --- Formulario interactivo ---
    if (wlUsers[discordId]) {
      // Mostrar resultado si ya envió
      const estado = wlUsers[discordId].status;
      const gif = estado === "Aceptado" ? GIF_ACCEPT : GIF_REJECT;
      return res.send(`
        <html>
          <head>
            <title>WL Piña RP</title>
            <link rel="stylesheet" href="/style.css">
          </head>
          <body>
            <div class="card">
              <img src="/logo.png" class="logo">
              <h1>WL ya completada</h1>
              <p>Estado: <b>${estado}</b></p>
              <img src="${gif}" style="width:200px;margin-top:15px;">
              <div class="footer">© 2025 La Piña RP</div>
            </div>
          </body>
        </html>
      `);
    }

    // Mostrar formulario
    res.send(`
      <html>
        <head>
          <title>WL Piña RP</title>
          <link rel="stylesheet" href="/style.css">
          <script>const preguntas = ${JSON.stringify(preguntas)}; const discordId="${discordId}"; const username="${username}";</script>
          <script src="/script.js" defer></script>
        </head>
        <body>
          <div id="app"></div>
        </body>
      </html>
    `);

  } catch (err) {
    console.error(err);
    res.send("❌ Error interno");
  }
});

// --- WL POST ---
app.post("/wl-form", async (req, res) => {
  try {
    const { discordId, respuestas } = req.body;
    if (!discordId || !respuestas) return res.status(400).json({ error: "Faltan datos" });

    if (wlUsers[discordId]) return res.json({ status: "already", result: wlUsers[discordId].status, gif: wlUsers[discordId].status === "Aceptado" ? GIF_ACCEPT : GIF_REJECT });

    // Mandar al canal WL
    const wlChannel = await client.channels.fetch(WL_CHANNEL_ID);
    await wlChannel.send(`<@${discordId}> envió su WL:`);

    const embed = new EmbedBuilder()
      .setTitle("📄 Nueva WL enviada")
      .setDescription(respuestas.map((r,i)=>`**${i+1}.** ${r}`).join("\n\n"))
      .setColor("#FFD700");

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId(`accept_${discordId}`).setLabel("✅ Aceptar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`reject_${discordId}`).setLabel("❌ Rechazar").setStyle(ButtonStyle.Danger)
      );

    await wlChannel.send({ embeds: [embed], components: [row] });

    res.json({ status: "ok" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

// --- Bot botones ---
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const [action, discordId] = interaction.customId.split("_");
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(discordId).catch(()=>null);
  if (!member) return;

  const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);

  let estado = "";
  if (action === "accept") {
    await member.roles.add(ROLE_ACCEPTED).catch(()=>null);
    estado = "Aceptado";
  } else {
    await member.roles.add(ROLE_REJECTED).catch(()=>null);
    estado = "Rechazado";
  }

  // Guardar estado
  wlUsers[discordId] = { status: estado };

  const embed = new EmbedBuilder()
    .setTitle(estado === "Aceptado" ? "✅ WL Aceptada" : "❌ WL Rechazada")
    .setDescription(`<@${discordId}> fue ${estado.toLowerCase()} a La Piña RP`)
    .setColor(estado === "Aceptado" ? "#00FF00" : "#FF0000")
    .setImage(estado === "Aceptado" ? GIF_ACCEPT : GIF_REJECT);

  // Mandar DM
  member.send({ embeds: [embed] }).catch(()=>null);

  // Mandar a canal de resultados
  await resultChannel.send({ embeds: [embed] });

  // Actualizar mensaje original
  await interaction.update({ content: estado === "Aceptado" ? "✅ WL aceptada" : "❌ WL rechazada", components: [], embeds: interaction.message.embeds });
});

// --- Bot listo ---
client.on("ready", ()=>console.log(`Bot listo! ${client.user.tag}`));
client.login(TOKEN);

// --- Servidor ---
app.listen(PORT, ()=>console.log(`Servidor corriendo en puerto ${PORT}`));
