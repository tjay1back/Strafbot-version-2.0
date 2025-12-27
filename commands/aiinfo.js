const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

function createEmbed(title, description, color = '#5865F2') {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
}

function loadBotKnowledge() {
    let knowledge = { strafkatalog: null, commands: [] };

    try {
        const strafkatalogPath = path.join(__dirname, '..', 'data', 'strafkatalog.json');
        if (fs.existsSync(strafkatalogPath)) {
            knowledge.strafkatalog = JSON.parse(fs.readFileSync(strafkatalogPath, 'utf8'));
        }

        const commandFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.js'));
        knowledge.availableCommands = commandFiles.map(f => f.replace('.js', ''));
    } catch (error) {
        console.error('Error loading knowledge:', error);
    }

    return knowledge;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai-info')
        .setDescription('Zeigt KI Bot Informationen'),
    
    async execute(interaction) {
        const knowledge = loadBotKnowledge();
        
        const embed = createEmbed(
            '🤖 KI Bot Info',
            `**Model:** GPT-3.5-turbo (OpenAI)\n` +
            `**Commands geladen:** ${knowledge.availableCommands ? knowledge.availableCommands.length : 0}\n` +
            `**Strafkatalog:** ${knowledge.strafkatalog ? '✅ Geladen' : '❌ Nicht gefunden'}\n\n` +
            `**Verwendung:**\n\`/frage <nachricht>\`\n\n` +
            `**Beispiele:**\n` +
            `• \`/frage Was ist §211?\`\n` +
            `• \`/frage Wie benutze ich /strafe?\`\n` +
            `• \`/frage Welche Strafe für Mord?\``,
            '#5865F2'
        );

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};