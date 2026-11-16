import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { errorMessage } from "../api/client";
import { fetchCategories, fetchProducts } from "../api/endpoints";
import type { Category } from "../api/types";
import { ErrorBanner, IconButton, Loading, Screen, Segmented, Title, TopBar } from "../components/ui";
import { colors, font, fonts, radius, space } from "../theme";
import type { RootStackParamList, TabParamList } from "../navigation/types";

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, "Shop">, NativeStackScreenProps<RootStackParamList>>;
type Mode = "besoin" | "produit";

export default function ShopScreen({ navigation, route }: Props) {
	const [mode, setMode] = useState<Mode>(route.params?.mode || "besoin");
	const [cats, setCats] = useState<Record<Mode, Category[]>>({ besoin: [], produit: [] });
	const [counts, setCounts] = useState<Record<string, number>>({});
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	useEffect(() => {
		if (route.params?.mode) setMode(route.params.mode);
	}, [route.params?.mode]);

	const load = useCallback(async () => {
		try {
			const [besoin, produit, products] = await Promise.all([fetchCategories("besoin"), fetchCategories("produit"), fetchProducts()]);
			const c: Record<string, number> = {};
			products.forEach((p) => {
				(p.needs || []).forEach((n) => (c[`besoin:${n}`] = (c[`besoin:${n}`] || 0) + 1));
				if (p.product_category) c[`produit:${p.product_category}`] = (c[`produit:${p.product_category}`] || 0) + 1;
			});
			setCounts(c);
			// Seules les catégories qui contiennent des produits sont affichées.
			const sort = (kind: Mode, list: Category[]) => list.filter((x) => c[`${kind}:${x.slug}`]).sort((a, b) => (c[`${kind}:${b.slug}`] || 0) - (c[`${kind}:${a.slug}`] || 0));
			setCats({ besoin: sort("besoin", besoin), produit: sort("produit", produit) });
			setError(null);
		} catch (e) {
			setError(errorMessage(e, "Impossible de charger les catégories."));
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const data = cats[mode];

	return (
		<Screen>
			<TopBar left={<Title size={26}>Shop</Title>} right={<IconButton icon="search" label="Rechercher" onPress={() => navigation.navigate("Search")} />} />
			<View style={{ paddingHorizontal: space.xl, gap: space.md }}>
				<Segmented
					value={mode}
					onChange={setMode}
					options={[
						{ key: "besoin", label: "Par besoin" },
						{ key: "produit", label: "Par produit" },
					]}
				/>
				<Text style={styles.intro}>
					{mode === "besoin"
						? "Choisissez ce qui vous concerne : nos expertes ont sélectionné les produits adaptés."
						: "Toutes nos collections, des protections menstruelles aux coffrets cadeaux."}
				</Text>
			</View>
			<ErrorBanner message={error} onRetry={load} />
			{loading ? (
				<Loading />
			) : (
				<FlatList
					data={data}
					key={mode}
					numColumns={2}
					keyExtractor={(c) => c.slug}
					columnWrapperStyle={{ gap: 10 }}
					contentContainerStyle={{ padding: space.xl, paddingTop: space.md, gap: 10 }}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
					renderItem={({ item }) => {
						const n = counts[`${mode}:${item.slug}`] || 0;
						return (
							<Pressable
								style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
								onPress={() => navigation.navigate("Category", { kind: mode, slug: item.slug, name: item.name })}
							>
								<Text style={styles.name} numberOfLines={3}>
									{item.name}
								</Text>
								<View style={styles.bottom}>
									<Text style={styles.count}>
										{n} produit{n > 1 ? "s" : ""}
									</Text>
									<Ionicons name="chevron-forward" size={16} color={colors.taupeWarm} />
								</View>
							</Pressable>
						);
					}}
				/>
			)}
		</Screen>
	);
}

const styles = StyleSheet.create({
	intro: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
	card: { flex: 1, height: 108, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 14, justifyContent: "space-between" },
	name: { fontFamily: fonts.display, fontSize: 16, lineHeight: 20, color: colors.brand },
	bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	count: { fontSize: font.small, color: colors.textMuted },
});
