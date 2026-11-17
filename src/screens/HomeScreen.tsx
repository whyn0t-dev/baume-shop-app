import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { errorMessage } from "../api/client";
import { fetchCategories, fetchLoyalty, fetchProducts, fetchUnreadCount } from "../api/endpoints";
import type { Category, Loyalty, Product } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { BaumeLogo, BaumeMonogram } from "../components/BaumeLogo";
import { ErrorBanner, IconButton, ProductCard, Screen, SectionTitle, SkeletonProductCard, Title, TopBar } from "../components/ui";
import { FadeIn, PressableScale, Skeleton, stagger } from "../components/motion";
import { colors, font, fonts, radius, space } from "../theme";
import type { RootStackParamList, TabParamList } from "../navigation/types";

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, "Home">, NativeStackScreenProps<RootStackParamList>>;

export default function HomeScreen({ navigation }: Props) {
	const { user } = useAuth();
	const [needs, setNeeds] = useState<Category[]>([]);
	const [news, setNews] = useState<Product[]>([]);
	const [counts, setCounts] = useState<Record<string, number>>({});
	const [loyalty, setLoyalty] = useState<Loyalty | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [unread, setUnread] = useState(0);

	useFocusEffect(
		useCallback(() => {
			if (user) fetchUnreadCount().then(setUnread).catch(() => {});
			else setUnread(0);
		}, [user]),
	);

	const load = useCallback(async () => {
		try {
			const [cats, products] = await Promise.all([fetchCategories("besoin"), fetchProducts()]);
			const c: Record<string, number> = {};
			products.forEach((p) => (p.needs || []).forEach((n) => (c[n] = (c[n] || 0) + 1)));
			setCounts(c);
			setNeeds(cats.filter((n) => c[n.slug]).sort((a, b) => (c[b.slug] || 0) - (c[a.slug] || 0)));
			const sorted = [...products].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
			const featured = sorted.filter((p) => p.featured || p.bestseller);
			setNews((featured.length >= 4 ? featured : sorted).slice(0, 8));
			setError(null);
		} catch (e) {
			setError(errorMessage(e, "Impossible de charger la boutique."));
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
		if (user) fetchLoyalty().then(setLoyalty).catch(() => {});
	}, [user]);

	useEffect(() => {
		load();
	}, [load]);

	const vouchers = useMemo(() => (loyalty?.generated_codes || []).filter((v) => !v.used), [loyalty]);

	return (
		<Screen>
			<TopBar
				left={<BaumeLogo width={124} />}
				right={
					<View style={{ flexDirection: "row", gap: 8 }}>
						<IconButton icon="chatbubbles-outline" label="Écrire à nos expertes" badge={unread || undefined} onPress={() => navigation.navigate("Chat")} />
						<IconButton icon="search" label="Rechercher" onPress={() => navigation.navigate("Search")} />
					</View>
				}
			/>
			<ScrollView
				contentContainerStyle={{ paddingBottom: space.xxl }}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
			>
				<FadeIn style={styles.hero}>
					<Text style={styles.hello}>{user?.first_name ? `Bonjour ${user.first_name}` : "Bienvenue"}</Text>
					<Title>Prenez soin de vous, à votre rythme.</Title>
				</FadeIn>

				<FadeIn delay={60}>
					<PressableScale scaleTo={0.98} style={styles.search} onPress={() => navigation.navigate("Search")} accessibilityRole="search">
						<Ionicons name="search" size={20} color={colors.textMuted} />
						<Text style={styles.searchText}>Rechercher un produit, un besoin…</Text>
					</PressableScale>
				</FadeIn>

				<FadeIn delay={120}>
				<PressableScale scaleTo={0.98} style={styles.loyalty} onPress={() => navigation.navigate("Tabs", { screen: "Loyalty" })}>
					<BaumeMonogram size={34} color={colors.background} />
					<View style={{ flex: 1, gap: 2 }}>
						<Text style={styles.loyaltyKicker}>Carte fidélité</Text>
						<Text style={styles.loyaltyText}>
							{user
								? `${loyalty?.points ?? "…"} points${vouchers.length ? ` · ${vouchers.length} bon${vouchers.length > 1 ? "s" : ""} disponible${vouchers.length > 1 ? "s" : ""}` : ""}`
								: "1 CHF dépensé = 1 point"}
						</Text>
					</View>
					<Ionicons name="chevron-forward" size={20} color={colors.taupe} />
				</PressableScale>
				</FadeIn>

				<ErrorBanner message={error} onRetry={load} />

				{loading ? (
					// Squelette au gabarit exact des sections à venir.
					<View accessibilityLabel="Chargement de la boutique">
						<View style={styles.section}>
							<Skeleton height={22} width={120} />
						</View>
						<View style={[styles.hscroll, { flexDirection: "row" }]}>
							{[0, 1, 2].map((i) => (
								<Skeleton key={i} width={132} height={100} radius={radius.lg} />
							))}
						</View>
						<View style={styles.section}>
							<Skeleton height={22} width={140} />
						</View>
						<View style={[styles.hscroll, { flexDirection: "row", gap: 14 }]}>
							<SkeletonProductCard width={165} />
							<SkeletonProductCard width={165} />
						</View>
					</View>
				) : (
					<>
						<View style={styles.section}>
							<SectionTitle action="Tout voir" onAction={() => navigation.navigate("Tabs", { screen: "Shop", params: { mode: "besoin" } })}>
								Par besoin
							</SectionTitle>
						</View>
						<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hscroll}>
							{needs.slice(0, 8).map((n, i) => (
								<FadeIn key={n.slug} delay={stagger(i)} axis="x" offset={16}>
								<PressableScale
									scaleTo={0.96}
									onPress={() => navigation.navigate("Category", { kind: "besoin", slug: n.slug, name: n.name })}
									style={[styles.need, i === 0 && styles.needFirst]}
								>
									<Text style={[styles.needName, i === 0 && { color: colors.background }]} numberOfLines={3}>
										{n.name}
									</Text>
									<Text style={[styles.needCount, i === 0 && { color: colors.taupe }]}>
										{counts[n.slug]} produit{counts[n.slug] > 1 ? "s" : ""}
									</Text>
								</PressableScale>
								</FadeIn>
							))}
						</ScrollView>

						<View style={styles.section}>
							<SectionTitle action="Voir le shop" onAction={() => navigation.navigate("Tabs", { screen: "Shop", params: { mode: "produit" } })}>
								À découvrir
							</SectionTitle>
						</View>
						<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.hscroll, { gap: 14 }]}>
							{news.map((p, i) => (
								<FadeIn key={p.id} delay={120 + stagger(i, 60, 4)} axis="x" offset={16}>
									<ProductCard product={p} width={165} onPress={() => navigation.navigate("Product", { slug: p.slug, product: p })} />
								</FadeIn>
							))}
						</ScrollView>
					</>
				)}
			</ScrollView>
		</Screen>
	);
}

