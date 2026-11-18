// The words of the pond. The pond practices the spelling with the four
// strategies of FRESCH: to swing the syllables, to lengthen the word, to
// derive it from a related word, and to remember it.

export type Strategy = "schwingen" | "verlaengern" | "ableiten" | "merken";

export const STRATEGIES: Strategy[] = [
  "schwingen",
  "verlaengern",
  "ableiten",
  "merken",
];

export const STRATEGY_NAMES: Record<Strategy, string> = {
  schwingen: "Schwingen",
  verlaengern: "Verlängern",
  ableiten: "Ableiten",
  merken: "Merken",
};

/** the easy words, the words from class 4 on, the words from class 6 on */
export const LEVELS = [1, 2, 3];

/** a hard place of a word, and the strategy that helps there */
export interface Spot {
  at: number;
  len: number;
  strategy: Strategy;
  /** the longer or the related word in syllables, or a note for a word to remember */
  help?: string;
}

export interface Word {
  text: string;
  syllables: string[];
  spots: Spot[];
  /** the strategy that the word practices */
  strategy: Strategy;
  level: number;
  /** an emoji that shows the word */
  pic?: string;
  /** a sentence with the word, the voice reads it and the page shows it with a gap */
  sentence?: string;
}

// A word with its marks: "-" parts the syllables, "(…)" holds a hard place.
export function parseMarked(marked: string): {
  text: string;
  syllables: string[];
  ranges: [at: number, len: number][];
} {
  let text = "";
  let syllable = "";
  let open = 0;
  const syllables: string[] = [];
  const ranges: [number, number][] = [];
  for (const ch of marked) {
    if (ch === "-") {
      if (syllable) syllables.push(syllable);
      syllable = "";
    } else if (ch === "(") open = text.length;
    else if (ch === ")") ranges.push([open, text.length - open]);
    else {
      text += ch;
      syllable += ch;
    }
  }
  if (syllable) syllables.push(syllable);
  return { text, syllables, ranges };
}

type Help = [strategy: Strategy, help?: string];
type Row = [
  marked: string,
  level: number,
  pic: string,
  sentence: string,
  ...spots: Help[],
];

const V = (longer: string): Help => ["verlaengern", longer];
const A = (related: string): Help => ["ableiten", related];
const M = (note?: string): Help => ["merken", note];

function words(strategy: Strategy, rows: Row[]): Word[] {
  return rows.map(([marked, level, pic, sentence, ...helps]) => {
    const { text, syllables, ranges } = parseMarked(marked);
    return {
      text,
      syllables,
      spots: ranges.map(([at, len], i) => ({
        at,
        len,
        strategy: helps[i][0],
        help: helps[i][1],
      })),
      strategy,
      level,
      pic: pic || undefined,
      sentence,
    };
  });
}

const W = "Das v klingt hier wie w.";
const LONG_I = "Das i klingt lang, aber es steht ohne e.";
const TION = "Die Endung tion klingt wie zjon.";

