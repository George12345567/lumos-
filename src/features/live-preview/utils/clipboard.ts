import { toast } from "sonner";

/**
 * Copy text to clipboard with toast notifications
 * @param text - The text to copy
 * @param successMessage - Toast message on success
 * @param errorMessage - Toast message on error
 * @returns Promise<boolean> - Whether the copy was successful
 */
export const copyToClipboard = async (
    text: string,
    successMessage: string = "Copied!",
    errorMessage: string = "Failed to copy"
): Promise<boolean> => {
    try {
        if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            toast.success(successMessage);
            return true;
        }
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand("copy");
            toast.success(successMessage);
            return true;
        } catch (err) {
            console.error("Failed to copy:", err);
            toast.error(`${errorMessage}: ${text}`);
            return false;
        } finally {
            document.body.removeChild(textArea);
        }
    } catch (error) {
        console.error("Failed to copy:", error);
        toast.error(`${errorMessage}: ${text}`);
        return false;
    }
};
