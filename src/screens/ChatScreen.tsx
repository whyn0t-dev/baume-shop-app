import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { errorMessage } from "../api/client";
import { fetchConversations, fetchMessages, sendMessage, setTyping, startConversation } from "../api/endpoints";
import type { ChatMessage, Conversation } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { BaumeMonogram } from "../components/BaumeLogo";
import { Button, EmptyState, IconButton, Loading, Screen, TopBar } from "../components/ui";
import { colors, font, fonts, radius, space } from "../theme";
import type { RootScreenProps } from "../navigation/types";

const POLL_MS = 3000;
type Pending = { tempId: string; content: string; failed?: boolean };

export default function ChatScreen({ navigation }: RootScreenProps<"Chat">) {
	const insets = useSafeAreaInsets();
	const { user } = useAuth();
	const [conversation, setConversation] = useState<Conversation | null>(null);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [pending, setPending] = useState<Pending[]>([]);
	const [loaded, setLoaded] = useState(false);
	const [input, setInput] = useState("");
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [adminTyping, setAdminTyping] = useState(false);
	const [startNew, setStartNew] = useState(false);
	const listRef = useRef<FlatList>(null);
	const lastTypingSent = useRef(0);
	const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const convRef = useRef<Conversation | null>(null);
	convRef.current = conversation;

	// Charge la dernière conversation et ses messages (n'écrase l'écran que si quelque chose a changé).
	const refresh = useCallback(async () => {
		try {
			const convs = await fetchConversations();
			const conv = convs[0] || null;
			setConversation((prev) => (prev && conv && prev.id === conv.id && prev.status === conv.status && prev.admin_typing_at === conv.admin_typing_at ? prev : conv));
			if (conv) {
				const typingAt = conv.admin_typing_at ? new Date(conv.admin_typing_at).getTime() : 0;
				setAdminTyping(Date.now() - typingAt < 4000);
				const msgs = await fetchMessages(conv.id);
				setMessages((prev) => (prev.length === msgs.length && prev[prev.length - 1]?.id === msgs[msgs.length - 1]?.id ? prev : msgs));
			}
			setError(null);
		} catch (e) {
			setError(errorMessage(e, "Messagerie momentanément indisponible."));
		} finally {
			setLoaded(true);
		}
	}, []);

	// Actualisation toutes les 3 s, uniquement quand l'écran est affiché et l'app au premier plan.
	useFocusEffect(
		useCallback(() => {
			if (!user) return;
			let timer: ReturnType<typeof setInterval> | null = null;
			const start = () => {
				if (!timer) timer = setInterval(refresh, POLL_MS);
			};
			const stop = () => {
				if (timer) clearInterval(timer);
				timer = null;
			};
			refresh();
			start();
			const sub = AppState.addEventListener("change", (s) => {
				if (s === "active") {
					refresh();
					start();
				} else stop();
			});
			return () => {
				stop();
				sub.remove();
				const conv = convRef.current;
				if (conv) setTyping(conv.id, false).catch(() => {});
			};
		}, [user, refresh]),
	);

	useEffect(() => {
		const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
		return () => clearTimeout(t);
	}, [messages.length, pending.length, adminTyping]);

	const locked = conversation?.status === "locked" && !startNew;

	function onChange(text: string) {
		setInput(text);
		const conv = conversation;
		if (!conv || locked) return;
		// « En train d'écrire » : au plus un envoi toutes les 2 s, effacé après 3 s sans frappe.
		if (Date.now() - lastTypingSent.current > 2000) {
			lastTypingSent.current = Date.now();
			setTyping(conv.id, true).catch(() => {});
		}
		if (typingTimer.current) clearTimeout(typingTimer.current);
		typingTimer.current = setTimeout(() => {
			lastTypingSent.current = 0;
			setTyping(conv.id, false).catch(() => {});
		}, 3000);
	}

	async function send(content: string, retryId?: string) {
		const text = content.trim();
		if (!text || sending) return;
		const tempId = retryId || `tmp-${Date.now()}`;
		setPending((p) => (retryId ? p.map((x) => (x.tempId === retryId ? { ...x, failed: false } : x)) : [...p, { tempId, content: text }]));
		if (!retryId) setInput("");
		setSending(true);
		try {
			if (!conversation || conversation.status === "locked") {
				const conv = await startConversation(text);
				setConversation(conv);
				setStartNew(false);
				setMessages(await fetchMessages(conv.id));
			} else {
				const sent = await sendMessage(conversation.id, text);
				setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
			}
			setPending((p) => p.filter((x) => x.tempId !== tempId));
			if (conversation) setTyping(conversation.id, false).catch(() => {});
		} catch (e) {
			setPending((p) => p.map((x) => (x.tempId === tempId ? { ...x, failed: true } : x)));
			setError(errorMessage(e, "Message non envoyé."));
		} finally {
			setSending(false);
		}
	}

	if (!user) {
		return (
			<Screen>
				<TopBar left={<IconButton icon="chevron-back" label="Retour" onPress={() => navigation.goBack()} />} />
				<EmptyState icon="chatbubbles-outline" title="Nos expertes vous répondent" text="Connectez-vous pour poser vos questions en toute discrétion à l'équipe Baume.">
					<Button title="Se connecter" onPress={() => navigation.navigate("Login", { mode: "login", reason: "Connectez-vous pour écrire à nos expertes." })} />
				</EmptyState>
			</Screen>
		);
	}

	type Row = { kind: "msg"; m: ChatMessage; day?: string } | { kind: "pending"; p: Pending } | { kind: "typing" };
	const rows: Row[] = [];
	let lastDay = "";
	const visible = startNew ? [] : messages;
	visible.forEach((m) => {
		const day = new Date(m.created_at).toLocaleDateString("fr-CH", { weekday: "long", day: "numeric", month: "long" });
		rows.push({ kind: "msg", m, day: day !== lastDay ? day : undefined });
		lastDay = day;
	});
	// Un message en cours d'envoi déjà reçu par l'actualisation n'est pas affiché deux fois.
	const recentMine = new Set(messages.filter((m) => m.sender_role === "customer" && Date.now() - new Date(m.created_at).getTime() < 60000).map((m) => m.content));
	pending.filter((p) => p.failed || !recentMine.has(p.content)).forEach((p) => rows.push({ kind: "pending", p }));
	if (adminTyping && !locked) rows.push({ kind: "typing" });

	return (
		<Screen edges={["top"]}>
			<View style={styles.header}>
				<IconButton icon="chevron-back" label="Retour" onPress={() => navigation.goBack()} />
				<View style={styles.avatar}>
					<BaumeMonogram size={22} color={colors.background} />
				</View>
				<View style={{ flex: 1 }}>
					<Text style={styles.headerTitle}>L'équipe Baume</Text>
					<Text style={styles.headerSub}>{adminTyping && !locked ? "En train d'écrire…" : "Nos expertes vous répondent en toute discrétion"}</Text>
				</View>
			</View>

			<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={0}>
				{!loaded ? (
					<Loading />
				) : (
					<FlatList
						ref={listRef}
						data={rows}
						keyExtractor={(r, i) => (r.kind === "msg" ? r.m.id : r.kind === "pending" ? r.p.tempId : `typing-${i}`)}
						contentContainerStyle={{ padding: space.lg, gap: 6, flexGrow: 1 }}
						onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
						keyboardShouldPersistTaps="handled"
						ListEmptyComponent={
							<View style={styles.intro}>
								<Ionicons name="chatbubbles-outline" size={34} color={colors.brand} />
								<Text style={styles.introTitle}>Une question ?</Text>
								<Text style={styles.introText}>
									Produits, tailles, cycle, ménopause, post-partum… Écrivez-nous : une experte Baume vous répond ici, en général dans la journée.
								</Text>
							</View>
						}
						renderItem={({ item }) => {
							if (item.kind === "typing") {
								return (
									<View style={[styles.bubble, styles.theirs]}>
										<Text style={[styles.text, { color: colors.textMuted }]}>…</Text>
									</View>
								);
							}
							if (item.kind === "pending") {
								return (
									<Pressable onPress={() => item.p.failed && send(item.p.content, item.p.tempId)} style={{ alignSelf: "flex-end", maxWidth: "80%" }}>
										<View style={[styles.bubble, styles.mine, { opacity: item.p.failed ? 1 : 0.6 }]}>
											<Text style={[styles.text, { color: colors.white }]}>{item.p.content}</Text>
										</View>
										<Text style={[styles.time, { textAlign: "right", color: item.p.failed ? colors.danger : colors.textMuted }]}>
											{item.p.failed ? "Non envoyé · toucher pour réessayer" : "Envoi…"}
										</Text>
									</Pressable>
								);
							}
							const m = item.m;
							const mine = m.sender_role === "customer";
							return (
								<View>
									{item.day ? <Text style={styles.day}>{item.day}</Text> : null}
									<View style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "80%" }}>
										{!mine ? <Text style={styles.from}>Équipe Baume</Text> : null}
										<View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
											<Text style={[styles.text, mine && { color: colors.white }]}>{m.content}</Text>
										</View>
										<Text style={[styles.time, mine && { textAlign: "right" }]}>
											{new Date(m.created_at).toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" })}
										</Text>
									</View>
								</View>
							);
						}}
					/>
				)}

				{error ? <Text style={styles.error}>{error}</Text> : null}

				{locked ? (
					<View style={[styles.locked, { paddingBottom: insets.bottom + space.md }]}>
						<Text style={styles.lockedText}>
							<Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} /> Cette conversation est clôturée (48 h sans message).
						</Text>
						<Button title="Nouvelle conversation" icon="create-outline" onPress={() => setStartNew(true)} />
					</View>
				) : (
					<View style={[styles.composer, { paddingBottom: insets.bottom + space.sm }]}>
						<TextInput
							value={input}
							onChangeText={onChange}
							placeholder="Écrire un message…"
							placeholderTextColor={colors.textFaint}
							multiline
							maxLength={2000}
							style={styles.input}
						/>
						<Pressable
							onPress={() => send(input)}
							disabled={!input.trim() || sending}
							accessibilityLabel="Envoyer"
							style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]}
						>
							<Ionicons name="arrow-up" size={20} color={colors.white} />
						</Pressable>
					</View>
				)}
			</KeyboardAvoidingView>
		</Screen>
	);
}

