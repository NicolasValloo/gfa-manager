# 🍇 GFA Manager — Groupements Fonciers Viticoles

Outil de gestion des groupements fonciers viticoles avec commandes annuelles de vin.

## Fonctionnalités

- **Vignerons** — Gestion des vignerons exploitant les terres
- **Vins** — Catalogue des vins par vigneron (bulles, blanc, rosé, rouge)
- **Associés** — Membres des groupements fonciers
- **Groupements** — GFA avec parts, associés et équivalence en bouteilles/€
- **Campagnes** — Lancement de commandes annuelles avec :
  - Tarifs spécifiques par campagne
  - Liens de commande temporaires par associé (token)
  - Suivi des statuts (en attente / relancé / commandé)
  - Envoi de mails aux associés

## Mise en ligne (GitHub Pages)

### 1. Préparer Firebase

1. Allez sur [console.firebase.google.com](https://console.firebase.google.com)
2. Sélectionnez votre projet `gfa-manager-50a7f`

#### Activer l'authentification :
3. **Authentication** → **Sign-in method** → Activer **Email/Mot de passe**
4. **Authentication** → **Users** → **Add user** → Créez votre compte admin

#### Configurer Firestore :
5. **Firestore Database** → Créer la base (choisir `eur3` pour l'Europe)
6. **Rules** → Collez le contenu de `firestore.rules` → **Publish**

### 2. Déployer sur GitHub Pages

```bash
# Créer le repo
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/VOTRE-USER/gfa-manager.git
git push -u origin main
```

Puis dans GitHub :
1. **Settings** → **Pages**
2. Source : **Deploy from a branch**
3. Branch : `main` / `/ (root)`
4. Save

Votre site sera accessible à : `https://VOTRE-USER.github.io/gfa-manager/`

### 3. Configurer le domaine autorisé

Dans la console Firebase :
1. **Authentication** → **Settings** → **Authorized domains**
2. Ajoutez `VOTRE-USER.github.io`

## Structure des fichiers

```
├── index.html          # Page principale (admin + commande associé)
├── style.css           # Styles
├── app.js              # Application Firebase (module ES)
├── firestore.rules     # Règles de sécurité Firestore
└── README.md
```

## Flux de commande

1. **Admin** crée vignerons, vins, associés, groupements
2. **Admin** lance une campagne → choisit un vigneron, ajuste les prix
3. Le système génère un **lien unique temporaire** pour chaque associé
4. **Admin** envoie les mails (via client mail local)
5. **Associé** clique sur son lien → voit son budget → commande ses vins
6. L'admin suit l'avancement dans le tableau de bord

## Sécurité

- **Admin** : authentification Firebase Email/Mot de passe
- **Associés** : accès par token unique avec date d'expiration (pas de compte nécessaire)
- **Données** : stockées dans Firestore (base NoSQL Google Cloud)
