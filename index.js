import express from 'express';
import fetch from 'node-fetch';
import cookieParser from 'cookie-parser';
import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const WL_CHANNEL_ID = process.env.WL_CHANNEL_ID;
const RESULT_CHANNEL_ID = process.env.RESULT_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

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
  "¿Está permitido hablar de temas de la vida real por el chat de voz del juego?",
  "¿Qué es el RDM (Random Deathmatch)?",
  "¿Qué significa 'Valorar la vida'?"
];

const usuariosWL = {}; // { discordId: { responded: true, attempts: 0 } }

// --- Inicio ---
app.get('/', (req,res)=>{
  const oauthLink = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds+email+openid`;
  res.send(`
  <html>
  <head>
    <title>WL Piña RP</title>
    <style>
      body { background:#0d0d0d; color:#fff; font-family:Arial; text-align:center; margin:0; display:flex; justify-content:center; align-items:center; height:100vh; }
      .card { background:#111; border:4px solid; border-image: linear-gradient(45deg,#FFD700,#FFAA00) 1; border-radius:15px; padding:40px; max-width:600px; text-align:center; }
      h1 { color:#FFD700; font-size:48px; margin-bottom:20px; }
      p { font-size:20px; margin:10px 0; color:#fff; }
      button { padding:15px 30px; background:#FFD700; color:#000; border:none; border-radius:10px; cursor:pointer; font-size:22px; margin-top:20px; }
      button:hover { background:#e6c200; }
      #logo { width:200px; display:block; margin:0 auto 20px auto; }
    </style>
  </head>
  <body>
    <div class="card">
      <img id="logo" src="/logo.png"/>
      <h1>Piña RP - WL Discord</h1>
      <p>Lee las instrucciones cuidadosamente antes de comenzar tu WL.</p>
      <p>Tendrás máximo 3 intentos. Cambiar de pestaña o refrescar cancela el intento.</p>
      <a href="${oauthLink}"><button>Conectar con Discord y Comenzar</button></a>
    </div>
  </body>
  </html>
  `);
});

// --- Callback ---
app.get('/callback', async (req,res)=>{
  try {
    const code = req.query.code;
    if(!code) return res.send("No se recibió código OAuth2");

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
    if(tokenData.error) return res.send(`Error OAuth2: ${tokenData.error_description}`);

    const userRes = await fetch('https://discord.com/api/users/@me',{
      headers:{ Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = await userRes.json();
    const discordId = userData.id;

    res.cookie('discordId', discordId, { maxAge: 15*60*1000 });
    res.redirect(`/form`);
  } catch(err){ console.error(err); res.send("❌ Error interno"); }
});

// --- Formulario ---
app.get('/form', (req,res)=>{
  const discordId = req.cookies.discordId;
  if(!discordId) return res.redirect('/');
  if(usuariosWL[discordId]?.responded) return res.send('<p>Ya enviaste tu WL y no puedes volver a responder.</p>');

  res.sendFile('form.html', { root: 'public' });
});

// --- Envío WL ---
app.post('/wl-form', async (req,res)=>{
  try {
    const { discordId,respuestas } = req.body;
    if(!discordId || !respuestas) return res.status(400).json({ error:'Faltan datos' });
    if(usuariosWL[discordId]?.responded) return res.status(400).json({ error:'Ya enviaste la WL' });

    usuariosWL[discordId] = { responded:true, attempts:usuariosWL[discordId]?.attempts || 0 };

    const wlChannel = await client.channels.fetch(WL_CHANNEL_ID);

    await wlChannel.send(`<@${discordId}> envió su WL:`);

    const embed = new EmbedBuilder()
      .setTitle('📄 Nueva WL enviada')
      .setDescription(respuestas.map((r,i)=>`\n**Pregunta ${i+1}:** ${r}`).join(''))
      .setColor('#FFD700');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId(`accept_${discordId}`).setLabel('✅ Aceptar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`reject_${discordId}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger)
      );

    await wlChannel.send({ embeds:[embed], components:[row] });
    res.json({ status:'ok' });

  } catch(err){ console.error(err); res.status(500).json({ error:'Error interno' }); }
});

// --- Bot ---
client.on(Events.InteractionCreate, async interaction=>{
  if(!interaction.isButton()) return;

  const [action, discordId] = interaction.customId.split('_');
  if(usuariosWL[discordId]?.notified) return;
  usuariosWL[discordId].notified = true;

  const gif = action==='accept'
    ? 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGowbHhkaXJyeXcwanFjenNnbTV4ZTZhaGViMjN1cXIyODk2emcwNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/RGxQHSsRUP753rvYHs/giphy.gif'
    : 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGxiZzhnaXU1czFqMWVjNjNxNzVnMnB0N2VpdTdmNndlbHh6d2U1eiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/2iD1cNf6tslgWDLn6n/giphy.gif';

  const embed = new EmbedBuilder()
    .setTitle(action==='accept'?'✅ WL Aceptada':'❌ WL Rechazada')
    .setDescription(`<@${discordId}> ${action==='accept'?'fue aceptado':'fue rechazado'} a La Piña RP!`)
    .setColor(action==='accept'?'#00FF00':'#FF0000');

  const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);
  await resultChannel.send({ content: gif, embeds:[embed] });
  const member = await client.guilds.cache.get(GUILD_ID)?.members.fetch(discordId).catch(()=>null);
  if(member) await member.send({ content: gif, embeds:[embed] }).catch(()=>null);

  await interaction.update({ content: action==='accept'?'✅ WL aceptada':'❌ WL rechazada', components:[], embeds:interaction.message.embeds });
});

client.on('ready', ()=>console.log(`Bot listo! ${client.user.tag}`));
client.login(TOKEN);

app.listen(PORT, ()=>console.log(`Servidor corriendo en puerto ${PORT}`));
