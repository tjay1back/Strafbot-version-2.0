const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Load Config
let config;
try {
    config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
} catch (error) {
    console.error('⚠️ Fehler beim Laden der config.json:', error.message);
}

// Session storage for user interactions
const sessions = new Map();
const activePanels = new Map();
const NON_PD_ROLE_ID = '1426973009528487996';
const AKTEN_VIEW_ROLE_ID = '1426983109437423758'; // NEU: Rolle die Akten sehen kann
const AKTEN_CLOSE_ROLE_ID = '1405372637009547365'; // NEU: Rolle die Akten schließen kann

// NEU: Akten-Tracking für Auto-Delete
const aktenTracking = new Map(); // Map<channelId, { createdAt: timestamp, minecraftName: string }>

// NEU: Lade gespeicherte Akten-Daten beim Start
function loadAktenTracking() {
    try {
        const trackingPath = path.join(__dirname, '../data/akten_tracking.json');
        if (fs.existsSync(trackingPath)) {
            const data = JSON.parse(fs.readFileSync(trackingPath, 'utf8'));
            for (const [channelId, info] of Object.entries(data)) {
                aktenTracking.set(channelId, info);
            }
            console.log(`✅ ${aktenTracking.size} Akten geladen`);
        }
    } catch (error) {
        console.error('⚠️ Fehler beim Laden der Akten-Tracking-Daten:', error);
    }
}

// NEU: Speichere Akten-Daten
function saveAktenTracking() {
    try {
        const trackingPath = path.join(__dirname, '../data/akten_tracking.json');
        const dataDir = path.dirname(trackingPath);
        
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        const data = Object.fromEntries(aktenTracking);
        fs.writeFileSync(trackingPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('⚠️ Fehler beim Speichern der Akten-Tracking-Daten:', error);
    }
}

// NEU: Auto-Delete Check für Akten (läuft alle 6 Stunden)
setInterval(async () => {
    console.log('🗑️ Prüfe Akten auf Auto-Delete...');
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000; // 3 Tage in Millisekunden
    
    for (const [channelId, info] of aktenTracking.entries()) {
        const age = now - info.createdAt;
        
        if (age >= threeDays) {
            try {
                // Finde den Channel
                const guild = global.client?.guilds.cache.first();
                if (!guild) continue;
                
                const channel = guild.channels.cache.get(channelId);
                if (channel) {
                    console.log(`🗑️ Lösche Akte: ${channel.name} (${info.minecraftName}) - ${Math.floor(age / (24 * 60 * 60 * 1000))} Tage alt`);
                    
                    // Sende Abschlussnachricht
                    const deleteEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('🗑️ Akte wird automatisch gelöscht')
                        .setDescription(`Diese Akte ist älter als 3 Tage und wird nun automatisch gelöscht.`)
                        .addFields(
                            { name: '👤 Spieler', value: info.minecraftName, inline: true },
                            { name: '📅 Erstellt am', value: `<t:${Math.floor(info.createdAt / 1000)}:F>`, inline: true },
                            { name: '⏰ Alter', value: `${Math.floor(age / (24 * 60 * 60 * 1000))} Tage`, inline: true }
                        )
                        .setFooter({ text: 'Automatische Löschung nach 3 Tagen | Anti-Metagaming System' })
                        .setTimestamp();
                    
                    await channel.send({ embeds: [deleteEmbed] });
                    
                    // Warte kurz, dann lösche den Channel
                    setTimeout(async () => {
                        try {
                            await channel.delete('Automatische Löschung nach 3 Tagen');
                            aktenTracking.delete(channelId);
                            saveAktenTracking();
                            console.log(`✅ Akte gelöscht: ${info.minecraftName}`);
                        } catch (deleteError) {
                            console.error(`❌ Fehler beim Löschen von ${channelId}:`, deleteError);
                        }
                    }, 5000);
                } else {
                    // Channel existiert nicht mehr, entferne aus Tracking
                    aktenTracking.delete(channelId);
                    saveAktenTracking();
                }
            } catch (error) {
                console.error(`❌ Fehler beim Auto-Delete von ${channelId}:`, error);
            }
        }
    }
}, 6 * 60 * 60 * 1000); // Alle 6 Stunden

// NEU: Prüfe beim Bot-Start auf alte Akten
setTimeout(() => {
    console.log('🔍 Führe initiale Akten-Prüfung durch...');
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    
    for (const [channelId, info] of aktenTracking.entries()) {
        const age = now - info.createdAt;
        if (age >= threeDays) {
            console.log(`⚠️ Alte Akte gefunden: ${info.minecraftName} (${Math.floor(age / (24 * 60 * 60 * 1000))} Tage alt)`);
        }
    }
}, 10000); // 10 Sekunden nach Bot-Start

// Lade Tracking beim Modul-Load
loadAktenTracking();

// Auto-Refresh alle 2 Stunden
setInterval(async () => {
    console.log('🔄 Auto-Refresh: Aktualisiere alle aktiven Panels...');
    for (const [panelId, panelData] of activePanels.entries()) {
        try {
            const session = sessions.get(panelData.sessionId);
            if (session && panelData.interaction) {
                await module.exports.showPage(panelData.interaction, panelData.sessionId, session.currentPage);
                console.log(`✅ Panel ${panelId} aktualisiert`);
            }
        } catch (error) {
            console.error(`❌ Fehler beim Aktualisieren von Panel ${panelId}:`, error);
            activePanels.delete(panelId);
        }
    }
}, 2 * 60 * 60 * 1000);

// Session cleanup
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (now - session.createdAt > (config?.botSettings?.sessionTimeout || 1800000)) {
            sessions.delete(sessionId);
            for (const [panelId, panelData] of activePanels.entries()) {
                if (panelData.sessionId === sessionId) {
                    activePanels.delete(panelId);
                }
            }
        }
    }
}, 300000);

// Helper function to format time
function formatTime(totalMinutes) {
    if (totalMinutes >= 60) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (minutes > 0) {
            return `${hours}h ${minutes}min`;
        }
        return `${hours}h`;
    }
    return `${totalMinutes} Minuten`;
}

