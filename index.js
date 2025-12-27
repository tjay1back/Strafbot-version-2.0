const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// ============================================
// LOAD CONFIG & MAKE IT GLOBALLY AVAILABLE
// ============================================
try {
    global.config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    console.log('✅ Config geladen');
    console.log('🔑 Groq API Key:', global.config.groqApiKey ? '✅ Vorhanden' : '❌ Fehlt');
    console.log('💬 AI Chat Channel:', global.config.channels?.aiChat || '❌ Nicht gesetzt');
} catch (error) {
    console.error('❌ Fehler beim Laden der config.json:', error.message);
    console.log('💡 Stelle sicher, dass config.json existiert und gültig ist!');
    process.exit(1);
}

// ============================================
// BOT SETUP - MIT ALLEN INTENTS
// ============================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions
    ]
});

global.client = client;
client.commands = new Collection();

// ============================================
// LOAD COMMANDS FUNCTION
// ============================================
function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    
    if (!fs.existsSync(commandsPath)) {
        fs.mkdirSync(commandsPath, { recursive: true });
        console.log('📁 Commands directory created');
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    if (commandFiles.length === 0) {
        console.log('⚠️ No command files found in commands directory');
        return;
    }

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        try {
            delete require.cache[require.resolve(filePath)];
            const command = require(filePath);

            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                console.log(`✅ Command loaded: ${command.data.name}`);
            } else {
                console.log(`❌ Command at ${filePath} is missing required "data" or "execute" property.`);
            }
        } catch (error) {
            console.error(`❌ Error loading command ${file}:`, error.message);
        }
    }
}

// ============================================
// LOAD EVENTS FUNCTION
// ============================================
function loadEvents() {
    const eventsPath = path.join(__dirname, 'events');

    if (!fs.existsSync(eventsPath)) {
        fs.mkdirSync(eventsPath, { recursive: true });
        console.log('📁 Events directory created');
    }

    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    if (eventFiles.length === 0) {
        console.log('⚠️ No event files found in events directory');
        return;
    }

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        try {
            delete require.cache[require.resolve(filePath)];
            const event = require(filePath);

            if ('name' in event && 'execute' in event) {
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, client));
                    console.log(`✅ Event loaded (once): ${event.name}`);
                } else {
                    client.on(event.name, (...args) => event.execute(...args, client));
                    console.log(`✅ Event loaded: ${event.name}`);
                }
            } else {
                console.log(`❌ Event at ${filePath} is missing required "name" or "execute" property.`);
            }
        } catch (error) {
            console.error(`❌ Error loading event ${file}:`, error.message);
        }
    }
}

// ============================================
// RELOAD COMMANDS FUNCTION
// ============================================
function reloadCommands() {
    client.commands.clear();
    loadCommands();
    console.log('🔄 Commands reloaded');
}

// ============================================
// REGISTER SLASH COMMANDS
// ============================================
async function registerCommands() {
    const commands = [];
    
    for (const [name, command] of client.commands) {
        commands.push(command.data.toJSON());
    }

    if (commands.length === 0) {
        console.log('⚠️ No commands to register');
        return;
    }

    const rest = new REST().setToken(global.config.botToken);

    try {
        console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);

        const routes = global.config.guildId ? 
            Routes.applicationGuildCommands(client.user.id, global.config.guildId) :
            Routes.applicationCommands(client.user.id);

        const data = await rest.put(routes, { body: commands });

        console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
}

// ============================================
// AUTO-LOAD ON STARTUP
// ============================================
loadCommands();
loadEvents();

// ============================================
// READY EVENT
// ============================================
client.once('ready', async () => {
    console.log(`🚀 Bot is ready! Logged in as ${client.user.tag}`);
    console.log(`🔊 Serving ${client.guilds.cache.size} guilds`);
    
    // Set bot status
    client.user.setActivity('Strafverwaltung v1.0', { type: 'WATCHING' });
    
    // Register slash commands
    await registerCommands();
});

