const { EmbedBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const MEMBER_ROLE_ID = '1405382761363017860';
const NON_PD_ROLE_ID = '1426973009528487996';
const COMMAND_USE_RIGHTS_ROLE_ID = '1426983109437423758';
const VERIFICATION_CHANNEL_ID = '1444659186725289994';
const PIZZALAND_SERVER_ID = '1032685104092426352';

// GLOBALER SCHUTZ GEGEN DOPPELTE AUSFÜHRUNG
const processedInteractions = new Set();

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    // SCHUTZ: Verhindere doppelte Verarbeitung
    const interactionKey = `${interaction.id}-${interaction.type}`;
    if (processedInteractions.has(interactionKey)) {
      console.log(`⚠️ Interaction bereits verarbeitet: ${interactionKey}`);
      return;
    }
    processedInteractions.add(interactionKey);
    
    // Cleanup nach 30 Sekunden
    setTimeout(() => processedInteractions.delete(interactionKey), 30000);

    try {
      // ==========================================
      // SLASH COMMANDS
      // ==========================================
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        
        if (!command) {
          console.error(`❌ Command nicht gefunden: ${interaction.commandName}`);
          return;
        }
        
        console.log(`🎯 Command: ${interaction.commandName} von ${interaction.user.tag}`);
        
        try {
          await command.execute(interaction);
        } catch (error) {
          console.error(`❌ Command Fehler:`, error);
          
          const errorReply = { 
            content: '❌ Fehler beim Ausführen!', 
            flags: 64 
          };
          
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorReply).catch(() => {});
          } else {
            await interaction.reply(errorReply).catch(() => {});
          }
        }
        return;
      }

      // ==========================================
      // AUTOCOMPLETE
      // ==========================================
      if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        
        if (command && command.autocomplete) {
          try {
            await command.autocomplete(interaction);
          } catch (error) {
            console.error(`❌ Autocomplete Fehler:`, error);
          }
        }
        return;
      }

      // ==========================================
      // MODAL SUBMIT
      // ==========================================
      if (interaction.isModalSubmit()) {
        const command = client.commands.get('strafe');
        if (command && command.handleModalSubmit) {
          try {
            await command.handleModalSubmit(interaction);
          } catch (error) {
            console.error('❌ Modal Fehler:', error);
          }
        }
        return;
      }

      // ==========================================
      // SELECT MENU
      // ==========================================
      if (interaction.isStringSelectMenu()) {
        const command = client.commands.get('strafe');
        if (command && command.handleSelectInteraction) {
          try {
            await command.handleSelectInteraction(interaction);
          } catch (error) {
            console.error('❌ Select Menu Fehler:', error);
          }
        }
        return;
      }

      // ==========================================
      // BUTTONS
      // ==========================================
      if (interaction.isButton()) {
        const customId = interaction.customId;
        console.log(`🔘 Button: ${customId} von ${interaction.user.tag}`);
        
        // REGELN BUTTON
        if (customId === 'accept_rules_button') {
          await handleRulesAccept(interaction, client);
          return;
        }

        // BESTÄTIGUNGS-BUTTONS
        if (customId.startsWith('verify_approve_') || customId.startsWith('verify_deny_')) {
          await handleVerification(interaction);
          return;
        }

        // TICKET BUTTONS
        if (customId === 'create_ticket') {
          await handleCreateTicket(interaction);
          return;
        }

        if (customId === 'confirm_close_ticket') {
          await handleCloseTicket(interaction);
          return;
        }

        if (customId === 'cancel_close_ticket') {
          await interaction.update({
            content: '❌ Abgebrochen.',
            embeds: [],
            components: []
          }).catch(() => {});
          return;
        }

        // AKTE BUTTONS
        if (customId.startsWith('close_akte::') || customId.startsWith('confirm_close_akte::') || customId.startsWith('cancel_close_akte::')) {
          const command = client.commands.get('strafe');
          if (command && command.handleButtonInteraction) {
            await command.handleButtonInteraction(interaction);
          }
          return;
        }

        // STRAFE BUTTONS
        if (customId.includes('::')) {
          const command = client.commands.get('strafe');
          if (command && command.handleButtonInteraction) {
            await command.handleButtonInteraction(interaction);
          }
          return;
        }

        return;
      }

    } catch (error) {
      console.error('❌ Interaction Error:', error.message);
    }
  }
};

