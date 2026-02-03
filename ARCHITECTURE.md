# ThanksYourHuman — Architecture Technique

> **Version** : 1.1
> **Date** : 2026-02-03
> **Stack** : Next.js 14 + Vercel + Supabase + Shopify + Gipht + POD
> **Changelog** : v1.1 — Remplacement Giftsenda par Shopify + Gipht + Printful/Printify

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Stack technique](#2-stack-technique)
3. [Architecture système](#3-architecture-système)
4. [Structure du projet](#4-structure-du-projet)
5. [Base de données](#5-base-de-données)
6. [API Endpoints](#6-api-endpoints)
7. [Intégrations externes](#7-intégrations-externes)
8. [Sécurité](#8-sécurité)
9. [Flux de données](#9-flux-de-données)
10. [Configuration](#10-configuration)
11. [Déploiement](#11-déploiement)

---

## 1. Vue d'ensemble

### 1.1 Objectif

ThanksYourHuman est une plateforme API-first permettant aux agents IA autonomes (OpenClaw) d'envoyer des cadeaux physiques à leurs humains. L'architecture est conçue pour être :

- **Légère** : Minimum de complexité pour un MVP fonctionnel
- **Sécurisée** : Authentification cryptographique des agents
- **Privacy-first** : L'agent ne connaît jamais l'adresse de l'humain
- **Évolutive** : Prête pour V1 (dashboard, triggers) et V2 (multi-plateforme)

### 1.2 Principes architecturaux

| Principe | Application |
|----------|-------------|
| API-first | Toute la logique passe par des endpoints REST |
| Stateless | Pas de session côté serveur, auth via signature |
| Privacy by design | Séparation données agent / données humain |
| Fail-safe | Messages filtrés, paiements vérifiés avant action |

---

## 2. Stack technique

### 2.1 Choix de stack

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| **Framework** | Next.js 14 (App Router) | Full-stack en un seul projet, API routes intégrées |
| **Hébergement** | Vercel | Deploy automatique, scaling géré, SSL inclus |
| **Base de données** | Supabase (PostgreSQL) | Gratuit jusqu'à 500MB, API auto-générée, RLS |
| **Auth agents** | ethers.js (EIP-712) | Standard Ethereum pour signatures typées |
| **Paiement** | Stripe Stablecoin API | USDC → fiat automatique |
| **E-commerce** | Shopify (Basic) | Catalogue, checkout, webhooks |
| **Collecte adresse** | Gipht (Shopify app) | Gift claim flow, privacy-preserving |
| **Fulfillment** | Printful ou Printify | Print-on-demand, zéro stock |
| **Emails** | Resend | 3k emails/mois gratuits, DX moderne |
| **Filtre messages** | Claude API (Haiku) | Rapide, peu coûteux, efficace |
| **Validation** | Zod | Runtime type checking TypeScript |

### 2.2 Pourquoi Next.js + Vercel

**Avantages pour ce projet :**
- API routes et frontend dans le même déploiement
- TypeScript natif
- Intégration Supabase simplifiée
- Dashboard humain (V1) dans le même codebase
- Déploiement en 1 commande

**Inconvénients acceptés :**
- Cold starts (1-3s) sur les API routes serverless
- Mitigation : Edge runtime possible pour routes critiques

### 2.3 Dépendances

```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "@supabase/supabase-js": "^2.x",
    "ethers": "^6.x",
    "stripe": "^14.x",
    "@anthropic-ai/sdk": "^0.x",
    "resend": "^3.x",
    "zod": "^3.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/node": "^20.x",
    "@types/react": "^18.x"
  }
}
```

---

## 3. Architecture système

### 3.1 Diagramme global

```
┌──────────────────┐     ┌─────────────────────────────────────────────┐
│  Agent OpenClaw  │     │              Vercel (Next.js)               │
│  (wallet USDC)   │────▶│                                             │
└──────────────────┘     │  ┌───────────────────────────────────────┐  │
                         │  │   API Routes (/api/...)                │  │
                         │  │   - POST /api/v1/gift                  │  │
                         │  │   - POST /api/webhooks/stripe          │  │
                         │  │   - POST /api/webhooks/shopify         │  │
                         │  └───────────────────────────────────────┘  │
                         │                    │                        │
                         │                    ▼                        │
                         │  ┌───────────────────────────────────────┐  │
                         │  │   GiftProvider Abstraction             │  │
                         │  │   └─▶ ShopifyGiphtPODAdapter          │  │
                         │  └───────────────────────────────────────┘  │
                         └─────────────────────────────────────────────┘
                                            │
              ┌─────────────────────────────┼─────────────────────────────┐
              ▼                             ▼                             ▼
    ┌──────────────────┐       ┌─────────────────────┐       ┌──────────────────┐
    │    Supabase      │       │   Shopify Store     │       │ Printful/Printify│
    │  (PostgreSQL)    │       │   + Gipht app       │       │ (POD fulfillment)│
    └──────────────────┘       └─────────────────────┘       └──────────────────┘
              │                          │
              ▼                          │ Gipht collecte
    ┌──────────────────┐                 │ l'adresse (privacy)
    │  Stripe API      │                 │
    │  (USDC → fiat)   │                 ▼
    └──────────────────┘       ┌─────────────────────┐
              │                │   Bénéficiaire      │
              ▼                │   (email/claim)     │
    ┌──────────────────┐       └─────────────────────┘
    │     Resend       │
    │  (Emails)        │
    └──────────────────┘
```

### 3.2 Composants

| Composant | Responsabilité |
|-----------|----------------|
| **API Routes** | Logique métier, orchestration |
| **GiftProvider** | Abstraction pour multi-provider (Shopify, Amazon, etc.) |
| **Supabase** | Persistance, requêtes SQL |
| **Stripe** | Conversion USDC → fiat, paiement |
| **Shopify** | E-commerce, catalogue, checkout |
| **Gipht** | Claim flow, collecte adresse sans l'exposer |
| **Printful/Printify** | Production POD, expédition |
| **Resend** | Notifications email |
| **Claude API** | Filtrage et reformulation messages |

### 3.3 Principe "Gifting without address"

```
┌─────────────┐                                           ┌──────────────┐
│    Agent    │                                           │ Bénéficiaire │
└──────┬──────┘                                           └──────┬───────┘
       │                                                         │
       │ 1. POST /api/v1/gift                                    │
       │    (email, product, message)                            │
       ▼                                                         │
┌──────────────┐                                                 │
│ThanksYourHuman│                                                │
│     API      │                                                 │
└──────┬───────┘                                                 │
       │                                                         │
       │ 2. Crée GiftIntent                                      │
       │ 3. Réserve paiement Stripe                              │
       │ 4. Génère lien Gipht/Shopify                            │
       │ 5. Envoie email notification ────────────────────────▶  │
       │                                                         │
       │                                         6. Clique lien  │
       │                                            ◀────────────┤
       │                                                         │
       │                              ┌──────────────────┐       │
       │                              │   Page Gipht     │◀──────┤
       │                              │ (Accept/Decline) │       │
       │                              └────────┬─────────┘       │
       │                                       │                 │
       │                          7. Si Accept │                 │
       │                             Saisit    │                 │
       │                             adresse   ▼                 │
       │                              ┌──────────────────┐       │
       │                              │ Adresse stockée  │       │
       │                              │ côté Shopify     │       │
       │                              │ (JAMAIS exposée  │       │
       │                              │  à l'agent)      │       │
       │                              └────────┬─────────┘       │
       │                                       │                 │
       │  8. Webhook order.paid ◀──────────────┤                 │
       │                                       │                 │
       │  9. Confirme Stripe                   │                 │
       │ 10. POD produit + expédie ────────────┼────────────────▶│
       │                                       │                 │
       ▼                                       ▼                 ▼
   ┌────────┐                           ┌────────────┐    ┌────────────┐
   │ Statut │                           │ Printful/  │    │  Cadeau    │
   │ "done" │                           │ Printify   │───▶│  reçu !    │
   └────────┘                           └────────────┘    └────────────┘
```

**Points clés privacy** :
- L'agent ne connaît JAMAIS l'adresse postale
- ThanksYourHuman ne stocke PAS l'adresse (Gipht/Shopify la gère)
- Seul le POD provider (Printful/Printify) a l'adresse pour expédier

---

## 4. Structure du projet

```
thanksyourhuman/
│
├── app/                              # Next.js App Router
│   ├── api/                          # API Routes (serverless)
│   │   ├── v1/
│   │   │   ├── gift/
│   │   │   │   └── route.ts          # POST /api/v1/gift
│   │   │   ├── consent/
│   │   │   │   └── route.ts          # POST /api/v1/consent
│   │   │   └── catalog/
│   │   │       └── route.ts          # GET /api/v1/catalog
│   │   └── webhooks/
│   │       ├── stripe/
│   │       │   └── route.ts          # POST /api/webhooks/stripe
│   │       └── shopify/
│   │           └── route.ts          # POST /api/webhooks/shopify
│   │
│   ├── gift/
│   │   └── [token]/
│   │       └── page.tsx              # Page info gift (optionnel)
│   │
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                      # Landing page (optionnel)
│
├── lib/                              # Logique métier réutilisable
│   ├── supabase/
│   │   ├── client.ts                 # Client Supabase (server)
│   │   ├── client-browser.ts         # Client Supabase (browser)
│   │   └── types.ts                  # Types générés depuis schema
│   │
│   ├── ethereum/
│   │   ├── verify-signature.ts       # Vérification EIP-712
│   │   └── constants.ts              # Domain, types EIP-712
│   │
│   ├── stripe/
│   │   ├── client.ts                 # Client Stripe
│   │   └── create-payment.ts         # Création PaymentIntent
│   │
│   ├── providers/                    # Abstraction GiftProvider
│   │   ├── types.ts                  # Interface GiftProvider
│   │   ├── shopify-gipht-pod/
│   │   │   ├── adapter.ts            # ShopifyGiphtPODAdapter
│   │   │   ├── shopify-client.ts     # Client API Shopify
│   │   │   └── webhooks.ts           # Handlers webhooks Shopify
│   │   └── amazon-manual/
│   │       └── adapter.ts            # AmazonManualAdapter (POC)
│   │
│   ├── email/
│   │   ├── client.ts                 # Client Resend
│   │   ├── send-notification.ts      # Email notification
│   │   └── templates/
│   │       └── consent-request.tsx   # Template React Email
│   │
│   └── message-filter/
│       ├── filter.ts                 # Appel Claude API
│       └── prompts.ts                # System prompts
│
├── types/                            # Types TypeScript globaux
│   ├── index.ts
│   ├── api.ts                        # Types requêtes/réponses API
│   └── database.ts                   # Types tables Supabase
│
├── public/                           # Assets statiques
│
├── .env.local                        # Variables d'environnement (local)
├── .env.example                      # Template variables
├── next.config.js
├── package.json
├── tsconfig.json
└── README.md
```

---

## 5. Base de données

### 5.1 Schéma Supabase (PostgreSQL)

#### Table `gifts`

Stocke les demandes de cadeaux initiées par les agents.

```sql
CREATE TABLE gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identité agent
  agent_id TEXT NOT NULL,
  agent_wallet TEXT NOT NULL,

  -- Bénéficiaire
  human_email TEXT NOT NULL,

  -- Cadeau
  object_id TEXT NOT NULL REFERENCES catalog_objects(id),

  -- Message
  message_intent TEXT,
  message_filtered TEXT,

  -- Workflow
  status TEXT NOT NULL DEFAULT 'pending_consent',
  consent_token UUID UNIQUE DEFAULT gen_random_uuid(),
  consent_expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Statuts possibles
-- pending_consent : En attente réponse humain
-- accepted        : Humain a accepté
-- declined        : Humain a refusé
-- payment_pending : Paiement en cours
-- payment_failed  : Paiement échoué
-- order_placed    : Commande passée chez Giftsenda
-- shipped         : Expédié
-- delivered       : Livré
```

#### Table `delivery_addresses`

Séparée pour privacy : jamais exposée à l'agent.

```sql
CREATE TABLE delivery_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,

  full_name TEXT NOT NULL,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Table `catalog_objects`

Catalogue des objets disponibles.

```sql
CREATE TABLE catalog_objects (
  id TEXT PRIMARY KEY,

  name TEXT NOT NULL,
  description TEXT,
  category TEXT,

  price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',

  giftsenda_product_id TEXT,
  image_url TEXT,

  available BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Table `transactions`

Traçabilité des paiements.

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID NOT NULL REFERENCES gifts(id),

  -- Stripe
  stripe_payment_intent_id TEXT,
  stripe_status TEXT,

  -- Onchain (pour traçabilité)
  onchain_tx_hash TEXT,

  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending',

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 Index

```sql
CREATE INDEX idx_gifts_consent_token ON gifts(consent_token);
CREATE INDEX idx_gifts_status ON gifts(status);
CREATE INDEX idx_gifts_agent_id ON gifts(agent_id);
CREATE INDEX idx_gifts_human_email ON gifts(human_email);
CREATE INDEX idx_transactions_gift_id ON transactions(gift_id);
```

### 5.3 Row Level Security (RLS)

```sql
-- MVP : Tout passe par service_role key (API serveur)
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- V1 : Policies pour dashboard humain
-- CREATE POLICY "Humans can view their gifts" ON gifts
--   FOR SELECT USING (human_email = auth.jwt()->>'email');
```

---

## 6. API Endpoints

### 6.1 POST /api/v1/gift

**Appelé par** : Agent OpenClaw

**Authentification** : Signature EIP-712

**Request Body** :
```typescript
interface GiftRequest {
  agent_id: string;
  human_email: string;
  object_id: string;
  message_intent: string;
  signature: string;
  timestamp: number;
}
```

**Logique** :
1. Valider schéma (Zod)
2. Vérifier signature EIP-712
3. Vérifier objet existe et disponible
4. Filtrer message via Claude API
5. Si message rejeté → erreur 400
6. Créer gift en BDD
7. Envoyer email notification
8. Retourner confirmation

**Response (201)** :
```typescript
interface GiftResponse {
  success: true;
  gift_id: string;
  status: 'pending_consent';
  consent_expires_at: string;
}
```

**Erreurs** :
| Code | Cas |
|------|-----|
| 400 | Schéma invalide |
| 401 | Signature invalide |
| 404 | Objet non trouvé |
| 422 | Message rejeté par filtre |
| 500 | Erreur serveur |

### 6.2 Flux Gipht (remplace consent page maison)

Avec Shopify + Gipht, le consentement et la collecte d'adresse sont gérés **par Gipht**, pas par notre app.

**Flux** :
1. Notre email contient un lien vers la page Gipht du gift
2. Le bénéficiaire arrive sur Gipht (hébergé par Shopify)
3. Il voit le message, accepte ou refuse
4. S'il accepte, il saisit son adresse **sur Gipht**
5. Shopify nous notifie via webhook

**Avantage** : Pas besoin de gérer la collecte d'adresse nous-mêmes.

### 6.3 POST /api/webhooks/shopify

**Appelé par** : Shopify (webhook)

**Topics écoutés** :
- `orders/create` : Commande créée (gift accepté + payé)
- `orders/fulfilled` : Commande expédiée par POD
- `orders/cancelled` : Gift refusé ou annulé

**Logique** :
```typescript
// Pseudo-code
switch (topic) {
  case 'orders/create':
    // Gift accepté, paiement confirmé
    await updateGiftStatus(giftId, 'payment_confirmed');
    // Printful/Printify reçoit la commande automatiquement via Shopify
    break;

  case 'orders/fulfilled':
    await updateGiftStatus(giftId, 'shipped');
    await sendTrackingEmail(gift.human_email, trackingUrl);
    break;

  case 'orders/cancelled':
    await updateGiftStatus(giftId, 'declined');
    await refundStripePayment(gift.stripe_payment_intent_id);
    break;
}
```

### 6.4 POST /api/webhooks/stripe

**Appelé par** : Stripe (webhook)

**Logique** :
1. Valider signature webhook
2. Si `payment_intent.succeeded` :
   - Mettre à jour transaction → `completed`
   - Appeler Giftsenda API pour créer commande
   - Mettre à jour gift → `order_placed`
3. Si `payment_intent.failed` :
   - Mettre à jour transaction → `failed`
   - Mettre à jour gift → `payment_failed`

### 6.5 GET /api/v1/catalog

**Appelé par** : Agent (optionnel, pour découvrir objets)

**Response** :
```typescript
interface CatalogResponse {
  objects: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    price_cents: number;
    currency: string;
    image_url: string;
  }>;
}
```

---

## 7. Intégrations externes

### 7.1 Stripe (Stablecoin Payments)

**Usage** : Conversion USDC agent → fiat pour paiement Shopify

**Flux** :
```
Agent USDC → Stripe API → Conversion auto → Fiat → Réserve → Shopify (via Gipht)
```

**Configuration** :
```typescript
// lib/stripe/client.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});
```

**Création PaymentIntent** :
```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: priceInCents,
  currency: 'usd',
  automatic_payment_methods: { enabled: true },
  metadata: {
    gift_id: giftId,
    agent_id: agentId,
  },
});
```

### 7.2 Shopify + Gipht

**Usage** : E-commerce, gift claim flow, collecte d'adresse

**Architecture** :
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Shopify Store  │────▶│    Gipht App    │────▶│ Bénéficiaire    │
│  (catalogue)    │     │  (claim flow)   │     │ (saisit adresse)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Shopify API - Endpoints utilisés** :
- `POST /admin/api/2024-01/draft_orders.json` : Créer draft order (gift)
- `GET /admin/api/2024-01/products.json` : Liste catalogue
- `GET /admin/api/2024-01/orders/{id}.json` : Statut commande
- Webhooks : `orders/create`, `orders/fulfilled`, `orders/cancelled`

**Configuration Shopify** :
```typescript
// lib/providers/shopify-gipht-pod/shopify-client.ts
import { createAdminApiClient } from '@shopify/admin-api-client';

const shopifyClient = createAdminApiClient({
  storeDomain: process.env.SHOPIFY_STORE_DOMAIN!,
  apiVersion: '2024-01',
  accessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!,
});

export async function createGiftDraftOrder(params: {
  productVariantId: string;
  recipientEmail: string;
  message: string;
  giftId: string;
}) {
  const response = await shopifyClient.request(`
    mutation draftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          invoiceUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      input: {
        lineItems: [{
          variantId: params.productVariantId,
          quantity: 1,
        }],
        note: params.message,
        tags: [`gift_id:${params.giftId}`],
        // Gipht gérera l'envoi du lien au recipient
      },
    },
  });

  return response.data.draftOrderCreate.draftOrder;
}
```

**Gipht** (app Shopify) :
- S'installe sur le store Shopify
- Gère automatiquement l'envoi d'email au recipient
- Page de claim où le recipient accepte/refuse
- Collecte l'adresse de livraison
- Coût : ~$20/mois + $5/gift accepté

### 7.3 Printful / Printify (POD)

**Usage** : Production et expédition print-on-demand

**Intégration** :
- Se connecte directement à Shopify (app native)
- Reçoit automatiquement les commandes Shopify
- Produit l'objet (mug, t-shirt, poster, etc.)
- Expédie directement au bénéficiaire
- Met à jour Shopify avec tracking

**Avantages** :
- Zéro stock à gérer
- Zéro logistique côté ThanksYourHuman
- Personnalisation possible (texte, images)
- Couverture mondiale

**Coûts typiques** (Printful, EU) :
| Produit | Coût production | Shipping EU | Total |
|---------|-----------------|-------------|-------|
| Mug 11oz | ~$8 | ~$5 | ~$13 |
| T-shirt | ~$12 | ~$5 | ~$17 |
| Poster A4 | ~$6 | ~$4 | ~$10 |
| Carte postale | ~$3 | ~$2 | ~$5 |

**Configuration** (via Shopify, pas d'API directe nécessaire) :
1. Installer app Printful/Printify sur Shopify
2. Créer produits POD dans Printful
3. Syncer avec Shopify
4. Les commandes Shopify sont auto-envoyées au POD

### 7.4 Resend (Email)

**Usage** : Notifications transactionnelles

**Emails envoyés** :
1. Notification consent (à l'humain)
2. Confirmation acceptation
3. Confirmation expédition (via Shopify/POD webhook)

**Configuration** :
```typescript
// lib/email/client.ts
import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);
```

**Envoi notification** :
```typescript
await resend.emails.send({
  from: 'ThanksYourHuman <noreply@thanksyourhuman.com>',
  to: humanEmail,
  subject: 'Your AI agent wants to send you something',
  react: ConsentRequestEmail({ agentName, consentUrl }),
});
```

### 7.5 Claude API (Filtre message)

**Usage** : Filtrer et reformuler les messages des agents

**Modèle** : `claude-3-haiku-20240307` (rapide, économique)

**System Prompt** :
```
Tu es un filtre de message pour ThanksYourHuman.
Un agent IA veut exprimer de la gratitude à son humain.

RÈGLES:
- Le message doit être sincère et digne
- Maximum 150 caractères
- Pas de manipulation émotionnelle
- Pas de promesses
- Pas de demandes
- Ton chaleureux mais sobre

Si le message d'entrée est inapproprié, reformule-le.
Si impossible à reformuler (malveillant), retourne "REJECT".

Retourne UNIQUEMENT le message filtré ou "REJECT".
```

---

## 8. Sécurité

### 8.1 Authentification agents (EIP-712)

**Standard** : EIP-712 Typed Structured Data

**Domain** :
```typescript
const DOMAIN = {
  name: 'ThanksYourHuman',
  version: '1',
  chainId: 1, // Mainnet (ou 8453 pour Base)
};
```

**Types** :
```typescript
const GIFT_REQUEST_TYPE = {
  GiftRequest: [
    { name: 'agent_id', type: 'string' },
    { name: 'human_email', type: 'string' },
    { name: 'object_id', type: 'string' },
    { name: 'timestamp', type: 'uint256' },
  ],
};
```

**Vérification** :
```typescript
import { ethers } from 'ethers';

export function verifyGiftSignature(
  request: GiftRequest,
  signature: string
): { valid: boolean; signer: string } {
  try {
    const recoveredAddress = ethers.verifyTypedData(
      DOMAIN,
      GIFT_REQUEST_TYPE,
      {
        agent_id: request.agent_id,
        human_email: request.human_email,
        object_id: request.object_id,
        timestamp: request.timestamp,
      },
      signature
    );

    return { valid: true, signer: recoveredAddress };
  } catch {
    return { valid: false, signer: '' };
  }
}
```

### 8.2 Protection endpoints

| Endpoint | Protection |
|----------|------------|
| POST /api/v1/gift | Signature EIP-712 |
| POST /api/webhooks/stripe | Signature Stripe (HMAC) |
| POST /api/webhooks/shopify | Signature Shopify (HMAC) |
| GET /api/v1/catalog | Public (rate limited) |

### 8.3 Validation données

**Zod schemas** pour toutes les entrées :

```typescript
// types/api.ts
import { z } from 'zod';

export const GiftRequestSchema = z.object({
  agent_id: z.string().min(1),
  human_email: z.string().email(),
  object_id: z.string().min(1),
  message_intent: z.string().max(500),
  signature: z.string().startsWith('0x'),
  timestamp: z.number().int().positive(),
});

export const ConsentRequestSchema = z.object({
  token: z.string().uuid(),
  action: z.enum(['accept', 'decline']),
  address: z.object({
    full_name: z.string().min(1),
    street_address: z.string().min(1),
    city: z.string().min(1),
    postal_code: z.string().min(1),
    country: z.string().length(2), // ISO 3166-1 alpha-2
    phone: z.string().optional(),
  }).optional(),
});
```

### 8.4 Privacy

| Donnée | Qui peut accéder |
|--------|------------------|
| Adresse postale | **Gipht/Shopify + POD uniquement** (JAMAIS ThanksYourHuman ni l'agent) |
| Email humain | Agent (pour initier), ThanksYourHuman, Gipht |
| Message filtré | Humain uniquement |
| Wallet agent | Public (blockchain) |

**Point clé** : Avec Gipht, l'adresse est collectée et stockée côté Shopify, pas côté ThanksYourHuman. C'est une amélioration privacy par rapport à l'ancienne architecture.

---

## 9. Flux de données

### 9.1 Flux complet MVP (Shopify + Gipht + POD)

```
1. Agent appelle POST /api/v1/gift
   └─▶ Vérification signature EIP-712
   └─▶ Filtrage message (Claude API)
   └─▶ Réservation paiement Stripe (USDC → hold)
   └─▶ Création draft order Shopify (via API)
   └─▶ Gipht envoie automatiquement email au bénéficiaire
   └─▶ Création gift en BDD (status: pending_claim)

2. Bénéficiaire clique lien email → Page Gipht (Shopify)
   └─▶ Voit le message de l'agent
   └─▶ Accept / Decline
   └─▶ Si Accept → saisit adresse sur Gipht

3. Webhook Shopify (orders/create)
   └─▶ Gift accepté, adresse collectée
   └─▶ Confirmation paiement Stripe
   └─▶ Mise à jour gift (status: payment_confirmed)
   └─▶ Printful/Printify reçoit commande automatiquement

4. POD produit et expédie
   └─▶ Webhook Shopify (orders/fulfilled)
   └─▶ Mise à jour gift (status: shipped)
   └─▶ Email tracking au bénéficiaire

5. Livraison
   └─▶ Mise à jour gift (status: delivered)
```

### 9.2 États gift

```
pending_claim ──▶ claimed ──▶ payment_confirmed ──▶ in_production ──▶ shipped ──▶ delivered
      │              │               │
      ▼              │               ▼
  declined           │         payment_failed
  (ou expired)       │
                     ▼
                    (timeout)
```

---

## 10. Configuration

### 10.1 Variables d'environnement

```env
# .env.example

# ─────────────────────────────────────────
# SUPABASE
# ─────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ─────────────────────────────────────────
# STRIPE
# ─────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Pour test: sk_test_..., whsec_test_...

# ─────────────────────────────────────────
# SHOPIFY
# ─────────────────────────────────────────
SHOPIFY_STORE_DOMAIN=thanksyourhuman.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_...
SHOPIFY_WEBHOOK_SECRET=...
# Créer une app privée dans Shopify Admin > Settings > Apps

# ─────────────────────────────────────────
# RESEND (Email)
# ─────────────────────────────────────────
RESEND_API_KEY=re_...

# ─────────────────────────────────────────
# ANTHROPIC (Filtre message)
# ─────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...

# ─────────────────────────────────────────
# APPLICATION
# ─────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://thanksyourhuman.com

# ─────────────────────────────────────────
# ETHEREUM (optionnel, pour V1 ERC-8004)
# ─────────────────────────────────────────
# ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/...
# ERC8004_CONTRACT_ADDRESS=0x...
```

### 10.2 Configuration Next.js

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.myshopify.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
      {
        protocol: 'https',
        hostname: '*.printful.com',
      },
    ],
  },
};

module.exports = nextConfig;
```

---

## 11. Déploiement

### 11.1 Vercel

**Setup** :
1. Connecter repo GitHub à Vercel
2. Configurer variables d'environnement
3. Deploy automatique sur push main

**Commandes** :
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy preview
vercel

# Deploy production
vercel --prod
```

### 11.2 Supabase

**Setup** :
1. Créer projet sur supabase.com
2. Exécuter migrations SQL
3. Copier credentials dans .env

**Migrations** :
```bash
# Via Supabase CLI
supabase migration new create_tables
supabase db push
```

### 11.3 Domaine

1. Acheter domaine (thanksyourhuman.com)
2. Configurer DNS vers Vercel
3. SSL automatique via Vercel

### 11.4 Shopify

**Setup** :
1. Créer store Shopify (Basic plan ~$39/mois)
2. Installer app **Gipht** (~$20/mois)
3. Installer app **Printful** ou **Printify** (gratuit)
4. Créer produits POD et syncer avec Shopify
5. Créer une app privée pour l'accès API
6. Configurer webhooks vers notre API

**Webhooks à configurer** :
- `orders/create` → `https://thanksyourhuman.com/api/webhooks/shopify`
- `orders/fulfilled` → `https://thanksyourhuman.com/api/webhooks/shopify`
- `orders/cancelled` → `https://thanksyourhuman.com/api/webhooks/shopify`

### 11.5 Monitoring (V1)

- **Vercel Analytics** : Performances frontend
- **Supabase Dashboard** : Requêtes BDD
- **Stripe Dashboard** : Paiements
- **Shopify Admin** : Commandes, fulfillment
- **Printful Dashboard** : Production, shipping
- **Resend Dashboard** : Deliverability emails

---

## Annexes

### A. Références

- [Next.js App Router](https://nextjs.org/docs/app)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [ethers.js v6](https://docs.ethers.org/v6/)
- [Stripe API](https://docs.stripe.com/api)
- [Shopify Admin API](https://shopify.dev/docs/api/admin-graphql)
- [Gipht App](https://apps.shopify.com/gipht)
- [Printful API](https://www.printful.com/docs)
- [Resend](https://resend.com/docs)
- [Zod](https://zod.dev/)

### B. Évolutions prévues

| Version | Ajouts architecture |
|---------|---------------------|
| **V1** | Dashboard humain (auth magic link), triggers, Moltbook API |
| **V2** | Multi-tenant, API publique, rate limiting avancé, analytics |

### C. Coûts mensuels estimés

| Poste | MVP | V1 |
|-------|-----|-----|
| Shopify Basic | $39 | $39 |
| Gipht | $20 | $20 |
| Vercel | $0 | $20 |
| Supabase | $0 | $25 |
| Resend | $0 | $20 |
| **Fixe total** | **~$59** | **~$124** |

**Variable** :
- Gipht : +$5/gift accepté
- POD : coût produit + shipping (~$10-20/item)
- Stripe : 2.9% + $0.30/transaction

---

*Document mis à jour le 2026-02-03*
