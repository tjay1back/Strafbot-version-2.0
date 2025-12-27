const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sheet')
        .setDescription('Erweiterte Text-Umwandlung für verschiedene Formate')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('Der Text, der umgewandelt werden soll')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('modus')
                .setDescription('Wähle den Umwandlungsmodus')
                .setRequired(false)
                .addChoices(
                    { name: 'Kommas (Standard)', value: 'kommas' },
                    { name: 'Punkte', value: 'punkte' },
                    { name: 'Unterstriche', value: 'unterstriche' },
                    { name: 'Bindestriche', value: 'bindestriche' },
                    { name: 'Camel Case', value: 'camelcase' },
                    { name: 'GROSSBUCHSTABEN', value: 'gross' },
                    { name: 'kleinbuchstaben', value: 'klein' },
                    { name: 'Keine Leerzeichen', value: 'nospace' }
                ))
        .addBooleanOption(option =>
            option.setName('erweitert')
                .setDescription('Erweiterte Optionen und Statistiken anzeigen')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('speichern')
                .setDescription('Umgewandelte Texte in Datei speichern (für Admins)')
                .setRequired(false)),
    
    async execute(interaction) {
        try {
            const inputText = interaction.options.getString('text');
            const modus = interaction.options.getString('modus') || 'kommas';
            const erweitert = interaction.options.getBoolean('erweitert') || false;
            const speichern = interaction.options.getBoolean('speichern') || false;
            
            // Verschiedene Umwandlungsmodi
            let convertedText;
            let modusName;
            let modusIcon;
            
            switch (modus) {
                case 'kommas':
                    convertedText = inputText.replace(/[\s-]+/g, ',');
                    modusName = 'Kommas';
                    modusIcon = '📝';
                    break;
                case 'punkte':
                    convertedText = inputText.replace(/[\s-]+/g, '.');
                    modusName = 'Punkte';
                    modusIcon = '⚪';
                    break;
                case 'unterstriche':
                    convertedText = inputText.replace(/[\s-]+/g, '_');
                    modusName = 'Unterstriche';
                    modusIcon = '📏';
                    break;
                case 'bindestriche':
                    convertedText = inputText.replace(/[\s]+/g, '-');
                    modusName = 'Bindestriche';
                    modusIcon = '➖';
                    break;
                case 'camelcase':
                    convertedText = inputText.toLowerCase().replace(/[\s-]+(.)/g, (match, char) => char.toUpperCase());
                    modusName = 'Camel Case';
                    modusIcon = '🐪';
                    break;
                case 'gross':
                    convertedText = inputText.toUpperCase().replace(/[\s-]+/g, '_');
                    modusName = 'GROSSBUCHSTABEN';
                    modusIcon = '📢';
                    break;
                case 'klein':
                    convertedText = inputText.toLowerCase().replace(/[\s-]+/g, '');
                    modusName = 'kleinbuchstaben';
                    modusIcon = '🔽';
                    break;
                case 'nospace':
                    convertedText = inputText.replace(/[\s-]+/g, '');
                    modusName = 'Keine Leerzeichen';
                    modusIcon = '🚫';
                    break;
                default:
                    convertedText = inputText.replace(/[\s-]+/g, ',');
                    modusName = 'Kommas';
                    modusIcon = '📝';
            }
            
            // Statistiken berechnen
            const stats = {
                originalLaenge: inputText.length,
                neueLaenge: convertedText.length,
                leerzeichenEntfernt: (inputText.match(/\s/g) || []).length,
                bindestricheEntfernt: (inputText.match(/-/g) || []).length,
                woerterAnzahl: inputText.trim().split(/\s+/).length,
                sonderzeichenAnzahl: (inputText.match(/[^\w\s-]/g) || []).length,
                zeitstempel: new Date().toLocaleString('de-DE')
            };
            
            // Haupt-Embed erstellen
            const mainEmbed = new EmbedBuilder()
                .setColor('#00ff88')
                .setTitle(`${modusIcon} Text-Umwandlung: ${modusName}`)
                .setDescription('✅ **Text erfolgreich umgewandelt!**')
                .addFields(
                    {
                        name: '📥 Originaltext',
                        value: `\`\`\`${inputText.length > 500 ? inputText.substring(0, 500) + '...' : inputText}\`\`\``,
                        inline: false
                    },
                    {
                        name: '📤 Umgewandelter Text',
                        value: `\`\`\`${convertedText.length > 500 ? convertedText.substring(0, 500) + '...' : convertedText}\`\`\``,
                        inline: false
                    }
                )
                .setFooter({ 
                    text: `Umgewandelt von ${interaction.user.username} | Modus: ${modusName}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();
            
            // Erweiterte Statistiken wenn gewünscht
            if (erweitert) {
                const statsEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('📊 Erweiterte Statistiken')
                    .addFields(
                        { name: '📏 Original-Länge', value: `${stats.originalLaenge} Zeichen`, inline: true },
                        { name: '📏 Neue Länge', value: `${stats.neueLaenge} Zeichen`, inline: true },
                        { name: '📈 Änderung', value: `${stats.neueLaenge - stats.originalLaenge >= 0 ? '+' : ''}${stats.neueLaenge - stats.originalLaenge}`, inline: true },
                        { name: '🔤 Wörter', value: `${stats.woerterAnzahl}`, inline: true },
                        { name: '⭐ Leerzeichen entfernt', value: `${stats.leerzeichenEntfernt}`, inline: true },
                        { name: '➖ Bindestriche entfernt', value: `${stats.bindestricheEntfernt}`, inline: true },
                        { name: '🎯 Sonderzeichen', value: `${stats.sonderzeichenAnzahl}`, inline: true },
                        { name: '⏰ Zeitstempel', value: stats.zeitstempel, inline: true },
                        { name: '🎨 Verwendeter Modus', value: `${modusIcon} ${modusName}`, inline: true }
                    )
                    .setThumbnail('https://cdn.discordapp.com/emojis/741690906442317824.png')
                    .setFooter({ text: 'Sheet Command - Erweiterte Analyse' });
                
                // Action Buttons für erweiterte Funktionen
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`sheet_copy_${interaction.user.id}`)
                            .setLabel('📋 In Zwischenablage')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId(`sheet_reverse_${interaction.user.id}`)
                            .setLabel('🔄 Rückgängig')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`sheet_export_${interaction.user.id}`)
                            .setLabel('💾 Als Datei')
                            .setStyle(ButtonStyle.Success)
                    );
                
                await interaction.reply({ 
                    embeds: [mainEmbed, statsEmbed], 
                    components: [row],
                    ephemeral: false 
                });
            } else {
                await interaction.reply({ 
                    embeds: [mainEmbed], 
                    ephemeral: false 
                });
            }
            
            // Berechtigung prüfen für Speicher-Funktion
            // FIXED: Sichere Überprüfung auf null/undefined
            const isAdmin = interaction.guild && 
                           interaction.member && 
                           interaction.member.permissions.has(PermissionFlagsBits.Administrator);
            
            const isAuthorizedUser = interaction.user.id === '1234567890'; // Deine Bot-Owner ID hier einfügen
            
            // Speichern wenn gewünscht und berechtigt
            if (speichern && (isAdmin || isAuthorizedUser)) {
                try {
                    const logData = {
                        zeitstempel: stats.zeitstempel,
                        benutzer: interaction.user.username,
                        userId: interaction.user.id,
                        originalText: inputText,
                        umgewandelterText: convertedText,
                        modus: modusName,
                        statistiken: stats,
                        serverId: interaction.guild?.id || 'DM',
                        serverName: interaction.guild?.name || 'Direct Message'
                    };
                    
                    const logPath = path.join(__dirname, '..', 'logs', 'sheet_logs.json');
                    
                    // Logs Ordner erstellen falls nicht vorhanden
                    const logsDir = path.dirname(logPath);
                    if (!fs.existsSync(logsDir)) {
                        fs.mkdirSync(logsDir, { recursive: true });
                    }
                    
                    let existingLogs = [];
                    if (fs.existsSync(logPath)) {
                        const fileContent = fs.readFileSync(logPath, 'utf8');
                        existingLogs = JSON.parse(fileContent);
                    }
                    
                    existingLogs.push(logData);
                    fs.writeFileSync(logPath, JSON.stringify(existingLogs, null, 2));
                    
                    await interaction.followUp({ 
                        content: '💾 **Daten gespeichert!** Log wurde in `sheet_logs.json` hinzugefügt.',
                        ephemeral: true 
                    });
                } catch (saveError) {
                    console.error('❌ Fehler beim Speichern:', saveError);
                    await interaction.followUp({ 
                        content: '❌ Fehler beim Speichern der Logs.',
                        ephemeral: true 
                    });
                }
            } else if (speichern && !isAdmin && !isAuthorizedUser) {
                // Warnung wenn Speichern gewünscht aber keine Berechtigung
                await interaction.followUp({
                    content: '⚠️ **Keine Berechtigung zum Speichern!** Diese Funktion ist nur für Admins verfügbar.',
                    ephemeral: true
                });
            }
            
            // Console Log für Debugging
            console.log(`🔧 Sheet Command ausgeführt:`);
            console.log(`├── Benutzer: ${interaction.user.username}`);
            console.log(`├── Server: ${interaction.guild?.name || 'Direct Message'}`);
            console.log(`├── Modus: ${modusName}`);
            console.log(`├── Original: "${inputText.substring(0, 50)}${inputText.length > 50 ? '...' : ''}"`);
            console.log(`├── Ergebnis: "${convertedText.substring(0, 50)}${convertedText.length > 50 ? '...' : ''}"`);
            console.log(`├── Erweitert: ${erweitert ? 'Ja' : 'Nein'}`);
            console.log(`├── Speichern angefragt: ${speichern ? 'Ja' : 'Nein'}`);
            console.log(`├── Admin-Berechtigung: ${isAdmin ? 'Ja' : 'Nein'}`);
            console.log(`└── Autorisierter User: ${isAuthorizedUser ? 'Ja' : 'Nein'}`);
            
        } catch (error) {
            console.error('❌ Fehler im Sheet Command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Fehler bei Text-Umwandlung')
                .setDescription('Es ist ein unerwarteter Fehler aufgetreten.')
                .addFields(
                    { name: '🐛 Fehler-Details', value: `\`${error.message}\``, inline: false },
                    { name: '🔧 Lösungsvorschläge', value: '• Versuche es mit kürzerem Text\n• Prüfe auf Sonderzeichen\n• Kontaktiere einen Admin', inline: false }
                )
                .setFooter({ text: 'Sheet Command Error Handler' })
                .setTimestamp();
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
    
    // Button Handler für erweiterte Funktionen
    async handleButton(interaction) {
        const [action, userId] = interaction.customId.split('_').slice(1);
        
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ Das sind nicht deine Buttons!', ephemeral: true });
        }
        
        switch (action) {
            case 'copy':
                await interaction.reply({ 
                    content: '📋 **Kopier-Tipp:** Markiere den Text im Codeblock und kopiere ihn mit Strg+C!', 
                    ephemeral: true 
                });
                break;
            case 'reverse':
                await interaction.reply({ 
                    content: '🔄 **Rückgängig:** Verwende einfach den ursprünglichen Text erneut mit `/sheet`!', 
                    ephemeral: true 
                });
                break;
            case 'export':
                await interaction.reply({ 
                    content: '💾 **Export-Feature:** Kommt bald! Verwende erstmal Copy & Paste.', 
                    ephemeral: true 
                });
                break;
        }
    }
};