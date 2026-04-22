const params = new URLSearchParams(window.location.search);
const seasonId = params.get("id");

Promise.all([
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/teams.json").then(r => r.json()),
  fetch("data/seasons.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json()),
  fetch("data/players.json").then(r => r.json()),
  fetch("data/captains.json").then(r => r.json()).catch(() => []),
  fetch("data/managers.json").then(r => r.json()).catch(() => [])
]).then(([matches, teams, seasons, appearances, players, captains, managers]) => {
  const season = seasons.find(s => String(s.id).trim() === String(seasonId).trim());
  const titleEl = document.getElementById("seasonTitle");
  const tableBody = document.getElementById("tableBody");
  const matchesEl = document.getElementById("matches");
  const scorersEl = document.getElementById("scorers");
  const seasonCaptainsTable = document.getElementById("seasonCaptainsTable");
  const seasonManagersTable = document.getElementById("seasonManagersTable");

  if (!season) {
    titleEl.textContent = "Season not found";
    return;
  }

  function isCountableMatch(match) {
    return (
      match &&
      match.home_score !== "?" &&
      match.away_score !== "?" &&
      !Number.isNaN(Number(match.home_score)) &&
      !Number.isNaN(Number(match.away_score))
    );
  }

  function slugifyCompetition(name) {
    return String(name || "")
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function competitionBadgeHtml(competition, size = "22") {
    if (!competition || String(competition).trim() === "") return "";
    const slug = slugifyCompetition(competition);
    return `<img src="images/competitions/${slug}.png" alt="${competition}" title="${competition}" style="width:${size}px;height:${size}px;object-fit:contain;" onerror="this.style.display='none'">`;
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
    return `
      <span class="team-inline">
        <img class="team-badge-small" src="images/teams/${team.id}.png" alt="" onerror="this.style.display='none'">
        <a href="team.html?id=${encodeURIComponent(team.id)}">${team.name}</a>
      </span>
    `;
  }

  function playerName(playerId) {
    const player = players.find(p => String(p.id).trim() === String(playerId).trim());
    return player ? player.name : playerId;
  }

  function formatManager(manager) {
    if (!manager) return "Not recorded";
    if (manager.id) {
      return `<a href="manager.html?id=${manager.id}">${manager.name || manager.id}</a>`;
    }
    return manager.name || "Not recorded";
  }

  titleEl.textContent = season.name;

  const seasonMatches = matches.filter(m =>
    String(m.season_id).trim() === String(seasonId).trim() &&
    isCountableMatch(m)
  );

  const leagueMatches = seasonMatches.filter(m =>
    !m.competition || String(m.competition).toLowerCase() === "league"
  );

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
        <td class="team-col">${teamLink(row.teamId)}</td>
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
      const homeTeam = resolveTeam(m.home_team);
      const awayTeam = resolveTeam(m.away_team);

      const div = document.createElement("div");
      div.className = "match-row";
      div.innerHTML = `
        <div class="match-date">${m.date}</div>
        <div class="match-scoreline">
          <a href="match.html?id=${m.id}">
            <span class="team-inline">
              ${homeTeam ? `<img class="team-badge-small" src="images/teams/${homeTeam.id}.png" alt="" onerror="this.style.display='none'">` : ""}
              <span>${teamName(m.home_team)}</span>
            </span>
            ${m.home_score}-${m.away_score}
            <span class="team-inline">
              ${awayTeam ? `<img class="team-badge-small" src="images/teams/${awayTeam.id}.png" alt="" onerror="this.style.display='none'">` : ""}
              <span>${teamName(m.away_team)}</span>
            </span>
          </a>
        </div>
        <div class="match-meta">
          <span class="competition-inline">
            ${competitionBadgeHtml(m.competition)}
            <span>${m.competition || ""}${m.round ? ` - ${m.round}` : ""}</span>
          </span>
        </div>
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

      if (!validMatchIds.has(matchId)) return;

      if (!scorerMap[playerId]) {
        scorerMap[playerId] = {
          goals: 0,
          starts: 0,
          subs: 0
        };
      }

      scorerMap[playerId].goals += Number(a.goals || 0);

      if (Number(a.is_starting) === 1) {
        scorerMap[playerId].starts += 1;
      } else {
        scorerMap[playerId].subs += 1;
      }
    });

    const scorerRows = Object.entries(scorerMap)
      .map(([playerId, stats]) => ({
        playerId,
        name: playerName(playerId),
        goals: stats.goals,
        starts: stats.starts,
        subs: stats.subs
      }))
      .filter(row => row.goals > 0)
      .sort((a, b) =>
        b.goals - a.goals ||
        b.starts - a.starts ||
        b.subs - a.subs ||
        a.name.localeCompare(b.name)
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
          <a href="player.html?id=${row.playerId}">${row.name}</a>
        </span>
        <span class="scorer-goals">${row.goals}</span>
      `;
      scorersEl.appendChild(div);
    });
  }

  function renderOfficials() {
    const seasonTeams = new Set();
    seasonMatches.forEach(m => {
      seasonTeams.add(String(m.home_team).trim());
      seasonTeams.add(String(m.away_team).trim());
    });

    const seasonCaptains = [];
    const seasonManagers = [];

    seasonTeams.forEach(teamId => {
      const captain = captains.find(c =>
        String(c.team_id).trim() === teamId &&
        Number(c.start_season || 0) <= Number(seasonId) &&
        Number(c.end_season || 0) >= Number(seasonId)
      );

      if (captain) {
        seasonCaptains.push(captain);
      }

      const teamSeasonMatches = seasonMatches.filter(m =>
        String(m.home_team).trim() === teamId || String(m.away_team).trim() === teamId
      );

      let managerRecord = null;
      for (const m of teamSeasonMatches) {
        const managerId =
          String(m.home_team).trim() === teamId
            ? String(m.home_manager_id || "").trim()
            : String(m.away_manager_id || "").trim();

        if (managerId) {
          const manager = managers.find(x => String(x.id).trim() === managerId);
          managerRecord = manager || { id: managerId, name: managerId };
          break;
        }
      }

      if (managerRecord) {
        seasonManagers.push({ team_id: teamId, manager: managerRecord });
      }
    });

    if (seasonCaptains.length === 0) {
      seasonCaptainsTable.innerHTML = `<tr><td colspan="2">No captains recorded for this season.</td></tr>`;
    } else {
      seasonCaptains
        .sort((a, b) => teamName(a.team_id).localeCompare(teamName(b.team_id)))
        .forEach(c => {
          seasonCaptainsTable.innerHTML += `
            <tr>
              <td>${teamLink(c.team_id)}</td>
              <td><a href="player.html?id=${c.player_id}">${playerName(c.player_id)}</a></td>
            </tr>
          `;
        });
    }

    if (seasonManagers.length === 0) {
      seasonManagersTable.innerHTML = `<tr><td colspan="2">No managers recorded for this season.</td></tr>`;
    } else {
      seasonManagers
        .sort((a, b) => teamName(a.team_id).localeCompare(teamName(b.team_id)))
        .forEach(row => {
          seasonManagersTable.innerHTML += `
            <tr>
              <td>${teamLink(row.team_id)}</td>
              <td>${formatManager(row.manager)}</td>
            </tr>
          `;
        });
    }
  }

  renderOfficials();
  renderTable(buildTable(leagueMatches));
  renderMatches(seasonMatches);
  renderTopScorers(seasonMatches);
}).catch(err => {
  document.getElementById("seasonTitle").textContent = "Error loading season";
  console.error(err);
});