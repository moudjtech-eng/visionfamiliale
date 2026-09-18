/**
 * VisionFamiliale — Schéma des documents
 * Ajouter un type = ajouter un bloc ici. Tout s'adapte automatiquement.
 */

const DOCUMENTS = {

  /* ==================== CV ==================== */
  cv: {
    label: "Curriculum Vitae",
    icon: "📄",
    price: 500,
    description: "CV professionnel avec photo, expériences et compétences",
    templates: [
      { id: "modern",   name: "Moderne",   desc: "Barre latérale colorée, idéal pour les profils créatifs." },
      { id: "classic",  name: "Classique", desc: "Sobre et professionnel, parfait pour les candidatures sérieuses." },
      { id: "creative", name: "Créatif",   desc: "Titres marqués et couleurs vives, pour se démarquer." }
    ],
    fields: [
      { key: "photo",       type: "file",     label: "Photo de profil" },
      { key: "name",        type: "text",     label: "Nom complet",      placeholder: "Jean DUPONT" },
      { key: "title",       type: "text",     label: "Titre / Poste",    placeholder: "Développeur Web" },
      { key: "email",       type: "email",    label: "Email",            placeholder: "jean@mail.com" },
      { key: "phone",       type: "tel",      label: "Téléphone",        placeholder: "+229 XX XX XX XX" },
      { key: "address",     type: "text",     label: "Ville, Pays",      placeholder: "Cotonou, Bénin" },
      { key: "website",     type: "url",      label: "LinkedIn / Site",  placeholder: "linkedin.com/in/..." },
      { key: "summary",     type: "textarea", label: "Profil",           placeholder: "Décris-toi en 2-3 phrases..." },
      { key: "experiences", type: "textarea", label: "Expériences (Poste | Entreprise | Années)", placeholder: "Développeur | Google | 2020-2023" },
      { key: "education",   type: "textarea", label: "Formation (Diplôme | École | Année)",      placeholder: "Master Info | Université Paris | 2020" },
      { key: "skills",      type: "text",     label: "Compétences (virgules)", placeholder: "JavaScript, React, Node.js" }
    ]
  },

  /* ==================== FACTURE PRO FORMAT ==================== */
  facture: {
    label: "Facture Pro Format",
    icon: "🧾",
    price: 500,
    description: "Facture commerciale avec articles et calculs automatiques",
    templates: [
      { id: "facture-classic", name: "Standard",  desc: "Mise en page classique avec totaux automatiques." },
      { id: "facture-modern",  name: "Moderne",   desc: "Design épuré avec bandeau coloré." }
    ],
    fields: [
      { key: "numero",     type: "text", label: "Numéro de facture", placeholder: "FAC-2026-001" },
      { key: "date",       type: "date", label: "Date d'émission" },
      { key: "ship_date",  type: "date", label: "Date d'expédition (optionnel)" },
      { key: "tracking",   type: "text", label: "N° de suivi (optionnel)" },

      { key: "exp_nom",     type: "text", label: "Expéditeur — Nom / Entreprise", placeholder: "Ma Société SARL" },
      { key: "exp_adresse", type: "text", label: "Expéditeur — Adresse" },
      { key: "exp_email",   type: "email",label: "Expéditeur — Email" },
      { key: "exp_tel",     type: "tel",  label: "Expéditeur — Téléphone" },

      { key: "dest_nom",     type: "text", label: "Destinataire — Nom / Entreprise" },
      { key: "dest_adresse", type: "text", label: "Destinataire — Adresse" },
      { key: "dest_email",   type: "email",label: "Destinataire — Email" },
      { key: "dest_tel",     type: "tel",  label: "Destinataire — Téléphone" },

      { key: "articles", type: "articles",
        label: "Articles (Désignation | Quantité | Prix unitaire — un par ligne)",
        placeholder: "Ordinateur portable | 1 | 350000\nSouris sans fil | 2 | 5000",
        required: true },

      { key: "tva",   type: "number", label: "TVA (%)", placeholder: "18" },
      { key: "transport", type: "number", label: "Frais de transport (FCFA)", placeholder: "0" },
      { key: "notes", type: "textarea", label: "Notes / Conditions", placeholder: "Validité : 30 jours" }
    ]
  },

  /* ==================== LETTRE DE MOTIVATION ==================== */
  lettre_motivation: {
    label: "Lettre de motivation",
    icon: "✉️",
    price: 300,
    description: "Lettre structurée pour candidature à un emploi",
    templates: [
      { id: "lettre-classique", name: "Classique", desc: "Présentation formelle, sobre et élégante." },
      { id: "lettre-moderne",   name: "Moderne",   desc: "Avec bandeau bleu et zones structurées." }
    ],
    fields: [
      { key: "exp_nom",     type: "text", label: "Votre nom complet" },
      { key: "exp_adresse", type: "text", label: "Votre adresse" },
      { key: "exp_tel",     type: "tel",  label: "Votre téléphone" },
      { key: "exp_email",   type: "email",label: "Votre email" },

      { key: "dest_entreprise", type: "text", label: "Entreprise destinataire" },
      { key: "dest_destinataire", type: "text", label: "Nom du destinataire (optionnel)" },
      { key: "dest_adresse", type: "text", label: "Adresse du destinataire" },

      { key: "lieu", type: "text", label: "Fait à (ville)", placeholder: "Cotonou" },
      { key: "date", type: "date", label: "Date" },
      { key: "objet", type: "text", label: "Objet", placeholder: "Candidature au poste de ..." },
      { key: "reference", type: "text", label: "Référence (optionnel)" },

      { key: "intro", type: "textarea", label: "Paragraphe d'introduction",
        placeholder: "Je vous adresse ma candidature au poste de ..." },
      { key: "parcours", type: "textarea", label: "Votre parcours / expériences",
        placeholder: "Mon expérience dans le domaine de ... m'a permis de ..." },
      { key: "motivation", type: "textarea", label: "Vos motivations",
        placeholder: "Votre offre correspond à mon projet professionnel car ..." },
      { key: "conclusion", type: "textarea", label: "Phrase de conclusion (optionnel)",
        placeholder: "Dans l'attente de votre retour, je reste à votre disposition..." }
    ]
  },

  /* ==================== LETTRE DE DÉMISSION ==================== */
  lettre_demission: {
    label: "Lettre de démission",
    icon: "📤",
    price: 300,
    description: "Lettre formelle pour quitter un emploi proprement",
    templates: [
      { id: "demission-classique", name: "Classique", desc: "Formelle, sobre, dans les règles." }
    ],
    fields: [
      { key: "exp_nom",     type: "text", label: "Votre nom complet" },
      { key: "exp_adresse", type: "text", label: "Votre adresse complète (avec code postal / ville)" },

      { key: "dest_entreprise",   type: "text", label: "Nom de l'employeur" },
      { key: "dest_responsable",  type: "text", label: "Nom du responsable" },
      { key: "dest_adresse",      type: "text", label: "Adresse de l'employeur" },

      { key: "lieu", type: "text", label: "Fait à (ville)" },
      { key: "date", type: "date", label: "Date" },

      { key: "poste",       type: "text", label: "Votre poste actuel" },
      { key: "date_debut",  type: "date", label: "Date de début du contrat" },
      { key: "preavis",     type: "text", label: "Durée de préavis", placeholder: "3 mois" },
      { key: "date_fin",    type: "date", label: "Date de fin souhaitée" },

      { key: "conclusion", type: "textarea", label: "Message complémentaire (optionnel)",
        placeholder: "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées." }
    ]
  },

  /* ==================== LETTRE COMMERCIALE ==================== */
  lettre_commerciale: {
    label: "Lettre commerciale",
    icon: "💼",
    price: 400,
    description: "Prospection, partenariat ou relance client",
    templates: [
      { id: "lettre-classique", name: "Classique", desc: "Présentation formelle standard." },
      { id: "lettre-moderne",   name: "Moderne",   desc: "Avec bandeau coloré et zones pro." }
    ],
    fields: [
      { key: "exp_entreprise", type: "text", label: "Votre entreprise" },
      { key: "exp_adresse",    type: "text", label: "Votre adresse" },
      { key: "exp_tel",        type: "tel",  label: "Votre téléphone" },
      { key: "exp_email",      type: "email",label: "Votre email" },
      { key: "exp_siret",      type: "text", label: "RCCM / IFU (optionnel)" },

      { key: "dest_entreprise", type: "text", label: "Entreprise destinataire" },
      { key: "dest_adresse",    type: "text", label: "Adresse destinataire" },

      { key: "lieu", type: "text", label: "Fait à (ville)" },
      { key: "date", type: "date", label: "Date" },
      { key: "objet", type: "text", label: "Objet", placeholder: "Proposition de partenariat commercial" },
      { key: "reference", type: "text", label: "Référence (optionnel)" },

      { key: "intro", type: "textarea", label: "Introduction",
        placeholder: "Nous avons l'honneur de vous adresser..." },
      { key: "corps", type: "textarea", label: "Corps de la lettre",
        placeholder: "Notre société propose des solutions adaptées à..." },
      { key: "conclusion", type: "textarea", label: "Conclusion et formule de politesse",
        placeholder: "Dans l'attente de votre retour, nous vous prions d'agréer..." }
    ]
  },

  /* ==================== LETTRE ENTRE SERVICES ==================== */
  lettre_service: {
    label: "Lettre entre services",
    icon: "📨",
    price: 300,
    description: "Communication interne formelle entre services",
    templates: [
      { id: "lettre-service", name: "Note de service", desc: "Présentation administrative interne." }
    ],
    fields: [
      { key: "entete", type: "text", label: "En-tête (ex: MA SOCIÉTÉ SARL)", placeholder: "MA SOCIÉTÉ SARL" },

      { key: "exp_service",     type: "text", label: "Service émetteur",     placeholder: "Service Comptabilité" },
      { key: "exp_responsable", type: "text", label: "Responsable émetteur" },

      { key: "dest_service",     type: "text", label: "Service destinataire", placeholder: "Service RH" },
      { key: "dest_responsable", type: "text", label: "Responsable destinataire" },

      { key: "lieu", type: "text", label: "Fait à (ville)" },
      { key: "date", type: "date", label: "Date" },
      { key: "ref",  type: "text", label: "Référence", placeholder: "REF-2026-012" },
      { key: "objet", type: "text", label: "Objet", placeholder: "Demande de congé annuel" },

      { key: "contenu", type: "textarea", label: "Message",
        placeholder: "Monsieur,\n\nJ'ai l'honneur de solliciter..." }
    ]
  },

  /* ==================== DEMANDE DE STAGE ==================== */
  demande_stage: {
    label: "Demande de stage",
    icon: "🎓",
    price: 300,
    description: "Candidature pour un stage académique ou professionnel",
    templates: [
      { id: "lettre-classique", name: "Classique", desc: "Présentation formelle standard." }
    ],
    fields: [
      { key: "exp_nom",     type: "text", label: "Votre nom complet" },
      { key: "exp_adresse", type: "text", label: "Votre adresse" },
      { key: "exp_tel",     type: "tel",  label: "Votre téléphone" },
      { key: "exp_email",   type: "email",label: "Votre email" },

      { key: "dest_entreprise", type: "text", label: "Entreprise visée" },
      { key: "dest_adresse",    type: "text", label: "Adresse de l'entreprise" },

      { key: "lieu", type: "text", label: "Fait à (ville)" },
      { key: "date", type: "date", label: "Date" },
      { key: "domaine", type: "text", label: "Domaine / Spécialité" },
      { key: "niveau", type: "text", label: "Niveau d'études", placeholder: "Licence 3" },
      { key: "duree", type: "text", label: "Durée souhaitée", placeholder: "3 mois" },
      { key: "periode", type: "text", label: "Période souhaitée", placeholder: "Juin - Août 2026" },

      { key: "intro", type: "textarea", label: "Introduction",
        placeholder: "Actuellement étudiant(e) en ..." },
      { key: "projet", type: "textarea", label: "Votre projet / objectifs",
        placeholder: "Ce stage me permettrait de ..." },
      { key: "conclusion", type: "textarea", label: "Formule de politesse",
        placeholder: "Dans l'attente de votre réponse, je vous prie d'agréer..." }
    ]
  },

  /* ==================== ATTESTATION DE TRAVAIL ==================== */
  attestation: {
    label: "Attestation de travail",
    icon: "📜",
    price: 300,
    description: "Document officiel attestant d'une expérience professionnelle",
    templates: [
      { id: "attestation-officielle", name: "Officielle", desc: "Mise en page administrative officielle." }
    ],
    fields: [
      { key: "entreprise",  type: "text", label: "Nom de l'entreprise" },
      { key: "adresse",     type: "text", label: "Adresse de l'entreprise" },
      { key: "tel",         type: "tel",  label: "Téléphone de l'entreprise" },
      { key: "email",       type: "email",label: "Email de l'entreprise" },
      { key: "logo_note",   type: "text", label: "Mention en-tête (optionnel)" },

      { key: "employe_nom",   type: "text", label: "Nom complet de l'employé" },
      { key: "employe_poste", type: "text", label: "Poste occupé" },
      { key: "date_debut",    type: "date", label: "Date de début" },
      { key: "date_fin",      type: "date", label: "Date de fin (vide si en cours)" },
      { key: "type_contrat",  type: "text", label: "Type de contrat", placeholder: "CDI / CDD / Stage" },

      { key: "lieu", type: "text", label: "Fait à (ville)" },
      { key: "date_signature", type: "date", label: "Date de signature" },
      { key: "signataire",       type: "text", label: "Nom du signataire" },
      { key: "signataire_titre", type: "text", label: "Fonction du signataire", placeholder: "Directeur Général" }
    ]
  },

  /* ==================== REÇU DE PAIEMENT ==================== */
  recu: {
    label: "Reçu de paiement",
    icon: "🧮",
    price: 200,
    description: "Justificatif de paiement simple et clair",
    templates: [
      { id: "recu-classic", name: "Standard", desc: "Simple, efficace, avec totaux." }
    ],
    fields: [
      { key: "numero", type: "text", label: "Numéro de reçu", placeholder: "REC-2026-001" },
      { key: "date",   type: "date", label: "Date" },

      { key: "emetteur_nom",     type: "text", label: "Reçu émis par (nom / entreprise)" },
      { key: "emetteur_adresse", type: "text", label: "Adresse émetteur" },
      { key: "emetteur_tel",     type: "tel",  label: "Téléphone émetteur" },

      { key: "payeur_nom",   type: "text", label: "Nom du payeur" },
      { key: "payeur_tel",   type: "tel",  label: "Téléphone du payeur" },

      { key: "montant", type: "number", label: "Montant (FCFA)", placeholder: "50000" },
      { key: "motif",   type: "text",   label: "Motif du paiement", placeholder: "Achat de marchandises" },
      { key: "mode",    type: "text",   label: "Mode de paiement", placeholder: "Espèces / MTN / Moov" }
    ]
  }

};

// Helpers
function getDocument(type) {
  return DOCUMENTS[type] || null;
}

function formatPrice(price) {
  return price.toLocaleString("fr-FR") + " FCFA";
}

function formatNumber(n) {
  return (Number(n) || 0).toLocaleString("fr-FR");
}