// Reload Command Handler
async function handleReloadCommand(message) {
    const requiredRoleId = '1405372637009547365';
    if (!message.member.roles.cache.has(requiredRoleId)) {
        return message.reply('❌ Du hast keine Berechtigung für diesen Befehl!');
    }

    const reloadMsg = await message.reply('🔄 Lade alle aktiven Panels neu...');
    let successCount = 0;
    let errorCount = 0;

    for (const [panelId, panelData] of activePanels.entries()) {
        try {
            const session = sessions.get(panelData.sessionId);
            if (session && panelData.interaction) {
                await module.exports.showPage(panelData.interaction, panelData.sessionId, session.currentPage);
                successCount++;
            }
        } catch (error) {
            console.error(`❌ Fehler beim Neuladen von Panel ${panelId}:`, error);
            activePanels.delete(panelId);
            errorCount++;
        }
    }

    await reloadMsg.edit(`✅ Panel-Reload abgeschlossen: **${successCount}** erfolgreich, **${errorCount}** Fehler`);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('strafe')
        .setDescription('Erstelle eine Strafe oder Fahndung für einen Minecraft Spieler')
        .addStringOption(option =>
            option.setName('minecraft_name')
                .setDescription('Der Minecraft Username')
                .setRequired(true)),

    async handleMessage(message) {
        if (message.content === '!reload') {
            await handleReloadCommand(message);
        }
    },

    async execute(interaction) {
        // NonPD CHECK
        if (interaction.member.roles.cache.has(NON_PD_ROLE_ID)) {
            return await interaction.reply({
                content: '❌ Du darfst diesen Command nicht nutzen. Du hast die NonPD Rolle.',
                ephemeral: true
            });
        }

        // CHANNEL CHECK
        const PD_CHANNEL_ID = '1426983286907080888';
        if (interaction.channel.id !== PD_CHANNEL_ID) {
            return await interaction.reply({
                content: '❌ Dieser Command darf nur im <#1426983286907080888> Channel verwendet werden!',
                ephemeral: true
            });
        }

        const minecraftName = interaction.options.getString('minecraft_name');
        
        const sessionId = `${interaction.user.id}-${Date.now()}`;
        sessions.set(sessionId, {
            userId: interaction.user.id,
            minecraftName: minecraftName,
            actionType: null, // GEÄNDERT: Wird später im Control Panel gewählt
            selectedCrimes: [],
            gestellt: false,
            gestelltBonus: 0,
            currentPage: 0,
            createdAt: Date.now(),
            allCrimes: null,
            extraDebt: 0
        });

        let strafkatalog;
        try {
            const strafkatalogPath = path.join(__dirname, '../data/strafkatalog.json');
            strafkatalog = JSON.parse(fs.readFileSync(strafkatalogPath, 'utf8'));
        } catch (error) {
            return interaction.reply({
                content: '⚠️ Fehler beim Laden des Strafkatalogs!',
                ephemeral: true
            });
        }

        sessions.get(sessionId).allCrimes = strafkatalog;
        await this.showPage(interaction, sessionId, 0, true);
    },

    async showPage(interaction, sessionId, page, isInitial = false) {
        const session = sessions.get(sessionId);
        if (!session) return;

        const panelId = `${sessionId}-${Date.now()}`;
        activePanels.set(panelId, { sessionId, interaction });

        const strafkatalog = session.allCrimes;
        const isWanted = session.actionType === 'wanted';
        const isStrafe = session.actionType === 'strafe';
        
        // NEU: Wenn noch kein Typ gewählt wurde, zeige Auswahlmenü
        if (!session.actionType) {
            const selectionEmbed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('🎯 Strafverwaltung - Modus wählen')
                .setDescription(`**👤 Minecraft Spieler:** ${session.minecraftName}\n\nWähle aus, was du erstellen möchtest:`)
                .addFields(
                    { name: '⚖️ Strafe', value: 'Erstelle eine Strafverfügung mit Haftstrafe und Geldstrafe', inline: false },
                    { name: '🔍 Fahndung', value: 'Erstelle eine Fahndungsausschreibung (Wanted)', inline: false }
                )
                .setFooter({ text: 'Wähle den gewünschten Modus' })
                .setTimestamp();

            const modeRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`select_mode::${sessionId}::strafe`)
                        .setLabel('Strafe erstellen')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('⚖️'),
                    new ButtonBuilder()
                        .setCustomId(`select_mode::${sessionId}::wanted`)
                        .setLabel('Fahndung erstellen')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🔍'),
                    new ButtonBuilder()
                        .setCustomId(`cancel::${sessionId}`)
                        .setLabel('Abbrechen')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('❌')
                );

            if (isInitial) {
                await interaction.reply({
                    embeds: [selectionEmbed],
                    components: [modeRow]
                });
            } else {
                await interaction.update({
                    embeds: [selectionEmbed],
                    components: [modeRow]
                });
            }
            return;
        }
        
        const crimeGroups = {
            '§12 - StVO': [],
            '§13 - Betäubungsmittelgesetz': [],
            '§14 - Gewerberecht': [],
            '§15 - Wirtschaftskriminalität': [],
            '§16 - Waffendelikte': [],
            '§17 - Körperliche Integrität': [],
            '§18 - Umgang mit Beamten': [],
            '§19 - Sonstige Delikte': [],
            '§1-9 - LuftVG': []
        };

        for (const [crimeName, crimeData] of Object.entries(strafkatalog)) {
            const paragraf = crimeData?.paragraf || '';
            if (paragraf.includes('§12')) crimeGroups['§12 - StVO'].push(crimeName);
            else if (paragraf.includes('§13')) crimeGroups['§13 - Betäubungsmittelgesetz'].push(crimeName);
            else if (paragraf.includes('§14')) crimeGroups['§14 - Gewerberecht'].push(crimeName);
            else if (paragraf.includes('§15')) crimeGroups['§15 - Wirtschaftskriminalität'].push(crimeName);
            else if (paragraf.includes('§16')) crimeGroups['§16 - Waffendelikte'].push(crimeName);
            else if (paragraf.includes('§17')) crimeGroups['§17 - Körperliche Integrität'].push(crimeName);
            else if (paragraf.includes('§18')) crimeGroups['§18 - Umgang mit Beamten'].push(crimeName);
            else if (paragraf.includes('§19')) crimeGroups['§19 - Sonstige Delikte'].push(crimeName);
            else if (paragraf.match(/§[1-9](?!\d)/)) crimeGroups['§1-9 - LuftVG'].push(crimeName);
        }

        const allDropdowns = [];
        for (const [groupName, crimes] of Object.entries(crimeGroups)) {
            if (crimes.length === 0) continue;
            const chunks = this.chunkArray(crimes, 25);
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const suffix = chunks.length > 1 ? ` (${i + 1}/${chunks.length})` : '';
                const options = chunk.map(crime => {
                    const crimeData = strafkatalog[crime] || {};
                    return {
                        label: crime.replace(/_/g, ' ').substring(0, 100),
                        value: crime,
                        description: `${crimeData.paragraf || 'N/A'} | ${crimeData.haft || 0}HE | ${crimeData.geld || 0}€`.substring(0, 100)
                    };
                });
                const menu = new StringSelectMenuBuilder()
                    .setCustomId(`crime_select::${sessionId}::${allDropdowns.length}`)
                    .setPlaceholder(`${groupName}${suffix}`)
                    .setMinValues(0)
                    .setMaxValues(Math.min(options.length, 25))
                    .addOptions(options);
                allDropdowns.push({ menu, name: `${groupName}${suffix}`, count: chunk.length });
            }
        }

        const dropdownsPerPage = 2;
        const totalPages = Math.ceil(allDropdowns.length / dropdownsPerPage);
        const currentPage = Math.min(page, totalPages - 1);
        const startIndex = currentPage * dropdownsPerPage;
        const endIndex = Math.min(startIndex + dropdownsPerPage, allDropdowns.length);
        const pageDropdowns = allDropdowns.slice(startIndex, endIndex);

        const totalCrimes = Object.values(crimeGroups).flat().length;
        let totalHaft = 0, totalGeldstrafe = 0, crimesList = '';
        for (const crime of session.selectedCrimes) {
            const crimeData = strafkatalog[crime];
            if (crimeData) {
                totalHaft += crimeData.haft || 0;
                totalGeldstrafe += crimeData.geld || 0;
                crimesList += `• ${crime.replace(/_/g, ' ')} (${crimeData.paragraf || 'N/A'})\n`;
            }
        }

        const extraHaftFromDebt = Math.ceil(session.extraDebt / 1000);
        let finalHaft = totalHaft + extraHaftFromDebt;
        const totalZuZahlen = totalGeldstrafe;
        
        if (!isWanted && session.gestellt) {
            finalHaft = Math.max(0, finalHaft - session.gestelltBonus);
        }

        const titleIcon = isWanted ? '🔍' : '🚨';
        const titleText = isWanted ? 'Fahndungs-Verwaltung' : 'Strafverwaltung';
        const embedColor = isWanted ? '#e67e22' : (session.selectedCrimes.length > 0 || session.extraDebt > 0 ? '#ff6b6b' : '#6c757d');

        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`${titleIcon} ${titleText} - Control Panel`)
            .setDescription(
                `**👤 Minecraft Spieler:** ${session.minecraftName}\n` +
                `**🎯 Modus:** ${isWanted ? '🔍 Fahndung' : '⚖️ Strafe'}\n` +
                `**📋 Status:** ${session.gestellt ? `✅ Gestellt (-${session.gestelltBonus} HE)` : '❌ Nicht gestellt'}\n` +
                `**📢 Ausgewählte Delikte:** ${session.selectedCrimes.length} von ${totalCrimes}\n` +
                `**💰 Extra Ingame-Schulden:** ${session.extraDebt.toLocaleString()}€ (= ${extraHaftFromDebt} HE)\n` +
                `**📄 Seite:** ${currentPage + 1}/${totalPages}\n\n` +
                (crimesList || 'Keine Delikte ausgewählt') +
                (session.selectedCrimes.length > 0 || session.extraDebt > 0 ? 
                    `\n**⚖️ ${isWanted ? 'Fahndungs' : 'Straf'}übersicht:**\n` +
                    `• Basis-Haft: ${totalHaft} HE (${formatTime(totalHaft * 10)})\n` +
                    `• Extra-Haft (Schulden → HE): +${extraHaftFromDebt} HE (${formatTime(extraHaftFromDebt * 10)})\n` +
                    (!isWanted && session.gestellt && session.gestelltBonus > 0 ? 
                        `• Gestellt-Bonus: -${session.gestelltBonus} HE\n` : '') +
                    `• **Gesamt-Haft: ${finalHaft} HE (${formatTime(finalHaft * 10)})**\n` +
                    `• Geldstrafe (nur Delikte): ${totalGeldstrafe.toLocaleString()}€\n` +
                    `• **Gesamt zu zahlen: ${totalZuZahlen.toLocaleString()}€**\n` +
                    (isWanted ? '' : `• Zahlungszeit: ${config?.botSettings?.zahlungszeit || 14} Tage`) : ''
                )
            )
            .setFooter({ 
                text: `Session: ${sessionId.split('-')[1]} | Seite ${currentPage + 1}/${totalPages} | Auto-Refresh: 2h`
            })
            .setTimestamp();

        const components = [];
        
        const maxDropdowns = Math.min(pageDropdowns.length, 2);
        for (let i = 0; i < maxDropdowns; i++) {
            components.push(new ActionRowBuilder().addComponents(pageDropdowns[i].menu));
        }

        const navigationRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`prev_page::${sessionId}`)
                    .setLabel('◀')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId(`next_page::${sessionId}`)
                    .setLabel('▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage >= totalPages - 1),
                new ButtonBuilder()
                    .setCustomId(`toggle_gestellt::${sessionId}`)
                    .setLabel(session.gestellt ? `Gestellt (-${session.gestelltBonus} HE)` : 'Nicht Gestellt')
                    .setStyle(session.gestellt ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setEmoji(session.gestellt ? '✅' : '🏃')
                    .setDisabled(isWanted),
                new ButtonBuilder()
                    .setCustomId(`add_debt::${sessionId}`)
                    .setLabel('Extra Schulden')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId(`clear_debt::${sessionId}`)
                    .setLabel('Reset')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🧹')
                    .setDisabled(session.extraDebt === 0)
            );

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`generate_command::${sessionId}`)
                    .setLabel(isWanted ? 'Fahndung erstellen' : 'Strafe erstellen')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(isWanted ? '🔍' : '⚡')
                    .setDisabled(session.selectedCrimes.length === 0 && session.extraDebt === 0),
                new ButtonBuilder()
                    .setCustomId(`clear_selection::${sessionId}`)
                    .setLabel('Löschen')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️'),
                new ButtonBuilder()
                    .setCustomId(`cancel::${sessionId}`)
                    .setLabel('Abbrechen')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌')
            );

        components.push(navigationRow, actionRow);
        session.currentPage = currentPage;

        if (isInitial) {
            await interaction.reply({
                embeds: [embed],
                components: components
            });
        } else {
            await interaction.update({
                embeds: [embed],
                components: components
            });
        }
    },

    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    },

    async handleSelectInteraction(interaction) {
        const [type, sessionId] = interaction.customId.split('::');
        const session = sessions.get(sessionId);

        if (!session) {
            return interaction.reply({
                content: '❌ Session nicht gefunden!',
                ephemeral: true
            });
        }

        const newCrimes = interaction.values.filter(crime => !session.selectedCrimes.includes(crime));
        session.selectedCrimes.push(...newCrimes);
        session.selectedCrimes = [...new Set(session.selectedCrimes)];

        await this.showPage(interaction, sessionId, session.currentPage);
    },

    async handleButtonInteraction(interaction) {
        const [action, sessionId, extraParam] = interaction.customId.split('::');
        
        if (action === 'convert_to_strafe') {
            const wantedNumber = sessionId;
            return await this.handleWantedToStrafeConversion(interaction, wantedNumber);
        }
        
        // NEU: Akte schließen Button
        if (action === 'close_akte') {
            return await this.handleCloseAkte(interaction, sessionId);
        }
        
        const session = sessions.get(sessionId);

        if (!session) {
            return interaction.reply({
                content: '❌ Session nicht gefunden!',
                ephemeral: true
            });
        }

        try {
            switch (action) {
                case 'select_mode':
                    // NEU: Modus auswählen
                    const mode = extraParam;
                    session.actionType = mode;
                    await this.showPage(interaction, sessionId, 0);
                    break;
                case 'prev_page':
                    await this.showPage(interaction, sessionId, Math.max(0, session.currentPage - 1));
                    break;
                case 'next_page':
                    await this.showPage(interaction, sessionId, session.currentPage + 1);
                    break;
                case 'toggle_gestellt':
                    if (session.actionType === 'wanted') {
                        return await interaction.reply({
                            content: '❌ Gestellt-Status ist nur bei Strafen verfügbar, nicht bei Fahndungen!',
                            ephemeral: true
                        });
                    }
                    await this.showGestelltMenu(interaction, sessionId);
                    break;
                case 'set_gestellt_bonus':
                    const bonusAmount = parseInt(extraParam) || 0;
                    session.gestellt = bonusAmount > 0;
                    session.gestelltBonus = bonusAmount;
                    await this.showPage(interaction, sessionId, session.currentPage);
                    break;
                case 'add_debt':
                    await this.showDebtModal(interaction, sessionId);
                    break;
                case 'clear_debt':
                    session.extraDebt = 0;
                    await this.showPage(interaction, sessionId, session.currentPage);
                    break;
                case 'clear_selection':
                    session.selectedCrimes = [];
                    session.extraDebt = 0;
                    session.gestellt = false;
                    session.gestelltBonus = 0;
                    await this.showPage(interaction, sessionId, session.currentPage);
                    break;
                case 'generate_command':
                    await this.generateCommand(interaction, sessionId);
                    break;
                case 'cancel':
                    sessions.delete(sessionId);
                    for (const [panelId, panelData] of activePanels.entries()) {
                        if (panelData.sessionId === sessionId) {
                            activePanels.delete(panelId);
                        }
                    }
                    await interaction.update({
                        content: '❌ Verwaltung abgebrochen.',
                        embeds: [],
                        components: []
                    });
                    break;
                default:
                    console.warn(`Unbekannte Button-Aktion: ${action}`);
                    await interaction.reply({
                        content: '❌ Unbekannte Aktion!',
                        ephemeral: true
                    });
                    break;
            }
        } catch (error) {
            console.error('Fehler in handleButtonInteraction:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Ein Fehler ist aufgetreten!',
                    ephemeral: true
                }).catch(console.error);
            }
        }
    },

    // NEU: Akte schließen Handler
    async handleCloseAkte(interaction, channelId) {
        // Prüfe Berechtigung
        if (!interaction.member.roles.cache.has(AKTEN_CLOSE_ROLE_ID)) {
            return await interaction.reply({
                content: '❌ Du hast keine Berechtigung, Akten zu schließen!',
                ephemeral: true
            });
        }

        const aktenInfo = aktenTracking.get(channelId);
        if (!aktenInfo) {
            return await interaction.reply({
                content: '❌ Diese Akte wurde nicht im System gefunden!',
                ephemeral: true
            });
        }

        // Bestätigungsnachricht
        const confirmEmbed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('⚠️ Akte schließen bestätigen')
            .setDescription(`Möchtest du wirklich die Akte für **${aktenInfo.minecraftName}** schließen und löschen?`)
            .addFields(
                { name: '👤 Spieler', value: aktenInfo.minecraftName, inline: true },
                { name: '📅 Erstellt', value: `<t:${Math.floor(aktenInfo.createdAt / 1000)}:R>`, inline: true }
            )
            .setFooter({ text: 'Diese Aktion kann nicht rückgängig gemacht werden!' });

        const confirmRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_close_akte::${channelId}`)
                    .setLabel('Ja, Akte schließen')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️'),
                new ButtonBuilder()
                    .setCustomId(`cancel_close_akte::${channelId}`)
                    .setLabel('Abbrechen')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌')
            );

        await interaction.reply({
            embeds: [confirmEmbed],
            components: [confirmRow],
            ephemeral: true
        });
    },

    async showGestelltMenu(interaction, sessionId) {
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('✅ Gestellt-Status auswählen')
            .setDescription('Wähle aus, wie viele Hafteinheiten als Gestellt-Bonus abgezogen werden sollen:')
            .addFields(
                { name: '🏃 Nicht Gestellt', value: 'Kein Bonus (-0 HE)', inline: false },
                { name: '✅ Gestellt (1 HE)', value: 'Standard-Bonus (-1 HE)', inline: false },
                { name: '✅✅ Gestellt (2 HE)', value: 'Erhöhter Bonus (-2 HE)', inline: false }
            )
            .setFooter({ text: 'Wähle die passende Option für diese Situation' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`set_gestellt_bonus::${sessionId}::0`)
                    .setLabel('Nicht Gestellt (0 HE)')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏃'),
                new ButtonBuilder()
                    .setCustomId(`set_gestellt_bonus::${sessionId}::1`)
                    .setLabel('Gestellt (-1 HE)')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`set_gestellt_bonus::${sessionId}::2`)
                    .setLabel('Gestellt (-2 HE)')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            );

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    },

    async handleWantedToStrafeConversion(interaction, wantedNumber) {
        const conversionData = global.wantedConversions?.get(wantedNumber);
        
        if (!conversionData) {
            return interaction.reply({
                content: '❌ Fahndungsdaten nicht gefunden! Die Konvertierung ist möglicherweise zu alt.',
                ephemeral: true
            });
        }

        const strafkatalog = conversionData.allCrimes;
        let totalHaft = 0, totalGeldstrafe = 0;
        
        for (const crime of conversionData.selectedCrimes) {
            const crimeData = strafkatalog[crime];
            if (crimeData) {
                totalHaft += crimeData.haft || 0;
                totalGeldstrafe += crimeData.geld || 0;
            }
        }

        const extraHaftFromDebt = Math.ceil(conversionData.extraDebt / 1000);
        let finalHaft = totalHaft + extraHaftFromDebt;
        const totalZuZahlen = totalGeldstrafe;
        
        if (conversionData.gestellt) {
            finalHaft = Math.max(0, finalHaft - (conversionData.gestelltBonus || 1));
        }

        const zahlungszeit = config?.botSettings?.zahlungszeit || 14;
        
        let reason = [];
        if (conversionData.selectedCrimes.length > 0) {
            reason.push(`Delikte: ${conversionData.selectedCrimes.join(', ')}`);
        }
        if (conversionData.extraDebt > 0) {
            reason.push(`Abgelehnte/Vergessene Zahlungen (in HE umgewandelt): ${conversionData.extraDebt.toLocaleString()}€`);
        }
        
        const strafeCommand = `/strafe ${conversionData.minecraftName} ${finalHaft} ${totalZuZahlen} ${zahlungszeit} ${reason.join(' | ')}`;

        const commandEmbed = new EmbedBuilder()
            .setColor('#27ae60')
            .setTitle('🎮 Strafe-Befehl (aus Fahndung konvertiert)')
            .setDescription(`**Konvertiert von Fahndung zu Strafe für:** \`${conversionData.minecraftName}\``)
            .addFields(
                { name: '🔍 Ursprüngliche Fahndung', value: `ID: ${wantedNumber}`, inline: true },
                { name: '👮 Konvertiert von', value: `<@${interaction.user.id}>`, inline: true },
                { name: '📅 Konvertiert am', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '📋 Minecraft-Befehl', value: `\`\`\`${strafeCommand}\`\`\``, inline: false },
                { name: '🛏️ Haftstrafe', value: `${finalHaft} HE (${formatTime(finalHaft * 10)})`, inline: true },
                { name: '💰 Zu zahlen', value: `${totalZuZahlen.toLocaleString()}€`, inline: true },
                { name: '⏰ Zahlungsfrist', value: `${zahlungszeit} Tage`, inline: true }
            )
            .setFooter({ text: 'Kopiere den Befehl und führe ihn im Spiel aus.' })
            .setTimestamp();

        await this.addConversionEntryToPlayerFile(interaction, conversionData, {
            wantedNumber,
            finalHaft,
            totalHaft,
            extraHaftFromDebt,
            totalZuZahlen,
            totalGeldstrafe,
            zahlungszeit,
            strafeCommand
        });

        await interaction.reply({
            embeds: [commandEmbed],
            ephemeral: true
        });

        global.wantedConversions?.delete(wantedNumber);
    },

    async showDebtModal(interaction, sessionId) {
        const modal = new ModalBuilder()
            .setCustomId(`debt_modal::${sessionId}`)
            .setTitle('💰 Extra Ingame-Schulden hinzufügen');

        const debtInput = new TextInputBuilder()
            .setCustomId('debt_amount')
            .setLabel('Betrag in Euro (nur Zahl)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('z.B. 5000 (wird in Hafteinheiten umgewandelt)')
            .setRequired(true)
            .setMaxLength(10);

        const firstActionRow = new ActionRowBuilder().addComponents(debtInput);
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
    },

    async handleModalSubmit(interaction) {
        try {
            const [type, sessionId] = interaction.customId.split('::');
            
            // NEU: Handle Akte-Schließen-Bestätigung
            if (type === 'confirm_close_akte') {
                const channelId = sessionId;
                const aktenInfo = aktenTracking.get(channelId);
                
                if (!aktenInfo) {
                    return await interaction.update({
                        content: '❌ Akte nicht gefunden!',
                        embeds: [],
                        components: []
                    });
                }

                const closeEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('🗑️ Akte wird geschlossen')
                    .setDescription(`Die Akte für **${aktenInfo.minecraftName}** wird nun gelöscht.`)
                    .addFields(
                        { name: '👮 Geschlossen von', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '📅 Geschlossen am', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setFooter({ text: 'Manuell geschlossen | Polizei-System' })
                    .setTimestamp();

                await interaction.update({
                    content: '✅ Akte wird gelöscht...',
                    embeds: [closeEmbed],
                    components: []
                });

                // Lösche Channel nach 5 Sekunden
                setTimeout(async () => {
                    try {
                        const channel = interaction.channel;
                        await channel.delete('Manuell durch Beamten geschlossen');
                        aktenTracking.delete(channelId);
                        saveAktenTracking();
                        console.log(`✅ Akte manuell geschlossen: ${aktenInfo.minecraftName}`);
                    } catch (error) {
                        console.error('Fehler beim Schließen der Akte:', error);
                    }
                }, 5000);
                
                return;
            }

            if (type === 'cancel_close_akte') {
                return await interaction.update({
                    content: '❌ Akte schließen abgebrochen.',
                    embeds: [],
                    components: []
                });
            }

            const session = sessions.get(sessionId);

            if (!session || session.userId !== interaction.user.id) {
                return await interaction.reply({
                    content: '❌ Session nicht gefunden oder nicht berechtigt!',
                    ephemeral: true
                });
            }

            if (type === 'debt_modal') {
                const debtAmountStr = interaction.fields.getTextInputValue('debt_amount').trim();
                const debtAmount = parseInt(debtAmountStr.replace(/[^\d]/g, ''));
                
                if (isNaN(debtAmount) || debtAmount < 0 || debtAmount > 999999999) {
                    return await interaction.reply({
                        content: '❌ Bitte gib eine gültige Zahl zwischen 0 und 999.999.999 ein!',
                        ephemeral: true
                    });
                }

                session.extraDebt = debtAmount;
                const extraHaft = Math.ceil(debtAmount / 1000);
                
                await interaction.reply({
                    content: `✅ Extra Ingame-Schulden hinzugefügt: **${debtAmount.toLocaleString()}€**\n` +
                             `💡 Wird in **${extraHaft} HE** zusätzliche Haft umgewandelt (aufgerundet)\n` +
                             `ℹ️ Die ${debtAmount.toLocaleString()}€ werden NICHT als Geldstrafe hinzugefügt, sondern nur in Hafteinheiten umgerechnet!\n\n` +
                             `🔄 Panel wird aktualisiert...`,
                    ephemeral: true
                });
                
                setTimeout(async () => {
                    try {
                        const channel = interaction.channel;
                        const messages = await channel.messages.fetch({ limit: 20 });
                        const controlPanelMessage = messages.find(msg => 
                            msg.author.bot && 
                            msg.embeds.length > 0 && 
                            msg.embeds[0].title && 
                            msg.embeds[0].title.includes('Control Panel')
                        );
                        
                        if (controlPanelMessage && session) {
                            const fakeInteraction = {
                                update: async (data) => {
                                    await controlPanelMessage.edit(data);
                                }
                            };
                            
                            await this.showPage(fakeInteraction, sessionId, session.currentPage);
                            
                            try {
                                await interaction.editReply({
                                    content: `✅ Extra Ingame-Schulden erfolgreich hinzugefügt!\n💰 **${debtAmount.toLocaleString()}€** = **${extraHaft} HE** zusätzliche Haft\n🔄 Panel wurde aktualisiert.`
                                });
                            } catch (editError) {
                                // Ignore
                            }
                        }
                    } catch (updateError) {
                        console.error('Fehler beim Panel-Update nach Modal:', updateError);
                        try {
                            await interaction.editReply({
                                content: `✅ Schulden hinzugefügt: **${debtAmount.toLocaleString()}€** = **${extraHaft} HE**\n⚠️ Panel-Update fehlgeschlagen - verwende die Navigation zum Aktualisieren.`
                            });
                        } catch (editError) {
                            // Ignore
                        }
                    }
                }, 1500);
            }
        } catch (error) {
            console.error('Fehler beim Modal-Submit:', error);
            try {
                if (!interaction.replied) {
                    await interaction.reply({
                        content: '❌ Ein Fehler ist aufgetreten. Bitte versuche es erneut.',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error('Fehler beim Fehler-Reply:', replyError);
            }
        }
    },

    async generateCommand(interaction, sessionId) {
        const session = sessions.get(sessionId);
        if (!session || (session.selectedCrimes.length === 0 && session.extraDebt === 0)) return;

        const isWanted = session.actionType === 'wanted';
        
        if (isWanted) {
            await this.generateWantedCommand(interaction, sessionId);
        } else {
            await this.generateStrafeCommand(interaction, sessionId);
        }
    },

    async generateWantedCommand(interaction, sessionId) {
        const session = sessions.get(sessionId);
        const strafkatalog = session.allCrimes;

        let crimesWithParagraf = [];
        let totalHaft = 0;
        
        for (const crime of session.selectedCrimes) {
            const crimeData = strafkatalog[crime];
            if (crimeData) {
                totalHaft += crimeData.haft || 0;
                crimesWithParagraf.push(`${crime.replace(/_/g, ' ')} (${crimeData.paragraf || 'N/A'})`);
            }
        }

        const extraHaft = Math.ceil(session.extraDebt / 1000);
        const finalHaft = totalHaft + extraHaft;

        const wantedCommand = `/polizei-wanted ${session.minecraftName} ${crimesWithParagraf.join(', ')} ${finalHaft}`;

        await this.createWantedFile(interaction, session, {
            finalHaft,
            totalHaft,
            extraHaft,
            crimesWithParagraf,
            wantedCommand
        });

        const resultEmbed = new EmbedBuilder()
            .setColor('#e67e22')
            .setTitle('🔍 Fahndung erstellt')
            .setDescription(`**Fahndung für:** \`${session.minecraftName}\``)
            .addFields(
                { name: '👤 Spieler', value: `\`${session.minecraftName}\``, inline: true },
                { name: '🛏️ Haft-Einheiten', value: `**${finalHaft} HE** (${formatTime(finalHaft * 10)})`, inline: true },
                { name: '📊 Haft-Berechnung', value: 
                    `• Basis: ${totalHaft} HE\n` +
                    (extraHaft > 0 ? `• Schulden: +${extraHaft} HE\n` : '') +
                    `• **Gesamt: ${finalHaft} HE**`, inline: false }
            );

        if (crimesWithParagraf.length > 0) {
            resultEmbed.addFields({ name: '📋 Delikte', value: crimesWithParagraf.join('\n'), inline: false });
        }

        const commandEmbed = new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('🎮 Wanted-Befehl')
            .setDescription(`\`\`\`${wantedCommand}\`\`\``)
            .setFooter({ text: 'Kopiere den Befehl und führe ihn im Spiel aus.' });

        await interaction.update({
            embeds: [resultEmbed, commandEmbed],
            components: []
        });

        sessions.delete(sessionId);
    },

    async generateStrafeCommand(interaction, sessionId) {
        const session = sessions.get(sessionId);
        const strafkatalog = session.allCrimes;

        let totalHaft = 0, totalGeldstrafe = 0, crimesList = [];
        for (const crime of session.selectedCrimes) {
            const crimeData = strafkatalog[crime];
            if (crimeData) {
                totalHaft += crimeData.haft || 0;
                totalGeldstrafe += crimeData.geld || 0;
                crimesList.push(`• ${crime.replace(/_/g, ' ')} (${crimeData.paragraf || 'N/A'})`);
            }
        }

        const extraHaftFromDebt = Math.ceil(session.extraDebt / 1000);
        let finalHaft = totalHaft + extraHaftFromDebt;
        const totalZuZahlen = totalGeldstrafe;
        
        if (session.gestellt) {
            finalHaft = Math.max(0, finalHaft - session.gestelltBonus);
        }

        const zahlungszeit = config?.botSettings?.zahlungszeit || 14;
        
        let reason = [];
        if (session.selectedCrimes.length > 0) {
            reason.push(`Delikte: ${session.selectedCrimes.join(', ')}`);
        }
        if (session.extraDebt > 0) {
            reason.push(`Abgelehnte/Vergessene Zahlungen (in HE umgewandelt): ${session.extraDebt.toLocaleString()}€`);
        }
        
        const strafeCommand = `/strafe ${session.minecraftName} ${finalHaft} ${totalZuZahlen} ${zahlungszeit} ${reason.join(' | ')}`;

        await this.createPlayerFile(interaction, session, {
            totalFinalHaft: finalHaft,
            totalZuZahlen,
            zahlungszeit,
            finalHaft,
            extraHaftFromDebt,
            totalHaft,
            totalGeldstrafe,
            crimesList,
            minecraftCommand: strafeCommand
        });

        const resultEmbed = new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('⚡ Strafverwaltung - Ergebnis')
            .setDescription(`**Strafe für:** \`${session.minecraftName}\``)
            .addFields(
                { name: '👤 Spieler', value: `\`${session.minecraftName}\``, inline: true },
                { name: '🛏️ Haft-Einheiten', value: `**${finalHaft} HE** (${formatTime(finalHaft * 10)})`, inline: true },
                { name: '💰 Gesamt zu zahlen', value: `**${totalZuZahlen.toLocaleString()}€**`, inline: true },
                { name: '📊 Haft-Aufschlüsselung', value: 
                    `• Basis: ${totalHaft} HE\n` +
                    `• Extra-Schulden → HE: +${extraHaftFromDebt} HE\n` +
                    (session.gestellt && session.gestelltBonus > 0 ? `• Gestellt-Bonus: -${session.gestelltBonus} HE\n` : '') +
                    `• **Total: ${finalHaft} HE**`, inline: false },
                { name: '💳 Zahlungs-Aufschlüsselung', value: 
                    `• Geldstrafen (nur Delikte): ${totalGeldstrafe.toLocaleString()}€\n` +
                    `• Extra Schulden: ${session.extraDebt.toLocaleString()}€ (in HE umgewandelt, nicht zu zahlen)\n` +
                    `• **Gesamt zu zahlen: ${totalZuZahlen.toLocaleString()}€**`, inline: false }
            );

        if (crimesList.length > 0) {
            resultEmbed.addFields({ name: '📋 Delikte', value: crimesList.join('\n'), inline: false });
        }

        resultEmbed.addFields(
            { name: '✅ Gestellt', value: session.gestellt ? `Ja 🟢 (-${session.gestelltBonus} HE)` : 'Nein 🔴', inline: true },
            { name: '⌛ Zahlungszeit', value: `${zahlungszeit} Tage`, inline: true }
        )
        .setFooter({ text: `Community-Strafverwaltung | ${new Date().toLocaleString()}` })
        .setTimestamp();

        const commandEmbed = new EmbedBuilder()
            .setColor('#27ae60')
            .setTitle('🎮 Minecraft-Befehl')
            .setDescription(`\`\`\`${strafeCommand}\`\`\``)
            .addFields({ name: '📋 Befehl zum Kopieren', value: `\`${strafeCommand}\`` })
            .setFooter({ text: 'Kopiere den Befehl und führe ihn im Spiel aus.' });

        const copyButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('copy_command')
                .setLabel('Befehl kopieren')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📋')
        );

        await interaction.update({
            embeds: [resultEmbed, commandEmbed],
            components: [copyButton]
        });

        sessions.delete(sessionId);
    },

    async addConversionEntryToPlayerFile(interaction, conversionData, conversionDetails) {
        try {
            const guild = interaction.guild;
            const filesCategoryId = '1420749276916486174';
            
            const playerChannel = guild.channels.cache.find(channel => 
                channel.name.toLowerCase() === `akte-${conversionData.minecraftName.toLowerCase()}` && 
                channel.parentId === filesCategoryId
            );

            if (!playerChannel) {
                console.log(`Keine Akte für ${conversionData.minecraftName} gefunden - Konvertierung wird nicht dokumentiert`);
                return;
            }

            const conversionEmbed = new EmbedBuilder()
                .setColor('#f39c12')
                .setTitle(`⚖️ Fahndung zu Strafe konvertiert`)
                .setDescription(`**Konvertierung für:** \`${conversionData.minecraftName}\``)
                .addFields(
                    { name: '🔍 Ursprüngliche Fahndung', value: `ID: ${conversionDetails.wantedNumber}`, inline: true },
                    { name: '👮 Konvertiert von', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                    { name: '📅 Konvertiert am', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '🛏️ Endgültige Haftstrafe', value: `**${conversionDetails.finalHaft} HE** (${formatTime(conversionDetails.finalHaft * 10)})`, inline: true },
                    { name: '💰 Zu zahlen', value: `**${conversionDetails.totalZuZahlen.toLocaleString()}€**`, inline: true },
                    { name: '⏰ Zahlungsfrist', value: `${conversionDetails.zahlungszeit} Tage`, inline: true }
                );

            let breakdown = `• Basis-Haft: ${conversionDetails.totalHaft} HE\n`;
            if (conversionDetails.extraHaftFromDebt > 0) {
                breakdown += `• Extra-Schulden-Haft: +${conversionDetails.extraHaftFromDebt} HE\n`;
            }
            if (conversionData.gestellt && conversionData.gestelltBonus > 0) {
                breakdown += `• Gestellt-Bonus: -${conversionData.gestelltBonus} HE\n`;
            }
            breakdown += `• **Gesamt: ${conversionDetails.finalHaft} HE**`;
            
            let paymentBreakdown = '';
            if (conversionDetails.totalGeldstrafe > 0) {
                paymentBreakdown += `• Geldstrafen (Delikte): ${conversionDetails.totalGeldstrafe.toLocaleString()}€\n`;
            }
            if (conversionData.extraDebt > 0) {
                paymentBreakdown += `• Extra Schulden: ${conversionData.extraDebt.toLocaleString()}€ (in HE umgewandelt)\n`;
            }
            paymentBreakdown += `• **Gesamt zu zahlen: ${conversionDetails.totalZuZahlen.toLocaleString()}€**`;
            
            conversionEmbed.addFields(
                { name: '📊 Haft-Aufschlüsselung', value: breakdown, inline: false },
                { name: '💳 Zahlungs-Aufschlüsselung', value: paymentBreakdown, inline: false },
                { name: '🎮 Minecraft-Befehl', value: `\`\`\`${conversionDetails.strafeCommand}\`\`\``, inline: false }
            );

            conversionEmbed.setFooter({ text: `Konvertierung | Beamte/r: ${interaction.user.tag} | Polizei-System` })
                          .setTimestamp();

            await playerChannel.send({ 
                content: `⚖️ **Fahndung zu Strafe konvertiert** | Spieler: \`${conversionData.minecraftName}\``,
                embeds: [conversionEmbed] 
            });

            await this.updatePlayerFileOverview(playerChannel, interaction.user.id);

        } catch (error) {
            console.error('Fehler beim Hinzufügen des Konvertierungseintrags:', error);
        }
    },

    async createWantedFile(interaction, session, wantedData) {
        try {
            const guild = interaction.guild;
            const filesCategoryId = '1420749276916486174';
            const filesCategory = guild.channels.cache.get(filesCategoryId);
            
            if (!filesCategory) {
                console.error('Akten-Kategorie nicht gefunden!');
                return;
            }

            const existingChannel = guild.channels.cache.find(channel => 
                channel.name.toLowerCase() === `akte-${session.minecraftName.toLowerCase()}` && 
                channel.parentId === filesCategoryId
            );

            let playerChannel;
            
            if (existingChannel) {
                playerChannel = existingChannel;
            } else {
                playerChannel = await guild.channels.create({
                    name: `akte-${session.minecraftName.toLowerCase()}`,
                    type: 0,
                    parent: filesCategoryId,
                    topic: `Polizeiakte für ${session.minecraftName} | Erstellt: ${Date.now()}`,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone,
                            deny: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                        },
                        {
                            id: AKTEN_VIEW_ROLE_ID, // NEU: Nur diese Rolle kann sehen
                            allow: ['ViewChannel', 'ReadMessageHistory']
                        },
                        {
                            id: NON_PD_ROLE_ID,
                            deny: ['ViewChannel']
                        }
                    ]
                });

                // NEU: Tracking hinzufügen
                aktenTracking.set(playerChannel.id, {
                    createdAt: Date.now(),
                    minecraftName: session.minecraftName
                });
                saveAktenTracking();

                const welcomeEmbed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle(`📋 Polizeiakte: ${session.minecraftName}`)
                    .setDescription('**Übersicht aller polizeilichen Maßnahmen**\n\n⚠️ **Diese Akte wird automatisch nach 3 Tagen gelöscht!**')
                    .addFields(
                        { name: '👤 Spielername', value: session.minecraftName, inline: true },
                        { name: '📅 Akte erstellt', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        { name: '⏰ Läuft ab', value: `<t:${Math.floor((Date.now() + (3 * 24 * 60 * 60 * 1000)) / 1000)}:R>`, inline: true },
                        { name: '👮 Erstellt von', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '📊 Status', value: '🟢 Aktiv', inline: true },
                        { name: '🔢 Gesamt-Vorfälle', value: '1', inline: true }
                    )
                    .setThumbnail(`https://minotar.net/avatar/${session.minecraftName}/100`)
                    .setFooter({ text: 'Polizei-Verwaltungssystem | Auto-Delete nach 3 Tagen' })
                    .setTimestamp();

                // NEU: Akte-Schließen-Button
                const closeButton = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`close_akte::${playerChannel.id}`)
                        .setLabel('Akte schließen')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🗑️')
                );

                await playerChannel.send({ 
                    content: `📁 **Neue Akte erstellt für:** \`${session.minecraftName}\`\n> Alle zukünftigen Maßnahmen werden hier dokumentiert.\n> **Automatische Löschung in 3 Tagen!**`,
                    embeds: [welcomeEmbed],
                    components: [closeButton]
                });
            }

            const wantedNumber = `W-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
            const wantedEmbed = new EmbedBuilder()
                .setColor('#e67e22')
                .setTitle(`🔍 Fahndungsausschreibung #${wantedNumber}`)
                .setDescription(`**Fahndung gegen:** \`${session.minecraftName}\``)
                .addFields(
                    { name: '👮 Ausgeschrieben von', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                    { name: '📅 Ausschreibungszeit', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '🚨 Status', value: '🔍 **GESUCHT**', inline: true },
                    { name: '🛏️ Haftstrafe bei Ergreifung', value: `**${wantedData.finalHaft} HE** (${formatTime(wantedData.finalHaft * 10)})`, inline: true },
                    { name: '📊 Haft-Aufschlüsselung', value: 
                        `• Basis: ${wantedData.totalHaft} HE\n` +
                        (wantedData.extraHaft > 0 ? `• Schulden: +${wantedData.extraHaft} HE\n` : '') +
                        `• **Gesamt: ${wantedData.finalHaft} HE**`, inline: false }
                );

            if (wantedData.crimesWithParagraf.length > 0) {
                wantedEmbed.addFields({ 
                    name: '📋 Vorgeworfene Delikte', 
                    value: wantedData.crimesWithParagraf.map((crime, index) => `${index + 1}. ${crime}`).join('\n'), 
                    inline: false 
                });
            }

            wantedEmbed.addFields(
                { name: '🎮 Wanted-Befehl', value: `\`\`\`${wantedData.wantedCommand}\`\`\``, inline: false }
            )
            .setFooter({ text: `Fahndungs-ID: ${wantedNumber} | Beamte/r: ${interaction.user.tag} | Fahndungssystem` })
            .setTimestamp();

            const wantedConversionData = {
                minecraftName: session.minecraftName,
                selectedCrimes: session.selectedCrimes,
                extraDebt: session.extraDebt,
                gestellt: session.gestellt,
                gestelltBonus: session.gestelltBonus || 0,
                allCrimes: session.allCrimes
            };
            
            global.wantedConversions = global.wantedConversions || new Map();
            global.wantedConversions.set(wantedNumber, wantedConversionData);
            
            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`convert_to_strafe::${wantedNumber}`)
                    .setLabel('📝 Zu Strafe konvertieren')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('⚖️')
            );

            await playerChannel.send({ 
                content: `🔍 **Neue Fahndung dokumentiert** | Spieler: \`${session.minecraftName}\` ist jetzt **GESUCHT**`,
                embeds: [wantedEmbed],
                components: [actionRow]
            });

            await this.updatePlayerFileOverview(playerChannel, interaction.user.id);

        } catch (error) {
            console.error('Fehler beim Erstellen der Fahndungsakte:', error);
        }
    },

    async createPlayerFile(interaction, session, punishmentData) {
        try {
            const guild = interaction.guild;
            const filesCategoryId = '1420749276916486174';
            const filesCategory = guild.channels.cache.get(filesCategoryId);
            
            if (!filesCategory) {
                console.error('Akten-Kategorie nicht gefunden!');
                return;
            }

            const existingChannel = guild.channels.cache.find(channel => 
                channel.name.toLowerCase() === `akte-${session.minecraftName.toLowerCase()}` && 
                channel.parentId === filesCategoryId
            );

            let playerChannel;
            
            if (existingChannel) {
                playerChannel = existingChannel;
            } else {
                playerChannel = await guild.channels.create({
                    name: `akte-${session.minecraftName.toLowerCase()}`,
                    type: 0,
                    parent: filesCategoryId,
                    topic: `Polizeiakte für ${session.minecraftName} | Erstellt: ${Date.now()}`,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone,
                            deny: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                        },
                        {
                            id: AKTEN_VIEW_ROLE_ID, // NEU: Nur diese Rolle kann sehen
                            allow: ['ViewChannel', 'ReadMessageHistory']
                        },
                        {
                            id: NON_PD_ROLE_ID,
                            deny: ['ViewChannel']
                        }
                    ]
                });

                // NEU: Tracking hinzufügen
                aktenTracking.set(playerChannel.id, {
                    createdAt: Date.now(),
                    minecraftName: session.minecraftName
                });
                saveAktenTracking();

                const welcomeEmbed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle(`📋 Polizeiakte: ${session.minecraftName}`)
                    .setDescription('**Übersicht aller polizeilichen Maßnahmen**\n\n⚠️ **Diese Akte wird automatisch nach 3 Tagen gelöscht!**')
                    .addFields(
                        { name: '👤 Spielername', value: session.minecraftName, inline: true },
                        { name: '📅 Akte erstellt', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        { name: '⏰ Läuft ab', value: `<t:${Math.floor((Date.now() + (3 * 24 * 60 * 60 * 1000)) / 1000)}:R>`, inline: true },
                        { name: '👮 Erstellt von', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '📊 Status', value: '🟢 Aktiv', inline: true },
                        { name: '🔢 Gesamt-Vorfälle', value: '1', inline: true }
                    )
                    .setThumbnail(`https://minotar.net/avatar/${session.minecraftName}/100`)
                    .setFooter({ text: 'Polizei-Verwaltungssystem | Auto-Delete nach 3 Tagen' })
                    .setTimestamp();

                // NEU: Akte-Schließen-Button
                const closeButton = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`close_akte::${playerChannel.id}`)
                        .setLabel('Akte schließen')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🗑️')
                );

                await playerChannel.send({ 
                    content: `📁 **Neue Akte erstellt für:** \`${session.minecraftName}\`\n> Alle zukünftigen Strafverfügungen werden hier dokumentiert.\n> **Automatische Löschung in 3 Tagen!**`,
                    embeds: [welcomeEmbed],
                    components: [closeButton]
                });
            }

            const caseNumber = `S-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
            const crimeEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle(`🚨 Strafverfügung #${caseNumber}`)
                .setDescription(`**Verurteilung gegen:** \`${session.minecraftName}\``)
                .addFields(
                    { name: '👮 Bearbeitet von', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                    { name: '📅 Tatzeit/Verurteilung', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '📍 Status bei Verhaftung', value: session.gestellt ? `✅ Gestellt (-${session.gestelltBonus} HE)` : '❌ Flüchtig', inline: true }
                );

            if (session.selectedCrimes.length > 0) {
                const crimesText = session.selectedCrimes.map((crime, index) => {
                    const crimeData = session.allCrimes[crime] || {};
                    return `${index + 1}. **${crime.replace(/_/g, ' ')}**\n   └ ${crimeData.paragraf || 'N/A'} | ${crimeData.haft || 0} HE | ${crimeData.geld || 0}€`;
                }).join('\n');
                
                crimeEmbed.addFields({ name: '📋 Verurteilte Delikte', value: crimesText, inline: false });
            }

            crimeEmbed.addFields(
                { name: '🛏️ Haftstrafe', value: `**${punishmentData.totalFinalHaft} HE** (${formatTime(punishmentData.totalFinalHaft * 10)})`, inline: true },
                { name: '💰 Zu zahlen', value: `**${punishmentData.totalZuZahlen.toLocaleString()}€**`, inline: true },
                { name: '⏰ Zahlungsfrist', value: `${punishmentData.zahlungszeit} Tage`, inline: true }
            );

            let breakdown = `• Basis-Haft: ${punishmentData.totalHaft} HE\n`;
            if (punishmentData.extraHaftFromDebt > 0) {
                breakdown += `• Extra-Schulden-Haft: +${punishmentData.extraHaftFromDebt} HE\n`;
            }
            if (session.gestellt && session.gestelltBonus > 0) {
                breakdown += `• Gestellt-Bonus: -${session.gestelltBonus} HE\n`;
            }
            breakdown += `• **Gesamt: ${punishmentData.totalFinalHaft} HE**`;
            
            let paymentBreakdown = '';
            if (punishmentData.totalGeldstrafe > 0) {
                paymentBreakdown += `• Geldstrafen (Delikte): ${punishmentData.totalGeldstrafe.toLocaleString()}€\n`;
            }
            if (session.extraDebt > 0) {
                paymentBreakdown += `• Extra Schulden: ${session.extraDebt.toLocaleString()}€ (in HE umgewandelt)\n`;
            }
            paymentBreakdown += `• **Gesamt zu zahlen: ${punishmentData.totalZuZahlen.toLocaleString()}€**`;
            
            crimeEmbed.addFields(
                { name: '📊 Haft-Aufschlüsselung', value: breakdown, inline: false },
                { name: '💳 Zahlungs-Aufschlüsselung', value: paymentBreakdown, inline: false },
                { name: '🎮 Minecraft-Befehl', value: `\`\`\`${punishmentData.minecraftCommand}\`\`\``, inline: false }
            );

            crimeEmbed.setFooter({ text: `Fall-ID: ${caseNumber} | Beamte/r: ${interaction.user.tag} | Polizei-System` })
                     .setTimestamp();

            await playerChannel.send({ 
                content: `🚨 **Neue Strafverfügung dokumentiert** | Spieler: \`${session.minecraftName}\``,
                embeds: [crimeEmbed] 
            });

            await this.updatePlayerFileOverview(playerChannel, interaction.user.id);

        } catch (error) {
            console.error('Fehler beim Erstellen der Spielerakte:', error);
        }
    },

    async updatePlayerFileOverview(playerChannel, userId) {
        try {
            const messages = await playerChannel.messages.fetch({ limit: 50 });
            const messagesArray = Array.from(messages.values()).reverse();
            const firstMessage = messagesArray[0];
            
            if (firstMessage && firstMessage.embeds.length > 0) {
                const currentVorfaelle = messagesArray.length - 1;
                const aktenInfo = aktenTracking.get(playerChannel.id);
                const ablaufzeit = aktenInfo ? aktenInfo.createdAt + (3 * 24 * 60 * 60 * 1000) : Date.now() + (3 * 24 * 60 * 60 * 1000);
                
                const updatedEmbed = EmbedBuilder.from(firstMessage.embeds[0])
                    .setFields(
                        { name: '👤 Spielername', value: firstMessage.embeds[0].fields.find(f => f.name.includes('Spielername'))?.value || 'N/A', inline: true },
                        { name: '📅 Akte erstellt', value: firstMessage.embeds[0].fields.find(f => f.name.includes('Akte erstellt'))?.value || `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        { name: '⏰ Läuft ab', value: `<t:${Math.floor(ablaufzeit / 1000)}:R>`, inline: true },
                        { name: '👮 Erstellt von', value: firstMessage.embeds[0].fields.find(f => f.name.includes('Erstellt von'))?.value || `<@${userId}>`, inline: true },
                        { name: '📊 Status', value: '🟢 Aktiv', inline: true },
                        { name: '🔢 Gesamt-Vorfälle', value: `${currentVorfaelle}`, inline: true }
                    );
                
                await firstMessage.edit({ 
                    content: firstMessage.content,
                    embeds: [updatedEmbed],
                    components: firstMessage.components
                });
            }
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Akte-Übersicht:', error);
        }
    }
};

// NEU: Global Client Referenz setzen für Auto-Delete
if (typeof global !== 'undefined') {
    global.aktenAutoDeleteModule = module.exports;
}