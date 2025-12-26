import express from 'express';
import fetch from 'node-fetch';
import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } from 'discord.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const WL_CHANNEL_ID = process.env.WL_CHANNEL_ID;
const RESULT_CHANNEL_ID = process.env.RESULT_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

const ROLE_ACCEPTED = '1453469378178846740';
const ROLE_REJECTED = '1453469439306760276';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });

// --- Preguntas ---
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
  "¿Está permitido hablar de temas de la vida real (fútbol, política, clima real) por el chat de voz del juego?",
  "¿Qué es el RDM (Random Deathmatch)?",
  "¿Qué significa 'Valorar la vida'?"
];

// --- Usuarios que han respondido ---
const usuariosWL = {}; // { discordId: { respondido: true, intentos: n } }

app.get('/', (req,res)=>{
  const oauthLink = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds+email+openid`;
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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
    const username = userData.username;

    // Guardamos que puede iniciar WL
    if(!usuariosWL[discordId]) usuariosWL[discordId] = { respondido:false, intentos:0 };

    res.sendFile(path.join(__dirname, 'public', 'form.html'));

  } catch(err){
    console.error(err);
    res.send("Error interno");
  }
});

app.post('/wl-form', async (req,res)=>{
  try {
    const { discordId, respuestas } = req.body;
    if(!discordId || !respuestas) return res.status(400).json({ error:'Faltan datos' });

    if(!usuariosWL[discordId]) usuariosWL[discordId] = { respondido:false, intentos:0 };

    if(usuariosWL[discordId].respondido) return res.json({ error:'Ya enviaste la WL' });

    usuariosWL[discordId].respondido = true;
    usuariosWL[discordId].intentos++;

    const wlChannel = await client.channels.fetch(WL_CHANNEL_ID);
    await wlChannel.send(`<@${discordId}> envió su WL:`);

    const embed = new EmbedBuilder()
      .setTitle('📄 Nueva WL enviada')
      .setDescription(respuestas.map((r,i)=>`\n**Pregunta ${i+1}:** ${r}`).join(''))
      .setColor('#FFD700')
      .setThumbnail('https://i.imgur.com/tuLogo.png')
      .setImage('https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGowbHhkaXJyeXcwanFjenNnbTV4ZTZhaGViMjN1cXIyODk2emcwNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/RGxQHSsRUP753rvYHs/giphy.gif');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId(`accept_${discordId}`).setLabel('✅ Aceptar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`reject_${discordId}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger)
      );

    await wlChannel.send({ embeds:[embed], components:[row] });
    res.json({ status:'ok' });

  } catch(err){
    console.error(err);
    res.status(500).json({ error:'Error interno' });
  }
});

client.on(Events.InteractionCreate, async interaction=>{
  if(!interaction.isButton()) return;
  const [action, discordId] = interaction.customId.split('_');
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(discordId).catch(()=>null);
  if(!member) return;

  const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);

  let embed = new EmbedBuilder()
    .setTitle(action==='accept'?'✅ WL Aceptada':'❌ WL Rechazada')
    .setDescription(`<@${discordId}> ${action==='accept'?'fue aceptado':'fue rechazado'} a La Piña RP!`)
    .setColor(action==='accept'?'#00FF00':'#FF0000')
    .setImage(action==='accept'?
      'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGowbHhkaXJyeXcwanFjenNnbTV4ZTZhaGViMjN1cXIyODk2emcwNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/RGxQHSsRUP753rvYHs/giphy.gif'
      :'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGxiZzhnaXU1czFqMWVjNjNxNzVnMnB0N2VpdTdmNndlbHh6d2U1eiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/2iD1cNf6tslgWDLn6n/giphy.gif');

  // Enviar DM
  if(action==='reject' && usuariosWL[discordId].intentos < 3){
    await member.send({ content:'Tienes otra oportunidad de enviar la WL' }).catch(()=>null);
    usuariosWL[discordId].respondido = false;
  } else {
    await member.send({ embeds:[embed] }).catch(()=>null);
  }

  await resultChannel.send({ embeds:[embed] });
  await interaction.update({ content: action==='accept'?'✅ WL aceptada':'❌ WL rechazada', components:[], embeds:interaction.message.embeds });
});

client.on('ready', ()=>console.log(`Bot listo! ${client.user.tag}`));
client.login(TOKEN);

app.listen(PORT, ()=>console.log(`Servidor corriendo en puerto ${PORT}`));
