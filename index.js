const express = require('express');
const fetch = require('node-fetch');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } = require('discord.js');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const WL_CHANNEL_ID = process.env.WL_CHANNEL_ID;
const RESULT_CHANNEL_ID = process.env.RESULT_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

// Roles
const ROLE_ACCEPTED = '1453469378178846740';
const ROLE_REJECTED = '1453469439306760276';

// OAuth2 URL
const OAUTH_URL = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds+email+openid`;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages]
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

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

// Usuarios que ya enviaron WL
const usuariosWL = {};

// --- Página de inicio ---
app.get('/', (req,res)=>{
  res.send(`
  <html>
  <head>
    <title>WL La Piña RP</title>
    <link rel="stylesheet" href="/style.css">
  </head>
  <body>
    <div class="card" id="inicio">
      <img src="/logo.png" class="logo">
      <h1>La Piña RP</h1>
      <p>Lee cuidadosamente las instrucciones antes de comenzar tu WL.</p>
      <p>Recuerda: Solo puedes enviar tu WL una vez.</p>
      <a href="${OAUTH_URL}"><button class="btn">Conectar con Discord y Comenzar</button></a>
    </div>
    <script src="/script.js"></script>
  </body>
  </html>
  `);
});

// --- Callback OAuth2 ---
app.get('/callback', async (req,res)=>{
  try{
    const code = req.query.code;
    if(!code) return res.send("❌ No se recibió código OAuth2");

    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type','authorization_code');
    params.append('code', code);
    params.append('redirect_uri','https://wl-discord.onrender.com/callback');

    const tokenRes = await fetch('https://discord.com/api/oauth2/token',{
      method:'POST',
      body: params,
      headers:{ 'Content-Type':'application/x-www-form-urlencoded' }
    });

    const tokenData = await tokenRes.json();
    if(tokenData.error) return res.send(`❌ Error OAuth2: ${tokenData.error_description}`);

    const userRes = await fetch('https://discord.com/api/users/@me',{
      headers:{ Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = await userRes.json();
    const discordId = userData.id;
    const username = userData.username;

    // Verificar si ya envió WL
    if(usuariosWL[discordId]){
      return res.send(`<p>Ya enviaste la WL y fue ${usuariosWL[discordId].estado}</p>`);
    }

    // Redirigir a formulario
    res.send(`
      <html>
      <head>
        <title>WL La Piña RP</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <div class="card" id="formulario" data-discordid="${discordId}">
          <img src="/logo.png" class="logo">
          <h1>WL Formulario - ${username}</h1>
          <div id="timer">Tiempo restante: 15:00</div>
          <div id="form-container">
            <button class="btn" id="startBtn">Comenzar</button>
          </div>
        </div>
        <script src="/script.js"></script>
      </body>
      </html>
    `);

  }catch(err){
    console.error(err);
    res.send("❌ Error interno");
  }
});

// --- Endpoint WL ---
app.post('/wl-form', async (req,res)=>{
  try{
    const { discordId, respuestas } = req.body;
    if(!discordId || !respuestas) return res.status(400).json({ error:'Faltan datos' });

    const wlChannel = await client.channels.fetch(WL_CHANNEL_ID);
    const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(discordId);

    // Guardar estado temporal
    usuariosWL[discordId] = { estado: 'pendiente', respuestas };

    // Mención fuera del embed
    await wlChannel.send(`<@${discordId}> envió su WL:`);

    const embed = new EmbedBuilder()
      .setTitle('📄 Nueva WL enviada')
      .setDescription(respuestas.map((r,i)=>`\n**${i+1}.** ${r}`).join(''))
      .setColor('#FFD700');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId(`accept_${discordId}`).setLabel('✅ Aceptar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`reject_${discordId}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger)
      );

    await wlChannel.send({ embeds:[embed], components:[row] });
    res.json({ status:'ok' });
  }catch(err){
    console.error(err);
    res.status(500).json({ error:'Error interno' });
  }
});

// --- Bot botones ---
client.on(Events.InteractionCreate, async i=>{
  if(!i.isButton()) return;

  const [action, discordId] = i.customId.split('_');
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(discordId).catch(()=>null);
  if(!member) return;

  const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);

  if(action==='accept'){
    await member.roles.add(ROLE_ACCEPTED).catch(()=>null);
    usuariosWL[discordId].estado = 'aceptado';
  } else if(action==='reject'){
    await member.roles.add(ROLE_REJECTED).catch(()=>null);
    usuariosWL[discordId].estado = 'rechazado';
  }

  const embed = new EmbedBuilder()
    .setTitle(action==='accept'?'✅ WL Aceptada':'❌ WL Rechazada')
    .setDescription(`<@${discordId}> fue ${action==='accept'?'aceptado':'rechazado'} a La Piña RP!`)
    .setColor(action==='accept'?'#00FF00':'#FF0000')
    .setImage(
      action==='accept'
      ? 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnh3N3duYXA4OW0wMG1samVyZTUxdzk1ZWF2MGh6dHhrYWJ5MzBsMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/sOzVzt9IWu2ECjLVfF/giphy.gif'
      : 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2VveW9waW94OGFicmcyeGZzZDZ1cG4zb3Y5eXh2OTFyMTE3OGZuNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/bGtF6Y5QRjmvjqamoL/giphy.gif'
    );

  member.send({ embeds:[embed] }).catch(()=>null);
  await resultChannel.send({ embeds:[embed] });
  await i.update({ content: action==='accept'?'✅ WL aceptada':'❌ WL rechazada', components:[], embeds:i.message.embeds });
});

client.on('ready', ()=>console.log(`Bot listo! ${client.user.tag}`));
client.login(TOKEN);

app.listen(PORT, ()=>console.log(`Servidor corriendo en puerto ${PORT}`));
