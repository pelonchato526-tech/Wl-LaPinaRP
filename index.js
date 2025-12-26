import express from 'express';
import fetch from 'node-fetch';
import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } from 'discord.js';

// Variables de entorno en Render
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const WL_CHANNEL_ID = process.env.WL_CHANNEL_ID;
const RESULT_CHANNEL_ID = process.env.RESULT_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

// Roles de aceptación/rechazo
const ROLE_ACCEPTED = '1453469378178846740';
const ROLE_REJECTED = '1453469439306760276';

// Preguntas
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
  "¿Está permitido hablar de temas de la vida real por el chat del juego?",
  "¿Qué es el RDM (Random Deathmatch)?",
  "¿Qué significa 'Valorar la vida'?"
];

// Almacena el estado de los usuarios: intentos, respondido, respuestas
const usuariosWL = {}; // discordId => { intentos: 0, respondido: false, respuestas: [] }

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- Página principal ---
app.get('/', (req,res)=>{
  const oauthLink = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds+email+openid`;
  res.send(`
    <html>
    <head>
      <title>WL Piña RP</title>
      <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <div class="card">
        <img id="logo" src="/logo.png" alt="Piña RP"/>
        <h1>Piña RP - WL Discord</h1>
        <p class="instructions">Lee cuidadosamente las instrucciones antes de comenzar tu WL.<br>
        Solo puedes enviar tu WL una vez y tienes 3 oportunidades si eres rechazado.</p>
        <a href="${oauthLink}"><button>Conectar con Discord y Comenzar</button></a>
      </div>
    </body>
    </html>
  `);
});

// --- Callback OAuth2 ---
app.get('/callback', async (req,res)=>{
  try{
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

    if(!usuariosWL[discordId]) usuariosWL[discordId] = { intentos:0, respondido:false, respuestas:[] };
    const usuario = usuariosWL[discordId];

    // Si ya respondió y no tiene retry
    if(usuario.respondido){
      return res.send(`<p>Ya enviaste tu WL. Espera tu resultado.</p>`);
    }

    res.send(`
      <html>
      <head>
        <title>WL Piña RP</title>
        <link rel="stylesheet" href="/style.css">
        <script>
          const preguntas = ${JSON.stringify(preguntas)};
          const discordId = "${discordId}";
        </script>
        <script src="/script.js"></script>
      </head>
      <body>
        <div class="card" id="form-card">
          <img id="logo" src="/logo.png"/>
          <h1>WL Formulario - ${username}</h1>
          <p class="instructions">Responde cuidadosamente. Tienes máximo 3 intentos si eres rechazado. No cambies de pestaña o se cancelará.</p>
          <div id="timer">Tiempo restante: 15:00</div>
          <div id="form-container">
            <button id="startBtn">Comenzar</button>
          </div>
        </div>
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

    // Mención directa al usuario
    await wlChannel.send(`<@${discordId}> envió su WL:`);

    const embed = new EmbedBuilder()
      .setTitle('📄 Nueva WL enviada')
      .setDescription(respuestas.map((r,i)=>`\n**Pregunta ${i+1}:** ${r}`).join(''))
      .setColor('#FFD700')
      .setThumbnail('https://i.imgur.com/tuLogo.png');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId(`accept_${discordId}`).setLabel('✅ Aceptar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`reject_${discordId}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger)
      );

    await wlChannel.send({ embeds:[embed], components:[row] });

    usuariosWL[discordId].respondido = true;
    usuariosWL[discordId].respuestas = respuestas;

    res.json({ status:'ok' });

  }catch(err){
    console.error(err);
    res.status(500).json({ error:'❌ Error interno' });
  }
});

// --- Bot interacción ---
client.on(Events.InteractionCreate, async interaction=>{
  if(!interaction.isButton()) return;

  const [action, discordId] = interaction.customId.split('_');
  const usuario = usuariosWL[discordId];
  if(!usuario) return;

  const gifURL = action==='accept'
    ? 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGowbHhkaXJyeXcwanFjenNnbTV4ZTZhaGViMjN1cXIyODk2emcwNyZlcD12MV9pbnRlcm5hbF9naWQmY3Q9Zw/RGxQHSsRUP753rvYHs/giphy.gif'
    : 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGxiZzhnaXU1czFqMWVjNjNxNzVnMnB0N2VpdTdmNndlbHh6d2U1eiZlcD12MV9pbnRlcm5hbF9naWQmY3Q9Zw/2iD1cNf6tslgWDLn6n/giphy.gif';

  const embed = new EmbedBuilder()
    .setTitle(action==='accept'?'✅ WL Aceptada':'❌ WL Rechazada')
    .setDescription(`<@${discordId}> ${action==='accept'?'fue aceptado':'fue rechazado'} a La Piña RP!`)
    .setColor(action==='accept'?'#00FF00':'#FF0000')
    .setImage(gifURL);

  const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);
  await resultChannel.send({ embeds:[embed] });

  const member = await client.guilds.cache.get(GUILD_ID)?.members.fetch(discordId).catch(()=>null);
  if(member){
    if(action==='reject' && usuario.intentos < 3){
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`retry_${discordId}`).setLabel('Otra oportunidad').setStyle(ButtonStyle.Primary)
      );
      await member.send({ content:'Tienes otra oportunidad de enviar tu WL.', components:[row], embeds:[embed] }).catch(()=>null);
    }else{
      await member.send({ embeds:[embed] }).catch(()=>null);
    }
  }

  if(action==='retry'){
    if(usuario.intentos >= 3) return interaction.reply({ content:'No tienes más intentos disponibles.', ephemeral:true });
    usuario.intentos++;
    usuario.respondido = false;
    interaction.reply({ content:'Ahora puedes enviar tu WL nuevamente. ¡Suerte!', ephemeral:true });
  }else{
    usuario.respondido = action==='accept';
  }

  await interaction.update({ content: action==='accept'?'✅ WL aceptada':'❌ WL rechazada', components:[], embeds:interaction.message.embeds });
});

client.on('ready', ()=>console.log(`Bot listo! ${client.user.tag}`));
client.login(TOKEN);

app.listen(PORT, ()=>console.log(`Servidor corriendo en puerto ${PORT}`));
