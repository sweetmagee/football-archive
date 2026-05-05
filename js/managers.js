Promise.all([
  fetch("data/managers.json").then(r => r.json()),
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/teams.json").then(r => r.json())
]).then(([managers, matches, teams]) => {
  const el = document.getElementById("managerList");
  const eraFilter = document.getElementById("managerEraFilter");
  const includeFriendlies = document.getElementById("includeFriendliesManagers");
  const countEl = document.getElementById("managerCount");

  let currentSort = {
    key: "firstMatchSort",
    direction: "asc"
  };

  function normalise(value) {
    return String(value || "").trim();
  }

  function parseDate(value) {
    if (!value) return null;

    const clean = String(value).replace(/\./g, "/").replace(/-/g, "/").trim();
    const parts = clean.split("/");

    if (parts.length !== 3) return null;

    let [d, m, y] = parts;

    if (y.length === 2) {
      y = Number(y) >= 50 ? `18${y}` : `19${y}`;
    }

    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  function dateSortValue(value) {
    const d = parseDate(value);
    return d ? d.getTime() : Number.MAX_SAFE_INTEGER;
  }

  function managerEra(row) {
    if (!row || row.firstMatchSort === Number.MAX_SAFE_INTEGER) return "unknown";

    const first = parseDate(row.firstMatchDate);
    const last = parseDate(row.lastMatchDate) || first;

    if (!first) return "unknown";

    const firstYear = first.getFullYear();
    const lastYear = last.getFullYear();

    return { firstYear, lastYear };
  }

  function rowOverlapsEra(row, eraValue) {
    if (!eraValue || eraValue === "all") return true;

    const era = managerEra(row);
    if (eraValue === "unknown") return era === "unknown";
    if (era === "unknown") return false;

    const startYear = Number(eraValue.replace("s", ""));
    const endYear = startYear + 9;

    return era.firstYear <= endYear && era.lastYear >= startYear;
  }

  function isFriendly(match) {
    const comp = normalise(match.competition).toLowerCase();
    return (
      comp === "friendly" ||
      comp === "friendlies" ||
      comp === "fr" ||
      comp.includes("friendly")
    );
  }

  function isCountableMatch(match) {
    return (
      match &&
      normalise(match.abandoned).toUpperCase() !== "Y" &&
      normalise(match.home_score) !== "?" &&
      normalise(match.away_score) !== "?" &&
      !Number.isNaN(Number(match.home_score)) &&
      !Number.isNaN(Number(match.away_score))
    );
  }

  function managedTeamId(match, managerId) {
    if (normalise(match.home_manager_id) === normalise(managerId)) {
      return match.home_team;
    }

    if (normalise(match.away_manager_id) === normalise(managerId)) {
      return match.away_team;
    }

    return "";
  }

  function resultForManager(match, managerId) {
    const teamId = managedTeamId(match, managerId);
    const isHome = normalise(match.home_team) === normalise(teamId);

    const goalsFor = isHome ? Number(match.home_score) : Number(match.away_score);
    const goalsAgainst = isHome ? Number(match.away_score) : Number(match.home_score);

    if (goalsFor > goalsAgainst) return "W";
    if (goalsFor < goalsAgainst) return "L";
    return "D";
  }

  function formatSpanFromDates(startDateText, endDateText) {
    const start = parseDate(startDateText);
    const end = parseDate(endDateText);

    if (!start || !end) return "";

    const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    const years = Math.floor(diff / 365);
    const remainingDays = diff % 365;

    if (years > 0) {
      return `${years} year${years !== 1 ? "s" : ""} ${remainingDays} day${remainingDays !== 1 ? "s" : ""}`;
    }

    return `${diff} day${diff !== 1 ? "s" : ""}`;
  }

  function sortMatchesByKnownDate(matchList) {
    return [...matchList].sort((a, b) => {
      const aDate = dateSortValue(a.date);
      const bDate = dateSortValue(b.date);

      if (aDate !== bDate) return aDate - bDate;

      const aIndex = matches.findIndex(m => normalise(m.id) === normalise(a.id));
      const bIndex = matches.findIndex(m => normalise(m.id) === normalise(b.id));

      return aIndex - bIndex;
    });
  }

  const baseRows = managers.map(mgr => {
    const allMgrMatches = matches.filter(m =>
      normalise(m.home_manager_id) === normalise(mgr.id) ||
      normalise(m.away_manager_id) === normalise(mgr.id)
    );

    const knownDateMatches = sortMatchesByKnownDate(
      allMgrMatches.filter(m => parseDate(m.date))
    );

    const firstMatch = knownDateMatches[0] || sortMatchesByKnownDate(allMgrMatches)[0];
    const lastMatch = knownDateMatches[knownDateMatches.length - 1] || sortMatchesByKnownDate(allMgrMatches).slice(-1)[0];

    const firstMatchDate = firstMatch ? firstMatch.date : "";
    const lastMatchDate = lastMatch ? lastMatch.date : "";
    const spanDays = parseDate(firstMatchDate) && parseDate(lastMatchDate)
      ? Math.floor((parseDate(lastMatchDate) - parseDate(firstMatchDate)) / (1000 * 60 * 60 * 24))
      : -1;

    return {
      ...mgr,
      firstMatchDate,
      lastMatchDate,
      firstMatchSort: dateSortValue(firstMatchDate),
      lastMatchSort: dateSortValue(lastMatchDate),
      matchSpan: formatSpanFromDates(firstMatchDate, lastMatchDate),
      spanDays,
      allMatches: allMgrMatches
    };
  });

  function arrowFor(key) {
    if (currentSort.key !== key) return `<span class="sort-muted">↕</span>`;
    return currentSort.direction === "asc" ? "▲" : "▼";
  }

  function sortableHeader(label, key) {
    return `<th class="sortable" data-sort="${key}">${label} ${arrowFor(key)}</th>`;
  }

  function compareValues(a, b, key) {
    let av = a[key];
    let bv = b[key];

    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();

    if (av === undefined || av === null || av === "") av = Number.MAX_SAFE_INTEGER;
    if (bv === undefined || bv === null || bv === "") bv = Number.MAX_SAFE_INTEGER;

    if (av < bv) return currentSort.direction === "asc" ? -1 : 1;
    if (av > bv) return currentSort.direction === "asc" ? 1 : -1;

    return a.name.localeCompare(b.name);
  }

  function buildRows() {
    const eraValue = eraFilter ? eraFilter.value : "all";
    const includeFr = includeFriendlies.checked;

    let rows = baseRows
      .filter(row => rowOverlapsEra(row, eraValue))
      .map(row => {
      const validMatches = row.allMatches.filter(m =>
        isCountableMatch(m) &&
        (includeFr || !isFriendly(m))
      );

      let wins = 0;
      let draws = 0;
      let losses = 0;

      validMatches.forEach(match => {
        const result = resultForManager(match, row.id);
        if (result === "W") wins++;
        else if (result === "L") losses++;
        else draws++;
      });

      const matchCount = validMatches.length;
      const winPct = matchCount ? (wins / matchCount) * 100 : 0;

      return {
        ...row,
        matchCount,
        wins,
        draws,
        losses,
        winPct
      };
    });

    rows.sort((a, b) => compareValues(a, b, currentSort.key));

    return rows;
  }

  function render() {
    const rows = buildRows();

    countEl.textContent = rows.length;

    if (!rows.length) {
      el.innerHTML = "<p>No managers found.</p>";
      return;
    }

    el.innerHTML = `
      <table class="archive-table">
        <thead>
          <tr>
            ${sortableHeader("Name", "name")}
            ${sortableHeader("First Match", "firstMatchSort")}
            ${sortableHeader("Last Match", "lastMatchSort")}
            ${sortableHeader("Match Span", "spanDays")}
            ${sortableHeader("Matches", "matchCount")}
            ${sortableHeader("Win %", "winPct")}
            ${sortableHeader("W", "wins")}
            ${sortableHeader("D", "draws")}
            ${sortableHeader("L", "losses")}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <td><a href="manager.html?id=${row.id}">${row.name}</a></td>
              <td>${row.firstMatchDate || ""}</td>
              <td>${row.lastMatchDate || ""}</td>
              <td>${row.matchSpan || ""}</td>
              <td>${row.matchCount}</td>
              <td>${row.matchCount ? `${row.winPct.toFixed(1)}%` : "0.0%"}</td>
              <td>${row.wins}</td>
              <td>${row.draws}</td>
              <td>${row.losses}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    document.querySelectorAll("#managerList .sortable").forEach(th => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;

        if (currentSort.key === key) {
          currentSort.direction = currentSort.direction === "asc" ? "desc" : "asc";
        } else {
          currentSort.key = key;
          currentSort.direction = key === "name" || key.includes("MatchSort") || key === "spanDays"
            ? "asc"
            : "desc";
        }

        render();
      });
    });
  }

  if (eraFilter) eraFilter.addEventListener("change", render);
  includeFriendlies.addEventListener("change", render);

  render();

}).catch(err => {
  document.getElementById("managerList").innerHTML =
    `<p>Error loading managers: ${err.message}</p>`;
  console.error(err);
});
