# BONPRIX — Suivi Expéditions v2.0
## Déploiement cloud avec authentification

---

## 🚀 Déploiement sur Render.com (gratuit, accessible partout)

### Étape 1 — Préparer le code sur GitHub
1. Créer un compte sur **github.com** (gratuit)
2. Créer un nouveau dépôt : `bonprix-suivi`
3. Uploader tous les fichiers de ce dossier

### Étape 2 — Déployer sur Render
1. Créer un compte sur **render.com** (gratuit)
2. Cliquer **"New" → "Web Service"**
3. Connecter votre dépôt GitHub
4. Configurer :
   - **Name** : `bonprix-suivi`
   - **Runtime** : `Node`
   - **Build Command** : `npm install`
   - **Start Command** : `node server.js`
5. Ajouter une variable d'environnement :
   - `JWT_SECRET` = (une chaîne secrète longue, ex: `BonPrix@2026#SecretKey!`)
6. Cliquer **"Create Web Service"**

Votre application sera disponible sur :
`https://bonprix-suivi.onrender.com`

---

## 👤 Comptes par défaut

| Identifiant  | Mot de passe  | Rôle         | Droits                        |
|--------------|---------------|--------------|-------------------------------|
| admin        | bonprix2026   | Admin        | Tout faire + gérer les users  |
| superviseur  | superv2026    | Superviseur  | Modifier et valider           |
| consultation | consult2026   | Consultation | Lecture seule                 |

⚠️ **Changer les mots de passe dès la première connexion !**
Via l'onglet "Administration" → "Changer mon mot de passe"

---

## 🔒 Sécurité

- Mots de passe chiffrés avec **bcrypt** (irréversible)
- Sessions par **JWT** (expire après 12h)
- Rôles : `admin` > `superviseur` > `consultation`
- Les utilisateurs `consultation` ne peuvent pas modifier les données

---

## 📁 Structure des fichiers

```
bonprix-cloud/
├── server.js          ← Serveur Express + Auth + API
├── package.json       ← Dépendances Node.js
├── db.json            ← Utilisateurs (créé automatiquement)
├── data.json          ← Données expéditions (créé automatiquement)
├── public/
│   ├── index.html     ← Page de connexion
│   └── app.html       ← Application principale
└── README.md          ← Ce fichier
```

---

## 🏃 Test en local avant déploiement

```bash
npm install
node server.js
```
Ouvrir : http://localhost:3000

---

## 🔄 Mise à jour des données

Les données sont dans `data.json`. En cas de changement de mois, 
modifier le fichier `app.html` (section PLAN et JOURS) et redéployer.
