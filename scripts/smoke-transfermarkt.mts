import { importTransfermarktClub } from "../src/lib/import/transfermarkt.ts";

const url =
  "https://www.transfermarkt.de/bfc-dynamo-u17/startseite/verein/35633";
const result = await importTransfermarktClub(url);
console.log({
  club: result.clubs[0],
  players: result.players.length,
  notice: result.notice,
  sample: result.players.slice(0, 5).map((p) => ({
    name: `${p.vorname} ${p.nachname}`,
    pos: p.positionen[0],
    birth: p.geburtsdatum,
    nation: p.nationalitaet,
  })),
});