// Words that are written as they sound. To swing the syllables finds each letter.
const SCHWINGEN: Row[] = [
  ["To-ma-te", 1, "🍅", "Die Tomate ist rot und rund."],
  ["Ba-na-ne", 1, "🍌", "Der Affe isst eine Banane."],
  ["Na-se", 1, "👃", "Meine Nase ist kalt."],
  ["Ro-se", 1, "🌹", "Die Rose duftet gut."],
  ["Ha-se", 1, "🐰", "Der Hase hoppelt über die Wiese."],
  ["Do-se", 1, "🥫", "Die Dose ist leer."],
  ["Me-lo-ne", 1, "🍉", "Die Melone schmeckt süß."],
  ["Son-ne", 1, "☀️", "Die Sonne scheint hell."],
  ["But-ter", 1, "🧈", "Die Butter ist weich."],
  ["Was-ser", 1, "💧", "Das Wasser ist kalt."],
  ["Tel-ler", 1, "🍽️", "Der Teller ist leer."],
  ["Ham-mer", 1, "🔨", "Der Hammer ist schwer."],
  ["Wol-ke", 1, "☁️", "Die Wolke ist grau."],
  ["Lam-pe", 1, "💡", "Die Lampe leuchtet hell."],
  ["En-te", 1, "🦆", "Die Ente schwimmt im Teich."],
  ["Ga-bel", 1, "🍴", "Die Gabel liegt neben dem Teller."],
  ["Ne-bel", 1, "🌫️", "Der Nebel ist dicht."],
  ["Kro-ko-dil", 1, "🐊", "Das Krokodil hat scharfe Zähne."],
  ["Sa-lat", 1, "🥗", "Der Salat ist frisch."],
  ["Ra-ke-te", 1, "🚀", "Die Rakete fliegt zum Mond."],
  ["Kro-ne", 1, "👑", "Der König trägt eine Krone."],
  ["A-na-nas", 1, "🍍", "Die Ananas ist gelb."],
  ["Te-le-fon", 1, "☎️", "Das Telefon klingelt laut."],
  ["Scho-ko-la-de", 1, "🍫", "Die Schokolade schmeckt lecker."],

  ["Schmet-ter-ling", 2, "🦋", "Der Schmetterling fliegt zur Blume."],
  ["Re-gen-bo-gen", 2, "🌈", "Der Regenbogen hat viele Farben."],
  ["Kin-der-gar-ten", 2, "", "Mein Bruder geht in den Kindergarten."],
  ["Was-ser-fla-sche", 2, "", "Die Wasserflasche ist voll."],
  ["Ta-schen-lam-pe", 2, "🔦", "Die Taschenlampe leuchtet im Dunkeln."],
  ["Mar-me-la-de", 2, "", "Die Marmelade ist aus Erdbeeren."],
  ["Kar-tof-fel", 2, "🥔", "Die Kartoffel wächst in der Erde."],
  ["Trom-pe-te", 2, "🎺", "Die Trompete klingt laut."],
  ["Schul-ta-sche", 2, "🎒", "Die Schultasche ist schwer."],
  ["Ap-fel-saft", 2, "🧃", "Der Apfelsaft schmeckt süß."],
  ["Win-ter-man-tel", 2, "🧥", "Der Wintermantel ist warm."],
  ["Pa-pa-gei", 2, "🦜", "Der Papagei kann sprechen."],
  ["Re-gen-schirm", 2, "☂️", "Der Regenschirm ist nass."],
  ["Ba-de-wan-ne", 2, "🛁", "Die Badewanne ist voll."],
  ["Li-mo-na-de", 2, "🥤", "Die Limonade ist kalt."],
  ["E-le-fan-ten", 2, "🐘", "Im Zoo leben zwei Elefanten."],
  ["Schne-cke", 2, "🐌", "Die Schnecke kriecht langsam."],
  ["Pan-tof-fel", 2, "", "Der Pantoffel liegt unter dem Bett."],
  ["Fens-ter", 2, "", "Das Fenster steht offen."],
  ["Ge-mü-se", 2, "🥕", "Frisches Gemüse ist gesund."],
  ["Ka-len-der", 2, "📅", "Der Kalender hängt an der Wand."],

  ["Wis-sen-schaft", 3, "", "Die Wissenschaft sucht nach Antworten."],
  ["Tem-pe-ra-tur", 3, "🌡️", "Die Temperatur steigt im Sommer."],
  ["In-stru-ment", 3, "🎻", "Die Geige ist ein Instrument."],
  ["Ex-pe-ri-ment", 3, "🧪", "Das Experiment gelingt."],
  ["Er-in-ne-rung", 3, "", "Das Foto ist eine schöne Erinnerung."],
  ["Zu-sam-men-ar-beit", 3, "", "Die Zusammenarbeit klappt gut."],
  ["Un-ter-schrift", 3, "", "Hier fehlt noch deine Unterschrift."],
  ["Ü-ber-ra-schung", 3, "🎁", "Das Geschenk ist eine Überraschung."],
  ["A-ben-teu-er", 3, "", "Die Reise war ein Abenteuer."],
  ["Ge-le-gen-heit", 3, "", "Das ist eine gute Gelegenheit."],
  ["In-te-res-se", 3, "", "Ich habe großes Interesse an Tieren."],
  ["Un-ter-richts-stun-de", 3, "", "Die Unterrichtsstunde dauert lange."],
  ["Fo-to-ap-pa-rat", 3, "📷", "Der Fotoapparat liegt im Rucksack."],
  ["Ge-schich-te", 3, "📖", "Opa liest eine Geschichte vor."],
  ["Mit-tag-es-sen", 3, "🍝", "Das Mittagessen steht auf dem Tisch."],
  ["Haus-auf-ga-ben", 3, "", "Ich mache meine Hausaufgaben."],
  ["Ge-sell-schaft", 3, "", "Der Hund leistet mir Gesellschaft."],
  ["Mann-schaft", 3, "⚽", "Unsere Mannschaft hat gewonnen."],
  ["Nach-rich-ten", 3, "📰", "Papa schaut die Nachrichten."],
  ["Spa-zier-gang", 3, "", "Nach dem Essen machen wir einen Spaziergang."],
];

