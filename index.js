const express = require("express");
const path = require("path");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events
} = require("discord.js");

const app = express();

/* ===== ENV ===== */
const {
  CLIENT_ID,
  CLIENT_SECRET,
  DISCORD_TOKEN,
  GUILD_ID,
  WL_CHANNEL_ID,
  RESULT_CHANNEL_ID,
  ROLE_ACCEPTED,
  ROLE_REJECTED,
  PORT = 3000
} = process.env;

/* ===== MEMORIA ===== */
const wlState = new Map(); 
// discordId => { status: "none|sent|accepted|rejected", attempts: number }

/* ===== DISCORD ===== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

client.login(DISCORD_TOKEN);
client.once("ready", () => {
  console.log("🤖 Bot listo:", client.user.tag);
});

/* ===== EXPRESS ===== */
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

/* ===== OAUTH CALLBACK ===== */
app.get("/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send("No code");

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: "https://wl-discord.onrender.com/callback"
    });

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });
    const token = await tokenRes.json();

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });
    const user = await userRes.json();

    if (!wlState.has(user.id)) {
      wlState.set(user.id, { status: "none", attempts: 0 });
    }

    res.redirect(`/form.html?uid=${user.id}&name=${user.username}`);
  } catch (e) {
    console.error(e);
    res.status(500).send("Error interno");
  }
});

/* ===== ENVIAR WL ===== */
app.post("/submit", async (req, res) => {
  const { discordId, answers } = req.body;
  const state = wlState.get(discordId);

  if (!state) return res.json({ error: "No autorizado" });
  if (state.status === "sent") return res.json({ error: "Ya enviaste WL" });
  if (state.attempts >= 3) return res.json({ error: "Sin intentos" });

  state.status = "sent";
  state.attempts++;

  const channel = await client.channels.fetch(WL_CHANNEL_ID);

  await channel.send(`<@${discordId}> envió su WL:`);

  const embed = new EmbedBuilder()
    .setTitle("📄 Nueva WL")
    .setColor("#FFD700")
    .setDescription(
      answers.map((a, i) => `**${i + 1}.** ${a}`).join("\n")
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`accept_${discordId}`)
      .setLabel("Aceptar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`reject_${discordId}`)
      .setLabel("Rechazar")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({ embeds: [embed], components: [row] });
  res.json({ ok: true });
});

/* ===== BOTONES ===== */
client.on(Events.InteractionCreate, async (i) => {
  if (!i.isButton()) return;
  const [action, id] = i.customId.split("_");

  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(id).catch(() => null);
  if (!member) return;

  const state = wlState.get(id);
  if (!state) return;

  const resultEmbed = new EmbedBuilder()
    .setColor(action === "accept" ? "#00ff00" : "#ff0000")
    .setTitle(action === "accept" ? "✅ WL Aceptada" : "❌ WL Rechazada")
    .setImage(
      action === "accept"
        ? "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGowbHhkaXJyeXcwanFjenNnbTV4ZTZhaGViMjN1cXIyODk2emcwNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/RGxQHSsRUP753rvYHs/giphy.gif"
        : "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGxiZzhnaXU1czFqMWVjNjNxNzVnMnB0N2VpdTdmNndlbHh6d2U1eiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/2iD1cNf6tslgWDLn6n/giphy.gif"
    );

  if (action === "accept") {
    state.status = "accepted";
    await member.roles.add(ROLE_ACCEPTED);
  } else {
    state.status = "rejected";
    await member.roles.add(ROLE_REJECTED);
  }

  const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);
  await resultChannel.send({
    content: `<@${id}>`,
    embeds: [resultEmbed]
  });

  await member.send({ embeds: [resultEmbed] }).catch(() => {});

  await i.update({ components: [] });
});

app.listen(PORT, () => console.log("🌐 Web en puerto", PORT));
