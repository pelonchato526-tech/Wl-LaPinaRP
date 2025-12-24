// index.js
const express = require('express');
const fetch = require('node-fetch');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const WL_CHANNEL_ID = process.env.WL_CHANNEL_ID;
const RESULT_CHANNEL_ID = process.env.RESULT_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // logo.png

// Página principal
app.get('/', (req, res) => {
  const oauthLink = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds`;
  res.send(`
    <html>
    <head>
      <title>WL Piña RP</title>
      <style>
        body { background:#000; color:#fff; font-family: Arial; text-align:center; margin-top:50px; }
        h1 { color:#FFD700; font-size:48px; }
        button { padding:15px 30px; background:#FFD700; color:#000; border:none; border-radius:8px; cursor:pointer; font-size:24px; }
        button:hover { background:#e6c200; }
        #logo { width:200px; margin-bottom:30px; }
      </style>
    </head>
    <body>
      <img id="logo" src="/logo.png" alt="Piña RP"/>
      <h1>Piña RP - WL Discord</h1>
      <a href="${oauthLink}"><button>Conectar con Discord</button></a>
    </body>
    </html>
  `);
});

// Callback OAuth2 y formulario
app.get('/callback', async (req,res)=>{
  try{
    const code = req.query.code;
    if(!code) return res.send("No se recibió código OAuth2");

    // Simulación de usuario
    const discordId = code.slice(0,18);
    const username = `Usuario-${discordId.slice(-4)}`;

    const preguntas = [
      "Nombre completo en Discord",
      "Edad",
      "Tiempo jugando RP",
      "Rol que deseas hacer",
      "Experiencia en MG",
      "Experiencia en PG",
      "Sanciones previas",
      "Estilo RP",
      "Disponibilidad de horario",
      "Por qué quieres unirte a Piña RP",
      "Describe tu personaje",
      "Algo más que quieras añadir"
    ];

    res.send(`
      <html>
      <head>
        <title>WL Piña RP</title>
        <style>
          body { background:#000; color:#fff; font-family: Arial; text-align:center; margin:20px; }
          h1 { color:#FFD700; font-size:36px; }
          label { display:block; margin-top:15px; font-size:20px; }
          input { width:400px; padding:10px; margin:5px; border-radius:6px; border:none; font-size:18px; }
          button { padding:12px 25px; background:#FFD700; color:#000; border:none; border-radius:6px; cursor:pointer; font-size:20px; margin-top:20px; }
          button:hover { background:#e6c200; }
          #logo { width:180px; margin-bottom:20px; }
          #timer { font-size:24px; color:#FFD700; margin-bottom:20px; }
        </style>
      </head>
      <body>
        <img id="logo" src="/logo.png" alt="Piña RP"/>
        <h1>WL Formulario - ${username}</h1>
        <div id="timer">Tiempo restante: <span id="time">20:00</span></div>
        <form id="wlForm">
          ${preguntas.map((p,i)=>`<label>${p}: <input type="text" id="p${i+1}" required/></label>`).join('')}
          <input type="hidden" id="discordId" value="${discordId}"/>
          <button type="submit">Enviar WL</button>
        </form>
        <p id="status" style="font-size:22px; margin-top:15px;"></p>
        <script>
          let timeLeft=1200;
          const timerEl=document.getElementById('time');
          setInterval(()=>{
            if(timeLeft<=0){ timerEl.innerText="Tiempo agotado"; return; }
            const m=Math.floor(timeLeft/60), s=timeLeft%60;
            timerEl.innerText=\`\${m.toString().padStart(2,'0')}:\${s.toString().padStart(2,'0')}\`;
            timeLeft--;
          },1000);

          const form=document.getElementById('wlForm');
          const status=document.getElementById('status');
          form.addEventListener('submit',async e=>{
            e.preventDefault();
            const discordId=document.getElementById('discordId').value;
            let respuestas='';
            for(let i=1;i<=12;i++) respuestas+= \`Pregunta \${i}: \${document.getElementById('p'+i).value}\\n\`;
            const res=await fetch('/wl-form',{
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({discordId,respuestas})
            });
            const data=await res.json();
            status.innerText=data.status==='ok'?'✅ WL enviada!':'❌ Error';
          });
        </script>
      </body>
      </html>
    `);

  }catch(err){ console.error(err); res.send("Error interno"); }
});

// Endpoint WL-form
app.post('/wl-form', async(req,res)=>{
  try{
    const {discordId,respuestas}=req.body;
    if(!discordId||!respuestas) return res.status(400).json({error:'Faltan datos'});

    const wlChannel = await client.channels.fetch(WL_CHANNEL_ID);

    // Mención antes del embed
    await wlChannel.send(`<@${discordId}> envió su WL:`);

    const embed = new EmbedBuilder()
      .setTitle('📄 Nueva WL enviada')
      .setDescription(respuestas)
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

// Bot botones
client.on(Events.InteractionCreate, async interaction=>{
  if(!interaction.isButton()) return;
  const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);
  const [action,discordId]=interaction.customId.split('_');

  const embed = new EmbedBuilder()
    .setTitle(action==='accept'?'✅ WL Aceptada':'❌ WL Rechazada')
    .setDescription(`<@${discordId}> ${action==='accept'?'fue aceptado':'fue rechazado'} a Piña RP!`)
    .setColor(action==='accept'?'#00FF00':'#FF0000')
    .setImage(action==='accept'?'https://i.giphy.com/media/26FPy3QZQqGtDcrja/giphy.gif':'https://i.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif');

  await resultChannel.send({embeds:[embed]});
  await interaction.update({content:action==='accept'?'✅ WL aceptada':'❌ WL rechazada',components:[],embeds:interaction.message.embeds});
});

// Bot listo
client.on('ready',()=>console.log(`Bot listo! ${client.user.tag}`));
client.login(TOKEN);

// Server
app.listen(PORT,()=>console.log(`Servidor corriendo en puerto ${PORT}`));