// The end of the word sounds hard or short. The longer word shows the letter.
const VERLAENGERN: Row[] = [
  ["Hun(d)", 1, "🐶", "Der Hund bellt laut.", V("Hun-de")],
  ["Kin(d)", 1, "🧒", "Das Kind spielt im Garten.", V("Kin-der")],
  ["Wal(d)", 1, "🌲", "Im Wald ist es still.", V("Wäl-der")],
  ["Han(d)", 1, "✋", "Meine Hand ist warm.", V("Hän-de")],
  ["Mon(d)", 1, "🌙", "Der Mond scheint in der Nacht.", V("Mon-de")],
  ["Pfer(d)", 1, "🐴", "Das Pferd frisst Heu.", V("Pfer-de")],
  ["Bil(d)", 1, "🖼️", "Das Bild hängt an der Wand.", V("Bil-der")],
  ["Gel(d)", 1, "💶", "Ich spare mein Geld.", V("Gel-der")],
  ["Hem(d)", 1, "👔", "Das Hemd ist sauber.", V("Hem-den")],
  ["A-ben(d)", 1, "", "Am Abend wird es dunkel.", V("A-ben-de")],
  ["Freun(d)", 1, "", "Mein Freund kommt mit.", V("Freun-de")],
  ["run(d)", 1, "", "Der Ball ist rund.", V("run-de")],
  ["Ber(g)", 1, "⛰️", "Der Berg ist hoch.", V("Ber-ge")],
  ["Zwer(g)", 1, "", "Der Zwerg trägt eine Mütze.", V("Zwer-ge")],
  ["Ta(g)", 1, "", "Der Tag ist schön.", V("Ta-ge")],
  ["We(g)", 1, "", "Der Weg ist weit.", V("We-ge")],
  ["Zu(g)", 1, "🚆", "Der Zug fährt ab.", V("Zü-ge")],
  ["Bur(g)", 1, "🏰", "Die Burg steht auf dem Hügel.", V("Bur-gen")],
  ["Kor(b)", 1, "🧺", "Der Korb ist voll.", V("Kör-be")],
  ["Die(b)", 1, "", "Der Dieb rennt weg.", V("Die-be")],
  ["Stau(b)", 1, "", "Der Staub liegt auf dem Regal.", V("stau-big")],
  ["gel(b)", 1, "", "Die Banane ist gelb.", V("gel-be")],
  ["lie(b)", 1, "", "Meine Oma ist lieb.", V("lie-be")],

  ["Ba(ll)", 2, "⚽", "Der Ball rollt ins Tor.", V("Bäl-le")],
  ["Ka(mm)", 2, "", "Der Kamm liegt im Bad.", V("Käm-me")],
  ["Schi(ff)", 2, "🚢", "Das Schiff fährt über das Meer.", V("Schif-fe")],
  ["Bla(tt)", 2, "🍃", "Das Blatt fällt vom Baum.", V("Blät-ter")],
  ["Be(tt)", 2, "🛏️", "Das Bett ist weich.", V("Bet-ten")],
  ["schne(ll)", 2, "", "Der Hase läuft schnell.", V("schnel-ler")],
  ["du(mm)", 2, "", "Die Frage ist nicht dumm.", V("düm-mer")],
  ["ko(mm)t", 2, "", "Mein Freund kommt heute.", V("kom-men")],
  ["re(nn)t", 2, "", "Der Hund rennt zum Ball.", V("ren-nen")],
  ["schwi(mm)t", 2, "", "Die Ente schwimmt im Teich.", V("schwim-men")],
  ["sa(g)t", 2, "", "Die Lehrerin sagt Hallo.", V("sa-gen")],
  ["le(b)t", 2, "", "Der Fisch lebt im Wasser.", V("le-ben")],
  ["fra(g)t", 2, "", "Das Kind fragt nach dem Weg.", V("fra-gen")],
  ["Han(d)-tuch", 2, "", "Das Handtuch ist nass.", V("Hän-de")],
  ["Stran(d)", 2, "🏖️", "Am Strand liegt eine Muschel.", V("Strän-de")],
  [
    "Flu(g)-zeu(g)",
    2,
    "✈️",
    "Das Flugzeug landet gleich.",
    V("Flü-ge"),
    V("Flug-zeu-ge"),
  ],
  ["Kö-ni(g)", 2, "👑", "Der König wohnt im Schloss.", V("Kö-ni-ge")],
  ["Kä-fi(g)", 2, "", "Der Vogel sitzt im Käfig.", V("Kä-fi-ge")],
  ["fer-ti(g)", 2, "", "Ich bin mit den Aufgaben fertig.", V("fer-ti-ge")],
  ["lus-ti(g)", 2, "🤡", "Der Clown ist lustig.", V("lus-ti-ge")],
  ["wich-ti(g)", 2, "", "Die Aufgabe ist wichtig.", V("wich-ti-ge")],
  ["ru-hi(g)", 2, "", "Im Wald ist es ruhig.", V("ru-hi-ge")],
  ["Zwei(g)", 2, "", "Der Vogel sitzt auf dem Zweig.", V("Zwei-ge")],
  ["Wan(d)", 2, "", "Das Bild hängt an der Wand.", V("Wän-de")],
  ["Hel(d)", 2, "🦸", "Der Held rettet die Stadt.", V("Hel-den")],
  ["Ge-burts-ta(g)", 2, "🎂", "Heute habe ich Geburtstag.", V("Ta-ge")],
  [
    "Kle(b)-sto(ff)",
    2,
    "",
    "Der Klebstoff ist leer.",
    V("kle-ben"),
    V("Stof-fe"),
  ],

  ["Ab-schie(d)", 3, "", "Der Abschied fällt mir schwer.", V("Ab-schie-de")],
  ["er-fol(g)-reich", 3, "", "Die Mannschaft war erfolgreich.", V("Er-fol-ge")],
  ["Ge-sun(d)-heit", 3, "", "Die Gesundheit ist sehr wichtig.", V("ge-sun-de")],
  ["wü-ten(d)", 3, "😠", "Der Riese ist wütend.", V("wü-ten-de")],
  ["span-nen(d)", 3, "", "Das Buch ist spannend.", V("span-nen-de")],
  [
    "an-stren-gen(d)",
    3,
    "",
    "Das Training ist anstrengend.",
    V("an-stren-gen-de"),
  ],
  ["Aus-flu(g)", 3, "", "Der Ausflug geht in den Zoo.", V("Aus-flü-ge")],
  ["Be-tru(g)", 3, "", "Das war ein gemeiner Betrug.", V("be-trü-gen")],
  ["Ur-lau(b)", 3, "🏝️", "Im Sommer machen wir Urlaub.", V("Ur-lau-be")],
  ["frem(d)", 3, "", "Die Stadt ist mir fremd.", V("frem-de")],
  ["Lan(d)-kar-te", 3, "🗺️", "Die Landkarte hängt im Flur.", V("Län-der")],
  [
    "Fein(d)-schaft",
    3,
    "",
    "Aus dem Streit wurde eine Feindschaft.",
    V("Fein-de"),
  ],
  ["be-ka(nn)t", 3, "", "Der Sänger ist sehr bekannt.", V("ken-nen")],
  ["er-ka(nn)t", 3, "", "Sie hat mich sofort erkannt.", V("er-ken-nen")],
  [
    "ge-wi(nn)t",
    3,
    "🏆",
    "Unsere Mannschaft gewinnt das Spiel.",
    V("ge-win-nen"),
  ],
  ["be-gi(nn)t", 3, "", "Der Film beginnt um acht Uhr.", V("be-gin-nen")],
  [
    "Schrei(b)-tisch",
    3,
    "",
    "Auf dem Schreibtisch liegt ein Heft.",
    V("schrei-ben"),
  ],
  ["Rau(b)-tier", 3, "🦁", "Der Löwe ist ein Raubtier.", V("rau-ben")],
  ["be-lie(b)t", 3, "", "Das Spiel ist sehr beliebt.", V("lie-ben")],
  ["en(d)-lich", 3, "", "Die Ferien sind endlich da.", V("En-de")],
  ["schwie-ri(g)", 3, "", "Die Aufgabe ist schwierig.", V("schwie-ri-ge")],
];

