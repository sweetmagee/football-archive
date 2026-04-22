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
    el.innerHTML = '<div class="content-box"><p>Player not found.</p></div>';
    return;
  }

  function isCountableMatch(match) {
    return (
      match &&
      match.home_score !== '?' &&
      match.away_score !== '?' &&
      !Number.isNaN(Number(match.home_score)) &&
      !Number.isNaN(Number(match.away_score))
    );
  }

  function resolveTeam(teamValue) {
    return teams.find(t =>
      String(t.id).trim() === String(teamValue).trim() ||
      String(t.name).trim() === String(teamValue).trim()
    );
  }

  function teamName(teamValue) {
    const team = resolveTeam(teamValue);
    return team ? team.name : teamValue;
  }

  function teamLink(teamValue) {
    const team = resolveTeam(teamValue);
    if (!team) return teamName(teamValue);
    return `<a href="team.html?id=${encodeURIComponent(team.id)}">${team.name}</a>`;
  }

  const photo = p.photo && p.photo.trim() !== '' ? p.photo.trim() : 'default.png';

  const pa = apps.filter(a => {
    if (String(a.player_id).trim() !== String(id).trim()) return false;
    const match = matches.find(m => String(m.id).trim() === String(a.match_id).trim());
    return isCountableMatch(match);
  });

  const starts = pa.filter(a => Number(a.is_starting) === 1).length;
  const subApps = pa.filter(a => Number(a.is_starting) !== 1).length;
  const totalGoals = pa.reduce((sum, a) => sum + Number(a.goals || 0), 0);

  const appsDisplay = subApps > 0 ? `${starts}+${subApps}` : `${starts}`;

  el.innerHTML = `
    <div class="content-box">
      <div class="player-card">
        <div>
          <img id="playerPhoto" src="images/players/${photo}" alt="${p.name}">
        </div>
        <div class="player-meta">
          <h2>${p.name}</h2>
          <p><strong>Position:</strong> ${p.position || ''}</p>
          <p><strong>Date of birth:</strong> ${p.dob || ''}</p>
          <p><strong>Nationality:</strong> ${p.nationality || ''}</p>
          <p><strong>Team:</strong> ${teamLink(p.team || '')}</p>
          <p><strong>Appearances:</strong> ${appsDisplay}</p>
          <p><strong>Goals:</strong> ${totalGoals}</p>
          <p>${p.bio || ''}</p>
        </div>
      </div>
    </div>
  `;

  const img = document.getElementById('playerPhoto');
  img.onerror = function () {
    if (!this.src.includes('default.png')) {
      this.src = 'images/players/default.png';
    } else {
      this.onerror = null;
    }
  };

  const seasonStats = {};

  pa.forEach(a => {
    const match = matches.find(m => String(m.id).trim() === String(a.match_id).trim());
    if (!match || !match.season_id || !isCountableMatch(match)) return;

    if (!seasonStats[match.season_id]) {
      seasonStats[match.season_id] = { starts: 0, subs: 0, goals: 0 };
    }

    if (Number(a.is_starting) === 1) {
      seasonStats[match.season_id].starts += 1;
    } else {
      seasonStats[match.season_id].subs += 1;
    }

    seasonStats[match.season_id].goals += Number(a.goals || 0);
  });

  function seasonSortValue(seasonId) {
    const season = seasons.find(s => String(s.id).trim() === String(seasonId).trim());
    if (season && season.start_year) return Number(season.start_year);
    const match = String(seasonId).match(/^(\d{4})/);
    return match ? Number(match[1]) : 0;
  }

  el.innerHTML += `
    <div class="content-box section-block">
      <h3>Season Stats</h3>
      <table class="archive-table">
        <thead>
          <tr>
            <th>Season</th>
            <th>Apps</th>
            <th>Goals</th>
          </tr>
        </thead>
        <tbody id="seasonStatsTable"></tbody>
      </table>
    </div>
  `;

  const seasonStatsTable = document.getElementById('seasonStatsTable');

  if (Object.keys(seasonStats).length === 0) {
    seasonStatsTable.innerHTML = `
      <tr>
        <td colspan="3">No season stats available.</td>
      </tr>
    `;
  } else {
    Object.entries(seasonStats)
      .sort((a, b) => seasonSortValue(a[0]) - seasonSortValue(b[0]))
      .forEach(([seasonId, stats]) => {
        const season = seasons.find(s => String(s.id).trim() === String(seasonId).trim());
        const seasonName = season ? season.name : seasonId;
        const seasonAppsDisplay = stats.subs > 0 ? `${stats.starts}+${stats.subs}` : `${stats.starts}`;

        seasonStatsTable.innerHTML += `
          <tr>
            <td>
              <a href="player-season.html?player=${encodeURIComponent(id)}&season=${encodeURIComponent(seasonId)}">
                ${seasonName}
              </a>
            </td>
            <td>${seasonAppsDisplay}</td>
            <td>${stats.goals}</td>
          </tr>
        `;
      });
  }

  el.innerHTML += `
    <div class="content-box section-block">
      <h3>Match History</h3>
      <table class="archive-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Match</th>
            <th>Goals</th>
            <th>Appearance</th>
          </tr>
        </thead>
        <tbody id="matchHistoryTable"></tbody>
      </table>
    </div>
  `;

  const matchHistoryTable = document.getElementById('matchHistoryTable');

  if (pa.length === 0) {
    matchHistoryTable.innerHTML = `
      <tr>
        <td colspan="4">No matches available.</td>
      </tr>
    `;
  } else {
    const rows = pa
      .map(a => {
        const m = matches.find(x => String(x.id).trim() === String(a.match_id).trim());
        if (!m || !isCountableMatch(m)) return null;

        return {
          date: m.date || '',
          id: m.id,
          match: `${teamName(m.home_team)} ${m.home_score}-${m.away_score} ${teamName(m.away_team)}`,
          goals: Number(a.goals || 0),
          appearance: Number(a.is_starting) === 1 ? 'Start' : 'Sub'
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const da = new Date(a.date.split('/').reverse().join('-'));
        const db = new Date(b.date.split('/').reverse().join('-'));
        return da - db;
      });

    rows.forEach(row => {
      matchHistoryTable.innerHTML += `
        <tr>
          <td>${row.date}</td>
          <td>
            <a href="match.html?id=${row.id}">
              ${row.match}
            </a>
          </td>
          <td>${row.goals}</td>
          <td>${row.appearance}</td>
        </tr>
      `;
    });
  }
}).catch(err => {
  document.getElementById('player').innerHTML =
    `<div class="content-box"><p>Error loading player page: ${err.message}</p></div>`;
  console.error(err);
});