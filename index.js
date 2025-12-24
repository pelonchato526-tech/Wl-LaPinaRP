// index.js
const express = require('express');
const fetch = require('node-fetch');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } = require('discord.js');

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

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Logo aquí

// --- Preguntas WL ---
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

// --- Página principal con instrucciones ---
app.get('/', (req,res)=>{
  const oauthLink = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds`;
  res.send(`
    <html>
    <head>
      <title>WL Piña RP</title>
      <style>
        body { background:#000; color:#fff; font-family:Arial; text-align:center; margin-top:50px; }
        h1 { color:#FFD700; font-size:48px; }
        p { font-size:22px; max-width:600px; margin:auto; }
        button { padding:15px 30px; background:#FFD700; color:#000; border:none; border-radius:8px; cursor:pointer; font-size:24px; margin:10px; }
        button:hover { background:#e6c200; }
        #logo { width:200px; margin-bottom:30px; }
        footer { margin-top:50px; color:#aaa; font-size:14px; }
      </style>
    </head>
    <body>
      <img id="logo" src="/logo.png" alt="Piña RP"/>
      <h1>Piña RP - WL Discord</h1>
      <p>Lee cuidadosamente las instrucciones antes de comenzar tu WL.<br>
      Tienes 15 minutos para completar todas las preguntas. Una vez enviada, no podrás modificar tu WL.</p>
      <a href="${oauthLink}"><button>Conectar con Discord y Comenzar</button></a>
      <footer>© 2025 La Piña RP | Todos los derechos reservados</footer>
    </body>
    </html>
  `);
});

// --- Callback OAuth2 ---
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

    // --- Página formulario paso a paso ---
    res.send(`
      <html>
      <head>
        <title>WL Piña RP</title>
        <style>
          body { background:#000; color:#fff; font-family:Arial; text-align:center; margin:20px; }
          h1 { color:#FFD700; font-size:36px; }
          #logo { width:180px; margin-bottom:20px; }
          button { padding:12px 25px; background:#FFD700; color:#000; border:none; border-radius:6px; cursor:pointer; font-size:20px; margin-top:20px; }
          button:hover { background:#e6c200; }
          #question { font-size:22px; margin-top:20px; }
          input { width:400px; padding:10px; margin-top:10px; border-radius:6px; border:none; font-size:18px; }
          #timer { font-size:20px; margin-top:20px; color:#FF5555; }
          footer { margin-top:40px; color:#aaa; font-size:14px; }
        </style>
      </head>
      <body>
        <img id="logo" src="/logo.png"/>
        <h1>WL Formulario - ${username}</h1>
        <div id="form-container">
          <p id="instructions">Presiona el botón "Comenzar" para iniciar el formulario. Solo podrás enviar tu WL una vez.</p>
          <button id="startBtn">Comenzar</button>
          <div id="timer">Tiempo restante: 15:00</div>
        </div>
        <footer>© 2025 La Piña RP | Todos los derechos reservados</footer>
        <script>
          const preguntas = ${JSON.stringify(preguntas)};
          let current = 0;
          const respuestas = [];
          const discordId = "${discordId}";
          let tiempo = 15*60; // 15 minutos en segundos
          const container = document.getElementById('form-container');
          const timerEl = document.getElementById('timer');
          const startBtn = document.getElementById('startBtn');

          let interval;
          startBtn.onclick = ()=>{
            startTimer();
            showQuestion();
          };

          function startTimer(){
            interval = setInterval(()=>{
              let min = Math.floor(tiempo/60);
              let sec = tiempo % 60;
              timerEl.textContent = \`Tiempo restante: \${min.toString().padStart(2,'0')}:\${sec.toString().padStart(2,'0')}\`;
              tiempo--;
              if(tiempo<0){
                clearInterval(interval);
                alert("Tiempo terminado! Tu WL no se pudo enviar.");
                container.innerHTML = "<p>Tiempo agotado!</p>";
              }
            },1000);
          }

          function showQuestion(){
            container.innerHTML = \`
              <div id="question">\${preguntas[current]}</div>
              <input type="text" id="answer" required/>
              <br/>
              <button id="nextBtn">Listo</button>
              <div id="timer">\${timerEl.textContent}</div>
            \`;

            document.getElementById('nextBtn').onclick = ()=>{
              const val = document.getElementById('answer').value.trim();
              if(!val){ alert("Debes responder"); return; }
              respuestas.push(val);
              current++;
              if(current < preguntas.length){
                showQuestion();
              }else{
                clearInterval(interval);
                submitWL();
              }
            };
          }

          async function submitWL(){
            container.innerHTML = "<p>Enviando WL...</p>";
            const res = await fetch('/wl-form',{
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({discordId,respuestas})
            });
            const data = await res.json();
            container.innerHTML = "<p>" + (data.status==='ok'?'✅ WL enviada con éxito!':'❌ Error') + "</p>";
          }
        </script>
      </body>
      </html>
    `);

  } catch(err){
    console.error(err);
    res.send("Error interno");
  }
});

// --- Endpoint WL-form ---
app.post('/wl-form', async (req,res)=>{
  try {
    const { discordId,respuestas } = req.body;
    if(!discordId || !respuestas) return res.status(400).json({ error:'Faltan datos' });

    const wlChannel = await client.channels.fetch(WL_CHANNEL_ID);

    // Mención fuera del embed
    await wlChannel.send(`<@${discordId}> envió su WL:`);

    const embed = new EmbedBuilder()
      .setTitle('📄 Nueva WL enviada')
      .setDescription(respuestas.map((r,i)=>`\n**Pregunta ${i+1}:** ${r}`).join(''))
      .setColor('#FFD700')
      .setThumbnail('https://i.imgur.com/tuLogo.png'); // GIF o logo

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

// --- Bot botones ---
client.on(Events.InteractionCreate, async interaction=>{
  if(!interaction.isButton()) return;

  const [action, discordId] = interaction.customId.split('_');
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(discordId).catch(()=>null);
  if(!member) return;

  const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);

  if(action==='accept'){
    await member.roles.add(ROLE_ACCEPTED).catch(()=>null);
  } else if(action==='reject'){
    await member.roles.add(ROLE_REJECTED).catch(()=>null);
  }

  const embed = new EmbedBuilder()
    .setTitle(action==='accept'?'✅ WL Aceptada':'❌ WL Rechazada')
    .setDescription(`<@${discordId}> ${action==='accept'?'fue aceptado':'fue rechazado'} a Piña RP!`)
    .setColor(action==='accept'?'#00FF00':'#FF0000')
    .setImage(action==='accept'?'https://i.giphy.com/media/26FPy3QZQqGtDcrja/giphy.gif':'https://i.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif');

  // Enviar DM al usuario
  try{
    await member.send({ embeds:[embed] });
  }catch(e){}

  await resultChannel.send({ embeds:[embed] });
  await interaction.update({ content: action==='accept'?'✅ WL aceptada':'❌ WL rechazada', components:[], embeds:interaction.message.embeds });
});

// --- Bot listo ---
client.on('ready', ()=>console.log(`Bot listo! ${client.user.tag}`));
client.login(TOKEN);

// --- Servidor ---
app.listen(PORT, ()=>console.log(`Servidor corriendo en puerto ${PORT}`));