// The word has ä or äu. A related word with a or au shows it.
const ABLEITEN: Row[] = [
  ["H(äu)-ser", 1, "🏘️", "In der Straße stehen viele Häuser.", A("Haus")],
  ["M(äu)-se", 1, "🐭", "Die Katze jagt Mäuse.", A("Maus")],
  ["B(äu)-me", 1, "🌳", "Im Park stehen hohe Bäume.", A("Baum")],
  ["H(ä)n-de", 1, "🙌", "Ich wasche meine Hände.", A("Hand")],
  ["Z(ä)h-ne", 1, "🦷", "Ich putze meine Zähne.", A("Zahn")],
  ["(Ä)p-fel", 1, "🍎", "Am Baum hängen rote Äpfel.", A("Ap-fel")],
  ["B(ä)l-le", 1, "", "Die Kinder werfen Bälle.", A("Ball")],
  ["G(ä)r-ten", 1, "", "Im Sommer blühen die Gärten.", A("Gar-ten")],
  ["Bl(ä)t-ter", 1, "🍂", "Im Herbst fallen die Blätter.", A("Blatt")],
  ["k(ä)l-ter", 1, "🥶", "Im Winter wird es kälter.", A("kalt")],
  ["l(äu)ft", 1, "🏃", "Der Hund läuft schnell.", A("lau-fen")],
  ["tr(äu)mt", 1, "", "Das Kind träumt von einem Pferd.", A("Traum")],
  ["W(ä)l-der", 1, "", "Die Wälder sind im Sommer grün.", A("Wald")],
  ["St(ä)d-te", 1, "🏙️", "Berlin und Hamburg sind große Städte.", A("Stadt")],
  ["R(ä)-der", 1, "", "Das Auto hat vier Räder.", A("Rad")],
  ["Gl(ä)-ser", 1, "🥛", "Auf dem Tisch stehen Gläser.", A("Glas")],
  ["f(ä)hrt", 1, "🚌", "Der Bus fährt zur Schule.", A("fah-ren")],
  ["schl(ä)ft", 1, "😴", "Das Baby schläft tief.", A("schla-fen")],
  ["B(ä)-cker", 1, "🥖", "Der Bäcker verkauft Brot.", A("ba-cken")],
  ["Kr(äu)-ter", 1, "🌿", "In der Suppe sind frische Kräuter.", A("Kraut")],

  [
    "(Ver)-k(äu)-fer",
    2,
    "",
    "Der Verkäufer ist freundlich.",
    M(),
    A("kau-fen"),
  ],
  ["Ge-b(äu)-de", 2, "🏢", "Das Gebäude ist sehr hoch.", A("bau-en")],
  ["R(äu)-ber", 2, "", "Der Räuber versteckt den Schatz.", A("rau-ben")],
  ["auf-r(äu)-men", 2, "", "Ich muss mein Zimmer aufräumen.", A("Raum")],
  ["Ge-r(äu)sch", 2, "", "Ich höre ein leises Geräusch.", A("rau-schen")],
  ["l(äu)-ten", 2, "🔔", "Die Glocken läuten am Sonntag.", A("laut")],
  ["Tr(äu)-me", 2, "", "Ich habe schöne Träume.", A("Traum")],
  ["st(ä)r-ker", 2, "💪", "Der Wind wird stärker.", A("stark")],
  ["w(ä)r-mer", 2, "", "Im Frühling wird es wärmer.", A("warm")],
  ["l(ä)n-ger", 2, "", "Im Sommer sind die Tage länger.", A("lang")],
  ["(ä)n-dern", 2, "", "Ich will meine Antwort ändern.", A("an-ders")],
  ["er-z(ä)h-len", 2, "", "Opa kann spannend erzählen.", A("Zahl")],
  ["ge-f(ä)hr-lich", 2, "⚠️", "Das Feuer ist gefährlich.", A("Ge-fahr")],
  ["t(ä)g-lich", 2, "", "Ich übe täglich.", A("Tag")],
  ["J(ä)-ger", 2, "", "Der Jäger geht durch den Wald.", A("ja-gen")],
  ["G(ä)s-te", 2, "", "Zum Fest kommen viele Gäste.", A("Gast")],
  ["K(ä)l-te", 2, "", "Die Kälte kriecht ins Haus.", A("kalt")],
  ["N(ä)ch-te", 2, "🌃", "Im Winter sind die Nächte lang.", A("Nacht")],
  ["h(äu)-fig", 2, "", "Im Herbst regnet es häufig.", A("Hau-fen")],
  ["S(äu)-re", 2, "🍋", "Die Zitrone enthält Säure.", A("sau-er")],

  ["Ver-st(ä)nd-nis", 3, "", "Danke für dein Verständnis.", A("Ver-stand")],
  ["re-gel-m(ä)-ßig", 3, "", "Ich trainiere regelmäßig.", A("Maß")],
  ["Ge-d(ä)cht-nis", 3, "🧠", "Mein Gedächtnis ist gut.", A("ge-dacht")],
  ["Ver-(ä)n-de-rung", 3, "", "Jede Veränderung braucht Zeit.", A("an-ders")],
  ["(äu)-ßer-lich", 3, "", "Die Wunde ist nur äußerlich.", A("au-ßen")],
  ["be-sch(ä)f-tigt", 3, "", "Mama ist gerade beschäftigt.", A("schaf-fen")],
  ["Er-k(ä)l-tung", 3, "🤧", "Ich habe eine Erkältung.", A("kalt")],
  [
    "ent-t(äu)scht",
    3,
    "",
    "Nach dem Spiel war ich enttäuscht.",
    A("tau-schen"),
  ],
  ["Ge-f(ä)ng-nis", 3, "", "Der Dieb kommt ins Gefängnis.", A("ge-fan-gen")],
  ["Er-g(ä)n-zung", 3, "", "Der Satz braucht eine Ergänzung.", A("ganz")],
  ["zu-ver-l(ä)s-sig", 3, "", "Mein Freund ist zuverlässig.", A("ver-las-sen")],
  ["Be-h(ä)l-ter", 3, "", "Der Behälter ist dicht.", A("hal-ten")],
  ["selbst-st(ä)n-dig", 3, "", "Ich arbeite selbstständig.", A("Stand")],
  ["Ge-m(ä)l-de", 3, "🖼️", "Im Museum hängt ein Gemälde.", A("ma-len")],
  ["er-kl(ä)-ren", 3, "", "Kannst du mir die Aufgabe erklären?", A("klar")],
  [
    "n(ä)m-lich",
    3,
    "",
    "Ich komme später, ich habe nämlich Training.",
    A("Na-me"),
  ],
  ["ver-st(ä)nd-lich", 3, "", "Der Text ist gut verständlich.", A("Ver-stand")],
  ["vor-l(äu)-fig", 3, "", "Das Ergebnis ist vorläufig.", A("lau-fen")],
  [
    "Be-sch(ä)-di-gung",
    3,
    "",
    "Die Beschädigung ist kaum zu sehen.",
    A("Scha-den"),
  ],
];

