// index.js
const express = require('express');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } = require('discord.js');

// --- Variables de entorno desde Render ---
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const WL_CHANNEL_ID = process.env.WL_CHANNEL_ID;
const RESULT_CHANNEL_ID = process.env.RESULT_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

// --- Discord client (sin MessageContent) ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

// --- Express ---
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Página principal con OAuth2
app.get('/', (req, res) => {
  const oauthLink = 'https://discord.com/oauth2/authorize?client_id=1453271207490355284&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds';
  res.send(`
    <html>
      <head>
        <title>WL Discord</title>
        <style>
          body { font-family: Arial; text-align: center; margin-top: 50px; background: #2f3136; color: #fff; }
          h1 { color: #7289da; }
          button { padding: 10px 20px; background: #7289da; border: none; color: #fff; border-radius: 5px; cursor: pointer; font-size: 16px; }
          button:hover { background: #5b6eae; }
        </style>
      </head>
      <body>
        <h1>Bienvenido a la WL de Discord</h1>
        <a href="${oauthLink}">
          <button>Conectar con Discord</button>
        </a>
      </body>
    </html>
  `);
});

// Callback OAuth2
app.get('/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.send('No se recibió código OAuth2');
    res.send('<h2>Autenticación completada! Ahora puedes enviar tu WL.</h2>');
    const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);
    await resultChannel.send('📌 Un usuario se autenticó vía OAuth2');
  } catch (err) {
    console.error(err);
    res.send('Error interno en el servidor.');
  }
});

// Endpoint WL-form
app.post('/wl-form', async (req, res) => {
  try {
    const { discordId, respuestas } = req.body;
    if (!discordId || !respuestas) return res.status(400).json({ error: 'Faltan datos' });

    const wlChannel = await client.channels.fetch(WL_CHANNEL_ID);
    const embed = new EmbedBuilder()
      .setTitle('📄 Nueva WL enviada')
      .setDescription(respuestas)
      .setFooter({ text: `Usuario: ${discordId}` })
      .setColor('#7289da');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`accept_${discordId}`)
          .setLabel('✅ Aceptar')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`reject_${discordId}`)
          .setLabel('❌ Rechazar')
          .setStyle(ButtonStyle.Danger)
      );

    await wlChannel.send({ embeds: [embed], components: [row] });
    res.json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Bot escucha interacción de botones
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);
  const [action, discordId] = interaction.customId.split('_');

  if (action === 'accept') {
    await resultChannel.send(`<@${discordId}> fue ✅ Aceptado`);
    await interaction.update({ content: '✅ WL aceptada', components: [], embeds: interaction.message.embeds });
  } else if (action === 'reject') {
    await resultChannel.send(`<@${discordId}> fue ❌ Rechazado`);
    await interaction.update({ content: '❌ WL rechazada', components: [], embeds: interaction.message.embeds });
  }
});

// Bot listo
client.on('ready', () => {
  console.log(`Bot listo! ${client.user.tag}`);
});

client.login(TOKEN);

// Iniciar server
app.listen(PORT, () => console.log(`Servidor web corriendo en puerto ${PORT}`));
