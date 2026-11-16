import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Backend Render (même API que le site baumeshop-v2.weblax.fr).
export const API_URL = "https://baume-shop-v2-gxo2.onrender.com/api";
export const SITE_URL = "https://baumeshop-v2.weblax.fr";

const KEYS = { access: "shop_access_token", refresh: "shop_refresh_token", user: "shop_user" } as const;

// Render (offre gratuite) peut mettre jusqu'à ~60 s à se réveiller.
const TIMEOUT_MS = 60000;

type RetriableConfig = InternalAxiosRequestConfig & { _authRetried?: boolean; _networkRetries?: number };

export const api = axios.create({ baseURL: API_URL, timeout: TIMEOUT_MS });

let memoryAccess: string | null = null;

export async function getAccessToken(): Promise<string | null> {
	if (memoryAccess) return memoryAccess;
	memoryAccess = await AsyncStorage.getItem(KEYS.access);
	return memoryAccess;
}

export async function saveSession(session: { access_token: string; refresh_token?: string | null; user?: unknown }) {
	memoryAccess = session.access_token;
	const pairs: [string, string][] = [[KEYS.access, session.access_token]];
	if (session.refresh_token) pairs.push([KEYS.refresh, session.refresh_token]);
	if (session.user) pairs.push([KEYS.user, JSON.stringify(session.user)]);
	await AsyncStorage.multiSet(pairs);
}

export async function loadStoredUser<T>(): Promise<T | null> {
	try {
		const raw = await AsyncStorage.getItem(KEYS.user);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		return null;
	}
}

export async function clearSession() {
	memoryAccess = null;
	await AsyncStorage.multiRemove([KEYS.access, KEYS.refresh, KEYS.user]);
}

let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: (() => void) | null) {
	onSessionExpired = handler;
}

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
	if (!refreshing) {
		refreshing = (async () => {
			const refreshToken = await AsyncStorage.getItem(KEYS.refresh);
			if (!refreshToken) return null;
			try {
				const res = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken }, { timeout: TIMEOUT_MS });
				const { access_token, refresh_token } = res.data || {};
				if (!access_token) return null;
				await saveSession({ access_token, refresh_token });
				return access_token as string;
			} catch (e) {
				if (!(e as AxiosError).response?.status) throw e; // réseau : on garde la session
				return null;
			}
		})().finally(() => {
			refreshing = null;
		});
	}
	return refreshing;
}

api.interceptors.request.use(async (config) => {
	const token = await getAccessToken();
	if (token) config.headers.Authorization = `Bearer ${token}`;
	return config;
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

api.interceptors.response.use(
	(response) => response,
	async (error: AxiosError) => {
		const config = error.config as RetriableConfig | undefined;
		if (!config) throw error;
		const status = error.response?.status;
		const url = config.url || "";
		const isAuthCall = url.includes("/auth/");

		if (status === 401 && !isAuthCall && !config._authRetried) {
			config._authRetried = true;
			const hadToken = Boolean(await getAccessToken());
			let token: string | null = null;
			try {
				token = await refreshAccessToken();
			} catch {
				throw error;
			}
			if (token) {
				config.headers.Authorization = `Bearer ${token}`;
				return api.request(config);
			}
			if (hadToken) onSessionExpired?.();
			throw error;
		}

		const method = (config.method || "get").toLowerCase();
		const transient = !status || status === 502 || status === 503 || status === 504;
		if (method === "get" && transient && (config._networkRetries ?? 0) < 1) {
			config._networkRetries = (config._networkRetries ?? 0) + 1;
			await sleep(2500);
			return api.request(config);
		}
		throw error;
	},
);

const MESSAGES: Record<string, string> = {
	"Invalid login credentials": "E-mail ou mot de passe incorrect.",
	"Email not confirmed": "Votre e-mail n'est pas encore confirmé : ouvrez le lien reçu par e-mail.",
	"Email rate limit exceeded": "Trop de tentatives. Patientez un instant avant de réessayer.",
	"Token has expired or is invalid": "Le lien a expiré. Demandez-en un nouveau.",
	"Inscription impossible": "Inscription impossible. Un compte existe peut-être déjà avec cet e-mail.",
};

export function errorMessage(error: unknown, fallback = "Une erreur est survenue."): string {
	const e = error as AxiosError<any>;
	if (e?.code === "ECONNABORTED") return "Le serveur met trop de temps à répondre. Réessayez dans un instant.";
	if (e?.isAxiosError && !e.response) return "Connexion impossible. Vérifiez votre connexion internet.";
	const detail = e?.response?.data?.detail;
	if (typeof detail === "string" && detail) return MESSAGES[detail] || detail;
	if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
	return fallback;
}

export function isAuthError(error: unknown): boolean {
	const status = (error as AxiosError)?.response?.status;
	return status === 401 || status === 403;
}

export function isNetworkError(error: unknown): boolean {
	const e = error as AxiosError;
	return Boolean(e?.isAxiosError && !e.response);
}
