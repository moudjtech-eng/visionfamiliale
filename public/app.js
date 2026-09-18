// Quand on clique sur un bouton "Utiliser ce modèle"
document.querySelectorAll(".btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const template = btn.dataset.template;
    localStorage.setItem("cv-template", template);
    window.location.href = "editor.html";
  });
});