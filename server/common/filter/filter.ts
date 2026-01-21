import subsData from './subs.json';

const wordlistText = `
Abeed
Abo
Africoon
Africoon-Americoon
Africoonia
Americoon
AmeriKKKunt
anal
analannie
analsex
Ang mo
antifaggot
antinigger
aperest
apesault
A-rab
Arabush
Aravush
areola
arsehole
Ashke-Nazi
assbagger
assblaster
assclown
asscowboy
assfuck
assfucker
asshole
assholes
asshore
assjockey
asskisser
assklown
asslick
asslicker
asslover
assman
assmonkey
assmunch
assmuncher
asspacker
asspirate
asspuppies
assranger
asswhore
asswipe
Aunt-Jemima
Ayrab
badfuck
ballgag
balllicker
ballsack
banging
barelylegal
bastard
bazongas
bazooms
beaner
Beaner
Beaney
beatoff
beatyourmeat
beaver
beef curtains
bellend
bestial
bigass
bigbastard
bigbutt
bitch
bitches
bitchez
bitchslap
Bluegum
blumpkin
bollock
bombing
bondage
boob
booby
Boonga
Bootlip
bootycall
Bougnoule
bountybar
Bounty-bar
brea5t
breastman
Buckra
Buddhahead
buggery
bullcrap
bulldike
bulldyke
bullshit
bumblefuck
bumfuck
bung
bunghole
Burr-head
Burrhead
butchbabes
butchdike
butchdyke
butt-bang
buttbang
buttface
butt-fuck
buttfuck
butt-fucker
buttfucker
butt-fuckers
buttfuckers
buttman
buttmunch
buttpirate
cameljockey
carpetmuncher
catfucker
cawk
Chankoro
cheesedick
Chernozhopy
Chinaman
chinamen
Chink
choad
Choc-ice
chode
Cina
clamdigger
clamdiver
clit
clunge
cock
cockcowboy
cockknob
cocklover
cockrider
cocksmith
cocksmoker
cocksucer
cocksucker
cocksucking
cocktease
coloured
coon
Coon-ass
cooter
cornhole
crackwhore
crotchmonkey
crotchrot
cum
cumbubble
cumfest
cummer
cumming
cumquat
cumqueen
cumshot
cumskin
cumsock
cunilingus
cunnilingus
cunt
cunteyed
cuntfucker
cuntlicker
datnigga
defecate
Dego
dicklick
dicklicker
doggiestyle
doggystyle
dong
Dothead
dripdick
ejaculation
erection
faeces
fag
fagot
fairy
fannyfucker
fastfuck
fatass
fatfuck
fatfucker
fatso
fckcum
feces
felatio
fisting
fuck
fuckity-bye
fucktardedly
fucktardedness
fuck-you
fuuck
goldenshower
Golliwog
Greaseball
Half-breed
handjob
hoes
homobangers
hooters
hore
horney
hussy
Hymie
incest
jackoff
Jigaboo
jigg
jigga
jiggabo
jigger
jiggy
jihad
jijjiboo
jism
jiz
jizjuice
jizm
jizzim
jizzum
kkk
knockers
kummer
kumming
kumquat
kunilingus
kunt
ky
kyke
minge
minger
molester
molestor
moneyshot
Moolinyan
mooncricket
Moon-Cricket
mothafucka
motherfucker
motherfucking
motherfuckings
muff
muffdive
Munt
munter
nigger
niggerhole
niggers
nlgger
nlggor
orgasim
orgasm
orgies
orgy
Oven-Dodger
pansy
pecker
Peckerwood
peehole
pee-pee
peepshow
penis
perv
phonesex
phuk
phuked
phuking
phukking
phungky
phuq
pi55
picaninny
piccaninny
poon
poontang
poorwhitetrash
porn
pornflick
pornking
porno
prostitute
pu55i
pu55y
pubiclicepud
punani
Redskin
retard
retarded
sexslave
sextogo
sexwhore
shag
Sheboon
sheepfucker
shinola
shitcan
shitdick
shiteater
shitface
shitfit
shit for brains
shitforbrains
shitfuck
shitfull
shithapens
shithappens
shithead
shitnigger
shits
slanteye
slavedriver
sleezeball
slimeball
slut
sluts
slutt
snowback
snownigger
spaghettinigger
spankthemonkey
spermbag
spermhearder
spermherder
Spic
spick
spitter
stiffy
strapon
stupidfuck
stupidfucker
suckdick
suckme
suckmyass
suckmydick
suckmytit
Swamp-Guinea
swastika
tatas
Timber-nigger
titbitnipply
titfuck
titfucker
trannie
tranny
transgendered
trans-testicle
trisexual
troid
twink
twobitwhore
unfuckable
Wetback
whiskeydick
whitetrash
Wigger
yambag
zigaboo
testword
`;

type CharSubs = Record<string, string[]>;

export default class ProfanityFilter {
  private profaneWords: Set<string>;
  private charSubstitutions: CharSubs;
  private normalizeMap: Map<string, string>;

  constructor(wordlistOverride?: string, subsOverride?: CharSubs) {
    const wordlistSource = wordlistOverride ?? wordlistText;
    const subsSource = subsOverride ?? (subsData as CharSubs);

    this.profaneWords = this._parseWordlist(wordlistSource);

    this.charSubstitutions = subsSource ?? {};
    this.normalizeMap = new Map<string, string>();

    for (const [baseChar, variations] of Object.entries(this.charSubstitutions)) {
      for (const v of variations) {
        this.normalizeMap.set(v, baseChar);
      }
      this.normalizeMap.set(baseChar, baseChar);
    }
  }