// No rule shows these letters. The child looks at the word and remembers it.
const MERKEN: Row[] = [
  ["(V)o-gel", 1, "🐦", "Der Vogel singt im Baum.", M()],
  ["(V)a-ter", 1, "👨", "Mein Vater kocht heute.", M()],
  ["(vie)l", 1, "", "Ich habe viel Durst.", M()],
  ["(v)ier", 1, "4️⃣", "Der Tisch hat vier Beine.", M()],
  ["(v)on", 1, "", "Das Geschenk ist von Oma.", M()],
  ["(v)oll", 1, "", "Das Glas ist voll.", M()],
  ["S(ee)", 1, "", "Wir baden im See.", M()],
  ["T(ee)", 1, "🍵", "Der Tee ist heiß.", M()],
  ["B(oo)t", 1, "⛵", "Das Boot schaukelt auf den Wellen.", M()],
  ["Z(oo)", 1, "🦒", "Im Zoo leben viele Tiere.", M()],
  ["M(ee)r", 1, "🌊", "Das Meer ist tief.", M()],
  ["Schn(ee)", 1, "❄️", "Im Winter fällt Schnee.", M()],
  ["H(aa)-re", 1, "", "Meine Haare sind nass.", M()],
  ["F(ah)r-ra(d)", 1, "🚲", "Mein Fahrrad ist blau.", M(), V("Rä-der")],
  ["(Uh)r", 1, "⏰", "Die Uhr tickt leise.", M()],
  ["Z(ah)l", 1, "🔢", "Die Zahl ist gerade.", M()],
  ["S(oh)n", 1, "", "Der Sohn hilft beim Kochen.", M()],
  ["L(eh)-rer", 1, "", "Der Lehrer schreibt an die Tafel.", M()],
  ["Fu(ß)", 1, "🦶", "Mein Fuß tut weh.", M()],
  ["Stra-(ß)e", 1, "🛣️", "Die Straße ist breit.", M()],
  ["hei(ß)", 1, "🔥", "Die Suppe ist heiß.", M()],
  ["gro(ß)", 1, "", "Der Elefant ist groß.", M()],
  ["wei(ß)", 1, "", "Der Schnee ist weiß.", M()],
  ["Fu(chs)", 1, "🦊", "Der Fuchs schleicht durch den Wald.", M()],
  ["se(chs)", 1, "6️⃣", "Der Käfer hat sechs Beine.", M()],
  ["He-(x)e", 1, "🧙", "Die Hexe fliegt auf dem Besen.", M()],

  ["(V)er-k(eh)r", 2, "🚦", "Auf der Kreuzung ist viel Verkehr.", M(), M()],
  ["(vie)l-leicht", 2, "", "Morgen regnet es vielleicht.", M()],
  [
    "(v)or-sich-ti(g)",
    2,
    "",
    "Die Katze ist vorsichtig.",
    M(),
    V("vor-sich-ti-ge"),
  ],
  [
    "(V)or-mit-ta(g)",
    2,
    "",
    "Am Vormittag haben wir Sport.",
    M(),
    V("Vor-mit-ta-ge"),
  ],
  ["Ma-sch(i)-ne", 2, "⚙️", "Die Maschine ist laut.", M(LONG_I)],
  ["T(i)-ger", 2, "🐯", "Der Tiger hat Streifen.", M(LONG_I)],
  ["K(i)-no", 2, "🎬", "Wir gehen ins Kino.", M(LONG_I)],
  ["W(oh)-nung", 2, "", "Unsere Wohnung hat drei Zimmer.", M()],
  ["F(eh)-ler", 2, "", "Jeder macht mal einen Fehler.", M()],
  ["Fr(üh)-stück", 2, "🥐", "Zum Frühstück esse ich Müsli.", M()],
  ["K(üh)l-schrank", 2, "", "Die Milch steht im Kühlschrank.", M()],
  ["B(oh)-ne", 2, "", "Die Bohne wächst an der Stange.", M()],
  ["drau-(ß)en", 2, "", "Die Kinder spielen draußen.", M()],
  ["Grü-(ß)e", 2, "", "Ich schicke dir liebe Grüße.", M()],
  ["flei-(ß)i(g)", 2, "🐝", "Die Biene ist fleißig.", M(), V("flei-ßi-ge")],
  ["Spa(ß)", 2, "", "Das Spiel macht Spaß.", M()],
  ["Sta(dt)", 2, "🏙️", "Wir fahren in die Stadt.", M()],
  ["(Qu)al-le", 2, "", "Die Qualle schwimmt im Meer.", M()],
  ["(Qu)a-drat", 2, "🟦", "Ein Quadrat hat vier Ecken.", M()],
  ["be-(qu)em", 2, "🛋️", "Das Sofa ist bequem.", M()],
  ["A(x)t", 2, "🪓", "Die Axt ist scharf.", M()],
  ["Ta-(x)i", 2, "🚕", "Das Taxi wartet vor der Tür.", M()],
  ["wa(ch-s)en", 2, "🌱", "Die Blumen wachsen schnell.", M()],
  ["P(aa)r", 2, "👟", "Ich brauche ein Paar Schuhe.", M()],
  ["I-d(ee)", 2, "💡", "Das ist eine gute Idee.", M()],
  ["Kaf-f(ee)", 2, "☕", "Papa trinkt Kaffee.", M()],
  ["l(ee)r", 2, "", "Die Flasche ist leer.", M()],
  ["M(ai)", 2, "", "Im Mai blühen die Blumen.", M()],
  ["K(ai)-ser", 2, "", "Der Kaiser wohnt im Schloss.", M()],
  ["(C)om-pu-ter", 2, "💻", "Der Computer ist neu.", M()],
  ["Ba-b(y)", 2, "👶", "Das Baby schläft.", M()],
  ["Po-n(y)", 2, "", "Das Pony frisst Gras.", M()],
  ["Han-d(y)", 2, "📱", "Mein Handy klingelt.", M()],

  ["(Rhy)(th)-mus", 3, "🥁", "Die Trommel gibt den Rhythmus vor.", M(), M()],
  ["(Th)e-a-ter", 3, "🎭", "Wir gehen heute ins Theater.", M()],
  ["(Th)e-ma", 3, "", "Das Thema ist spannend.", M()],
  ["Bi-bli-o-(th)ek", 3, "📚", "Ich leihe ein Buch in der Bibliothek.", M()],
  ["A-po-(th)e-ke", 3, "💊", "Die Apotheke hat geöffnet.", M()],
  ["Ma-(th)e-ma-tik", 3, "", "In Mathematik rechnen wir viel.", M()],
  ["(Phy)-sik", 3, "", "In Physik bauen wir einen Stromkreis.", M()],
  ["Al-(ph)a-bet", 3, "🔤", "Das Alphabet hat 26 Buchstaben.", M()],
  ["Stro-(ph)e", 3, "", "Das Lied hat noch eine Strophe.", M()],
  ["Ka-ta-stro-(ph)e", 3, "", "Das Hochwasser war eine Katastrophe.", M()],
  ["(Ch)a-rak-ter", 3, "", "Sie hat einen guten Charakter.", M()],
  ["(Ch)or", 3, "", "Ich singe im Chor.", M()],
  ["Or-(ch)es-ter", 3, "🎼", "Das Orchester spielt ein Lied.", M()],
  ["s(y)m-pa-(th)isch", 3, "", "Die neue Lehrerin ist sympathisch.", M(), M()],
  ["S(y)s-tem", 3, "", "Das System ist einfach.", M()],
  ["G(y)m-na-si-um", 3, "🏫", "Meine Schwester geht aufs Gymnasium.", M()],
  ["(V)a-se", 3, "🏺", "Die Vase steht auf dem Tisch.", M(W)],
  ["Kla-(v)ier", 3, "🎹", "Ich spiele Klavier.", M(W)],
  ["No-(v)em-ber", 3, "", "Im November wird es kalt.", M(W)],
  ["Ad-(v)ent", 3, "🕯️", "Im Advent backen wir Plätzchen.", M(W)],
  ["ner-(v)ös", 3, "", "Vor dem Auftritt bin ich nervös.", M(W)],
  [
    "w(i)-der-spre-chen",
    3,
    "",
    "Ich muss dir leider widersprechen.",
    M("wider bedeutet gegen. Es steht ohne e."),
  ],
  [
    "w(ie)-der-ho-len",
    3,
    "🔁",
    "Kannst du den Satz wiederholen?",
    M("wieder bedeutet noch einmal. Es steht mit ie."),
  ],
  [
    "sei(d)",
    3,
    "",
    "Ihr seid meine besten Freunde.",
    M("seid kommt von sein."),
  ],
  [
    "sei(t)",
    3,
    "",
    "Ich lerne seit einer Stunde.",
    M("seit sagt etwas über die Zeit."),
  ],
  [
    "da(ss)",
    3,
    "",
    "Ich hoffe, dass du kommst.",
    M("dass mit ss beginnt einen Nebensatz."),
  ],
  ["w(ah)r", 3, "", "Die Geschichte ist wahr.", M("wahr bedeutet: Es stimmt.")],
  ["all-m(äh)-lich", 3, "", "Es wird allmählich dunkel.", M()],
  ["ei-gen(t)-lich", 3, "", "Ich wollte eigentlich schlafen.", M()],
  ["ir-gen(d)-wo", 3, "", "Mein Schlüssel liegt irgendwo.", M()],
  ["A-(d)res-se", 3, "✉️", "Schreib mir deine Adresse auf.", M()],
  ["A(p-p)e-ti(t)", 3, "", "Ich habe großen Appetit.", M(), M()],
  ["Por-(ti)on", 3, "", "Ich nehme eine kleine Portion.", M(TION)],
  ["Sta-(ti)on", 3, "🚉", "Wir steigen an der nächsten Station aus.", M(TION)],
  ["In-for-ma-(ti)on", 3, "", "Ich brauche noch eine Information.", M(TION)],
];

