const id = new URLSearchParams(window.location.search).get('id');

Promise.all([
  fetch('data/teams.json').then(r => r.json()),
  fetch('data/players.json').then(r => r.json()),
  fetch('data/matches.json').then(r => r.json()),
  fetch('data/seasons.json').then(r => r.json())
]).then(([teams, players, matches, seasons]) => {
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

  const teamMatches = matches
    .filter(m =>
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
    const grouped = {};

    teamMatches.forEach(m => {
      const sid = String(m.season_id || '').trim() || 'unknown';
      if (!grouped[sid]) grouped[sid] = [];
      grouped[sid].push(m);
    });

    Object.entries(grouped)
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