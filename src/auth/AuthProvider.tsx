import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearSession, getAccessToken, isAuthError, loadStoredUser, saveSession, setSessionExpiredHandler } from "../api/client";
import { fetchMe, login as apiLogin, register as apiRegister } from "../api/endpoints";
import type { User } from "../api/types";

const WELCOME_KEY = "shop_welcome_seen";

type AuthContextValue = {
	ready: boolean;
	user: User | null;
	welcomeSeen: boolean;
	markWelcomeSeen: () => void;
	signIn: (email: string, password: string) => Promise<void>;
	signUp: (p: { email: string; password: string; first_name?: string; last_name?: string }) => Promise<"signedIn" | "confirmEmail">;
	signOut: () => Promise<void>;
	refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// La boutique est accessible sans compte : la connexion n'est demandée
// que pour payer avec ses points, suivre ses commandes ou la carte fidélité.
export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [ready, setReady] = useState(false);
	const [user, setUser] = useState<User | null>(null);
	const [welcomeSeen, setWelcomeSeen] = useState(true);

	const refreshUser = useCallback(async () => {
		try {
			const me = await fetchMe();
			const token = await getAccessToken();
			if (token) await saveSession({ access_token: token, user: me });
			setUser(me);
		} catch (e) {
			if (isAuthError(e)) {
				await clearSession();
				setUser(null);
			}
		}
	}, []);

	useEffect(() => {
		(async () => {
			const [token, stored, seen] = await Promise.all([getAccessToken(), loadStoredUser<User>(), AsyncStorage.getItem(WELCOME_KEY)]);
			setWelcomeSeen(seen === "1");
			if (token && stored) {
				setUser(stored);
				refreshUser();
			} else if (token) {
				await refreshUser();
			}
			setReady(true);
		})();
	}, [refreshUser]);

	useEffect(() => {
		setSessionExpiredHandler(() => {
			clearSession().then(() => setUser(null));
		});
		return () => setSessionExpiredHandler(null);
	}, []);

	useEffect(() => {
		const sub = AppState.addEventListener("change", (s) => {
			if (s === "active" && user) refreshUser();
		});
		return () => sub.remove();
	}, [user, refreshUser]);

	const markWelcomeSeen = useCallback(() => {
		setWelcomeSeen(true);
		AsyncStorage.setItem(WELCOME_KEY, "1").catch(() => {});
	}, []);

	const signIn = useCallback(
		async (email: string, password: string) => {
			const res = await apiLogin(email.trim().toLowerCase(), password);
			await saveSession(res);
			setUser(res.user);
			markWelcomeSeen();
			refreshUser();
		},
		[markWelcomeSeen, refreshUser],
	);

	const signUp = useCallback(
		async (p: { email: string; password: string; first_name?: string; last_name?: string }) => {
			const email = p.email.trim().toLowerCase();
			await apiRegister({ ...p, email });
			try {
				await signIn(email, p.password);
				return "signedIn" as const;
			} catch {
				// Confirmation par e-mail activée : le compte existe, il reste à le valider.
				return "confirmEmail" as const;
			}
		},
		[signIn],
	);

	const signOut = useCallback(async () => {
		await clearSession();
		setUser(null);
	}, []);

	const value = useMemo(
		() => ({ ready, user, welcomeSeen, markWelcomeSeen, signIn, signUp, signOut, refreshUser }),
		[ready, user, welcomeSeen, markWelcomeSeen, signIn, signUp, signOut, refreshUser],
	);
	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
	return ctx;
}
