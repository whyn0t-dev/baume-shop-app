import React, { useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	Animated,
	Pressable,
	StyleProp,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	TextInputProps,
	View,
	ViewStyle,
} from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, fonts, radius, space } from "../theme";
import type { Product } from "../api/types";
import { price, productName } from "../lib/format";
import { haptic } from "../lib/haptics";
import { useFavorites } from "../store/FavoritesProvider";
import { FadeIn, FadeImage, PressableScale, Skeleton, animateLayout, isReducedMotion, useBump, usePop } from "./motion";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];

export function Screen({ children, edges = ["top"], style }: { children: React.ReactNode; edges?: Edge[]; style?: StyleProp<ViewStyle> }) {
	return (
		<SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: colors.background }, style]}>
			{children}
		</SafeAreaView>
	);
}

export function TopBar({ left, right }: { left?: React.ReactNode; right?: React.ReactNode }) {
	return (
		<View style={styles.topbar}>
			<View style={{ flexShrink: 1 }}>{left}</View>
			<View>{right}</View>
		</View>
	);
}

export function Title({ children, size = font.h1, style }: { children: React.ReactNode; size?: number; style?: any }) {
	return <Text style={[styles.title, { fontSize: size, lineHeight: size * 1.18 }, style]}>{children}</Text>;
}

export function Kicker({ children }: { children: React.ReactNode }) {
	return <Text style={styles.kicker}>{children}</Text>;
}

export function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
	return (
		<View style={styles.sectionRow}>
			<Text style={styles.sectionLabel}>{children}</Text>
			{right}
		</View>
	);
}

export function SectionTitle({ children, action, onAction }: { children: React.ReactNode; action?: string; onAction?: () => void }) {
	return (
		<View style={styles.sectionTitleRow}>
			<Text style={styles.sectionTitle}>{children}</Text>
			{action ? (
				<Pressable onPress={onAction} hitSlop={10} style={({ pressed }) => pressed && { opacity: 0.6 }}>
					<Text style={styles.link}>{action}</Text>
				</Pressable>
			) : null}
		</View>
	);
}

/** Pastille de compteur qui rebondit quand le nombre augmente. */
export function CountBadge({ count, style }: { count: number; style?: StyleProp<ViewStyle> }) {
	const bump = useBump(count);
	if (!count) return null;
	return (
		<Animated.View style={[styles.badgeDot, style, { transform: [{ scale: bump }] }]}>
			<Text style={styles.badgeDotText}>{count > 99 ? "99+" : count}</Text>
		</Animated.View>
	);
}

export function IconButton({ icon, onPress, label, badge, style }: { icon: IconName; onPress?: () => void; label: string; badge?: number; style?: any }) {
	return (
		<PressableScale onPress={onPress} scaleTo={0.9} accessibilityRole="button" accessibilityLabel={label} style={[styles.iconBtn, style]}>
			<Ionicons name={icon} size={20} color={colors.text} />
			<CountBadge count={badge || 0} />
		</PressableScale>
	);
}

type ButtonVariant = "primary" | "secondary" | "dark" | "light" | "outlineLight" | "danger";

export function Button({
	title,
	onPress,
	variant = "primary",
	icon,
	loading,
	disabled,
	style,
	small,
}: {
	title: string;
	onPress?: () => void;
	variant?: ButtonVariant;
	icon?: IconName;
	loading?: boolean;
	disabled?: boolean;
	style?: StyleProp<ViewStyle>;
	small?: boolean;
}) {
	const v = BUTTON[variant];
	const off = disabled || loading;
	return (
		<PressableScale
			onPress={onPress}
			disabled={off}
			scaleTo={0.97}
			accessibilityRole="button"
			accessibilityState={{ disabled: !!off, busy: !!loading }}
			style={[
				styles.button,
				small && { height: 40, paddingHorizontal: 16 },
				{ backgroundColor: v.bg, borderColor: v.border, borderWidth: v.border ? 1 : 0 },
				disabled && !loading && { opacity: 0.5 },
				style,
			]}
		>
			{loading ? (
				<ActivityIndicator color={v.fg} />
			) : (
				<>
					{icon ? <Ionicons name={icon} size={18} color={v.fg} /> : null}
					<Text style={[styles.buttonText, small && { fontSize: font.label }, { color: v.fg }]}>{title}</Text>
				</>
			)}
		</PressableScale>
	);
}

