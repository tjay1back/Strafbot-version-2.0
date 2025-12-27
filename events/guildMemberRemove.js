// ===== guildMemberRemove.js =====
const { EmbedBuilder: EmbedBuilder2 } = require('discord.js');

module.exports = {
  name: 'guildMemberRemove',
  once: false,
  async execute(member, client) {
    const LOGS_CHANNEL_ID = '1410596566053556224';
    const logsChannel = member.guild.channels.cache.get(LOGS_CHANNEL_ID);

    if (!logsChannel) return;

    // LEAVE LOG
    const leaveEmbed = new EmbedBuilder2()
      .setColor('#ff0000')
      .setTitle('👋 Mitglied verlassen')
      .setDescription(`${member.user.tag} hat den Server verlassen`)
      .addFields(
        { name: '👤 User', value: `${member.user} (${member.user.id})`, inline: true },
        { name: '⏱️ War dabei seit', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true },
        { name: '👥 Mitgliederzahl', value: `${member.guild.memberCount}`, inline: true },
        { name: '🎭 Username', value: `${member.user.username}`, inline: true },
        { name: '⏳ Zeitraum auf Server', value: `${calculateDuration(member.joinedTimestamp, Date.now())}`, inline: true }
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: member.guild.name })
      .setTimestamp();

    try {
      await logsChannel.send({ embeds: [leaveEmbed] });
    } catch (error) {
      console.error('Fehler beim Senden des Leave Logs:', error);
    }
  },
};

// Hilfsfunktion für Zeitberechnung
function calculateDuration(joinedTimestamp, leftTimestamp) {
  const ms = leftTimestamp - joinedTimestamp;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}