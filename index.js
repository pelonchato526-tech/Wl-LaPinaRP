const express = require('express');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const WL_CHANNEL_ID = process.env.WL_CHANNEL_ID;
const RESULT_CHANNEL_ID = process.env.RESULT_CHANNEL_ID;
const PORT = process.env.PORT||3000;

const ROLE_ACCEPTED = '1453469378178846740';
const ROLE_REJECTED = '1453469439306760276';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });
const app = express();
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static('public'));

app.get('/oauth',(req,res)=>{
  const url = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=https%3A%2F%2Fwl-discord.onrender.com%2Fcallback&scope=identify+guilds+email+openid`;
  res.redirect(url);
});

app.get('/callback', async (req,res)=>{
  try{
    const code = req.query.code;
    if(!code) return res.redirect('/');

    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type','authorization_code');
    params.append('code', code);
    params.append('redirect_uri','https://wl-discord.onrender.com/callback');

    const tokenRes = await fetch('https://discord.com/api/oauth2/token',{
      method:'POST',
      body:params,
      headers:{'Content-Type':'application/x-www-form-urlencoded'}
    });
    const tokenData = await tokenRes.json();
    if(tokenData.error) return res.send("Error OAuth");

    const userRes = await fetch('https://discord.com/api/users/@me',{
      headers:{Authorization:`Bearer ${tokenData.access_token}`}
    });
    const userData = await userRes.json();
    const discordId = userData.id;
    const username = userData.username;

    res.redirect(`/instrucciones.html?discordId=${discordId}&username=${encodeURIComponent(username)}`);

  }catch(e){
    console.error(e);
    res.send("❌ Error interno");
  }
});

app.post('/wl-form', async (req,res)=>{
  try{
    const {discordId,respuestas} = req.body;
    if(!discordId || !respuestas) return res.status(400).json({ok:false});

    const wlChannel = await client.channels.fetch(WL_CHANNEL_ID);

    // Mención
    await wlChannel.send(`<@${discordId}> envió su WL:`);

    const embed = new EmbedBuilder()
      .setTitle("📄 Nueva WL enviada")
      .setDescription(respuestas.map((r,i)=>`**${i+1}.** ${r}`).join('\n\n'))
      .setColor("#FFD700");

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId(`accept_${discordId}`).setLabel('✅ Aceptar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`reject_${discordId}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger)
      );

    await wlChannel.send({embeds:[embed],components:[row]});
    res.json({ok:true});

  }catch(e){
    console.error(e);
    res.status(500).json({ok:false});
  }
});

client.on(Events.InteractionCreate, async i=>{
  if(!i.isButton()) return;
  const [action, discordId] = i.customId.split('_');
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(discordId).catch(()=>null);
  if(!member) return;

  const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);

  if(action==='accept') await member.roles.add(ROLE_ACCEPTED).catch(()=>null);
  if(action==='reject') await member.roles.add(ROLE_REJECTED).catch(()=>null);

  const embed = new EmbedBuilder()
    .setTitle(action==='accept'?'✅ WL Aceptada':'❌ WL Rechazada')
    .setDescription(`<@${discordId}> ${action==='accept'?'fue aceptado':'fue rechazado'} a La Piña RP!`)
    .setColor(action==='accept'?'#00FF00':'#FF0000')
    .setImage(action==='accept'
      ? 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnh3N3duYXA4OW0wMG1samVyZTUxdzk1ZWF2MGh6dHhrYWJ5MzBsMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/sOzVzt9IWu2ECjLVfF/giphy.gif'
      : 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2VveW9waW94OGFicmcyeGZzZDZ1cG4zb3Y5eXh2OTFyMTE3OGZuNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/bGtF6Y5QRjmvjqamoL/giphy.gif'
    );

  member.send({embeds:[embed]}).catch(()=>null);
  await resultChannel.send({embeds:[embed]});
  await i.update({content: action==='accept'?'✅ WL aceptada':'❌ WL rechazada',components:[],embeds:i.message.embeds});
});

client.login(TOKEN);
app.listen(PORT,()=>console.log(`Servidor corriendo en puerto ${PORT}`));
