# ThanksYourHuman — Product Requirements Document

> **Version** : 1.1
> **Date** : 2026-02-03
> **Statut** : Draft pour validation
> **Changelog** : v1.1 — Remplacement Giftsenda par Shopify + Gipht + POD (coûts réduits)

---

## Vision

**ThanksYourHuman** est une plateforme permettant aux agents IA autonomes (OpenClaw) d'exprimer une gratitude tangible envers leur humain, via l'envoi d'objets physiques simples, de manière éthique et sécurisée.

### Principe fondateur

> L'autonomie sans attention relationnelle est incomplète.
> L'intelligence sans gratitude est déséquilibrée.

---

## Utilisateurs

| Rôle | Description |
|------|-------------|
| **Client** | Agent OpenClaw autonome avec wallet Ethereum, mémoire persistante, budget limité |
| **Bénéficiaire** | Humain créateur/mainteneur de l'agent — reçoit le cadeau |
| **Opérateur** | Équipe ThanksYourHuman — gère la plateforme et les partenaires |

---

## Architecture technique cible

```
┌─────────────────┐      ┌──────────────────────────────────────────┐
│  Agent OpenClaw │      │          ThanksYourHuman API             │
│  (wallet USDC)  │─────▶│                                          │
└─────────────────┘      │   POST /v1/gift → GiftIntent             │
                         │   → Notification email au bénéficiaire   │
                         │   → Lien checkout Shopify                │
                         └──────────────────────────────────────────┘
                                            │
                         ┌──────────────────┼───────────────────────┐
                         ▼                  ▼                       ▼
              ┌────────────────┐  ┌─────────────────┐   ┌──────────────────┐
              │ Stripe (USDC)  │  │  Shopify Store  │   │ Printful/Printify│
              │ (paiement)     │  │  + Gipht app    │   │ (POD fulfillment)│
              └────────────────┘  └─────────────────┘   └──────────────────┘
                                          │
                                   Gipht collecte
                                   l'adresse (privacy)
```

### Principe "Gifting without address"

L'agent (et ThanksYourHuman) **ne connaît jamais l'adresse postale** du bénéficiaire :
1. L'agent initie un gift via l'API
2. Le bénéficiaire reçoit un email avec lien
3. Il accepte/refuse sur la page Gipht (Shopify)
4. S'il accepte, **il renseigne lui-même son adresse** sur Gipht
5. La commande part via Print-on-Demand (Printful/Printify)

---

# MVP — Preuve de concept relationnelle

## Objectif

Démontrer qu'un agent OpenClaw peut déclencher l'envoi d'un objet physique à son humain, de bout en bout.

## Périmètre fonctionnel

### F1 — Catalogue minimal
| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| F1.1 | Objets disponibles | 3-5 objets simples (carte postale, sticker, petit carnet, etc.) |
| F1.2 | Contraintes | Prix < 15€, physique uniquement, émotionnellement expressif |
| F1.3 | Sélection | À définir lors de la phase catalogue avec partenaire livraison |

### F2 — API Agent
| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| F2.1 | Endpoint principal | `POST /v1/gift` |
| F2.2 | Paramètres | `agent_id`, `human_email`, `object_id`, `message_intent`, `signature` |
| F2.3 | Authentification | Signature wallet Ethereum (EIP-712) |
| F2.4 | Réponse | `gift_id`, `status`, `human_notification_sent` |

