const id = new URLSearchParams(window.location.search).get('id');

Promise.all([
  fetch('data/teams.json').then(r => r.json()),
  fetch('data/players.json').then(r => r.json()),
  fetch('data/matches.json').then(r => r.json()),
  fetch('data/seasons.json').then(r => r.json()),
  fetch('data/appearances.json').then(r => r.json())
]).then(([teams, players, matches, seasons, appearances]) => {
  const team = teams.find(t => String(t.id).trim() === String(id).trim());
  const el = document.getElementById('teamPage');

  if (!team) {
    el.innerHTML = '<div class="content-box"><p>Team not found.</p></div>';
    return;
  }

  function seasonName(seasonId) {
    const season = seasons.find(s => String(s.id).trim() === String(seasonId).trim());
    return season ? season.name : seasonId;
  }

  function teamName(teamId) {
    const t = teams.find(x => String(x.id).trim() === String(teamId).trim());
    return t ? t.name : teamId;
  }

  const squad = players
    .filter(p => String(p.team).trim() === String(id).trim())
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

  const teamMatches = matches.filter(m =>
    String(m.home_team).trim() === String(id).trim() ||
    String(m.away_team).trim() === String(id).trim()
  );

  function getRecord(matchList) {
    let P = 0, W = 0, D = 0, L = 0, GF = 0, GA = 0;

    matchList.forEach(m => {
      const isHome = String(m.home_team).trim() === String(id).trim();
      const goalsFor = isHome ? Number(m.home_score || 0) : Number(m.away_score || 0);
      const goalsAgainst = isHome ? Number(m.away_score || 0) : Number(m.home_score || 0);

      P++;
      GF += goalsFor;
      GA += goalsAgainst;

      if (goalsFor > goalsAgainst) W++;
      else if (goalsFor < goalsAgainst) L++;
      else D++;
    });

    return {
      P, W, D, L, GF, GA,
      GD: GF - GA,
      PTS: (W * 3) + D
    };
  }

  const overall = getRecord(teamMatches);

  el.innerHTML = `
    <div class="content-box">
      <h2>${team.name}</h2>
      <p><strong>Played:</strong> ${overall.P}</p>
      <p><strong>Won:</strong> ${overall.W}</p>
      <p><strong>Drawn:</strong> ${overall.D}</p>
      <p><strong>Lost:</strong> ${overall.L}</p>
      <p><strong>Goals For:</strong> ${overall.GF}</p>
      <p><strong>Goals Against:</strong> ${overall.GA}</p>
      <p><strong>Goal Difference:</strong> ${overall.GD}</p>
      <p><strong>Points:</strong> ${overall.PTS}</p>
    </div>
  `;

  el.innerHTML += `
    <div class="content-box section-block">
      <h3>Season-by-Season Summary</h3>
      <table class="archive-table">
        <thead>
          <tr>
            <th>Season</th>
            <th>P</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GF</th>
            <th>GA</th>
            <th>GD</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody id="seasonSummaryTable"></tbody>
      </table>
    </div>
  `;

  const summaryTable = document.getElementById('seasonSummaryTable');

  const groupedBySeason = {};

  teamMatches.forEach(m => {
    const sid = String(m.season_id || '').trim() || 'unknown';
    if (!groupedBySeason[sid]) groupedBySeason[sid] = [];
    groupedBySeason[sid].push(m);
  });

  Object.entries(groupedBySeason)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .forEach(([seasonId, matchList]) => {
      const record = getRecord(matchList);

      summaryTable.innerHTML += `
        <tr>
          <td><a href="season.html?id=${seasonId}">${seasonName(seasonId)}</a></td>
          <td>${record.P}</td>
          <td>${record.W}</td>
          <td>${record.D}</td>
          <td>${record.L}</td>
          <td>${record.GF}</td>
          <td>${record.GA}</td>
          <td>${record.GD}</td>
          <td>${record.PTS}</td>
        </tr>
      `;
    });

  // Leaderboards
  const leaderboard = {};

  appearances.forEach(a => {
    if (String(a.team).trim() !== String(id).trim()) return;

    const playerId = String(a.player_id).trim();
    if (!leaderboard[playerId]) {
      leaderboard[playerId] = {
        apps: 0,
        goals: 0
      };
    }

    leaderboard[playerId].apps += 1;
    leaderboard[playerId].goals += Number(a.goals || 0);
  });

  const leaderboardRows = Object.entries(leaderboard)
    .map(([playerId, stats]) => {
      const player = players.find(p => String(p.id).trim() === String(playerId).trim());
      return {
        playerId,
        name: player ? player.name : playerId,
        apps: stats.apps,
        goals: stats.goals
      };
    })
    .sort((a, b) =>
      b.apps - a.apps ||
      b.goals - a.goals ||
      a.name.localeCompare(b.name)
    );

  el.innerHTML += `
    <div class="content-box section-block">
      <h3>Player Leaderboard</h3>
      <table class="archive-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Apps</th>
            <th>Goals</th>
          </tr>
        </thead>
        <tbody id="leaderboardTable"></tbody>
      </table>
    </div>
  `;

  const leaderboardTable = document.getElementById('leaderboardTable');

  if (leaderboardRows.length === 0) {
    leaderboardTable.innerHTML = `<tr><td colspan="3">No appearance data available.</td></tr>`;
  } else {
    leaderboardRows.forEach(row => {
      leaderboardTable.innerHTML += `
        <tr>
          <td><a href="player.html?id=${row.playerId}">${row.name}</a></td>
          <td>${row.apps}</td>
          <td>${row.goals}</td>
        </tr>
      `;
    });
  }

  el.innerHTML += `
    <div class="content-box section-block">
      <h3>Squad</h3>
      <table class="archive-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Position</th>
            <th>Apps</th>
            <th>Goals</th>
          </tr>
        </thead>
        <tbody id="teamSquadTable"></tbody>
      </table>
    </div>
  `;

  const squadTable = document.getElementById('teamSquadTable');

  if (squad.length === 0) {
    squadTable.innerHTML = `<tr><td colspan="4">No players found for this team.</td></tr>`;
  } else {
    squad.forEach(p => {
      squadTable.innerHTML += `
        <tr>
          <td><a href="player.html?id=${p.id}">${p.name}</a></td>
          <td>${p.position || ''}</td>
          <td>${p.apps ?? ''}</td>
          <td>${p.goals ?? ''}</td>
        </tr>
      `;
    });
  }

  el.innerHTML += `
    <div class="content-box section-block">
      <h3>Matches</h3>
      <div id="teamMatches"></div>
    </div>
  `;

  const matchesWrap = document.getElementById('teamMatches');

  if (teamMatches.length === 0) {
    matchesWrap.innerHTML = `<div>No matches found for this team.</div>`;
  } else {
    Object.entries(groupedBySeason)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .forEach(([seasonId, seasonMatches]) => {
        seasonMatches.sort((a, b) => {
          const da = new Date((a.date || '').split('/').reverse().join('-'));
          const db = new Date((b.date || '').split('/').reverse().join('-'));
          return da - db;
        });

        matchesWrap.innerHTML += `<h4>${seasonName(seasonId)}</h4><div id="season-${seasonId}" class="match-list"></div>`;
        const seasonList = document.getElementById(`season-${seasonId}`);

        seasonMatches.forEach(m => {
          seasonList.innerHTML += `
            <div class="match-row">
              <div class="match-date">${m.date || ''}</div>
              <div class="match-scoreline">
                <a href="match.html?id=${m.id}">
                  ${teamName(m.home_team)} ${m.home_score}-${m.away_score} ${teamName(m.away_team)}
                </a>
              </div>
              <div class="match-meta">${m.competition || ''}${m.round ? ` - ${m.round}` : ''}</div>
            </div>
          `;
        });
      });
  }

}).catch(err => {
  document.getElementById('teamPage').innerHTML =
    `<div class="content-box"><p>Error loading team page: ${err.message}</p></div>`;
  console.error(err);
});