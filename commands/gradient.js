const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Funktion zum Konvertieren von Hex zu RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Funktion zum Interpolieren zwischen zwei Farben
function interpolateColor(color1, color2, factor) {
    return {
        r: Math.round(color1.r + factor * (color2.r - color1.r)),
        g: Math.round(color1.g + factor * (color2.g - color1.g)),
        b: Math.round(color1.b + factor * (color2.b - color1.b))
    };
}

// Funktion zum Konvertieren von RGB zu Minecraft Hex Format
function rgbToMinecraftHex(rgb) {
    const toHex = (n) => n.toString(16).toLowerCase().padStart(2, '0');
    const r = toHex(rgb.r);
    const g = toHex(rgb.g);
    const b = toHex(rgb.b);
    
    return `&x&${r.charAt(0)}&${r.charAt(1)}&${g.charAt(0)}&${g.charAt(1)}&${b.charAt(0)}&${b.charAt(1)}`;
}

// Rainbow Farbverlauf (HSL zu RGB)
function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r, g, b;
    
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
    };
}

// Intelligente Smoothness-Berechnung mit automatischer Anpassung
function calculateOptimalGradient(text, startRgb, endRgb, maxLength = 246, isRainbow = false) {
    const commandPrefix = "/zeichnen ";
    const maxTotalLength = 256;
    const maxColorCodeLength = maxTotalLength - commandPrefix.length;
    
    // Minecraft Farbcode-Länge: &x&r&r&g&g&b&b = 14 Zeichen
    const colorCodeLength = 14;
    
    // Starte mit Smoothness 1 (jeder Buchstabe neue Farbe)
    for (let smoothness = 1; smoothness <= text.length * 2; smoothness++) {
        let result = "";
        let currentColor = null;
        let colorChanges = 0;
        
        for (let i = 0; i < text.length; i++) {
            // Neue Farbe nur bei Smoothness-Intervallen
            if (i % smoothness === 0 || currentColor === null) {
                if (isRainbow) {
                    const hue = (i / text.length) * 360;
                    const color = hslToRgb(hue, 1, 0.5);
                    currentColor = rgbToMinecraftHex(color);
                } else {
                    const factor = text.length === 1 ? 0 : i / (text.length - 1);
                    const color = interpolateColor(startRgb, endRgb, factor);
                    currentColor = rgbToMinecraftHex(color);
                }
                colorChanges++;
            }
            result += currentColor + text.charAt(i);
        }
        
        // Prüfe ob es passt
        if (result.length <= maxColorCodeLength) {
            // Bestimme Smoothness-Level-Namen
            let levelName;
            if (smoothness === 1) levelName = 'Super Smooth';
            else if (smoothness === 2) levelName = 'Smooth';
            else if (smoothness === 3) levelName = 'Medium';
            else if (smoothness === 4) levelName = 'Unsmooth';
            else levelName = 'Custom';
            
            return {
                success: true,
                result: result,
                smoothness: smoothness,
                levelName: levelName,
                colorChanges: colorChanges,
                totalLength: result.length,
                finalCommandLength: commandPrefix.length + result.length
            };
        }
    }
    
    // Fallback: Wenn WIRKLICH nichts passt, gib den Text mit nur EINER Farbe zurück
    let color;
    if (isRainbow) {
        color = rgbToMinecraftHex(hslToRgb(0, 1, 0.5));
    } else {
        color = rgbToMinecraftHex(startRgb);
    }
    
    let fallbackResult = "";
    for (let i = 0; i < text.length; i++) {
        fallbackResult += color + text.charAt(i);
    }
    
    return {
        success: true,
        result: fallbackResult,
        smoothness: text.length,
        levelName: 'Single Color',
        colorChanges: 1,
        totalLength: fallbackResult.length,
        finalCommandLength: commandPrefix.length + fallbackResult.length
    };
}