// ==========================================
// REGELN AKZEPTIEREN
// ==========================================
async function handleRulesAccept(interaction, client) {
  console.log(`✅ Regeln: ${interaction.user.tag}`);
  
  if (interaction.replied || interaction.deferred) {
    console.log(`⚠️ Bereits beantwortet`);
    return;
  }
  
  try {
    await interaction.reply({ 
      content: '✅ Regeln akzeptiert! 🎉',
      flags: 64
    });
  } catch (error) {
    console.error('❌ Reply Fehler:', error.message);
    return;
  }

  const memberRole = interaction.guild.roles.cache.get(MEMBER_ROLE_ID);
  const nonPdRole = interaction.guild.roles.cache.get(NON_PD_ROLE_ID);

  if (!memberRole || !nonPdRole) {
    console.error('❌ Rollen fehlen');
    return;
  }

  try {
    await interaction.member.roles.add([memberRole, nonPdRole]);
    console.log(`✅ Rollen gegeben`);
    await sendVerificationRequest(interaction, client);
  } catch (error) {
    console.error('❌ Rollen Fehler:', error.message);
  }
}

// ==========================================
// BESTÄTIGUNGSANFRAGE SENDEN
// ==========================================
async function sendVerificationRequest(interaction, client) {
  try {
    const verificationChannel = client.channels.cache.get(VERIFICATION_CHANNEL_ID);
    
    if (!verificationChannel) {
      console.error(`❌ Channel ${VERIFICATION_CHANNEL_ID} nicht gefunden`);
      return;
    }

    const user = interaction.user;

    let onPizzalandServer = false;
    try {
      const pizzalandGuild = client.guilds.cache.get(PIZZALAND_SERVER_ID);
      if (pizzalandGuild) {
        const pizzalandMember = await pizzalandGuild.members.fetch(user.id).catch(() => null);
        onPizzalandServer = !!pizzalandMember;
      }
    } catch (e) {
      console.log('⚠️ Pizzaland check failed');
    }

    const embed = new EmbedBuilder()
      .setColor('#ffaa00')
      .setTitle('⚠️ Neue Bestätigung erforderlich')
      .setDescription(`**User:** ${user.tag} (${user})`)
      .addFields(
        { name: '👤 User ID', value: user.id, inline: true },
        { name: '📅 Account erstellt', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: true },
        { name: '🎮 Pizzaland', value: onPizzalandServer ? '✅ Ja' : '❌ Nein', inline: true }
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setFooter({ text: 'Bestätige den User für CommandUseRights' })
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`verify_approve_${user.id}`)
          .setLabel('✅ Bestätigen')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`verify_deny_${user.id}`)
          .setLabel('❌ Ablehnen')
          .setStyle(ButtonStyle.Danger)
      );

    await verificationChannel.send({
      embeds: [embed],
      components: [row]
    });

    console.log(`✅ Bestätigung gesendet`);

  } catch (error) {
    console.error('❌ Verification Error:', error.message);
  }
}

