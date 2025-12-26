// index.js
import express from "express";
import fetch from "node-fetch";
import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } from "discord.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  DISCORD_TOKEN,
  CLIENT_ID,
  CLIENT_SECRET,
  GUILD_ID,
  WL_CHANNEL_ID,
  RESULT_CHANNEL_ID,
  PORT = 3000
} = process.env;

// Roles
const ROLE_ACCEPTED = "1453469378178846740";
const ROLE_REJECTED = "1453469439306760276";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

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
  "¿Está permitido hablar de temas de la vida real (fútbol, política, clima real) por el chat de voz del juego?",
  "¿Qué es el RDM (Random Deathmatch)?",
  "¿Qué significa 'Valorar la vida'?"
];

// Map para controlar intentos
const userAttempts = new Map();

// --- Página principal ---
app.get("/", (req, res) => {
  const oauthLink = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds+email+openid`;
  res.send(`
  <html>
  <head>
    <title>WL Piña RP</title>
    <style>
      body { background:#000; color:#fff; font-family:Arial; text-align:center; margin-top:50px; }
      .card { display:inline-block; border:4px solid; border-image: linear-gradient(45deg, #FFD700, #FFA500, #FFD700) 1; border-radius:12px; padding:30px; }
      h1 { color:#FFD700; font-size:48px; margin-bottom:20px; }
      p { font-size:20px; margin:10px 0; }
      button { padding:15px 30px; background:#FFD700; color:#000; border:none; border-radius:8px; cursor:pointer; font-size:24px; margin-top:20px; }
      button:hover { background:#e6c200; }
      #logo { width:200px; margin-bottom:20px; display:block; margin-left:auto; margin-right:auto; }
    </style>
  </head>
  <body>
    <div class="card">
      <img id="logo" src="/logo.png" alt="Piña RP"/>
      <h1>Piña RP - WL Discord</h1>
      <p>Lee cuidadosamente las instrucciones antes de comenzar tu WL.</p>
      <p>Recuerda: Solo puedes enviar tu WL una vez, máximo 3 intentos si eres rechazado.</p>
      <a href="${oauthLink}"><button>Conectar con Discord y Comenzar</button></a>
    </div>
  </body>
  </html>
  `);
});

// --- Callback OAuth2 ---
app.get("/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.send("No se recibió código OAuth2");

    const params = new URLSearchParams();
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "https://wl-discord.onrender.com/callback");

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: params,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) return res.send(`Error OAuth2: ${tokenData.error_description}`);

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = await userRes.json();
    const discordId = userData.id;
    const username = userData.username;

    // Validar intentos
    if (!userAttempts.has(discordId)) userAttempts.set(discordId, { attempts: 0, completed: false, rejected: false });

    const userState = userAttempts.get(discordId);
    if (userState.completed && !userState.rejected) return res.send(`<p>Ya completaste la WL. No puedes responder otra vez.</p>`);

    res.send(`
    <html>
    <head>
      <title>WL Piña RP</title>
      <style>
        body { background:#000; color:#fff; font-family:Arial; text-align:center; margin:20px; }
        .card { display:inline-block; border:4px solid; border-image: linear-gradient(45deg, #FFD700, #FFA500, #FFD700) 1; border-radius:12px; padding:30px; text-align:center; }
        h1 { color:#FFD700; font-size:36px; margin-bottom:20px; }
        #logo { width:180px; display:block; margin:0 auto 20px; }
        button { padding:12px 25px; background:#FFD700; color:#000; border:none; border-radius:6px; cursor:pointer; font-size:20px; margin-top:20px; }
        button:hover { background:#e6c200; }
        #question { font-size:22px; margin-top:20px; }
        input { width:400px; padding:10px; margin-top:10px; border-radius:6px; border:none; font-size:18px; }
        #timer { font-size:20px; margin-top:15px; color:#FFD700; }
      </style>
    </head>
    <body>
      <div class="card" id="form-container">
        <img id="logo" src="/logo.png"/>
        <h1>WL Formulario - ${username}</h1>
        <p>Instrucciones: Responde cuidadosamente. Tienes máximo 3 intentos si eres rechazado. No cambies de pestaña.</p>
        <div id="timer">Tiempo restante: 15:00</div>
        <button id="startBtn">Comenzar</button>
      </div>
      <script>
        const preguntas = ${JSON.stringify(preguntas)};
        const discordId = "${discordId}";
        let current = 0;
        let respuestas = [];
        let tiempo = 900;
        let timerInterval;
        const container = document.getElementById("form-container");
        const userState = ${JSON.stringify(userState)};

        function startTimer(){
          timerInterval = setInterval(()=>{
            if(tiempo <= 0){
              clearInterval(timerInterval);
              container.innerHTML = "<p>⏰ Tiempo expirado</p>";
              userState.completed = false;
              return;
            }
            let min = Math.floor(tiempo/60);
            let sec = tiempo%60;
            document.getElementById("timer").innerText = "Tiempo restante: "+min.toString().padStart(2,"0")+":"+sec.toString().padStart(2,"0");
            tiempo--;
          },1000);
        }

        document.getElementById("startBtn").onclick = ()=>{
          if(userState.completed && !userState.rejected){
            container.innerHTML = "<p>Ya completaste la WL.</p>";
            return;
          }
          startTimer();
          showQuestion();
        };

        window.onbeforeunload = ()=>{
          clearInterval(timerInterval);
          if(!userState.completed){
            alert("⏳ WL cancelada por cambio de pestaña");
            userState.attempts++;
            if(userState.attempts >= 3){
              userState.completed = true;
              alert("Has alcanzado el máximo de intentos.");
            }
          }
        };

        function showQuestion(){
          if(current >= preguntas.length){
            submitWL();
            return;
          }
          container.innerHTML = \`
            <div id="question">\${preguntas[current]}</div>
            <input type="text" id="answer" required/>
            <br/>
            <button id="nextBtn">Listo</button>
          \`;
          document.getElementById("nextBtn").onclick = ()=>{
            const val = document.getElementById("answer").value.trim();
            if(!val){ alert("Debes responder"); return; }
            respuestas.push(val);
            current++;
            showQuestion();
          };
        }

        async function submitWL(){
          container.innerHTML = "<p>Enviando WL...</p>";
          const res = await fetch("/wl-form", {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ discordId, respuestas })
          });
          const data = await res.json();
          clearInterval(timerInterval);
          container.innerHTML = "<p>" + (data.status==="ok"?"✅ WL enviada con éxito!":"❌ Error") + "</p>";
        }
      </script>
    </body>
    </html>
    `);
  } catch(err){
    console.error(err);
    res.send("❌ Error interno");
  }
});

// --- Endpoint WL ---
app.post("/wl-form", async (req, res) => {
  try{
    const { discordId, respuestas } = req.body;
    if(!discordId || !respuestas) return res.status(400).json({error:"Faltan datos"});

    const wlChannel = await client.channels.fetch(WL_CHANNEL_ID);
    const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);

    // Embed con GIF dentro
    const embed = new EmbedBuilder()
      .setTitle("📄 Nueva WL enviada")
      .setDescription(respuestas.map((r,i)=>`\n**Pregunta ${i+1}:** ${r}`).join(''))
      .setColor("#FFD700")
      .setImage("https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMGowbHhkaXJyeXcwanFjenNnbTV4ZTZhaGViMjN1cXIyODk2emcwNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/RGxQHSsRUP753rvYHs/giphy.gif");

    await wlChannel.send({ content: `<@${discordId}> envió su WL:`, embeds:[embed] });

    res.json({ status:"ok" });
  } catch(err){
    console.error(err);
    res.status(500).json({error:"Error interno"});
  }
});

// --- Bot listo ---
client.on("ready", ()=>console.log(`Bot listo! ${client.user.tag}`));
client.login(DISCORD_TOKEN);

app.listen(PORT, ()=>console.log(`Servidor corriendo en puerto ${PORT}`));