// ============================================
// INTERACTION HANDLER
// ============================================
client.on('interactionCreate', async interaction => {
    try {
        // Handle Autocomplete Interactions
        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);

            if (!command || !command.autocomplete) {
                console.error(`❌ No autocomplete handler for ${interaction.commandName}`);
                return;
            }

            try {
                await command.autocomplete(interaction);
            } catch (error) {
                console.error(`❌ Error in autocomplete for ${interaction.commandName}:`, error);
            }
            return;
        }

        // Handle Slash Commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`❌ No command matching ${interaction.commandName} was found.`);
                return;
            }

            console.log(`🎯 Command executed: ${interaction.commandName} by ${interaction.user.tag}`);

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`❌ Error executing command ${interaction.commandName}:`, error);
                
                const errorMessage = { 
                    content: 'Es gab einen Fehler beim Ausführen des Befehls!', 
                    ephemeral: true 
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }
        
        // Handle Modal Submit Interactions
        else if (interaction.isModalSubmit()) {
            console.log(`📝 Modal submitted: ${interaction.customId} by ${interaction.user.tag}`);
            
            const command = client.commands.get('strafe');
            if (command && command.handleModalSubmit) {
                try {
                    await command.handleModalSubmit(interaction);
                } catch (error) {
                    console.error('❌ Error handling modal submit:', error);
                    
                    const errorMessage = { 
                        content: 'Es gab einen Fehler beim Verarbeiten des Modals!', 
                        ephemeral: true 
                    };

                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply(errorMessage);
                    } else if (!interaction.replied) {
                        await interaction.editReply(errorMessage);
                    } else {
                        await interaction.followUp(errorMessage);
                    }
                }
            }
        }
        
        // Handle Button Interactions
        else if (interaction.isButton()) {
            console.log(`🔘 Button clicked: ${interaction.customId} by ${interaction.user.tag}`);
            
            const command = client.commands.get('strafe');
            if (command && command.handleButtonInteraction) {
                try {
                    await command.handleButtonInteraction(interaction);
                } catch (error) {
                    console.error('❌ Error handling button interaction:', error);
                }
            }
        }

        // Handle Select Menu Interactions
        else if (interaction.isStringSelectMenu()) {
            console.log(`📋 Select menu used: ${interaction.customId} by ${interaction.user.tag}`);
            
            const command = client.commands.get('strafe');
            if (command && command.handleSelectInteraction) {
                try {
                    await command.handleSelectInteraction(interaction);
                } catch (error) {
                    console.error('❌ Error handling select interaction:', error);
                    
                    const errorMessage = { 
                        content: 'Es gab einen Fehler beim Verarbeiten der Auswahl!', 
                        ephemeral: true 
                    };

                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply(errorMessage);
                    } else if (!interaction.replied) {
                        await interaction.editReply(errorMessage);
                    } else {
                        await interaction.followUp(errorMessage);
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Unexpected error in interactionCreate:', error);
    }
});

// ============================================
// MESSAGE HANDLER (TEXT COMMANDS)
// ============================================
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    try {
        if (message.content === '!reload') {
            console.log(`🔄 Reload command used by ${message.author.tag}`);
            
            const command = client.commands.get('strafe');
            if (command && command.handleMessage) {
                try {
                    await command.handleMessage(message);
                } catch (error) {
                    console.error('❌ Error handling reload command:', error);
                    await message.reply('Es gab einen Fehler beim Ausführen des Reload-Befehls!');
                }
            }
        }
        
        else if (message.content === '!reloadcmds') {
            const requiredRoleId = '1405372637009547365';
            if (!message.member.roles.cache.has(requiredRoleId)) {
                return message.reply('❌ Du hast keine Berechtigung für diesen Befehl!');
            }
            
            try {
                reloadCommands();
                await registerCommands();
                await message.reply('✅ Alle Befehle wurden neu geladen!');
            } catch (error) {
                console.error('❌ Error reloading commands:', error);
                await message.reply('❌ Fehler beim Neuladen der Befehle!');
            }
        }
    } catch (error) {
        console.error('❌ Error in messageCreate:', error);
    }
});

// ============================================
// GUILD EVENTS
// ============================================
client.on('guildCreate', guild => {
    console.log(`✅ Joined guild: ${guild.name} (${guild.id})`);
});

client.on('guildDelete', guild => {
    console.log(`❌ Left guild: ${guild.name} (${guild.id})`);
});

// ============================================
// ERROR HANDLING
// ============================================
client.on('error', error => {
    console.error('❌ Discord client error:', error);
});

client.on('warn', warning => {
    console.warn('⚠️ Discord client warning:', warning);
});

client.on('shardError', error => {
    console.error('❌ A websocket connection encountered an error:', error);
});

// ============================================
// PROCESS ERROR HANDLING
// ============================================
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', error => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on('SIGINT', () => {
    console.log('🔄 Received SIGINT, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🔄 Received SIGTERM, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

// ============================================
// LOGIN
// ============================================
console.log('🔐 Logging in to Discord...');
client.login(global.config.botToken).catch(error => {
    console.error('❌ Failed to login:', error);
    process.exit(1);
});