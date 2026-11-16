import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import { SITE_URL } from "../api/client";
import { fetchCategories, fetchProducts } from "../api/endpoints";
import type { Category, Product } from "../api/types";
import { Button, EmptyState, Loading, ProductImage, Screen, SectionLabel } from "../components/ui";
import { normalize, price, productName } from "../lib/format";
import { colors, font, radius, space } from "../theme";
import type { RootScreenProps } from "../navigation/types";

const RECENT_KEY = "shop_recent_searches";

export default function SearchScreen({ navigation }: RootScreenProps<"Search">) {
	const [query, setQuery] = useState("");
	const [products, setProducts] = useState<Product[] | null>(null);
	const [needs, setNeeds] = useState<Category[]>([]);
	const [catNames, setCatNames] = useState<Record<string, string>>({});
	const [recent, setRecent] = useState<string[]>([]);

	useEffect(() => {
		fetchProducts().then(setProducts).catch(() => setProducts([]));
		fetchCategories("besoin").then(setNeeds).catch(() => {});
		fetchCategories("produit")
			.then((c) => setCatNames(Object.fromEntries(c.map((x) => [x.slug, x.name]))))
			.catch(() => {});
		AsyncStorage.getItem(RECENT_KEY)
			.then((r) => r && setRecent(JSON.parse(r)))
			.catch(() => {});
	}, []);

	const q = normalize(query);
	const results = useMemo(() => {
		if (!products || q.length < 2) return [];
		return products.filter((p) =>
			[productName(p), p.tagline, p.product_category && catNames[p.product_category], ...(p.needs || [])].some((v) => normalize(v).includes(q)),
		);
	}, [products, q, catNames]);

	const popular = useMemo(() => {
		if (!products) return [];
		const c: Record<string, number> = {};
		products.forEach((p) => (p.needs || []).forEach((n) => (c[n] = (c[n] || 0) + 1)));
		return needs.filter((n) => c[n.slug]).sort((a, b) => (c[b.slug] || 0) - (c[a.slug] || 0)).slice(0, 6);
	}, [needs, products]);

	function remember(term: string) {
		const t = term.trim();
		if (t.length < 2) return;
		const next = [t, ...recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 6);
		setRecent(next);
		AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
	}

	function open(p: Product) {
		remember(query);
		navigation.navigate("Product", { slug: p.slug, product: p });
	}

	return (
		<Screen>
			<View style={styles.bar}>
				<View style={styles.field}>
					<Ionicons name="search" size={20} color={colors.brand} />
					<TextInput
						autoFocus
						value={query}
						onChangeText={setQuery}
						placeholder="Rechercher un produit, un besoin…"
						placeholderTextColor={colors.textFaint}
						returnKeyType="search"
						onSubmitEditing={() => remember(query)}
						style={styles.input}
						accessibilityLabel="Rechercher"
					/>
					{query ? (
						<Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityLabel="Effacer">
							<Ionicons name="close-circle" size={18} color={colors.textFaint} />
						</Pressable>
					) : null}
				</View>
				<Pressable onPress={() => navigation.goBack()} hitSlop={8}>
					<Text style={styles.cancel}>Annuler</Text>
				</Pressable>
			</View>

			{q.length >= 2 ? (
				products === null ? (
					<Loading />
				) : results.length ? (
					<FlatList
						data={results}
						keyExtractor={(p) => p.id}
						keyboardShouldPersistTaps="handled"
						contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: space.xxl }}
						ListHeaderComponent={<Text style={[styles.count]}>{results.length} résultat{results.length > 1 ? "s" : ""}</Text>}
						renderItem={({ item, index }) => (
							<Pressable onPress={() => open(item)} style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
								<ProductImage uri={item.image} height={56} radius={10} style={{ width: 50 }} />
								<View style={{ flex: 1 }}>
									<Text style={styles.name} numberOfLines={1}>
										{productName(item)}
									</Text>
									<Text style={styles.meta} numberOfLines={1}>
										{item.product_category ? `${catNames[item.product_category] || item.product_category} · ` : ""}
										{price(item.price)}
									</Text>
								</View>
								<Ionicons name="chevron-forward" size={16} color={colors.taupeWarm} />
							</Pressable>
						)}
					/>
				) : (
					<EmptyState icon="search-outline" title="Aucun résultat" text={`Aucun produit ne correspond à « ${query.trim()} ».`}>
						<Button title="Demander conseil à nos expertes" variant="secondary" onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/contact`)} />
					</EmptyState>
				)
			) : (
				<View style={{ paddingHorizontal: space.xl, gap: space.xl, paddingTop: space.md }}>
					{recent.length ? (
						<View style={{ gap: 10 }}>
							<SectionLabel
								right={
									<Pressable
										onPress={() => {
											setRecent([]);
											AsyncStorage.removeItem(RECENT_KEY).catch(() => {});
										}}
										hitSlop={8}
									>
										<Text style={styles.link}>Effacer</Text>
									</Pressable>
								}
							>
								Recherches récentes
							</SectionLabel>
							<View style={styles.wrap}>
								{recent.map((r) => (
									<Pressable key={r} onPress={() => setQuery(r)} style={styles.pill}>
										<Ionicons name="time-outline" size={14} color={colors.textMuted} />
										<Text style={styles.pillText}>{r}</Text>
									</Pressable>
								))}
							</View>
						</View>
					) : null}
					{popular.length ? (
						<View style={{ gap: 10 }}>
							<SectionLabel>Besoins populaires</SectionLabel>
							<View style={styles.wrap}>
								{popular.map((n) => (
									<Pressable
										key={n.slug}
										onPress={() => navigation.navigate("Category", { kind: "besoin", slug: n.slug, name: n.name })}
										style={[styles.pill, { backgroundColor: colors.sand, borderColor: colors.sand }]}
									>
										<Text style={[styles.pillText, { color: colors.brand, fontWeight: "600" }]}>{n.name}</Text>
									</Pressable>
								))}
							</View>
						</View>
					) : null}
				</View>
			)}
		</Screen>
	);
}

const styles = StyleSheet.create({
	bar: { height: 60, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: space.xl },
	field: { flex: 1, height: 46, borderRadius: 23, borderWidth: 2, borderColor: colors.brand, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14 },
	input: { flex: 1, fontSize: font.body, color: colors.text },
	cancel: { fontSize: 14, fontWeight: "600", color: colors.brand },
	count: { fontSize: font.label, color: colors.textMuted, marginBottom: space.sm },
	row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
	name: { fontSize: font.body, fontWeight: "600", color: colors.text },
	meta: { fontSize: font.small, color: colors.textMuted },
	wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	pill: { height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: 6 },
	pillText: { fontSize: font.label, color: colors.text },
	link: { fontSize: font.label, fontWeight: "600", color: colors.brand },
});
