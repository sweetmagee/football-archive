const params = new URLSearchParams(window.location.search);

const playerId = params.get("player");
const seasonId = params.get("season");

Promise.all([
  fetch("data/players.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json()),
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/seasons.json").then(r => r.json())
]).then(([players, apps, matches, seasons]) => {

  const player = players.find(p => p.id === playerId);
  const season = seasons.find(s => s.id === seasonId);

  document.getElementById("title").textContent =
    `${player.name} — ${season.name}`;

  // Filter matches in season
  const seasonMatches = matches.filter(m => m.season_id === seasonId);

  // Player appearances in that season
  const playerApps = apps.filter(a =>
    a.player_id === playerId &&
    seasonMatches.some(m => m.id === a.match_id)
  );

  // Stats
  let totalApps = playerApps.length;
  let totalGoals = playerApps.reduce((sum, a) => sum + Number(a.goals), 0);
  let totalMinutes = playerApps.reduce((sum, a) => sum + (Number(a.minute_out) - Number(a.minute_in)), 0);

  document.getElementById("stats").innerHTML = `
    Apps: ${totalApps}<br>
    Goals: ${totalGoals}<br>
    Minutes: ${totalMinutes}
  `;

  // Match list
  const matchDiv = document.getElementById("matches");

  playerApps.forEach(a => {
    const m = matches.find(x => x.id === a.match_id);

    const el = document.createElement("div");
    el.innerHTML = `
      <a href="match.html?id=${m.id}">
        ${m.date} - ${m.home_team} ${m.home_score}-${m.away_score} ${m.away_team}
      </a>
      (${a.goals} goals)
    `;

    matchDiv.appendChild(el);
  });

});