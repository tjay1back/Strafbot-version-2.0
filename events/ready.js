const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Bot online: ${client.user.tag}`);

    // Rules Panel beim Start aktualisieren
    await updateRulesPanel(client);

    // Alle 2 Stunden aktualisieren
    setInterval(() => {
      updateRulesPanel(client);
    }, 2 * 60 * 60 * 1000);
  },
};

async function updateRulesPanel(client) {
  try {
    const RULES_CHANNEL_ID = '1410596490878910494';
    const rulesChannel = client.channels.cache.get(RULES_CHANNEL_ID);

    if (!rulesChannel) {
      console.log('❌ Regeln-Channel nicht gefunden!');
      return;
    }

    // Alte Nachrichten löschen
    const messages = await rulesChannel.messages.fetch({ limit: 100 });
    const rulesMessages = messages.filter(msg => msg.author.id === client.user.id);

    for (const msg of rulesMessages.values()) {
      try {
        await msg.delete();
      } catch (error) {
        // Ignoriere Fehler beim Löschen
      }
    }

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
        '**✅ Klicke auf den Button unten, um die Regeln zu akzeptieren!**'
      )
      .setFooter({ text: 'Danke, dass du unsere Regeln akzeptierst! Zuletzt aktualisiert:' })
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('accept_rules_button')
          .setLabel('✅ Regeln akzeptieren')
          .setStyle(ButtonStyle.Success)
      );

    await rulesChannel.send({
      embeds: [rulesEmbed],
      components: [row]
    });

    console.log('✅ Rules Panel aktualisiert');
  } catch (error) {
    console.error('❌ Rules Panel Fehler:', error.message);
  }
}