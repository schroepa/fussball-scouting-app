import {
  scrapeClubTeams,
  scrapeTeamSquad,
} from "../src/lib/import/fussballDeScraper.ts";

const club = await scrapeClubTeams(
  "https://www.fussball.de/verein/eintracht-kornelimuenster-mittelrhein/-/id/00ES8GN92C0000B1VV0AG08LVUPGND5I",
  "2526"
);
console.log("club", club.club.name, "teams", club.teams.length);
console.log(club.teams.map((t) => t.name).join(" | "));

const youth = club.teams.find((t) => /C-Junioren/i.test(t.name));
if (youth) {
  const squad = await scrapeTeamSquad(youth.teamId, {
    clubId: club.club.externalRef,
    clubName: club.club.name,
    teamName: youth.name,
  });
  console.log("youth squad players", squad.players.length, squad.notice);
}

const herren = club.teams.find(
  (t) => /^Herren - /.test(t.name) && !/II/.test(t.name)
);
if (herren) {
  const squad = await scrapeTeamSquad(herren.teamId, {
    clubId: club.club.externalRef,
    clubName: club.club.name,
    teamName: herren.name,
  });
  console.log(
    "herren players",
    squad.players.length,
    squad.seasonUsed,
    squad.players.slice(0, 3).map((p) => `${p.vorname} ${p.nachname}`)
  );
}
