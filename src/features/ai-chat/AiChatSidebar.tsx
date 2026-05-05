import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, User, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { streamChatResponse, createChatMessages, isAiConfigured, type ChatMessage } from "@/services/aiChatService";
import { QUICK_PROMPTS_EN, QUICK_PROMPTS_AR } from "./aiChatSystemPrompt";

type DisplayMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
};

const AiChatSidebar = () => {
    const { isArabic, t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState("");
    const [error, setError] = useState<string | null>(null);
    const historyRef = useRef<ChatMessage[]>([]);
    const abortRef = useRef<AbortController | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingContent, scrollToBottom]);

    useEffect(() => {
        const handleOpen = () => {
            setIsOpen(true);
            if (messages.length === 0) {
                const greeting = isArabic
                    ? "أهلاً بيك! أنا Lumos AI — مساعدك الشخصي. أسألني عن خدماتنا، أسعارنا، أو الباقة الأنسب ليك. 😊"
                    : "Hey! I'm Lumos AI — your personal assistant. Ask me about our services, pricing, or the best package for you. 😊";
                setMessages([{ id: "greeting", role: "assistant", content: greeting }]);
            }
            setTimeout(() => inputRef.current?.focus(), 400);
        };
        window.addEventListener("lumos:open-home-ai-chat", handleOpen);
        return () => window.removeEventListener("lumos:open-home-ai-chat", handleOpen);
    }, [isArabic, messages.length]);

    const handleClose = useCallback(() => {
        setIsOpen(false);
    }, []);

    const handleSend = useCallback(async (text?: string) => {
        const userText = (text || input).trim();
        if (!userText || isStreaming) return;

        setInput("");
        setError(null);

        const userMsg: DisplayMessage = { id: `user-${Date.now()}`, role: "user", content: userText };
        setMessages(prev => [...prev, userMsg]);

        historyRef.current.push({ role: "user", content: userText });

        setIsStreaming(true);
        setStreamingContent("");

        const allMessages = createChatMessages(historyRef.current, userText);
        const controller = new AbortController();
        abortRef.current = controller;

        let accumulated = "";

        await streamChatResponse(
            allMessages,
            {
                onToken: (token) => {
                    accumulated += token;
                    setStreamingContent(accumulated);
                },
                onDone: () => {
                    const finalContent = accumulated;
                    const assistantMsg: DisplayMessage = {
                        id: `assistant-${Date.now()}`,
                        role: "assistant",
                        content: finalContent,
                    };
                    setMessages(prev => [...prev, assistantMsg]);
                    historyRef.current.push({ role: "assistant", content: finalContent });
                    setStreamingContent("");
                    setIsStreaming(false);
                    abortRef.current = null;
                },
onError: (err) => {
                    const errorMsg = t(
                        "حصل خطأ: " + err.message + ". جرّب تاني.",
                        "Error: " + err.message + ". Please try again."
                    );
                    setError(errorMsg);
                    setIsStreaming(false);
                    setStreamingContent("");
                    abortRef.current = null;
                },
            },
            controller.signal,
        ).catch(() => {
            // handled by callbacks
        });
    }, [input, isStreaming, isArabic]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    const quickPrompts = isArabic ? QUICK_PROMPTS_AR : QUICK_PROMPTS_EN;

    const aiConfigured = isAiConfigured();

    const sidebar = (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[99980] bg-black/60 backdrop-blur-sm"
                        onClick={handleClose}
                    />
                    <motion.aside
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed top-0 right-0 z-[99990] h-full w-full sm:w-[420px] flex flex-col border-l border-white/10 bg-[#040812]/95 backdrop-blur-xl shadow-2xl"
                        dir={isArabic ? "rtl" : "ltr"}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-[#00bcd4]/5 to-transparent">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00bcd4] to-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(0,188,212,0.3)]">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-white">
                                        {t("مساعد Lumos", "Lumos AI")}
                                    </h2>
                                    <p className="text-[11px] text-slate-400">
                                        {t("اسألني عن أي حاجة!", "Ask me anything!")}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                            {!aiConfigured && (
                                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>
                                        {t(
                                            "خدمة الذكاء الاصطناعي غير مُعدّة حالياً. يرجى التواصل مع الإدارة.",
                                            "AI service is not configured yet. Please contact admin."
                                        )}
                                    </span>
                                </div>
                            )}

                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                                >
                                    {msg.role === "assistant" ? (
                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00bcd4] to-emerald-400 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_12px_rgba(0,188,212,0.2)]">
                                            <Bot className="w-3.5 h-3.5 text-white" />
                                        </div>
                                    ) : (
                                        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                            <User className="w-3.5 h-3.5 text-slate-300" />
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                                            msg.role === "user"
                                                ? "bg-[#00bcd4]/15 text-white border border-[#00bcd4]/20 rounded-br-md"
                                                : "bg-white/5 text-slate-200 border border-white/10 rounded-bl-md"
                                        }`}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))}

                            {isStreaming && streamingContent && (
                                <div className="flex gap-2.5 flex-row">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00bcd4] to-emerald-400 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_12px_rgba(0,188,212,0.2)]">
                                        <Bot className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-bl-md text-[13px] leading-relaxed bg-white/5 text-slate-200 border border-white/10">
                                        {streamingContent}
                                    </div>
                                </div>
                            )}

                            {isStreaming && !streamingContent && (
                                <div className="flex gap-2.5 flex-row">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00bcd4] to-emerald-400 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_12px_rgba(0,188,212,0.2)]">
                                        <Bot className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white/5 border border-white/10">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#00bcd4] animate-bounce" style={{ animationDelay: "0ms" }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#00bcd4] animate-bounce" style={{ animationDelay: "150ms" }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#00bcd4] animate-bounce" style={{ animationDelay: "300ms" }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Prompts */}
                        {messages.length <= 1 && !isStreaming && aiConfigured && (
                            <div className="px-4 pb-3">
                                <div className="flex flex-wrap gap-1.5">
                                    {quickPrompts.map((prompt) => (
                                        <button
                                            key={prompt}
                                            onClick={() => handleSend(prompt)}
                                            className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-slate-300 hover:bg-[#00bcd4]/10 hover:text-white hover:border-[#00bcd4]/30 transition-all"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="px-4 pb-4 pt-2 border-t border-white/5">
                            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-[#00bcd4]/40 focus-within:bg-white/10 transition-all">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={isArabic ? "اكتب رسالتك..." : "Type your message..."}
                                    disabled={isStreaming || !aiConfigured}
                                    className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-500 disabled:opacity-50"
                                />
                                <button
                                    onClick={() => handleSend()}
                                    disabled={isStreaming || !input.trim() || !aiConfigured}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#00bcd4] to-emerald-400 text-white shadow-[0_0_12px_rgba(0,188,212,0.3)] hover:shadow-[0_0_20px_rgba(0,188,212,0.5)] disabled:opacity-30 disabled:shadow-none transition-all shrink-0"
                                >
                                    {isStreaming ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 text-center">
                                {t(
                                    "Lumos AI — مساعدك الذكي لمعرفة الخدمات والأسعار",
                                    "Lumos AI — your smart assistant for services & pricing"
                                )}
                            </p>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );

    return createPortal(sidebar, document.body);
};

export default AiChatSidebar;