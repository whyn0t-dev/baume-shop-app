import React, { useEffect, useMemo, useState } from "react";
import { Alert, Dimensions, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { errorMessage } from "../api/client";
import { fetchProduct, fetchProductImages, fetchVariants } from "../api/endpoints";
import type { Product, Variant } from "../api/types";
import { useCart } from "../store/CartProvider";
import { Badge, Button, ErrorBanner, FavoriteButton, IconButton, Kicker, Loading, ProductImage, Title } from "../components/ui";
import { longDate, num, price, productName } from "../lib/format";
import { colors, font, radius, space } from "../theme";
import type { RootScreenProps } from "../navigation/types";

const W = Dimensions.get("window").width;

export default function ProductScreen({ navigation, route }: RootScreenProps<"Product">) {
	const insets = useSafeAreaInsets();
	const cart = useCart();
	const [product, setProduct] = useState<Product | null>(route.params.product || null);
	const [variants, setVariants] = useState<Variant[]>([]);
	const [images, setImages] = useState<string[]>([]);
	const [size, setSize] = useState<string | null>(null);
	const [color, setColor] = useState<string | null>(null);
	const [qty, setQty] = useState(1);
	const [page, setPage] = useState(0);
	const [open, setOpen] = useState<string | null>("description");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let alive = true;
		(async () => {
			try {
				const p = await fetchProduct(route.params.slug);
				if (!alive) return;
				setProduct(p);
				setSize((s) => s ?? null);
				setColor(p.colors?.[0] || null);
				const [v, imgs] = await Promise.all([fetchVariants(p.id).catch(() => []), fetchProductImages(p.id).catch(() => [])]);
				if (!alive) return;
				setVariants(v);
				const urls = imgs.map((i) => i.public_url || i.url || i.storage_path || "").filter((u) => u.startsWith("http"));
				setImages(urls.length ? urls : p.image ? [p.image] : []);
				setError(null);
			} catch (e) {
				if (alive) setError(errorMessage(e, "Impossible de charger ce produit."));
			}
		})();
		return () => {
			alive = false;
		};
	}, [route.params.slug]);

	const sizes = product?.sizes || [];

	const variantFor = (s: string | null, c: string | null) =>
		variants.find((v) => {
			const values = [v.option1, v.option2, v.option3].filter(Boolean);
			return (!s || values.includes(s)) && (!c || values.includes(c));
		});

	const sizeAvailable = (s: string) => {
		if (!variants.length) return product?.available !== false;
		const v = variantFor(s, color);
		return Boolean(v && v.available !== false && (v.stock ?? 1) > 0);
	};

	const selected = useMemo(() => {
		if (!variants.length) return null;
		return variantFor(size, color) || null;
	}, [variants, size, color]); // eslint-disable-line react-hooks/exhaustive-deps

	if (!product) {
		return (
			<View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 60 }}>
				<ErrorBanner message={error} />
				{!error ? <Loading /> : null}
			</View>
		);
	}

	const p = product;
	const needsSize = sizes.length > 0;
	const unitPrice = num(selected?.price ?? p.price);
	const inStock = p.preorder
		? true
		: selected
			? selected.available !== false && (selected.stock ?? 1) > 0
			: needsSize
				? sizes.some(sizeAvailable)
				: p.available !== false;
	const soldOutSizes = needsSize ? sizes.filter((s) => !sizeAvailable(s)) : [];

	function addToCart() {
		if (needsSize && !size) {
			Alert.alert("Choisissez une taille", "Sélectionnez votre taille avant d'ajouter ce produit au panier.");
			return;
		}
		cart.add(p, { variant: selected, size, color, quantity: qty });
		Alert.alert("Ajouté au panier", `${productName(p)}${size ? ` · taille ${size}` : ""}`, [
			{ text: "Continuer mes achats", style: "cancel" },
			{ text: "Voir le panier", onPress: () => navigation.navigate("Tabs", { screen: "Cart" }) },
		]);
	}

	const sections: [string, string, string | null | undefined][] = [
		["description", "Description", p.description],
		["benefits", "Les plus", (p.benefits || []).length ? (p.benefits || []).map((b) => `• ${b}`).join("\n") : null],
		["usage", "Conseils d'utilisation", p.how_to_use],
		["composition", "Composition", p.composition],
		["care", "Entretien", p.care_instructions],
		["shipping", "Livraison et retours", p.shipping_returns],
	];

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
				<View style={{ height: 420, backgroundColor: colors.sand }}>
					{images.length ? (
						<FlatList
							data={images}
							horizontal
							pagingEnabled
							showsHorizontalScrollIndicator={false}
							keyExtractor={(u, i) => `${i}-${u}`}
							onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / W))}
							renderItem={({ item }) => <ProductImage uri={item} height={420} radius={0} style={{ width: W }} />}
						/>
					) : (
						<ProductImage uri={null} height={420} radius={0} />
					)}
					{images.length > 1 ? (
						<View style={styles.dots}>
							{images.map((_, i) => (
								<View key={i} style={[styles.dot, i === page && styles.dotOn]} />
							))}
						</View>
					) : null}
					<View style={[styles.floating, { top: insets.top + 8 }]}>
						<IconButton icon="chevron-back" label="Retour" onPress={() => navigation.goBack()} />
						<FavoriteButton product={p} size={44} />
					</View>
				</View>

				<View style={styles.body}>
					{p.preorder ? (
						<Badge tone="info" icon="time-outline" label={`Précommande${p.preorder_shipping_date ? ` · expédition prévue le ${longDate(p.preorder_shipping_date)}` : ""}`} />
					) : null}
					<View style={styles.titleRow}>
						<View style={{ flex: 1, gap: 4 }}>
							{p.tagline ? <Kicker>Baume</Kicker> : null}
							<Title>{productName(p)}</Title>
						</View>
						<Text style={styles.price}>{price(unitPrice)}</Text>
					</View>
					{p.tagline ? <Text style={styles.tagline}>{p.tagline}</Text> : null}

					{(p.colors || []).length > 1 ? (
						<View style={{ gap: 10 }}>
							<Text style={styles.label}>Couleur{color ? ` : ${color}` : ""}</Text>
							<View style={styles.wrap}>
								{(p.colors || []).map((c) => (
									<Pressable key={c} onPress={() => setColor(c)} style={[styles.option, color === c && styles.optionOn]}>
										<Text style={[styles.optionText, color === c && { color: colors.background }]}>{c}</Text>
									</Pressable>
								))}
							</View>
						</View>
					) : null}

					{needsSize ? (
						<View style={{ gap: 10 }}>
							<Text style={styles.label}>Taille</Text>
							<View style={styles.wrap}>
								{sizes.map((s) => {
									const ok = sizeAvailable(s) || Boolean(p.preorder);
									const on = size === s;
									return (
										<Pressable
											key={s}
											disabled={!ok}
											onPress={() => setSize(s)}
											accessibilityLabel={`Taille ${s}${ok ? "" : " épuisée"}`}
											style={[styles.option, on && styles.optionOn, !ok && { opacity: 0.45 }]}
										>
											<Text style={[styles.optionText, on && { color: colors.background }, !ok && { textDecorationLine: "line-through" }]}>{s}</Text>
										</Pressable>
									);
								})}
							</View>
							{soldOutSizes.length && !p.preorder ? <Text style={styles.muted}>Épuisée : {soldOutSizes.join(", ")}.</Text> : null}
						</View>
					) : null}

					<View style={styles.info}>
						<Ionicons name="cube-outline" size={20} color={colors.brand} />
						<Text style={styles.infoText}>Livraison offerte dès 60 CHF en Suisse · retrait gratuit à la boutique de Genève</Text>
					</View>

					<View style={styles.accordion}>
						{sections
							.filter(([, , content]) => content && String(content).trim())
							.map(([key, title, content], i) => (
								<View key={key} style={i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }}>
									<Pressable style={styles.accHead} onPress={() => setOpen(open === key ? null : key)} accessibilityState={{ expanded: open === key }}>
										<Text style={styles.accTitle}>{title}</Text>
										<Ionicons name={open === key ? "remove" : "add"} size={20} color={colors.brand} />
									</Pressable>
									{open === key ? <Text style={styles.accText}>{String(content).trim()}</Text> : null}
								</View>
							))}
					</View>
				</View>
			</ScrollView>

			<View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
				<View style={styles.stepper}>
					<Pressable onPress={() => setQty(Math.max(1, qty - 1))} style={styles.stepBtn} accessibilityLabel="Diminuer la quantité">
						<Ionicons name="remove" size={18} color={colors.text} />
					</Pressable>
					<Text style={styles.qty}>{qty}</Text>
					<Pressable onPress={() => setQty(Math.min(20, qty + 1))} style={styles.stepBtn} accessibilityLabel="Augmenter la quantité">
						<Ionicons name="add" size={18} color={colors.text} />
					</Pressable>
				</View>
				<Button
					title={!inStock ? "Épuisé" : p.preorder ? `Précommander · ${price(unitPrice * qty)}` : "Ajouter au panier"}
					onPress={addToCart}
					disabled={!inStock}
					style={{ flex: 1 }}
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	dots: { position: "absolute", bottom: 34, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 },
	dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.taupe },
	dotOn: { width: 18, backgroundColor: colors.brand },
	floating: { position: "absolute", left: space.xl, right: space.xl, flexDirection: "row", justifyContent: "space-between" },
	body: { marginTop: -24, backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.xl, gap: space.lg },
	titleRow: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
	price: { fontSize: 20, fontWeight: "700", color: colors.brand, paddingTop: 18 },
	tagline: { fontSize: 14, lineHeight: 21, color: colors.textMuted },
	label: { fontSize: 14, fontWeight: "600", color: colors.text },
	wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	option: { minWidth: 52, height: 44, paddingHorizontal: 12, borderRadius: radius.sm + 2, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
	optionOn: { backgroundColor: colors.brand, borderColor: colors.brand },
	optionText: { fontSize: 14, fontWeight: "600", color: colors.text },
	muted: { fontSize: font.label, color: colors.textMuted },
	info: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
	infoText: { flex: 1, fontSize: font.label, color: colors.text, lineHeight: 18 },
	accordion: { borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
	accHead: { minHeight: 52, paddingHorizontal: space.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	accTitle: { fontSize: font.body, fontWeight: "600", color: colors.text },
	accText: { paddingHorizontal: space.lg, paddingBottom: space.lg, fontSize: 14, lineHeight: 21, color: colors.textMuted },
	bar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: space.xl, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", gap: 12, alignItems: "center" },
	stepper: { flexDirection: "row", alignItems: "center", height: 52, borderRadius: 26, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 4 },
	stepBtn: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
	qty: { minWidth: 18, textAlign: "center", fontSize: 16, fontWeight: "600", color: colors.text },
});