const BUTTON: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
	primary: { bg: colors.brand, fg: colors.white },
	secondary: { bg: "transparent", fg: colors.brand, border: colors.brand },
	dark: { bg: colors.black, fg: colors.white },
	light: { bg: colors.background, fg: colors.brand },
	outlineLight: { bg: "transparent", fg: colors.background, border: colors.taupe },
	danger: { bg: "transparent", fg: colors.danger, border: colors.border },
};

export function Field({ label, error, style, ...props }: TextInputProps & { label: string; error?: string | null }) {
	const [focused, setFocused] = useState(false);
	return (
		<View style={[{ gap: 6 }, style as any]}>
			<Text style={styles.fieldLabel}>{label}</Text>
			<TextInput
				placeholderTextColor={colors.textFaint}
				{...props}
				onFocus={(e) => {
					setFocused(true);
					props.onFocus?.(e);
				}}
				onBlur={(e) => {
					setFocused(false);
					props.onBlur?.(e);
				}}
				style={[styles.input, focused && { borderColor: colors.taupeWarm }, error ? { borderColor: colors.danger } : null]}
			/>
			{error ? (
				<FadeIn offset={-4} duration={200}>
					<Text style={{ fontSize: font.small, color: colors.danger }}>{error}</Text>
				</FadeIn>
			) : null}
		</View>
	);
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
	return <View style={[styles.card, style]}>{children}</View>;
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
	return (
		<PressableScale
			onPress={() => {
				haptic.selection();
				onPress?.();
			}}
			scaleTo={0.95}
			style={[styles.chip, active && styles.chipActive]}
			accessibilityRole="button"
			accessibilityState={{ selected: active }}
		>
			<Text style={[styles.chipText, active && { color: colors.background }]}>{label}</Text>
		</PressableScale>
	);
}

