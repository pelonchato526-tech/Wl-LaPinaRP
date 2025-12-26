import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import { Client, GatewayIntentBits, EmbedBuilder, TextChannel } from "discord.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const PORT = process.env.PORT || 3000;
const WL_CHANNEL_ID = process.env.WL_CHANNEL_ID;
const RESULT_CHANNEL_ID = process.env.RESULT_CHANNEL_ID;
const ROLE_ACCEPTED = process.env.ROLE_ACCEPTED;
const ROLE_REJECTED = process.env.ROLE_REJECTED;
const GUILD_ID = process.env.GUILD_ID;

const userAttempts = {}; // track attempts

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "instructions.html")));
app.get("/form.html", (req, res) => res.sendFile(path.join(__dirname, "public", "form.html")));

app.post("/submit-wl", async (req, res) => {
  const userId = req.body.userId;
  if (!userId) return res.status(400).json({ error: "UserId missing" });

  userAttempts[userId] = userAttempts[userId] || 0;
  if (userAttempts[userId] >= 3) return res.json({ accepted: false, message: "Máximo de intentos alcanzado" });

  userAttempts[userId]++;

  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(userId).catch(()=>null);
  if (!member) return res.status(400).json({ error: "No autorizado" });

  // Validación simple WL
  const answers = Object.values(req.body);
  const accepted = answers.every(a => a && a.trim() !== "") && Math.random() > 0.3; // ejemplo

  const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle(accepted ? "WL ACEPTADA" : "WL RECHAZADA")
    .setColor(accepted ? 0x00ff00 : 0xff0000)
    .addFields(
      { name: "Usuario", value: `<@${userId}>` },
      ...Object.entries(req.body).map(([k,v]) => ({ name: k, value: v.slice(0, 100) }))
    )
    .setImage(accepted
      ? "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGowbHhkaXJyeXcwanFjenNnbTV4ZTZhaGViMjN1cXIyODk2emcwNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/RGxQHSsRUP753rvYHs/giphy.gif"
      : "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGxiZzhnaXU1czFqMWVjNjNxNzVnMnB0N2VpdTdmNndlbHh6d2U1eiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/2iD1cNf6tslgWDLn6n/giphy.gif"
    );

  if(resultChannel?.isTextBased()) await resultChannel.send({ embeds: [embed] });

  // Roles
  if (accepted) {
    await member.roles.add(ROLE_ACCEPTED).catch(console.error);
  } else {
    await member.roles.add(ROLE_REJECTED).catch(console.error);
    if(userAttempts[userId] < 3) {
      await member.send("Tienes otra oportunidad para enviar la WL.").catch(()=>console.log("No se pudo enviar DM"));
    }
  }

  // Guardar WL en canal de WL
  const wlChannel = await client.channels.fetch(WL_CHANNEL_ID);
  if(wlChannel?.isTextBased()) {
    await wlChannel.send(`WL de <@${userId}> enviada:\n${JSON.stringify(req.body,null,2)}`);
  }

  res.json({ accepted });
});

client.once("ready", () => {
  console.log(`Discord listo! Usuario: ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
