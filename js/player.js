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

  function teamName(teamId) {
    const team = teams.find(t => String(t.id).trim() === String(teamId).trim());
    return team ? team.name : teamId;
  }

  const photo = p.photo && p.photo.trim() !== '' ? p.photo.trim() : 'default.png';

  // 🔷 Player header
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
          <p><strong>Team:</strong> 
  <span class="team-inline">
    <img class="team-badge-small" src="images/teams/${p.team}.png" alt="" onerror="this.style.display='none'">
    <a href="team.html?id=${p.team}">${teamName(p.team || '')}</a>
  </span>
</p>
          <p><strong>Career Apps:</strong> ${p.apps ?? 0}</p>
          <p><strong>Career Goals:</strong> ${p.goals ?? 0}</p>
          <p>${p.bio || ''}</p>
        </div>
      </div>
    </div>
  `;

  // ✅ FIXED IMAGE FALLBACK (no flashing)
  const img = document.getElementById('playerPhoto');
  img.onerror = function () {
    if (!this.src.includes('default.png')) {
      this.src = 'images/players/default.png';
    } else {
      this.onerror = null;
    }
  };

  // 🔷 Player appearances
  const pa = apps.filter(a =>
    String(a.player_id).trim() === String(id).trim()
  );

  // 🔷 Build season stats
  const seasonStats = {};

  pa.forEach(a => {
    const match = matches.find(m =>
      String(m.id).trim() === String(a.match_id).trim()
    );

    if (!match || !match.season_id) return;

    if (!seasonStats[match.season_id]) {
      seasonStats[match.season_id] = { apps: 0, goals: 0 };
    }

    seasonStats[match.season_id].apps += 1;
    seasonStats[match.season_id].goals += Number(a.goals || 0);
  });

  // 🔷 Season stats table
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
      <tr><td colspan="3">No season stats available.</td></tr>
    `;
  } else {
    Object.entries(seasonStats)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .forEach(([seasonId, stats]) => {

        const season = seasons.find(s =>
          String(s.id).trim() === String(seasonId).trim()
        );

        const seasonName = season ? season.name : `Season ${seasonId}`;

        seasonStatsTable.innerHTML += `
          <tr>
            <td>
              <a href="player-season.html?player=${id}&season=${seasonId}">
                ${seasonName}
              </a>
            </td>
            <td>${stats.apps}</td>
            <td>${stats.goals}</td>
          </tr>
        `;
      });
  }

  // 🔷 Match history table
  el.innerHTML += `
    <div class="content-box section-block">
      <h3>Match History</h3>
      <table class="archive-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Match</th>
            <th>Goals</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody id="matchHistoryTable"></tbody>
      </table>
    </div>
  `;

  const matchHistoryTable = document.getElementById('matchHistoryTable');

  if (pa.length === 0) {
    matchHistoryTable.innerHTML = `
      <tr><td colspan="4">No matches available.</td></tr>
    `;
  } else {

    const rows = pa
      .map(a => {
        const m = matches.find(x =>
          String(x.id).trim() === String(a.match_id).trim()
        );

        if (!m) return null;

        return {
          date: m.date || '',
          id: m.id,
          match: `${teamName(m.home_team)} ${m.home_score}-${m.away_score} ${teamName(m.away_team)}`,
          goals: Number(a.goals || 0),
          role: Number(a.is_starting) === 1 ? 'Starter' : 'Sub'
        };
      })
      .filter(Boolean);

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
          <td>${row.role}</td>
        </tr>
      `;
    });
  }

}).catch(err => {
  document.getElementById('player').innerHTML =
    `<div class="content-box"><p>Error loading player page: ${err.message}</p></div>`;
  console.error(err);
});