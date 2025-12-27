const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'messageDelete',
    async execute(message) {
        // Ignoriere Bot-Nachrichten
        if (message.author?.bot) return;
        
        const logChannel = message.guild.channels.cache.find(ch => ch.name === 'message-logs');
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor('#ff4444')
            .setTitle('📝 Nachricht gelöscht')
            .setDescription(`**Nachricht von ${message.author} wurde gelöscht**`)
            .addFields(
                { name: '👤 Autor', value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: '📍 Channel', value: `${message.channel} (${message.channel.name})`, inline: true },
                { name: '🕐 Gelöscht um', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '💬 Inhalt', value: message.content || '*Kein Textinhalt*', inline: false }
            )
            .setFooter({ text: `Message ID: ${message.id}` })
            .setTimestamp();

        // Anhänge hinzufügen
        if (message.attachments.size > 0) {
            const attachments = message.attachments.map(att => `[${att.name}](${att.url})`).join('\n');
            embed.addFields({ name: '📎 Anhänge', value: attachments, inline: false });
        }

        await logChannel.send({ embeds: [embed] });
    }
};