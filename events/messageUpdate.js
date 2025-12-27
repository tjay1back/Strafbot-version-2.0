const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'messageUpdate',
    async execute(oldMessage, newMessage) {
        // Ignoriere Bot-Nachrichten und gleiche Inhalte
        if (newMessage.author?.bot) return;
        if (oldMessage.content === newMessage.content) return;
        
        const logChannel = newMessage.guild.channels.cache.find(ch => ch.name === 'message-logs');
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor('#ffaa00')
            .setTitle('✏️ Nachricht bearbeitet')
            .setDescription(`**Nachricht von ${newMessage.author} wurde bearbeitet**`)
            .addFields(
                { name: '👤 Autor', value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true },
                { name: '📍 Channel', value: `${newMessage.channel} (${newMessage.channel.name})`, inline: true },
                { name: '🕐 Bearbeitet um', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '📜 Alter Inhalt', value: oldMessage.content || '*Kein Inhalt*', inline: false },
                { name: '📝 Neuer Inhalt', value: newMessage.content || '*Kein Inhalt*', inline: false },
                { name: '🔗 Zur Nachricht', value: `[Klicke hier](${newMessage.url})`, inline: false }
            )
            .setFooter({ text: `Message ID: ${newMessage.id}` })
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
    }
};