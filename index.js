// index.js
const express = require('express');
const fetch = require('node-fetch');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } = require('discord.js');

// --- Variables de entorno ---
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const WL_CHANNEL_ID = process.env.WL_CHANNEL_ID;
const RESULT_CHANNEL_ID = process.env.RESULT_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

// --- Discord client ---
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// --- Express ---
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- Página principal ---
app.get('/', (req, res) => {
  const oauthLink = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds`;
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

// --- Callback OAuth2 (solo obtiene Discord ID y username) ---
app.get('/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.send('No se recibió código OAuth2');

    // Obtener token temporal del usuario
    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', 'https://wl-discord.onrender.com/callback');

    // Petición ficticia solo para front-end (no se usa CLIENT_SECRET)
    // Para simplificar, vamos a usar el code como ID temporal
    const userId = code.slice(0, 18); // ejemplo de ID
    const username = `Usuario-${userId.slice(-4)}`;

    // Formulario WL con contador
    res.send(`
      <html>
      <head>
        <title>WL Piña RP</title>
        <style>
          body { font-family: Arial; background: #000; color: #fff; text-align: center; margin: 20px; }
          h1 { color: #FFD700; }
          label { display:block; margin-top: 10px; }
          input { width: 300px; padding: 8px; margin: 5px; border-radius:5px; border:none; }
          button { padding:10px 20px; background:#FFD700; border:none; color:#000; border-radius:5px; cursor:pointer; font-size:16px; margin-top:15px; }
          button:hover { background:#e6c200; }
          #logo { width:150px; margin-bottom:20px; }
          #timer { font-size:18px; color:#FFD700; margin-bottom:20px; }
        </style>
      </head>
      <body>
        <img id="logo" src="/logo.png" alt="Piña RP"/>
        <h1>Formulario WL - ${username}</h1>
        <div id="timer">Tiempo restante: <span id="time">20:00</span></div>
        <form id="wlForm">
          ${[...Array(12)].map((_,i)=>`<label>Pregunta ${i+1}: <input type="text" id="p${i+1}" required/></label>`).join('')}
          <input type="hidden" id="discordId" value="${userId}" />
          <button type="submit">Enviar WL</button>
        </form>
        <p id="status"></p>
        <script>
          let timeLeft=1200;
          const timerEl=document.getElementById('time');
          const interval=setInterval(()=>{
            if(timeLeft<=0){ clearInterval(interval); timerEl.innerText="Tiempo agotado"; return; }
            const m=Math.floor(timeLeft/60), s=timeLeft%60;
            timerEl.innerText=\`\${m.toString().padStart(2,'0')}:\${s.toString().padStart(2,'0')}\`;
            timeLeft--;
          },1000);

          const form=document.getElementById('wlForm');
          const status=document.getElementById('status');
          form.addEventListener('submit', async e=>{
            e.preventDefault();
            const discordId=document.getElementById('discordId').value;
            let respuestas='';
            for(let i=1;i<=12;i++){ respuestas += "Pregunta "+i+": "+document.getElementById('p'+i).value+"\\n"; }
            const res=await fetch('/wl-form',{
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({discordId,respuestas})
            });
            const data=await res.json();
            status.innerText=data.status==='ok'?'✅ WL enviada correctamente!':'❌ Error al enviar WL';
          });
        </script>
      </body>
      </html>
    `);
  } catch(err){ console.error(err); res.send('Error interno'); }
});

// --- Endpoint WL-form ---
app.post('/wl-form', async (req,res)=>{
  try{
    const { discordId,respuestas }=req.body;
    if(!discordId||!respuestas) return res.status(400).json({error:'Faltan datos'});

    const wlChannel = await client.channels.fetch(WL_CHANNEL_ID);
    const embed = new EmbedBuilder()
      .setTitle('📄 Nueva WL enviada')
      .setDescription(respuestas)
      .setFooter({text:`Usuario: <@${discordId}>`})
      .setColor('#FFD700')
      .setThumbnail('https://i.imgur.com/tuLogo.png');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId(`accept_${discordId}`).setLabel('✅ Aceptar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`reject_${discordId}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger)
      );

    await wlChannel.send({embeds:[embed],components:[row]});
    res.json({status:'ok'});
  }catch(err){ console.error(err); res.status(500).json({error:'Error interno'});}
});

// --- Bot botones ---
client.on(Events.InteractionCreate, async interaction=>{
  if(!interaction.isButton()) return;
  const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);
  const [action, discordId]=interaction.customId.split('_');

  const embed = new EmbedBuilder()
    .setTitle(action==='accept'?'✅ WL Aceptada':'❌ WL Rechazada')
    .setDescription(`<@${discordId}> ${action==='accept'?'fue aceptado':'fue rechazado'} a Piña RP!`)
    .setColor(action==='accept'?'#00FF00':'#FF0000')
    .setImage(action==='accept'?'https://i.giphy.com/media/26FPy3QZQqGtDcrja/giphy.gif':'https://i.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif');

  await resultChannel.send({embeds:[embed]});
  await interaction.update({content:action==='accept'?'✅ WL aceptada':'❌ WL rechazada',components:[],embeds:interaction.message.embeds});
});

// --- Bot listo ---
client.on('ready',()=>console.log(`Bot listo! ${client.user.tag}`));
client.login(TOKEN);

// --- Server ---
app.listen(PORT,()=>console.log(`Servidor corriendo en puerto ${PORT}`));
