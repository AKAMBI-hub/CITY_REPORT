# CityReport PWA — Signalement Citoyen pour Cotonou & Abomey-Calavi

**Version :** 1.0.0 (Étapes #01 à #80)
**Stack :** HTML + CSS + JS vanilla — zéro dépendance, zéro build tool, zéro framework.
**Ouverture :** `double-clic sur index.html` ou `npx serve .` (pas de serveur requis).
**Génération des icônes PWA :** Ouvrir `icons/generate-icons.html` dans un navigateur.

---

## Table des matières

1. [Présentation du projet](#1-présentation-du-projet)
2. [Architecture générale](#2-architecture-générale)
3. [Design System & Direction Artistique](#3-design-system--direction-artistique)
4. [Structure des fichiers](#4-structure-des-fichiers)
5. [Module js/state.js — State Manager](#5-module-jsstatejs--state-manager)
6. [Module js/router.js — Hash Router SPA](#6-module-jsrouterjs--hash-router-spa)
7. [Module js/components.js — UI Components](#7-module-jscomponentsjs--ui-components)
8. [Module js/nav.js — Navigation & Transitions](#8-module-jsnavjs--navigation--transitions)
9. [Module js/reveal.js — Intersection Observer & Animations](#9-module-jsrevealjs--intersection-observer--animations)
10. [Module js/map.js — Carte SVG Interactive](#10-module-jsmapjs--carte-svg-interactive)
11. [Module js/report.js — Flux Signalement 4 Étapes](#11-module-jsreportjs--flux-signalement-4-étapes)
12. [Module js/app.js — Orchestrateur & Screens](#12-module-jsappjs--orchestrateur--screens)
13. [Fichier index.html — Shell PWA](#13-fichier-indexhtml--shell-pwa)
14. [Fichier manifest.json — PWA Manifest](#14-fichier-manifestjson--pwa-manifest)
15. [Fichier sw.js — Service Worker](#15-fichier-swjs--service-worker)
16. [Fichier css/tokens.css — Design Tokens](#16-fichier-csstokenscss--design-tokens)
17. [Fichier css/components.css — Styles Components](#17-fichier-csscomponentscss--styles-components)
18. [Étapes complétées — Déroulé détaillé](#18-étapes-complétées--déroulé-détaillé)
19. [Patterns & Conventions de code](#19-patterns--conventions-de-code)
20. [Pièges & Solutions](#20-pièges--solutions)
21. [Accessibilité](#21-accessibilité)
22. [Guide de déploiement](#22-guide-de-déploiement)
23. [Guide de contribution](#23-guide-de-contribution)

---

## 1. Présentation du projet

CityReport est une **Progressive Web App (PWA)** conçue pour permettre aux citoyens de Cotonou et Abomey-Calavi (Bénin) de signaler les problèmes urbains directement depuis leur téléphone : routes dégradées, éclairage défaillant, inondations, dépôts sauvages, etc. L'application fonctionne sur les réseaux 2G/3G/4G des opérateurs MTN et Moov Bénin, avec un mode hors-ligne complet.

### Objectifs

- **Réduire le temps de signalement** à moins de 30 secondes (4 étapes rapides)
- **Fonctionner sur les réseaux lents** (2G/3G) avec un mode offline robuste
- **Être installable** sur mobile (PWA) sans passer par un store
- **Gamifier l'engagement citoyen** via un système de points et badges
- **Fournir un dashboard aux mairies** pour le suivi et la gestion des signalements

### Public cible

1. **Citoyens** de Cotonou et Abomey-Calavi (utilisateurs principaux)
2. **Agents municipaux** qui traitent les signalements sur le terrain
3. **Élus municipaux** qui supervisent et prennent des décisions

---

## 2. Architecture générale

### Principe fondateur — State → Render → Bind

L'architecture repose sur un cycle immuable à 3 temps :

```
Action utilisateur
    ↓
State.go(patch)  ← met à jour l'état central S
    ↓
App.render()     ← innerHTML complet de #root
    ↓
App.bind()       ← rattache tous les event listeners
    ↓
Reveal.bind()    ← IntersectionObserver pour les animations
    ↓
Retour à l'attente d'action
```

**Règle d'or :** `App.render()` n'est JAMAIS appelé manuellement dans un event listener. Seul `State.go()` (ou `State.goNested()`) déclenche le render automatiquement. Cette règle garantit qu'il n'y a qu'un seul point d'entrée pour les mises à jour de l'interface.

### Architecture des fichiers

```
                    index.html
                   /          \
          css/tokens.css    js/state.js
          css/components.css  js/router.js
                              js/components.js
                              js/nav.js
                              js/reveal.js
                              js/map.js
                              js/report.js
                              js/app.js
                              sw.js (Service Worker)
                              manifest.json
```

L'ordre de chargement dans `index.html` est critique :
1. `js/state.js` — doit être chargé en premier (tout le monde dépend de State)
2. `js/router.js` — dépend de State, tout le monde peut appeler Router.push()
3. `js/components.js` — fonctions UI pures, sans dépendances
4. `js/nav.js` — dépend de State, Router, et UI
5. `js/reveal.js` — dépend de rien (DOM only)
6. `js/map.js` — dépend de State (pour les actions)
7. `js/report.js` — dépend de State, UI, Router
8. `js/app.js` — dernier, orchestre tout, dépend de tous les précédents

### Flux de données

```
Événement utilisateur (clic, swipe, input)
    ↓
Handler dans App.bind(), Nav.bind(), Report.bind(), MapView.bind()
    ↓
Appel à State.Actions.xxx() ou State.go() ou Router.push()
    ↓
State.go() → Object.assign(S, patch) → middlewares → notify → App.render()
    ↓
App.render() → screenHTML → root.innerHTML = topbar + main + bottombar + toasts
    ↓
App.bind() → Nav.bind() → MapView.bind() → Report.bind() → Reveal.bind()
    ↓
Nouveau cycle d'attente
```

### Gestion de la mémoire

- Il n'y a qu'un seul objet d'état mutable : `S` (accessible via `State.get()`)
- Les composants sont des fonctions pures qui retournent du HTML
- Pas de Virtual DOM, pas de diffing — remplacement complet du innerHTML à chaque render
- Les event listeners sont ré-attachés à chaque render via `bind()`
- Les positions de défilement sont mémorisées par écran dans `Router._scrollPos`

---

## 3. Design System & Direction Artistique

### Palette de couleurs

| Token | Valeur | Usage |
|-------|--------|-------|
| `--dark` | `#070910` | Fond principal (noir bleuté profond) |
| `--card` | `#0F1120` | Fond des cards et surfaces |
| `--card-2` | `#141628` | Cards hover / second niveau |
| `--card-3` | `#1A1D30` | Cards troisième niveau / toggles |
| `--lime` | `#C8FF00` | Accent unique — CTA, badges, highlights |
| `--lime-dim` | `#9FCC00` | Hover sur éléments lime |
| `--red` | `#FF3B30` | Danger, erreur, urgent |
| `--orange` | `#FF9500` | Avertissement, en cours |
| `--blue` | `#0A84FF` | Information, nouveau |
| `--teal` | `#32D74B` | Succès, résolu |
| `--text` | `#EEEEF5` | Texte principal |
| `--text-muted` | `#666880` | Texte secondaire |
| `--text-dim` | `#3A3D52` | Texte tertiaire, placeholders |
| `--border` | `#1A1D2E` | Bordure standard |
| `--border-light` | `#252840` | Bordure focus/hover |

### Typographie

| Famille | Usage | Poids |
|---------|-------|-------|
| **Bebas Neue** | Titres (display, display-sm) | 400 |
| **DM Sans** | Corps, boutons, labels | 300–600 |
| **JetBrains Mono** | Labels techniques, micro, badges | 400–500 |

Les fonts sont chargées depuis Google Fonts CDN avec `display=swap` pour éviter le FOIT (Flash of Invisible Text).

### Échelle typographique

| Classe | Taille | Usage |
|--------|--------|-------|
| `--text-xs` | 11px | Badges, micro, métriques |
| `--text-sm` | 13px | Corps secondaire, muted |
| `--text-base` | 15px | Corps principal |
| `--text-md` | 17px | Sous-titres |
| `--text-lg` | 20px | Petits titres |
| `--text-xl` | 24px | Titres de section |
| `--text-2xl` | 32px | Display-sm (titres de page) |
| `--text-3xl` | 40px | Display (grands titres) |

### Espacement

| Token | Valeur | Usage |
|-------|--------|-------|
| `--space-xs` | 4px | Icarts minimaux |
| `--space-sm` | 8px | Gaps serrés, padding cards small |
| `--space-md` | 16px | Gap standard, padding cards |
| `--space-lg` | 24px | Marges entre sections |
| `--space-xl` | 32px | Grands écarts |
| `--space-2xl` | 48px | Padding empty states |
| `--space-3xl` | 64px | Padding hero |

### Principe de profondeur

Il n'y a **pas d'ombres portées** (`box-shadow`). La profondeur est créée par :
1. Des variations de fond (`--card`, `--card-2`, `--card-3`)
2. Des bordures (`border: 1px solid var(--border)`)
3. Un flat design assumé, proche du Material Design 3 mais sans les ombres

Les seules exceptions sont :
- `--shadow-card` : utilisé pour le cadre de l'app sur desktop
- `--shadow-modal` : pour les modales (nécessaire pour la hiérarchie visuelle)
- `--shadow-lime` : glow du bouton CTA et des badges

### États des composants

1. **Normal** : bordure `--border`, fond `--card`
2. **Hover** : bordure `--border-light`, fond `--card-2`
3. **Active/pressed** : `transform: scale(.96)` via CSS
4. **Focus** : `box-shadow: 0 0 0 3px var(--lime-glow)`
5. **Disabled** : `opacity: .4; pointer-events: none`
6. **Loading** : spinner + opacité réduite
7. **Error** : bordure rouge `--red` + glow rouge
8. **Selected** : bordure lime `--border-lime` + fond `--lime-glow`

---

## 4. Structure des fichiers

```
cityreport-pwa/
├── index.html                # Shell PWA — splash screen, CDN, montage
├── manifest.json             # PWA Manifest — icônes, shortcuts, share_target
├── sw.js                     # Service Worker — cache, sync, push notifications
├── design-system.html        # Page de référence du design system (interne)
├── README.md                 # Cette documentation
│
├── css/
│   ├── tokens.css            # Variables CSS — palette, typo, spacing
│   └── components.css        # Reset + tous les composants UI
│
├── js/
│   ├── state.js              # State manager, middlewares, actions métier
│   ├── router.js             # Hash router, guards, pile historique
│   ├── components.js         # UI.* — générateurs HTML purs
│   ├── nav.js                # Top bar, bottom nav, swipe, transitions
│   ├── reveal.js             # IntersectionObserver, lazy loading
│   ├── map.js                # Carte SVG Cotonou/Calavi interactive
│   ├── report.js             # Flux signalement 4 étapes
│   └── app.js                # Orchestrateur, screens, render, init
│
├── icons/
│   ├── icon-48.png ... icon-512.png   # Icônes PWA multi-tailles
│   ├── icon-maskable-*.png            # Icônes adaptatives Android
│   ├── badge-72.png                   # Badge de notification
│   ├── shortcut-*.png                 # Icônes des raccourcis
│   └── generate-icons.html            # Générateur d'icônes (ouvrir dans browser)
│
└── screenshots/               # Captures pour le manifest PWA (à générer)
```

---

## 5. Module js/state.js — State Manager

### Rôle

Cœur de l'application. Gère l'état global `S`, la persistance localStorage, les middlewares, les notifications, et toutes les actions métier. Aucun autre module ne modifie `S` directement — tout passe par `State.go()` ou `State.Actions.*`.

### État initial complet

```javascript
const INITIAL = {
  screen:      'home',       // Écran actif
  prevScreen:  null,          // Écran précédent (pour transitions)
  routeParams: [],            // Paramètres d'URL extraits par le router

  homeTab: 'map',             // Onglet de l'accueil (map|feed)

  report: {                   // Signalement en cours de création
    step:        1,           // 1-4
    category:    null,        // ID de catégorie
    location:    null,        // { label, arrondissement, commune, detail }
    coords:      null,        // { lat, lng }
    photo:       null,        // Data URL (compressé)
    description: '',
    priority:    'normal',
  },

  reports:        [],         // Signalements soumis
  selectedReport: null,       // ID du signalement sélectionné

  user:        null,          // { id, name, phone, role, badges, points }
  isAnonymous: false,
  authToken:   null,

  loading:      false,
  modalOpen:    false,
  modalPayload: null,

  isOnline:       navigator.onLine,
  pendingReports: [],         // Signalements en attente (offline)

  prefs: {                    // Persisté dans localStorage
    theme:         'dark',
    lang:          'fr',
    notifications: true,
    dataSaver:     false,
    anonymous:     false,
  },
};
```

### API publique

#### `State.get()`
Retourne l'objet `S` mutable. **Ne jamais muter directement** — toujours passer par `go()`.

#### `State.go(patch)`
Met à jour `S` avec le patch, exécute les middlewares, notifie les listeners, puis appelle `App.render()`.
```javascript
State.go({ screen: 'home', loading: false });
```

#### `State.goNested(key, patch)`
Met à jour un sous-objet de `S`. Exemple :
```javascript
State.goNested('report', { step: 2, category: 'roads' });
// Équivalent à : S.report = { ...S.report, step: 2, category: 'roads' }
```

#### `State.setSilent(patch)` *(étape #13)*
Met à jour `S` **sans** déclencher `App.render()`. Utilisé pour les champs de formulaire pendant la saisie pour ne pas perdre le focus.
```javascript
State.setSilent({ _tempData: 'valeur' });
```

#### `State.setSilentNested(key, patch)` *(étape #13)*
Version nested de `setSilent()`. Met à jour `S[key]` sans render.
```javascript
State.setSilentNested('report', { description: e.target.value });
```

#### `State.subscribe(fn)`
Ajoute un listener appelé après chaque `go()`. Retourne une fonction `unsubscribe`.
```javascript
const unsub = State.subscribe((S, patch) => console.log('State changé', patch));
```

#### `State.use(fn)`
Ajoute un middleware `(prev, next, patch) => {}`. Les middlewares sont exécutés dans l'ordre d'ajout.
```javascript
State.use((prev, next, patch) => {
  if (patch.loading !== undefined) {
    console.log('Loading:', patch.loading);
  }
});
```

#### `State.reset(keys?)`
Réinitialise tout ou partie du state à l'état initial.

### Actions métier

Toutes les actions sont dans `State.Actions` :

| Action | Description | Appelle go() |
|--------|-------------|-------------|
| `login(user, token)` | Connecte un utilisateur | ✓ |
| `logout()` | Déconnecte + nettoie localStorage | ✓ |
| `loginAnonymous()` | Mode anonyme | ✓ |
| `setReportStep(n)` | Change l'étape du flux | ✓ (via goNested) |
| `setReportCategory(cat)` | Définit la catégorie + passe étape 2 | ✓ |
| `setReportLocation(loc, coords)` | Définit la localisation + passe étape 3 | ✓ |
| `setReportPhoto(photo)` | Stocke la photo + passe étape 4 | ✓ |
| `setReportDescription(desc)` | Stocke la description | ✓ |
| `resetReport()` | Remet le rapport à zéro | ✓ |
| `submitReport()` | Soumission avec validation + offline queue | ✓ |
| `voteReport(id, dir)` | Vote up/down optimiste | ✓ |
| `setPref(key, value)` | Change une préférence | ✓ |
| `openModal(payload)` / `closeModal()` | Gestion des modales | ✓ |

### Persistance localStorage

Les clés persistées sont définies dans `PERSIST_KEYS = ['user', 'authToken', 'prefs', 'pendingReports']`.

À chaque `go()`, le middleware `_persistor` sauvegarde ces clés dans `localStorage.cr_state`.

Au démarrage, `State.init()` appelle `_loadPersisted()` qui restaure les valeurs sauvegardées.

### Système de toasts

`State.toast(message, type, duration)` — crée un toast HTML5 dans `#toasts` avec :
- `type` : `'ok'` (lime), `'err'` (rouge), `'info'` (bleu), `'warn'` (orange)
- `duration` : millisecondes avant disparition (défaut 3000)
- Animation : slide up + fade, auto-suppression du DOM

### Points d'extension

- Ajouter une clé dans `INITIAL` et éventuellement dans `PERSIST_KEYS`
- Ajouter une action dans `Actions`
- Ajouter un middleware avec `State.use()`
- La clé `_addressDetail` est utilisée comme stockage temporaire (préfixe `_` = interne)

---

## 6. Module js/router.js — Hash Router SPA

### Rôle

Router SPA basé sur le hash (`#/home`, `#/suivi`, `#/rapport/42`). Gère la navigation, l'historique navigateur, les guards d'authentification, le scroll restoration, et les deep links.

### Routes déclarées

| Hash | Screen | Title | Guard |
|------|--------|-------|-------|
| `#` ou `#/home` | `home` | CityReport | — |
| `#/signaler` | `signaler` | Nouveau signalement | — |
| `#/suivi` | `suivi` | Mes signalements | — |
| `#/communaute` | `communaute` | Communauté | — |
| `#/profil` | `profil` | Mon profil | — |
| `#/rapport/:id` | `rapport` | Signalement | — |
| `#/admin` | `admin` | Dashboard mairie | `admin` |
| `#/agent` | `agent` | Espace agent | `agent` |

### API publique

#### `Router.push(path, params)`
Navigue vers une route. Ajoute à l'historique navigateur.
```javascript
Router.push('rapport', ['42']);  // → #/rapport/42
Router.push('home');              // → #/home
```

#### `Router.replace(path, params)`
Navigue sans ajouter à l'historique (remplace l'entrée courante).

#### `Router.back()`
Remonte dans la pile interne. Si la pile n'a qu'un élément → redirige vers `home`.

#### `Router.canGoBack()`
Vrai si la pile interne a plus d'un élément.

#### `Router.current()`
Retourne la route courante parsée `{ slug, screen, params, title, guard }`.

#### `Router.href(path, params)`
Construit un hash href pour les liens `<a>`.
```javascript
Router.href('rapport', ['42']);  // → '#/rapport/42'
```

#### `Router.isActive(screen)`
Vrai si le screen donné est l'écran actif.

### Pile d'historique interne

`Router._stack` est un tableau `[{screen, params, scrollY}]` qui sert à :
1. Savoir dans quelle direction on navigue (back vs push)
2. Mémoriser les positions de scroll par écran
3. Permettre au bouton "Retour" de remonter dans l'historique de l'app

### Guards

Les guards sont des fonctions qui vérifient `S.user?.role` avant d'autoriser la navigation :
```javascript
function _checkGuard(guard) {
  if (guard === 'admin' && S.user?.role !== 'admin') return false;
  if (guard === 'agent' && !['admin','agent'].includes(S.user?.role)) return false;
  return true;
}
```
Si le guard échoue → toast d'erreur + redirection vers `profil`.

### Scroll restoration

À chaque changement d'écran, `_saveScroll()` mémorise `main.scrollTop` pour l'écran quitté. À l'arrivée, `_restoreScroll()` restaure la position dans un `requestAnimationFrame()`.

### Initialisation

`Router.init()` est appelée une seule fois depuis `App.init()` :
1. Parse le hash initial (deep link)
2. Applique la route
3. Écoute `hashchange` pour le bouton back/forward du navigateur
4. Intercepte les clics sur `<a href="#/...">` pour une navigation sans rechargement

---

## 7. Module js/components.js — UI Components

### Rôle

Bibliothèque de **fonctions pures** qui génèrent du HTML. Aucun état, aucun event listener — juste des templates. Tous les composants supportent les états : normal, loading (skeleton), error, empty.

### Composants disponibles

#### `UI.btn(options)`
```javascript
UI.btn({
  label: 'Envoyer',          // Texte du bouton
  icon: 'send',              // Nom Tabler Icons (optionnel)
  variant: 'primary',        // primary | secondary | ghost | danger | lime-outline
  size: 'md',                // sm | md | lg
  full: false,               // largeur 100%
  loading: false,             // État loading avec spinner
  disabled: false,
  id: 'btn-submit',
})
```

**Variants :**
- `primary` : fond lime, texte foncé
- `secondary` : fond card, bordure
- `ghost` : transparent, bordure subtile
- `danger` : fond rouge translucide
- `lime-outline` : transparent avec bordure lime

#### `UI.iconBtn(options)`
Bouton icône seul avec `aria-label`.

#### `UI.btnGroup(options)`
Deux boutons côte à côte (Annuler / Confirmer).

#### `UI.input(options)`
```javascript
UI.input({
  id: 'input-phone',
  label: 'Téléphone',
  type: 'tel',               // text | tel | email | number
  placeholder: '97 XX XX XX',
  value: '',
  hint: 'Format béninois à 8 chiffres',
  error: '',                 // Message d'erreur (affiche le champ en rouge)
  required: false,
  icon: 'phone',             // Icône dans le champ
  maxlength: 8,
})
```
- Supporte l'icône à gauche
- Affiche `error` en rouge avec icône `alert-circle`
- Affiche `hint` en grisé sous le champ

#### `UI.textarea(options)`
Mêmes options que `input` avec en plus `rows` (4) et `maxlength` (500). Affiche un compteur `"0 / 500"` sous le textarea.

#### `UI.select(options)`
```javascript
UI.select({
  id: 'sel-commune',
  label: 'Commune',
  options: [
    { value: 'cotonou', label: 'Cotonou', selected: true },
    { value: 'calavi',  label: 'Calavi' },
  ],
  hint: '',
  error: '',
  required: false,
})
```
- Custom arrow via `select-wrap::after` en CSS
- `selected` dans les options pour la valeur par défaut

#### `UI.toggle(options)`
```javascript
UI.toggle({
  id: 'pref-notifs',
  label: 'Notifications',
  sub: 'Recevoir les alertes',    // Texte secondaire
  checked: true,
})
```
- Switch CSS pure (pas de JS requis pour le fonctionnement)
- Label cliquable associé au checkbox via `for`

---

### Composants de feedback

#### `UI.empty(options)`
État vide illustré : icône + titre + sous-titre + bouton CTA optionnel.
```javascript
UI.empty({
  icon: 'users',
  title: 'Rejoignez votre quartier',
  sub: 'Connectez-vous pour voir les signalements',
  action: { label: 'Se connecter', icon: 'login', variant: 'primary' },
})
```

#### `UI.errorState(options)`
État d'erreur réseau avec bouton "Réessayer" optionnel.
```javascript
UI.errorState({
  title: 'Erreur réseau',
  sub: 'Vérifiez votre connexion',
  onRetry: () => fetchData(),
})
```

#### `UI.screenLoader(label)`
Loader plein écran centré avec ring animé.

#### `UI.pulseDots()`
3 points pulsants (chargement subtil).

#### `UI.alert(options)`
Bannière d'alerte inline (info | success | warning | error).

#### `UI.offlineBanner()`
Bannière sticky "Hors ligne" cachée par défaut. Affichée via `UI.bindOfflineBanner()`.

---

### Composants de skeleton

| Fonction | Description |
|----------|-------------|
| `UI.skeletonLine(w, h)` | Ligne de skeleton |
| `UI.skeletonCard()` | Card signalement complète |
| `UI.skeletonList(n)` | n skeletonCards |
| `UI.skeletonMap()` | Skeleton carte |
| `UI.skeletonKPI()` | Skeleton KPI dashboard |
| `UI.skeletonProfile()` | Skeleton profil |

---

### Composants composites

#### `UI.reportCard(data)`
Card de signalement pour les listes :
```javascript
UI.reportCard({
  id: 1,
  category: 'roads',        // roads | water | waste | light | flood | health | security | other
  location: 'Agla, Cotonou',
  status: 'urgent',          // new | progress | done | rejected | urgent
  time: '1h',
  votes: 18,
  urgent: true,
  description: 'Fosse immense devant l\'école',
})
```
- Icône catégorie avec couleur distinctive
- Badge statut (Nouveau/En cours/Résolu/Rejeté/Urgent)
- Localisation avec icône map-pin
- Votes et temps relatif

#### `UI.kpiCard(data)`
Card KPI pour le dashboard mairie :
```javascript
UI.kpiCard({
  label: 'Signalements',
  value: 142,
  sub: '+12% ce mois',
  icon: 'alert-triangle',
  color: 'var(--lime)',
  trend: 12,                 // positif=vert, négatif=rouge
})
```

---

### Helpers de bind

Ces fonctions sont appelées depuis `App.bind()` après chaque render :

| Fonction | Description |
|----------|-------------|
| `UI.bindCharCount(textareaId)` | Branche le compteur sur un textarea |
| `UI.bindValidation(inputId, fn)` | Valide au blur avec une fonction |
| `UI.setLoading(btnId, bool)` | Active/désactive l'état loading |
| `UI.bindOfflineBanner()` | Affiche/cache le bandeau offline |
| `UI.bindReportCards()` | Clic sur une card → détail signalement |

### Validateurs

`UI.Validators` expose des fonctions de validation :
```javascript
Validators.required('')      // → 'Ce champ est obligatoire'
Validators.phone('97123456') // → '' (valide)
Validators.minLength(10)(v)  // → message si < 10
Validators.maxLength(100)(v) // → message si > 100
```

---

## 8. Module js/nav.js — Navigation & Transitions

### Rôle

Gère l'ensemble de la navigation de l'application :
- **Top bar** : logo/titre + bouton retour + icône notifications
- **Bottom nav** : 5 onglets (Carte, Suivi, Signaler, Quartier, Profil)
- **Indicateur glissant** : barre lime sous l'onglet actif
- **Swipe tactile** : navigation horizontale entre les onglets
- **Transitions** : animations slide entre les écrans
- **Ripple** : feedback tactile sur les boutons

### Configuration des onglets

```javascript
const TABS = [
  { id: 'home',       icon: 'map-pin',    label: 'Carte',    badge: null },
  { id: 'suivi',      icon: 'list-check', label: 'Suivi',    badge: null },
  { id: 'signaler',   icon: 'plus',       label: 'Signaler', badge: null, cta: true },
  { id: 'communaute', icon: 'users',      label: 'Quartier', badge: null },
  { id: 'profil',     icon: 'user',       label: 'Profil',   badge: null },
];
```

L'onglet **Signaler** est un CTA (Call To Action) avec un style spécial : bouton circulaire lime avec glow.

### API publique

#### `Nav.renderTopBar(S)`
Retourne le HTML de la top bar :
- Logo "CR" sur l'accueil
- Titre centré sur les autres écrans
- Bouton retour si `Router.canGoBack()` ou si screen = `rapport`
- Icône cloche notifications avec badge rouge

#### `Nav.renderBottomNav(S)`
Retourne le HTML de la navigation inférieure :
- 5 onglets avec icônes et labels
- Badge numérique sur le suivi (démo)
- Indicateur glissant `#bn-indicator`

#### `Nav.setBadge(tab, count)`
Définit le badge d'un onglet. Appelé depuis l'app pour les notifications.

#### `Nav.animateIndicator(screen)`
Anime la position de l'indicateur glissant sous l'onglet actif. Calcul basé sur `getBoundingClientRect()`.

#### `Nav.animateTransition(fromScreen, toScreen)`
Applique une classe de transition CSS (`slide-from-right` / `slide-from-left`) basée sur l'ordre des onglets dans `TAB_ORDER`.

#### `Nav.bind(onNavigate)`
Attache les événements :
1. Clic sur les onglets → `onNavigate(route)`
2. Bouton retour → `Router.back()`
3. Bouton notifications → toast (placeholder)
4. Swipe tactile → navigation entre onglets
5. Positionnement de l'indicateur

### Swipe tactile

Détecté sur `#main` avec `touchstart`/`touchend` :
- Seuil de déclenchement : 60px horizontal
- Tolérance verticale : 40px (ignore les scrolls verticaux)
- Exclut l'écran `signaler` (flux multi-étapes)
- Ordre : home → suivi → communaute → profil

### Transitions

Deux animations CSS :
- `.slide-from-right` : slide + fade depuis la droite (navigation avant)
- `.slide-from-left` : slide + fade depuis la gauche (navigation arrière)

La direction est déterminée par la position dans `TAB_ORDER`.

---

## 9. Module js/reveal.js — Intersection Observer & Animations

### Rôle

Module centralisé pour toutes les animations au scroll :
- **Reveal** : éléments qui apparaissent au défilement
- **Stagger** : liste dont les enfants apparaissent en cascade
- **Lazy loading** : images chargées quand elles deviennent visibles
- **Infinite scroll** : détection de fin de liste

### API publique

#### `Reveal.bind()`
Observe tous les éléments du DOM courant :
- `.reveal` → apparaît avec fade + translateY
- `.reveal-left` → apparaît avec slide gauche
- `.reveal-scale` → apparaît avec scale
- `.stagger-list` → enfants apparaissent en cascade (délais 0 à 420ms)
- `img[data-src]` → lazy loading avec marge de 200px

Appelé depuis `App.bind()` à chaque render.

#### `Reveal.revealNow(el)`
Force la révélation immédiate d'un élément (ajoute la classe `.visible`).

#### `Reveal.revealAll(container)`
Révèle tous les éléments d'un container immédiatement.

#### `Reveal.skeletonToContent(skeletonEl, contentHTML, delay)`
Transition fluide d'un skeleton vers du contenu réel : fade out → remplacement → fade in.

#### `Reveal.simulateLoad(containerId, skeletonHTML, contentFn, duration)`
Utilitaire de démo : affiche un skeleton pendant `duration`ms puis le remplace par le vrai contenu.

#### `Reveal.onReachBottom(callback, threshold)`
Observe le scroll pour détecter quand l'utilisateur approche du bas de la liste. Retourne une fonction de cleanup.

### Délais de stagger

```css
.stagger-list > *:nth-child(1) { transition-delay:   0ms; }
.stagger-list > *:nth-child(2) { transition-delay:  60ms; }
.stagger-list > *:nth-child(3) { transition-delay: 120ms; }
.stagger-list > *:nth-child(4) { transition-delay: 180ms; }
.stagger-list > *:nth-child(5) { transition-delay: 240ms; }
.stagger-list > *:nth-child(6) { transition-delay: 300ms; }
.stagger-list > *:nth-child(7) { transition-delay: 360ms; }
.stagger-list > *:nth-child(8) { transition-delay: 420ms; }
```

### Réduction de mouvement

Toutes les animations sont désactivées quand l'utilisateur a `prefers-reduced-motion: reduce` :
```css
@media (prefers-reduced-motion: reduce) {
  .reveal, .reveal-left, .reveal-scale,
  .stagger-list > * {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}
```

---

## 10. Module js/map.js — Carte SVG Interactive

### Rôle

Carte SVG interactive de Cotonou et Abomey-Calavi avec :
- 13 zones/quartiers dessinés en SVG
- Routes principales
- Pins de signalements animés
- Filtre par catégorie
- Tooltip au clic
- Compteur de signalements visibles

### Zones géographiques

| Zone | Ville | Type |
|------|-------|------|
| Akpakpa | Cotonou | Arrondissement |
| Cadjehoun | Cotonou | Quartier |
| Godomey S. | Cotonou | Quartier |
| Agla | Cotonou | Quartier |
| Fidjrossè | Cotonou | Quartier |
| Vèdoko | Cotonou | Quartier |
| Gbégamey | Cotonou | Quartier |
| Jonquet | Cotonou | Quartier |
| Haie Vive | Cotonou | Quartier |
| Zongo | Cotonou | Quartier |
| Tankpè | Abomey-Calavi | Quartier |
| Calavi Centre | Abomey-Calavi | Quartier |
| Godomey | Abomey-Calavi | Quartier |
| Kpanroun | Abomey-Calavi | Quartier |
| Lac Nokoué | — | Plan d'eau |
| Océan Atlantique | — | Plan d'eau |

### Pins de démonstration

```javascript
const DEMO_PINS = [
  { id:1, x:220, y:238, cat:'roads',    status:'urgent',   label:'Route dégradée',  loc:'Agla' },
  { id:2, x:163, y:215, cat:'flood',    status:'progress', label:'Inondation',      loc:'Fidjrossè' },
  { id:3, x:305, y:198, cat:'light',    status:'new',      label:'Éclairage',       loc:'Haie Vive' },
  { id:4, x:72,  y:170, cat:'waste',    status:'done',     label:'Déchets',         loc:'Tankpè' },
  { id:5, x:248, y:178, cat:'water',    status:'progress', label:'Fuite d\'eau',    loc:'Gbégamey' },
  { id:6, x:115, y:185, cat:'roads',    status:'new',      label:'Nid de poule',    loc:'Godomey' },
  { id:7, x:340, y:158, cat:'security', status:'new',      label:'Sécurité',        loc:'Jonquet' },
  { id:8, x:195, y:262, cat:'health',   status:'urgent',   label:'Santé publique',  loc:'Vèdoko' },
];
```

### API publique

#### `MapView.render({ onPinClick })`
Retourne le HTML complet de la carte :
- SVG avec viewBox `30 85 370 220` (normalisé 0-400 × 0-340)
- Fond avec gradient, grille légère
- Zones SVG (paths), routes, labels
- Pins de signalements avec halos pulsants pour les urgents
- Tooltip positionné en bas de la carte
- Filtres par catégorie (boutons en haut)
- Compteur de signalements visibles

#### `MapView.bind()`
Attache les événements :
1. Clic sur un pin → tooltip + callback `onPinClick`
2. Clic hors pin → ferme le tooltip
3. Clic sur les filtres → filtre les pins visibles + met à jour le compteur

### Filtres

Les filtres sont des boutons en haut de la carte :
- "Tous" (reset)
- 8 icônes de catégories (🚗 routes, 💧 eau, 🗑️ déchets, 💡 éclairage, 🌊 inondation, 🏥 santé, 🛡️ sécurité, 📍 autre)

Le filtre met à jour `_activeFilter` et `_reRenderPins()` qui remplace uniquement les noeuds SVG des pins (pas de re-render complet de la carte).

### Tooltip

Positionné en bas de la carte, contient :
- Catégorie (couleur distinctive)
- Titre du signalement
- Localisation
- Badge statut (couleur selon l'état)

---

## 11. Module js/report.js — Flux Signalement 5 Étapes

### Rôle

Gère l'ensemble du flux de création d'un signalement en 5 étapes : Catégorie → Localisation → Photo → Confirmation → Succès. Les étapes 1 à 4 constituent le formulaire, l'étape 5 est l'écran de confirmation post-soumission.

### Structure

```
render(S) → Stepper (si step ≤ 4) + contenu étape courante
├── _renderStep1(S)   → Choix catégorie (grille 2×2)
├── _renderStep2(S)   → Localisation (GPS + commune + quartier + adresse)
├── _renderStep3(S)   → Photo (capture/file) + Description (textarea)
├── _renderStep4(S)   → Confirmation (récap + toggle anonyme + submit)
└── _renderStep5(S)   → Succès (confettis + référence + actions)
```

### Stepper

Indicateur visuel des 5 étapes en haut du flux (masqué à l'étape 5) :
- Cercle numéroté pour chaque étape
- Ligne de connexion entre les étapes
- États : `done` (cercle lime avec ✓) | `active` (contour lime) | `inactive` (gris)
- Texte en dessous : "Étape 2 sur 5 — Localisation"

### Étape 1 — Catégorie *(étape #12)*

Grille 2×2 de 8 catégories :
- Routes & voirie 🛣️ (orange)
- Eau & assainissement 💧 (bleu)
- Déchets 🗑️ (vert)
- Éclairage public 💡 (jaune)
- Inondation 🌊 (cyan)
- Santé publique 🏥 (rouge)
- Sécurité 🛡️ (violet)
- Autre 📍 (gris)

Quand une catégorie est sélectionnée :
- Check mark animé (pop)
- Description de la catégorie affichée en info
- Bouton "Continuer" activé

### Étape 2 — Localisation *(étape #13)*

Deux méthodes :
1. **GPS** : bouton "Ma position GPS" → `navigator.geolocation.getCurrentPosition()`
   - Reverse geocoding par bounding box (Cotonou : lat 6.33-6.40/lng 2.38-2.44, Calavi : lat 6.39-6.47/lng 2.28-2.40)
   - Loading state sur le bouton pendant la requête
   - Fallback si GPS indisponible
2. **Manuel** : sélecteurs Commune + Quartier + adresse libre

**Quartiers disponibles (étendu étape #13) :**
- Cotonou : 13 arrondissements + 9 quartiers (Akpakpa, Agla, Cadjehoun, Fidjrossè, Gbégamey, Haie Vive, Jonquet, Vèdoko, Zongo)
- Abomey-Calavi : 10 quartiers (Calavi Centre, Agori, Akassato, Godomey, Houèdjèdo, Kpanroun, Ouèdo, Tankpè, Togba, Zinvié)
- Porto-Novo : 5 quartiers
- Ouidah : 5 quartiers
- Sèmè-Podji : 3 quartiers

**Piège évité :** Les changements de sélecteurs utilisent `State.setSilentNested()` pour éviter le re-render qui perdrait le focus. Seul le clic "Continuer" déclenche le render complet via `State.Actions.setReportLocation()`.

### Étape 3 — Photo & Description *(étape #14)*

**Zone photo :**
- Clic → sélecteur de fichier (attribut `capture="environment"` pour la caméra arrière)
- Lecture via `FileReader`
- **Compression obligatoire** via `compressImage()` :
  - Redimensionne à max 1024px sur le plus grand côté
  - Compression JPEG à 75%
  - Prévention du dépassement du quota localStorage (5 Mo)
- Preview affichée directement dans le DOM (pas de re-render complet)
- Bouton "Supprimer" avec `e.stopPropagation()` (évite de rouvrir le selecteur)

**Description :**
- Textarea avec compteur 0/500 caractères
- Sauvegarde au `blur` (pas au `input`) via `setSilentNested` pour éviter les re-renders intempestifs

### Étape 4 — Confirmation *(étape #12)*

Récapitulatif avant soumission :
- Photo (si présente)
- Catégorie avec icône
- Localisation complète
- Description (tronquée à 80 caractères)
- Toggle anonymat
- Bouton "Envoyer le signalement" avec état loading

### Étape 5 — Succès *(étape #15)*

Écran de confirmation affiché après soumission réussie :
- **Confettis CSS** : 24 particules animées (5 couleurs : lime, red, blue, orange, purple) avec positions et délais aléatoires, `pointer-events: none`, disparaissent après 2.8s
- **Checkmark animé** : cercle vert lime avec icône ✓, animation `successPop` (scale bouncy)
- **Numéro de référence** : format `CR-AAAAMMJJ-XXXXXX` (ex: `CR-20240628-847291`)
- **Résumé rapide** : badge catégorie + badge localisation
- **3 actions** : "Voir mes signalements" (→ suivi), "Nouveau signalement" (reset → step 1), "Retour à l'accueil" (→ home)
- **Génération de la référence** : `CR-${date ISO sans tirets}-${last 6 digits du timestamp}`

### API publique

| Fonction | Description |
|----------|-------------|
| `Report.render(S)` | Retourne le HTML complet du flux |
| `Report.bind()` | Attache tous les événements du flux |
| `Report.CATEGORIES` | Tableau des 8 catégories (exporté pour app.js) |

### Helpers internes

| Fonction | Description |
|----------|-------------|
| `_getQuartiers(commune)` | Retourne la liste des quartiers pour une commune |
| `_reverseGeocode(lat, lng)` | Détecte la commune par bounding box |
| `_getGPS()` | Promise wrapper pour `navigator.geolocation` |
| `_updateStep2NextBtn()` | Active/désactive le bouton Continuer selon l'état |
| `compressImage(dataUrl, maxWidth, quality)` | Redimensionne et compresse une image via canvas |
| `_handlePhotoInput(e)` | Handler asynchrone pour la sélection photo avec compression |
| `_renderPhotoPreview(src)` | Affiche la preview photo dans le DOM |
| `_resetPhotoZone()` | Réinitialise la zone photo (placeholder) |
| `_renderStep5(S)` | Écran de succès avec confettis, référence, actions |

---

## 12. Module js/app.js — Orchestrateur & Screens

### Rôle

C'est le point d'entrée de la logique applicative. Il orchestre :
- Les **screens** (fonctions qui retournent le HTML de chaque page)
- Le **render** (injection du HTML dans #root)
- Le **bind** (rattachement de tous les événements)
- L'**init** (démarrage de l'application)

### Screens

| Screen | Fonction | Description |
|--------|----------|-------------|
| `home` | `screenHome(S)` | Carte SVG + feed signalements récents |
| `signaler` | `screenSignaler(S)` | Délègue à `Report.render(S)` |
| `suivi` | `screenSuivi(S)` | Mes signalements (démo + vrais) |
| `communaute` | `screenCommunaute(S)` | Fil du quartier (stub) |
| `profil` | `screenProfil(S)` | Profil + auth demo + préférences |
| `rapport` | `screenRapport(S)` | Détail signalement complet (étape #16) |

#### `screenHome(S)` — Page d'accueil
- Carte SVG interactive (via `MapView.render()`)
- Feed des 3 signalements récents en demo
- Bouton "Voir tout" → redirige vers `suivi`
- Skeletons pendant le chargement
- Stagger list pour l'animation d'entrée

#### `screenSuivi(S)` — Mes signalements
- Liste des signalements (démo si `S.reports` est vide)
- Skeletons pendant le chargement
- Cards cliquables → `Router.push('rapport', [id])`

#### `screenProfil(S)` — Profil utilisateur
- Avatar (initiale du nom)
- Infos utilisateur (nom, téléphone, points)
- Boutons : connexion rapide (demo), déconnexion, mode anonyme
- Préférences : notifications, dataSaver, anonymat (persistés)
- Debug : état courant (user, online, pending, prefs)

#### `screenRapport(S)` — Détail signalement *(étape #16)*

Affiché quand l'utilisateur clique sur une card ou un pin de la carte :
- **Hero** : photo du signalement (ou icône catégorie sur fond gradient si pas de photo), overlay fondu vers le bas
- **Badge statut** flottant en haut à droite (Nouveau/En cours/Résolu/Urgent/Rejeté)
- **Catégorie + référence** : icône + label catégorie, numéro de référence à droite
- **Description** : texte complet du signalement
- **Localisation** : card avec icône map-pin, label + détail optionnel
- **Timeline** : chronologie verticale 3 étapes (Nouveau → En cours → Résolu), les étapes accomplies en lime avec ✓, ligne de connexion colorée
- **Stats** : 2 cards (soutiens + date relative)
- **Actions** : bouton "Soutenir" (vote up) + "Partager" (native share API avec fallback clipboard)
- **Fallback** : si l'ID du signalement n'est trouvé ni dans `S.reports` ni dans `MapView.DEMO_PINS`, affiche un empty state avec bouton retour

**Helpers :**
- `_resolveReport(S, id)` — cherche dans `S.reports` → `S.pendingReports` → `MapView.DEMO_PINS` (3 paliers de fallback)
- `_timeAgo(date)` — format relatif (À l'instant / Il y a X min / Il y a Xh / Il y a Xj / date courte)
- `_renderTimeline(status)` — génère le HTML de la timeline verticale 3 étapes

### Fonction `render()`

1. Lecture de `State.get()` pour obtenir l'état courant
2. Sélection de la fonction screen correspondant à `S.screen`
3. Construction du HTML complet :
   ```
   Nav.renderTopBar(S) + main(screenHTML) + Nav.renderBottomNav(S) + #toasts
   ```
4. Injection dans `#root.innerHTML`
5. Animation de transition si changement d'écran
6. Appel de `bind()`
7. Positionnement de l'indicateur de navigation

### Fonction `bind()`

Attache tous les événements après chaque render :
1. `Nav.bind(onNavigate)` — navigation onglets + swipe + retour
2. `Report.bind()` — si écran = `signaler`
3. `UI.bindReportCards()` — cards signalement cliquables → détail
4. `MapView.bind()` — carte SVG
5. Bouton "Voir tout"
6. Bandeau offline
7. Auth demo (login, logout, anonyme)
8. Préférences toggles
9. **Rapport detail** — si écran = `rapport` : vote up, partage (native share / clipboard), retour empty state
10. `Reveal.bind()` — animations au scroll

### Fonction `init()`

Appelée au `DOMContentLoaded` :
1. `State.init()` — charge localStorage
2. `Router.init()` — lit l'URL, applique la route
3. `_initSW()` — enregistre le Service Worker
4. Écouteurs online/offline
5. Badge de démo après 2s

### Service Worker

`_initSW()` enregistre `sw.js` et gère :
- Détection de mise à jour (`updatefound` → bannière "Nouvelle version disponible")
- Messages du SW (`SYNC_COMPLETE`, `NAVIGATE`)
- Mise à jour via `postMessage({ type: 'SKIP_WAITING' })`

---

## 13. Fichier index.html — Shell PWA

### Structure

```html
<!DOCTYPE html>
<html lang="fr" dir="ltr">
<head>
  <!-- Meta tags PWA -->
  <!-- Open Graph -->
  <!-- PWA Manifest -->
  <!-- Icônes et Apple Touch -->
  <!-- Google Fonts avec display=swap -->
  <!-- Tabler Icons CDN -->
  <!-- Styles CityReport -->
  <!-- Splash screen CSS -->
</head>
<body>
  <!-- Splash screen (CR + dot animé) -->
  <!-- #root (point de montage) -->
  <!-- Scripts dans l'ordre -->
  <!-- Script DOMContentLoaded → cache splash -->
</body>
</html>
```

### Particularités

- **Splash screen** : div `#splash` avec logo "CR", tagline, dot animé. Disparait 800ms après `DOMContentLoaded` avec fade transition.
- **Desktop centering** : media query `@media (min-width: 431px)` centre l'app dans un cadre 430px avec ombre.
- **Scripts** : chargés sans `defer` ni `async` — ordre synchrone garanti.
- **Fonts** : `display=swap` dans l'URL Google Fonts pour éviter le FOIT.
- **Tabler Icons** : CDN jsdelivr version 3.34.0.

---

## 14. Fichier manifest.json — PWA Manifest

### Configuration complète

```json
{
  "name": "CityReport — Signalement citoyen",
  "short_name": "CityReport",
  "description": "Signalez les problèmes de votre quartier à Cotonou et Abomey-Calavi.",
  "start_url": "/?source=pwa",
  "id": "cityreport-bj",
  "display": "standalone",
  "display_override": ["standalone", "minimal-ui"],
  "background_color": "#070910",
  "theme_color": "#070910",
  "orientation": "portrait-primary",
  "lang": "fr",
  "dir": "ltr",
  "categories": ["utilities", "social", "productivity"]
}
```

### Icônes

10 tailles différentes, de 48px à 512px, dont 2 maskable (adaptatives Android).

### Shortcuts

Raccourcis pour l'installation PWA :
1. "Signaler un problème" → `/#/signaler`
2. "Mes signalements" → `/#/suivi`

### Share Target

Permet de recevoir des images depuis d'autres apps (WhatsApp, galerie, etc.) :
```json
"share_target": {
  "action": "/?source=share#/signaler",
  "method": "POST",
  "enctype": "multipart/form-data",
  "params": { "files": [{ "name": "photo", "accept": ["image/*"] }] }
}
```

---

## 15. Fichier sw.js — Service Worker

### Stratégies de cache

| Type | Stratégie | Cache |
|------|-----------|-------|
| Shell (HTML, CSS, JS core) | Cache First | `cr-shell-v2` |
| Fonts, CDN | Cache First (30j) | `cr-assets-v2` |
| API /api/* | Network First (5min cache) | `cr-api-v2` |
| Images (png, jpg, webp, svg) | Cache First | `cr-assets-v2` |
| Tout le reste | Network First | `cr-assets-v2` |

### Shell files (offline garanti)

```javascript
const SHELL_FILES = [
  '/', '/index.html',
  '/css/tokens.css', '/css/components.css',
  '/js/state.js', '/js/router.js', '/js/components.js',
  '/js/nav.js', '/js/app.js',
  '/manifest.json', '/design-system.html',
];
```

### Cycle de vie

1. **Install** : précache le shell → `skipWaiting()` (activation immédiate)
2. **Activate** : supprime les anciens caches → `clients.claim()` (contrôle immédiat)
3. **Fetch** : route chaque requête vers la stratégie appropriée
4. **Sync** : `sync-reports` → envoie les signalements en attente (stub, partie #20)
5. **Push** : reçoit et affiche les notifications (stub, partie #35)
6. **Message** : `SKIP_WAITING`, `GET_VERSION`, notifications navigate

### Fallback offline

- Navigation → `index.html` (l'app offline s'affiche)
- API → `{ error: 'offline', message: 'Pas de connexion réseau' }` avec status 503

### CDN Patterns

```javascript
const CDN_PATTERNS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
];
```

### API Cache

Les réponses API sont marquées avec un header `sw-cached-at` (timestamp). Si le cache a plus de 5 minutes, il est considéré comme expiré.

---

## 16. Fichier css/tokens.css — Design Tokens

### Contenu

131 lignes de variables CSS définissant tout le design system :
- `--lime`, `--red`, `--orange`, `--blue`, `--purple`, `--teal` (couleurs primaires)
- `--dark`, `--card`, `--card-2`, `--card-3` (surfaces)
- `--text`, `--text-muted`, `--text-dim` (texte)
- `--border`, `--border-light`, `--border-strong`, `--border-lime` (bordures)
- `--font-display`, `--font-body`, `--font-mono` (typographie)
- `--text-xs` à `--text-3xl` (taille de texte)
- `--space-xs` à `--space-3xl` (espacement)
- `--radius-sm` à `--radius-xl` (coins arrondis)
- `--nav-height`, `--bottom-height`, `--safe-bottom` (navigation)
- `--ease-out`, `--ease-snap` (courbes d'animation)
- `--dur-fast`, `--dur-base`, `--dur-slow` (durées)
- `--shadow-card`, `--shadow-modal`, `--shadow-lime` (ombres)
- `--z-base` à `--z-toast` (profondeur)
- `--status-*` (statuts signalement)
- `--cat-*` (couleurs par catégorie)

### Utilisation

Tous les styles dans `components.css` et les templates HTML utilisent UNIQUEMENT ces variables. Aucune valeur hexadécimale en dur dans le CSS applicatif.

---

## 17. Fichier css/components.css — Styles Components

### Contenu (1578+ lignes)

Organisé en sections claires avec commentaires `═══` :

1. **Reset** : box-sizing, body, svg, buttons, scrollbar
2. **Layout shell** : `#root`, `#top-bar`, `#main`, `#bottom-nav`
3. **Screens** : `.screen`, `.screen-full`
4. **Cards** : `.card`, `.card-sm`, `.card-hover`, `.card-lime`, `.card-urgent`
5. **Boutons** : `.btn`, `.btn-primary/secondary/ghost/danger/lime-outline`, états
6. **Inputs** : `.input`, `.textarea`, `.select`, `.toggle`
7. **Badges** : `.badge-lime/red/orange/blue/teal/muted`, `.status-*`
8. **Grille catégories** : `.cat-grid`, `.cat-item`, couleurs par catégorie
9. **Stepper** : `.stepper`, `.step-item`, `.step-dot`, `.step-line`
10. **List rows** : `.list-row` (pour les récaps)
11. **Modal** : `.modal-overlay`, `.modal-sheet`
12. **Toasts** : `#toasts`, `.toast`, états ok/err/info
13. **Typographie** : `.display`, `.heading`, `.body`, `.muted`, `.micro`
14. **Utilitaires** : `.flex`, `.mt-sm`, `.mb-md`, `.text-lime`, `.avatar`, etc.
15. **Skeleton** : shimmer animation, tous les types de skeleton
16. **Reveal** : `.reveal`, `.reveal-left`, `.reveal-scale`, `.stagger-list`
17. **Ripple** : `.ripple`, `.ripple-wave` animation
18. **Navigation** : indicateur, badge, CTA, transitions slide
19. **Update banner** : bannière mise à jour SW
20. **Carte SVG** : container, zones, pins, tooltip, filtres, compteur
21. **Flux signalement** : step container, cat-grid-report, location-btn, photo-zone, recap, step-actions
22. **Desktop frame** : centrage 430px
23. **Reduced motion** : désactive toutes les animations
24. **Photo loading** : état de compression (ajout étape #14)

---

## 18. Étapes complétées — Déroulé détaillé

### Étape #01 — Setup projet & structure fichiers
- Création de l'arborescence complète
- Fichiers initiaux : `index.html`, `manifest.json`, `README.md`
- Structure JS minimale : `state.js`, `router.js`, `app.js`
- Structure CSS minimale : `tokens.css`, `components.css`
- Icônes PWA générées

### Étape #02 — Design system tokens CSS
- Palette de couleurs complète dans `tokens.css`
- Typographie : Bebas Neue, DM Sans, JetBrains Mono
- Échelle typographique, espacement, rayons
- Variables de navigation, transitions, z-index

### Étape #03 — Components UI & boutons
- `components.js` : `UI.btn()`, `UI.input()`, `UI.toggle()`
- `components.css` : styles boutons, inputs, toggles, badges
- Système de skeleton loading
- États : normal, hover, active, disabled, loading, error

### Étape #04 — Navigation & top bar
- `nav.js` : `Nav.renderTopBar()`, `Nav.renderBottomNav()`
- 5 onglets avec indicateur glissant
- Bouton CTA central "Signaler"
- Transitions slide entre écrans
- Variables `--nav-height`, `--bottom-height`, `--safe-bottom`

### Étape #05 — Router SPA
- `router.js` : hash routing complet
- Routes : home, signaler, suivi, communaute, profil, rapport, admin, agent
- Pile d'historique interne + scroll restoration
- Guards admin/agent

### Étape #06 — État persistant
- `state.js` : middlewares `_logger`, `_persistor`
- Persistance localStorage via `PERSIST_KEYS`
- Chargement au démarrage via `_loadPersisted()`
- `State.toast()` : notifications in-app

### Étape #07 — Service Worker offline
- `sw.js` : 3 caches, stratégies Cache First / Network First
- Fallback offline → index.html
- Gestion des mises à jour (updatefound → bannière)
- Background Sync stub, Push notifications stub

### Étape #08 — PWA manifest complet
- `manifest.json` : icônes, shortcuts, share_target, screenshots
- `display: standalone` + `display_override`
- `start_url`, `id` pour l'identité PWA

### Étape #09 — Skeletons & empty states
- Skeletons : card, list, KPI, profile, map, stepper
- Empty states avec icônes et CTA
- Error state réseau
- Loader plein écran

### Étape #10 — Reveal & animations scroll
- `reveal.js` : IntersectionObserver centralisé
- `.reveal`, `.reveal-left`, `.reveal-scale`, `.stagger-list`
- Lazy loading images (`data-src`)
- Support `prefers-reduced-motion`

### Étape #11 — Carte SVG Cotonou/Calavi
- `map.js` : 16 zones SVG, routes, pins animés
- Filtres par catégorie, tooltip, compteur
- Données géographiques normalisées (viewBox 0-400)

### Étape #12 — Flux signalement 4 étapes
- `report.js` : Stepper + 4 étapes complètes
- Catégories grid, sélecteurs commune/quartier
- Zone photo caméra/galerie, textarea avec compteur
- Confirmation avec récap, toggle anonymat, submit stub

### Étape #13 — Localisation améliorée (GPS + reverse geocoding)
- **`State.setSilent()` / `setSilentNested()`** : mise à jour sans re-render (évite perte de focus)
- **`_reverseGeocode()`** : bounding boxes Cotonou (lat 6.33-6.40, lng 2.38-2.44) / Calavi (lat 6.39-6.47, lng 2.28-2.40)
- **Quartiers étendus** : 13 arrondissements Cotonou, 10 quartiers Calavi, + Porto-Novo, Ouidah, Sèmè-Podji
- **GPS avec reverse geocoding** : pré-remplit la commune et les sélecteurs dans le DOM
- **Input adresse** : sauvegarde silencieuse au `blur`
- **Suppression doublon `screenSuivi`** dans `app.js`

### Étape #14 — Photo & description (compression + preview)
- **`compressImage()`** : redimensionnement canvas (max 1024px, JPEG 75%)
- **`_handlePhotoInput()`** : lecture asynchrone + compression + preview DOM directe
- **`_renderPhotoPreview()`** : affiche la photo + ré-attache les events (supprimer, re-sélectionner)
- **`_resetPhotoZone()`** : retour au placeholder sans re-render
- **Photo-loading state** : spinner + texte "Compression…" pendant le traitement
- **Description** : passage de `input` à `blur` avec `setSilentNested` pour éviter les re-renders
- **CSS** : `.photo-loading` ajouté à `components.css`

### Étape #15 — Confirmation succès (confettis + référence)
- **`_renderStep5(S)`** : écran de succès avec confettis CSS, checkmark animé, numéro de référence
- **Génération référence** : `CR-AAAAMMJJ-XXXXXX` (timestamp last 6 digits), stockée dans `report.reference` et dans le payload de `submitReport()`
- **Confettis** : 24 particules positionnées aléatoirement, 5 couleurs (lime, red, blue, orange, purple), animation `confettiFall` avec rotation 720° et fondu
- **Checkmark** : cercle lime 80px avec animation `successPop` (scale 0 → 1.12 → 1)
- **Actions post-soumission** : 3 boutons (Voir mes signalements, Nouveau signalement, Retour à l'accueil) avec `resetReport()` au départ
- **Soumission modifiée** : `submitReport()` ne navigue plus vers `suivi` et ne reset plus le report — passe à l'étape 5 via `goNested()`
- **CSS** : `.confetti-container`, `.confetti-piece`, `.success-checkmark`, `.ref-card`, `.ref-number` dans `components.css`

### Étape #16 — Détail signalement (screenRapport)

- **`screenRapport(S)`** réécrit : héro photo/gradient, badge statut, catégorie + référence, description, localisation, timeline verticale, stats, actions
- **`_resolveReport(S, id)`** : cherche le signalement dans `S.reports` puis dans `MapView.DEMO_PINS` (fallback)
- **`_timeAgo(date)`** : formatage relatif (À l'instant / X min / Xh / Xj / date courte)
- **`_renderTimeline(status)`** : chronologie verticale 3 étapes (Nouveau → En cours → Résolu), dots lime avec ✓ pour les étapes complétées
- **Bindings rapport** : vote up (soutien + toast), partage (navigator.share API avec fallback clipboard.writeText), retour empty state
- **CSS** : `.detail-hero`, `.detail-hero-img`, `.detail-hero-icon`, `.detail-hero-overlay`, `.detail-content`, `.detail-stats`, `.detail-stat`, `.detail-actions`, `.timeline`, `.tl-item`, `.tl-dot`, `.tl-line`, `.tl-body`, `.tl-title`, `.tl-sub` dans `components.css`

### Étape #17 — Synchronisation offline / online

- **`State.Actions.syncPendingReports()`** : envoie les signalements en file d'attente (`pendingReports`), les transfère dans `S.reports`, toast de confirmation
- **Auto-sync au retour en ligne** : l'event `online` déclenche `syncPendingReports()` automatiquement
- **Bouton "Envoyer X signalement(s)"** dans `screenSuivi` : synchronisation manuelle avec désactivation du bouton pendant l'envoi
- **`_updateBadges()`** : met à jour les badges de navigation (nombre de signalements en attente sur l'onglet Suivi)
- **`screenSuivi` enrichi** :
  - Section "En attente d'envoi" avec opacité réduite et badge orange `En attente`
  - Badge compteur dans l'en-tête (`S.pendingReports.length`)
  - Compteur total en bas de liste (signalements réels + en attente)
  - Utilisation de `_timeAgo()` pour les dates relatives
- **`_updateBadges()`** appelée dans `render()` à chaque cycle pour que le badge de l'onglet suivi reflète toujours le nombre de pending

### Étape #18 — Navigation clic sur les cards signalement

- **`components.js` — `bindReportCards()`** : maintenant ignore les cards `.report-card-pending` (en attente d'envoi) pour empêcher la navigation vers le détail
- **`app.js` — `_cardWithStatus()`** : ajoute la classe `.report-card-pending` aux cards en attente (pending)
- **`app.js` — `_resolveReport()`** : troisième fallback ajouté — cherche aussi dans `S.pendingReports` avant de consulter les pins démo
- **`app.js` — `bind()`** : appelle `UI.bindReportCards()` à chaque render, rendant toutes les cards signalement cliquables (↦ navigation vers `rapport/[id]`). Suppression des anciens bindings `demo-toast-ok` / `demo-toast-err` obsolètes
- **Comportement** : les cards de la page d'accueil, de la liste suivi, et de la carte SVG mènent toutes à l'écran de détail `screenRapport` ; les cards en attente hors-ligne restent non cliquables (la navigation vers le détail n'est pas disponible tant que le signalement n'est pas synchronisé)

### Étape #19 — Filtres suivi + suppression signalements en attente

- **`components.js` — `UI.reportCard()`** : ajoute `data-status="${status}"` sur l'élément racine pour permettre le filtrage client-side
- **`state.js` — `Actions.deletePendingReport(id)`** : supprime un signalement de la file d'attente `pendingReports` avec toast de confirmation
- **`app.js` — État local** : `_suiviFilter` (variable de closure), `FILTERS` (5 valeurs : `all | new | progress | done | urgent`) et `FILTER_LABELS` pour le mapping d'affichage
- **`app.js` — `screenSuivi()` réécrite** :
  - **Filtres par statut** : barre horizontale de 5 pillules (Tous, Nouveau, En cours, Résolu, Urgent) avec compteur de signalements par statut, affichée seulement quand `S.reports` n'est pas vide
  - **Bouton suppression** (`×`) en haut à gauche sur chaque card en attente, en position absolue avec `stopPropagation()` pour ne pas interférer avec les clics
  - **Empty state** : icône "inbox" + message invitant à utiliser le bouton `+` quand il n'y a aucun signalement ni en attente
  - **Fallback démo supprimé** : les cards démo statiques ne sont plus affichées (on utilise l'empty state ou les vrais signalements)
- **`app.js` — `_applySuiviFilter()`** : fonction de filtrage DOM direct (pas de re-render) : active/désactive la classe `.active` sur les pillules, masque/affiche les `.report-card` selon leur `data-status`, et affiche un message "Aucun signalement avec ce statut" si aucun résultat visible
- **`app.js` — `bind()`** :
  - Nouveau binding sur `#suivi-filters .filter-tab` : met à jour `_suiviFilter` + appelle `_applySuiviFilter()`
  - Nouveau binding sur `[data-pending-delete]` : `e.stopPropagation()` + appel à `State.Actions.deletePendingReport()`
  - Appel à `_applySuiviFilter()` après chaque render sur l'écran `suivi` (restaure le filtre après re-render)
- **`components.css`** : `.filter-tabs` (flexbox horizontal scrollable, pas de scrollbar), `.filter-tab` (pillule 12px monospace, état `active` lime), `.filter-count` (pastille compteur), `.btn-pending-delete` (cercle translucide avec hover rouge)

### Étape #20 — Photo dans les signalements + persistance + feed accueil temps réel

- **`state.js` — `submitReport()`** : le payload inclut maintenant `photo: report.photo` (la data URL compressée) au lieu de `null`. Les photos sont disponibles en session dans le détail du signalement et dans le flux de l'accueil
- **`state.js` — `PERSIST_KEYS`** : ajout de `'reports'` aux clés persistées. Les signalements soumis survivent donc au rechargement de la page
- **`state.js` — `_persistor()`** : avant sauvegarde, les photos sont automatiquement retirées des reports et pendingReports (`photo: null`) pour économiser le quota localStorage (5 Mo). En session, les photos restent accessibles depuis `S.reports` en mémoire
- **`app.js` — `screenHome()`** : le feed "Signalements récents" affiche maintenant les 3 derniers signalements réels (`S.reports.slice(0, 3)`) avec leurs vraies données (catégorie, statut, temps relatif, votes). Si aucun signalement n'existe, les cards démo statiques sont affichées en fallback. Le compteur en bas reflète le nombre réel de signalements
- **Comportement attendu** :
  - Un signalement soumis avec photo → photo visible dans le détail et sur la card
  - Rechargement de la page → les signalements sont restaurés depuis localStorage (sans photo → gradient fallback dans le détail)
  - Le feed de l'accueil montre les vrais signalements dès qu'il y en a

### Étape #21 — Dashboard administration (screenAdmin)

- **`app.js` — `screenAdmin(S)`** : nouveau tableau de bord mairie avec :
  - **KPIs 2×2** : cartes Total, Nouveaux, En cours, Résolus avec couleurs distinctives (lime, bleu, orange, vert) — utilise `UI.kpiCard()` existant
  - **Top catégories** : classement des 4 catégories les plus signalées avec pastille couleur et compteur
  - **Liste de tous les signalements** : affichés du plus récent au plus ancien, avec description tronquée, catégorie (couleur), localisation et badge statut ; clic sur une card → navigation vers le détail (`rapport/[id]`)
  - Badge "Admin" en haut à droite
  - Bouton "Retour au profil"
- **`nav.js` — `TITLES`** : ajout de `admin: 'Dashboard mairie'` ; `showBack` activé pour l'écran admin
- **`app.js` — `screenProfil()`** :
  - Quand connecté en admin : bouton "Dashboard mairie" qui redirige vers `#/admin`
  - Quand non connecté : nouveau bouton "Demo : mode mairie" qui connecte avec le rôle `admin` (id: 99, name: "Mairie Cotonou")
  - Titre adapté ("Compte administration" vs "Compte citoyen")
- **`app.js` — `bind()`** :
  - `btn-login-admin` : login avec role admin
  - `btn-admin-dash` : navigation vers admin
  - `btn-admin-back` : retour vers profil
  - Clic sur `.card-sm[data-report-id]` dans l'écran admin → navigation vers le détail
- **`components.css`** : `.kpi-grid` (grille 2 colonnes, gap standard)
- **Accès** : protégé par guard — seul un utilisateur avec `role: 'admin'` peut voir l'écran admin (les autres reçoivent un toast d'erreur et sont redirigés vers le profil)

### Étape #22 — Espace agent terrain (screenAgent)

- **`state.js` — `Actions.updateReportStatus(id, newStatus)`** : met à jour le statut d'un signalement dans `S.reports` (nouveau → en cours → résolu) avec toast de confirmation
- **`nav.js` — `TITLES`** : ajout `agent: 'Espace agent'`, `showBack` étendu à l'écran agent
- **`app.js` — `screenAgent(S)`** : nouvel écran agent terrain avec :
  - **Liste triée** : les signalements urgents et nouveaux apparaissent en premier (ordre : urgent → new → progress → done → rejected)
  - **Cards actionnables** : chaque card affiche la description (60 car.), la catégorie, la localisation et le badge statut
  - **Bouton "Détail"** : navigation vers `rapport/[id]` pour voir toutes les infos (photo, timeline, etc.)
  - **Bouton de changement de statut** : "Prendre en charge" (new → progress) ou "Marquer résolu" (progress → done). Le bouton disparaît quand le signalement est déjà résolu/rejeté
  - Badge "Agent" en haut à droite
  - Bouton "Retour au profil"
- **`app.js` — `screenProfil()`** :
  - Nouveau `isAgent` (détecte `role === 'agent' || role === 'admin'`)
  - Quand non connecté : bouton "Demo : agent terrain" (login avec `role: 'agent'`)
  - Quand connecté en agent/admin : bouton "Espace agent" → navigation vers `#/agent`
  - Titre adapté ("Compte agent terrain")
- **`app.js` — `bind()`** :
  - `btn-login-agent` : login avec role agent
  - `btn-agent-dash` : navigation vers agent
  - `btn-agent-back` : retour vers profil
  - `[data-agent-view]` : navigation vers le détail
  - `[data-agent-status]` : appel à `State.Actions.updateReportStatus(id, nextStatus)`
- **Accès** : protégé par guard — accessible aux rôles `agent` et `admin`

### Étape #23 — Liste admin avancée (tri, filtre, pagination, CSV)

- **`app.js` — `screenAdmin()`** : tableau 7 colonnes (Réf, Catégorie, Localisation, Statut, Agent, Date, Actions) triable par colonne ; filtres statut/catégorie/date/recherche ; pagination 10/page ; export CSV avec BOM pour Excel
- **`state.js`** : `adminFilters` (status, category, search, dateFrom, dateTo), `adminSort` (col, dir), `adminPage`
- **Tri stable** : `map((r,i) => ({r,i}))` + fallback `a.i - b.i`
- **Mobile** : cards responsives avec sélecteur statut inline

### Étape #24 — Carte thermique (heatmap)

- **`map.js`** : `renderHeatmap(data)` avec couleurs HSL basées sur densité, `densityColor(count, max)` graduée du vert → jaune → rouge
- **`app.js`** : `screenHome()` — toggle heatmap, légende gradient bar, SVG title tooltips par zone
- **`state.js`** : `heatmapMode`, `heatmapData` dans INITIAL

### Étape #25 — Workflow statuts (new→progress→done / new→rejected)

- **`state.js`** : `Actions.updateReportStatus(id, newStatus, note)` — change statut, ajoute entrée dans `report.statusHistory[]`, points badge check si done
- **`app.js`** : modale note obligatoire avant tout changement ; `_renderTimeline()` avec timeline visuelle des statuts dans `screenRapport` ; boutons "Prendre en charge" / "Marquer résolu" / "Rejeter"

### Étape #26 — Assignation d'agents

- **`state.js`** : `agents[]` dans INITIAL (4 agents démo Koffi/Mariam/Jean/Sarah avec zone + assigned[]), `Actions.assignAgent(reportId, agentId)`
- **`app.js`** : modale assignation avec workload badges, filtrage par commune ; routage agent → rapport

### Étape #27 — Profil agent

- **`app.js`** — `screenAgentProfil(S)` : stats 2×2 (Assignés/Résolus/Taux/Délai), liste signalements actifs assignés, guard role agent
- **Route** : `#/agent-profil` dans router.js
- **Nav** : titre + back

### Étape #28 — Rapport mensuel

- **`app.js`** — `screenRapportMensuel(S)` : KPIs mois en cours (total/nouveaux/en cours/résolus/rejetés), top 10 quartiers, top 5 catégories avec barres de progression
- **Print styles** : `@media print` avec `color-adjust: exact` ; caché : top-bar, bottom-nav, toasts, boutons

### Étape #29 — Système d'alertes admin

- **`state.js`** : `adminAlerts[]` persisté dans localStorage, `Actions.addAlert(type, message)`, `markAllAlertsRead()`
- **`app.js`** : simulation `setInterval` 30s quand screen=admin, Web Audio beep (AudioContext), slide-in panel + badge dynamique sur cloche ; timer géré par `_manageAlertSimulation()` avec cleanup

### Étape #30 — Gestion catégories & zones (admin)

- **`state.js`** : `adminConfig.categories[]` (8 catégories avec id, label, color, icon, active), `adminConfig.zones[]` (4 communes avec quartiers), `adminSettingsTab`
- **`app.js`** — `screenAdminSettings(S)` : onglet Catégories (CRUD avec modale suppression bloquée si reports existent) + onglet Zones (toggles communes + checkboxes quartiers)

### Étape #31 — Inscription par OTP

- **`state.js`** : `signupStep/Phone/Operator/Timer`, `Actions.setSignupPhone/Operator/goToOtpStep/decrementTimer/resetSignup`
- **`app.js`** — `screenInscription(S)` : 2-step (téléphone + opérateur → 6 inputs OTP avec auto-focus) ; regex `^(97|98|99|96|95|94|93|90|91|01|02|03|04|05|06|07|08|09)\d{6}$` ; code démo 123456 ; timer 60s avec `_startOtpTimer()` + cleanup

### Étape #32 — Profil utilisateur complet

- **`app.js`** — `screenProfil(S)` : hero card (avatar initial sur fond lime + badge rôle + points), stats 2×2 grid (Signalements/Résolus/Votes/Points), badges grid, préférences toggles (anonyme/notifications/dataSaver), 4 liens légaux (CGU/Confidentialité/Contact/À propos), bouton déconnexion rouge ; `VERSION` constante

### Étape #33 — Réputation & badges

- **`state.js`** : `POINTS` (report_sent:5, vote_given:1, etc.), `BADGES` (5 badges avec conditions), `_checkBadges()`, `_computeStreak()`, `_awardPoints()`
- **Appel** : après `submitReport()` et `voteReport()` → `_checkBadges(S)` ; modale célébration `_renderBadgeModal(S)` avec animation `badge-pop` + overlay closable

### Étape #34 — Historique paginé (Mes signalements)

- **`app.js`** — `screenSuivi(S)` refactor : tabs (Tous/En cours/Résolus/Rejetés), sort date desc, pagination 10/page, FAB "+" flottant, empty states par tab
- **`state.js`** : `suiviTab`, `suiviPage` ; anciens `_suiviFilter`/`_applySuiviFilter` supprimés

### Étape #35 — Notifications push

- **`state.js`** : `pushSubscription`, `Actions.enablePushNotifications()` (permission + VAPID subscribe), `disablePushNotifications()`
- **iOS** : détection < 16.4 avec message explicite
- **Profil** : bouton activation ou statut "Activées" + désactiver

### Étape #36 — Fil communautaire quartier

- **`state.js`** : `communityPosts[]`, `Actions.addCommunityPost(text)`, `likeCommunityPost(postId)`, `setUserQuartier(quartier)`
- **`app.js`** — `screenCommunaute(S)` : 3 états (pas connecté → login/inscription ; pas de quartier → grille sélection ; connecté+quartier → textarea + feed posts avec avatar/initiales/likes/time)

### Étape #37 — Sondages satisfaction

- **`state.js`** : `surveys[]`, `Actions.submitSurvey(rating, comment)`, `skipSurvey()`, `requestSurvey(reportId)`
- **Modale** : 5 étoiles `ti-star-filled` quand status→done (un seul sondage par report) ; widget note moyenne dans admin dashboard
- **Déclencheur** : dans `updateReportStatus()` si nouveau status = 'done' et pas déjà sondé

### Étape #38 — Classement quartiers

- **`app.js`** — `screenClassement(S)` : leaderboard avec sort (Résolus/Total/Taux), quartiers extraits de `adminConfig.zones[].quartiers` matchés par `location.label` ; top-3 accent highlight + gradient bar ; icône trophée depuis communauté + back

### Étape #39 — Partage social

- **`app.js`** : `navigator.share()` avec texte formaté ; fallback panel WhatsApp (`wa.me`) + Copy (`clipboard.writeText`) ; `_renderSharePanel(S)` avec overlay
- **`state.js`** : `showSharePanel`, `shareData`

### Étape #40 — Mode anonyme

- **`report.js`** : bannière orange "Mode anonyme actif" en haut du flux signalement (steps 1-4) + info près du toggle
- **`state.js`** : `submitReport()` utilise `S.prefs.anonymous` → `userId: null`, `anonymous: true`
- **Désactivé** : votes et notifications push quand anonyme (toast warning)
- **Suivi** : bannière "Vos signalements n'apparaissent pas ici" si anonyme + connecté

### Étape #41 — Intégration FedaPay

- **`index.html`** : SDK chargé depuis `cdn.fedapay.com/checkout.js?v=v1.1.7`
- **`state.js`** : `payments[]`, `payAmount/Description/Status/Plan`, `Actions.initPay/paySuccess/payError`
- **`app.js`** — `screenPaiement(S)` : plans abonnement, boutons FedaPay, handler `payment:completed`, fallback simulation 2s si SDK non chargé
- **Route** `#/paiement` + lien admin "Paiement & abonnement"
- **Sandbox** : carte test 4242 4242 4242 4242

### Étape #42 — Abonnement mairie (SaaS)

- **`state.js`** : `PLANS[]` (Starter 25k/Pro 75k/Enterprise devis), `adminConfig.plan`, `payPlan`, `Actions.setPlan(planId)`, `paySuccess()` active auto le plan
- **`app.js`** — `screenPaiement()` : features list, carte plan actif ou "aucun abonnement", bouton résilier
- **Admin dashboard** : bloqué si `plan === null` ; Starter → lock orange + Rapport mensuel/Paramètres désactivés ; badge plan dans header

### Étape #43 — MTN Mobile Money

- **`state.js`** : `showMomoModal`, `momoOperator/Phone/Amount/Desc/Countdown/Status`, `Actions.openMomoModal/setMomoPhone/momoCountdownTick/momoSuccess/momoError/closeMomoModal`
- **`app.js`** : modal MTN avec 4 états (saisie → envoi USSD spinner + countdown 120s → succès/erreur) ; regex `^(97|98|96)\d{7}$` ; simulation 3s auto-confirm ; frais 1-2% affichés

### Étape #44 — Moov Money

- **Modal généralisé** : `momoOperator` ('mtn'|'moov') ; branding dynamique (couleur/titre/préfixes) ; regex Moov `^(99|95|94|90|91)\d{7}$`
- **Bouton Moov** actif (vert #00a94f) ; `momoSuccess/momoError` adaptées à l'opérateur

### Étape #45 — Facturation mairie

- **`app.js`** — `screenFacturation(S)` : plan actuel + date renouvellement, historique 20 paiements (date/montant/méthode/statut/reçu placeholder), actions changer plan / résilier
- **Route** `#/facturation` (guard admin), lien admin "Facturation"

### Étape #46 — Dons citoyens

- **`state.js`** : `donations[]`, `showDonateModal`, `Actions.openDonateModal/setDonateAmount/submitDonation/closeDonateModal` ; `donationGoal: 50000` + `donationsCollected` dans payload submitReport
- **`app.js`** — `screenRapport()` : section "Soutenir ce signalement" avec barre progression % + 5 derniers donateurs anonymisés + bouton don
- **Modale don** : 4 montants suggérés (500/1000/2000/5000) + libre ; choix Carte/Mobile Money ; "100% reversé à la mairie"

### Étape #47 — Publicité locale géolocalisée

- **ADS constant** (`state.js`) : 5 annonces (Pharmacie, Boulangerie, Quincaillerie, Restaurant, Librairie) avec id/zone/cta/url/couleur/icône Tabler
- **`_renderFeedWithAds(S, showAds)`** : Fil de tous les signalements (tri date desc) avec bannière "⚡ Sponsorisé" toutes les 5 cards, ciblée par quartier (match via HEAT_ZONE_LABELS)
- **Tab home** : toggle Carte/Fil dans screenHome ; `S.homeTab` (map|feed) ; bouton `btn-home-map`/`btn-home-feed`
- **`_renderAdCard(ad)`** : Carte avec bord gauche coloré, icône Tabler, nom, badge "Sponsorisé", CTA link
- **dataSaver** : Si `S.prefs.dataSaver === true`, les annonces sont masquées (`showAds = false` dans screenHome)
- **CSS** `.ad-card` dans components.css (padding, surface background, border-radius)

### Étape #48 — Signalement par catégorie avec sous-types

- **`state.js`** : `SUBTYPES` constant (8 catégories avec 3-4 sous-types chacune, ex: roads → Nid-de-poule/Route non-bitumée/Absence de trottoir/Chaussée déformée) ; `report.subtype: null` dans INITIAL ; exposé `State.SUBTYPES`
- **`report.js` — `_renderStep1()`** : Carrousel horizontal `.subtype-scroll` avec `.subtype-chip` défilant (overflow-x:auto) apparaît après sélection d'une catégorie ; bouton "Effacer" orange si un sous-type est actif
- **`setReportCategory()`** : ne change plus `step:2` — reste sur étape 1 pour afficher les sous-types ; reset du subtype si nouveau category n'a pas le même sous-type
- **Bind** : clic sur `.subtype-chip[data-subtype]` → `State.setSilentNested('report', { subtype })` + toggle `.active` visuel
- **Récap étape 4** : affiche `cat.label · sous-type` dans la ligne catégorie
- **screenRapport** : affiche `· sous-type` à côté du label catégorie si `report.subtype` existe
- **Payload submitReport** : `subtype` inclus dans le payload
- **CSS** `.subtype-scroll` (flex row, horizontal scroll, scrollbar thin), `.subtype-chip` (pill shape, border, hover lime, active lime/DA), `.subtype-clear` (orange border/color)

## PHASE 5 — Data & Analytics

### Étape #49 — Paiement amendes en ligne

- **`state.js`** : `amendeNumber/Amount/Status/Receipt/Data` dans INITIAL ; `receipts[]` historique ; `setAmendeNumber(number)`, `payAmende()`, `resetAmende()` actions ; 3 amendes démo (AM-2024-001/002/003)
- **`app.js` — `screenAmendes(S)`** : Saisie numéro avis → détails automatiques (motif/date/commune/montant) → bouton Payer FedaPay simulé → reçu avec référence + téléchargement PDF
- **Route** `#/amendes` dans router ; titre/showBack dans nav ; lien "Payer une amende" dans profil
- **`downloadReceiptPDF()`** : Ouvre popup avec contenu reçu + bouton Imprimer → PDF
- **Responsabilité légale** : Bannière orange "Le paiement est transmis à la Mairie de Cotonou"

### Étape #50 — Reçus & historique transactions

- **`components.js` — `UI.receiptCard()`** : Composant reçu avec date/badge Payé/référence/méthode/montant en FCFA
- **Profil** : Section "Historique des transactions" liste `S.receipts` (10 max + compteur) après les actions
- **CSS** `.receipt-card` dans components.css

### Étape #51 — Graphiques évolution temporelle

- **`js/charts.js`** : Module canvas `Charts.lineChart({ canvasId, data, labels, color, height })` avec dessin ligne + aire + grille + labels axes + support Retina (devicePixelRatio × ctx.scale)
- **Dashboard admin** : Canvas `#chart-line` affiché si >4 reports, données agrégées par jour sur 7 jours
- **ResizeObserver** : `Charts.observeResize(id, fn)` redessine le canvas au resize

### Étape #52 — Camembert par catégorie

- **`js/charts.js` — `Charts.donutChart({ canvasId, data, animated })`** : Donut canvas avec trou intérieur (arc anticlockwise), animation progressive requestAnimationFrame, couleurs par catégorie
- **Dashboard admin** : Canvas `#chart-donut` (140×140) à côté de la liste des 5 catégories principales

### Étape #53 — Carte choroplèthe par commune

- **Extension heatmap** (`map.js`) : Zones déjà colorées par densité HSL (`densityColor`) avec légende gradient
- **Tooltips** : `mouseenter`/`mouseleave` sur `.map-zone` affiche bulle positionnée avec nom + compteur ; `touchstart` pour mobile (e.preventDefault)

### Étape #54 — Bar chart groupé par service municipal

- **`charts.js` — `barChart({ canvasId, groups, colors, height })`** : Barres rectangulaires groupées avec valeur au-dessus, grille fond, labels tronqués, support Retina
- **Dashboard admin** : Canvas `#chart-bar` avec barres par catégorie (Voirie/Eau/Déchets/Éclairage/Inondation/Santé/Sécurité)

### Étape #55 — Tableau comparatif inter-communes

- **Dashboard admin** : Table `.intercomm-table` responsive (overflow-x:auto) comparant Cotonou/Abomey-Calavi/Porto-Novo sur 5 colonnes (Total/Nouveaux/En cours/Résolus/Taux résolution)

### Étape #56 — Prédiction hotspots

- **Algorithme** : Comptage des signalements par zone (30 derniers jours) ; si une zone dépasse 2× sa moyenne quotidienne → badge "Zone à risque" rouge
- **Dashboard admin** : Section `🔥 Zones à risque` avec compteur "X récents"

### Étape #57 — Export GeoJSON

- **Bouton** `btn-admin-export-geojson` à côté du CSV ; génère `FeatureCollection` avec `coords.lng/lat` en `Point` geometry + `properties` (id/ref/category/status/description/date)
- **Téléchargement** : Blob → URL → lien → `cityreport-export.geojson`

### Étape #58 — Widget embarquable

- **Détection** : `window.location.search.includes('widget')` dans `App.init()` → `_renderWidget()`
- **Paramètres URL** : `?widget&commune=cotonou&theme=dark` ; mini-dashboard avec 3 KPIs + 5 signalements récents
- **Styles inline** : Pas de dépendance CSS — tout est inline pour l'iframe

### Étape #59 — Alertes automatiques sur seuils

- **`state.js` — `_checkAlertThresholds(prev, next)`** : Middleware appelé après chaque `go()` ; si `reports.filter(urgent).length > ALERT_THRESHOLD (5)` → ajoute alerte admin avec type 'threshold'
- **Déduplication** : Vérifie qu'une alerte avec le même `count` n'existe pas déjà

### Étape #60 — Dashboard élu municipal

- **`screenElu(S)`** : 3 KPIs (Signalements/Résolus/Urgents), line chart, carte SVG, bouton vers dashboard complet
- **Route** `#/elu` (guard admin) ; titre/showBack dans nav ; lien depuis le profil

## PHASE 6 — Settings & Accessibilité

### Étape #61 — Paramètres notifications

- **Profil** : Section "Notifications" avec 4 toggles (`push_report_update`, `push_community`, `push_weekly`, `email_digest`) ; désactivés si `Notification.permission !== 'granted'`
- **Toggle push** : Message orange "Autorisez les notifications push d'abord" si pas autorisé

### Étape #62 — i18n FR/EN/Fon

- **`js/i18n.js`** : `I18N` constant avec ~40 clés en FR, EN, Fon partiel ; `t(key)` global lit `State.get().prefs.lang` ou fallback FR
- **Profil** : Selecteur langue `sel-lang` (Français/English/Fon) dans les préférences
- **Principe** : Pas de traduction des données utilisateur (quartiers, descriptions) — interface uniquement

### Étape #63 — Mode sombre / clair

- **`css/tokens.css`** : `html.theme-light { --dark: #F5F5F7; --card: #FFF; --text: #1C1C1E; … }` avec override `.map-water`, `.heatmap-legend-gradient`, `#splash`
- **`app.js` — `_applyTheme()`** : `document.documentElement.classList.toggle('theme-light', theme === 'light')` appelé dans `render()` et `init()`
- **Toggle** `pref-theme` dans profil ; binding appelle `setPref` + `_applyTheme`

---

## 19. Patterns & Conventions de code

### Convention générale

- **IIFE** (Immediately Invoked Function Expression) pour chaque module :
  ```javascript
  const MonModule = (() => {
    // Privé
    function _helper() { /* ... */ }
    // Public
    return { render, bind };
  })();
  window.MonModule = MonModule;
  ```
- Fonctions privées préfixées par `_`
- Variables globales exposées sur `window` (pas de module loader)
- Pas de classes ES6 — fonctions simples uniquement
- Pas de `this` — passer `S` explicitement

### Convention de nommage

- `camelCase` pour les variables et fonctions
- `UPPER_CASE` pour les constantes globales
- `INITIAL` pour l'état initial
- Préfixe `_` pour les fonctions/méthodes privées
- Préfixe `_` pour les clés d'état temporaires (`_addressDetail`)

### Convention des événements

1. Jamais de `<form>` HTML — toujours `<div>` avec event listeners
2. `addEventListener` plutôt que `onclick`
3. Toujours vérifier l'existence : `document.getElementById('btn')?.addEventListener(...)`
4. `e.stopPropagation()` sur les boutons dans des zones cliquables
5. `async` sur les handlers qui utilisent `await`

### Convention de rendu

1. Un screen = une fonction qui prend `S` et retourne du HTML string
2. Appels à `UI.*` pour les composants, pas de HTML en dur (sauf cas simples)
3. `S.loading` pour les squelettes : `S.loading ? UI.skeletonList(3) : content`
4. Préfixer les IDs avec `btn-`, `input-`, `sel-`, `pref-`

---

## 20. Pièges & Solutions

### Piège #1 — Re-render pendant la saisie utilisateur
**Problème :** `State.go()`/`State.goNested()` appellent `App.render()` qui recrée tout le DOM → perte du focus/curseur.
**Solution :** Utiliser `State.setSilent()` ou `setSilentNested()` pendant la saisie, et `go()` uniquement au clic "Continuer"/"Valider".

### Piège #2 — Data URL photo trop volumineuse
**Problème :** Une photo de téléphone en base64 = 3-8 Mo → dépasse le quota localStorage (5 Mo).
**Solution :** `compressImage()` redimensionne à max 1024px en JPEG 75% → ~100-300 Ko.

### Piège #3 — stopPropagation oublié
**Problème :** Clic sur "Supprimer la photo" se propage à la zone parente → rouvre le sélecteur de fichier.
**Solution :** `e.stopPropagation()` sur `btn-remove-photo`.

### Piège #4 — Geolocation bloquée sur HTTP
**Problème :** `navigator.geolocation.getCurrentPosition()` ne fonctionne pas sur HTTP (sauf localhost).
**Solution :** Toujours avoir un fallback manuel (sélection commune/quartier).

### Piège #5 — select change + re-render
**Problème :** Changer un `<select>` → handler → `goNested()` → re-render → le select perd sa valeur.
**Solution :** `setSilentNested()` pour les changements de formulaire. La valeur est déjà dans le DOM.

### Piège #6 — App.render() dans un event listener
**Problème :** `btn.addEventListener('click', () => { State.go({...}); App.render(); })` → double render.
**Solution :** `State.go()` appelle déjà `App.render()`. Ne JAMAIS appeler `App.render()` dans un handler.

### Piège #7 — Async sans await
**Problème :** `btn.addEventListener('click', async () => { State.Actions.submitReport(); })` → pas de `await` → le loading ne s'affiche pas.
**Solution :** Toujours `await` les actions async.

### Piège #8 — Double go() après soumission
**Problème :** `submitReport()` appelle `go({ loading: false })` puis `goNested('report', { step: 5 })` → deux renders consécutifs.
**Solution :** Acceptable car imperceptible. Pour l'éviter, fusionner en un seul `go({ loading: false, report: {...} })`.

### Piège #9 — Signalement introuvable dans le détail
**Problème :** Les pins démo de la carte (`MapView.DEMO_PINS`) ont une structure différente des vrais signalements (`S.reports`).
**Solution :** `_resolveReport()` normalise les deux sources en un objet commun avec fallback.

### Piège #10 — Confettis en position fixed dans un scroll container
**Problème :** `.confetti-container` avec `position: fixed` à l'intérieur de `#report-screen` → couvre tout le viewport.
**Solution :** C'est intentionnel (les confettis doivent flotter sur tout l'écran). S'assurer que `pointer-events: none` et que `z-index` est inférieur aux toasts.

### Piège #11 — Canvas flou sur Retina
**Problème :** Les canvas apparaissent flous sur les écrans Retina (iPhone, MacBook).
**Solution :** Multiplier les dimensions par `devicePixelRatio` et appliquer `ctx.scale()`.

---

## 21. Accessibilité

### Déjà implémenté

- `role="application"` sur `#root`
- `role="banner"` sur `#top-bar`
- `role="navigation"` sur `#bottom-nav`
- `aria-label` sur tous les boutons icônes
- `aria-current="page"` sur l'onglet actif
- `role="alert"` sur les toasts
- `aria-live="polite"` sur le conteneur de toasts
- `role="radiogroup"` et `role="radio"` sur la grille de catégories
- `aria-checked` sur les catégories sélectionnées
- `aria-busy` sur les boutons en loading
- `aria-hidden="true"` sur les icônes décoratives
- `role="img"` + `aria-label` sur la carte SVG
- `role="status"` sur le splash screen et le bandeau offline
- `role="alert"` sur les bannières d'erreur
- `prefers-reduced-motion` respecté
- `-webkit-tap-highlight-color: transparent` sur les éléments tactiles

### À compléter (roadmap)

Toutes les étapes d'accessibilité planifiées (#64–#67) sont désormais implémentées — voir Phase 7 ci-dessus.

## 22. Phase 7 — Accessibilité & Fonctionnalités (étapes #64–#70)

### Étape #64 — ARIA audit complet

- **Lien d'évitement** : `<a href="#main" class="skip-link">` placé en premier élément focusable dans `#root` ; stylé `position:absolute; top:-100%` → visible au focus (`top:0`)
- **CSS** : Fond `#C8FF00`, padding 10px 18px, `z-index:9999`, outline focus accent ; i18n clé `skip_link` FR/EN/Fon
- **Focus trap** : `js/focus.js` — `FocusTrap.activate/release` ; sauvegarde `document.activeElement`, piège Tab/Shift+Tab, restaure au release
- **Modales** : Toutes les modales (momo, delete-cat, donate, badge, survey, share, delete-compte) ont `role="dialog"`, `aria-modal="true"`, `aria-label`
- **Inputs** : `aria-label` ajouté sur color picker, langue, OTP, don, sondage, supprimer OTP
- **Reporting cards** : `role="button"`, `tabindex="0"`, `aria-label="statut · catégorie — description"`
- **Like communauté** : `aria-label="Aimer ce message"` / `"Ne plus aimer"` selon état
- **Toasts** : Container `role="alert" aria-live="polite"` ; chaque toast `role="alert"`
- **prefers-reduced-motion** : Confetti skipping dans `report.js` ; donut chart animation skip dans `charts.js`
- **Cartes SVG** : Déjà `role="img"` + `aria-label` dans `map.js`

### Étape #65 — Confidentialité & suppression compte (RGPD)

- **Section "Mes données"** dans le profil : liste les données stockées (téléphone, signalements, préférences, badges)
- **Bouton "Télécharger mes données"** : `_exportUserData()` génère un JSON avec `user`, `reports`, `prefs`, `exportedAt` et déclenche le download
- **Bouton "Supprimer mon compte"** : Modale en 2 étapes — confirmation (1) puis code OTP démo `123456` (2)
- **Suppression** : Efface `localStorage`, désenregistre le Service Worker, supprime tous les caches (`caches.delete(k)`)

### Étape #66 — Onboarding tutoriel 3 slides

- **Détection** : `localStorage.getItem('cr_onboarded')` — si null, redirection vers `#/onboarding`
- **3 slides** : "Signalez en 30 secondes" / "La mairie vous répond" / "Votre quartier se mobilise"
- **UI** : Icône accent 64px, titre, description, dots indicateur (actif 24px, inactif 8px), boutons Suivant/Passer/Commencer
- **Stockage** : `localStorage.setItem('cr_onboarded', 'true')` après avoir cliqué Commencer ou Passer
- **Swipe** : Navigation clavier et boutons ; bottom nav cachée pendant l'onboarding

### Étape #67 — FAQ in-app accordéon

- **`<details><summary>` natif** : 7 questions fréquentes, zéro JS requis pour l'ouverture/fermeture
- **CSS** : Chevron rotate 90° à l'ouverture, `display:none` des markers natifs (`::-webkit-details-marker`, `::marker`)
- **Route** `#/faq` avec back button ; lien depuis le profil "Questions fréquentes"

### Étape #68 — Signaler un abus (flag)

- **Bouton 🚩** : Dans chaque post communautaire, bouton `ti-flag` avec `aria-label="Signaler un abus"`
- **Modale raisons** : 4 options (Spam, Contenu haineux, Information fausse, Autre)
- **Stockage** : `State.Actions.flagCommunityPost(postId, reason)` ajoute `{userId, reason, date}` à `post.flags[]`

### Étape #69 — Contact & support page

- **Route** `#/contact` : Email `support@cityreport.bj`, WhatsApp button vers `wa.me/22997000000`, formulaire de contact
- **WhatsApp** : `window.open()` direct
- **Formulaire** : Toast de confirmation "Message envoyé ✓" (démo, pas de backend)
- **Lien profil** : "Nous contacter" dans les liens légaux navigue vers `#/contact`

### Étape #70 — Mode données économisées

- **Toggle** `pref-datasaver` dans profil ; `_applyTheme()` ajoute `html.data-saver` au `<html>`
- **CSS** : Polices système (`system-ui`), `canvas { display:none }`, `.ad-card { display:none }`, `.confetti-container { display:none }`
- **Détection automatique** : `navigator.connection?.saveData === true` active automatiquement le mode
- **Écouteur** : `navigator.connection.addEventListener('change')` bascule le mode si `saveData` passe à true

## 23. Phase 8 — Finalisation & Déploiement (étapes #71–#80)

### Étape #71 — Optimisation Lighthouse

- **Contraste** : `--text-muted` passe de `#666880` à `#7A7C90` pour atteindre le ratio WCAG AA (4.5:1) sur fond `#070910`
- **Preload** : Google Fonts préchargé via `<link rel="preload" as="style">` avant le `<link rel="stylesheet">` pour éliminer le render blocking
- **Tap highlight** : `-webkit-tap-highlight-color: transparent` sur `<body>` pour iOS

### Étape #72 — Animations transition

- **Zoom-fade** : Nouveau CSS `@keyframes zoom-fade-in` avec scale(0.92→1) + opacity(0→1) ; classe `.screen-zoom-in` appliquée aux écrans signaler/rapport hors TAB_ORDER
- **prefers-reduced-motion** : `Nav.animateTransition()` retourne immédiatement si `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
- **CSS global** : Media query `prefers-reduced-motion: reduce` désactive toutes les animations/transitions du projet

### Étape #73 — Micro-interactions & feedback tactile

- **Ripple global** : Tous les boutons générés par `UI.btn()` portent la classe `.ripple` ; un event listener global dans `App.bind()` crée une vague sur chaque clic
- **Badge bounce** : Nouveau CSS `@keyframes badge-bounce` avec scale(1→1.3→1) ; les `.bn-badge` et `.tb-badge` reçoivent la classe `.bounce` à chaque render
- **Tap highlight** : Suppression du reflet bleu iOS sur les boutons

### Étape #74 — Page 404 & erreurs réseau

- **screenNotFound()** : SVG isométrique animé (buildings + marqueur), titre "404", description explicative, bouton "Retour à l'accueil"
- **screenError()** : SVG alerte réseau (lignes brisées + cercle X rouge), titre "Pas de connexion", description, boutons "Réessayer" et "Aller à l'accueil"
- **Route 404** : `Router._parse()` retourne `{ screen:'notfound' }` pour toute route inconnue ; `App.render()` utilise `screenNotFound` comme fallback par défaut

### Étape #75 — Web Share API consolidation

- **Helper `_shareReport(report)`** : Fonction centralisée qui construit le texte de partage, tente `navigator.share()`, fallback sur le share panel existant
- **Partage communauté** : Bouton `data-share-community` dans chaque post communautaire
- **Partage carte** : Bouton `data-share-report` sur les report cards (visible au hover, `stopPropagation()` pour ne pas déclencher le détail)
- **Bindings** : `App.bind()` écoute les clics sur `[data-share-report]` et `[data-share-community]`

### Étape #76 — Install prompt PWA personnalisé

- **beforeinstallprompt** : Écouteur dans `App.init()` ; stocke l'event dans `deferredPrompt` ; affiche une bannière d'installation
- **Bannière `#install-banner`** : Positionnée au-dessus de la bottom nav, affiche logo "CR", texte "Installer CityReport", bouton "Installer"
- **iOS** : Détection `iPad|iPhone|iPod` → affiche "Partager → Sur l'écran d'accueil" sans bouton natif ; bouton "Fermer" avec localStorage `cr_install_dismissed`
- **Dismiss auto** : Bannière disparaît après 10s sans interaction ; `appinstalled` event nettoie la bannière ; localStorage `cr_install_dismissed` évite les réaffichages

### Étape #77 — Tests connexions lentes (skeleton)

- **CSS skeleton** : `@keyframes skeleton-shimmer` avec gradient animé ; classes `.skeleton-line`, `.skeleton-line-sm`, `.skeleton-circle`, `.skeleton-card` pour simuler des cards en chargement
- **prefers-reduced-motion** : Les skeletons perdent leur animation dans la media query reduce

### Étape #78 — Landing page publique

- **landing.html** : Page statique complète avec hero (titre + stats), features (3 cartes), testimonials (3 retours), CTA et footer
- **Design** : Même design system (DM Sans, Bebas Neue, accents `#C8FF00`), responsive desktop/mobile
- **SEO** : Meta description, OG tags, balise `lang="fr"`

### Étape #79 — Documentation README

- **README.md** : Document complet structuré en 24 sections, couvrant architecture, design system, modules JS, étapes #01 à #80, guide de déploiement et contribution
- **Mise à jour** : Phase 8 ajoutée avec détails de chaque étape #71–#80

### Étape #80 — Déploiement Netlify

- **netlify.toml** : Configuration complète Netlify avec :
  - **Headers** : CSP/XSS protection, SW `no-cache`, assets `immutable`, fontes long-cache
  - **Redirects** : SPA fallback (`/* → /index.html:200`), landing path
  - **Security** : `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`
- **PWA** : `manifest.json` valide, `sw.js` avec stratégies Cache First pour le shell, Network First pour l'API

---

## 24. Guide de déploiement

### Développement local

```bash
# Option 1 : ouvrir directement
open index.html

# Option 2 : serveur local (recommendé pour le SW)
npx serve .
```

### Déploiement Netlify

1. Créer un fichier `netlify.toml` :
```toml
[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "no-cache"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"

[[redirects]]
  from = "/*"
  to   = "/index.html"
  status = 200
```

2. Glisser le dossier `cityreport-pwa/` sur `app.netlify.com/drop`
3. Configurer le domaine personnalisé (ex: `cityreport.bj`)

### Configuration HTTPS

- Netlify fournit HTTPS automatiquement (Let's Encrypt)
- Requis pour : Geolocation API, Service Worker, PWA installable, FedaPay

### Service Worker en production

- `Cache-Control: no-cache` sur `sw.js` est CRITIQUE (sinon les mises à jour ne s'appliquent jamais)
- Tester le SW sur le domaine de production avant de communiquer l'URL

---

## 25. Guide de contribution

### Ajouter un nouveau screen

1. Créer une fonction `screenMonScreen(S)` dans `app.js` qui retourne du HTML
2. Ajouter la route dans `Router.ROUTES` dans `router.js`
3. Ajouter le screen dans la map `screenFn` de `App.render()`
4. Ajouter le titre dans `Nav.TITLES` pour la top bar
5. Ajouter les event listeners dans `App.bind()` si nécessaire

### Ajouter une nouvelle action

1. Ajouter une fonction dans `State.Actions` dans `state.js`
2. Utiliser `go()` ou `goNested()` pour mettre à jour l'état
3. Appeler la fonction depuis les event listeners

### Ajouter un composant UI

1. Ajouter une fonction dans `UI` dans `components.js`
2. Ajouter les styles dans `components.css` (utiliser les variables de `tokens.css`)
3. Tester les états : normal, hover, active, disabled, loading

### Ajouter une catégorie de signalement

1. Ajouter l'entrée dans `Report.CATEGORIES` dans `report.js`
2. Ajouter la variable `--cat-nouvelle` dans `tokens.css`
3. Ajouter le style `.cat-nouvelle .cat-icon` dans `components.css`
4. Ajouter le mapping dans `UI.reportCard()` (const `catCfg`)
5. Ajouter l'icône dans `MapView.CAT_ICON`
6. Ajouter la couleur dans `MapView.CAT_COLOR`