/** Sélecteur à onglets : la pastille blanche glisse vers l'option choisie. */
export function Segmented<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
	const [width, setWidth] = useState(0);
	const index = Math.max(0, options.findIndex((o) => o.key === value));
	const x = useRef(new Animated.Value(index)).current;
	useEffect(() => {
		if (isReducedMotion()) x.setValue(index);
		else Animated.spring(x, { toValue: index, useNativeDriver: true, speed: 18, bounciness: 4 }).start();
	}, [index]); // eslint-disable-line react-hooks/exhaustive-deps
	const segW = width ? (width - 8) / options.length : 0;
	return (
		<View style={styles.segmented} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="tablist">
			{segW ? (
				<Animated.View
					pointerEvents="none"
					style={[
						styles.segmentThumb,
						{ width: segW, transform: [{ translateX: x.interpolate({ inputRange: [0, Math.max(1, options.length - 1)], outputRange: [0, segW * Math.max(1, options.length - 1)] }) }] },
					]}
				/>
			) : null}
			{options.map((o) => {
				const on = o.key === value;
				return (
					<Pressable
						key={o.key}
						onPress={() => {
							if (on) return;
							haptic.selection();
							onChange(o.key);
						}}
						style={styles.segment}
						accessibilityRole="tab"
						accessibilityState={{ selected: on }}
					>
						<Text style={[styles.segmentText, on && { color: colors.brand, fontWeight: "600" }]}>{o.label}</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

export function Badge({ label, tone = "neutral", icon }: { label: string; tone?: "success" | "info" | "warning" | "danger" | "neutral" | "brand"; icon?: IconName }) {
	const t = TONES[tone];
	return (
		<View style={[styles.badge, { backgroundColor: t.bg }]}>
			{icon ? <Ionicons name={icon} size={13} color={t.fg} /> : null}
			<Text style={[styles.badgeText, { color: t.fg }]}>{label}</Text>
		</View>
	);
}

const TONES = {
	success: { bg: colors.successBg, fg: colors.success },
	info: { bg: colors.infoBg, fg: colors.info },
	warning: { bg: colors.warningBg, fg: colors.warning },
	danger: { bg: colors.dangerBg, fg: colors.danger },
	neutral: { bg: colors.sand, fg: colors.textMuted },
	brand: { bg: colors.sand, fg: colors.brand },
};

export function ListRow({ icon, label, value, onPress, first, color }: { icon: IconName; label: string; value?: string; onPress?: () => void; first?: boolean; color?: string }) {
	return (
		<Pressable onPress={onPress} style={({ pressed }) => [styles.listRow, !first && styles.rowBorder, pressed && { backgroundColor: colors.background }]}>
			<Ionicons name={icon} size={20} color={color || colors.brand} />
			<Text style={[styles.listLabel, color ? { color } : null]}>{label}</Text>
			{value ? <Text style={styles.listValue}>{value}</Text> : null}
			<Ionicons name="chevron-forward" size={16} color={colors.taupeWarm} />
		</Pressable>
	);
}

export function ToggleRow({ icon, label, sub, value, onChange, first }: { icon: IconName; label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; first?: boolean }) {
	return (
		<View style={[styles.listRow, { minHeight: 58 }, !first && styles.rowBorder]}>
			<Ionicons name={icon} size={20} color={colors.brand} />
			<View style={{ flex: 1 }}>
				<Text style={styles.listLabel}>{label}</Text>
				{sub ? <Text style={styles.muted}>{sub}</Text> : null}
			</View>
			<Switch
				value={value}
				onValueChange={(v) => {
					haptic.selection();
					onChange(v);
				}}
				trackColor={{ true: colors.brand, false: colors.border }}
				thumbColor={colors.white}
			/>
		</View>
	);
}

export function TotalRow({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
	return (
		<View style={styles.totalRow}>
			<Text style={[styles.totalText, strong && styles.totalStrong, color ? { color } : null]}>{label}</Text>
			<Text style={[styles.totalText, strong && styles.totalStrong, color ? { color } : null]}>{value}</Text>
		</View>
	);
}

export function EmptyState({ icon, title, text, children }: { icon: IconName; title: string; text?: string; children?: React.ReactNode }) {
	return (
		<View style={styles.empty}>
			<FadeIn offset={14}>
				<View style={styles.emptyIcon}>
					<Ionicons name={icon} size={38} color={colors.brand} />
				</View>
			</FadeIn>
			<FadeIn delay={80} style={{ alignItems: "center", gap: space.md }}>
				<Text style={styles.emptyTitle}>{title}</Text>
				{text ? <Text style={styles.emptyText}>{text}</Text> : null}
			</FadeIn>
			{children ? (
				<FadeIn delay={160} style={{ alignSelf: "stretch", gap: space.sm, marginTop: space.md }}>
					{children}
				</FadeIn>
			) : null}
		</View>
	);
}

export function Loading({ label }: { label?: string }) {
	return (
		<View style={{ padding: space.xxl, alignItems: "center", gap: space.md }}>
			<ActivityIndicator color={colors.brand} />
			{label ? <Text style={styles.muted}>{label}</Text> : null}
		</View>
	);
}

export function ErrorBanner({ message, onRetry }: { message?: string | null; onRetry?: () => void }) {
	if (!message) return null;
	return (
		<FadeIn offset={-6} duration={240}>
			<View style={styles.errorBanner} accessibilityRole="alert">
				<Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
				<Text style={{ flex: 1, color: colors.warning, fontSize: font.label }}>{message}</Text>
				{onRetry ? (
					<Pressable onPress={onRetry} hitSlop={8}>
						<Text style={{ color: colors.warning, fontWeight: "700", fontSize: font.label }}>Réessayer</Text>
					</Pressable>
				) : null}
			</View>
		</FadeIn>
	);
}

export function ProductImage({ uri, height, radius: r = radius.lg, style }: { uri?: string | null; height: number; radius?: number; style?: any }) {
	if (!uri) {
		return (
			<View style={[{ height, borderRadius: r, backgroundColor: colors.sand, alignItems: "center", justifyContent: "center" }, style]}>
				<Ionicons name="leaf-outline" size={height * 0.18} color={colors.taupeWarm} />
			</View>
		);
	}
	// Le fond sable reste visible pendant le chargement, puis la photo apparaît en fondu.
	return (
		<View style={[{ height, borderRadius: r, backgroundColor: colors.sand, width: "100%", overflow: "hidden" }, style]}>
			<FadeImage source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
		</View>
	);
}

export function FavoriteButton({ product, size = 34 }: { product: Product; size?: number }) {
	const fav = useFavorites();
	const on = fav.isFavorite(product.id);
	const pop = usePop(on);
	return (
		<Pressable
			onPress={() => {
				haptic.light();
				// Retrait : la liste des favoris se resserre en douceur.
				if (on) animateLayout(260);
				fav.toggle(product);
			}}
			hitSlop={6}
			accessibilityRole="button"
			accessibilityLabel={on ? "Retirer des favoris" : "Ajouter aux favoris"}
			accessibilityState={{ selected: on }}
			style={[styles.favBtn, { width: size, height: size, borderRadius: size / 2 }]}
		>
			<Animated.View style={{ transform: [{ scale: pop }] }}>
				<Ionicons name={on ? "heart" : "heart-outline"} size={size * 0.52} color={colors.brand} />
			</Animated.View>
		</Pressable>
	);
}

export function ProductCard({ product, onPress, width, categoryLabel }: { product: Product; onPress: () => void; width?: number; categoryLabel?: string }) {
	const out = product.available === false && !product.preorder;
	return (
		<PressableScale onPress={onPress} scaleTo={0.97} style={{ width, gap: 8 }} accessibilityRole="link" accessibilityLabel={`${productName(product)}, ${price(product.price)}`}>
			<View>
				<ProductImage uri={product.image} height={196} style={out ? { opacity: 0.75 } : undefined} />
				<View style={{ position: "absolute", top: 10, right: 10 }}>
					<FavoriteButton product={product} />
				</View>
				{product.preorder ? (
					<View style={styles.cardBadge}>
						<Text style={[styles.cardBadgeText, { color: colors.info }]}>Précommande</Text>
					</View>
				) : out ? (
					<View style={styles.cardBadge}>
						<Text style={styles.cardBadgeText}>Épuisé</Text>
					</View>
				) : null}
			</View>
			<View style={{ gap: 2 }}>
				{categoryLabel ? <Text style={styles.cardCat} numberOfLines={1}>{categoryLabel}</Text> : null}
				<Text style={styles.cardName} numberOfLines={2}>
					{productName(product)}
				</Text>
				<Text style={styles.cardPrice}>{price(product.price)}</Text>
			</View>
		</PressableScale>
	);
}

/* ------------------------------------------------------------------ */
/* Squelettes de chargement (même gabarit que le contenu final)        */
/* ------------------------------------------------------------------ */

/** Carte produit en cours de chargement. */
export function SkeletonProductCard({ width }: { width?: number }) {
	return (
		<View style={{ width, flex: width ? undefined : 1, gap: 8 }}>
			<Skeleton height={196} radius={radius.lg} />
			<Skeleton height={12} width="45%" />
			<Skeleton height={14} width="85%" />
			<Skeleton height={14} width="30%" />
		</View>
	);
}

/** Grille de produits sur deux colonnes. */
export function SkeletonProductGrid({ rows = 2 }: { rows?: number }) {
	return (
		<View style={{ gap: 18 }} accessibilityLabel="Chargement des produits">
			{Array.from({ length: rows }).map((_, i) => (
				<View key={i} style={{ flexDirection: "row", gap: 16 }}>
					<SkeletonProductCard />
					<SkeletonProductCard />
				</View>
			))}
		</View>
	);
}

/** Grille de tuiles (catégories du shop). */
export function SkeletonTiles({ count = 6, height = 108 }: { count?: number; height?: number }) {
	const rows = Math.ceil(count / 2);
	return (
		<View style={{ gap: 10 }} accessibilityLabel="Chargement">
			{Array.from({ length: rows }).map((_, i) => (
				<View key={i} style={{ flexDirection: "row", gap: 10 }}>
					<Skeleton height={height} radius={radius.lg} style={{ flex: 1 }} />
					<Skeleton height={height} radius={radius.lg} style={{ flex: 1 }} />
				</View>
			))}
		</View>
	);
}

/** Liste de cartes (commandes, historique). */
export function SkeletonRows({ count = 3, height = 76 }: { count?: number; height?: number }) {
	return (
		<View style={{ gap: 10 }} accessibilityLabel="Chargement">
			{Array.from({ length: count }).map((_, i) => (
				<Skeleton key={i} height={height} radius={radius.lg} />
			))}
		</View>
	);
}

export const styles = StyleSheet.create({
	topbar: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.xl },
	title: { fontFamily: fonts.display, color: colors.brand, letterSpacing: -0.2 },
	kicker: { fontSize: font.small, letterSpacing: 1.2, textTransform: "uppercase", color: colors.taupeWarm, fontWeight: "700" },
	sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingHorizontal: 4 },
	sectionLabel: { fontSize: font.small, letterSpacing: 1.2, textTransform: "uppercase", color: colors.textMuted, fontWeight: "700" },
	sectionTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
	sectionTitle: { fontFamily: fonts.display, fontSize: font.h2, color: colors.text },
	link: { fontSize: font.label, fontWeight: "600", color: colors.brand },
	iconBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
	badgeDot: { position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
	badgeDotText: { color: colors.white, fontSize: 10, fontWeight: "700" },
	button: { height: 52, borderRadius: 26, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 20 },
	buttonText: { fontSize: font.body, fontWeight: "600" },
	fieldLabel: { fontSize: font.small, fontWeight: "600", color: colors.textMuted },
	input: { height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14, fontSize: font.body, color: colors.text },
	card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
	chip: { height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
	chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
	chipText: { fontSize: font.label, fontWeight: "600", color: colors.text },
	segmented: { height: 44, borderRadius: 22, backgroundColor: colors.sand, padding: 4, flexDirection: "row" },
	segmentThumb: { position: "absolute", top: 4, bottom: 4, left: 4, borderRadius: 18, backgroundColor: colors.surface, shadowColor: colors.brand, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
	segment: { flex: 1, borderRadius: 18, alignItems: "center", justifyContent: "center" },
	segmentText: { fontSize: 14, color: colors.textMuted, fontWeight: "500" },
	badge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", height: 26, borderRadius: 13, paddingHorizontal: 10 },
	badgeText: { fontSize: font.small, fontWeight: "700" },
	listRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingHorizontal: space.lg },
	rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
	listLabel: { flex: 1, fontSize: font.body, color: colors.text },
	listValue: { fontSize: font.label, color: colors.textMuted },
	muted: { fontSize: font.label, color: colors.textMuted },
	totalRow: { flexDirection: "row", justifyContent: "space-between" },
	totalText: { fontSize: 14, color: colors.text },
	totalStrong: { fontSize: 16, fontWeight: "700" },
	empty: { alignItems: "center", paddingHorizontal: space.xxl, paddingVertical: space.xxl, gap: space.md },
	emptyIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.sand, alignItems: "center", justifyContent: "center" },
	emptyTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.brand, textAlign: "center", marginTop: space.sm },
	emptyText: { fontSize: font.body, lineHeight: 22, color: colors.textMuted, textAlign: "center" },
	errorBanner: { flexDirection: "row", alignItems: "center", gap: space.sm, marginHorizontal: space.xl, marginBottom: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.warningBg },
	favBtn: { backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
	cardBadge: { position: "absolute", left: 10, top: 10, height: 24, paddingHorizontal: 8, borderRadius: 12, backgroundColor: colors.surface, justifyContent: "center" },
	cardBadgeText: { fontSize: font.tiny, fontWeight: "700", color: colors.textMuted },
	cardCat: { fontSize: font.tiny, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6 },
	cardName: { fontSize: 14, fontWeight: "600", color: colors.text },
	cardPrice: { fontSize: 14, fontWeight: "600", color: colors.brand },
});
