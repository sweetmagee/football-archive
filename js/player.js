const id = new URLSearchParams(window.location.search).get('id');

Promise.all([
  fetch('data/players.json').then(r => r.json()),
  fetch('data/appearances.json').then(r => r.json()),
  fetch('data/matches.json').then(r => r.json()),
  fetch('data/seasons.json').then(r => r.json()),
  fetch('data/teams.json').then(r => r.json())
]).then(([players, apps, matches, seasons, teams]) => {
  const p = players.find(x => String(x.id).trim() === String(id).trim());
  const el = document.getElementById('player');

  if (!p) {
    el.innerHTML = '<p>Player not found.</p>';
    return;
  }

  const teamObj = teams.find(t => String(t.id).trim() === String(p.team).trim());
  const teamName = teamObj ? teamObj.name : p.team;

  const photo = p.photo && p.photo.trim() !== '' ? p.photo : 'default.jpg';

  el.innerHTML = `
    <h2>${p.name}</h2>
    <img src="images/players/${photo}" onerror="this.src='images/players/default.jpg'" alt="${p.name}" width="160">
    <p><strong>Position:</strong> ${p.position || ''}</p>
    <p><strong>Date of birth:</strong> ${p.dob || ''}</p>
    <p><strong>Nationality:</strong> ${p.nationality || ''}</p>
    <p><strong>Team:</strong> ${teamName}</p>
    <p><strong>Apps:</strong> ${p.apps ?? 0} | <strong>Goals:</strong> ${p.goals ?? 0}</p>
    <p>${p.bio || ''}</p>
  `;

  const pa = apps.filter(a => String(a.player_id).trim() === String(id).trim());

  const seasonStats = {};

  pa.forEach(a => {
    const match = matches.find(m => String(m.id).trim() === String(a.match_id).trim());
    if (!match || !match.season_id) return;

    if (!seasonStats[match.season_id]) {
      seasonStats[match.season_id] = { apps: 0, goals: 0 };
    }

    seasonStats[match.season_id].apps += 1;
    seasonStats[match.season_id].goals += Number(a.goals || 0);
  });

  el.innerHTML += `<h3>Season Stats</h3>`;

  if (Object.keys(seasonStats).length === 0) {
    el.innerHTML += `<div>No season stats available.</div>`;
  } else {
    Object.entries(seasonStats).forEach(([seasonId, stats]) => {
      const season = seasons.find(s => String(s.id).trim() === String(seasonId).trim());
      const seasonName = season ? season.name : seasonId;

      el.innerHTML += `
        <div>
          <a href="player-season.html?player=${id}&season=${seasonId}">
            ${seasonName}
          </a>
          — Apps: ${stats.apps}, Goals: ${stats.goals}
        </div>
      `;
    });
  }

  el.innerHTML += `<h3>Matches</h3>`;

  pa.forEach(a => {
    const m = matches.find(x => String(x.id).trim() === String(a.match_id).trim());
    if (!m) return;

    const homeTeam = teams.find(t => String(t.id).trim() === String(m.home_team).trim());
    const awayTeam = teams.find(t => String(t.id).trim() === String(m.away_team).trim());

    const homeName = homeTeam ? homeTeam.name : m.home_team;
    const awayName = awayTeam ? awayTeam.name : m.away_team;

    el.innerHTML += `
      <div>
        <a href="match.html?id=${m.id}">
          ${m.date} ${homeName} ${m.home_score}-${m.away_score} ${awayName}
        </a>
      </div>
    `;
  });
}).catch(err => {
  document.getElementById('player').innerHTML =
    `<p>Error loading player page: ${err.message}</p>`;
  console.error(err);
});