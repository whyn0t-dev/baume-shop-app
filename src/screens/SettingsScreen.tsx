import React, { useEffect, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { SITE_URL } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { Button, Card, IconButton, ListRow, Screen, SectionLabel, Title, ToggleRow, TopBar } from "../components/ui";
import { colors, font, space } from "../theme";
import type { RootScreenProps } from "../navigation/types";

const PREFS_KEY = "shop_notification_prefs";
type Prefs = { orders: boolean; offers: boolean; workshops: boolean };

export default function SettingsScreen({ navigation }: RootScreenProps<"Settings">) {
	const { user, signOut } = useAuth();
	const [prefs, setPrefs] = useState<Prefs>({ orders: true, offers: true, workshops: false });

	useEffect(() => {
		AsyncStorage.getItem(PREFS_KEY)
			.then((r) => r && setPrefs({ ...prefs, ...JSON.parse(r) }))
			.catch(() => {});
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	function update(k: keyof Prefs, v: boolean) {
		const next = { ...prefs, [k]: v };
		setPrefs(next);
		AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
	}

	function logout() {
		Alert.alert("Se déconnecter ?", "Votre panier et vos favoris restent enregistrés sur ce téléphone.", [
			{ text: "Annuler", style: "cancel" },
			{ text: "Se déconnecter", style: "destructive", onPress: () => signOut().then(() => navigation.goBack()) },
		]);
	}

	function deleteAccount() {
		// Apple exige de pouvoir demander la suppression du compte depuis l'app.
		Alert.alert(
			"Supprimer mon compte",
			"Votre demande sera envoyée à l'équipe Baume, qui supprimera votre compte et vos données personnelles sous 30 jours (les factures sont conservées selon la loi).",
			[
				{ text: "Annuler", style: "cancel" },
				{
					text: "Envoyer la demande",
					style: "destructive",
					onPress: () =>
						Linking.openURL(
							`mailto:contact@baumeshop-v2.weblax.fr?subject=${encodeURIComponent("Suppression de mon compte Baume")}&body=${encodeURIComponent(
								`Bonjour,\n\nJe souhaite la suppression de mon compte Baume et de mes données personnelles.\nE-mail du compte : ${user?.email || ""}\n\nMerci.`,
							)}`,
						),
				},
			],
		);
	}

	return (
		<Screen>
			<TopBar left={<IconButton icon="chevron-back" label="Retour" onPress={() => navigation.goBack()} />} />
			<ScrollView contentContainerStyle={styles.content}>
				<Title size={26}>Paramètres</Title>

				<SectionLabel>Notifications</SectionLabel>
				<Card>
					<ToggleRow first icon="cube-outline" label="Suivi de mes commandes" sub="Préparation, expédition, livraison" value={prefs.orders} onChange={(v) => update("orders", v)} />
					<ToggleRow icon="gift-outline" label="Offres et bons fidélité" value={prefs.offers} onChange={(v) => update("offers", v)} />
					<ToggleRow icon="calendar-outline" label="Ateliers et événements" value={prefs.workshops} onChange={(v) => update("workshops", v)} />
				</Card>
				<Text style={styles.note}>Les notifications sur le téléphone arrivent dans une prochaine version ; vos choix sont déjà enregistrés.</Text>

				<SectionLabel>Préférences et données</SectionLabel>
				<Card>
					<ListRow first icon="globe-outline" label="Langue" value="Français" onPress={() => Alert.alert("Langue", "L'application est disponible en français.")} />
					<ListRow icon="shield-checkmark-outline" label="Confidentialité et données" onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/confidentialite`)} />
					<ListRow icon="document-text-outline" label="Conditions générales" onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/cgv`)} />
				</Card>

				{user ? (
					<>
						<Button title="Se déconnecter" icon="log-out-outline" variant="secondary" onPress={logout} style={{ marginTop: space.md }} />
						<Button title="Supprimer mon compte" icon="trash-outline" variant="danger" onPress={deleteAccount} />
					</>
				) : null}
				<Text style={styles.version}>Baume Shop · version {Constants.expoConfig?.version || "1.0.0"}</Text>
			</ScrollView>
		</Screen>
	);
}

const styles = StyleSheet.create({
	content: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: 12 },
	note: { fontSize: font.small, color: colors.textMuted, lineHeight: 17, paddingHorizontal: 4 },
	version: { textAlign: "center", fontSize: font.small, color: colors.textMuted, marginTop: space.md },
});
