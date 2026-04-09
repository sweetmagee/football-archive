const id = new URLSearchParams(window.location.search).get('id');

Promise.all([
  fetch('data/players.json').then(r => r.json()),
  fetch('data/appearances.json').then(r => r.json()),
  fetch('data/matches.json').then(r => r.json()),
  fetch('data/seasons.json').then(r => r.json())
]).then(([players, apps, matches, seasons]) => {
  const p = players.find(x => x.id === id);
  const el = document.getElementById('player');

  if (!p) {
    el.innerHTML = '<p>Player not found.</p>';
    return;
  }

  const photo = p.photo && p.photo.trim() !== '' ? p.photo : 'default.jpg';

  el.innerHTML = `
    <h2>${p.name}</h2>
    <img src="images/players/${photo}" onerror="this.src='images/players/default.jpg'" alt="${p.name}" width="160">
    <p><strong>Position:</strong> ${p.position || ''}</p>
    <p><strong>Date of birth:</strong> ${p.dob || ''}</p>
    <p><strong>Nationality:</strong> ${p.nationality || ''}</p>
    <p><strong>Apps:</strong> ${p.apps ?? 0} | <strong>Goals:</strong> ${p.goals ?? 0}</p>
    <p>${p.bio || ''}</p>
  `;

  const pa = apps.filter(a => a.player_id === id);

  const seasonStats = {};

  pa.forEach(a => {
    const match = matches.find(m => m.id === a.match_id);
    if (!match || !match.season_id) return;

    if (!seasonStats[match.season_id]) {
      seasonStats[match.season_id] = { apps: 0, goals: 0 };
    }

    seasonStats[match.season_id].apps += 1;
    seasonStats[match.season_id].goals += Number(a.goals || 0);
  });

  el.innerHTML += `<h3>Season Stats</h3>`;

  Object.entries(seasonStats).forEach(([seasonId, stats]) => {
    const season = seasons.find(s => s.id === seasonId);
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

  el.innerHTML += `<h3>Matches</h3>`;

  pa.forEach(a => {
    const m = matches.find(x => x.id === a.match_id);
    if (!m) return;

    el.innerHTML += `
      <div>
        <a href="match.html?id=${m.id}">
          ${m.date} ${m.home_team} ${m.home_score}-${m.away_score} ${m.away_team}
        </a>
      </div>
    `;
  });
}).catch(err => {
  document.getElementById('player').innerHTML =
    `<p>Error loading player page: ${err.message}</p>`;
  console.error(err);
});