const styles = StyleSheet.create({
	hero: { paddingHorizontal: space.xl, paddingTop: space.sm, gap: 4 },
	hello: { fontSize: 14, color: colors.textMuted },
	search: { marginHorizontal: space.xl, marginTop: space.lg, height: 48, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
	searchText: { fontSize: 14, color: colors.textMuted },
	loyalty: { marginHorizontal: space.xl, marginTop: space.lg, marginBottom: space.sm, borderRadius: radius.xl - 4, backgroundColor: colors.brand, padding: space.lg, flexDirection: "row", alignItems: "center", gap: 14 },
	loyaltyKicker: { fontSize: font.small, color: colors.taupe, letterSpacing: 1, textTransform: "uppercase" },
	loyaltyText: { fontSize: 16, fontWeight: "600", color: colors.background },
	section: { paddingHorizontal: space.xl, marginTop: 22, marginBottom: 12 },
	hscroll: { paddingHorizontal: space.xl, gap: 10 },
	need: { width: 132, height: 100, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 14, justifyContent: "space-between" },
	needFirst: { backgroundColor: colors.brand, borderColor: colors.brand },
	needName: { fontFamily: fonts.display, fontSize: 16, lineHeight: 19, color: colors.brand },
	needCount: { fontSize: font.small, color: colors.textMuted },
});
