# Boutique — gestion & boutique en ligne

Application de gestion pour une boutique de prêt-à-porter, doublée d'une
boutique en ligne publique. Un seul projet React, deux faces : le back-office
(`/dashboard`, …) et la vitrine (`/shop`).

Design monochrome noir/blanc, typographie display en capitales, angles vifs,
mode sombre complet. Interface bilingue **français / arabe** avec RTL.

---

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5177
```

Autres scripts : `npm run build`, `npm run preview`, `npm run typecheck`.

Au premier lancement, la page de connexion propose **Créer un compte
administrateur**. Le bouton disparaît définitivement dès que ce compte existe.

---

## Le back-office

| Module | Ce qu'il fait |
|--------|---------------|
| Tableau de bord | Chiffres du jour et du mois, alertes |
| Gestion de stock | Articles, tailles, codes-barres, photos |
| Achats | Réception fournisseur, paiements échelonnés |
| Point de vente | Caisse comptoir |
| Ventes | Registre des ventes, encaissements |
| Clients / Fournisseurs | Fiches et soldes |
| Employés | Fiches, salaires, avances, absences, **permissions** |
| Dépenses / Caisse | Trésorerie |
| **Site Web** | Pilotage complet de la boutique en ligne (5 onglets) |
| **Commandes Web** | Traitement des commandes du site |
| Rapports | Analyse boutique **et** canal en ligne |
| Paramètres | Identité du magasin, sauvegarde / restauration |

### Site Web — les cinq onglets

1. **Articles en ligne** — chaque article du stock en carte : publier / masquer,
   copier le lien de commande, voir la fiche, modifier (même formulaire que la
   gestion de stock, photos comprises).
2. **Offres spéciales** — recherche multi-articles, quantité et nouveau prix par
   article, remise calculée en montant **et** en pourcentage, titre,
   description, visuel, période de validité, activation. Les offres créées
   s'affichent en cartes avec compte à rebours.
3. **Livraison** — sociétés de livraison, puis grille tarifaire couvrant les
   **58 wilayas et 1 541 communes** : prix domicile et stop-desk par commune,
   avec un raccourci « appliquer à toutes les communes de la wilaya ».
4. **Contacts** — Facebook, Instagram, TikTok, Snapchat, WhatsApp, deux
   téléphones, e-mail, lien Google Maps.
5. **Paramètres du site** — favicon, image de fond de la page d'accueil,
   accroche, description, seuil de livraison offerte, avec aperçu en direct.

### Commandes Web — le cycle de vie

```
en attente ──accepter──▶ acceptée ──livrer──▶ livrée ──encaisser──▶ encaissée
     │                       │                   │
     └───────annuler─────────┘                   └──retour──▶ retournée
```

- **Livrer** demande la société de livraison, puis **sort les articles du stock**.
- **Retour** les **remet en stock**.
- **Encaisser** demande confirmation puis **enregistre le montant dans la caisse**.
- Une commande annulée peut être **réactivée**.

Filtres par statut avec compteurs, recherche par nom ou téléphone, et un badge
d'alerte sur la barre latérale pour les commandes en attente.

---

## La boutique en ligne — `/shop`

- **Accueil** — hero plein écran animé (nom, logo, description, image de fond),
  offres en cours et articles à la une.
- **Boutique** — grille de cartes compactes : **4 articles par écran sur mobile**,
  recherche, tri, filtre par catégorie.
- **Fiche article** — galerie, choix de la taille, quantité, panier ou commande
  directe, articles similaires.
- **Offres** — cartes avec **compte à rebours animé** jusqu'à la fin de l'offre.
- **Panier** — quantités et tailles modifiables.
- **Commande** — nom, téléphone, wilaya puis commune de cette wilaya. La
  livraison **à domicile** est présélectionnée avec le nom du transporteur ; le
  stop-desk reste disponible. Le total se recalcule en direct.
- **Merci** — page de confirmation animée avec logo, nom, description et
  récapitulatif complet.

---

## Données

L'application est **locale d'abord** : chaque écran lit et écrit une base
IndexedDB sur l'appareil, donc la boutique fonctionne sans réseau.

`supabase/` contient le schéma complet destiné au backend partagé — 36 tables,
les fonctions du cycle de vie des commandes, la sécurité au niveau des lignes,
les buckets d'images et les 58 wilayas avec leurs communes. Voir
[`supabase/README.md`](supabase/README.md) pour l'ordre d'exécution.

L'authentification est déjà branchée : la connexion tente Supabase en premier et
retombe sur les comptes locaux si le projet est injoignable.

### Configuration

`.env` à la racine :

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
```

> La clé `anon` est conçue pour être publiée dans le bundle navigateur ; c'est la
> sécurité au niveau des lignes qui protège les données, pas le secret de la clé.
> Ne mettez **jamais** la clé `service_role` ici.

---

## Permissions

L'administrateur coche, pour chaque employé, les modules autorisés et les
actions permises dans chacun (`voir`, `créer`, `modifier`, `supprimer`,
`imprimer`, `payer`). La barre latérale, les pages et les boutons d'action se
plient à cette matrice, et le schéma SQL l'applique une seconde fois côté base
via `has_permission(module, action)`.

---

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · Zustand (+ IndexedDB) ·
React Router · Framer Motion · Emotion · Recharts · react-hook-form + Zod ·
Supabase.
