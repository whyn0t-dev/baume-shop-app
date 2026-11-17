import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Dimensions, Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { errorMessage } from "../api/client";
import { fetchProduct, fetchProductImages, fetchVariants } from "../api/endpoints";
import type { Product, Variant } from "../api/types";
import { useCart } from "../store/CartProvider";
import { Badge, Button, ErrorBanner, FavoriteButton, IconButton, Kicker, ProductImage, Title } from "../components/ui";
import { EASE, FadeIn, Skeleton, animateLayout, isReducedMotion, useShake } from "../components/motion";
import { haptic } from "../lib/haptics";
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
	const [open, setOpen] = useState<string | null>("description");
	const [error, setError] = useState<string | null>(null);
	const [sizeError, setSizeError] = useState(false);
	const [added, setAdded] = useState(false);
	const [toast, setToast] = useState<{ key: number; text: string } | null>(null);
	const scrollX = useRef(new Animated.Value(0)).current;
	const scrollRef = useRef<ScrollViewInstance>(null);
	const bodyY = useRef(0);
	const sizesY = useRef(0);
	const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const sizeShake = useShake();

	useEffect(() => () => {
		if (addedTimer.current) clearTimeout(addedTimer.current);
	}, []);

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
		// Ouverture depuis le panier ou une commande : squelette au gabarit de la fiche.
		return (
			<View style={{ flex: 1, backgroundColor: colors.background }}>
				<Skeleton height={420} radius={0} />
				<View style={[styles.floating, { top: insets.top + 8 }]}>
					<IconButton icon="chevron-back" label="Retour" onPress={() => navigation.goBack()} />
				</View>
				<View style={[styles.body, { gap: 12 }]}>
					{error ? (
						<ErrorBanner message={error} />
					) : (
						<>
							<Skeleton height={30} width="70%" />
							<Skeleton height={16} width="35%" />
							<Skeleton height={14} width="90%" style={{ marginTop: space.md }} />
							<Skeleton height={14} width="80%" />
						</>
					)}
				</View>
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
			// Taille manquante : on ramène la cliente sur le sélecteur, qui tremble légèrement.
			haptic.warning();
			setSizeError(true);
			scrollRef.current?.scrollTo({ y: Math.max(0, bodyY.current + sizesY.current - 140), animated: !isReducedMotion() });
			setTimeout(sizeShake.shake, isReducedMotion() ? 0 : 250);
			AccessibilityInfo.announceForAccessibility("Choisissez votre taille pour continuer.");
			return;
		}
		cart.add(p, { variant: selected, size, color, quantity: qty });
		haptic.success();
		setAdded(true);
		if (addedTimer.current) clearTimeout(addedTimer.current);
		addedTimer.current = setTimeout(() => setAdded(false), 1800);
		const label = `${qty > 1 ? `${qty} × ` : ""}${productName(p)}${size ? ` · taille ${size}` : ""}`;
		setToast({ key: Date.now(), text: label });
		AccessibilityInfo.announceForAccessibility(`Ajouté au panier : ${label}`);
	}

	function chooseSize(s: string) {
		if (s === size) return;
		haptic.selection();
		if (sizeError) animateLayout(180);
		setSizeError(false);
		setSize(s);
	}

	function changeQty(next: number) {
		const v = Math.min(20, Math.max(1, next));
		if (v === qty) return;
		haptic.selection();
		setQty(v);
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
			<ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} scrollEventThrottle={16}>
				<View style={{ height: 420, backgroundColor: colors.sand }}>
					{images.length ? (
						<Animated.FlatList
							data={images}
							horizontal
							pagingEnabled
							showsHorizontalScrollIndicator={false}
							keyExtractor={(u, i) => `${i}-${u}`}
							scrollEventThrottle={16}
							// Les points suivent le doigt en continu (et non une fois la photo arrivée).
							onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
							renderItem={({ item }) => <ProductImage uri={item} height={420} radius={0} style={{ width: W }} />}
						/>
					) : (
						<ProductImage uri={null} height={420} radius={0} />
					)}
					{images.length > 1 ? (
						<View style={styles.dots}>
							{images.map((_, i) => {
								const range = [(i - 1) * W, i * W, (i + 1) * W];
								return (
									<Animated.View
										key={i}
										style={[
											styles.dot,
											{
												width: scrollX.interpolate({ inputRange: range, outputRange: [6, 18, 6], extrapolate: "clamp" }),
												backgroundColor: scrollX.interpolate({ inputRange: range, outputRange: [colors.taupe, colors.brand, colors.taupe], extrapolate: "clamp" }),
											},
										]}
									/>
								);
							})}
						</View>
					) : null}
					<View style={[styles.floating, { top: insets.top + 8 }]}>
						<IconButton icon="chevron-back" label="Retour" onPress={() => navigation.goBack()} />
						<FavoriteButton product={p} size={44} />
					</View>
				</View>

				<View style={styles.body} onLayout={(e) => (bodyY.current = e.nativeEvent.layout.y)}>
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
									<Pressable
										key={c}
										onPress={() => {
											if (c === color) return;
											haptic.selection();
											setColor(c);
										}}
										style={[styles.option, color === c && styles.optionOn]}
										accessibilityState={{ selected: color === c }}
									>
										<Text style={[styles.optionText, color === c && { color: colors.background }]}>{c}</Text>
									</Pressable>
								))}
							</View>
						</View>
					) : null}

					{needsSize ? (
						<View style={{ gap: 10 }} onLayout={(e) => (sizesY.current = e.nativeEvent.layout.y)}>
							<Text style={[styles.label, sizeError && { color: colors.danger }]}>Taille{size ? ` : ${size}` : ""}</Text>
							<Animated.View style={[styles.wrap, sizeShake.style]}>
								{sizes.map((s) => {
									const ok = sizeAvailable(s) || Boolean(p.preorder);
									const on = size === s;
									return (
										<Pressable
											key={s}
											disabled={!ok}
											onPress={() => chooseSize(s)}
											accessibilityLabel={`Taille ${s}${ok ? "" : " épuisée"}`}
											accessibilityState={{ selected: on, disabled: !ok }}
											style={[styles.option, on && styles.optionOn, sizeError && !on && ok && { borderColor: colors.danger }, !ok && { opacity: 0.45 }]}
										>
											<Text style={[styles.optionText, on && { color: colors.background }, !ok && { textDecorationLine: "line-through" }]}>{s}</Text>
										</Pressable>
									);
								})}
							</Animated.View>
							{sizeError ? (
								<FadeIn offset={-4} duration={200}>
									<Text style={[styles.muted, { color: colors.danger }]}>Choisissez votre taille pour continuer.</Text>
								</FadeIn>
							) : null}
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
									<Pressable
										style={styles.accHead}
										onPress={() => {
											// L'ouverture et la fermeture des sections glissent au lieu de sauter.
											animateLayout(220);
											setOpen(open === key ? null : key);
										}}
										accessibilityRole="button"
										accessibilityState={{ expanded: open === key }}
									>
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
					<Pressable onPress={() => changeQty(qty - 1)} disabled={qty <= 1} style={[styles.stepBtn, qty <= 1 && { opacity: 0.35 }]} accessibilityLabel="Diminuer la quantité">
						<Ionicons name="remove" size={18} color={colors.text} />
					</Pressable>
					<Text style={styles.qty}>{qty}</Text>
					<Pressable onPress={() => changeQty(qty + 1)} disabled={qty >= 20} style={[styles.stepBtn, qty >= 20 && { opacity: 0.35 }]} accessibilityLabel="Augmenter la quantité">
						<Ionicons name="add" size={18} color={colors.text} />
					</Pressable>
				</View>
				<Button
					title={!inStock ? "Épuisé" : added ? (p.preorder ? "Précommande ajoutée" : "Ajouté au panier") : p.preorder ? `Précommander · ${price(unitPrice * qty)}` : "Ajouter au panier"}
					icon={added && inStock ? "checkmark" : undefined}
					onPress={addToCart}
					disabled={!inStock}
					style={{ flex: 1 }}
				/>
			</View>

			{toast ? (
				<AddedToast
					key={toast.key}
					text={toast.text}
					bottom={insets.bottom + 88}
					onView={() => {
						setToast(null);
						navigation.navigate("Tabs", { screen: "Cart" });
					}}
					onHide={() => setToast(null)}
				/>
			) : null}
		</View>
	);
}

