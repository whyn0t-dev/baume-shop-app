import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Modal, Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { colors } from "../theme";
import { EASE, isReducedMotion } from "./motion";

const H = Dimensions.get("window").height;

/**
 * Feuille qui monte depuis le bas. Le voile sombre apparaît en fondu (il ne glisse pas avec la feuille),
 * et la fermeture rejoue l'animation à l'envers avant de démonter la fenêtre.
 */
export function BottomSheet({
	visible,
	onClose,
	children,
	style,
	closeLabel = "Fermer",
}: {
	visible: boolean;
	onClose: () => void;
	children: React.ReactNode;
	style?: StyleProp<ViewStyle>;
	closeLabel?: string;
}) {
	const [mounted, setMounted] = useState(visible);
	const v = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (visible) {
			setMounted(true);
			if (isReducedMotion()) v.setValue(1);
			else Animated.spring(v, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 2 }).start();
		} else if (mounted) {
			if (isReducedMotion()) {
				v.setValue(0);
				setMounted(false);
			} else {
				Animated.timing(v, { toValue: 0, duration: 220, easing: EASE, useNativeDriver: true }).start(({ finished }) => finished && setMounted(false));
			}
		}
	}, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

	if (!mounted) return null;

	return (
		<Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
			<Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: v }]}>
				<Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel={closeLabel} />
			</Animated.View>
			<Animated.View
				style={[
					styles.sheet,
					style,
					{ transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [H, 0], extrapolate: "clamp" }) }] },
				]}
			>
				{children}
			</Animated.View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	sheet: { position: "absolute", left: 0, right: 0, bottom: 0 },
});
