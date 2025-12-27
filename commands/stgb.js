const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Strafkatalog laden
const strafkatalogPath = path.join(__dirname, '../data/strafkatalog.json');
const strafkatalog = JSON.parse(fs.readFileSync(strafkatalogPath, 'utf8'));

// Vollständige Gesetzbuch-Daten mit allen Details
const gesetzDetails = {
  // §12 - Straßenverkehrsordnung
  'Vollgas_in_verkehrsberuhigter_Zone': {
    kategorie: '§12 - Straßenverkehrsordnung',
    beschreibung: 'Vollgas in der verkehrsberuhigten Zone (Hauptplatz)',
    beschlagnahmung: 'Keine',
    zusatz: 'Gilt speziell für den Hauptplatz'
  },
  'Fahren_ohne_Lizenz': {
    kategorie: '§12 - Straßenverkehrsordnung',
    beschreibung: 'Führen eines Kraftfahrzeuges ohne gültige Lizenz',
    beschlagnahmung: 'Fahrzeug',
    zusatz: 'Das Fahrzeug wird sofort beschlagnahmt'
  },
  'Gefährlicher_Eingriff_Straßenverkehr': {
    kategorie: '§12 - Straßenverkehrsordnung',
    beschreibung: 'Gefährlicher Eingriff in den Straßenverkehr. Wer Leib, Leben oder materiellen Schaden fahrlässig in Kauf nimmt. Fahren gegen die Verkehrsrichtung',
    beschlagnahmung: 'Fahrzeug & Führerschein',
    zusatz: 'Schwerer Verkehrsverstoß mit Führerscheinentzug'
  },
  'Falschparken': {
    kategorie: '§12 - Straßenverkehrsordnung',
    beschreibung: 'Parken an nicht erlaubten Stellen',
    beschlagnahmung: 'Keine',
    zusatz: 'Ordnungswidrigkeit'
  },
  'Fahren_abseits_der_Straße': {
    kategorie: '§12 - Straßenverkehrsordnung',
    beschreibung: 'Fahren mit Kraftfahrzeugen außerhalb der vorgesehenen Straßen',
    beschlagnahmung: 'Keine',
    zusatz: 'Ordnungswidrigkeit'
  },
  'Fahren_unter_Einfluss': {
    kategorie: '§12 - Straßenverkehrsordnung',
    beschreibung: 'Fahren unter Einfluss von Alkohol und Drogen',
    beschlagnahmung: 'Fahrzeug & Führerschein',
    zusatz: 'Schwerwiegender Verstoß gegen die Verkehrssicherheit'
  },
  'Nicht_Mitführen_Verbandskasten': {
    kategorie: '§12 - Straßenverkehrsordnung',
    beschreibung: 'Nicht Mitführen eines Verbandskastens im Kofferraum',
    beschlagnahmung: 'Keine',
    zusatz: 'Ordnungswidrigkeit'
  },
  'Nicht_Mitführen_Werkzeugkasten': {
    kategorie: '§12 - Straßenverkehrsordnung',
    beschreibung: 'Nicht Mitführen eines Werkzeugkastens im Kofferraum',
    beschlagnahmung: 'Keine',
    zusatz: 'Ordnungswidrigkeit'
  },
  'Kein Kennzeichen': {
    kategorie: '§12 - Straßenverkehrsordnung',
    beschreibung: 'Fahren ohne gültiges Kennzeichen',
    beschlagnahmung: 'Keine',
    zusatz: 'Ordnungswidrigkeit - Changelog'
  },

  // §13 - Betäubungsmittelgesetz
  'Drogenbesitz': {
    kategorie: '§13 - Betäubungsmittelgesetz',
    beschreibung: 'Besitz von illegalen Drogen: MDMA-Pille, Kokain-Blatt, Kokain-Beutel, Magic Mushroom, Crystal-Meth-Platte, Koodein, Lean. Mehr als 3 Joints, Haschbrownies, Weedbacon, Hanftee und Hanf Shisha',
    beschlagnahmung: 'Alle illegalen Items',
    zusatz: 'Ab einer Menge von 1KG verdoppelt sich die Strafe'
  },
  'Drogenhandel': {
    kategorie: '§13 - Betäubungsmittelgesetz',
    beschreibung: 'Drogenhandel ohne Lizenz: MDMA-Pille, Kokain-Beutel, Kokain-Blatt, Koodein, Lean, Magic Mushroom, Crystal-Meth-Platte, Weiße Meth-Platte',
    beschlagnahmung: 'Alle illegalen Items',
    zusatz: 'Handel ohne behördliche Genehmigung'
  },
  'Drogenanbau_Herstellung': {
    kategorie: '§13 - Betäubungsmittelgesetz',
    beschreibung: 'Anbau und Herstellung von Drogen: MDMA-Pille, Kokain-Blatt, Kokain-Beutel, Magic Mushroom, Koodein, Lean, Crystal-Meth-Platte, Weiße Meth-Platte',
    beschlagnahmung: 'Alle illegalen Items',
    zusatz: 'Illegale Produktion von Betäubungsmitteln'
  },
  'Drogenkonsum': {
    kategorie: '§13 - Betäubungsmittelgesetz',
    beschreibung: 'Konsum von illegalen Drogen',
    beschlagnahmung: 'Alle illegalen Items',
    zusatz: 'Öffentlicher oder privater Drogenkonsum'
  },

  // §14 - Gewerberecht
  'Betreiben_Gewerbe_ohne_Lizenz': {
    kategorie: '§14 - Gewerberecht',
    beschreibung: 'Betreiben eines Gewerbes ohne gültige Lizenz',
    beschlagnahmung: 'Betriebsstätte',
    zusatz: 'Das Gewerbe wird geschlossen'
  },
  'Steuerhinterziehung': {
    kategorie: '§14 - Gewerberecht',
    beschreibung: 'Hinterziehung von Steuern',
    beschlagnahmung: 'Gewerbeschein + Unternehmen',
    zusatz: 'Zusätzlich zur Strafe muss die Steuerschuld nachgezahlt werden'
  },

  // §15 - Wirtschaftskriminalität
  'Diebstahl_KFZ': {
    kategorie: '§15 - Wirtschaftskriminalität',
    beschreibung: 'Diebstahl eines Kraftfahrzeugs, Flugzeugs oder Bootes',
    beschlagnahmung: 'Rückführung des Diebesgutes',
    zusatz: 'Das gestohlene Fahrzeug wird an den Eigentümer zurückgegeben'
  },
  'Raub': {
    kategorie: '§15 - Wirtschaftskriminalität',
    beschreibung: 'Raub von Gegenständen oder Geld',
    beschlagnahmung: 'Rückführung des Diebesgutes',
    zusatz: 'Gewaltsame Wegnahme fremden Eigentums'
  },
  'Schwerer_Raub': {
    kategorie: '§15 - Wirtschaftskriminalität',
    beschreibung: 'Schwerer Raub mit Waffen oder schwerer Gewalt',
    beschlagnahmung: 'Rückführung des Diebesgutes',
    zusatz: 'Besonders schwere Form des Raubes'
  },
  'Betrug': {
    kategorie: '§15 - Wirtschaftskriminalität',
    beschreibung: 'Betrug und Täuschung zum eigenen Vorteil',
    beschlagnahmung: 'Ausgleich des entstandenen Schadens',
    zusatz: 'Der Geschädigte muss entschädigt werden'
  },
  'Bestechen_von_Staatsbeamten': {
    kategorie: '§15 - Wirtschaftskriminalität',
    beschreibung: 'Bestechung von Staatsbeamten',
    beschlagnahmung: 'Keine',
    zusatz: 'Ordnungswidrigkeit mit hoher Geldstrafe'
  },
  'Erpressung': {
    kategorie: '§15 - Wirtschaftskriminalität',
    beschreibung: 'Erpressung von Personen',
    beschlagnahmung: 'Ausgleich des entstandenen Schadens',
    zusatz: 'Nötigung zu einer Handlung durch Drohung'
  },
  'Besitz_Staats_Fraktionseigentum': {
    kategorie: '§15 - Wirtschaftskriminalität',
    beschreibung: 'Besitz von Staats- oder Fraktionseigentum',
    beschlagnahmung: 'Rückführung des Diebesgutes',
    zusatz: 'Sehr hohe Geldstrafe'
  },
  'Besitz_illegaler_Gegenstände': {
    kategorie: '§15 - Wirtschaftskriminalität',
    beschreibung: 'Besitz von illegalen Gegenständen: Langwaffen jeglicher Art, Waffenteile, Schweißbrenner, Dolch, Dietrich, Dreizack, Laserschwert, Blendgranaten',
    beschlagnahmung: 'Alle illegalen Gegenstände',
    zusatz: 'Sämtliche verbotene Items werden beschlagnahmt'
  },
  'Handel_illegaler_Gegenstände': {
    kategorie: '§15 - Wirtschaftskriminalität',
    beschreibung: 'Handel von illegalen Gegenständen: Langwaffen jeglicher Art, Waffenteile, Schweißbrenner, Dolch, Dietrich, Dreizack, Laserschwert, Blendgranaten',
    beschlagnahmung: 'Alle illegalen Gegenstände',
    zusatz: 'Illegaler Waffenhandel und Handel mit verbotenen Items'
  },
  'Erschleichen_von_Leistungen': {
    kategorie: '§15 - Wirtschaftskriminalität',
    beschreibung: 'Erschleichen von Leistungen ohne Bezahlung',
    beschlagnahmung: 'Ausgleich des entstandenen Schadens',
    zusatz: 'Ordnungswidrigkeit - Schadensersatz muss geleistet werden'
  },
  'Raubüberfall': {
    kategorie: '§15 - Wirtschaftskriminalität',
    beschreibung: 'Raubüberfall auf Personen oder Einrichtungen',
    beschlagnahmung: 'Rückführung des Diebesgutes',
    zusatz: 'Überfall mit Gewaltanwendung'
  },
  'Bewaffneter_Raubüberfall': {
    kategorie: '§15 - Wirtschaftskriminalität',
    beschreibung: 'Bewaffneter Raubüberfall',
    beschlagnahmung: 'Rückführung des Diebesgutes',
    zusatz: 'Besonders schweres Verbrechen mit Waffeneinsatz'
  },
  'Illegales_Glücksspiel': {
    kategorie: '§15 - Wirtschaftskriminalität',
    beschreibung: 'Durchführung von illegalem Glücksspiel ohne behördliche Erlaubnis',
    beschlagnahmung: 'Ausgleich des entstandenen Schadens',
    zusatz: 'Spiel ohne Lizenz, bei dem Erfolg hauptsächlich vom Zufall abhängt'
  },
  'Werben_für_illegales_Glücksspiel': {
    kategorie: '§15 - Wirtschaftskriminalität',
    beschreibung: 'Werbung für illegales Glücksspiel',
    beschlagnahmung: 'Ausgleich des entstandenen Schadens',
    zusatz: 'Bewerbung von nicht genehmigten Glücksspielen'
  },

  // §16 - Waffendelikte
  'Führen_Waffe_ohne_Lizenz': {
    kategorie: '§16 - Waffengesetz',
    beschreibung: 'Führen einer Waffe ohne gültige Lizenz',
    beschlagnahmung: 'Waffe',
    zusatz: 'Die Waffe wird sofort beschlagnahmt'
  },
  'Gezogene_Waffe_in_Öffentlichkeit': {
    kategorie: '§16 - Waffengesetz',
    beschreibung: 'Mit gezogener Waffe in der Öffentlichkeit herumlaufen',
    beschlagnahmung: 'Waffe',
    zusatz: 'Ordnungswidrigkeit - Gefährdung der öffentlichen Sicherheit'
  },
  'Besitz_illegale_Waffe': {
    kategorie: '§16 - Waffengesetz',
    beschreibung: 'Besitz einer illegalen Waffe',
    beschlagnahmung: 'Waffe + Aufsätze',
    zusatz: 'Alle verbotenen Waffen und Zubehör werden beschlagnahmt'
  },
  'Unberechtigter_Waffengebrauch': {
    kategorie: '§16 - Waffengesetz',
    beschreibung: 'Unberechtigter Gebrauch einer Waffe',
    beschlagnahmung: 'Waffe + Waffenschein + Aufsätze',
    zusatz: 'Der Waffenschein wird entzogen'
  },
  'Waffenhandel': {
    kategorie: '§16 - Waffengesetz',
    beschreibung: 'Illegaler Handel mit Waffen',
    beschlagnahmung: 'Waffen',
    zusatz: 'Handel ohne entsprechende Genehmigung'
  },
  'Waffenherstellung': {
    kategorie: '§16 - Waffengesetz',
    beschreibung: 'Illegale Herstellung von Waffen',
    beschlagnahmung: 'Waffen',
    zusatz: 'Produktion ohne behördliche Erlaubnis'
  },

  // §17 - Körperliche Integrität
  'Belästigung': {
    kategorie: '§17 - Körperliche Integrität',
    beschreibung: 'Belästigung von Personen',
    beschlagnahmung: 'Keine',
    zusatz: 'Ordnungswidrigkeit - Antragsdelikt (orange)'
  },
  'Freiheitsberaubung': {
    kategorie: '§17 - Körperliche Integrität',
    beschreibung: 'Freiheitsberaubung einer Person',
    beschlagnahmung: 'Keine',
    zusatz: 'Unrechtmäßiges Festhalten gegen den Willen'
  },
  'Geiselnahme': {
    kategorie: '§17 - Körperliche Integrität',
    beschreibung: 'Geiselnahme von Personen',
    beschlagnahmung: 'Keine',
    zusatz: 'Schweres Verbrechen gegen die Freiheit'
  },
  'Beleidigung': {
    kategorie: '§17 - Körperliche Integrität',
    beschreibung: 'Beleidigung von Personen',
    beschlagnahmung: 'Keine',
    zusatz: 'Ordnungswidrigkeit - Antragsdelikt (orange)'
  },
  'Rufmord': {
    kategorie: '§17 - Körperliche Integrität',
    beschreibung: 'Rufmord und Verleumdung',
    beschlagnahmung: 'Keine',
    zusatz: 'Ordnungswidrigkeit - Antragsdelikt (orange)'
  },
  'Drohung': {
    kategorie: '§17 - Körperliche Integrität',
    beschreibung: 'Drohung gegen Personen',
    beschlagnahmung: 'Keine',
    zusatz: 'Ordnungswidrigkeit - Antragsdelikt (orange)'
  },
  'Unterlassene_Hilfeleistung': {
    kategorie: '§17 - Körperliche Integrität',
    beschreibung: 'Unterlassene Hilfeleistung in Notlagen',
    beschlagnahmung: 'Keine',
    zusatz: 'Ordnungswidrigkeit - Pflicht zur Hilfeleistung'
  },
  'Körperverletzung': {
    kategorie: '§17 - Körperliche Integrität',
    beschreibung: 'Körperliche Verletzung einer Person',
    beschlagnahmung: 'Keine',
    zusatz: 'Ordnungswidrigkeit - Antragsdelikt (orange)'
  },
  'Totschlag': {
    kategorie: '§17 - Körperliche Integrität',
    beschreibung: 'Totschlag - Tötung ohne Vorsatz',
    beschlagnahmung: 'Keine',
    zusatz: 'Tötung im Affekt oder ohne Mordmerkmale'
  },
  'Versuchter_Mord': {
    kategorie: '§17 - Körperliche Integrität',
    beschreibung: 'Versuchter Mord',
    beschlagnahmung: 'Keine',
    zusatz: 'Mordversuch mit Tötungsabsicht'
  },
  'Mord': {
    kategorie: '§17 - Körperliche Integrität',
    beschreibung: 'Mord an einer Person',
    beschlagnahmung: 'Keine',
    zusatz: 'Vorsätzliche Tötung eines Menschen'
  },
  'Mord_mehrere_Fälle': {
    kategorie: '§17 - Körperliche Integrität',
    beschreibung: 'Mord in mehreren Fällen (Serienmord)',
    beschlagnahmung: 'Keine',
    zusatz: '⚠️ SCHWERSTES VERBRECHEN - Mehrfacher Mord'
  },

  // §18 - Umgang mit Beamten
  'Umgehung_polizeilicher_Maßnahme': {
    kategorie: '§18 - Umgang mit Beamten',
    beschreibung: 'Umgehung einer polizeilichen Maßnahme',
    beschlagnahmung: 'Keine',
    zusatz: 'Ordnungswidrigkeit - Nicht befolgen von Anweisungen'
  },
  'Widerstand_gegen_Vollstreckungsbeamte': {
    kategorie: '§18 - Umgang mit Beamten',
    beschreibung: 'Widerstand gegen Vollstreckungsbeamte',
    beschlagnahmung: 'Keine',
    zusatz: 'Aktiver Widerstand bei Festnahme oder Kontrolle'
  },
  'Behinderung_Beamter': {
    kategorie: '§18 - Umgang mit Beamten',
    beschreibung: 'Behinderung eines Beamten bei der Arbeit',
    beschlagnahmung: 'Keine',
    zusatz: 'Ordnungswidrigkeit'
  },
  'Missachtung_polizeilicher_Maßnahmen': {
    kategorie: '§18 - Umgang mit Beamten',
    beschreibung: 'Missachtung polizeilicher Maßnahmen',
    beschlagnahmung: 'Keine',
    zusatz: 'Nichtbefolgen von rechtmäßigen Anordnungen'
  },
  'Behinderung_Beamter_im_Einsatz': {
    kategorie: '§18 - Umgang mit Beamten',
    beschreibung: 'Behinderung eines Beamten während eines Einsatzes',
    beschlagnahmung: 'Keine',
    zusatz: 'Störung bei aktiven Polizeieinsätzen'
  },
  'Beleidigung_Beamter': {
    kategorie: '§18 - Umgang mit Beamten',
    beschreibung: 'Beleidigung von Staatsbeamten',
    beschlagnahmung: 'Keine',
    zusatz: 'Ordnungswidrigkeit - Respektlosigkeit gegenüber Beamten'
  },
  'Vertuschung_Beweismaterial': {
    kategorie: '§18 - Umgang mit Beamten',
    beschreibung: 'Vertuschung von Beweismaterial',
    beschlagnahmung: 'Keine',
    zusatz: 'Ordnungswidrigkeit - Behinderung der Justiz'
  },

  // §19 - Sonstige Delikte
  'Betreten_Sperrzone': {
    kategorie: '§19 - Sonstige Delikte',
    beschreibung: 'Betreten von Sperrzonen (Gefängnis Außenbereich, PD-Bereiche, Gericht)',
    beschlagnahmung: 'Keine',
    zusatz: 'Unbefugtes Betreten von gesperrten Bereichen'
  },
  'Platzverbot_missachten': {
    kategorie: '§19 - Sonstige Delikte',
    beschreibung: 'Nichteinhalten eines Platzverbots',
    beschlagnahmung: 'Keine',
    zusatz: 'Rückkehr trotz ausgesprochenen Platzverbots'
  },
  'Vermummungsverbot': {
    kategorie: '§19 - Sonstige Delikte',
    beschreibung: 'Verstoß gegen das Vermummungsverbot',
    beschlagnahmung: 'Keine',
    zusatz: 'Ordnungswidrigkeit - Verdecken der Identität'
  },
  'Amtsanmaßung': {
    kategorie: '§19 - Sonstige Delikte',
    beschreibung: 'Amtsanmaßung - Ausgeben als Beamter',
    beschlagnahmung: 'Keine',
    zusatz: 'Schweres Vergehen - Vortäuschen einer Amtsstellung'
  },
  'Missbrauch_Notruf': {
    kategorie: '§19 - Sonstige Delikte',
    beschreibung: 'Missbrauch des Notrufs (110/112)',
    beschlagnahmung: 'Keine',
    zusatz: 'Ordnungswidrigkeit - Unnötige Notrufe'
  },
  'Sachbeschädigung': {
    kategorie: '§19 - Sonstige Delikte',
    beschreibung: 'Sachbeschädigung an fremdem Eigentum',
    beschlagnahmung: 'Erstattung des Sachschadens',
    zusatz: 'Ordnungswidrigkeit - Schadensersatz muss geleistet werden - Antragsdelikt (orange)'
  },
  'Aufforderung_zu_Straftaten': {
    kategorie: '§19 - Sonstige Delikte',
    beschreibung: 'Aufforderung zu Straftaten',
    beschlagnahmung: 'Keine',
    zusatz: 'Ordnungswidrigkeit - Anstiftung zu Straftaten'
  },
  'Falsche_Informationen': {
    kategorie: '§19 - Sonstige Delikte',
    beschreibung: 'Angabe falscher Informationen gegenüber Beamten',
    beschlagnahmung: 'Keine',
    zusatz: 'Ordnungswidrigkeit - Falsche Angaben'
  },
  'Hausfriedensbruch': {
    kategorie: '§19 - Sonstige Delikte',
    beschreibung: 'Hausfriedensbruch - Betreten fremder Grundstücke/Wohnungen ohne Erlaubnis',
    beschlagnahmung: 'Platzverweis',
    zusatz: 'Ordnungswidrigkeit - Siehe §6 - Antragsdelikt (orange)'
  },
  'Falschaussage': {
    kategorie: '§19 - Sonstige Delikte',
    beschreibung: 'Falschaussage vor Gericht',
    beschlagnahmung: 'Keine',
    zusatz: 'Schweres Vergehen - Meineid'
  },
  'Gefängnisausbruch': {
    kategorie: '§19 - Sonstige Delikte',
    beschreibung: 'Ausbruch aus dem Staatsgefängnis',
    beschlagnahmung: 'Keine',
    zusatz: 'Versuch gibt 1000€ Strafe - Betreten absoluter Sperrzone'
  },
  'Schweres_Dienstvergehen': {
    kategorie: '§19 - Sonstige Delikte',
    beschreibung: 'Schweres Dienstvergehen von Staatsbeamten',
    beschlagnahmung: 'Kündigung',
    zusatz: 'Führt zur fristlosen Entlassung aus dem Staatsdienst'
  },
  'Gefangenenbefreiung': {
    kategorie: '§19 - Sonstige Delikte',
    beschreibung: 'Gefangenenbefreiung - Beihilfe zum Ausbruch',
    beschlagnahmung: 'Keine',
    zusatz: 'Zusatzstrafe: +5 Hafteinheiten, +2500€ Geldstrafe'
  },
  'Störung_Szenario': {
    kategorie: '§19 - Sonstige Delikte',
    beschreibung: 'Störung bei Szenarien (Juwelier-Raub etc.)',
    beschlagnahmung: 'Keine',
    zusatz: '⚠️ Wird sofort vom Konto abgezogen!'
  },
  'Tötung_Hund': {
    kategorie: '§19 - Sonstige Delikte',
    beschreibung: 'Tötung eines Hundes',
    beschlagnahmung: 'Sofortige Erstattung an Hundehalter: 35.000€',
    zusatz: '⚠️ SCHWERSTES VERGEHEN! Erstattung 35.000€ + 100.000€ Strafe'
  },

  // Luftfahrtgesetz
  'Gefährliche_Manöver': {
    kategorie: 'Luftfahrtgesetz §1',
    beschreibung: 'Gefährliche Flugmanöver',
    beschlagnahmung: 'Keine',
    zusatz: 'Riskantes Flugverhalten'
  },
  'Fliegen_ohne_Lizenz': {
    kategorie: 'Luftfahrtgesetz §2',
    beschreibung: 'Fliegen ohne gültige Fluglizenz',
    beschlagnahmung: 'Keine',
    zusatz: 'Flugzeugführung ohne Berechtigung'
  },
  'Landungen_außerhalb_Landebahn': {
    kategorie: 'Luftfahrtgesetz §3',
    beschreibung: 'Landungen außerhalb der Landebahn',
    beschlagnahmung: 'Keine',
    zusatz: 'Sehr hohe Strafe - Gefährdung der Luftsicherheit'
  },
  'Fliegen_mit_Drogen_illegalen_Substanzen': {
    kategorie: 'Luftfahrtgesetz §4',
    beschreibung: 'Fliegen mit Drogen oder illegalen Substanzen an Bord',
    beschlagnahmung: 'Keine',
    zusatz: 'Transport von Betäubungsmitteln'
  },
  'Fliegen_unter_Drogen_Alkohol_Einfluss': {
    kategorie: 'Luftfahrtgesetz §5',
    beschreibung: 'Fliegen unter Drogen- oder Alkoholeinfluss',
    beschlagnahmung: 'Keine',
    zusatz: 'Schwere Gefährdung der Luftsicherheit'
  },
  'Nicht_mitführen_Erste_Hilfe_Kasten': {
    kategorie: 'Luftfahrtgesetz §6',
    beschreibung: 'Nicht Mitführen eines Erste-Hilfe-Kastens',
    beschlagnahmung: 'Keine',
    zusatz: 'Ordnungswidrigkeit - Sicherheitsausrüstung fehlt'
  },
  'Nicht_mitführen_Fallschirm': {
    kategorie: 'Luftfahrtgesetz §7',
    beschreibung: 'Nicht Mitführen eines Fallschirms',
    beschlagnahmung: 'Keine',
    zusatz: 'Fehlende Sicherheitsausrüstung'
  },
  'Tieffliegen_unter_130_Meter': {
    kategorie: 'Luftfahrtgesetz §8',
    beschreibung: 'Tieffliegen unter 130 Metern Höhe',
    beschlagnahmung: 'Keine',
    zusatz: 'Unterschreiten der Mindestflughöhe'
  },
  'Kreisfliegen_über_Sperrzonen': {
    kategorie: 'Luftfahrtgesetz §9',
    beschreibung: 'Kreisfliegen über Sperrzonen',
    beschlagnahmung: 'Keine',
    zusatz: 'Überfliegen von gesperrten Bereichen'
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stgb')
    .setDescription('Durchsuche das Strafgesetzbuch von Pizzaland')
    .addStringOption(option =>
      option
        .setName('delikt')
        .setDescription('Wähle ein Delikt aus')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    try {
      const focusedValue = interaction.options.getFocused().toLowerCase();
      
      // Alle Delikte als Auswahlmöglichkeiten
      const choices = Object.keys(strafkatalog).map(key => ({
        name: key.replace(/_/g, ' ').substring(0, 100), // Discord limit: max 100 Zeichen
        value: key
      }));

      // Filtern basierend auf Eingabe
      const filtered = focusedValue.length > 0
        ? choices.filter(choice =>
            choice.name.toLowerCase().includes(focusedValue)
          ).slice(0, 25)
        : choices.slice(0, 25); // Discord limit: max 25 Optionen

      await interaction.respond(filtered);
    } catch (error) {
      console.error('Autocomplete Fehler:', error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    const deliktKey = interaction.options.getString('delikt');
    const delikt = strafkatalog[deliktKey];

    if (!delikt) {
      return await interaction.reply({
        content: '❌ Dieses Delikt wurde nicht im Strafkatalog gefunden!',
        ephemeral: true
      });
    }

    const details = gesetzDetails[deliktKey];
    
    if (!details) {
      return await interaction.reply({
        content: '❌ Für dieses Delikt sind keine Details verfügbar!',
        ephemeral: true
      });
    }

    // Name formatieren
    const deliktName = deliktKey.replace(/_/g, ' ');
    
    // Farbe basierend auf Schwere
    let embedColor = '#00ff00'; // Grün für Ordnungswidrigkeiten
    if (delikt.haft >= 15) {
      embedColor = '#8b0000'; // Dunkelrot für sehr schwere Verbrechen
    } else if (delikt.haft >= 10) {
      embedColor = '#ff0000'; // Rot für schwere Verbrechen
    } else if (delikt.haft >= 5) {
      embedColor = '#ff4444'; // Hellrot für mittlere Verbrechen
    } else if (delikt.haft > 0) {
      embedColor = '#ffa500'; // Orange für leichte Verbrechen
    }

    // Embed erstellen
    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`⚖️ ${deliktName}`)
      .setDescription(`**${delikt.paragraf}** - ${details.kategorie}\n\n${details.beschreibung}`)
      .addFields(
        {
          name: '🔒 Haftstrafe',
          value: delikt.haft > 0 ? `**${delikt.haft} Hafteinheiten**` : '❌ Keine Haftstrafe',
          inline: true
        },
        {
          name: '💰 Geldstrafe',
          value: delikt.geld > 0 ? `**${delikt.geld.toLocaleString('de-DE')} €**` : '❌ Keine Geldstrafe',
          inline: true
        },
        {
          name: '📋 Typ',
          value: delikt.haft === 0 ? '⚠️ Ordnungswidrigkeit' : '🚨 Straftat',
          inline: true
        }
      );

    // Beschlagnahmung
    if (details.beschlagnahmung && details.beschlagnahmung !== 'Keine') {
      embed.addFields({
        name: '🔍 Beschlagnahmung',
        value: `**${details.beschlagnahmung}**`,
        inline: false
      });
    }

    // Zusatzinfo
    if (details.zusatz) {
      embed.addFields({
        name: 'ℹ️ Zusatzinformation',
        value: details.zusatz,
        inline: false
      });
    }

    // Antragsdelikt kennzeichnen
    if (details.zusatz && details.zusatz.includes('Antragsdelikt')) {
      embed.addFields({
        name: '🟠 Antragsdelikt',
        value: 'Dieses Delikt muss vom Geschädigten angezeigt werden. Bei besonderem öffentlichen Interesse kann die Staatsanwaltschaft auch ohne Antrag verfolgen.',
        inline: false
      });
    }

    // Spezielle Warnungen
    if (delikt.haft >= 15 || delikt.geld >= 10000) {
      embed.addFields({
        name: '⚠️ WARNUNG',
        value: '**SCHWERES VERBRECHEN** mit erheblichen Konsequenzen!',
        inline: false
      });
    }

    // Umrechnungshinweis bei Geldstrafen
    if (delikt.geld > 0 && delikt.haft === 0) {
      const hafteinheiten = delikt.geld / 1000;
      embed.addFields({
        name: '💡 Umrechnung',
        value: `Bei Nichtzahlung: **${hafteinheiten} Hafteinheiten** (1000€ = 1 Hafteinheit)\nZahlungsfrist: 14 Tage, danach Fahndungsliste`,
        inline: false
      });
    }

    // Gesamtschaden bei hohen Strafen
    if (delikt.haft > 0 && delikt.geld > 0) {
      const gesamtMinuten = delikt.haft * 10;
      embed.addFields({
        name: '⏱️ Gesamtstrafe',
        value: `**${gesamtMinuten} Minuten** Gefängnis + **${delikt.geld.toLocaleString('de-DE')} €** Geldstrafe`,
        inline: false
      });
    }

    embed.setFooter({ 
      text: 'Pizzaland Strafgesetzbuch | §8 Zwangsvollstreckung: Unbezahlte Strafen werden nach 14 Tagen in Haft umgewandelt' 
    });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};