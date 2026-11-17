import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SITE_URL } from "../api/client";
import { fetchLoyalty, fetchMyOrders, fetchUnreadCount } from "../api/endpoints";
import type { Order } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { useFavorites } from "../store/FavoritesProvider";
import { Button, Card, EmptyState, IconButton, ListRow, Screen, SectionLabel, Title, TopBar } from "../components/ui";
import { PressableScale } from "../components/motion";
import { initials, longDate } from "../lib/format";
import { colors, font, fonts, radius, space } from "../theme";
import type { RootStackParamList, TabParamList } from "../navigation/types";

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, "Account">, NativeStackScreenProps<RootStackParamList>>;
const ACTIVE = new Set(["paid", "processing", "shipped"]);

export default function AccountScreen({ navigation }: Props) {
	const { user } = useAuth();
	const fav = useFavorites();
	const [orders, setOrders] = useState<Order[] | null>(null);
	const [points, setPoints] = useState<number | null>(null);
	const [unread, setUnread] = useState(0);

	useFocusEffect(
		useCallback(() => {
			if (!user) return;
			fetchMyOrders().then(setOrders).catch(() => {});
			fetchLoyalty().then((l) => setPoints(l.points)).catch(() => {});
			fetchUnreadCount().then(setUnread).catch(() => {});
		}, [user]),
	);

	if (!user) {
		return (
			<Screen>
				<TopBar left={<Title size={26}>Compte</Title>} right={<IconButton icon="settings-outline" label="Paramètres" onPress={() => navigation.navigate("Settings")} />} />
				<ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
					<EmptyState icon="person-outline" title="Votre espace Baume" text="Suivez vos commandes, retrouvez vos favoris et cumulez des points fidélité.">
						<Button title="Se connecter" onPress={() => navigation.navigate("Login", { mode: "login" })} />
						<Button title="Créer un compte" variant="secondary" onPress={() => navigation.navigate("Login", { mode: "register" })} />
					</EmptyState>
					<View style={{ paddingHorizontal: space.xl, gap: 8 }}>
						<SectionLabel>Baume</SectionLabel>
						<Card>
							<ListRow first icon="heart-outline" label="Mes favoris" value={fav.favorites.length ? String(fav.favorites.length) : undefined} onPress={() => navigation.navigate("Favorites")} />
							<ListRow icon="chatbubbles-outline" label="Écrire à nos expertes" onPress={() => navigation.navigate("Chat")} />
							<ListRow icon="help-circle-outline" label="Aide et contact" onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/contact`)} />
						</Card>
					</View>
				</ScrollView>
			</Screen>
		);
	}

	const activeCount = (orders || []).filter((o) => ACTIVE.has(o.status)).length;
	const addressCount = user.address ? 1 : 0;

	return (
		<Screen>
			<TopBar left={<Title size={26}>Compte</Title>} right={<IconButton icon="settings-outline" label="Paramètres" onPress={() => navigation.navigate("Settings")} />} />
			<ScrollView contentContainerStyle={styles.content}>
				<View style={styles.profile}>
					<View style={styles.avatar}>
						<Text style={styles.avatarText}>{initials(user.first_name, user.last_name, user.email)}</Text>
					</View>
					<View style={{ flex: 1, gap: 2 }}>
						<Text style={styles.name}>{[user.first_name, user.last_name].filter(Boolean).join(" ") || "Mon compte"}</Text>
						<Text style={styles.email}>{user.email}</Text>
						{user.created_at ? <Text style={styles.since}>Membre depuis {longDate(user.created_at).replace(/^\d+ /, "")}</Text> : null}
					</View>
				</View>

				<View style={styles.tiles}>
					<Tile value={orders ? String(orders.length) : "…"} label="commandes" onPress={() => navigation.navigate("Orders")} />
					<Tile value={points === null ? "…" : String(points)} label="points" onPress={() => navigation.navigate("Tabs", { screen: "Loyalty" })} />
					<Tile value={String(fav.favorites.length)} label="favoris" onPress={() => navigation.navigate("Favorites")} />
				</View>

				<SectionLabel>Mes achats</SectionLabel>
				<Card>
					<ListRow first icon="cube-outline" label="Mes commandes" value={activeCount ? `${activeCount} en cours` : undefined} onPress={() => navigation.navigate("Orders")} />
					<ListRow icon="heart-outline" label="Mes favoris" onPress={() => navigation.navigate("Favorites")} />
					<ListRow icon="return-down-back-outline" label="Retours et remboursements" onPress={() => navigation.navigate("Orders")} />
				</Card>

				<SectionLabel>Mon compte</SectionLabel>
				<Card>
					<ListRow first icon="id-card-outline" label="Informations personnelles" onPress={() => navigation.navigate("Profile")} />
					<ListRow icon="location-outline" label="Adresse de livraison" value={addressCount ? user.city || "Enregistrée" : "À compléter"} onPress={() => navigation.navigate("Profile")} />
					<ListRow icon="key-outline" label="Double authentification" onPress={() => navigation.navigate("Security")} />
				</Card>

				<SectionLabel>Baume</SectionLabel>
				<Card>
					<ListRow first icon="chatbubbles-outline" label="Écrire à nos expertes" value={unread ? `${unread} nouveau${unread > 1 ? "x" : ""}` : undefined} onPress={() => navigation.navigate("Chat")} />
					<ListRow icon="calendar-outline" label="Ateliers" onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/ateliers`)} />
					<ListRow icon="help-circle-outline" label="Aide et contact" onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/contact`)} />
				</Card>
			</ScrollView>
		</Screen>
	);
}

function Tile({ value, label, onPress }: { value: string; label: string; onPress: () => void }) {
	return (
		<PressableScale onPress={onPress} scaleTo={0.95} style={styles.tile} accessibilityRole="button" accessibilityLabel={`${value} ${label}`}>
			<Text style={styles.tileValue}>{value}</Text>
			<Text style={styles.tileLabel}>{label}</Text>
		</PressableScale>
	);
}

const styles = StyleSheet.create({
	content: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: 12 },
	profile: { flexDirection: "row", alignItems: "center", gap: 14 },
	avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
	avatarText: { fontFamily: fonts.display, fontSize: 24, color: colors.background },
	name: { fontSize: 18, fontWeight: "600", color: colors.text },
	email: { fontSize: font.label, color: colors.textMuted },
	since: { fontSize: font.small, fontWeight: "600", color: colors.taupeWarm },
	tiles: { flexDirection: "row", gap: 10, marginBottom: 4 },
	tile: { flex: 1, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 12, alignItems: "center", gap: 2 },
	tileValue: { fontFamily: fonts.display, fontSize: 22, color: colors.brand },
	tileLabel: { fontSize: font.small, color: colors.textMuted },
});
