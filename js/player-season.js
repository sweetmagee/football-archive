const params = new URLSearchParams(window.location.search);

const playerId = params.get("player");
const seasonId = params.get("season");

Promise.all([
  fetch("data/players.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json()),
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/seasons.json").then(r => r.json()),
  fetch("data/teams.json").then(r => r.json())
]).then(([players, apps, matches, seasons, teams]) => {
  const player = players.find(p => String(p.id).trim() === String(playerId).trim());
  const season = seasons.find(s => String(s.id).trim() === String(seasonId).trim());

  const titleEl = document.getElementById("title");
  const statsEl = document.getElementById("stats");
  const matchesEl = document.getElementById("matches");

  if (!player || !season) {
    titleEl.textContent = "Player season not found";
    statsEl.innerHTML = "<p>Missing player or season data.</p>";
    return;
  }

  titleEl.textContent = `${player.name} — ${season.name}`;

  const seasonMatches = matches.filter(m => String(m.season_id).trim() === String(seasonId).trim());

  const playerApps = apps.filter(a =>
    String(a.player_id).trim() === String(playerId).trim() &&
    seasonMatches.some(m => String(m.id).trim() === String(a.match_id).trim())
  );

  const totalApps = playerApps.length;
  const totalGoals = playerApps.reduce((sum, a) => sum + Number(a.goals || 0), 0);
  const totalMinutes = playerApps.reduce((sum, a) => {
    const minIn = Number(a.minute_in || 0);
    const minOut = Number(a.minute_out || 0);
    return sum + Math.max(0, minOut - minIn);
  }, 0);
  const totalYellows = playerApps.reduce((sum, a) => sum + Number(a.yellow || 0), 0);
  const totalReds = playerApps.reduce((sum, a) => sum + Number(a.red || 0), 0);

  statsEl.innerHTML = `
    <p><strong>Appearances:</strong> ${totalApps}</p>
    <p><strong>Goals:</strong> ${totalGoals}</p>
    <p><strong>Minutes:</strong> ${totalMinutes}</p>
    <p><strong>Yellow cards:</strong> ${totalYellows}</p>
    <p><strong>Red cards:</strong> ${totalReds}</p>
  `;

  function teamName(teamId) {
    const team = teams.find(t => String(t.id).trim() === String(teamId).trim());
    return team ? team.name : teamId;
  }

  if (playerApps.length === 0) {
    matchesEl.innerHTML = "<div>No matches recorded for this player in this season.</div>";
    return;
  }

  playerApps.forEach(a => {
    const m = matches.find(x => String(x.id).trim() === String(a.match_id).trim());
    if (!m) return;

    matchesEl.innerHTML += `
      <div>
        <a href="match.html?id=${m.id}">
          ${m.date} ${teamName(m.home_team)} ${m.home_score}-${m.away_score} ${teamName(m.away_team)}
        </a>
        — Goals: ${Number(a.goals || 0)}
      </div>
    `;
  });
}).catch(err => {
  document.getElementById("title").textContent = "Error loading player season";
  document.getElementById("stats").innerHTML = `<p>${err.message}</p>`;
  console.error(err);
});