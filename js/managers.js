Promise.all([
  fetch("data/managers.json").then(r => r.json()),
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/teams.json").then(r => r.json())
]).then(([managers, matches, teams]) => {
  const el = document.getElementById("managerList");
  const eraFilter = document.getElementById("managerEraFilter");
  const countEl = document.getElementById("managerCount");

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

  function isCountableMatch(match) {
    return (
      match &&
      String(match.abandoned || "").trim().toUpperCase() !== "Y" &&
      String(match.home_score).trim() !== "?" &&
      String(match.away_score).trim() !== "?" &&
      !Number.isNaN(Number(match.home_score)) &&
      !Number.isNaN(Number(match.away_score))
    );
  }

  function sortMatches(matchList) {
    return [...matchList].sort((a, b) => {
      const dateDiff = dateSortValue(a.date) - dateSortValue(b.date);
      if (dateDiff !== 0) return dateDiff;

      const aIndex = matches.findIndex(m => String(m.id).trim() === String(a.id).trim());
      const bIndex = matches.findIndex(m => String(m.id).trim() === String(b.id).trim());
      return aIndex - bIndex;
    });
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

  const baseRows = managers.map(mgr => {
    const mgrMatches = matches.filter(m =>
      (
        String(m.home_manager_id || "").trim() === String(mgr.id).trim() ||
        String(m.away_manager_id || "").trim() === String(mgr.id).trim()
      ) &&
      isCountableMatch(m)
    );

    const knownDateMatches = sortMatches(mgrMatches.filter(m => parseDate(m.date)));
    const sortedMatches = sortMatches(mgrMatches);

    const firstMatch = knownDateMatches[0] || sortedMatches[0];
    const lastMatch = knownDateMatches[knownDateMatches.length - 1] || sortedMatches[sortedMatches.length - 1];

    const firstMatchDate = firstMatch ? firstMatch.date : "";
    const lastMatchDate = lastMatch ? lastMatch.date : "";

    return {
      ...mgr,
      matchCount: mgrMatches.length,
      firstMatchDate,
      lastMatchDate,
      firstMatchSort: dateSortValue(firstMatchDate),
      lastMatchSort: dateSortValue(lastMatchDate),
      matchSpan: formatSpanFromDates(firstMatchDate, lastMatchDate)
    };
  }).sort((a, b) => a.firstMatchSort - b.firstMatchSort || String(a.name).localeCompare(String(b.name)));

  function rowMatchesEra(row, eraValue) {
    if (!eraValue || eraValue === "all") return true;

    const first = parseDate(row.firstMatchDate);

    if (eraValue === "unknown") return !first;
    if (!first) return false;

    const firstYear = first.getFullYear();

    if (eraValue === "1890s") {
      return firstYear >= 1890 && firstYear <= 1899;
    }

    const startYear = Number(String(eraValue).replace("s", ""));
    const endYear = startYear + 9;

    return firstYear >= startYear && firstYear <= endYear;
  }

  function render() {
    const eraValue = eraFilter ? eraFilter.value : "all";
    const rows = baseRows.filter(row => rowMatchesEra(row, eraValue));

    if (countEl) {
      countEl.textContent = rows.length;
    }

    if (!rows.length) {
      el.innerHTML = "<p>No managers recorded.</p>";
      return;
    }

    el.innerHTML = `
      <table class="archive-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>First Match</th>
            <th>Last Match</th>
            <th>Match Span</th>
            <th>Matches</th>
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
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  if (eraFilter) {
    eraFilter.addEventListener("change", render);
  }

  render();

}).catch(err => {
  document.getElementById("managerList").innerHTML = `<p>Error loading managers: ${err.message}</p>`;
  console.error(err);
});
