import { buildSystemPrompt } from "@/features/ai-chat/aiChatSystemPrompt";

const PRIMARY_KEY = import.meta.env.VITE_AI_API_KEY || "";
const PRIMARY_ENDPOINT = import.meta.env.VITE_AI_API_ENDPOINT || "https://openrouter.ai/api/v1";
const PRIMARY_MODEL = import.meta.env.VITE_AI_MODEL || "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";

const FALLBACK_KEY = import.meta.env.VITE_AI_FALLBACK_KEY || "";
const FALLBACK_ENDPOINT = import.meta.env.VITE_AI_FALLBACK_ENDPOINT || "https://agentrouter.org/v1";
const FALLBACK_MODEL = import.meta.env.VITE_AI_FALLBACK_MODEL || "glm-5-1";

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface StreamCallbacks {
    onToken: (token: string) => void;
    onDone: () => void;
    onError: (error: Error) => void;
}

const systemPrompt = buildSystemPrompt();

export function createChatMessages(history: ChatMessage[], userMessage: string): ChatMessage[] {
    return [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userMessage },
    ];
}

type ProviderConfig = {
    key: string;
    endpoint: string;
    model: string;
};

function getProviders(): ProviderConfig[] {
    const providers: ProviderConfig[] = [];
    if (PRIMARY_KEY) {
        providers.push({ key: PRIMARY_KEY, endpoint: PRIMARY_ENDPOINT, model: PRIMARY_MODEL });
    }
    if (FALLBACK_KEY) {
        providers.push({ key: FALLBACK_KEY, endpoint: FALLBACK_ENDPOINT, model: FALLBACK_MODEL });
    }
    return providers;
}

function buildHeaders(apiKey: string, endpoint: string): Record<string, string> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
    };

    if (endpoint.includes("openrouter.ai")) {
        headers["HTTP-Referer"] = typeof window !== "undefined" ? window.location.origin : "https://getlumos.studio";
        headers["X-Title"] = "Lumos AI Assistant";
    }

    return headers;
}

async function attemptStream(
    provider: ProviderConfig,
    messages: ChatMessage[],
    callbacks: StreamCallbacks,
    signal?: AbortSignal,
): Promise<void> {
    const response = await fetch(`${provider.endpoint}/chat/completions`, {
        method: "POST",
        headers: buildHeaders(provider.key, provider.endpoint),
        body: JSON.stringify({
            model: provider.model,
            messages,
            stream: true,
            temperature: 0.7,
            max_tokens: 1024,
        }),
        signal,
    });

    if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(`API error ${response.status}: ${errorBody || response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") {
                callbacks.onDone();
                return;
            }
            try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                    callbacks.onToken(content);
                }
            } catch {
                // skip malformed JSON lines
            }
        }
    }

    callbacks.onDone();
}

export async function streamChatResponse(
    messages: ChatMessage[],
    callbacks: StreamCallbacks,
    signal?: AbortSignal,
): Promise<void> {
    const providers = getProviders();

    if (providers.length === 0) {
        callbacks.onError(new Error("AI service is not configured. Please set VITE_AI_API_KEY."));
        return;
    }

    for (let i = 0; i < providers.length; i++) {
        const provider = providers[i];
        try {
            await attemptStream(provider, messages, callbacks, signal);
            return;
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === "AbortError") {
                callbacks.onDone();
                return;
            }
            const isLast = i === providers.length - 1;
            if (isLast) {
                callbacks.onError(err instanceof Error ? err : new Error(String(err)));
                return;
            }
            // Continue to fallback provider
        }
    }
}

export function isAiConfigured(): boolean {
    return Boolean(PRIMARY_KEY) || Boolean(FALLBACK_KEY);
}