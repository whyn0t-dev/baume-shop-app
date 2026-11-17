import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { errorMessage } from "../api/client";
import { fetchCategories, fetchCategory, fetchProducts } from "../api/endpoints";
import type { Product } from "../api/types";
import { Button, Chip, EmptyState, ErrorBanner, IconButton, Kicker, ProductCard, Screen, SectionLabel, SkeletonProductGrid, Title, TopBar } from "../components/ui";
import { BottomSheet } from "../components/BottomSheet";
import { haptic } from "../lib/haptics";
import { FadeIn, animateLayout, stagger } from "../components/motion";
import { num } from "../lib/format";
import { colors, font, fonts, radius, space } from "../theme";
import type { RootScreenProps } from "../navigation/types";

type Sort = "relevance" | "price_asc" | "price_desc" | "new";
type Filters = { sort: Sort; size: string | null; maxPrice: number | null; inStock: boolean };
const DEFAULT: Filters = { sort: "relevance", size: null, maxPrice: null, inStock: false };
const PRICE_STEPS = [20, 40, 60, 90, 120];

export default function CategoryScreen({ navigation, route }: RootScreenProps<"Category">) {
	const { kind, slug } = route.params;
	const [name, setName] = useState(route.params.name || "");
	const [description, setDescription] = useState<string | null>(null);
	const [products, setProducts] = useState<Product[]>([]);
	const [catNames, setCatNames] = useState<Record<string, string>>({});
	const [sub, setSub] = useState<string | null>(null);
	const [filters, setFilters] = useState<Filters>(DEFAULT);
	const [sheet, setSheet] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const [list, cats] = await Promise.all([
				fetchProducts(kind === "besoin" ? { need: slug } : { category: slug }),
				fetchCategories("produit").catch(() => []),
			]);
			setProducts(list);
			setCatNames(Object.fromEntries(cats.map((c) => [c.slug, c.name])));
			fetchCategory(kind, slug)
				.then((c) => {
					setName(c.name);
					setDescription(c.description || null);
				})
				.catch(() => {});
			setError(null);
		} catch (e) {
			setError(errorMessage(e, "Impossible de charger les produits."));
		} finally {
			setLoading(false);
		}
	}, [kind, slug]);

	useEffect(() => {
		load();
	}, [load]);

	const subCats = useMemo(() => {
		if (kind !== "besoin") return [];
		return Array.from(new Set(products.map((p) => p.product_category).filter(Boolean))) as string[];
	}, [products, kind]);

	const sizes = useMemo(() => Array.from(new Set(products.flatMap((p) => p.sizes || []))).sort(sizeOrder), [products]);

	const visible = useMemo(() => {
		let list = products.filter((p) => {
			if (sub && p.product_category !== sub) return false;
			if (filters.size && !(p.sizes || []).includes(filters.size)) return false;
			if (filters.maxPrice && num(p.price) > filters.maxPrice) return false;
			if (filters.inStock && p.available === false) return false;
			return true;
		});
		if (filters.sort === "price_asc") list = [...list].sort((a, b) => num(a.price) - num(b.price));
		if (filters.sort === "price_desc") list = [...list].sort((a, b) => num(b.price) - num(a.price));
		if (filters.sort === "new") list = [...list].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
		return list;
	}, [products, sub, filters]);

	const activeFilters = (filters.sort !== "relevance" ? 1 : 0) + (filters.size ? 1 : 0) + (filters.maxPrice ? 1 : 0) + (filters.inStock ? 1 : 0);

	return (
		<Screen>
			<TopBar
				left={<IconButton icon="chevron-back" label="Retour" onPress={() => navigation.goBack()} />}
				right={<IconButton icon="options-outline" label="Filtres et tri" badge={activeFilters || undefined} onPress={() => setSheet(true)} />}
			/>
			<FlatList
				data={loading ? [] : visible}
				numColumns={2}
				keyExtractor={(p) => p.id}
				columnWrapperStyle={{ gap: 16 }}
				contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: 18 }}
				ListHeaderComponent={
					<View style={{ gap: 6, marginBottom: space.sm }}>
						<Kicker>{kind === "besoin" ? "Besoin" : "Collection"}</Kicker>
						<Title>{name || "…"}</Title>
						<Text style={styles.sub}>
							{loading ? "Chargement…" : `${visible.length} produit${visible.length > 1 ? "s" : ""}`}
							{description ? ` · ${description}` : ""}
						</Text>
						<ErrorBanner message={error} onRetry={load} />
						{subCats.length > 1 ? (
							<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: space.sm }}>
								<Chip
									label="Tout"
									active={!sub}
									onPress={() => {
										if (!sub) return;
										animateLayout();
										setSub(null);
									}}
								/>
								{subCats.map((c) => (
									<Chip
										key={c}
										label={catNames[c] || c}
										active={sub === c}
										onPress={() => {
											animateLayout();
											setSub(sub === c ? null : c);
										}}
									/>
								))}
							</ScrollView>
						) : null}
					</View>
				}
				ListEmptyComponent={
					loading ? (
						<SkeletonProductGrid rows={2} />
					) : (
						<EmptyState icon="search-outline" title="Aucun produit" text="Aucun produit ne correspond à ces filtres.">
							{activeFilters || sub ? <Button title="Réinitialiser les filtres" variant="secondary" onPress={() => { animateLayout(); setFilters(DEFAULT); setSub(null); }} /> : null}
						</EmptyState>
					)
				}
				renderItem={({ item, index }) => (
					<FadeIn delay={stagger(index, 50, 6)} style={{ flex: 1 }}>
						<ProductCard
							product={item}
							categoryLabel={item.product_category ? catNames[item.product_category] : undefined}
							onPress={() => navigation.navigate("Product", { slug: item.slug, product: item })}
						/>
					</FadeIn>
				)}
			/>
			<FilterSheet
				visible={sheet}
				sizes={sizes}
				value={filters}
				onClose={() => setSheet(false)}
				onApply={(f) => {
					setSheet(false);
					animateLayout();
					setFilters(f);
				}}
				count={(f) =>
					products.filter((p) => (!sub || p.product_category === sub) && (!f.size || (p.sizes || []).includes(f.size)) && (!f.maxPrice || num(p.price) <= f.maxPrice) && (!f.inStock || p.available !== false)).length
				}
			/>
		</Screen>
	);
}

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];
function sizeOrder(a: string, b: string) {
	const ia = SIZE_ORDER.indexOf(a), ib = SIZE_ORDER.indexOf(b);
	if (ia >= 0 && ib >= 0) return ia - ib;
	return a.localeCompare(b, "fr", { numeric: true });
}

