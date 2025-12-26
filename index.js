require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } = require('discord.js');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const WL_CHANNEL_ID = process.env.WL_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

const ROLE_ACCEPTED = '1453469378178846740';
const ROLE_REJECTED = '1453469439306760276';
const OAUTH_URL = 'https://discord.com/oauth2/authorize?client_id=1453271207490355284&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds+email+openid';

// Guardamos Discord IDs de usuarios que ya enviaron WL
const enviados = new Set();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages]
});

// OAuth2 Callback
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect('/'); // si no hay código, volver al inicio

  try {
    const params = new URLSearchParams();
    params.append('client_id', '1453271207490355284');
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', 'https://wl-discord.onrender.com/callback');
    params.append('scope', 'identify guilds email openid');

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    const token = await tokenRes.json();
    if (token.error) return res.redirect('/');

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });
    const user = await userRes.json();

    // Guardamos ID del usuario en sesión simulada
    res.cookie('discordId', user.id, { maxAge: 600000, httpOnly: true });

    // Enviar index.html
    res.sendFile(__dirname + '/public/index.html');
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// Endpoint WL
app.post('/wl-form', async (req, res) => {
  const { discordId, respuestas } = req.body;

  if (enviados.has(discordId)) {
    return res.json({ ok:false, mensaje:"Ya enviaste tu WL" });
  }

  enviados.add(discordId);

  const ch = await client.channels.fetch(WL_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle('📄 Nueva Whitelist')
    .setDescription(respuestas.map((r,i)=>`**${i+1}.** ${r}`).join('\n\n'))
    .setColor('#FFD700');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`accept_${discordId}`).setLabel('Aceptar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`reject_${discordId}`).setLabel('Rechazar').setStyle(ButtonStyle.Danger)
  );

  await ch.send({ content: `<@${discordId}> envió su WL`, embeds:[embed], components:[row] });
  res.json({ ok:true });
});

// Botones aceptar/rechazar
client.on(Events.InteractionCreate, async i => {
  if (!i.isButton()) return;
  const [act, id] = i.customId.split('_');
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(id);

  if (act === 'accept') await member.roles.add(ROLE_ACCEPTED);
  if (act === 'reject') await member.roles.add(ROLE_REJECTED);

  await i.update({ components:[] });
});

client.login(TOKEN);
app.listen(PORT, () => console.log(`Servidor listo en puerto ${PORT}`));
