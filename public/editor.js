(async () => {
  const user = await requireAuth();
  if (!user) return;

  // --- Paramètres URL ---
  const urlParams = new URLSearchParams(location.search);
  let cvId = urlParams.get("id");
  let type = urlParams.get("type") || localStorage.getItem("doc-type") || "cv";
  let template = urlParams.get("template")
              || localStorage.getItem("cv-template")
              || "modern";

  const doc = getDocument(type);
  if (!doc) {
    alert("Type de document inconnu");
    location.href = "/dashboard.html";
    return;
  }

  const data = {};
  let photoUrl = null;
  let cvTitle = doc.label;

  // ---------- 1. GÉNÉRATION DES CHAMPS ----------
  const container = document.getElementById("dynamic-fields");

  doc.fields.forEach(field => {
    // Cas spécial : articles (facture)
    if (field.type === "articles") {
      renderArticlesEditor();
      return;
    }

    const fs = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = field.label;
    fs.appendChild(legend);

    let input;
    if (field.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = 4;
    } else if (field.type === "file") {
      input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
    } else {
      input = document.createElement("input");
      input.type = field.type;
    }

    input.placeholder = field.placeholder || "";
    input.dataset.field = field.key;

    if (field.key === "photo") {
      const wrap = document.createElement("div");
      wrap.className = "photo-upload";
      const prev = document.createElement("div");
      prev.id = "photo-preview";
      prev.className = "photo-preview";
      prev.textContent = "+";
      input.id = "photo-input";
      wrap.appendChild(prev);
      wrap.appendChild(input);
      fs.appendChild(wrap);
    } else {
      fs.appendChild(input);
    }

    container.appendChild(fs);
  });

  // ============ GESTION ARTICLES (facture) ============
  function renderArticlesEditor() {
    const fs = document.createElement("fieldset");
    fs.id = "articles-fieldset";

    const legend = document.createElement("legend");
    legend.textContent = "Articles de la facture";
    fs.appendChild(legend);

    const list = document.createElement("div");
    list.id = "articles-list";
    fs.appendChild(list);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-add-article";
    btn.textContent = "➕ Ajouter un produit";
    btn.addEventListener("click", () => {
      addArticleRow({ designation: "", qte: 1, pu: 0 });
    });
    fs.appendChild(btn);

    container.appendChild(fs);

    // Une ligne vide par défaut
    addArticleRow({ designation: "", qte: 1, pu: 0 });
  }

  function addArticleRow(article) {
    const list = document.getElementById("articles-list");
    if (!list) return;

    const row = document.createElement("div");
    row.className = "article-row";
    row.innerHTML = `
      <input type="text"   class="a-desig" placeholder="Désignation" value="${article.designation || ""}">
      <input type="number" class="a-qte"   placeholder="Qté"  min="0" value="${article.qte ?? 1}">
      <input type="number" class="a-pu"    placeholder="P.U." min="0" value="${article.pu ?? 0}">
      <span class="a-total">0 F</span>
      <button type="button" class="a-del" title="Supprimer">🗑️</button>
    `;
    list.appendChild(row);

    const updateRow = () => {
      const qte = parseFloat(row.querySelector(".a-qte").value) || 0;
      const pu  = parseFloat(row.querySelector(".a-pu").value) || 0;
      const total = qte * pu;
      row.querySelector(".a-total").textContent = formatNumber(total) + " F";
      syncArticles();
    };

    row.querySelectorAll("input").forEach(i => {
      i.addEventListener("input", updateRow);
      i.addEventListener("change", updateRow);
    });

    row.querySelector(".a-del").addEventListener("click", () => {
      row.remove();
      syncArticles();
    });

    updateRow();
  }

  function syncArticles() {
    const list = document.getElementById("articles-list");
    if (!list) return;
    data.articles = Array.from(list.querySelectorAll(".article-row")).map(row => ({
      designation: row.querySelector(".a-desig").value.trim(),
      qte: parseFloat(row.querySelector(".a-qte").value) || 0,
      pu:  parseFloat(row.querySelector(".a-pu").value) || 0
    })).filter(a => a.designation || a.qte || a.pu);
    renderCV();
  }

  // ---------- 2. CHARGER UN DOCUMENT EXISTANT ----------
  if (cvId) {
    const res = await apiFetch(`/api/cvs/${cvId}`);
    if (res.ok) {
      const existing = await res.json();
      Object.assign(data, existing.data || {});
      photoUrl = existing.photo_url;
      template = existing.template;
      type = existing.type || "cv";
      cvTitle = existing.title;

      document.querySelectorAll("[data-field]").forEach(el => {
        el.value = data[el.dataset.field] || "";
      });
      document.getElementById("cv-title").value = cvTitle;
      updatePhotoPreview();

      if (type === "facture" && document.getElementById("articles-list")) {
        document.getElementById("articles-list").innerHTML = "";
        const arr = Array.isArray(data.articles) ? data.articles : [];
        if (arr.length === 0) {
          addArticleRow({ designation: "", qte: 1, pu: 0 });
        } else {
          arr.forEach(a => addArticleRow(a));
        }
      }
    } else {
      cvId = null;
    }
  }

  document.getElementById("cv-title-label").textContent = cvTitle;

  // ---------- 3. RENDU ----------
  function renderCV() {
    if (type === "cv") { renderCVOnly(); return; }
    if (type === "facture") { renderFacture(); return; }
    if (type.startsWith("lettre") || type === "demande_stage") { renderLettre(); return; }
    if (type === "attestation") { renderAttestation(); return; }
    if (type === "recu") { renderRecu(); return; }

    const cv = document.getElementById("cv-preview");
    cv.className = "cv " + template;
    cv.innerHTML = "<p style='padding:40px;'>Rendu non disponible pour ce type.</p>";
  }

  // ========== RENDU CV ==========
  function renderCVOnly() {
    const expList = (data.experiences || "").split("\n").filter(l => l.trim()).map(l => {
      const [poste, entreprise, annees] = l.split("|").map(s => s.trim());
      return `<li><strong>${poste || ""}</strong><br>
        <span class="muted">${entreprise || ""} ${annees ? "· " + annees : ""}</span></li>`;
    }).join("");

    const eduList = (data.education || "").split("\n").filter(l => l.trim()).map(l => {
      const [dip, eco, an] = l.split("|").map(s => s.trim());
      return `<li><strong>${dip || ""}</strong><br>
        <span class="muted">${eco || ""} ${an ? "· " + an : ""}</span></li>`;
    }).join("");

    const skills = (data.skills || "").split(",").map(s => s.trim()).filter(Boolean);
    const skillsHTML = skills.map(s => `<li>${s}</li>`).join("");

    const photoHTML = photoUrl
      ? `<img class="cv-photo" src="${photoUrl}" alt="photo">`
      : `<div class="cv-photo placeholder">📷</div>`;

    const contactHTML = `
      <div class="contact">
        ${data.email   ? `<div>✉️ ${data.email}</div>` : ""}
        ${data.phone   ? `<div>📞 ${data.phone}</div>` : ""}
        ${data.address ? `<div>📍 ${data.address}</div>` : ""}
        ${data.website ? `<div>🔗 ${data.website}</div>` : ""}
      </div>`;

    let html = "";

    if (template === "modern") {
      html = `
        <div class="sidebar">
          ${photoHTML}
          <h1>${data.name || "Ton Nom"}</h1>
          <p class="role">${data.title || "Ton titre"}</p>
          <h2>Contact</h2>
          ${contactHTML}
          <h2>Compétences</h2>
          <ul class="skills">${skillsHTML}</ul>
        </div>
        <div class="main">
          <h2>Profil</h2>
          <p>${data.summary || "Ton profil apparaîtra ici."}</p>
          <h2>Expériences</h2>
          <ul>${expList || "<li class='muted'>Aucune expérience.</li>"}</ul>
          <h2>Formation</h2>
          <ul>${eduList || "<li class='muted'>Aucune formation.</li>"}</ul>
        </div>`;
    } else if (template === "classic") {
      html = `
        <div class="header-classic">
          ${photoHTML}
          <div>
            <h1>${data.name || "Ton Nom"}</h1>
            <p class="role">${data.title || "Ton titre"}</p>
            ${contactHTML}
          </div>
        </div>
        <div class="content">
          <h2>Profil</h2>
          <p>${data.summary || "Ton profil apparaîtra ici."}</p>
          <h2>Expériences</h2>
          <ul>${expList || "<li class='muted'>Aucune expérience.</li>"}</ul>
          <h2>Formation</h2>
          <ul>${eduList || "<li class='muted'>Aucune formation.</li>"}</ul>
          <h2>Compétences</h2>
          <ul class="skills-inline">${skillsHTML}</ul>
        </div>`;
    } else {
      html = `
        <div class="hero">
          ${photoHTML}
          <div>
            <h1>${data.name || "Ton Nom"}</h1>
            <p class="role">${data.title || "Ton titre"}</p>
            ${contactHTML}
          </div>
        </div>
        <div class="body">
          <h2>Profil</h2>
          <p>${data.summary || "Ton profil apparaîtra ici."}</p>
          <h2>Expériences</h2>
          <ul>${expList || "<li class='muted'>Aucune expérience.</li>"}</ul>
          <h2>Formation</h2>
          <ul>${eduList || "<li class='muted'>Aucune formation.</li>"}</ul>
          <h2>Compétences</h2>
          <ul class="skills">${skillsHTML}</ul>
        </div>`;
    }

    const cv = document.getElementById("cv-preview");
    cv.className = "cv " + template;
    cv.innerHTML = html;
  }

  // ========== RENDU FACTURE ==========
  function renderFacture() {
    const articles = (Array.isArray(data.articles) ? data.articles : []).map(a => ({
      designation: a.designation || "",
      qte: a.qte || 0,
      pu: a.pu || 0,
      total: (a.qte || 0) * (a.pu || 0)
    }));

    const sousTotal = articles.reduce((s, a) => s + a.total, 0);
    const tvaPct = parseFloat(data.tva) || 0;
    const tvaMontant = sousTotal * tvaPct / 100;
    const transport = parseFloat(data.transport) || 0;
    const grandTotal = sousTotal + tvaMontant + transport;

    const rowsHTML = articles.map(a => `
      <tr>
        <td style="text-align:center;">${a.qte}</td>
        <td>${a.designation}</td>
        <td style="text-align:right;">${formatNumber(a.pu)} F</td>
        <td style="text-align:right;">${formatNumber(a.total)} F</td>
      </tr>
    `).join("");

    let html = "";

    if (template === "facture-modern") {
      html = `
        <div class="facture-header-modern">
          <div>
            <h1>FACTURE PRO FORMAT</h1>
            <p class="facture-num">N° ${data.numero || "—"}</p>
          </div>
          <div class="facture-expediteur">
            <strong>${data.exp_nom || "Votre entreprise"}</strong><br>
            ${data.exp_adresse || ""}<br>
            ${data.exp_email || ""}<br>
            ${data.exp_tel || ""}
          </div>
        </div>
        <div class="facture-body-modern">
          <div class="facture-infos">
            <div>
              <span class="label">Date d'émission</span>
              <strong>${data.date || "—"}</strong>
            </div>
            ${data.ship_date ? `<div><span class="label">Date d'expédition</span><strong>${data.ship_date}</strong></div>` : ""}
            ${data.tracking ? `<div><span class="label">N° de suivi</span><strong>${data.tracking}</strong></div>` : ""}
          </div>
          <div class="facture-dest">
            <h3>FACTURÉ À</h3>
            <strong>${data.dest_nom || "Client"}</strong><br>
            ${data.dest_adresse || ""}<br>
            ${data.dest_email || ""}<br>
            ${data.dest_tel || ""}
          </div>
          <table class="facture-table">
            <thead>
              <tr>
                <th style="width:60px;">QTÉ</th>
                <th>DÉSIGNATION</th>
                <th style="width:120px; text-align:right;">PRIX UNIT.</th>
                <th style="width:140px; text-align:right;">MONTANT</th>
              </tr>
            </thead>
            <tbody>${rowsHTML || "<tr><td colspan='4' style='text-align:center;color:#999;'>Aucun article</td></tr>"}</tbody>
          </table>
          <div class="facture-totaux">
            <div class="tot-line"><span>Sous-total HT</span><strong>${formatNumber(sousTotal)} F</strong></div>
            ${tvaPct > 0 ? `<div class="tot-line"><span>TVA (${tvaPct}%)</span><strong>${formatNumber(tvaMontant)} F</strong></div>` : ""}
            ${transport > 0 ? `<div class="tot-line"><span>Transport</span><strong>${formatNumber(transport)} F</strong></div>` : ""}
            <div class="tot-line grand"><span>TOTAL À PAYER</span><strong>${formatNumber(grandTotal)} FCFA</strong></div>
          </div>
          ${data.notes ? `<div class="facture-notes"><strong>Notes :</strong><br>${data.notes.replace(/\n/g, "<br>")}</div>` : ""}
        </div>`;
    } else {
      html = `
        <div class="facture-header">
          <div class="facture-logo">${data.exp_nom ? data.exp_nom[0].toUpperCase() : "V"}</div>
          <h1>${data.exp_nom || "Votre entreprise"}</h1>
          <p>${data.exp_adresse || ""}</p>
          <p>${data.exp_email || ""} ${data.exp_tel ? "· " + data.exp_tel : ""}</p>
          <div class="facture-badge">Proforma invoice</div>
        </div>
        <div class="facture-grid">
          <div>
            <p><strong>Date d'émission :</strong> ${data.date || "—"}</p>
            ${data.ship_date ? `<p><strong>Date d'expédition :</strong> ${data.ship_date}</p>` : ""}
          </div>
          <div>
            ${data.numero ? `<p><strong>N° facture :</strong> ${data.numero}</p>` : ""}
            ${data.tracking ? `<p><strong>N° de suivi :</strong> ${data.tracking}</p>` : ""}
          </div>
        </div>
        <div class="facture-parties">
          <div>
            <h3>EXPÉDITEUR</h3>
            <strong>${data.exp_nom || "—"}</strong><br>
            ${data.exp_adresse || ""}<br>
            ${data.exp_email || ""}<br>
            ${data.exp_tel || ""}
          </div>
          <div>
            <h3>DESTINATAIRE</h3>
            <strong>${data.dest_nom || "—"}</strong><br>
            ${data.dest_adresse || ""}<br>
            ${data.dest_email || ""}<br>
            ${data.dest_tel || ""}
          </div>
        </div>
        <table class="facture-table">
          <thead>
            <tr>
              <th style="width:60px;">QTÉ</th>
              <th>DÉSIGNATION</th>
              <th style="width:120px; text-align:right;">PRIX UNIT. (HT)</th>
              <th style="width:140px; text-align:right;">MONTANT (HT)</th>
            </tr>
          </thead>
          <tbody>${rowsHTML || "<tr><td colspan='4' style='text-align:center;color:#999;'>Aucun article</td></tr>"}</tbody>
        </table>
        <div class="facture-totaux">
          <div class="tot-line"><span>Sous-total HT</span><strong>${formatNumber(sousTotal)} F</strong></div>
          ${tvaPct > 0 ? `<div class="tot-line"><span>TVA (${tvaPct}%)</span><strong>${formatNumber(tvaMontant)} F</strong></div>` : ""}
          ${transport > 0 ? `<div class="tot-line"><span>Transport</span><strong>${formatNumber(transport)} F</strong></div>` : ""}
          <div class="tot-line grand"><span>TOTAL À PAYER</span><strong>${formatNumber(grandTotal)} FCFA</strong></div>
        </div>
        ${data.notes ? `<div class="facture-notes"><strong>Notes :</strong><br>${data.notes.replace(/\n/g, "<br>")}</div>` : ""}
        <div class="facture-signature">
          <p>Signature</p>
          <div class="sign-line"></div>
        </div>`;
    }

    const cv = document.getElementById("cv-preview");
    cv.className = "cv " + template;
    cv.innerHTML = html;
  }

  // ========== RENDU LETTRES ==========
  function renderLettre() {
    const d = data;
    const isModern = template === "lettre-moderne";
    const dateStr = d.date ? new Date(d.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";
    const lieu = d.lieu || "Cotonou";

    let corpsHTML = "";

    if (type === "lettre_motivation") {
      corpsHTML = `
        ${d.intro ? `<p>${d.intro.replace(/\n/g, "<br>")}</p>` : ""}
        ${d.parcours ? `<p>${d.parcours.replace(/\n/g, "<br>")}</p>` : ""}
        ${d.motivation ? `<p>${d.motivation.replace(/\n/g, "<br>")}</p>` : ""}
        <p>${d.conclusion || "Dans l'attente de votre réponse, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées."}</p>`;
    } else if (type === "lettre_demission") {
      corpsHTML = `
        <p>Par la présente, je vous informe de ma décision de démissionner de mon poste de <strong>${d.poste || "[poste]"}</strong> au service de <strong>${d.dest_entreprise || "[entreprise]"}</strong>, poste occupé depuis le <strong>${d.date_debut || "[date]"}</strong>.</p>
        <p>Je suis bien conscient(e) des termes de mon contrat de travail, qui prévoient un préavis de <strong>${d.preavis || "[durée]"}</strong>. Je quitterai donc mes fonctions à l'issue de ce préavis, et mon contrat prendra fin le <strong>${d.date_fin || "[date]"}</strong>.</p>
        <p>${d.conclusion || "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées."}</p>`;
    } else if (type === "lettre_commerciale") {
      corpsHTML = `
        ${d.intro ? `<p>${d.intro.replace(/\n/g, "<br>")}</p>` : ""}
        ${d.corps ? `<p>${d.corps.replace(/\n/g, "<br>")}</p>` : ""}
        <p>${d.conclusion || "Dans l'attente de votre retour, nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées."}</p>`;
    } else if (type === "lettre_service") {
      corpsHTML = `<p>${d.contenu ? d.contenu.replace(/\n/g, "<br>") : "..."}</p>`;
    } else if (type === "demande_stage") {
      corpsHTML = `
        ${d.intro ? `<p>${d.intro.replace(/\n/g, "<br>")}</p>` : ""}
        <p>Je suis actuellement en <strong>${d.niveau || "[niveau]"}</strong> dans le domaine de <strong>${d.domaine || "[domaine]"}</strong>. Je souhaite effectuer un stage d'une durée de <strong>${d.duree || "[durée]"}</strong> durant la période <strong>${d.periode || "[période]"}</strong>.</p>
        ${d.projet ? `<p>${d.projet.replace(/\n/g, "<br>")}</p>` : ""}
        <p>${d.conclusion || "Dans l'attente de votre réponse, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées."}</p>`;
    }

    const expNom = d.exp_nom || d.exp_entreprise || d.exp_service || "—";
    const expLignes = [d.exp_adresse || "", d.exp_tel || "", d.exp_email || ""].filter(Boolean).join("<br>");

    const destNom = d.dest_entreprise || d.dest_service || d.dest_responsable || "—";
    const destLignes = [
      d.dest_responsable && d.dest_entreprise ? d.dest_responsable : "",
      d.dest_adresse || ""
    ].filter(Boolean).join("<br>");

    const enTete = type === "lettre_service" && d.entete
      ? `<div class="lettre-entete">${d.entete}</div>` : "";

    const objetBlock = d.objet
      ? `<p class="lettre-objet"><strong>Objet :</strong> ${d.objet}${d.reference ? ` — Réf. ${d.reference}` : ""}</p>` : "";

    const refBlock = type === "lettre_service" && d.ref
      ? `<p><strong>Réf. :</strong> ${d.ref}</p>` : "";

    const html = `
      ${enTete}
      <div class="lettre-header">
        <div class="lettre-exp">
          <strong>${expNom}</strong><br>
          ${expLignes}
        </div>
        <div class="lettre-dest">
          <strong>${destNom}</strong><br>
          ${destLignes}
        </div>
      </div>
      <p class="lettre-lieu-date">${lieu}, le ${dateStr}</p>
      ${refBlock}
      ${objetBlock}
      <div class="lettre-corps">
        <p>Madame, Monsieur,</p>
        ${corpsHTML}
      </div>
      <div class="lettre-signature">
        <p><strong>${expNom}</strong></p>
        <div class="sign-line"></div>
      </div>
    `;

    const cv = document.getElementById("cv-preview");
    cv.className = "cv " + (isModern ? "lettre-moderne" : "lettre-classique");
    cv.innerHTML = html;
  }

  // ========== RENDU ATTESTATION ==========
  function renderAttestation() {
    const d = data;
    const dateStr = d.date_signature ? new Date(d.date_signature).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";
    const debutStr = d.date_debut ? new Date(d.date_debut).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";
    const finStr = d.date_fin ? new Date(d.date_fin).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "à ce jour";

    const html = `
      <div class="attestation-header">
        <h1>${d.entreprise || "NOM DE L'ENTREPRISE"}</h1>
        <p>${d.adresse || ""}</p>
        <p>${d.tel ? "Tél : " + d.tel : ""} ${d.email ? "· " + d.email : ""}</p>
      </div>
      <h2 class="attestation-title">ATTESTATION DE TRAVAIL</h2>
      <p class="attestation-text">
        Je soussigné(e), <strong>${d.signataire || "[nom]"}</strong>, <strong>${d.signataire_titre || "[fonction]"}</strong> de l'entreprise <strong>${d.entreprise || "[entreprise]"}</strong>, atteste par la présente que :
      </p>
      <p class="attestation-text">
        <strong>M./Mme ${d.employe_nom || "[nom]"}</strong> a été employé(e) au sein de notre structure en qualité de <strong>${d.employe_poste || "[poste]"}</strong>${d.type_contrat ? ` dans le cadre d'un contrat <strong>${d.type_contrat}</strong>` : ""}, du <strong>${debutStr}</strong> au <strong>${finStr}</strong>.
      </p>
      <p class="attestation-text">
        Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.
      </p>
      <div class="attestation-signature">
        <p>Fait à ${d.lieu || "[ville]"}, le ${dateStr}</p>
        <p><strong>${d.signataire || "[signataire]"}</strong></p>
        <p class="muted">${d.signataire_titre || ""}</p>
        <div class="sign-line"></div>
      </div>
    `;

    const cv = document.getElementById("cv-preview");
    cv.className = "cv attestation";
    cv.innerHTML = html;
  }

  // ========== RENDU REÇU ==========
  function renderRecu() {
    const d = data;
    const dateStr = d.date ? new Date(d.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";

    const html = `
      <div class="recu-header">
        <div>
          <h1>REÇU DE PAIEMENT</h1>
          <p>N° ${d.numero || "—"}</p>
        </div>
        <div class="recu-emetteur">
          <strong>${d.emetteur_nom || "—"}</strong><br>
          ${d.emetteur_adresse || ""}<br>
          ${d.emetteur_tel || ""}
        </div>
      </div>
      <div class="recu-grid">
        <div>
          <span class="label">Date</span>
          <strong>${dateStr}</strong>
        </div>
        <div>
          <span class="label">Reçu de</span>
          <strong>${d.payeur_nom || "—"}</strong><br>
          ${d.payeur_tel || ""}
        </div>
      </div>
      <div class="recu-montant">
        <span>Montant reçu</span>
        <strong>${formatNumber(d.montant)} FCFA</strong>
      </div>
      <div class="recu-motif">
        <span class="label">Motif</span>
        <p>${d.motif || "—"}</p>
      </div>
      <div class="recu-motif">
        <span class="label">Mode de paiement</span>
        <p>${d.mode || "—"}</p>
      </div>
      <div class="recu-signature">
        <p>Signature</p>
        <div class="sign-line"></div>
      </div>
    `;

    const cv = document.getElementById("cv-preview");
    cv.className = "cv recu";
    cv.innerHTML = html;
  }

  // ---------- 4. ÉVÉNEMENTS FORMULAIRE ----------
  document.querySelectorAll("[data-field]").forEach(el => {
    el.addEventListener("input", () => {
      data[el.dataset.field] = el.value;
      renderCV();
    });
  });

  document.getElementById("photo-input")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("photo", file);
    const res = await apiFetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) { alert("Erreur upload"); return; }
    const json = await res.json();
    photoUrl = json.url;
    updatePhotoPreview();
    renderCV();
  });

  function updatePhotoPreview() {
    const el = document.getElementById("photo-preview");
    if (!el) return;
    if (photoUrl) {
      el.innerHTML = `<img src="${photoUrl}" alt="photo">`;
      el.classList.add("has-image");
    }
  }

  // ---------- 5. ENREGISTRER ----------
  document.getElementById("save-btn").addEventListener("click", async () => {
    cvTitle = document.getElementById("cv-title").value.trim() || doc.label;
    const payload = { title: cvTitle, template, data, photo_url: photoUrl, type };

    let res;
    if (cvId) {
      res = await apiFetch(`/api/cvs/${cvId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } else {
      res = await apiFetch("/api/cvs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        cvId = json.id;
        history.replaceState(null, "", `/editor.html?id=${cvId}&type=${type}&template=${template}`);
      }
    }

    if (res.ok) {
      document.getElementById("cv-title-label").textContent = cvTitle;
      const btn = document.getElementById("save-btn");
      const old = btn.textContent;
      btn.textContent = "✅ Enregistré";
      setTimeout(() => btn.textContent = old, 1500);
    } else {
      alert("Erreur lors de l'enregistrement");
    }
  });

  // ---------- 6. PDF ----------
  function downloadPdf() {
    const name = data.name || data.dest_nom || data.employe_nom || data.payeur_nom || "document";
    html2pdf().set({
      margin: 0,
      filename: `${name}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    }).from(document.getElementById("cv-preview")).save();
  }

  // ---------- 7. PAIEMENT ----------
  const payBtn = document.getElementById("pay-and-download-btn");
  payBtn.textContent = `💳 Payer ${formatPrice(doc.price)}`;

  if (typeof openKkiapayWidget !== "function") {
    console.error("❌ KkiaPay n'est pas chargé.");
    payBtn.disabled = true;
    payBtn.textContent = "❌ KkiaPay indisponible";
  }

  payBtn.addEventListener("click", (e) => {
    e.preventDefault();
    console.log("🔵 Clic sur Payer — montant :", doc.price);

    if (typeof openKkiapayWidget !== "function") {
      alert("KkiaPay n'est pas chargé. Recharge la page (Ctrl+F5).");
      return;
    }

    try {
      openKkiapayWidget({
        amount: doc.price,
        key: "607a0ff0b36f11f1afcc89b165d02d7e",
        position: "center",
        theme: "#6c5ce7",
        sandbox: true
      });
    } catch (err) {
      console.error("❌ Erreur KkiaPay :", err);
      alert("Erreur lors de l'ouverture du paiement.");
    }
  });

  // ⚠️ UN SEUL écouteur success et UN SEUL failed (pas de doublon !)
  addKkiapayListener("success", (response) => {
    console.log("✅ Paiement réussi :", response);
    const transactionId = response.transactionId;

    fetch("/api/payment/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ transactionId })
    })
      .then(r => r.json())
      .then(resp => {
        if (resp.success) {
          alert("✅ Paiement confirmé ! Téléchargement...");
          downloadPdf();
        } else {
          alert("❌ Paiement non vérifié : " + resp.error);
        }
      })
      .catch(() => alert("Erreur de vérification."));
  });

  addKkiapayListener("failed", (error) => {
    console.error("❌ Paiement échoué :", error);
    alert("Le paiement a échoué. Réessaie.");
  });

  // ---------- 8. Premier rendu ----------
  renderCV();
})();