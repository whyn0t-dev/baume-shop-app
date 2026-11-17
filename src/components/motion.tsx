// Briques d'animation de l'app : discrètes, courtes, et désactivées quand
// l'utilisatrice a activé « Réduire les animations » dans les réglages du téléphone.
// Tout repose sur l'API Animated de React Native (pilote natif dès que possible).
import React, { useEffect, useRef, useState } from "react";
import {
	AccessibilityInfo,
	Animated,
	Easing,
	ImageProps,
	LayoutAnimation,
	Pressable,
	PressableProps,
	StyleProp,
	View,
	ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../theme";

/* ------------------------------------------------------------------ */
/* Réduction des animations                                            */
/* ------------------------------------------------------------------ */

let reduceMotion = false;
const listeners = new Set<(v: boolean) => void>();
const setReduce = (v: boolean) => {
	reduceMotion = v;
	listeners.forEach((l) => l(v));
};
AccessibilityInfo.isReduceMotionEnabled()
	.then(setReduce)
	.catch(() => {});
AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);

export const isReducedMotion = () => reduceMotion;

export function useReducedMotion() {
	const [v, setV] = useState(reduceMotion);
	useEffect(() => {
		listeners.add(setV);
		setV(reduceMotion);
		return () => {
			listeners.delete(setV);
		};
	}, []);
	return v;
}

/* ------------------------------------------------------------------ */
/* Courbes et durées                                                   */
/* ------------------------------------------------------------------ */

/** Sortie douce, sans rebond : la courbe par défaut de l'app. */
export const EASE = Easing.bezier(0.22, 1, 0.36, 1);
export const DUR = { fast: 160, base: 240, slow: 380 };

/** Délai d'apparition en cascade : seuls les premiers éléments sont décalés, la suite apparaît sans attendre. */
export const stagger = (index: number, step = 45, max = 8) => (index < max ? index * step : 0);

/**
 * Anime le prochain changement de mise en page (ajout, suppression, déplacement d'éléments).
 * À appeler juste avant la mise à jour d'état concernée.
 */
export function animateLayout(duration = 240) {
	if (reduceMotion) return;
	LayoutAnimation.configureNext({
		duration,
		create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
		update: { type: LayoutAnimation.Types.easeInEaseOut },
		delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
	});
}

/* ------------------------------------------------------------------ */
/* Apparition                                                          */
/* ------------------------------------------------------------------ */

/** Apparition en fondu avec une légère montée. Joue une seule fois, au premier affichage. */
export function FadeIn({
	children,
	delay = 0,
	offset = 10,
	axis = "y",
	duration = DUR.slow,
	style,
}: {
	children: React.ReactNode;
	delay?: number;
	offset?: number;
	axis?: "x" | "y";
	duration?: number;
	style?: StyleProp<ViewStyle>;
}) {
	const v = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
	useEffect(() => {
		if (reduceMotion) {
			v.setValue(1);
			return;
		}
		const a = Animated.timing(v, { toValue: 1, duration, delay, easing: EASE, useNativeDriver: true });
		a.start();
		return () => a.stop();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps
	const shift = v.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] });
	return (
		<Animated.View style={[style, { opacity: v, transform: [axis === "y" ? { translateY: shift } : { translateX: shift }] }]}>{children}</Animated.View>
	);
}

/* ------------------------------------------------------------------ */
/* Appui                                                               */
/* ------------------------------------------------------------------ */

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

/**
 * Pressable qui se réduit légèrement sous le doigt puis revient en place.
 * Le style s'applique directement à l'élément : la mise en page est identique à un Pressable classique.
 */
export function PressableScale({
	children,
	style,
	scaleTo = 0.97,
	onPressIn,
	onPressOut,
	...rest
}: Omit<PressableProps, "style" | "children"> & { style?: StyleProp<ViewStyle>; scaleTo?: number; children?: React.ReactNode }) {
	const s = useRef(new Animated.Value(1)).current;
	const to = (value: number) => {
		if (reduceMotion) return;
		Animated.spring(s, { toValue: value, useNativeDriver: true, speed: 40, bounciness: value === 1 ? 5 : 0 }).start();
	};
	return (
		<AnimatedPressableBase
			{...rest}
			onPressIn={(e) => {
				to(scaleTo);
				onPressIn?.(e);
			}}
			onPressOut={(e) => {
				to(1);
				onPressOut?.(e);
			}}
			style={[style, { transform: [{ scale: s }] }]}
		>
			{children}
		</AnimatedPressableBase>
	);
}