function FilterSheet({ visible, sizes, value, onClose, onApply, count }: { visible: boolean; sizes: string[]; value: Filters; onClose: () => void; onApply: (f: Filters) => void; count: (f: Filters) => number }) {
	const insets = useSafeAreaInsets();
	const [f, setF] = useState<Filters>(value);
	useEffect(() => {
		if (visible) setF(value);
	}, [visible, value]);
	const sorts: [Sort, string][] = [
		["relevance", "Pertinence"],
		["price_asc", "Prix croissant"],
		["price_desc", "Prix décroissant"],
		["new", "Nouveautés"],
	];
	return (
		<BottomSheet visible={visible} onClose={onClose} closeLabel="Fermer les filtres" style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
				<View style={styles.handle} />
				<View style={styles.sheetHead}>
					<Text style={styles.sheetTitle}>Filtres</Text>
					<Pressable onPress={() => { animateLayout(180); setF(DEFAULT); }} hitSlop={8}>
						<Text style={styles.link}>Réinitialiser</Text>
					</Pressable>
				</View>
				<ScrollView contentContainerStyle={{ gap: space.lg }}>
					<SectionLabel>Trier par</SectionLabel>
					<View style={styles.wrap}>
						{sorts.map(([k, l]) => (
							<Chip key={k} label={l} active={f.sort === k} onPress={() => setF({ ...f, sort: k })} />
						))}
					</View>
					{sizes.length ? (
						<>
							<SectionLabel>Taille</SectionLabel>
							<View style={styles.wrap}>
								{sizes.map((s) => (
									<Chip key={s} label={s} active={f.size === s} onPress={() => setF({ ...f, size: f.size === s ? null : s })} />
								))}
							</View>
						</>
					) : null}
					<SectionLabel>Prix maximum</SectionLabel>
					<View style={styles.wrap}>
						<Chip label="Tous" active={!f.maxPrice} onPress={() => setF({ ...f, maxPrice: null })} />
						{PRICE_STEPS.map((p) => (
							<Chip key={p} label={`≤ ${p} CHF`} active={f.maxPrice === p} onPress={() => setF({ ...f, maxPrice: p })} />
						))}
					</View>
					<View style={styles.stock}>
						<Text style={{ fontSize: font.body, color: colors.text }}>En stock uniquement</Text>
						<Switch value={f.inStock} onValueChange={(v) => { haptic.selection(); setF({ ...f, inStock: v }); }} trackColor={{ true: colors.brand, false: colors.border }} thumbColor={colors.white} />
					</View>
				</ScrollView>
				<Button title={`Voir ${count(f)} produit${count(f) > 1 ? "s" : ""}`} onPress={() => onApply(f)} style={{ marginTop: space.lg }} />
		</BottomSheet>
	);
}

const styles = StyleSheet.create({
	sub: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
	sheet: { maxHeight: "82%", backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: space.xl, paddingTop: 10 },
	handle: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: space.md },
	sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.lg },
	sheetTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.brand },
	link: { fontSize: 14, fontWeight: "600", color: colors.brand },
	wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	stock: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
});
