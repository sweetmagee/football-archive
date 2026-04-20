const id = new URLSearchParams(window.location.search).get('id');

Promise.all([
  fetch('data/teams.json').then(r => r.json()),
  fetch('data/players.json').then(r => r.json()),
  fetch('data/matches.json').then(r => r.json()),
  fetch('data/seasons.json').then(r => r.json()),
  fetch('data/appearances.json').then(r => r.json()),
  fetch('data/captains.json').then(r => r.json()).catch(() => []),
  fetch('data/managers.json').then(r => r.json()).catch(() => []),
  fetch('data/honours.json').then(r => r.json()).catch(() => [])
]).then(([teams, players, matches, seasons, appearances, captains, managers, honours]) => {
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

  function playerName(playerId) {
    const p = players.find(x => String(x.id).trim() === String(playerId).trim());
    return p ? p.name : playerId;
  }

  function teamBadgeHtml(teamId, sizeClass = 'team-badge-small') {
    return `<img class="${sizeClass}" src="images/teams/${teamId}.png" alt="" onerror="this.style.display='none'">`;
  }

  const squad = players
    .filter(p => String(p.team).trim() === String(id).trim())
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

  const teamMatches = matches.filter(m =>
    String(m.home_team).trim() === String(id).trim() ||
    String(m.away_team).trim() === String(id).trim()
  );

  const teamCaptains = captains
    .filter(c => String(c.team_id).trim() === String(id).trim())
    .sort((a, b) => Number(a.start_season || 0) - Number(b.start_season || 0));

  const teamManagers = managers
    .filter(m => String(m.team_id).trim() === String(id).trim())
    .sort((a, b) => Number(a.start_season || 0) - Number(b.start_season || 0));

  const teamHonours = honours
    .filter(h => String(h.team_id).trim() === String(id).trim())
    .sort((a, b) => Number(a.season || 0) - Number(b.season || 0));

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
      P,
      W,
      D,
      L,
      GF,
      GA,
      GD: GF - GA,
      PTS: (W * 3) + D
    };
  }

  const overall = getRecord(teamMatches);

  el.innerHTML = `
    <div class="content-box">
      <div class="team-header">
        <img class="team-badge-large" src="images/teams/${team.id}.png" alt="${team.name}" onerror="this.style.display='none'">
        <div class="team-header-text">
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
      </div>
    </div>
  `;

  // Club history
  el.innerHTML += `
    <div class="content-box section-block">
      <h3>Club History</h3>
      <div class="season-grid">
        <div class="season-main">
          <h4>Captains</h4>
          <table class="archive-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>From</th>
                <th>To</th>
              </tr>
            </thead>
            <tbody id="captainsTable"></tbody>
          </table>

          <h4>Managers</h4>
          <table class="archive-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>From</th>
                <th>To</th>
              </tr>
            </thead>
            <tbody id="managersTable"></tbody>
          </table>
        </div>

        <div class="season-side">
          <h4>Honours</h4>
          <table class="archive-table">
            <thead>
              <tr>
                <th>Competition</th>
                <th>Season</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody id="honoursTable"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const captainsTable = document.getElementById('captainsTable');
  const managersTable = document.getElementById('managersTable');
  const honoursTable = document.getElementById('honoursTable');

  if (teamCaptains.length === 0) {
    captainsTable.innerHTML = `<tr><td colspan="3">No captains recorded.</td></tr>`;
  } else {
    teamCaptains.forEach(c => {
      const player = players.find(p => String(p.id).trim() === String(c.player_id).trim());
      const playerDisplay = player
        ? `<a href="player.html?id=${player.id}">${player.name}</a>`
        : c.player_id;

      captainsTable.innerHTML += `
        <tr>
          <td>${playerDisplay}</td>
          <td>${seasonName(c.start_season)}</td>
          <td>${seasonName(c.end_season)}</td>
        </tr>
      `;
    });
  }

  if (teamManagers.length === 0) {
    managersTable.innerHTML = `<tr><td colspan="3">No managers recorded.</td></tr>`;
  } else {
    teamManagers.forEach(m => {
      const player = players.find(p => String(p.id).trim() === String(m.player_id).trim());
      const playerDisplay = player
        ? `<a href="player.html?id=${player.id}">${player.name}</a>`
        : m.player_id;

      managersTable.innerHTML += `
        <tr>
          <td>${playerDisplay}</td>
          <td>${seasonName(m.start_season)}</td>
          <td>${seasonName(m.end_season)}</td>
        </tr>
      `;
    });
  }

  if (teamHonours.length === 0) {
    honoursTable.innerHTML = `<tr><td colspan="3">No honours recorded.</td></tr>`;
  } else {
    teamHonours.forEach(h => {
      honoursTable.innerHTML += `
        <tr>
          <td>${h.competition}</td>
          <td>${seasonName(h.season)}</td>
          <td>${h.result}</td>
        </tr>
      `;
    });
  }

  // Season-by-season summary
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

  // Overall player leaderboard data
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
    .map(([playerId, stats]) => ({
      playerId,
      name: playerName(playerId),
      apps: stats.apps,
      goals: stats.goals
    }))
    .sort((a, b) =>
      b.apps - a.apps ||
      b.goals - a.goals ||
      a.name.localeCompare(b.name)
    );

  // Team legends
  const topAppearanceRows = [...leaderboardRows]
    .sort((a, b) =>
      b.apps - a.apps ||
      b.goals - a.goals ||
      a.name.localeCompare(b.name)
    )
    .slice(0, 15);

  const topScorerRows = [...leaderboardRows]
    .sort((a, b) =>
      b.goals - a.goals ||
      b.apps - a.apps ||
      a.name.localeCompare(b.name)
    )
    .slice(0, 15);

  el.innerHTML += `
    <div class="content-box section-block">
      <h3>Team Legends</h3>
      <div class="season-grid">
        <div class="season-main">
          <h4>All-Time Top Appearances</h4>
          <table class="archive-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Apps</th>
              </tr>
            </thead>
            <tbody id="topAppearancesTable"></tbody>
          </table>
        </div>

        <div class="season-side">
          <h4>All-Time Top Scorers</h4>
          <table class="archive-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Goals</th>
              </tr>
            </thead>
            <tbody id="topScorersTable"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const topAppearancesTable = document.getElementById('topAppearancesTable');
  const topScorersTable = document.getElementById('topScorersTable');

  if (topAppearanceRows.length === 0) {
    topAppearancesTable.innerHTML = `<tr><td colspan="2">No appearance data available.</td></tr>`;
  } else {
    topAppearanceRows.forEach(row => {
      topAppearancesTable.innerHTML += `
        <tr>
          <td><a href="player.html?id=${row.playerId}">${row.name}</a></td>
          <td>${row.apps}</td>
        </tr>
      `;
    });
  }

  if (topScorerRows.length === 0) {
    topScorersTable.innerHTML = `<tr><td colspan="2">No goals data available.</td></tr>`;
  } else {
    topScorerRows.forEach(row => {
      topScorersTable.innerHTML += `
        <tr>
          <td><a href="player.html?id=${row.playerId}">${row.name}</a></td>
          <td>${row.goals}</td>
        </tr>
      `;
    });
  }

  // Player leaderboard
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

  // Top scorers by season
  el.innerHTML += `
    <div class="content-box section-block">
      <h3>Top Scorers by Season</h3>
      <div id="topScorersBySeason"></div>
    </div>
  `;

  const topScorersWrap = document.getElementById('topScorersBySeason');

  Object.entries(groupedBySeason)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .forEach(([seasonId, seasonMatchList]) => {
      const seasonMatchIds = new Set(
        seasonMatchList.map(m => String(m.id).trim())
      );

      const seasonScorers = {};

      appearances.forEach(a => {
        if (String(a.team).trim() !== String(id).trim()) return;
        if (!seasonMatchIds.has(String(a.match_id).trim())) return;

        const playerId = String(a.player_id).trim();
        const goals = Number(a.goals || 0);

        if (!seasonScorers[playerId]) {
          seasonScorers[playerId] = 0;
        }

        seasonScorers[playerId] += goals;
      });

      const rows = Object.entries(seasonScorers)
        .map(([playerId, goals]) => ({
          playerId,
          name: playerName(playerId),
          goals
        }))
        .filter(row => row.goals > 0)
        .sort((a, b) =>
          b.goals - a.goals ||
          a.name.localeCompare(b.name)
        );

      topScorersWrap.innerHTML += `
        <h4>${seasonName(seasonId)}</h4>
        <table class="archive-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Goals</th>
            </tr>
          </thead>
          <tbody id="scorers-${seasonId}"></tbody>
        </table>
      `;

      const scorerTable = document.getElementById(`scorers-${seasonId}`);

      if (rows.length === 0) {
        scorerTable.innerHTML = `<tr><td colspan="2">No goals recorded.</td></tr>`;
      } else {
        rows.forEach(row => {
          scorerTable.innerHTML += `
            <tr>
              <td><a href="player.html?id=${row.playerId}">${row.name}</a></td>
              <td>${row.goals}</td>
            </tr>
          `;
        });
      }
    });

  // Squad
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

  // Matches
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
                  <span class="team-inline">
                    ${teamBadgeHtml(m.home_team)}
                    <span>${teamName(m.home_team)}</span>
                  </span>
                  ${m.home_score}-${m.away_score}
                  <span class="team-inline">
                    ${teamBadgeHtml(m.away_team)}
                    <span>${teamName(m.away_team)}</span>
                  </span>
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