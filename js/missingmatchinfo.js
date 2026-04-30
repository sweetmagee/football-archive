Promise.all([
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/teams.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json()),
  fetch("data/players.json").then(r => r.json())
]).then(([matches, teams, appearances, players]) => {
  const matchesEl = document.getElementById("missingMatches");
  const countEl = document.getElementById("missingMatchCount");
  const lineupMissingFilter = document.getElementById("lineupMissingFilter");
  const goalscorersMissingFilter = document.getElementById("goalscorersMissingFilter");
  const dateMissingFilter = document.getElementById("dateMissingFilter");

  function normalise(value) {
    return String(value || "").trim();
  }

  function isY(value) {
    return normalise(value).toUpperCase() === "Y";
  }

  function resolveTeam(teamValue) {
    return teams.find(t =>
      normalise(t.id) === normalise(teamValue) ||
      normalise(t.name) === normalise(teamValue)
    );
  }

  function teamName(teamValue) {
    const team = resolveTeam(teamValue);
    return team ? team.name : teamValue;
  }

  function teamBadgeHtml(teamValue) {
    const team = resolveTeam(teamValue);
    const badgeId = team ? team.id : teamValue;

    return `
      <img class="team-badge-small"
           src="images/teams/${badgeId}.png"
           alt=""
           onerror="this.onerror=null;this.src='images/teams/defaultbadge.png';">
    `;
  }

  function parseUkDate(value) {
    if (!value) return null;

    const cleaned = normalise(value).replace(/-/g, "/").replace(/\./g, "/");
    const parts = cleaned.split("/");

    if (parts.length !== 3) return null;

    let [d, m, y] = parts.map(x => x.trim());
    if (!d || !m || !y) return null;

    if (y.length === 2) {
      y = Number(y) >= 50 ? `18${y}` : `19${y}`;
    }

    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  function isDateMissing(match) {
    const note = normalise(match.notes).toLowerCase();
    return note.includes("date of match unknown") || !parseUkDate(match.date);
  }

  function matchSortDate(match) {
    if (isDateMissing(match)) {
      return new Date(9999, 11, 31);
    }

    return parseUkDate(match.date) || new Date(9999, 11, 30);
  }

  function isAbandoned(match) {
    return isY(match.abandoned);
  }

  function margateGoalsFor(match) {
    if (normalise(match.home_team) === "t1") return Number(match.home_score);
    if (normalise(match.away_team) === "t1") return Number(match.away_score);
    return 0;
  }

  function matchApps(match) {
    return appearances.filter(a =>
      normalise(a.match_id) === normalise(match.id) &&
      normalise(a.team) === "t1"
    );
  }

  function hasLineupMissing(match) {
    if (!isY(match.incomplete)) return false;
    return matchApps(match).length < 11;
  }

  function hasMissingGoalscorers(match) {
    if (!isY(match.incomplete)) return false;

    const score = margateGoalsFor(match);
    if (Number.isNaN(score) || score <= 0) return false;

    const knownGoalsFromApps = matchApps(match)
      .reduce((sum, a) => sum + Number(a.goals || 0), 0);

    const scorersArray = Array.isArray(match.scorers) ? match.scorers : [];
    const knownGoalsFromScorers = scorersArray
      .filter(s => normalise(s.player_id).toLowerCase() !== "unknown")
      .reduce((sum, s) => sum + Number(s.goals || 0), 0);

    const knownGoals = Math.max(knownGoalsFromApps, knownGoalsFromScorers);

    const scorersText = normalise(match.scorers_text).toLowerCase();
    const textSaysUnknown = scorersText.includes("?") || scorersText.includes("unknown");

    return textSaysUnknown || knownGoals < score;
  }

  function playerName(playerId) {
    const p = players.find(x => normalise(x.id) === normalise(playerId));
    return p ? p.name : playerId;
  }

  function shortScorerName(playerId, allIds) {
    const p = players.find(x => normalise(x.id) === normalise(playerId));
    if (!p) return playerId;

    const parts = normalise(p.name).split(/\s+/);
    const last = parts.pop() || p.name;
    const first = parts.join(" ");

    const sameSurname = allIds
      .map(pid => players.find(x => normalise(x.id) === normalise(pid)))
      .filter(Boolean)
      .filter(x => {
        const bits = normalise(x.name).split(/\s+/);
        const xLast = bits.pop() || "";
        return xLast.toLowerCase() === last.toLowerCase();
      });

    return sameSurname.length > 1 && first ? `${first.charAt(0)}.${last}` : last;
  }

  function joinScorerNames(items) {
    if (items.length === 0) return "";
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} & ${items[1]}`;
    return `${items.slice(0, -1).join(", ")} & ${items[items.length - 1]}`;
  }

  function matchScorersText(match) {
    const score = margateGoalsFor(match);
    if (Number.isNaN(score) || score <= 0) return "";

    const apps = matchApps(match);
    const allIds = apps.map(a => a.player_id);

    let rows = apps
      .filter(a => Number(a.goals || 0) > 0)
      .map(a => ({
        name: shortScorerName(a.player_id, allIds),
        surname: shortScorerName(a.player_id, allIds).replace(/^.*\./, ""),
        goals: Number(a.goals || 0),
        unknown: false
      }));

    if (!rows.length && Array.isArray(match.scorers)) {
      rows = match.scorers
        .filter(s => Number(s.goals || 0) > 0)
        .map(s => ({
          name: normalise(s.player_id).toLowerCase() === "unknown"
            ? "Unknown"
            : shortScorerName(s.player_id, match.scorers.map(x => x.player_id)),
          surname: normalise(s.player_id).toLowerCase() === "unknown"
            ? "Unknown"
            : shortScorerName(s.player_id, match.scorers.map(x => x.player_id)).replace(/^.*\./, ""),
          goals: Number(s.goals || 0),
          unknown: normalise(s.player_id).toLowerCase() === "unknown"
        }));
    }

    const knownGoals = rows.reduce((sum, r) => sum + r.goals, 0);
    const unknownGoals = score - knownGoals;

    if (unknownGoals > 0) {
      rows.push({
        name: "Unknown",
        surname: "Unknown",
        goals: unknownGoals,
        unknown: true
      });
    }

    rows.sort((a, b) => {
      if (a.unknown && !b.unknown) return 1;
      if (!a.unknown && b.unknown) return -1;

      return (
        b.goals - a.goals ||
        a.surname.localeCompare(b.surname) ||
        a.name.localeCompare(b.name)
      );
    });

    const out = rows.map(r => r.goals > 1 ? `${r.name} (${r.goals})` : r.name);
    return joinScorerNames(out);
  }

  function resultHtml(match) {
    return `
      <a href="match.html?id=${match.id}" class="missing-result-link">
        <span class="missing-result-team missing-result-home">
          <span>${teamName(match.home_team)}</span>
          ${teamBadgeHtml(match.home_team)}
        </span>

        <span class="missing-result-score">${match.home_score} - ${match.away_score}</span>

        <span class="missing-result-team missing-result-away">
          ${teamBadgeHtml(match.away_team)}
          <span>${teamName(match.away_team)}</span>
        </span>
      </a>
    `;
  }

  function render() {
    const showLineupMissing = lineupMissingFilter ? lineupMissingFilter.checked : true;
    const showGoalscorersMissing = goalscorersMissingFilter ? goalscorersMissingFilter.checked : true;
    const showDateMissing = dateMissingFilter ? dateMissingFilter.checked : true;

    let rows = matches.filter(match => !isAbandoned(match)).filter(match => {
      const lineups = hasLineupMissing(match);
      const scorers = hasMissingGoalscorers(match);
      const dateMissing = isDateMissing(match);

      return (
        (showLineupMissing && lineups) ||
        (showGoalscorersMissing && scorers) ||
        (showDateMissing && dateMissing)
      );
    });

    rows = rows.sort((a, b) => matchSortDate(a) - matchSortDate(b));

    if (!rows.length) {
      matchesEl.innerHTML = `<div>No matches found.</div>`;
      if (countEl) countEl.textContent = "0 matches shown";
      return;
    }

    matchesEl.innerHTML = `
      <table class="archive-table missing-matches-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Competition</th>
            <th>Result</th>
            <th>Goalscorers</th>
            <th>Att</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((match, index) => {
            const matchNumber = `#${String(index + 1).padStart(3, "0")}`;
            const abandonedText = isAbandoned(match) ? " - Abandoned" : "";
            const comp = `${match.competition || ""}${match.round ? ` - ${match.round}` : ""}${abandonedText}`;
            const scorers = matchScorersText(match);
            const dateText = isDateMissing(match) ? (match.date || "Date unknown") : match.date;

            return `
              <tr>
                <td class="missing-match-number">${matchNumber}</td>
                <td>${dateText || ""}</td>
                <td>${comp}</td>
                <td>${resultHtml(match)}</td>
                <td class="missing-match-scorers">${scorers || ""}</td>
                <td>${match.attendance || ""}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;

    if (countEl) {
      countEl.textContent = `${rows.length} match${rows.length === 1 ? "" : "es"} shown`;
    }
  }

  [lineupMissingFilter, goalscorersMissingFilter, dateMissingFilter].forEach(box => {
    if (box) box.addEventListener("change", render);
  });

  render();

}).catch(err => {
  console.error(err);

  const matchesEl = document.getElementById("missingMatches");
  const countEl = document.getElementById("missingMatchCount");

  if (countEl) countEl.textContent = "Error loading missing match information";
  if (matchesEl) matchesEl.innerHTML = `<div>Error loading data: ${err.message}</div>`;
});
