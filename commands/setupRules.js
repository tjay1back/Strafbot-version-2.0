const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setuprules')
    .setDescription('Postet die Regeln-Nachricht im Regeln-Channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const RULES_CHANNEL_ID = '1410596490878910494';
    const rulesChannel = interaction.guild.channels.cache.get(RULES_CHANNEL_ID);

    if (!rulesChannel) {
      return await interaction.editReply({
        content: '❌ Regeln-Channel nicht gefunden!'
      });
    }

    try {
      // Alte Nachrichten löschen
      const messages = await rulesChannel.messages.fetch({ limit: 100 });
      const rulesMessages = messages.filter(msg => msg.author.id === interaction.client.user.id);

      for (const msg of rulesMessages.values()) {
        try {
          await msg.delete();
        } catch (error) {
          console.error('Fehler beim Löschen der Nachricht:', error);
        }
      }

      // Neue Regeln-Nachricht erstellen
      const rulesEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('📜 Server Regeln')
        .setDescription(
          '**Bitte lies dir diese Regeln sorgfältig durch!**\n\n' +
          '**1️⃣ Respekt und Höflichkeit**\n' +
          'Behandle alle Mitglieder mit Respekt. Keine Beleidigungen, Diskriminierung oder Hassrede.\n\n' +
          '**2️⃣ Keine Spammen**\n' +
          'Keine wiederholten Nachrichten, Ping-Spam oder übermäßige Nutzung von Großbuchstaben.\n\n' +
          '**3️⃣ Kein NSFW-Content**\n' +
          'Keine expliziten Inhalte oder Pornografie außerhalb von NSFW-Kanälen.\n\n' +
          '**4️⃣ Kein Advertising**\n' +
          'Keine selbstgerechten Werbungen oder Links zu konkurrierenden Servern ohne Erlaubnis.\n\n' +
          '**5️⃣ Keine Missbrauch des Bots**\n' +
          '⚠️ **Der Bot darf NICHT missbraucht werden!** Das führt zu Konsequenzen.\n\n' +
          '**6️⃣ Kein Meta Gaming**\n' +
          '🚫 **Meta Gaming ist STRENG VERBOTEN!** Dies führt zu **sofortigem Ausschluss** vom Server und wird auf dem Pizzaland Server als Regelverstoß reportet.\n\n' +
          '---\n\n' +
          '**✅ Reagiere mit ✔️ um die Regeln zu akzeptieren und auf den Rest des Servers zuzugreifen!**'
        )
        .setFooter({ text: 'Danke, dass du unsere Regeln akzeptierst!' })
        .setTimestamp();

      // Neue Nachricht senden
      const msg = await rulesChannel.send({
        embeds: [rulesEmbed],
      });

      // Reagiere mit ✔️
      await msg.react('✔️');

      await interaction.editReply({
        content: '✅ Regeln-Nachricht erfolgreich gepostet!'
      });

      console.log('✅ Rules Panel erfolgreich aktualisiert!');
    } catch (error) {
      console.error('Fehler beim Posten der Regeln:', error);
      await interaction.editReply({
        content: '❌ Fehler beim Posten der Regeln!'
      });
    }
  },
};