// Vordefinierte Farben
const presetColors = {
    'rot': '#FF0000',
    'grün': '#00FF00',
    'blau': '#0000FF',
    'gelb': '#FFFF00',
    'pink': '#FF69B4',
    'lila': '#800080',
    'orange': '#FFA500',
    'türkis': '#00FFFF',
    'cyan': '#00FFFF',
    'schwarz': '#000000',
    'weiß': '#FFFFFF',
    'weiss': '#FFFFFF',
    'grau': '#808080',
    'dunkelrot': '#8B0000',
    'hellblau': '#87CEEB',
    'dunkelgrün': '#006400',
    'dunkelblau': '#00008B',
    'gold': '#FFD700',
    'silber': '#C0C0C0',
    'bronze': '#CD7F32',
    'magenta': '#FF00FF',
    'lime': '#00FF00',
    'aqua': '#00FFFF'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gradient')
        .setDescription('Erstelle einen Minecraft Farbverlauf')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('Der Text für den Farbverlauf')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('startfarbe')
                .setDescription('Startfarbe (Hex-Code wie #FF0000 oder Farbname)')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('endfarbe')
                .setDescription('Endfarbe (Hex-Code wie #0000FF oder Farbname)')
                .setRequired(true)
                .setAutocomplete(true))
        .addBooleanOption(option =>
            option.setName('rainbow')
                .setDescription('Regenbogenfarbverlauf verwenden? (Ignoriert Start- und Endfarbe)')
                .setRequired(false)),

    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused().toLowerCase();
            const choices = Object.keys(presetColors);
            const filtered = choices.filter(choice => choice.startsWith(focusedValue));
            await interaction.respond(
                filtered.slice(0, 25).map(choice => ({ 
                    name: `${choice} (${presetColors[choice]})`, 
                    value: choice 
                }))
            );
        } catch (error) {
            console.error('Fehler bei Autocomplete:', error);
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const text = interaction.options.getString('text');
            const rainbow = interaction.options.getBoolean('rainbow') || false;
            const commandPrefix = "/zeichnen ";

            let startColor = null;
            let endColor = null;
            let startRgb = null;
            let endRgb = null;

            if (!rainbow) {
                let startColorInput = interaction.options.getString('startfarbe').toLowerCase().trim();
                let endColorInput = interaction.options.getString('endfarbe').toLowerCase().trim();

                // Prüfen ob es vordefinierte Farben sind
                if (presetColors[startColorInput]) {
                    startColorInput = presetColors[startColorInput];
                }
                if (presetColors[endColorInput]) {
                    endColorInput = presetColors[endColorInput];
                }

                // Sicherstellen, dass Hex-Codes mit # beginnen
                if (!startColorInput.startsWith('#') && startColorInput.match(/^[0-9a-f]{6}$/i)) {
                    startColorInput = '#' + startColorInput;
                }
                if (!endColorInput.startsWith('#') && endColorInput.match(/^[0-9a-f]{6}$/i)) {
                    endColorInput = '#' + endColorInput;
                }

                startColor = startColorInput;
                endColor = endColorInput;
                
                startRgb = hexToRgb(startColor);
                endRgb = hexToRgb(endColor);

                if (!startRgb || !endRgb) {
                    return await interaction.editReply({
                        content: `❌ **Fehler:** Ungültige Hex-Farben!\n` +
                                 `Verwende Format: \`#FF0000\` oder einen Farbnamen wie \`rot\`\n\n` +
                                 `**Verfügbare Farbnamen:**\n${Object.keys(presetColors).join(', ')}`,
                    });
                }
            } else {
                startRgb = hexToRgb('#FF0000');
                endRgb = hexToRgb('#FF0000');
            }

            if (!text || text.length === 0) {
                return await interaction.editReply({
                    content: `❌ **Fehler:** Text darf nicht leer sein!`,
                });
            }

            // Verwende die intelligente Gradient-Berechnung
            const gradientResult = calculateOptimalGradient(text, startRgb, endRgb, 246, rainbow);

            // ENTFERNT: Keine Längenbeschränkung mehr - Auto-Smoothness findet immer eine Lösung!

            const finalCommand = commandPrefix + gradientResult.result;

            // Bestimme Embed-Farbe
            let embedColor = rainbow ? 0xFF00FF : 0x0099FF;
            if (!rainbow && startRgb && endRgb) {
                const avgR = Math.round((startRgb.r + endRgb.r) / 2);
                const avgG = Math.round((startRgb.g + endRgb.g) / 2);
                const avgB = Math.round((startRgb.b + endRgb.b) / 2);
                embedColor = (avgR << 16) + (avgG << 8) + avgB;
            }

            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(rainbow ? '🌈 Minecraft Regenbogen-Farbverlauf' : '🎨 Minecraft Farbverlauf')
                .setDescription(`Farbverlauf wurde erfolgreich erstellt!`)
                .addFields(
                    { name: '📝 Text', value: `\`${text}\``, inline: false }
                );

            if (rainbow) {
                embed.addFields({ 
                    name: '🌈 Modus', 
                    value: 'Regenbogen-Farbverlauf', 
                    inline: false 
                });
            } else {
                embed.addFields(
                    { name: '🎨 Startfarbe', value: `\`${startColor}\``, inline: true },
                    { name: '🎨 Endfarbe', value: `\`${endColor}\``, inline: true },
                    { name: '\u200b', value: '\u200b', inline: true }
                );
            }

            embed.addFields(
                { 
                    name: '✨ Minecraft Command', 
                    value: `\`\`\`${finalCommand}\`\`\``, 
                    inline: false 
                },
                {
                    name: '📏 Länge',
                    value: `${gradientResult.finalCommandLength}/256 Zeichen`,
                    inline: true
                },
                {
                    name: '🎯 Smoothness',
                    value: `${gradientResult.levelName} (Jeder ${gradientResult.smoothness}. Buchstabe)`,
                    inline: true
                },
                {
                    name: '🎨 Farbwechsel',
                    value: `${gradientResult.colorChanges}x`,
                    inline: true
                }
            );

            // Warnung wenn Smoothness erhöht wurde
            if (gradientResult.smoothness > 1) {
                embed.addFields({
                    name: '⚠️ Automatische Anpassung',
                    value: `Die Smoothness wurde automatisch auf **${gradientResult.smoothness}** erhöht, um unter 256 Zeichen zu bleiben.\n` +
                           `💡 Für glattere Übergänge verwende einen kürzeren Text.`,
                    inline: false
                });
            }

            // Tipp für sehr lange Texte
            if (gradientResult.smoothness >= 5) {
                embed.addFields({
                    name: '💡 Tipp',
                    value: `Dein Text ist relativ lang. Für bessere Farbverläufe empfehlen wir kürzere Texte (max. 30 Zeichen).`,
                    inline: false
                });
            }

            embed.setFooter({ 
                text: 'Kopiere den Command und führe ihn in Minecraft aus! | /zeichnen' 
            })
            .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ Fehler im Gradient Command:', error);
            
            const errorMsg = {
                content: '❌ Ein Fehler ist beim Erstellen des Farbverlaufs aufgetreten. Bitte versuche es erneut!',
            };

            if (interaction.deferred) {
                await interaction.editReply(errorMsg);
            } else {
                await interaction.reply(errorMsg);
            }
        }
    },
};