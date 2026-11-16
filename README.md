# Baume Shop — application publique (iOS, puis Android)

Application mobile de la boutique Baume, branchée sur le même backend que le site
(`baume-shop-v2`, API Render + Supabase + Stripe). Nom affiché sous l'icône : **Baume Shop**.
Nom prévu sur l'App Store : **Baume – Bien-être féminin**.

## Lancer l'app sur ton iPhone (Expo Go)

```
cd ~/Documents/GitHub/baume-shop-app
npx expo start
```
Scanne le QR code avec l'appareil photo de l'iPhone (Expo Go installé).

## Écrans (version 1)

Bienvenue · Connexion / création de compte · Mot de passe oublié · Accueil · Shop (par besoin /
par produit) · Liste avec filtres et tri · Fiche produit (tailles, précommande, épuisé) · Recherche ·
Panier (codes promo, bons fidélité) · Livraison (domicile ou retrait boutique) · Paiement Stripe ·
Confirmation · Carte fidélité (QR lu par la caisse, conversion des points) · Compte · Commandes et
suivi · Détail de commande · Demande de retour · Paramètres · Mes informations · Favoris.

## Publier (plus tard)

1. `npx eas-cli@latest init` (crée le projet Expo et ajoute son identifiant dans app.json)
2. `npx eas-cli@latest build --platform ios --profile production`
3. `npx eas-cli@latest submit --platform ios --latest`

Identifiant iOS : `com.baume.shop` · Schéma de retour après paiement : `baume-shop://`.
