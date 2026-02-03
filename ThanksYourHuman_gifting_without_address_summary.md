# ThanksYourHuman — Envoi de cadeaux sans connaître l’adresse (résumé + solutions 1 & 2)
_Date: 2026-02-03 (Europe/Brussels)_

## 1) Problème (à intégrer dans le PRD)

Nous voulons permettre à un expéditeur (humain ou agent) d’envoyer un cadeau à un destinataire **sans connaître son adresse postale**.
Le destinataire reçoit une demande (email/SMS), **accepte** (ou refuse) le cadeau, puis **renseigne lui-même** son adresse de livraison sur une plateforme de confiance.

### Contraintes clés
- L’expéditeur **ne voit jamais** l’adresse postale du destinataire (privacy-by-design).
- L’achat doit pouvoir se faire avec **une adresse email** (minimum), éventuellement un numéro de téléphone.
- Idéalement : possibilité de personnalisation légère (ex: texte sur mug/t-shirt), sans stock/logistique.

---

## 2) Solution #1 — MVP “immédiat” via Amazon (no address / recipient provides address)

### Idée
Utiliser la fonctionnalité Amazon permettant d’envoyer un cadeau **sans adresse** : au checkout, l’acheteur choisit l’option **“Let the recipient provide their address”** puis saisit l’email ou le numéro du destinataire.  
Le destinataire clique, accepte, et renseigne une adresse Amazon (existante ou nouvelle).  
Sources :
- Help Amazon “Send a Gift” (mention de l’option où le destinataire fournit son adresse) : https://www.amazon.com/gp/help/customer/display.html?nodeId=GSBVPNCXBREXPVA6
- Annonce Amazon (aboutamazon.com) décrivant le flow “Let the recipient provide their address” : https://www.aboutamazon.com/news/retail/amazons-new-mobile-shopping-feature-makes-gifting-convenient
- Analyse Narvar du flow “Accept and provide address” : https://corp.narvar.com/blog/amazon-gift-giving

### Pourquoi c’est utile
- Valide rapidement le “core loop” : **choisir → payer → notifier → collecter adresse → livrer**.
- Large catalogue et prix bas possibles.

### Limites / risques (à noter dans le PRD)
- Feature historiquement annoncée comme “mobile app / Prime” et potentiellement **variable selon pays / produit / vendeur**.
- Pas une API “propre” pour agent autonome ; plus proche d’un POC “opéré” par un humain/agent via navigateur.

### Implémentation (niveau PRD)
- **Phase 1** : valider le parcours utilisateur de bout en bout (Belgique/France si c’est la zone cible).
- Documenter : étapes exactes, points de friction, taux d’acceptation, délai moyen de complétion.

---

## 3) Solution #2 — Plateforme dédiée : Shopify + app “no address” + Print-on-Demand

### Idée
Créer une mini-boutique Shopify avec un petit catalogue de cadeaux (mug/t-shirt/poster/carte).
- La collecte d’adresse se fait via une app type **Gipht** (“email/SMS only – no shipping address required”).
- La production & livraison sont gérées par un fournisseur **print-on-demand** (ex: Printful, Printify) : pas de stock, pas de logistique.

Sources :
- App Shopify **Gipht** (email/SMS – pas d’adresse requise) : https://apps.shopify.com/gipht
- Gipht décrit un flow “recipient accepts the gift” + notifications : https://apps.shopify.com/gipht?locale=nb&surface_detail=marketing-and-conversion-gifts-gifts-other&surface_inter_position=1&surface_intra_position=22&surface_type=category&surface_version=redesign
- Printful : “prints, packs, and ships orders directly to your customers” : https://www.printful.com/blog/step-by-step-guide-to-connecting-your-store-to-shopify
- Printify app Shopify : “we handle printing, packing & shipping” : https://apps.shopify.com/printify

### Pourquoi c’est probablement la meilleure trajectoire produit
- Contrôle du catalogue + personnalisation légère.
- Zéro logistique (POD).
- L’adresse n’est **jamais** partagée avec l’expéditeur/agent : elle est collectée côté plateforme.

### Architecture (high level)
1. **Shopify Store** = catalogue + paiement + commande.
2. **Gipht** = “gift claim flow” (email/SMS → accept → collecte adresse).
3. **POD (Printful/Printify)** = fulfillment (production + expédition).
4. **Système ThanksYourHuman** (ton app/agent) :
   - Génère/stocke un “Gift Intent” (qui, quoi, budget, message…)
   - Redirige vers checkout Shopify (ou lien produit)
   - Reçoit les statuts (si webhooks dispo) : payé / envoyé / accepté / expédié / livré (au minimum : payé + accepté).

### Limites / risques à cadrer
- Coûts fixes Shopify + app(s) + frais POD → difficile de tenir des cadeaux “très low cost” **tout compris**.
- Couverture internationale : dépend du POD choisi, des coûts shipping, et de la TVA/douanes.
- Personnalisation : doit être strictement encadrée (champs courts, modération si nécessaire).

---

## 4) Modifs à apporter au PRD (checklist pour l’agent de codage)

### A. Fonctionnalités
- Ajouter une section “**Gifting without address**” :
  - Notif destinataire (email/SMS)
  - Accept / Decline
  - Collecte adresse sur plateforme tierce
  - Tracking (au minimum : accepted + shipped)
- Ajouter “**Provider adapters**” :
  - Adapter_Amazon (MVP)
  - Adapter_Shopify_Gipht_POD (produit cible)

### B. Données / Privacy
- Stocker côté ThanksYourHuman :
  - gift_id, sender_id, recipient_email/phone, provider, product_ref, amount, status, timestamps
- **Ne jamais stocker** l’adresse postale (ni la faire transiter par l’agent).
- Journaliser uniquement ce qui est nécessaire pour le suivi (status & preuves).

### C. Parcours utilisateur (UX)
- Flow MVP Amazon :
  - “choose item” → “add gift options” → “recipient provides address”
- Flow Shopify :
  - “choose product” → checkout → Gipht envoie le lien → recipient claim → POD fulfill

### D. Intégrations techniques (à préciser selon tes choix)
- Shopify :
  - Webhooks Shopify (order paid / fulfilled / shipped) si utilisables.
  - Convention de “metadata” sur la commande (gift_id) pour relier au système ThanksYourHuman.
- POD :
  - Sélection Printful ou Printify ; vérifier le modèle de tracking accessible (API / webhooks / Shopify fulfillment).

---

## 5) Prochaines étapes recommandées (actionnable)
1. **Test terrain Amazon** (1 à 3 envois) pour confirmer la faisabilité dans la zone cible (BE/FR) + capturer les écrans et les étapes exactes.
2. Mettre en place un **Shopify sandbox** + installer Gipht.
3. Brancher Printful ou Printify et créer 3 produits POD.
4. Définir un premier schéma d’état (state machine) “gift status” commun aux deux providers.
5. Écrire les “Provider adapters” (Amazon = manuel/POC ; Shopify = automatisable).

---

## 6) Notes pour l’agent de codage
- Commencer par une abstraction `GiftProvider` :
  - `create_gift_intent(...)`
  - `get_checkout_or_send_link(...)`
  - `handle_webhook(...)`
  - `get_status(gift_id)`
- L’objectif v1 : **ne pas casser la privacy** (adresse jamais collectée côté agent) + avoir un suivi minimal.