  private _parseWordlist(text: string | undefined): Set<string> {
    if (!text) return new Set();
    const lines = text.split(/\r?\n/);
    const words = lines.map(w => w.trim().toLowerCase()).filter(w => w && !w.startsWith('#'));
    return new Set(words);
  }

  /**
   * Normalize a string and also produce an index map mapping normalized index -> original index.
   */
  private normalizeWithMap(original: string): { normalized: string; indexMap: number[] } {
    const normalizedParts: string[] = [];
    const indexMap: number[] = [];

    const lower = original.toLowerCase();

    for (let i = 0; i < lower.length; i++) {
      const ch = lower[i];

      // Remove diacritics via Unicode NFD and strip combining marks
      const decomposed = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // Map lookalike chars if present
      const mapped = this.normalizeMap.get(decomposed) ?? this.normalizeMap.get(ch) ?? decomposed;

      if (/^[0-9a-z]$/.test(mapped)) {
        normalizedParts.push(mapped);
        indexMap.push(i);
      } else if (/\s/.test(mapped)) {
        normalizedParts.push(' ');
        indexMap.push(i);
      } else {
        // skip punctuation/symbols
      }
    }

    return { normalized: normalizedParts.join(''), indexMap };
  }

  normalizeText(text: string): string {
    return this.normalizeWithMap(text).normalized;
  }

  removeSeparators(text: string): string {
    // Remove spaces, dots, dashes, underscores, asterisks between letters
    return text.replace(/([a-z])[.\-_*\s]+([a-z])/g, '$1$2');
  }

  generateVariants(word: string): string[] {
    const variants = new Set<string>();
    variants.add(word);

    const noSep = this.removeSeparators(word);
    if (noSep !== word) variants.add(noSep);

    const dedupe = word.replace(/(.)\1+/g, '$1');
    if (dedupe !== word) variants.add(dedupe);

    return Array.from(variants);
  }

  isProfane(text: string): boolean {
    if (!text || this.profaneWords.size === 0) return false;

    const { normalized } = this.normalizeWithMap(text);
    const variants = this.generateVariants(normalized);

    for (const variant of variants) {
      const wordsInText = variant.match(/\b\w+\b/g) ?? [];
      for (const w of wordsInText) {
        if (this.profaneWords.has(w.toLowerCase())) return true;
      }

      for (const profaneWord of this.profaneWords) {
        if (profaneWord.length > 2 && variant.includes(profaneWord)) return true;
      }
    }

    return false;
  }

  findProfanity(text: string): Array<[string, string]> {
    if (!text || this.profaneWords.size === 0) return [];

    const resultsSet = new Set<string>();
    const { normalized } = this.normalizeWithMap(text);
    const variants = this.generateVariants(normalized);

    for (const variant of variants) {
      const wordsInText = variant.match(/\b\w+\b/g) ?? [];
      for (const w of wordsInText) {
        if (this.profaneWords.has(w.toLowerCase())) resultsSet.add(`${text}||${w}`);
      }

      for (const profaneWord of this.profaneWords) {
        if (profaneWord.length > 2 && variant.includes(profaneWord))
          resultsSet.add(`${text}||${profaneWord}`);
      }
    }

    return Array.from(resultsSet).map(s => {
      const [orig, det] = s.split('||');
      return [orig, det];
    });
  }

  censorText(text: string, replacement = '*'): string {
    if (!text || this.profaneWords.size === 0) return text;

    const { normalized, indexMap } = this.normalizeWithMap(text);

    const profaneRanges: Array<[number, number, string]> = [];

    // Whole word matches
    const wordRegex = /\b\w+\b/g;
    let m: RegExpExecArray | null;
    while ((m = wordRegex.exec(normalized))) {
      const w = m[0].toLowerCase();
      if (this.profaneWords.has(w)) {
        profaneRanges.push([m.index, m.index + m[0].length, w]);
      }
    }

    // Substring matches
    for (const profaneWord of this.profaneWords) {
      if (profaneWord.length > 3) {
        let start = 0;
        while (true) {
          const pos = normalized.indexOf(profaneWord, start);
          if (pos === -1) break;

          const overlap = profaneRanges.some(([s, e]) => pos < e && pos + profaneWord.length > s);
          if (!overlap) profaneRanges.push([pos, pos + profaneWord.length, profaneWord]);
          start = pos + 1;
        }
      }
    }

    if (profaneRanges.length === 0) return text;

    // Replace from end to start
    profaneRanges.sort((a, b) => b[0] - a[0]);

    let result = text;
    for (const [nStart, nEnd] of profaneRanges) {
      if (nStart < 0 || nEnd - 1 >= indexMap.length) continue;

      const origStart = indexMap[nStart];
      const origEnd = indexMap[nEnd - 1] + 1;

      if (origStart < 0 || origEnd <= origStart) continue;

      const originalSegment = result.slice(origStart, origEnd);
      const censored = this.createCensoredSegment(originalSegment, replacement);
      result = result.slice(0, origStart) + censored + result.slice(origEnd);
    }

    return result;
  }

  private createCensoredSegment(originalSegment: string, replacement: string): string {
    const chars = originalSegment.split('');
    for (let i = 0; i < chars.length; i++) {
      if (/^[0-9a-zA-Z]$/.test(chars[i])) chars[i] = replacement;
    }
    return chars.join('');
  }
}
