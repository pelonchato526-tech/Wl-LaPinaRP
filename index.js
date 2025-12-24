// index.js
const express = require('express');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } = require('discord.js');

// --- Variables de entorno ---
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const WL_CHANNEL_ID = process.env.WL_CHANNEL_ID;
const RESULT_CHANNEL_ID = process.env.RESULT_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

// --- Discord client ---
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

// --- Página principal con OAuth2 ---
app.get('/', (req, res) => {
  const oauthLink = 'https://discord.com/oauth2/authorize?client_id=1453271207490355284&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds';
  res.send(`
    <html>
      <head>
        <title>WL Discord</title>
        <style>
          body { font-family: Arial; text-align: center; margin-top: 50px; background: #000; color: #fff; }
          h1 { color: #FFD700; }
          button { padding: 10px 20px; background: #FFD700; border: none; color: #000; border-radius: 5px; cursor: pointer; font-size: 16px; }
          button:hover { background: #e6c200; }
        </style>
      </head>
      <body>
        <h1>Piña RP - WL Discord</h1>
        <a href="${oauthLink}">
          <button>Conectar con Discord</button>
        </a>
      </body>
    </html>
  `);
});

// --- Callback OAuth2 con formulario WL ---
app.get('/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.send('No se recibió código OAuth2');

    // Mostrar formulario WL
    res.send(`
      <html>
        <head>
          <title>WL Formulario</title>
          <style>
            body { font-family: Arial; text-align: center; margin-top: 30px; background: #000; color: #fff; }
            input, textarea { width: 300px; padding: 8px; margin: 5px; border-radius: 5px; border: none; }
            button { padding: 10px 20px; background: #FFD700; border: none; color: #000; border-radius: 5px; cursor: pointer; font-size: 16px; }
            button:hover { background: #e6c200; }
          </style>
        </head>
        <body>
          <h1>WL Piña RP</h1>
          <form id="wlForm">
            <input type="hidden" id="discordId" value="${code}" />
            <textarea id="respuestas" placeholder="Escribe tus respuestas aquí..." required></textarea><br/>
            <button type="submit">Enviar WL</button>
          </form>
          <p id="status"></p>
          <script>
            const form = document.getElementById('wlForm');
            const status = document.getElementById('status');
            form.addEventListener('submit', async (e) => {
              e.preventDefault();
              const discordId = document.getElementById('discordId').value;
              const respuestas = document.getElementById('respuestas').value;
              const res = await fetch('/wl-form', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({discordId, respuestas})
              });
              const data = await res.json();
              if(data.status==='ok') status.innerText = '✅ WL enviada correctamente!';
              else status.innerText = '❌ Error al enviar la WL';
            });
          </script>
        </body>
      </html>
    `);

    // Notificar que alguien abrió el formulario
    const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);
    await resultChannel.send('📌 Un usuario se autenticó vía OAuth2 y abrió el formulario WL');

  } catch (err) {
    console.error(err);
    res.send('Error interno en el servidor.');
  }
});

// --- Endpoint WL-form ---
app.post('/wl-form', async (req, res) => {
  try {
    const { discordId, respuestas } = req.body;
    if (!discordId || !respuestas) return res.status(400).json({ error: 'Faltan datos' });

    const wlChannel = await client.channels.fetch(WL_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle('📄 Nueva WL enviada')
      .setDescription(respuestas)
      .setFooter({ text: `Usuario: <@${discordId}>` })
      .setColor('#FFD700')
      .setThumbnail('https://i.imgur.com/tuLogo.png'); // <- aquí puedes poner tu logo

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

// --- Interacciones botones Discord ---
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);
  const [action, discordId] = interaction.customId.split('_');

  if(action === 'accept') {
    const embed = new EmbedBuilder()
      .setTitle('✅ WL Aceptada')
      .setDescription(`<@${discordId}> fue aceptado a Piña RP!`)
      .setColor('#00FF00')
      .setImage('https://i.giphy.com/media/26FPy3QZQqGtDcrja/giphy.gif'); // GIF animado

    await resultChannel.send({ embeds: [embed] });
    await interaction.update({ content: '✅ WL aceptada', components: [], embeds: interaction.message.embeds });

  } else if(action === 'reject') {
    const embed = new EmbedBuilder()
      .setTitle('❌ WL Rechazada')
      .setDescription(`<@${discordId}> fue rechazado de Piña RP.`)
      .setColor('#FF0000')
      .setImage('https://i.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif'); // GIF animado

    await resultChannel.send({ embeds: [embed] });
    await interaction.update({ content: '❌ WL rechazada', components: [], embeds: interaction.message.embeds });
  }
});

// --- Bot listo ---
client.on('ready', () => console.log(`Bot listo! ${client.user.tag}`));

client.login(TOKEN);

// --- Server ---
app.listen(PORT, () => console.log(`Servidor web corriendo en puerto ${PORT}`));