/* ------------------------------------------------------------------ */
/* Valeurs qui changent                                                */
/* ------------------------------------------------------------------ */

/** Petit rebond quand un compteur augmente (badge du panier, messages non lus). Rien quand il baisse. */
export function useBump(value: number) {
	const s = useRef(new Animated.Value(1)).current;
	const prev = useRef(value);
	useEffect(() => {
		if (value > prev.current && !reduceMotion) {
			s.setValue(1);
			Animated.sequence([
				Animated.timing(s, { toValue: 1.3, duration: 120, easing: EASE, useNativeDriver: true }),
				Animated.spring(s, { toValue: 1, speed: 14, bounciness: 12, useNativeDriver: true }),
			]).start();
		}
		prev.current = value;
	}, [value]); // eslint-disable-line react-hooks/exhaustive-deps
	return s;
}

/** « Pop » d'un état activé/désactivé (cœur des favoris). Ne joue pas au premier affichage. */
export function usePop(on: boolean) {
	const s = useRef(new Animated.Value(1)).current;
	const first = useRef(true);
	useEffect(() => {
		if (first.current) {
			first.current = false;
			return;
		}
		if (reduceMotion) return;
		s.setValue(on ? 0.7 : 0.85);
		Animated.spring(s, { toValue: 1, speed: 16, bounciness: on ? 14 : 4, useNativeDriver: true }).start();
	}, [on]); // eslint-disable-line react-hooks/exhaustive-deps
	return s;
}

/** Secousse horizontale pour signaler une erreur de saisie (taille non choisie…). */
export function useShake() {
	const x = useRef(new Animated.Value(0)).current;
	const shake = () => {
		if (reduceMotion) return;
		x.setValue(0);
		Animated.sequence([
			Animated.timing(x, { toValue: 8, duration: 50, useNativeDriver: true }),
			Animated.timing(x, { toValue: -8, duration: 50, useNativeDriver: true }),
			Animated.timing(x, { toValue: 5, duration: 50, useNativeDriver: true }),
			Animated.timing(x, { toValue: -5, duration: 50, useNativeDriver: true }),
			Animated.timing(x, { toValue: 0, duration: 50, useNativeDriver: true }),
		]).start();
	};
	return { style: { transform: [{ translateX: x }] }, shake };
}

/**
 * Compteur animé : part de 0 au premier chargement, puis de l'ancienne valeur vers la nouvelle.
 * Tant que la valeur est inconnue (null), renvoie null.
 */
export function useCountUp(target: number | null | undefined, duration = 800) {
	const [shown, setShown] = useState<number | null>(target ?? null);
	const from = useRef<number | null>(null);
	useEffect(() => {
		if (target === null || target === undefined) return;
		const start = from.current ?? 0;
		from.current = target;
		if (reduceMotion || start === target) {
			setShown(target);
			return;
		}
		const v = new Animated.Value(start);
		const id = v.addListener(({ value }) => setShown(Math.round(value)));
		Animated.timing(v, { toValue: target, duration, easing: EASE, useNativeDriver: false }).start(() => setShown(target));
		return () => {
			v.removeListener(id);
			v.stopAnimation();
			setShown(target);
		};
	}, [target]); // eslint-disable-line react-hooks/exhaustive-deps
	return shown;
}

/* ------------------------------------------------------------------ */
/* Composants visuels                                                  */
/* ------------------------------------------------------------------ */

/** Barre de progression qui se remplit jusqu'à la valeur (0 → 1). */
export function ProgressBar({
	progress,
	height = 8,
	color = colors.brand,
	track = colors.sand,
	style,
}: {
	progress: number;
	height?: number;
	color?: string;
	track?: string;
	style?: StyleProp<ViewStyle>;
}) {
	const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
	const v = useRef(new Animated.Value(0)).current;
	useEffect(() => {
		if (reduceMotion) v.setValue(p);
		else Animated.timing(v, { toValue: p, duration: 700, easing: EASE, useNativeDriver: false }).start();
	}, [p]); // eslint-disable-line react-hooks/exhaustive-deps
	return (
		<View
			style={[{ height, borderRadius: height / 2, backgroundColor: track, overflow: "hidden" }, style]}
			accessibilityRole="progressbar"
			accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}
		>
			<Animated.View style={{ height, borderRadius: height / 2, backgroundColor: color, width: v.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }} />
		</View>
	);
}

