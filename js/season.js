const params = new URLSearchParams(window.location.search);
const seasonId = params.get("id");

Promise.all([
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/teams.json").then(r => r.json()),
  fetch("data/seasons.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json()),
  fetch("data/players.json").then(r => r.json())
]).then(([matches, teams, seasons, appearances, players]) => {
  const season = seasons.find(s => String(s.id) == String(seasonId));
  const titleEl = document.getElementById("seasonTitle");
  const tableBody = document.getElementById("tableBody");
  const matchesEl = document.getElementById("matches");
  const scorersEl = document.getElementById("scorers");

  if (!season) {
    titleEl.textContent = "Season not found";
    return;
  }

  titleEl.textContent = season.name;

  const seasonMatches = matches.filter(m => String(m.season_id) == String(seasonId));

  const leagueMatches = seasonMatches.filter(m =>
    !m.competition || String(m.competition).toLowerCase() === "league"
  );

  function teamName(teamId) {
    const team = teams.find(t => String(t.id).trim() === String(teamId).trim());
    return team ? team.name : teamId;
  }

  function playerName(playerId) {
    const player = players.find(p => String(p.id).trim() === String(playerId).trim());
    return player ? player.name : playerId;
  }

  function buildTable(matchList) {
    const table = {};

    matchList.forEach(m => {
      const homeId = String(m.home_team).trim();
      const awayId = String(m.away_team).trim();
      const homeScore = Number(m.home_score || 0);
      const awayScore = Number(m.away_score || 0);

      if (!table[homeId]) {
        table[homeId] = {
          teamId: homeId,
          P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, PTS: 0
        };
      }

      if (!table[awayId]) {
        table[awayId] = {
          teamId: awayId,
          P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, PTS: 0
        };
      }

      table[homeId].P += 1;
      table[awayId].P += 1;

      table[homeId].GF += homeScore;
      table[homeId].GA += awayScore;
      table[awayId].GF += awayScore;
      table[awayId].GA += homeScore;

      if (homeScore > awayScore) {
        table[homeId].W += 1;
        table[awayId].L += 1;
        table[homeId].PTS += 3;
      } else if (awayScore > homeScore) {
        table[awayId].W += 1;
        table[homeId].L += 1;
        table[awayId].PTS += 3;
      } else {
        table[homeId].D += 1;
        table[awayId].D += 1;
        table[homeId].PTS += 1;
        table[awayId].PTS += 1;
      }

      table[homeId].GD = table[homeId].GF - table[homeId].GA;
      table[awayId].GD = table[awayId].GF - table[awayId].GA;
    });

    return Object.values(table).sort((a, b) =>
      b.PTS - a.PTS ||
      b.GD - a.GD ||
      b.GF - a.GF ||
      teamName(a.teamId).localeCompare(teamName(b.teamId))
    );
  }

  function renderTable(rows) {
    tableBody.innerHTML = "";

    if (rows.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="10">No league matches found for this season.</td>
        </tr>
      `;
      return;
    }

    rows.forEach((row, index) => {
      const tr = document.createElement("tr");
      if (index === 0) tr.classList.add("top-row");

      tr.innerHTML = `
        <td>${index + 1}</td>
        <td class="team-col"><a href="team.html?id=${row.teamId}">${teamName(row.teamId)}</a></td>
        <td>${row.P}</td>
        <td>${row.W}</td>
        <td>${row.D}</td>
        <td>${row.L}</td>
        <td>${row.GF}</td>
        <td>${row.GA}</td>
        <td>${row.GD}</td>
        <td><strong>${row.PTS}</strong></td>
      `;
      tableBody.appendChild(tr);
    });
  }

  function renderMatches(matchList) {
    matchesEl.innerHTML = "";

    if (matchList.length === 0) {
      matchesEl.innerHTML = `<div class="empty-note">No matches found for this season.</div>`;
      return;
    }

    const sorted = [...matchList].sort((a, b) => {
      const da = new Date(a.date.split("/").reverse().join("-"));
      const db = new Date(b.date.split("/").reverse().join("-"));
      return da - db;
    });

    sorted.forEach(m => {
      const div = document.createElement("div");
      div.className = "match-row";
      div.innerHTML = `
        <div class="match-date">${m.date}</div>
        <div class="match-scoreline">
          <a href="match.html?id=${m.id}">
            ${teamName(m.home_team)} ${m.home_score}-${m.away_score} ${teamName(m.away_team)}
          </a>
        </div>
        <div class="match-meta">${m.competition || ""}${m.round ? ` - ${m.round}` : ""}</div>
      `;
      matchesEl.appendChild(div);
    });
  }

  function renderTopScorers(matchList) {
    scorersEl.innerHTML = "";

    const validMatchIds = new Set(matchList.map(m => String(m.id).trim()));
    const scorerMap = {};

    appearances.forEach(a => {
      const matchId = String(a.match_id).trim();
      const playerId = String(a.player_id).trim();
      const goals = Number(a.goals || 0);

      if (!validMatchIds.has(matchId) || goals <= 0) return;

      if (!scorerMap[playerId]) {
        scorerMap[playerId] = 0;
      }

      scorerMap[playerId] += goals;
    });

    const scorerRows = Object.entries(scorerMap)
      .map(([playerId, goals]) => ({ playerId, goals }))
      .sort((a, b) =>
        b.goals - a.goals ||
        playerName(a.playerId).localeCompare(playerName(b.playerId))
      )
      .slice(0, 15);

    if (scorerRows.length === 0) {
      scorersEl.innerHTML = `<div class="empty-note">No scorers recorded.</div>`;
      return;
    }

    scorerRows.forEach((row, index) => {
      const div = document.createElement("div");
      div.className = "scorer-row";
      div.innerHTML = `
        <span class="scorer-pos">${index + 1}.</span>
        <span class="scorer-name">
          <a href="player.html?id=${row.playerId}">${playerName(row.playerId)}</a>
        </span>
        <span class="scorer-goals">${row.goals}</span>
      `;
      scorersEl.appendChild(div);
    });
  }

  renderTable(buildTable(leagueMatches));
  renderMatches(seasonMatches);
  renderTopScorers(seasonMatches);
}).catch(err => {
  document.getElementById("seasonTitle").textContent = "Error loading season";
  console.error(err);
});