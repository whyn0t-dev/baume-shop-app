import React from "react";
import {
	ActivityIndicator,
	Image,
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
import { useFavorites } from "../store/FavoritesProvider";

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
				<Pressable onPress={onAction} hitSlop={10}>
					<Text style={styles.link}>{action}</Text>
				</Pressable>
			) : null}
		</View>
	);
}

export function IconButton({ icon, onPress, label, badge, style }: { icon: IconName; onPress?: () => void; label: string; badge?: number; style?: any }) {
	return (
		<Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }, style]}>
			<Ionicons name={icon} size={20} color={colors.text} />
			{badge ? (
				<View style={styles.badgeDot}>
					<Text style={styles.badgeDotText}>{badge}</Text>
				</View>
			) : null}
		</Pressable>
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
	return (
		<Pressable
			onPress={onPress}
			disabled={disabled || loading}
			accessibilityRole="button"
			style={({ pressed }) => [
				styles.button,
				small && { height: 40, paddingHorizontal: 16 },
				{ backgroundColor: v.bg, borderColor: v.border, borderWidth: v.border ? 1 : 0 },
				(disabled || loading) && { opacity: 0.5 },
				pressed && { opacity: 0.85 },
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
		</Pressable>
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
	return (
		<View style={[{ gap: 6 }, style as any]}>
			<Text style={styles.fieldLabel}>{label}</Text>
			<TextInput placeholderTextColor={colors.textFaint} {...props} style={[styles.input, error ? { borderColor: colors.danger } : null]} />
			{error ? <Text style={{ fontSize: font.small, color: colors.danger }}>{error}</Text> : null}
		</View>
	);
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
	return <View style={[styles.card, style]}>{children}</View>;
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
	return (
		<Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]} accessibilityState={{ selected: active }}>
			<Text style={[styles.chipText, active && { color: colors.background }]}>{label}</Text>
		</Pressable>
	);
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
	return (
		<View style={styles.segmented}>
			{options.map((o) => {
				const on = o.key === value;
				return (
					<Pressable key={o.key} onPress={() => onChange(o.key)} style={[styles.segment, on && styles.segmentOn]} accessibilityState={{ selected: on }}>
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
			<Switch value={value} onValueChange={onChange} trackColor={{ true: colors.brand, false: colors.border }} thumbColor={colors.white} />
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
			<View style={styles.emptyIcon}>
				<Ionicons name={icon} size={38} color={colors.brand} />
			</View>
			<Text style={styles.emptyTitle}>{title}</Text>
			{text ? <Text style={styles.emptyText}>{text}</Text> : null}
			{children ? <View style={{ alignSelf: "stretch", gap: space.sm, marginTop: space.md }}>{children}</View> : null}
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
		<View style={styles.errorBanner}>
			<Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
			<Text style={{ flex: 1, color: colors.warning, fontSize: font.label }}>{message}</Text>
			{onRetry ? (
				<Pressable onPress={onRetry} hitSlop={8}>
					<Text style={{ color: colors.warning, fontWeight: "700", fontSize: font.label }}>Réessayer</Text>
				</Pressable>
			) : null}
		</View>
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
	return <Image source={{ uri }} style={[{ height, borderRadius: r, backgroundColor: colors.sand, width: "100%" }, style]} resizeMode="cover" />;
}

export function FavoriteButton({ product, size = 34 }: { product: Product; size?: number }) {
	const fav = useFavorites();
	const on = fav.isFavorite(product.id);
	return (
		<Pressable
			onPress={() => fav.toggle(product)}
			hitSlop={6}
			accessibilityRole="button"
			accessibilityLabel={on ? "Retirer des favoris" : "Ajouter aux favoris"}
			style={[styles.favBtn, { width: size, height: size, borderRadius: size / 2 }]}
		>
			<Ionicons name={on ? "heart" : "heart-outline"} size={size * 0.52} color={colors.brand} />
		</Pressable>
	);
}

export function ProductCard({ product, onPress, width, categoryLabel }: { product: Product; onPress: () => void; width?: number; categoryLabel?: string }) {
	const out = product.available === false && !product.preorder;
	return (
		<Pressable onPress={onPress} style={({ pressed }) => [{ width, gap: 8 }, pressed && { opacity: 0.85 }]} accessibilityRole="link">
			<View>
				<ProductImage uri={product.image} height={196} />
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
		</Pressable>
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
	segment: { flex: 1, borderRadius: 18, alignItems: "center", justifyContent: "center" },
	segmentOn: { backgroundColor: colors.surface },
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