export const WORDS: Word[] = [
  ...words("schwingen", SCHWINGEN),
  ...words("verlaengern", VERLAENGERN),
  ...words("ableiten", ABLEITEN),
  ...words("merken", MERKEN),
];

const BY_TEXT = new Map(WORDS.map((word) => [word.text, word]));

export const builtIn = (text: string) => BY_TEXT.get(text);

const LETTER = "\\p{L}";

// The sentence of a word with a gap in the place of the word.
export function gap(word: Word): string {
  if (!word.sentence) return "";
  const whole = new RegExp(
    "(?<!" + LETTER + ")" + word.text + "(?!" + LETTER + ")",
    "u",
  );
  return word.sentence.replace(whole, "___");
}

const VOWELS = "aeiouyäöü";
const PAIRS = ["au", "ei", "eu", "äu", "ie", "ai", "aa", "ee", "oo"];
/** letters that sound as one consonant */
const UNITS = ["sch", "ch", "ck", "ph", "qu", "th"];
/** two consonants that begin a syllable together */
const ONSET = /^(sch|[bdfgkpt])[lr]$|^sch[mnw]$/;

// The syllables of a word, by simple rules. A hyphen in the word is better.
export function syllabify(text: string): string[] {
  // parts: a run of vowels or one consonant unit
  const parts: { s: string; vowel: boolean }[] = [];
  const low = text.toLowerCase();
  for (let i = 0; i < text.length;) {
    const unit = UNITS.find((u) => low.startsWith(u, i));
    if (unit) {
      parts.push({ s: text.slice(i, i + unit.length), vowel: false });
      i += unit.length;
    } else if (VOWELS.includes(low[i])) {
      const pair = PAIRS.find((p) => low.startsWith(p, i));
      const len = pair ? pair.length : 1;
      parts.push({ s: text.slice(i, i + len), vowel: true });
      i += len;
    } else {
      parts.push({ s: text[i], vowel: false });
      i++;
    }
  }
  const nuclei = parts.flatMap((part, i) => (part.vowel ? [i] : []));
  if (nuclei.length < 2) return [text];
  // the part that begins each next syllable
  const cuts: number[] = [];
  for (let n = 1; n < nuclei.length; n++) {
    const from = nuclei[n - 1] + 1;
    const to = nuclei[n];
    const between = to - from;
    if (between <= 1) cuts.push(from);
    else if (
      between >= 3 &&
      ONSET.test((parts[to - 2].s + parts[to - 1].s).toLowerCase())
    )
      cuts.push(to - 2);
    else cuts.push(to - 1);
  }
  const syllables: string[] = [];
  let start = 0;
  for (const cut of [...cuts, parts.length]) {
    syllables.push(
      parts
        .slice(start, cut)
        .map((part) => part.s)
        .join(""),
    );
    start = cut;
  }
  return syllables;
}