const styles = StyleSheet.create({
	header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: space.lg, paddingBottom: space.md, borderBottomWidth: 1, borderBottomColor: colors.border },
	avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
	headerTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.brand },
	headerSub: { fontSize: font.small, color: colors.textMuted },
	intro: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: space.xl, gap: 10 },
	introTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.brand },
	introText: { fontSize: 14, lineHeight: 21, color: colors.textMuted, textAlign: "center" },
	day: { alignSelf: "center", fontSize: font.small, color: colors.textMuted, marginVertical: space.sm, textTransform: "capitalize" },
	from: { fontSize: 10, fontWeight: "700", color: colors.brand, marginBottom: 2, marginLeft: 4 },
	bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg },
	mine: { backgroundColor: colors.brand, borderBottomRightRadius: 6 },
	theirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 6, alignSelf: "flex-start" },
	text: { fontSize: font.body, lineHeight: 21, color: colors.text },
	time: { fontSize: 10, color: colors.textMuted, marginTop: 2, marginHorizontal: 4 },
	error: { fontSize: font.small, color: colors.danger, textAlign: "center", paddingHorizontal: space.lg, paddingBottom: 4 },
	composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: space.lg, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
	input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: font.body, color: colors.text },
	sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
	locked: { paddingHorizontal: space.lg, paddingTop: space.md, gap: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
	lockedText: { fontSize: font.label, color: colors.textMuted, textAlign: "center" },
});
