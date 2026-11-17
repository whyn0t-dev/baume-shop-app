// Retours haptiques (vibrations légères) sur les actions clés.
// Le module natif est chargé de façon tolérante : une version de l'app installée
// sans expo-haptics (ancien build recevant une mise à jour) ne plante pas, elle ne vibre simplement pas.
type HapticsModule = typeof import("expo-haptics");

let H: HapticsModule | null = null;
try {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	H = require("expo-haptics");
} catch {
	H = null;
}

function run(fn: (h: HapticsModule) => Promise<void> | void) {
	if (!H) return;
	try {
		const r = fn(H);
		if (r && typeof (r as Promise<void>).catch === "function") (r as Promise<void>).catch(() => {});
	} catch {
		// Pas de vibration possible : on ignore.
	}
}

export const haptic = {
	/** Changement de sélection : onglet, taille, filtre, quantité. */
	selection: () => run((h) => h.selectionAsync()),
	/** Petit choc : favori, envoi d'un message, suppression. */
	light: () => run((h) => h.impactAsync(h.ImpactFeedbackStyle.Light)),
	/** Action réussie : ajout au panier, paiement confirmé, bon créé. */
	success: () => run((h) => h.notificationAsync(h.NotificationFeedbackType.Success)),
	/** Action impossible : taille manquante, code refusé, message non envoyé. */
	warning: () => run((h) => h.notificationAsync(h.NotificationFeedbackType.Warning)),
};
