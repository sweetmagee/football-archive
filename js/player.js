const id = new URLSearchParams(window.location.search).get("id");

Promise.all([
  fetch("data/players.json").then(r => r.json()),
  fetch("data/player_profiles.json").then(r => r.json()).catch(() => []),
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json()),
  fetch("data/teams.json").then(r => r.json())
]).then(([players, profiles, matches, appearances, teams]) => {
  const player = players.find(p => String(p.id).trim() === String(id).trim());
  const profile = profiles.find(p => String(p.id).trim() === String(id).trim()) || {};

  const el =
    document.getElementById("player") ||
    document.getElementById("playerPage");

  if (!player) {
    el.innerHTML = `<div class="content-box"><p>Player not found.</p></div>`;
    return;
  }

  function teamName(teamId) {
    const team = teams.find(t => String(t.id).trim() === String(teamId).trim());
    return team ? team.name : teamId;
  }

  function isFriendly(match) {
    const comp = String(match.competition || "").trim().toLowerCase();
    return comp === "friendly" || comp === "fr" || comp === "friendlies";
  }

  function validMatch(match) {
    return (
      match &&
      match.home_score !== "?" &&
      match.away_score !== "?" &&
      !Number.isNaN(Number(match.home_score)) &&
      !Number.isNaN(Number(match.away_score))
    );
  }

  function parseDate(value) {
    if (!value) return null;

    const parts = String(value)
      .trim()
      .replace(/\./g, "/")
      .replace(/-/g, "/")
      .split("/");

    if (parts.length !== 3) return null;

    let [dd, mm, yyyy] = parts;

    if (yyyy.length === 2) {
      yyyy = Number(yyyy) >= 50 ? `18${yyyy}` : `19${yyyy}`;
    }

    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function formatLongDate(value) {
    const d = parseDate(value);
    if (!d) return "Unknown";

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

    const day = d.getDate();

    return `${days[d.getDay()]} ${day}${suffix(day)} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatSpan(firstDateValue, lastDateValue) {
    const first = parseDate(firstDateValue);
    const last = parseDate(lastDateValue);

    if (!first || !last) return "Unknown";

    const diffMs = last.getTime() - first.getTime();
    const days = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

    if (days <= 365) {
      return days === 1 ? "1 day" : `${days} days`;
    }

    const years = Math.floor(days / 365);
    const remainingDays = days % 365;

    const yearText = years === 1 ? "1 year" : `${years} years`;
    const dayText = remainingDays === 1 ? "1 day" : `${remainingDays} days`;

    return remainingDays > 0 ? `${yearText} ${dayText}` : yearText;
  }

  function matchLine(match) {
    return `${teamName(match.home_team)} ${match.home_score}-${match.away_score} ${teamName(match.away_team)}`;
  }

  const apps = appearances.filter(a =>
    String(a.player_id).trim() === String(id).trim()
  );

  const appsWithMatch = apps
    .map(app => ({
      app,
      match: matches.find(m => String(m.id).trim() === String(app.match_id).trim())
    }))
    .filter(row => row.match && validMatch(row.match));

  function calcStats(list) {
    const starts = list.filter(x => Number(x.app.is_starting) === 1).length;
    const subs = list.filter(x => Number(x.app.is_starting) !== 1).length;
    const goals = list.reduce((sum, x) => sum + Number(x.app.goals || 0), 0);

    return {
      starts,
      subs,
      goals,
      displayApps: subs > 0 ? `${starts}+${subs}` : `${starts}`
    };
  }

  const competitive = appsWithMatch.filter(x => !isFriendly(x.match));
  const friendly = appsWithMatch.filter(x => isFriendly(x.match));
  const total = appsWithMatch;

  const compStats = calcStats(competitive);
  const frStats = calcStats(friendly);
  const totalStats = calcStats(total);

  const orderedMatches = [...appsWithMatch].sort((a, b) => {
    const da = parseDate(a.match.date);
    const db = parseDate(b.match.date);

    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;

    return da - db;
  });

  const orderedCompetitiveMatches = [...competitive].sort((a, b) => {
    const da = parseDate(a.match.date);
    const db = parseDate(b.match.date);

    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;

    return da - db;
  });

  const firstAllMatch = orderedMatches[0]?.match || null;
  const lastAllMatch = orderedMatches[orderedMatches.length - 1]?.match || null;

  const firstCompetitiveMatch = orderedCompetitiveMatches[0]?.match || null;
  const lastCompetitiveMatch = orderedCompetitiveMatches[orderedCompetitiveMatches.length - 1]?.match || null;

  const debutText = firstAllMatch ? formatLongDate(firstAllMatch.date) : "Unknown";
  const competitiveDebutText = firstCompetitiveMatch ? formatLongDate(firstCompetitiveMatch.date) : "Unknown";
  const lastAppearanceText = lastAllMatch ? formatLongDate(lastAllMatch.date) : "Unknown";
  const lastCompetitiveAppearanceText = lastCompetitiveMatch ? formatLongDate(lastCompetitiveMatch.date) : "Unknown";
  const appearanceSpanText =
    firstAllMatch && lastAllMatch
      ? formatSpan(firstAllMatch.date, lastAllMatch.date)
      : "Unknown";

  const playerPhoto =
    player.photo && String(player.photo).trim() !== ""
      ? String(player.photo).trim()
      : `${player.id}.png`;

  const photoHtml = `
    <img
      src="images/players/${playerPhoto}"
      alt="${player.name}"
      onerror="
        if (!this.dataset.triedId) {
          this.dataset.triedId='1';
          this.src='images/players/${player.id}.png';
        } else if (!this.dataset.triedDefaultPlayer) {
          this.dataset.triedDefaultPlayer='1';
          this.src='images/players/defaultplayer.png';
        } else {
          this.onerror=null;
          this.src='images/players/default.png';
        }
      "
    >
  `;

  el.innerHTML = `
    <div class="content-box">
      <div class="player-card">
        ${photoHtml}

        <div class="player-meta">
          <h2>${player.name}</h2>

          ${player.position ? `<p><strong>Position:</strong> ${player.position}</p>` : ""}
          ${profile.dob ? `<p><strong>Date of Birth:</strong> ${profile.dob}</p>` : ""}
          ${profile.birth_place ? `<p><strong>Birth Place:</strong> ${profile.birth_place}</p>` : ""}

          <p><strong>Debut:</strong> ${debutText}</p>
          <p><strong>Competitive Debut:</strong> ${competitiveDebutText}</p>
          <p><strong>Last Appearance:</strong> ${lastAppearanceText}</p>
          <p><strong>Last Competitive Appearance:</strong> ${lastCompetitiveAppearanceText}</p>
          <p><strong>Appearance Span (All matches):</strong> ${appearanceSpanText}</p>

          ${profile.other_clubs ? `<p><strong>Other Clubs:</strong> ${profile.other_clubs}</p>` : ""}
        </div>
      </div>

      <div class="player-stats-grid">
        <div class="player-stat-box">
          <div class="player-stat-title">Competitive Record</div>
          <p><strong>Appearances:</strong> ${compStats.displayApps}</p>
          <p><strong>Goals:</strong> ${compStats.goals}</p>
        </div>

        <div class="player-stat-box">
          <div class="player-stat-title">Friendly Record</div>
          <p><strong>Appearances:</strong> ${frStats.displayApps}</p>
          <p><strong>Goals:</strong> ${frStats.goals}</p>
        </div>

        <div class="player-stat-box">
          <div class="player-stat-title">Total Record</div>
          <p><strong>Appearances:</strong> ${totalStats.displayApps}</p>
          <p><strong>Goals:</strong> ${totalStats.goals}</p>
        </div>
      </div>

      ${profile.bio ? `
        <div class="section-block">
          <h3>Biography</h3>
          <p>${profile.bio}</p>
        </div>
      ` : ""}
    </div>

    <div class="content-box section-block">
      <h3>Match Record</h3>
      <table class="archive-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Match</th>
            <th>Competition</th>
            <th>Apps</th>
            <th>Goals</th>
          </tr>
        </thead>
        <tbody id="playerMatchRows"></tbody>
      </table>
    </div>
  `;

  const rows = document.getElementById("playerMatchRows");

  if (orderedMatches.length === 0) {
    rows.innerHTML = `
      <tr>
        <td colspan="5">No match records found.</td>
      </tr>
    `;
    return;
  }

  orderedMatches.forEach(({ app, match }) => {
    rows.innerHTML += `
      <tr>
        <td>${match.date || ""}</td>
        <td>
          <a href="match.html?id=${match.id}">
            ${matchLine(match)}
          </a>
        </td>
        <td>${match.competition || ""}</td>
        <td>${Number(app.is_starting) === 1 ? "Start" : "Sub"}</td>
        <td>${Number(app.goals || 0)}</td>
      </tr>
    `;
  });

}).catch(err => {
  const el =
    document.getElementById("player") ||
    document.getElementById("playerPage");

  el.innerHTML = `<div class="content-box"><p>Error loading player page: ${err.message}</p></div>`;
  console.error(err);
});