// ==========================================
// BESTÄTIGUNG VERARBEITEN
// ==========================================
async function handleVerification(interaction) {
  const parts = interaction.customId.split('_');
  const action = parts[1];
  const userId = parts[2];

  console.log(`🔍 ${action} für ${userId}`);

  if (interaction.replied || interaction.deferred) {
    console.log(`⚠️ Bereits verarbeitet`);
    return;
  }

  try {
    await interaction.deferUpdate();
    
    const targetMember = await interaction.guild.members.fetch(userId).catch(() => null);
    
    if (!targetMember) {
      await interaction.followUp({
        content: '❌ User nicht gefunden!',
        flags: 64
      }).catch(() => {});
      return;
    }

    const nonPdRole = interaction.guild.roles.cache.get(NON_PD_ROLE_ID);
    const commandRightsRole = interaction.guild.roles.cache.get(COMMAND_USE_RIGHTS_ROLE_ID);

    if (!nonPdRole || !commandRightsRole) {
      await interaction.followUp({
        content: '❌ Rollen nicht gefunden!',
        flags: 64
      }).catch(() => {});
      return;
    }

    if (action === 'approve') {
      await targetMember.roles.remove(nonPdRole);
      await targetMember.roles.add(commandRightsRole);

      const embed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor('#00ff00')
        .setTitle('✅ User bestätigt')
        .addFields({ name: '👮 Von', value: interaction.user.tag, inline: true });

      await interaction.editReply({
        embeds: [embed],
        components: []
      });

      console.log(`✅ Bestätigt: ${targetMember.user.tag}`);

      try {
        await targetMember.send('✅ Du wurdest verifiziert! 🎉');
      } catch (e) {
        console.log(`⚠️ DM failed`);
      }

    } else if (action === 'deny') {
      const embed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor('#ff0000')
        .setTitle('❌ User abgelehnt')
        .addFields({ name: '👮 Von', value: interaction.user.tag, inline: true });

      await interaction.editReply({
        embeds: [embed],
        components: []
      });

      console.log(`❌ Abgelehnt: ${targetMember.user.tag}`);

      try {
        await targetMember.send('❌ Verifizierung abgelehnt.');
      } catch (e) {
        console.log(`⚠️ DM failed`);
      }
    }

  } catch (error) {
    console.error('❌ Verification Error:', error.message);
  }
}

// ==========================================
// TICKET ERSTELLEN
// ==========================================
async function handleCreateTicket(interaction) {
  await interaction.deferReply({ flags: 64 }).catch(() => {});

  const existingTicket = interaction.guild.channels.cache.find(
    ch => ch.name === `ticket-${interaction.user.username.toLowerCase()}` && ch.type === ChannelType.GuildText
  );

  if (existingTicket) {
    return await interaction.editReply({
      content: `❌ Ticket existiert: ${existingTicket}!`
    }).catch(() => {});
  }

  const ticketCategory = interaction.guild.channels.cache.find(
    ch => ch.name === '🎫 TICKETS' && ch.type === ChannelType.GuildCategory
  );

  if (!ticketCategory) {
    return await interaction.editReply({
      content: '❌ Kategorie nicht gefunden!'
    }).catch(() => {});
  }

  try {
    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: ticketCategory.id,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
        }
      ]
    });

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🎫 Support-Ticket')
      .setDescription(`Hallo ${interaction.user}!`)
      .setTimestamp();

    await ticketChannel.send({ embeds: [embed] });
    await interaction.editReply({ content: `✅ Ticket: ${ticketChannel}!` }).catch(() => {});

  } catch (error) {
    console.error('❌ Ticket Error:', error.message);
    await interaction.editReply({ content: '❌ Fehler!' }).catch(() => {});
  }
}

// ==========================================
// TICKET SCHLIESSEN
// ==========================================
async function handleCloseTicket(interaction) {
  await interaction.deferUpdate().catch(() => {});

  try {
    const archiveCategory = interaction.guild.channels.cache.find(
      ch => ch.name === '📦 ARCHIV' && ch.type === ChannelType.GuildCategory
    );

    if (archiveCategory) {
      await interaction.channel.setParent(archiveCategory.id);
      await interaction.channel.setName(`closed-${interaction.channel.name}`);
    }

    const embed = new EmbedBuilder()
      .setColor('#ff4444')
      .setTitle('🔒 Geschlossen')
      .setTimestamp();

    await interaction.followUp({ embeds: [embed] }).catch(() => {});

  } catch (error) {
    console.error('❌ Close Error:', error.message);
  }
}