const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        const logChannel = newState.guild.channels.cache.find(ch => ch.name === 'voice-logs');
        if (!logChannel) return;

        const member = newState.member;
        
        // User joined voice channel
        if (!oldState.channel && newState.channel) {
            const embed = new EmbedBuilder()
                .setColor('#44ff44')
                .setTitle('🔊 Voice Channel beigetreten')
                .setDescription(`**${member.user.tag} ist einem Voice Channel beigetreten**`)
                .addFields(
                    { name: '👤 Benutzer', value: `${member.user.tag}`, inline: true },
                    { name: '📢 Channel', value: `${newState.channel.name}`, inline: true },
                    { name: '🕐 Zeit', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [embed] });
        }
        
        // User left voice channel
        else if (oldState.channel && !newState.channel) {
            const embed = new EmbedBuilder()
                .setColor('#ff4444')
                .setTitle('🔇 Voice Channel verlassen')
                .setDescription(`**${member.user.tag} hat einen Voice Channel verlassen**`)
                .addFields(
                    { name: '👤 Benutzer', value: `${member.user.tag}`, inline: true },
                    { name: '📢 Channel', value: `${oldState.channel.name}`, inline: true },
                    { name: '🕐 Zeit', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [embed] });
        }
        
        // User switched voice channels
        else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
            const embed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('🔄 Voice Channel gewechselt')
                .setDescription(`**${member.user.tag} hat den Voice Channel gewechselt**`)
                .addFields(
                    { name: '👤 Benutzer', value: `${member.user.tag}`, inline: true },
                    { name: '📢 Von Channel', value: `${oldState.channel.name}`, inline: true },
                    { name: '📢 Zu Channel', value: `${newState.channel.name}`, inline: true },
                    { name: '🕐 Zeit', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [embed] });
        }
    }
};