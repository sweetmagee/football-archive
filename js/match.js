const id = new URLSearchParams(window.location.search).get("id");

Promise.all([
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json()),
  fetch("data/players.json").then(r => r.json()),
  fetch("data/teams.json").then(r => r.json()),
  fetch("data/captains.json").then(r => r.json()).catch(() => []),
  fetch("data/managers.json").then(r => r.json()).catch(() => [])
]).then(([matches, apps, players, teams, captains, managers]) => {
  const match = matches.find(m => String(m.id).trim() === String(id).trim());
  const el = document.getElementById("match");

  if (!match) {
    el.innerHTML = '<div class="content-box"><p>Match not found.</p></div>';
    return;
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

  function teamBadgeHtml(teamValue, sizeClass = "team-badge-small") {
    const team = resolveTeam(teamValue);
    if (!team) return "";
    return `<img class="${sizeClass}" src="images/teams/${team.id}.png" alt="" onerror="this.style.display='none'">`;
  }

  const homeTeam = resolveTeam(match.home_team);
  const awayTeam = resolveTeam(match.away_team);

  const homeName = homeTeam ? homeTeam.name : match.home_team;
  const awayName = awayTeam ? awayTeam.name : match.away_team;

  function getPlayer(playerId) {
    return players.find(x => String(x.id).trim() === String(playerId).trim());
  }

  function playerName(playerId) {
    const p = getPlayer(playerId);
    return p ? p.name : playerId;
  }

  function splitPlayerName(fullName) {
    const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { first: "", last: "" };
    if (parts.length === 1) return { first: "", last: parts[0] };
    const last = parts.pop();
    return { first: parts.join(" "), last };
  }

  function playerDisplayNameForScorers(playerId, scorerPlayerIds) {
    const current = getPlayer(playerId);
    const fullName = current ? current.name : playerId;
    const { first, last } = splitPlayerName(fullName);

    if (!last) return fullName;

    const sameSurnamePlayers = scorerPlayerIds
      .map(id => getPlayer(id))
      .filter(Boolean)
      .filter(p => splitPlayerName(p.name).last.toLowerCase() === last.toLowerCase());

    if (sameSurnamePlayers.length <= 1) {
      return last;
    }

    const initial = first ? `${first.trim().charAt(0)}.` : "";
    return initial ? `${initial}${last}` : last;
  }

  function joinScorers(parts) {
    if (!parts.length) return "";
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} & ${parts[1]}`;
    return `${parts.slice(0, -1).join(", ")} & ${parts[parts.length - 1]}`;
  }

  function buildMargateScorerText(matchRecord, appearancesList) {
    const isMargateHome = String(matchRecord.home_team).trim() === "t1";
    const isMargateAway = String(matchRecord.away_team).trim() === "t1";

    if (!isMargateHome && !isMargateAway) return "";

    const margateApps = appearancesList.filter(a =>
      String(a.match_id).trim() === String(matchRecord.id).trim() &&
      String(a.team).trim() === "t1" &&
      Number(a.goals || 0) > 0
    );

    if (!margateApps.length) return "";

    const scorerPlayerIds = margateApps.map(a => String(a.player_id).trim());

    const scorerRows = margateApps.map(a => {
      const id = String(a.player_id).trim();
      const displayName = playerDisplayNameForScorers(id, scorerPlayerIds);
      const surname = splitPlayerName(playerName(id)).last || displayName;

      return {
        id,
        displayName,
        surname,
        goals: Number(a.goals || 0)
      };
    });

    scorerRows.sort((a, b) =>
      b.goals - a.goals ||
      a.surname.localeCompare(b.surname) ||
      a.displayName.localeCompare(b.displayName)
    );

    const formatted = scorerRows.map(row =>
      row.goals > 1 ? `${row.displayName} (${row.goals})` : row.displayName
    );

    return `<span class="margate-scorers"> (${joinScorers(formatted)})</span>`;
  }

  function slugifyCompetition(name) {
    return String(name || "")
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function competitionBadgeHtml(competition) {
    if (!competition || String(competition).trim() === "") return "";
    const slug = slugifyCompetition(competition);
    return `<img class="competition-badge" src="images/competitions/${slug}.png" alt="${competition}" title="${competition}" onerror="this.style.display='none'">`;
  }

  function inSeasonRange(item, seasonId) {
    return Number(item.start_season || 0) <= Number(seasonId) &&
           Number(item.end_season || 0) >= Number(seasonId);
  }

  function getCaptain(teamId, seasonId) {
    return captains.find(c =>
      String(c.team_id).trim() === String(teamId).trim() &&
      inSeasonRange(c, seasonId)
    );
  }

  const homeCaptain = getCaptain(match.home_team, match.season_id);
  const awayCaptain = getCaptain(match.away_team, match.season_id);

  const homeManager = managers.find(m =>
    String(m.id).trim() === String(match.home_manager_id || "").trim()
  );
  const awayManager = managers.find(m =>
    String(m.id).trim() === String(match.away_manager_id || "").trim()
  );

  const homeCaptainHtml = homeCaptain
    ? `<a href="player.html?id=${homeCaptain.player_id}">${playerName(homeCaptain.player_id)}</a>`
    : "Not recorded";

  const awayCaptainHtml = awayCaptain
    ? `<a href="player.html?id=${awayCaptain.player_id}">${playerName(awayCaptain.player_id)}</a>`
    : "Not recorded";

  const homeManagerHtml = homeManager
    ? `<a href="manager.html?id=${homeManager.id}">${homeManager.name}</a>`
    : "Not recorded";

  const awayManagerHtml = awayManager
    ? `<a href="manager.html?id=${awayManager.id}">${awayManager.name}</a>`
    : "Not recorded";

  const notesHtml = match.notes && String(match.notes).trim() !== ""
    ? `
      <div class="content-box section-block">
        <h3>Notes</h3>
        <p>${match.notes}</p>
      </div>
    `
    : "";

  const homeScoreNum = Number(match.home_score || 0);
  const awayScoreNum = Number(match.away_score || 0);

  let homeResultClass = "match-team-draw";
  let awayResultClass = "match-team-draw";

  if (!Number.isNaN(homeScoreNum) && !Number.isNaN(awayScoreNum)) {
    if (homeScoreNum > awayScoreNum) {
      homeResultClass = "match-team-winner";
      awayResultClass = "match-team-loser";
    } else if (awayScoreNum > homeScoreNum) {
      homeResultClass = "match-team-loser";
      awayResultClass = "match-team-winner";
    }
  }

  const margateScorerText = buildMargateScorerText(match, apps);
  const homeScoreDisplay =
    String(match.home_team).trim() === "t1"
      ? `${match.home_score}${margateScorerText}`
      : `${match.home_score}`;

  const awayScoreDisplay =
    String(match.away_team).trim() === "t1"
      ? `${match.away_score}${margateScorerText}`
      : `${match.away_score}`;

  el.innerHTML = `
    <div class="content-box">
      <div class="competition-header">
        ${competitionBadgeHtml(match.competition)}
        <div>
          <div class="match-score-header">
            <div class="match-team-line ${homeResultClass}">
              <span class="team-inline">
                ${teamBadgeHtml(match.home_team, "team-badge-medium")}
                <span>${homeName}</span>
              </span>
              <span class="team-line-score">${homeScoreDisplay}</span>
            </div>

            <div class="match-team-line ${awayResultClass}">
              <span class="team-inline">
                ${teamBadgeHtml(match.away_team, "team-badge-medium")}
                <span>${awayName}</span>
              </span>
              <span class="team-line-score">${awayScoreDisplay}</span>
            </div>
          </div>

          <p class="stat-line"><strong>Competition:</strong> ${match.competition || ""}</p>
        </div>
      </div>

      <p class="stat-line"><strong>Date:</strong> ${match.date || ""}</p>
      <p class="stat-line"><strong>Kick-off:</strong> ${match.kickoff_time || "Not recorded"}</p>
      ${match.round && String(match.round).trim() !== ""
        ? `<p class="stat-line"><strong>Round:</strong> ${match.round}</p>`
        : ""}
      <p class="stat-line"><strong>Venue:</strong> ${match.venue || "Not recorded"}</p>
      <p class="stat-line"><strong>Attendance:</strong> ${match.attendance || "Not recorded"}</p>
      <p class="stat-line"><strong>Referee:</strong> ${match.referee || "Not recorded"}</p>
    </div>

    <div class="content-box section-block">
      <h3>Captains & Managers</h3>
      <table class="archive-table">
        <thead>
          <tr>
            <th>Team</th>
            <th>Captain</th>
            <th>Manager</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <span class="team-inline">
                ${teamBadgeHtml(match.home_team, "team-badge-small")}
                <a href="team.html?id=${encodeURIComponent(homeTeam ? homeTeam.id : match.home_team)}">${homeName}</a>
              </span>
            </td>
            <td>${homeCaptainHtml}</td>
            <td>${homeManagerHtml}</td>
          </tr>
          <tr>
            <td>
              <span class="team-inline">
                ${teamBadgeHtml(match.away_team, "team-badge-small")}
                <a href="team.html?id=${encodeURIComponent(awayTeam ? awayTeam.id : match.away_team)}">${awayName}</a>
              </span>
            </td>
            <td>${awayCaptainHtml}</td>
            <td>${awayManagerHtml}</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${notesHtml}
  `;

  const matchApps = apps.filter(a => String(a.match_id).trim() === String(id).trim());
  const homeApps = matchApps.filter(a => String(a.team).trim() === String(match.home_team).trim());
  const awayApps = matchApps.filter(a => String(a.team).trim() === String(match.away_team).trim());

  function playerIcons(a) {
    const goals = "⚽".repeat(Number(a.goals || 0));
    const yellows = "🟨".repeat(Number(a.yellow || 0));
    const reds = "🟥".repeat(Number(a.red || 0));

    return (goals || yellows || reds)
      ? `<span class="player-icons">${goals}${yellows}${reds}</span>`
      : "";
  }

  function subMarker(a) {
    const isStarter = Number(a.is_starting) === 1;
    const minuteIn = Number(a.minute_in || 0);
    const minuteOut = Number(a.minute_out || 0);

    if (isStarter) {
      if (minuteOut > 0 && minuteOut < 90) {
        return `<span class="sub-minute">↓ ${minuteOut}'</span>`;
      }
      return "";
    }

    if (minuteIn > 0) {
      return `<span class="sub-minute">↑ ${minuteIn}'</span>`;
    }

    return "";
  }

  function renderTeamSection(title, teamApps) {
    let html = `<div class="content-box section-block match-lineup-column"><h3>${title}</h3>`;

    const starters = teamApps.filter(a => Number(a.is_starting) === 1);
    const subs = teamApps.filter(a => Number(a.is_starting) !== 1);

    html += `<h4 class="lineup-heading">Starting XI</h4>`;

    if (starters.length === 0) {
      html += `<div>None listed</div>`;
    } else {
      starters.forEach(a => {
        html += `
          <div class="lineup-player">
            <span>
              <a href="player.html?id=${a.player_id}">${playerName(a.player_id)}</a>
              ${subMarker(a)}
            </span>
            ${playerIcons(a)}
          </div>
        `;
      });
    }

    html += `<div class="lineup-gap"></div>`;
    html += `<h4 class="lineup-heading">Substitutes Used</h4>`;

    if (subs.length === 0) {
      html += `<div>None listed</div>`;
    } else {
      subs.forEach(a => {
        html += `
          <div class="lineup-player">
            <span>
              <a href="player.html?id=${a.player_id}">${playerName(a.player_id)}</a>
              ${subMarker(a)}
            </span>
            ${playerIcons(a)}
          </div>
        `;
      });
    }

    html += `</div>`;
    return html;
  }

  const homeHasInfo = homeApps.length > 0;
  const awayHasInfo = awayApps.length > 0;

  if (homeHasInfo || awayHasInfo) {
    let lineupHtml = `<div class="match-lineups-grid">`;

    if (homeHasInfo) {
      lineupHtml += renderTeamSection(homeName, homeApps);
    }

    if (awayHasInfo) {
      lineupHtml += renderTeamSection(awayName, awayApps);
    }

    lineupHtml += `</div>`;
    el.innerHTML += lineupHtml;
  } else {
    el.innerHTML += `
      <div class="content-box section-block">
        <h3>Line-ups</h3>
        <div>No player information recorded for this match.</div>
      </div>
    `;
  }

  const allEvents = [];

  matchApps.forEach(a => {
    const name = playerName(a.player_id);

    if (Number(a.goals || 0) > 0) {
      for (let i = 0; i < Number(a.goals); i++) {
        allEvents.push({
          minute: Number(a.minute_out || a.minute_in || 0),
          text: `⚽ ${name}`
        });
      }
    }

    if (Number(a.is_starting) !== 1 && Number(a.minute_in || 0) > 0) {
      allEvents.push({
        minute: Number(a.minute_in),
        text: `⬆ ${name}`
      });
    }

    if (Number(a.is_starting) === 1 && Number(a.minute_out || 0) > 0 && Number(a.minute_out || 0) < 90) {
      allEvents.push({
        minute: Number(a.minute_out),
        text: `⬇ ${name}`
      });
    }

    if (Number(a.yellow || 0) > 0) {
      allEvents.push({
        minute: Number(a.minute_out || a.minute_in || 0),
        text: `🟨 ${name}`
      });
    }

    if (Number(a.red || 0) > 0) {
      allEvents.push({
        minute: Number(a.minute_out || a.minute_in || 0),
        text: `🟥 ${name}`
      });
    }
  });

  allEvents.sort((a, b) => a.minute - b.minute);

  el.innerHTML += `
    <div class="content-box section-block">
      <h3>Match Timeline</h3>
      <div id="timeline"></div>
    </div>
  `;

  const timelineEl = document.getElementById("timeline");

  if (allEvents.length === 0) {
    timelineEl.innerHTML = `<div>No timeline events recorded</div>`;
  } else {
    allEvents.forEach(ev => {
      timelineEl.innerHTML += `<div class="timeline-event">${ev.minute}' ${ev.text}</div>`;
    });
  }

}).catch(err => {
  document.getElementById("match").innerHTML =
    `<div class="content-box"><p>Error loading match page: ${err.message}</p></div>`;
  console.error(err);
});