/** Confirmation d'ajout : glisse au-dessus de la barre d'achat, puis disparaît seule. */
function AddedToast({ text, bottom, onView, onHide }: { text: string; bottom: number; onView: () => void; onHide: () => void }) {
	const v = useRef(new Animated.Value(0)).current;
	useEffect(() => {
		const reduced = isReducedMotion();
		const a = Animated.sequence([
			reduced ? Animated.timing(v, { toValue: 1, duration: 0, useNativeDriver: true }) : Animated.spring(v, { toValue: 1, speed: 16, bounciness: 5, useNativeDriver: true }),
			Animated.delay(3200),
			Animated.timing(v, { toValue: 0, duration: reduced ? 0 : 200, easing: EASE, useNativeDriver: true }),
		]);
		a.start(({ finished }) => finished && onHide());
		return () => a.stop();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps
	return (
		<Animated.View
			style={[
				styles.toast,
				{ bottom, opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] },
			]}
		>
			<Ionicons name="checkmark-circle" size={20} color={colors.taupe} />
			<View style={{ flex: 1 }}>
				<Text style={styles.toastTitle}>Ajouté au panier</Text>
				<Text style={styles.toastText} numberOfLines={1}>
					{text}
				</Text>
			</View>
			<Pressable onPress={onView} hitSlop={10} accessibilityRole="button">
				<Text style={styles.toastAction}>Voir</Text>
			</Pressable>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	toast: { position: "absolute", left: space.xl, right: space.xl, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: radius.lg, backgroundColor: colors.brand, shadowColor: colors.brandDark, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
	toastTitle: { fontSize: font.label, fontWeight: "700", color: colors.background },
	toastText: { fontSize: font.small, color: colors.taupe },
	toastAction: { fontSize: 14, fontWeight: "700", color: colors.background, textDecorationLine: "underline" },
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
