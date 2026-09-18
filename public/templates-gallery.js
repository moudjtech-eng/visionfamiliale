(async () => {
  const user = await requireAuth();
  if (!user) return;

  const params = new URLSearchParams(location.search);
  const type = params.get("type") || "cv";
  const doc = getDocument(type);

  if (!doc) {
    alert("Type de document inconnu");
    location.href = "/dashboard.html";
    return;
  }

  document.getElementById("type-title").textContent = `${doc.icon} ${doc.label}`;
  document.title = `${doc.label} — Choisis un modèle`;

  const grid = document.getElementById("templates-grid");

  // On rend les cartes selon le type de document
  doc.templates.forEach(tpl => {
    const card = document.createElement("article");
    card.className = "card";

    // Aperçu visuel différent selon le type
    let previewHTML = "";
    if (type === "cv" && tpl.id === "modern") {
      previewHTML = `
        <div class="preview">
          <div class="pv-sidebar"></div>
          <div class="pv-content">
            <div class="pv-title"></div>
            <div class="pv-line"></div>
            <div class="pv-line short"></div>
            <div class="pv-sub"></div>
            <div class="pv-line"></div>
            <div class="pv-line short"></div>
          </div>
        </div>`;
    } else if (type === "cv" && tpl.id === "classic") {
      previewHTML = `
        <div class="preview">
          <div class="pv-content centered">
            <div class="pv-title centered"></div>
            <div class="pv-line"></div>
            <div class="pv-line"></div>
            <div class="pv-sub"></div>
            <div class="pv-line"></div>
            <div class="pv-line short"></div>
          </div>
        </div>`;
    } else if (type === "cv" && tpl.id === "creative") {
      previewHTML = `
        <div class="preview">
          <div class="pv-content">
            <div class="pv-title big"></div>
            <div class="pv-line"></div>
            <div class="pv-sub"></div>
            <div class="pv-line short"></div>
            <div class="pv-sub"></div>
            <div class="pv-line"></div>
          </div>
        </div>`;
    } else {
      // Modèle générique pour les autres types
      previewHTML = `
        <div class="preview">
          <div class="pv-content">
            <div class="pv-title"></div>
            <div class="pv-line"></div>
            <div class="pv-line short"></div>
            <div class="pv-line"></div>
            <div class="pv-line"></div>
            <div class="pv-line short"></div>
            <div class="pv-sub"></div>
            <div class="pv-line"></div>
          </div>
        </div>`;
    }

    card.innerHTML = `
      ${previewHTML}
      <div class="card-body">
        <h2>${tpl.name}</h2>
        <p>${tpl.desc}</p>
        <button class="btn" data-template="${tpl.id}">Utiliser ce modèle</button>
      </div>
    `;

    // ⚠️ Le clic : on sauvegarde le modèle ET on redirige
    card.querySelector(".btn").addEventListener("click", () => {
      localStorage.setItem("cv-template", tpl.id);        // pour l'ancien système
      localStorage.setItem("doc-type", type);              // mémorise le type
      window.location.href = `/editor.html?type=${type}&template=${tpl.id}`;
    });

    grid.appendChild(card);
  });
})();