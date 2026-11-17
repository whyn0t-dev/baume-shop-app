import React, { useCallback, useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import { errorMessage } from "../api/client";
import { convertPoints, fetchLoyalty } from "../api/endpoints";
import type { Loyalty } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { BaumeLogo } from "../components/BaumeLogo";
import { Button, Card, EmptyState, ErrorBanner, Screen, SectionLabel, SkeletonRows, Title, TopBar } from "../components/ui";
import { FadeIn, ProgressBar, animateLayout, stagger, useCountUp } from "../components/motion";
import { haptic } from "../lib/haptics";
import { shortDate } from "../lib/format";
import { colors, font, fonts, radius, space } from "../theme";
import type { RootStackParamList, TabParamList } from "../navigation/types";

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, "Loyalty">, NativeStackScreenProps<RootStackParamList>>;

// Même contenu de QR que la carte du site : la caisse de la boutique le lit directement.
const qrValue = (email: string, points: number) => `BAUME:${email}:${points}:${Math.floor(Date.now() / (5 * 60 * 1000))}`;

export default function LoyaltyScreen({ navigation }: Props) {
	const { user } = useAuth();
	const [loyalty, setLoyalty] = useState<Loyalty | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [refreshing, setRefreshing] = useState(false);
	const [converting, setConverting] = useState<number | null>(null);
	const [tick, setTick] = useState(0);

	const load = useCallback(async (animate = false) => {
		if (!user) return;
		try {
			const data = await fetchLoyalty();
			// Après la création d'un bon : le nouveau bon et le solde se mettent à jour en douceur.
			if (animate) animateLayout();
			setLoyalty(data);
			setError(null);
		} catch (e) {
			setError(errorMessage(e, "Impossible de charger votre carte."));
		} finally {
			setRefreshing(false);
		}
	}, [user]);

	useFocusEffect(
		useCallback(() => {
			load();
		}, [load]),
	);

	// Solde affiché : compte jusqu'au nombre de points au premier affichage, puis suit les changements.
	const shownPoints = useCountUp(loyalty?.points ?? null);

	// Le QR change toutes les 5 minutes (comme sur le site).
	useEffect(() => {
		const t = setInterval(() => setTick((x) => x + 1), 60000);
		return () => clearInterval(t);
	}, []);

	if (!user) {
		return (
			<Screen>
				<TopBar left={<Title size={26}>Fidélité</Title>} />
				<EmptyState icon="card-outline" title="Votre carte fidélité" text="1 CHF dépensé = 1 point, en boutique comme sur l'app. Vos points se transforment en bons d'achat.">
					<Button title="Créer un compte" onPress={() => navigation.navigate("Login", { mode: "register" })} />
					<Button title="Se connecter" variant="secondary" onPress={() => navigation.navigate("Login", { mode: "login" })} />
				</EmptyState>
			</Screen>
		);
	}

	async function convert(points: number, label: string) {
		Alert.alert("Créer un bon d'achat ?", `${points} points seront échangés contre un bon de ${label}.`, [
			{ text: "Annuler", style: "cancel" },
			{
				text: "Créer le bon",
				onPress: async () => {
					setConverting(points);
					try {
						const res = await convertPoints(points);
						haptic.success();
						Alert.alert("Bon créé", res?.code ? `Votre code : ${res.code}\nIl s'applique depuis le panier.` : "Votre bon est disponible dans le panier.");
						load(true);
					} catch (e) {
						haptic.warning();
						Alert.alert("Conversion impossible", errorMessage(e));
					} finally {
						setConverting(null);
					}
				},
			},
		]);
	}

	const qr = qrValue(user.email, loyalty?.points ?? 0);
	const name = [user.first_name, user.last_name ? `${user.last_name[0]}.` : ""].filter(Boolean).join(" ") || user.email;
	const next = loyalty?.next_threshold;
	const progress = next && loyalty ? Math.min(1, loyalty.points / next.points) : 1;
	const vouchers = (loyalty?.generated_codes || []).filter((v) => !v.used);

	return (
		<Screen>
			<TopBar left={<Title size={26}>Fidélité</Title>} />
			<ScrollView
				contentContainerStyle={styles.content}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
			>
				<ErrorBanner message={error} onRetry={load} />
				<FadeIn offset={16}>
				<View style={styles.card}>
					<View style={styles.cardHead}>
						<BaumeLogo width={104} color={colors.background} />
						<Text style={styles.cardKicker}>Carte membre</Text>
					</View>
					{/* Le QR ne se redessine (en fondu) que lorsque son contenu change réellement. */}
					<FadeIn key={qr} duration={260} offset={0}>
						<View style={styles.qr}>
							<QRCode value={qr} size={168} color={colors.text} backgroundColor={colors.white} />
						</View>
					</FadeIn>
					<Text style={styles.cardHint}>À présenter en caisse à la boutique de Genève</Text>
					<View style={styles.cardFoot}>
						<View>
							<Text style={styles.cardName}>{name}</Text>
							<Text style={styles.points}>
								{shownPoints ?? "…"} <Text style={styles.pointsUnit}>points</Text>
							</Text>
						</View>
					</View>
				</View>
				</FadeIn>

				{!loyalty ? (
					<SkeletonRows count={2} height={64} />
				) : (
					<>
						<Card style={{ padding: space.lg, gap: 8 }}>
							{next ? (
								<>
									<View style={styles.between}>
										<Text style={styles.strong}>Prochain bon : {next.label}</Text>
										<Text style={styles.muted}>
											{loyalty.points} / {next.points} pts
										</Text>
									</View>
									<ProgressBar progress={progress} />
								</>
							) : (
								<Text style={styles.strong}>Vous avez atteint le palier maximal, bravo !</Text>
							)}
						</Card>

						{loyalty.thresholds.filter((t) => loyalty.points >= t.points).length ? (
							<>
								<SectionLabel>Échanger mes points</SectionLabel>
								{loyalty.thresholds
									.filter((t) => loyalty.points >= t.points)
									.map((t, i) => (
										<FadeIn key={t.points} delay={stagger(i, 60)}>
										<Card style={styles.convert}>
											<Ionicons name="gift-outline" size={22} color={colors.brand} />
											<View style={{ flex: 1 }}>
												<Text style={styles.strong}>Bon de {t.label}</Text>
												<Text style={styles.muted}>{t.points} points</Text>
											</View>
											<Button title="Créer" small onPress={() => convert(t.points, t.label)} loading={converting === t.points} disabled={converting !== null && converting !== t.points} />
										</Card>
										</FadeIn>
									))}
							</>
						) : null}

						{vouchers.length ? (
							<>
								<SectionLabel>Mes bons disponibles</SectionLabel>
								<Card>
									{vouchers.map((v, i) => (
										<View key={v.code} style={[styles.tx, i > 0 && styles.border]}>
											<Ionicons name="pricetag-outline" size={18} color={colors.brand} />
											<Text style={[styles.code, { flex: 1 }]}>{v.code}</Text>
											{v.reward ? <Text style={styles.strong}>{v.reward} CHF</Text> : null}
										</View>
									))}
								</Card>
								<Text style={styles.muted}>Ils s'appliquent d'un geste depuis votre panier.</Text>
							</>
						) : null}

						<SectionLabel>Historique</SectionLabel>
						<Card>
							{loyalty.transactions.length ? (
								loyalty.transactions.map((t, i) => (
									<View key={t.id || i} style={[styles.tx, i > 0 && styles.border]}>
										<View style={{ flex: 1 }}>
											<Text style={styles.body} numberOfLines={2}>
												{t.reason || t.type || "Mouvement de points"}
											</Text>
											{t.created_at ? <Text style={styles.muted}>{shortDate(t.created_at)}</Text> : null}
										</View>
										<Text style={[styles.strong, { color: (t.points ?? 0) >= 0 ? colors.success : colors.danger }]}>
											{(t.points ?? 0) >= 0 ? "+" : ""}
											{t.points ?? 0}
										</Text>
									</View>
								))
							) : (
								<Text style={[styles.muted, { padding: space.lg }]}>Vos points apparaîtront ici après votre premier achat.</Text>
							)}
						</Card>
					</>
				)}
			</ScrollView>
		</Screen>
	);
}

const styles = StyleSheet.create({
	content: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: 12 },
	card: { borderRadius: radius.xl, backgroundColor: colors.brand, padding: space.xl, alignItems: "center", gap: 14 },
	cardHead: { alignSelf: "stretch", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
	cardKicker: { fontSize: font.small, letterSpacing: 1.2, textTransform: "uppercase", color: colors.taupe },
	qr: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 12 },
	cardHint: { fontSize: font.label, color: colors.taupe },
	cardFoot: { alignSelf: "stretch", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
	cardName: { fontSize: font.small, color: colors.taupe },
	points: { fontFamily: fonts.display, fontSize: 30, color: colors.background },
	pointsUnit: { fontSize: font.body, fontFamily: undefined, fontWeight: "500" },
	between: { flexDirection: "row", justifyContent: "space-between" },
	strong: { fontSize: 14, fontWeight: "700", color: colors.text },
	muted: { fontSize: font.small, color: colors.textMuted },
	body: { fontSize: 14, color: colors.text },
	code: { fontSize: 14, fontWeight: "700", color: colors.text, letterSpacing: 0.5 },
	convert: { flexDirection: "row", alignItems: "center", gap: 12, padding: space.lg },
	tx: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: space.lg, paddingVertical: 12 },
	border: { borderTopWidth: 1, borderTopColor: colors.border },
});
