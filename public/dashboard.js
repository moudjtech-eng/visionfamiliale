(async () => {
  const user = await requireAuth();
  if (!user) return;

  document.getElementById("user-email").textContent = user.email;
  document.getElementById("logout-btn").addEventListener("click", logout);

  // --- 1. Rendu des 9 cartes de types ---
  const grid = document.getElementById("types-grid");

  Object.entries(DOCUMENTS).forEach(([key, doc]) => {
    const card = document.createElement("a");
    card.className = "type-card";
    card.href = `/templates.html?type=${key}`;
    card.innerHTML = `
      <div class="type-icon">${doc.icon}</div>
      <h3>${doc.label}</h3>
      <p>${doc.description}</p>
      <div class="type-footer">
        <span class="price">${formatPrice(doc.price)}</span>
        <span class="btn-mini">Créer →</span>
      </div>
    `;
    grid.appendChild(card);
  });

  // --- 2. Charger les documents récents ---
  const res = await apiFetch("/api/cvs");
  const docs = await res.json();

  const recent = document.getElementById("recent-docs");
  const empty = document.getElementById("empty-recent");

  if (docs.length === 0) {
    empty.classList.remove("hidden");
    return;
  }

  docs.slice(0, 6).forEach(doc => {
    const meta = DOCUMENTS[doc.type] || DOCUMENTS.cv;
    const card = document.createElement("div");
    card.className = "doc-card";
    card.innerHTML = `
      <div class="doc-thumb">
        ${doc.photo_url
          ? `<img src="${doc.photo_url}" alt="">`
          : `<span class="doc-icon">${meta.icon}</span>`}
      </div>
      <div class="doc-body">
        <span class="doc-type">${meta.icon} ${meta.label}</span>
        <h4>${doc.title}</h4>
        <p class="muted small">Modifié le ${new Date(doc.updated_at).toLocaleDateString("fr-FR")}</p>
        <div class="doc-actions">
          <a href="/editor.html?id=${doc.id}" class="btn">✏️ Ouvrir</a>
          <button class="btn-delete" data-id="${doc.id}">🗑️</button>
        </div>
      </div>
    `;
    recent.appendChild(card);
  });

  // --- 3. Suppression ---
  recent.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Supprimer ce document ?")) return;
      const r = await apiFetch(`/api/cvs/${btn.dataset.id}`, { method: "DELETE" });
      if (r.ok) btn.closest(".doc-card").remove();
    });
  });
})();