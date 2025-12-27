const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const NON_PD_ROLE_ID = '1426973009528487996';
const FILES_CATEGORY_ID = '1420749276916486174';

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member, client) {
    const WELCOME_CHANNEL_ID = '1410596489364901900';
    const RULES_CHANNEL_ID = '1410596490878910494';
    const LOGS_CHANNEL_ID = '1410596566053556224';

    const welcomeChannel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    const rulesChannel = member.guild.channels.cache.get(RULES_CHANNEL_ID);
    const logsChannel = member.guild.channels.cache.get(LOGS_CHANNEL_ID);

    // Welcome Message
    if (welcomeChannel && rulesChannel) {
      const welcomeEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🎉 Willkommen auf dem Server!')
        .setDescription(
          `Hallo ${member.user.username}! 👋\n\n` +
          `Willkommen auf unserem Server! Wir freuen uns, dass du hier bist.\n\n` +
          `📜 **Bitte lies dir die Regeln in ${rulesChannel} durch, bevor du den Server nutzt!**\n\n` +
          `Viel Spaß und eine gute Zeit auf unserem Server! 🚀`
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setFooter({ text: member.guild.name })
        .setTimestamp();

      try {
        await welcomeChannel.send({
          content: `${member.user}`,
          embeds: [welcomeEmbed],
        });
      } catch (error) {
        console.error('Fehler beim Senden der Welcome Message:', error);
      }
    }

    // JOIN LOG
    if (logsChannel) {
      const joinEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('👋 Mitglied beigetreten')
        .setDescription(`${member.user.tag} hat den Server betreten`)
        .addFields(
          { name: '👤 User', value: `${member.user} (${member.user.id})`, inline: true },
          { name: '📅 Account erstellt', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: true },
          { name: '👥 Mitgliederzahl', value: `${member.guild.memberCount}`, inline: true },
          { name: '🎭 Username', value: `${member.user.username}`, inline: true },
          { name: '🤖 Bot?', value: member.user.bot ? 'Ja ✅' : 'Nein ❌', inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setFooter({ text: member.guild.name })
        .setTimestamp();

      try {
        await logsChannel.send({ embeds: [joinEmbed] });
      } catch (error) {
        console.error('Fehler beim Senden des Join Logs:', error);
      }
    }

    // AKTEN-PERMISSIONS für NonPD
    try {
      const filesCategory = member.guild.channels.cache.get(FILES_CATEGORY_ID);
      
      if (filesCategory) {
        // Wenn User die NonPD Rolle hat, Akten-Zugriff entfernen
        if (member.roles.cache.has(NON_PD_ROLE_ID)) {
          // Alle Channels in der Akte-Kategorie durchgehen
          const aktenChannels = filesCategory.children.cache.filter(
            channel => channel.type === 0 // GuildText Channels
          );

          for (const [, channel] of aktenChannels) {
            try {
              // Entferne den Zugriff für NonPD User
              await channel.permissionOverwrites.delete(member.id);
              console.log(`❌ NonPD User ${member.user.tag} hat keinen Zugriff auf ${channel.name}`);
            } catch (error) {
              console.error(`Fehler beim Setzen der Permissions für ${channel.name}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Fehler beim Setzen der Akten-Permissions:', error);
    }
  },
};