const GUESSES: [pattern: RegExp, strategy: Strategy][] = [
  [/äu|ä/g, "ableiten"],
  [/[dgb](?=t?$)/g, "verlaengern"],
  [/(ll|mm|nn|tt|ff|pp|ss)(?=t?$)/g, "verlaengern"],
  [/[aeiouäöü]h(?=[lmnr])/g, "merken"],
  [/aa|ee|oo|ß|chs|x|qu|y|ph|th|^v|dt/g, "merken"],
];

// The hard places of a word of the child, guessed from its letters.
export function guessSpots(text: string): Spot[] {
  const low = text.toLowerCase();
  const spots: Spot[] = [];
  for (const [pattern, strategy] of GUESSES) {
    for (const match of low.matchAll(pattern)) {
      const at = match.index;
      const len = match[0].length;
      const free = spots.every((s) => at >= s.at + s.len || at + len <= s.at);
      if (free) spots.push({ at, len, strategy });
    }
  }
  return spots.sort((a, b) => a.at - b.at);
}

const OWN = /^[A-Za-zÄÖÜäöüß]+(-[A-Za-zÄÖÜäöüß]+)*$/;
export const OWN_MAX = 200;

// The words that the child brings from school, one per line or with commas.
// A hyphen parts the syllables: "Fahr-rad".
export function parseOwn(input: string): string[] {
  const seen = new Set<string>();
  const own: string[] = [];
  for (const raw of input.split(/[\s,;]+/)) {
    const marked = raw.replace(/^-+|-+$/g, "");
    const text = marked.replaceAll("-", "");
    if (!OWN.test(marked) || text.length < 2 || text.length > 30) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    own.push(marked);
    if (own.length >= OWN_MAX) break;
  }
  return own;
}

// A word of the child. The word list knows more about a word that it has too.
export function ownWord(marked: string): Word {
  const { text, syllables } = parseMarked(marked);
  const known = builtIn(text);
  if (known) return known;
  const spots = guessSpots(text);
  return {
    text,
    syllables: marked.includes("-") ? syllables : syllabify(text),
    spots,
    strategy: spots[0]?.strategy ?? "schwingen",
    level: 0,
  };
}
