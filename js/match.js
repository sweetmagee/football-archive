const id = new URLSearchParams(window.location.search).get("id");

Promise.all([
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json()),
  fetch("data/players.json").then(r => r.json()),
  fetch("data/teams.json").then(r => r.json()),
  fetch("data/managers.json").then(r => r.json()).catch(() => [])
]).then(([matches, apps, players, teams, managers]) => {
  const el = document.getElementById("match");
  const index = matches.findIndex(m => String(m.id).trim() === String(id).trim());

  if (index === -1) {
    el.innerHTML = `<div class="content-box"><p>Match not found.</p></div>`;
    return;
  }

  const matchStyle = document.createElement("style");
  matchStyle.textContent = `
    .lineup-player-main { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
    .lineup-position { display: inline-block; min-width: 28px; font-weight: 700; color: #6c5431; }
    .player-icons-inline { margin-left: 4px; white-space: nowrap; }
    .player-landmarks { margin-left: auto; text-align: right; font-size: 0.9em; white-space: nowrap; }
    .landmark-label { font-weight: 700; margin: 0 2px; }
  `;
  document.head.appendChild(matchStyle);

  const match = matches[index];
  const prevMatch = index > 0 ? matches[index - 1] : null;
  const nextMatch = index < matches.length - 1 ? matches[index + 1] : null;

  function navHtml() {
    return `
      <div class="match-nav">
        <div class="match-nav-left">
          ${prevMatch ? `<a href="match.html?id=${prevMatch.id}">← Previous</a>` : ``}
        </div>
        <div class="match-nav-right">
          ${nextMatch ? `<a href="match.html?id=${nextMatch.id}">Next →</a>` : ``}
        </div>
      </div>
    `;
  }

  function formatLongDate(value) {
    if (!value) return "";

    const parts = String(value).trim().replace(/\./g, "/").replace(/-/g, "/").split("/");
    if (parts.length !== 3) return value;

    let [dd, mm, yyyy] = parts;

    if (yyyy.length === 2) {
      yyyy = Number(yyyy) >= 50 ? `18${yyyy}` : `19${yyyy}`;
    }

    const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));

    if (Number.isNaN(date.getTime())) return value;

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    function suffix(day) {
      if (day >= 11 && day <= 13) return "th";
      switch (day % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
      }
    }

    const day = date.getDate();
    return `${days[date.getDay()]} ${day}${suffix(day)} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  function resolveTeam(teamValue) {
    return teams.find(t =>
      String(t.id).trim() === String(teamValue).trim() ||
      String(t.name).trim() === String(teamValue).trim()
    );
  }

  function teamBadgeHtml(teamValue, sizeClass = "team-badge-small") {
    const team = resolveTeam(teamValue);
    const teamId = team ? team.id : teamValue;
    return `<img class="${sizeClass}" src="images/teams/${teamId}.png" alt="" onerror="this.onerror=null;this.src='images/teams/defaultbadge.png';">`;
  }

  function getPlayer(playerId) {
    return players.find(p => String(p.id).trim() === String(playerId).trim());
  }

  function playerName(playerId) {
    const p = getPlayer(playerId);
    return p ? p.name : playerId;
  }

  function splitName(fullName) {
    const parts = String(fullName || "").trim().split(/\s+/);
    const last = parts.pop() || "";
    const first = parts.join(" ");
    return { first, last };
  }

  function scorerName(playerId, allIds) {
    const p = getPlayer(playerId);
    if (!p) return playerId;

    const { first, last } = splitName(p.name);

    const sameSurname = allIds
      .map(pid => getPlayer(pid))
      .filter(Boolean)
      .filter(x => splitName(x.name).last.toLowerCase() === last.toLowerCase());

    if (sameSurname.length > 1 && first) {
      return `${first.charAt(0)}.${last}`;
    }

    return last;
  }

  function joinScorers(arr) {
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return `${arr[0]} & ${arr[1]}`;
    return `${arr.slice(0, -1).join(", ")} & ${arr[arr.length - 1]}`;
  }

  function margateScorers() {
    const teamApps = apps.filter(a =>
      String(a.match_id).trim() === String(match.id).trim() &&
      String(a.team).trim() === "t1"
    );

    const margateScore =
      String(match.home_team).trim() === "t1"
        ? Number(match.home_score)
        : String(match.away_team).trim() === "t1"
          ? Number(match.away_score)
          : 0;

    if (Number.isNaN(margateScore) || margateScore <= 0) return "";

    const scorers = teamApps.filter(a => Number(a.goals || 0) > 0);
    const allIds = teamApps.map(a => a.player_id);

    const rows = scorers.map(a => ({
      name: scorerName(a.player_id, allIds),
      surname: splitName(playerName(a.player_id)).last,
      goals: Number(a.goals || 0),
      isUnknown: false
    }));

    const knownGoals = rows.reduce((sum, r) => sum + Number(r.goals || 0), 0);
    const unknownGoals = margateScore - knownGoals;

    if (unknownGoals > 0) {
      rows.push({
        name: "Unknown",
        surname: "Unknown",
        goals: unknownGoals,
        isUnknown: true
      });
    }

    if (!rows.length) return "";

    rows.sort((a, b) => {
      if (a.isUnknown && !b.isUnknown) return 1;
      if (!a.isUnknown && b.isUnknown) return -1;
      return (
        b.goals - a.goals ||
        a.surname.localeCompare(b.surname) ||
        a.name.localeCompare(b.name)
      );
    });

    const out = rows.map(r =>
      r.goals > 1 ? `${r.name} (${r.goals})` : r.name
    );

    return ` <span class="margate-scorers">(${joinScorers(out)})</span>`;
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

  function margateManagerForMatch(matchRecord) {
    const managerId =
      String(matchRecord.home_team).trim() === "t1"
        ? String(matchRecord.home_manager_id || "").trim()
        : String(matchRecord.away_team).trim() === "t1"
          ? String(matchRecord.away_manager_id || "").trim()
          : "";

    if (!managerId) return null;
    return managers.find(m => String(m.id).trim() === managerId) || null;
  }

  const home = resolveTeam(match.home_team);
  const away = resolveTeam(match.away_team);

  const homeName = home ? home.name : match.home_team;
  const awayName = away ? away.name : match.away_team;

  const scorers = margateScorers();

  const homeLine =
    String(match.home_team).trim() === "t1"
      ? `${homeName} ${match.home_score}${scorers}`
      : `${homeName} ${match.home_score}`;

  const awayLine =
    String(match.away_team).trim() === "t1"
      ? `${awayName} ${match.away_score}${scorers}`
      : `${awayName} ${match.away_score}`;

  const manager = margateManagerForMatch(match);

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

  const matchApps = apps.filter(a => String(a.match_id).trim() === String(match.id).trim());
  const homeApps = matchApps.filter(a => String(a.team).trim() === String(match.home_team).trim());
  const awayApps = matchApps.filter(a => String(a.team).trim() === String(match.away_team).trim());

  function isFriendly(matchRecord) {
    const comp = String(matchRecord.competition || "").trim().toLowerCase();
    return comp === "friendly" || comp === "friendlies" || comp === "fr" || comp.includes("friendly");
  }

  function isKnownScore(matchRecord) {
    return (
      matchRecord &&
      String(matchRecord.home_score).trim() !== "?" &&
      String(matchRecord.away_score).trim() !== "?" &&
      !Number.isNaN(Number(matchRecord.home_score)) &&
      !Number.isNaN(Number(matchRecord.away_score)) &&
      String(matchRecord.abandoned || "").trim().toUpperCase() !== "Y"
    );
  }

  function parseDateForSort(value) {
    if (!value) return null;
    const parts = String(value).trim().replace(/\./g, "/").replace(/-/g, "/").split("/");
    if (parts.length !== 3) return null;
    let [dd, mm, yyyy] = parts;
    if (yyyy.length === 2) yyyy = Number(yyyy) >= 50 ? `18${yyyy}` : `19${yyyy}`;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function matchSortValue(matchRecord) {
    const d = parseDateForSort(matchRecord.date);
    const time = d ? d.getTime() : 0;
    const originalIndex = matches.findIndex(m => String(m.id).trim() === String(matchRecord.id).trim());
    return time + (originalIndex / 100000);
  }

  function isBeforeCurrentMatch(matchRecord) {
    return matchSortValue(matchRecord) < matchSortValue(match);
  }

  function positionFromShirt(shirtNumber) {
    const map = { 1: "GK", 2: "RB", 3: "LB", 4: "RH", 5: "CH", 6: "LH", 7: "RW", 8: "IR", 9: "CF", 10: "IL", 11: "OL" };
    return map[Number(shirtNumber || 0)] || "";
  }

  function starLabel(text) {
    return `<span class="gold-star">★</span><span class="landmark-label">${text}</span><span class="gold-star">★</span>`;
  }

  function milestoneReached(before, after, step) {
    const labels = [];
    for (let n = step; n <= after; n += step) {
      if (before < n && after >= n) labels.push(n);
    }
    return labels;
  }

  function playerCareerStatsBefore(playerId, competitiveOnly = false) {
    let appsCount = 0;
    let goalsCount = 0;

    apps.forEach(row => {
      if (String(row.player_id).trim() !== String(playerId).trim()) return;
      const matchRecord = matches.find(m => String(m.id).trim() === String(row.match_id).trim());
      if (!matchRecord || !isKnownScore(matchRecord)) return;
      if (competitiveOnly && isFriendly(matchRecord)) return;
      if (!isBeforeCurrentMatch(matchRecord)) return;
      appsCount++;
      goalsCount += Number(row.goals || 0);
    });

    return { apps: appsCount, goals: goalsCount };
  }

  function playerLandmarkLabels(a) {
    const playerId = String(a.player_id).trim();
    const currentGoals = Number(a.goals || 0);
    const currentIsCompetitive = !isFriendly(match);
    const allBefore = playerCareerStatsBefore(playerId, false);
    const compBefore = playerCareerStatsBefore(playerId, true);
    const labels = [];

    if (allBefore.apps === 0) labels.push("Debut");
    if (currentIsCompetitive && compBefore.apps === 0) labels.push("Competitive Debut");
    if (currentGoals > 0 && allBefore.goals === 0) labels.push(currentGoals > 1 ? "First Goals" : "First Goal");
    if (currentGoals > 0 && currentIsCompetitive && compBefore.goals === 0) labels.push(currentGoals > 1 ? "First Competitive Goals" : "First Competitive Goal");

    milestoneReached(allBefore.apps, allBefore.apps + 1, 50).forEach(n => labels.push(`${n}th Appearance`));
    if (currentIsCompetitive) milestoneReached(compBefore.apps, compBefore.apps + 1, 50).forEach(n => labels.push(`${n}th Competitive Appearance`));
    if (currentGoals > 0) {
      milestoneReached(allBefore.goals, allBefore.goals + currentGoals, 25).forEach(n => labels.push(`${n}th Goal`));
      if (currentIsCompetitive) milestoneReached(compBefore.goals, compBefore.goals + currentGoals, 25).forEach(n => labels.push(`${n}th Competitive Goal`));
    }

    return labels.length ? `<span class="player-landmarks">${labels.map(starLabel).join(" ")}</span>` : "";
  }

  function playerIcons(a) {
    const captain = Number(a.captain || 0) === 1 ? `<span class="captain-icon" title="Captain">Ⓒ</span>` : "";
    const goals = "⚽".repeat(Number(a.goals || 0));
    const yellows = "🟨".repeat(Number(a.yellow || 0));
    const reds = "🟥".repeat(Number(a.red || 0));

    return (captain || goals || yellows || reds)
      ? `<span class="player-icons player-icons-inline">${captain}${goals}${yellows}${reds}</span>`
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

  function sortByShirt(teamApps) {
    return [...teamApps].sort((a, b) =>
      Number(a.shirt_number || 99) - Number(b.shirt_number || 99) ||
      playerName(a.player_id).localeCompare(playerName(b.player_id))
    );
  }

  function playerLineHtml(a) {
    const position = positionFromShirt(a.shirt_number);
    const positionHtml = position ? `<span class="lineup-position">${position}</span>` : `<span class="lineup-position"></span>`;
    const landmarks = playerLandmarkLabels(a);

    return `
      <div class="lineup-player">
        <span class="lineup-player-main">
          ${positionHtml}
          <a href="player.html?id=${a.player_id}">${playerName(a.player_id)}</a>
          ${playerIcons(a)}
          ${subMarker(a)}
        </span>
        ${landmarks}
      </div>
    `;
  }

  function renderTeamSection(title, teamApps) {
    let html = `<div class="content-box section-block match-lineup-column"><h3>${title}</h3>`;

    const starters = sortByShirt(teamApps.filter(a => Number(a.is_starting) === 1));
    const subs = sortByShirt(teamApps.filter(a => Number(a.is_starting) !== 1));

    if (starters.length === 0) {
      html += `<div>None listed</div>`;
    } else {
      starters.forEach(a => { html += playerLineHtml(a); });
    }

    if (subs.length > 0) {
      html += `<div class="lineup-gap"></div>`;
      html += `<h4 class="lineup-heading">Substitutes Used</h4>`;
      subs.forEach(a => { html += playerLineHtml(a); });
    }

    html += `</div>`;
    return html;
  }

  const homeHasInfo = homeApps.length > 0;
  const awayHasInfo = awayApps.length > 0;

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

  el.innerHTML = `
    ${navHtml()}

    <div class="content-box">
      <div class="competition-header">
        ${competitionBadgeHtml(match.competition)}
        <div class="match-header-main">
          <div class="match-score-header">
            <div class="match-team-line ${homeResultClass}">
              ${teamBadgeHtml(match.home_team, "team-badge-medium")}
              <span class="match-line-text">${homeLine}</span>
            </div>

            <div class="match-team-line ${awayResultClass}">
              ${teamBadgeHtml(match.away_team, "team-badge-medium")}
              <span class="match-line-text">${awayLine}</span>
            </div>
          </div>

          ${match.notes ? `<p class="stat-line"><strong>Notes:</strong> ${match.notes}</p>` : ""}
          ${manager ? `<p class="stat-line"><strong>Manager:</strong> <a href="manager.html?id=${manager.id}">${manager.name}</a></p>` : ""}
          <p class="stat-line"><strong>Competition:</strong> ${match.competition || ""}</p>
        </div>
      </div>

      <p class="stat-line"><strong>Date:</strong> ${formatLongDate(match.date)}</p>
      ${match.round && String(match.round).trim() !== ""
        ? `<p class="stat-line"><strong>Round:</strong> ${match.round}</p>`
        : ""}
      <p class="stat-line"><strong>Venue:</strong> ${match.venue || "Not recorded"}</p>
      <p class="stat-line"><strong>Attendance:</strong> ${match.attendance || "Unknown"}</p>
    </div>
  `;

  if (homeHasInfo || awayHasInfo) {
    let lineupHtml = `<div class="match-lineups-grid no-top-gap">`;

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

  el.innerHTML += navHtml();

}).catch(err => {
  document.getElementById("match").innerHTML =
    `<div class="content-box"><p>Error loading match page: ${err.message}</p></div>`;
  console.error(err);
});