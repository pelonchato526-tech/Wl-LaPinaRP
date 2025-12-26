require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } = require('discord.js');
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const WL_CHANNEL_ID = process.env.WL_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

const ROLE_ACCEPTED = '1453469378178846740';
const ROLE_REJECTED = '1453469439306760276';

const OAUTH_URL = 'https://discord.com/oauth2/authorize?client_id=1453271207490355284&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds+email+openid';

const enviados = new Set();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

// OAuth2 Callback
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect('/');

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

    res.cookie('discordId', user.id, { maxAge: 600000, httpOnly: true });
    res.sendFile(__dirname + '/public/index.html');
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// Endpoint WL
app.post('/wl-form', async (req, res) => {
  const { discordId, respuestas } = req.body;
  if (enviados.has(discordId)) return res.json({ ok:false, mensaje:"Ya enviaste tu WL" });
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

  // Mensaje fuera del embed
  await ch.send({ content: `<@${discordId}> envió su WL 🎉` });

  await ch.send({ embeds: [embed], components: [row] });

  res.json({ ok:true });
});

// Botones aceptar/rechazar
client.on(Events.InteractionCreate, async i => {
  if (!i.isButton()) return;
  const [act, id] = i.customId.split('_');
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(id);
  const ch = await client.channels.fetch(WL_CHANNEL_ID);

  if (act === 'accept') {
    await member.roles.add(ROLE_ACCEPTED);

    const embed = new EmbedBuilder()
      .setTitle('✅ WL Aceptada')
      .setDescription(`<@${id}> ha sido aceptado en La Piña RP`)
      .setImage('https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnh3N3duYXA4OW0wMG1samVyZTUxdzk1ZWF2MGh6dHhrYWJ5MzBsMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/sOzVzt9IWu2ECjLVfF/giphy.gif')
      .setColor('#00FF00');

    await ch.send({ embeds: [embed] });

    // DM al usuario
    try { await member.send({ content: `🎉 ¡Felicidades! Tu WL ha sido aceptada en La Piña RP`, embeds: [embed] }); }
    catch(err){ console.log('No se pudo enviar DM al usuario', err); }

  } else if (act === 'reject') {
    await member.roles.add(ROLE_REJECTED);

    const embed = new EmbedBuilder()
      .setTitle('❌ WL Rechazada')
      .setDescription(`<@${id}> ha sido rechazada`)
      .setImage('https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2VveW9waW94OGFicmcyeGZzZDZ1cG4zb3Y5eXh2OTFyMTE3OGZuNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/bGtF6Y5QRjmvjqamoL/giphy.gif')
      .setColor('#FF0000');

    await ch.send({ embeds: [embed] });

    try { await member.send({ content: `😢 Lo sentimos, tu WL ha sido rechazada en La Piña RP`, embeds: [embed] }); }
    catch(err){ console.log('No se pudo enviar DM al usuario', err); }
  }

  await i.update({ components: [] });
});

client.login(TOKEN);
app.listen(PORT, () => console.log(`Servidor listo en puerto ${PORT}`));
