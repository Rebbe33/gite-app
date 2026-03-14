# Gestion Gîtes — v2

Application React + Supabase pour gérer le ménage, le planning et les stocks de plusieurs gîtes.

## Fonctionnalités

- **Multi-gîtes** — chaque gîte a sa propre liste de tâches, importée depuis Excel
- **Tâches par fréquence** — seules les tâches dues apparaissent au prochain passage
- **Vue "Toutes les tâches"** — cochez en avance les tâches pas encore dues
- **Planning** — calendrier des réservations par gîte
- **Stocks** — suivi des quantités avec alertes seuil bas
- **Notes** — bloc-notes par gîte
- **Synchronisation temps réel** — Supabase sync automatique entre tous vos appareils

---

## 1. Configuration Supabase

### Créer les tables

1. Aller sur [supabase.com](https://supabase.com) → votre projet
2. **SQL Editor** → **New Query**
3. Coller le contenu de `supabase_schema.sql`
4. Cliquer **Run**

### Récupérer les clés API

1. **Settings** → **API**
2. Copier **Project URL** et **anon public key**

---

## 2. Configurer le projet local

Créer un fichier `.env` à la racine du projet :

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxx...
```

Installer les dépendances et lancer :

```bash
npm install
npm run dev
```

Ouvre [http://localhost:5173](http://localhost:5173)

---

## 3. Déployer sur GitHub + Vercel

### GitHub

```bash
git add .
git commit -m "v2 — Supabase + multi-gîtes"
git push
```

### Vercel

1. Aller sur [vercel.com](https://vercel.com) → votre projet → **Settings** → **Environment Variables**
2. Ajouter les deux variables :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Deployments** → **Redeploy**

> ⚠️ Ne jamais committer le fichier `.env` — il est dans `.gitignore`

---

## 4. Utilisation

### Ajouter un gîte

Cliquer **+ Gîte** → saisir le nom → importer un fichier Excel (optionnel) → Créer.

### Format du fichier Excel

Le fichier doit avoir une feuille avec ces colonnes (noms flexibles) :

| Zone | Element | Tâche | Fréquence (passages) |
|------|---------|-------|----------------------|
| Cuisine | Comptoir | Nettoyer et désinfecter | 1 |
| Salon | Canapé | Aspirer rapide | 1 |
| Cuisine | Micro-ondes | Nettoyage complet | 3 |

La fréquence est le **nombre de passages** entre chaque exécution de la tâche.

### Gérer un passage

1. Aller sur **Ménage** — les tâches dues au prochain passage sont affichées
2. Cocher les tâches effectuées
3. Pour voir toutes les tâches (y compris non dues) → basculer sur **Toutes**
4. Cliquer **Clôturer le passage** en bas — le compteur s'incrémente

### Modifier les tâches

- Icône ✏️ sur chaque tâche pour modifier
- Icône 🗑️ pour supprimer
- Bouton **+** dans la barre d'outils pour ajouter manuellement
- Bouton 📤 pour réimporter depuis Excel (remplace toutes les tâches)

---

## Structure du projet

```
src/
  hooks/
    useGites.js        — CRUD gîtes + realtime
    useTasks.js        — tâches, passages, logs + realtime
    useReservations.js — réservations + realtime
    useStocks.js       — stocks + realtime
  lib/
    supabase.js        — client Supabase
    excel.js           — parsing fichier Excel
  pages/
    Planning.jsx       — calendrier + réservations
    Menage.jsx         — checklist avec filtres et modes
    Stocks.jsx         — gestion stocks
    Notes.jsx          — notes par gîte
  App.jsx              — shell, navigation, multi-gîtes
  index.css            — styles globaux
  main.jsx             — point d'entrée
supabase_schema.sql    — script SQL à exécuter dans Supabase
```
