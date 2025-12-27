const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('funk-generate')
        .setDescription('Generiert einen zufälligen 3-stelligen Funk-Code'),
    
    async execute(interaction) {
        // Generiere eine zufällige 3-stellige Zahl (100-999)
        const funkCode = Math.floor(Math.random() * 900) + 100;
        
        // Sende den Code als private Nachricht (ephemeral)
        await interaction.reply({
            content: `🎯 Dein generierter Funk-Code: **${funkCode}**`,
            ephemeral: true
        });
    },
};