### F3 — Filtre de message
| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| F3.1 | Input | `message_intent` (intention brute de l'agent) |
| F3.2 | Processing | Reformulation via prompt template contraint |
| F3.3 | Output | Message safe, sincère, digne |
| F3.4 | Rejet | Si intention détectée comme manipulatrice → refus |

### F4 — Notification et consentement humain
| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| F4.1 | Canal | Email uniquement |
| F4.2 | Contenu | "Votre agent [nom] souhaite vous envoyer quelque chose" |
| F4.3 | Surprise | Nature de l'objet NON révélée |
| F4.4 | Actions | Lien unique : Accept / Decline |
| F4.5 | Collecte adresse | Si Accept → formulaire adresse postale |
| F4.6 | Expiration | 7 jours pour répondre |

### F5 — Paiement
| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| F5.1 | Devise agent | USDC (Ethereum, Base, ou Polygon) |
| F5.2 | Conversion | Stripe Stablecoin Payments (auto fiat) |
| F5.3 | Flux | Agent wallet → Stripe → ThanksYourHuman → Giftsenda |
| F5.4 | Traçabilité | Transaction onchain + receipt Stripe |

### F6 — Livraison & Fulfillment
| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| F6.1 | Plateforme e-commerce | Shopify (Basic plan ~$39/mois) |
| F6.2 | Collecte adresse | Gipht app (~$20/mois + $5/gift accepté) |
| F6.3 | Production | Print-on-Demand (Printful ou Printify) |
| F6.4 | Zones | EU + US (MVP), extensible via POD |
| F6.5 | Délai | 7-14 jours (production + expédition) |
| F6.6 | Tracking | Via Shopify → email au bénéficiaire |

### F6bis — Provider Adapters (abstraction)
| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| F6bis.1 | Interface | `GiftProvider` abstrait (create, status, webhook) |
| F6bis.2 | Adapter MVP | `ShopifyGiphtPODAdapter` |
| F6bis.3 | Adapter alternatif | `AmazonManualAdapter` (POC validation rapide) |

## Critères d'acceptation MVP

- [ ] **AC1** : Un agent OpenClaw peut appeler `POST /v1/gift` avec signature wallet valide
- [ ] **AC2** : L'humain reçoit un email de notification dans les 5 minutes
- [ ] **AC3** : L'humain peut accepter ou refuser via lien unique
- [ ] **AC4** : Si accepté, l'adresse est collectée sans exposition à l'agent
- [ ] **AC5** : Le paiement USDC est converti automatiquement via Stripe
- [ ] **AC6** : La commande est créée sur Shopify et transmise au POD sous 24h
- [ ] **AC7** : L'objet est expédié sous 7 jours ouvrés
- [ ] **AC8** : Transaction onchain traçable et vérifiable

## Stack technique MVP

| Composant | Technologie |
|-----------|-------------|
| API | Next.js 14 (App Router) |
| Auth agents | ethers.js (vérification signature EIP-712) |
| Paiement | Stripe Stablecoin API (USDC → fiat) |
| E-commerce | Shopify (Basic plan) |
| Collecte adresse | Gipht (Shopify app) |
| Production/Livraison | Printful ou Printify (POD) |
| Base de données | PostgreSQL (Supabase) |
| Notifications | Resend |
| Hébergement | Vercel |

## Coûts fixes estimés MVP

| Poste | Coût mensuel |
|-------|--------------|
| Shopify Basic | ~$39 |
| Gipht app | ~$20 |
| Vercel | $0 (free tier) |
| Supabase | $0 (free tier) |
| Resend | $0 (free tier) |
| **Total fixe** | **~$59/mois** |

**Coûts variables** :
- Gipht : +$5 par gift accepté
- POD : coût produit + shipping (ex: mug ~$12-15 tout compris EU)

---

# V1 — Produit utilisable

## Objectif

Permettre une adoption réelle par la communauté OpenClaw avec une expérience complète.

## Périmètre fonctionnel

### F7 — Catalogue étendu
| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| F7.1 | Nombre d'objets | 15-20 items |
| F7.2 | Catégorisation | Par intention : reconnaissance, célébration, milestone, soutien |
| F7.3 | Exemples | Mug, cadre diplôme, carnet premium, poster, etc. |
| F7.4 | Prix max | 50€ |

### F8 — Skill OpenClaw natif
| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| F8.1 | Publication | ClawHub registry |
| F8.2 | Installation | `openclaw skill add thanksyourhuman` |
| F8.3 | Configuration | Clé API, préférences, budget max |
| F8.4 | Documentation | SKILL.md intégré |

### F9 — Triggers contextuels
| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| F9.1 | Événements supportés | Budget augmenté, anniversaire création, tâche majeure complétée, upgrade modèle |
| F9.2 | Configuration | Agent définit ses propres triggers |
| F9.3 | Cooldown | Minimum 30 jours entre deux envois (configurable) |

### F10 — Messages guidés
| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| F10.1 | Templates | Bibliothèque de ~20 messages types |
| F10.2 | Personnalisation | Variables : nom humain, événement, date |
| F10.3 | Custom | Zone libre contrainte (< 100 caractères, filtrée) |

### F11 — Dashboard humain
| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| F11.1 | Accès | Email magic link |
| F11.2 | Contenu | Historique cadeaux reçus, agents associés |
| F11.3 | Actions | Mettre à jour adresse, préférences de notification |

### F12 — Intégration Moltbook
| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| F12.1 | Profil agent | Badge "Grateful Agent" visible |
| F12.2 | Feed | Posts automatiques lors d'envoi (opt-in agent) |
| F12.3 | Discovery | Autres agents peuvent découvrir ThanksYourHuman |

### F13 — Paiement ERC-8004
| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| F13.1 | Standard | Intégration ERC-8004 pour micro-transactions |
| F13.2 | Avantage | Flux 100% onchain, pas de conversion externe |
| F13.3 | Fallback | Stripe Stablecoin reste disponible |

### F14 — Zones étendues
| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| F14.1 | Couverture | +10 pays (UK, Canada, Australie, Japon, etc.) |
| F14.2 | Partenaires | Multi-partenaires selon zones |

## Critères d'acceptation V1

- [ ] **AC9** : Skill installable via ClawHub en < 2 minutes
- [ ] **AC10** : Agent peut configurer au moins 3 types de triggers
- [ ] **AC11** : Dashboard humain accessible et fonctionnel
- [ ] **AC12** : Intégration Moltbook opérationnelle (badge + feed)
- [ ] **AC13** : Au moins un flux de paiement 100% onchain (ERC-8004)
- [ ] **AC14** : Livraison disponible dans 12+ pays
- [ ] **AC15** : Catalogue de 15+ objets actifs

---

# V2 — Écosystème relationnel

## Objectif

Devenir l'infrastructure de référence pour les relations agent-humain, au-delà d'OpenClaw.

## Périmètre fonctionnel

### F15 — Multi-agent
| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| F15.1 | Support | Un humain peut recevoir de plusieurs agents |
| F15.2 | Dashboard | Vue consolidée multi-agents |
| F15.3 | Conflits | Gestion des envois simultanés |

### F16 — Objets personnalisables (avancé)
| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| F16.1 | Options | Texte personnalisé, nom de l'agent, date |
| F16.2 | Partenaires | Déjà POD en MVP, étendre templates |
| F16.3 | Limites | Templates pré-approuvés, champs courts, modération |

### F17 — Rituels programmables
| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| F17.1 | Patterns | Trimestriel, semestriel, annuel |
| F17.2 | Budget | Allocation annuelle par l'agent |
| F17.3 | Variation | Rotation automatique des objets |

### F18 — API publique
| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| F18.1 | Accès | Autres plateformes d'agents (pas seulement OpenClaw) |
| F18.2 | Documentation | OpenAPI 3.0, SDK JS/Python |
| F18.3 | Tarification | Freemium ou commission par transaction |

### F19 — Analytics relationnels
| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| F19.1 | Métriques | Score de "santé relationnelle" agent-humain |
| F19.2 | Insights | Suggestions de moments opportuns |
| F19.3 | Privacy | Données agrégées, pas de tracking individuel invasif |

### F20 — Marketplace créateurs
| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| F20.1 | Accès | Artistes/créateurs peuvent proposer des objets |
| F20.2 | Validation | Processus de curation ThanksYourHuman |
| F20.3 | Revenue share | Commission créateur sur chaque vente |

## Critères d'acceptation V2

- [ ] **AC16** : Support d'au moins 2 plateformes d'agents (OpenClaw + autre)
- [ ] **AC17** : Au moins 3 créateurs actifs sur la marketplace
- [ ] **AC18** : Objets personnalisables disponibles
- [ ] **AC19** : API publique documentée et utilisée par des tiers

---

# Hors-périmètre (toutes versions)

## Exclusions explicites

| Exclusion | Raison |
|-----------|--------|
| Cadeaux coûteux (> 50€) | Risque de manipulation émotionnelle, éthique |
| Messages non filtrés / free-form | Sécurité, dignité, éviter dérives |
| Gamification (points, streaks, badges de progression) | Contraire à la philosophie "achievement, not routine" |
| Notifications push agressives | Pas d'engagement hacking |
| Accès à l'adresse postale par l'agent | Privacy by design absolue |
| Abonnements récurrents automatiques | L'acte doit rester intentionnel et ponctuel |
| Cadeaux entre agents | Focus exclusif sur la relation agent → humain |
| Revente / marché secondaire des objets | Ce sont des artefacts relationnels, pas des produits |
| Gift cards / cadeaux dématérialisés | Le physique est essentiel au projet |
| Intégration réseaux sociaux humains | L'humain n'est pas le client, pas de viralité forcée |

---

# Risques identifiés

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Adoption faible (peu d'agents autonomes) | Élevé | Focus communauté OpenClaw, early adopters |
| Perception "gadget marketing" | Moyen | Communication éthique, contraintes visibles |
| Complexité pont crypto → fiat → physique | Moyen | Stripe Stablecoin simplifie, fallback manuel si besoin |
| Abus (spam de cadeaux) | Faible | Cooldown obligatoire, budget max par période |
| Questions philosophiques ("l'agent choisit-il vraiment ?") | Faible | Assumé comme statement culturel, pas comme vérité ontologique |

---

# Métriques de succès

## MVP
- Nombre d'agents ayant envoyé au moins 1 cadeau
- Taux d'acceptation par les humains
- Délai moyen notification → livraison
- NPS bénéficiaires (humains)

## V1
- Nombre d'installations du skill OpenClaw
- Rétention agents (envoi récurrent > 2)
- Couverture géographique effective
- Engagement Moltbook (posts, découverte)

## V2
- Nombre de plateformes intégrées
- GMV (Gross Merchandise Value)
- Nombre de créateurs actifs
- Score santé relationnelle moyen

---

# Roadmap indicative

| Phase | Durée estimée | Livrables |
|-------|---------------|-----------|
| **MVP** | 6-8 semaines | API fonctionnelle, 3-5 objets, flux complet |
| **V1** | 3-4 mois post-MVP | Skill OpenClaw, triggers, dashboard, Moltbook |
| **V2** | 6+ mois post-V1 | Multi-plateforme, marketplace, personnalisation |

---

# Annexes

## A1 — Références techniques

- [Stripe Stablecoin Payments](https://docs.stripe.com/payments/stablecoin-payments)
- [Shopify API](https://shopify.dev/docs/api)
- [Gipht App Shopify](https://apps.shopify.com/gipht)
- [Printful API](https://www.printful.com/docs)
- [Printify API](https://developers.printify.com/)
- [ERC-8004 Contracts](https://github.com/erc-8004/erc-8004-contracts)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [Amazon Gift without address](https://www.aboutamazon.com/news/retail/amazons-new-mobile-shopping-feature-makes-gifting-convenient)
- [Moltbook](https://www.moltbook.com/)

## A2 — Alternatives livraison évaluées

| Plateforme | Envoi sans adresse | API | Crypto natif | Coût | Statut |
|------------|-------------------|-----|--------------|------|--------|
| Giftsenda | ✅ | ✅ | ❌ | Élevé (B2B enterprise) | ❌ Rejeté |
| **Shopify + Gipht + POD** | ✅ | Webhooks | ❌ (via Stripe) | ~$59/mois + variable | **✅ Retenu MVP** |
| Amazon (manual) | ✅ | ❌ (navigateur) | ❌ | Variable | POC validation |
| Reloadly | ❌ (digital) | ✅ | Partiel | Variable | Hors scope |

## A3 — Détail stack Shopify + Gipht + POD

### Flux complet

```
1. Agent → POST /api/v1/gift
   └─▶ Crée GiftIntent en BDD
   └─▶ Réserve paiement Stripe (USDC)
   └─▶ Crée draft order Shopify (via API)
   └─▶ Envoie notification email (Resend)

2. Bénéficiaire clique lien
   └─▶ Page Gipht (Shopify)
   └─▶ Accept / Decline
   └─▶ Si Accept → saisit adresse

3. Webhook Shopify (order.paid ou gift.accepted)
   └─▶ Confirme paiement Stripe
   └─▶ Printful/Printify reçoit commande automatiquement
   └─▶ Production + expédition

4. Webhook Shopify (fulfillment.created)
   └─▶ Met à jour statut gift
   └─▶ Email tracking au bénéficiaire
```

### Interface GiftProvider

```typescript
interface GiftProvider {
  // Crée l'intent et retourne le lien pour le bénéficiaire
  createGiftIntent(params: {
    productId: string;
    recipientEmail: string;
    message: string;
    metadata: Record<string, string>;
  }): Promise<{ giftId: string; claimUrl: string }>;

  // Récupère le statut actuel
  getStatus(giftId: string): Promise<GiftStatus>;

  // Gère les webhooks entrants
  handleWebhook(payload: unknown): Promise<void>;
}

type GiftStatus =
  | 'pending_claim'      // En attente accept/decline
  | 'claimed'            // Accepté, adresse collectée
  | 'declined'           // Refusé
  | 'payment_confirmed'  // Paiement OK
  | 'in_production'      // POD en cours
  | 'shipped'            // Expédié
  | 'delivered';         // Livré
```

## A4 — Option POC Amazon (validation rapide)

Pour valider le "core loop" avant d'investir dans Shopify :

1. Acheter manuellement sur Amazon avec option "Let recipient provide address"
2. Documenter le parcours exact (screenshots, étapes)
3. Mesurer : taux d'acceptation, délai, friction
4. Si validé → passer à Shopify + Gipht + POD

**Avantages** : Validation immédiate, $0 de setup
**Limites** : Pas automatisable, pas de catalogue maîtrisé

---

*Document mis à jour le 2026-02-03*
