# Atelier Mode — Gestion de Boutique de Prêt-à-Porter

Application web complète de gestion d'une boutique de vêtements (prêt-à-porter, chaussures, accessoires), construite en **React 18 + TypeScript + Vite**. L'application fonctionne **entièrement en mémoire** : aucune base de données, aucun `localStorage`. Chaque écran est alimenté au démarrage par un jeu de données constant riche (`src/data/seedData.ts`), idéal pour la démonstration et les tests. Interface bilingue **Français / Arabe (RTL)**, palette « encre · laiton · camel sur pierre chaude », animations Framer Motion partout.

## Démarrage

```bash
npm install
npm run dev      # http://localhost:5173
```

Autres scripts :

```bash
npm run build      # build de production (tsc + vite)
npm run preview    # prévisualiser le build
npm run typecheck  # vérification des types
```

## Connexion

- **Accès Démo Admin** — l'écran de connexion affiche les comptes de démonstration ; un clic suffit pour se connecter.
- Identifiants démo : `admin` / `demo2024` (ou `admin@atelier-mode.com`).
- Compte vendeuse : `yasmine` / `yasmine123` (permissions restreintes).
- Vous pouvez aussi créer un compte Admin depuis l'écran de connexion.

> ℹ️ Les données vivant en mémoire, un **rechargement complet de la page réinitialise l'état** et renvoie à l'écran de connexion — c'est le comportement attendu d'un mode démo sans base de données. La navigation dans l'application (barre latérale) conserve l'état.

## Modules

Dashboard · Gestion de Stock · Achats · Point de Vente (POS) · Ventes · Clients · Fournisseurs · Employés · Dépenses · Caisse · Rapports · Paramètres.

### Tailles (spécifique vêtements)

- Chaque article appartient à une **catégorie de taille** : Lettres (S/M/L), Chiffres (36-48), Chaussures, Enfants, Taille unique ou Sur mesure.
- À la création d'un article, on **sélectionne les tailles** proposées et on saisit le **stock par taille** ; on peut aussi **créer une nouvelle taille** à la volée (elle devient réutilisable partout).
- Un article porte également : **couleur**, **matière**, **genre** (femme/homme/enfant/unisexe), **saison** et **collection** — toutes ces listes sont extensibles.
- Le **POS** demande la taille avant d'ajouter au panier ; l'**achat** réceptionne le stock taille par taille ; la **vente** décrémente la taille exacte.
- Les **tailles manquantes** (une taille en rupture alors que l'article reste vendable) sont signalées sur la carte de stock, le tableau de bord et la cloche de notifications.

### Rapports

Analyse financière sur la période choisie (raccourcis : ce mois, mois dernier, 30 derniers jours, ce trimestre), **analyse par taille** et **par catégorie de taille** (graphiques à double axe unités/CA), ventes **par genre** et **par saison**, meilleures ventes / rotation lente, marge brute et taux de marge, trésorerie, dettes clients & fournisseurs, alertes de stock. Impression A4 avec en-tête du magasin.

Chaque action met à jour l'état global (Zustand) et se reflète immédiatement dans toutes les vues liées.

## Stack

React Router v6 · Zustand (en mémoire, sans persistance) · React Hook Form + Zod · Recharts · Framer Motion · date-fns · lucide-react · react-hot-toast · JsBarcode · react-to-print · TailwindCSS.

## Structure

```
src/
├── i18n/          traductions FR/AR + hook useTranslation
├── store/         stores Zustand (auth, products, purchases, sales, ...) — seedés au boot
├── data/          seedData.ts — jeu de données constant de démonstration
├── types/         interfaces TypeScript (Product, tailles, ...)
├── components/    layout (sidebar, header) + ui (icônes, boutons) + shared (barcode, size picker, print)
├── pages/         une page par module de la sidebar
└── utils/         calculs financiers & analyses par taille, animations, helpers, export/import
```

## Notes

- **Sauvegarde / Restauration** : Paramètres → Données (export/import JSON). L'import écrit directement dans les stores en mémoire.
- **Impression** : factures d'achat / vente (avec colonne Taille) et rapports au format A4 avec en-tête du magasin (NIF/NIS/RC).
- **Codes-barres** : génération EAN-13 + impression depuis la fiche article.
- Les données seed sont calculées en dates relatives à aujourd'hui pour que le tableau de bord soit toujours peuplé.
- Pour repartir des données de démonstration : **rechargez la page**.
