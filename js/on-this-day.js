async function loadOnThisDay() {
  const container = document.getElementById("on-this-day");
  if (!container) return;

  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const [matches, players, teams] = await Promise.all([
    fetch("data/matches.json").then(r => r.json()),
    fetch("data/players.json").then(r => r.json()),
    fetch("data/teams.json").then(r => r.json()).catch(() => [])
  ]);

  const teamMap = {};
  teams.forEach(t => teamMap[t.id] = t.name);

  function parseDate(value) {
    if (!value) return null;

    // DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
      const [d, m, y] = value.split("/").map(Number);
      return { day: d, month: m, year: y };
    }

    // YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number);
      return { day: d, month: m, year: y };
    }

    return null;
  }

  function sameDay(dateObj) {
    return dateObj && dateObj.day === todayDay && dateObj.month === todayMonth;
  }

  function yearsAgo(year) {
    const diff = currentYear - year;
    return diff > 0 ? `${diff} years ago` : "";
  }

  const items = [];

  matches.forEach(match => {
    const d = parseDate(match.date);
    if (!sameDay(d)) return;

    const home = teamMap[match.home_team] || match.home_team;
    const away = teamMap[match.away_team] || match.away_team;

    let score = "";
    if (match.home_score !== "?" && match.away_score !== "?") {
      score = ` ${match.home_score}-${match.away_score}`;
    }

    items.push({
      year: d.year,
      type: "match",
      html: `
        <li>
          <strong>${d.year}</strong> — 
          <a href="match.html?id=${match.id}">${home}${score} ${away}</a>
          ${match.competition ? `<span class="otd-detail">(${match.competition})</span>` : ""}
          <span class="otd-years">${yearsAgo(d.year)}</span>
        </li>
      `
    });
  });

  players.forEach(player => {
    const birth = parseDate(player.dob || player.date_of_birth);
    if (sameDay(birth)) {
      items.push({
        year: birth.year,
        type: "birth",
        html: `
          <li>
            <strong>${birth.year}</strong> — 
            Born: <a href="player.html?id=${player.id}">${player.name}</a>
            <span class="otd-years">${yearsAgo(birth.year)}</span>
          </li>
        `
      });
    }

    const death = parseDate(player.dod || player.date_of_death || player.death_date);
    if (sameDay(death)) {
      items.push({
        year: death.year,
        type: "death",
        html: `
          <li>
            <strong>${death.year}</strong> — 
            Died: <a href="player.html?id=${player.id}">${player.name}</a>
            <span class="otd-years">${yearsAgo(death.year)}</span>
          </li>
        `
      });
    }
  });

  items.sort((a, b) => a.year - b.year);

  if (!items.length) {
    container.innerHTML = `<p>No Margate events recorded for this day.</p>`;
    return;
  }

  container.innerHTML = `
    <ul class="on-this-day-list">
      ${items.map(i => i.html).join("")}
    </ul>
  `;
}

loadOnThisDay().catch(err => {
  console.error("Error loading On This Day:", err);
  const container = document.getElementById("on-this-day");
  if (container) container.innerHTML = "<p>Unable to load On This Day.</p>";
});