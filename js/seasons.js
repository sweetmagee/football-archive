fetch('data/seasons.json')
  .then(r => r.json())
  .then(seasons => {
    const el = document.getElementById('seasonList');

    if (!seasons || seasons.length === 0) {
      el.innerHTML = '<div>No seasons available.</div>';
      return;
    }

    const sorted = [...seasons].sort((a, b) => Number(a.start_year || 0) - Number(b.start_year || 0));

    sorted.forEach(s => {
      el.innerHTML += `
        <div>
          <a href="season.html?id=${s.id}">${s.name}</a>
        </div>
      `;
    });
  })
  .catch(err => {
    document.getElementById('seasonList').innerHTML = `<div>Error loading seasons: ${err.message}</div>`;
    console.error(err);
  });