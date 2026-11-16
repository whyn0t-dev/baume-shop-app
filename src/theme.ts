// Charte Baume : identique au site et à l'app de caisse.
export const colors = {
	brand: "#3D2A2A",
	brandDark: "#2A1717",
	taupe: "#D3B1A0",
	taupeWarm: "#B5866B",
	sand: "#EFE6DC",
	background: "#F7F3EE",
	surface: "#FFFFFF",
	border: "#E7DDD3",
	text: "#111111",
	textMuted: "#6B5751",
	textFaint: "#9C8C86",
	success: "#2F7A4B",
	successBg: "#E5F3EA",
	warning: "#7A4800",
	warningBg: "#FDF1DC",
	danger: "#B23A3A",
	dangerBg: "#FBE7E7",
	info: "#1E4F8F",
	infoBg: "#E3EDFA",
	white: "#FFFFFF",
	black: "#000000",
	overlay: "rgba(20, 12, 12, 0.45)",
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 32 };
export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };

// Fraunces (serif, dans l'esprit du logo) pour les titres, police système pour le reste.
export const fonts = { display: "Fraunces_600SemiBold" };

export const font = { tiny: 11, small: 12, label: 13, body: 15, title: 17, h2: 20, h1: 28 };

// Seuils de livraison gratuite (mêmes règles que le backend).
export const SHIPPING = {
	CH: { fee: 6.9, threshold: 60 },
	EU: { fee: 12.9, threshold: 90 },
};