/** Image qui apparaît en fondu une fois chargée (au lieu de « clignoter »). Le fond sable reste visible pendant le chargement. */
export function FadeImage({ style, onLoad, ...props }: Omit<ImageProps, "style"> & { style?: any }) {
	const o = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
	return (
		<Animated.Image
			{...props}
			style={[style, { opacity: o }]}
			onLoad={(e) => {
				if (!reduceMotion) Animated.timing(o, { toValue: 1, duration: 280, easing: EASE, useNativeDriver: true }).start();
				else o.setValue(1);
				onLoad?.(e);
			}}
			onError={(e) => {
				o.setValue(1);
				props.onError?.(e);
			}}
		/>
	);
}

/** Pulsation partagée par les blocs « squelette » pendant un chargement. */
function usePulse() {
	const v = useRef(new Animated.Value(1)).current;
	useEffect(() => {
		if (reduceMotion) return;
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(v, { toValue: 0.5, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
				Animated.timing(v, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
			]),
		);
		loop.start();
		return () => loop.stop();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps
	return v;
}

/** Bloc de chargement aux couleurs de Baume. */
export function Skeleton({ width, height, radius = 10, style }: { width?: number | `${number}%`; height: number; radius?: number; style?: StyleProp<ViewStyle> }) {
	const pulse = usePulse();
	return <Animated.View style={[{ width: width ?? "100%", height, borderRadius: radius, backgroundColor: colors.sand, opacity: pulse }, style]} />;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CHECK_LENGTH = 21; // longueur du tracé de la coche

/** Coche de succès : le disque apparaît, puis la coche se dessine. */
export function SuccessCheck({ size = 84, color = colors.brand, checkColor = colors.background, onDone }: { size?: number; color?: string; checkColor?: string; onDone?: () => void }) {
	const disc = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
	const tick = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
	useEffect(() => {
		if (reduceMotion) {
			onDone?.();
			return;
		}
		const a = Animated.sequence([
			Animated.spring(disc, { toValue: 1, speed: 12, bounciness: 8, useNativeDriver: true }),
			Animated.timing(tick, { toValue: 1, duration: 340, easing: EASE, useNativeDriver: false }),
		]);
		a.start(({ finished }) => finished && onDone?.());
		return () => a.stop();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps
	return (
		<Animated.View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={{
				width: size,
				height: size,
				borderRadius: size / 2,
				backgroundColor: color,
				alignItems: "center",
				justifyContent: "center",
				opacity: disc.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
				transform: [{ scale: disc.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
			}}
		>
			<Svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24">
				<AnimatedPath
					d="M5 12.5l4.5 4.5L19 7.5"
					stroke={checkColor}
					strokeWidth={2.6}
					fill="none"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeDasharray={CHECK_LENGTH}
					strokeDashoffset={tick.interpolate({ inputRange: [0, 1], outputRange: [CHECK_LENGTH, 0] })}
				/>
			</Svg>
		</Animated.View>
	);
}

/** Trois points qui ondulent : « en train d'écrire ». */
export function TypingDots({ color = colors.textMuted }: { color?: string }) {
	const dots = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
	useEffect(() => {
		if (reduceMotion) return;
		const loops = dots.map((d, i) =>
			Animated.loop(
				Animated.sequence([
					Animated.delay(i * 140),
					Animated.timing(d, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
					Animated.timing(d, { toValue: 0, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
					Animated.delay((2 - i) * 140 + 200),
				]),
			),
		);
		loops.forEach((l) => l.start());
		return () => loops.forEach((l) => l.stop());
	}, []); // eslint-disable-line react-hooks/exhaustive-deps
	return (
		<View style={{ flexDirection: "row", gap: 4, height: 21, alignItems: "center" }} accessibilityLabel="L'équipe Baume est en train d'écrire">
			{dots.map((d, i) => (
				<Animated.View
					key={i}
					style={{
						width: 7,
						height: 7,
						borderRadius: 4,
						backgroundColor: color,
						opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
						transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
					}}
				/>
			))}
		</View>
	);
}
