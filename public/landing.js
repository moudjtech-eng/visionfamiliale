// Stocke l'offre choisie quand on clique sur une carte service
// → utilisée plus tard pour rediriger après inscription

document.querySelectorAll(".service-card").forEach(card => {
  card.addEventListener("click", () => {
    const href = card.getAttribute("href");
    const next = new URL(href, location.origin).searchParams.get("next");
    if (next) {
      localStorage.setItem("next-action", next);
    }
  });
});

// Défilement fluide pour les ancres (#services, #how...)
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", (e) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

// Si l'utilisateur est déjà connecté, on remplace "S'inscrire" par "Dashboard"
if (localStorage.getItem("token")) {
  const actions = document.querySelector(".header-actions");
  if (actions) {
    actions.innerHTML = `
      <a href="/dashboard.html" class="btn">📊 Mon dashboard</a>
    `;
  }
}