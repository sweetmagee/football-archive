fetch('data/seasons.json')
  .then(r => r.json())
  .then(seasons => {
    const el = document.getElementById('seasonList');
    const picker = document.getElementById('seasonPicker');

    if (!seasons || seasons.length === 0) {
      el.innerHTML = '<div>No seasons available.</div>';
      return;
    }

    const sorted = [...seasons].sort(
      (a, b) => Number(a.start_year || 0) - Number(b.start_year || 0)
    );

    el.innerHTML = '';
    picker.innerHTML = '<option value=\"\">Select a season...</option>';

    sorted.forEach(s => {
      el.innerHTML += `
        <div style="margin:8px 0;">
          <a href="season.html?id=${s.id}"
             style="
               display:inline-flex;
               align-items:center;
               justify-content:center;
               width:220px;
               min-height:42px;
               background:rgba(45,30,15,0.88);
               color:#f5ead4;
               text-decoration:none;
               font-weight:700;
               padding:8px 14px;
               border-radius:999px;
               border:1px solid rgba(245,234,212,0.55);
               box-shadow:0 2px 7px rgba(0,0,0,0.28);
             ">
             ${s.name}
          </a>
        </div>
      `;

      picker.innerHTML += `
        <option value="${s.id}">${s.name}</option>
      `;
    });

    picker.addEventListener('change', () => {
      if (picker.value) {
        window.location.href = `season.html?id=${picker.value}`;
      }
    });
  })
  .catch(err => {
    document.getElementById('seasonList').innerHTML =
      `<div>Error loading seasons: ${err.message}</div>`;
    console.error(err);
  });