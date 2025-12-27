const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const NON_PD_ROLE_ID = '1426973009528487996';
const COMMAND_USE_RIGHTS_ROLE_ID = '1426983109437423758';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pd')
        .setDescription('Verwalte PD-Berechtigungen für User')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Gib einem User CommandUseRights (entfernt NonPD)')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Der User, dem die Rechte gegeben werden sollen')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Entferne CommandUseRights von einem User (gibt NonPD)')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Der User, dem die Rechte entzogen werden sollen')
                        .setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('user');
        const targetMember = await interaction.guild.members.fetch(targetUser.id);

        if (!targetMember) {
            return await interaction.editReply({
                content: '❌ User nicht gefunden auf diesem Server!'
            });
        }

        const nonPdRole = interaction.guild.roles.cache.get(NON_PD_ROLE_ID);
        const commandRightsRole = interaction.guild.roles.cache.get(COMMAND_USE_RIGHTS_ROLE_ID);

        if (!nonPdRole || !commandRightsRole) {
            return await interaction.editReply({
                content: '❌ Rollen nicht gefunden! Bitte kontaktiere einen Developer.'
            });
        }

        try {
            if (subcommand === 'add') {
                // Gib CommandUseRights, entferne NonPD
                await targetMember.roles.remove(nonPdRole);
                await targetMember.roles.add(commandRightsRole);

                const successEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ CommandUseRights hinzugefügt')
                    .setDescription(`**User:** ${targetUser.tag} (${targetUser})`)
                    .addFields(
                        { name: '➕ Rolle hinzugefügt', value: commandRightsRole.name, inline: true },
                        { name: '➖ Rolle entfernt', value: nonPdRole.name, inline: true },
                        { name: '👮 Bearbeitet von', value: `${interaction.user.tag}`, inline: false }
                    )
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: 'PD Berechtigungsverwaltung' })
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [successEmbed]
                });

                // DM an User
                try {
                    await targetMember.send(
                        `✅ **Glückwunsch!**\n\n` +
                        `Dir wurden PD-Berechtigungen gegeben von **${interaction.user.tag}**.\n` +
                        `Du kannst jetzt alle Commands verwenden! 🎉`
                    );
                } catch (dmError) {
                    console.log(`⚠️ Konnte keine DM an ${targetUser.tag} senden`);
                }

            } else if (subcommand === 'remove') {
                // Entferne CommandUseRights, gib NonPD
                await targetMember.roles.remove(commandRightsRole);
                await targetMember.roles.add(nonPdRole);

                const successEmbed = new EmbedBuilder()
                    .setColor('#ff4444')
                    .setTitle('❌ CommandUseRights entfernt')
                    .setDescription(`**User:** ${targetUser.tag} (${targetUser})`)
                    .addFields(
                        { name: '➖ Rolle entfernt', value: commandRightsRole.name, inline: true },
                        { name: '➕ Rolle hinzugefügt', value: nonPdRole.name, inline: true },
                        { name: '👮 Bearbeitet von', value: `${interaction.user.tag}`, inline: false }
                    )
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: 'PD Berechtigungsverwaltung' })
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [successEmbed]
                });

                // DM an User
                try {
                    await targetMember.send(
                        `⚠️ **Benachrichtigung**\n\n` +
                        `Deine PD-Berechtigungen wurden entfernt von **${interaction.user.tag}**.\n` +
                        `Du kannst bestimmte Commands nicht mehr verwenden.`
                    );
                } catch (dmError) {
                    console.log(`⚠️ Konnte keine DM an ${targetUser.tag} senden`);
                }
            }

            // Log in Admin-Channel
            const logChannel = interaction.guild.channels.cache.find(ch => ch.name === 'mod-logs');
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(subcommand === 'add' ? '#00ff00' : '#ff4444')
                    .setTitle(`🔧 PD Berechtigung ${subcommand === 'add' ? 'hinzugefügt' : 'entfernt'}`)
                    .setDescription(`**User:** ${targetUser.tag} (${targetUser.id})`)
                    .addFields(
                        { name: '👮 Bearbeitet von', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                        { name: '⚙️ Aktion', value: subcommand === 'add' ? 'Rechte gegeben' : 'Rechte entzogen', inline: true },
                        { name: '🕐 Zeit', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error('Fehler beim PD Command:', error);
            await interaction.editReply({
                content: '❌ Es ist ein Fehler aufgetreten! Bitte versuche es erneut.'
            });
        }
    },
};