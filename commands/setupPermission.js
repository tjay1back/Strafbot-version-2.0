const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setuppermissions')
    .setDescription('Konfiguriert die Channel-Permissions für die Regeln')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const WELCOME_CHANNEL_ID = '1410596489364901900';
    const RULES_CHANNEL_ID = '1410596490878910494';
    const LOGS_CHANNEL_ID = '1410596566053556224';
    const MEMBER_ROLE_ID = '1405382761363017860';
    const NON_PD_ROLE_ID = '1426973009528487996';
    const FILES_CATEGORY_ID = '1420749276916486174';

    const memberRole = interaction.guild.roles.cache.get(MEMBER_ROLE_ID);
    const nonPdRole = interaction.guild.roles.cache.get(NON_PD_ROLE_ID);

    if (!memberRole) {
      return await interaction.editReply({
        content: '❌ Mitglied-Rolle nicht gefunden!',
      });
    }

    if (!nonPdRole) {
      return await interaction.editReply({
        content: '❌ NonPD-Rolle nicht gefunden!',
      });
    }

    try {
      // Alle Channels durchgehen und Permissions setzen
      for (const [, channel] of interaction.guild.channels.cache) {
        // Willkommens- und Regeln-Channel für alle sichtbar
        if (channel.id === WELCOME_CHANNEL_ID || channel.id === RULES_CHANNEL_ID) {
          // Hier können alle sehen
          await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            ViewChannel: true,
            SendMessages: channel.id === RULES_CHANNEL_ID ? false : true,
          });

          // Mitglied-Rolle hat volle Rechte
          await channel.permissionOverwrites.edit(memberRole, {
            ViewChannel: true,
            SendMessages: true,
          });

          // NonPD-Rolle kann nicht posten
          await channel.permissionOverwrites.edit(nonPdRole, {
            SendMessages: false,
          });
        }
        // Logs-Channel nur für Admins
        else if (channel.id === LOGS_CHANNEL_ID) {
          await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            ViewChannel: false,
          });

          await channel.permissionOverwrites.edit(memberRole, {
            ViewChannel: false,
          });

          await channel.permissionOverwrites.edit(nonPdRole, {
            ViewChannel: false,
          });
        }
        // Akten-Kategorie und deren Channels
        else if (channel.parentId === FILES_CATEGORY_ID) {
          // @everyone: Kein Zugriff
          await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            ViewChannel: false,
          });

          // Mitglied-Rolle: Kann sehen und lesen
          await channel.permissionOverwrites.edit(memberRole, {
            ViewChannel: true,
            SendMessages: false,
            ReadMessageHistory: true,
          });

          // NonPD-Rolle: Kein Zugriff
          await channel.permissionOverwrites.edit(nonPdRole, {
            ViewChannel: false,
          });
        }
        // Alle anderen Channels: Nur Mitglied-Rolle kann sehen
        else {
          // Verstecke von @everyone
          await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            ViewChannel: false,
          });

          // Mitglied-Rolle kann sehen
          await channel.permissionOverwrites.edit(memberRole, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
          });

          // NonPD-Rolle: Kein Zugriff
          await channel.permissionOverwrites.edit(nonPdRole, {
            ViewChannel: false,
          });
        }
      }

      await interaction.editReply({
        content: '✅ Channel-Permissions erfolgreich konfiguriert!\n\n' +
                 '📋 Übersicht:\n' +
                 '• Welcome & Regeln: Alle können sehen\n' +
                 '• Akten: Nur Mitglied-Rolle\n' +
                 '• Andere Channels: Nur Mitglied-Rolle\n' +
                 '• NonPD-Rolle: Kein Zugriff auf alle Channels\n' +
                 '• Logs: Nur Admins',
      });

      console.log('✅ Permissions wurden aktualisiert');
    } catch (error) {
      console.error('Fehler beim Setzen der Permissions:', error);
      await interaction.editReply({
        content: '❌ Fehler beim Konfigurieren der Permissions!',
      });
    }
  },
};