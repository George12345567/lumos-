import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Client, PricingRequest, SavedDesign } from '@/types/dashboard';
import {
    adminMarkClientMessagesRead,
    adminSendMessage,
    adminUpdateClient,
    fetchAdminClientSheetSnapshot,
} from '@/services/adminClientModalService';

export interface Message {
    id: string;
    client_id: string;
    sender: 'client' | 'admin';
    message?: string;
    content?: string;
    is_read: boolean;
    created_at: string;
}

export interface ProfileData {
    display_name?: string;
    tagline?: string;
    bio?: string;
    website?: string;
    avatar_url?: string;
    brand_colors?: string[];
    theme_accent?: string;
    cover_gradient?: string;
}

export interface ClientUpdateRow {
    id: string;
    title: string;
    type?: string;
    update_date: string;
}

export interface ClientAssetRow {
    id: string;
    file_name: string;
    uploaded_at: string;
    file_type?: string;
}

export interface ClientOrderRow {
    id: string;
    total_price: number;
    status: string;
    created_at: string;
}

interface UseClientSheetDataParams {
    client: Client | null;
    designs: SavedDesign[];
    open: boolean;
    tab: string;
    onRefresh: () => void;
}

export function useClientSheetData({ client, designs, open, tab, onRefresh }: UseClientSheetDataParams) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [msgLoading, setMsgLoading] = useState(false);
    const [newMsg, setNewMsg] = useState('');
    const [sending, setSending] = useState(false);
    const msgEndRef = useRef<HTMLDivElement>(null);

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [pricingRequests, setPricingRequests] = useState<PricingRequest[]>([]);
    const [clientUpdates, setClientUpdates] = useState<ClientUpdateRow[]>([]);
    const [clientAssets, setClientAssets] = useState<ClientAssetRow[]>([]);
    const [clientOrders, setClientOrders] = useState<ClientOrderRow[]>([]);
    const [insightsLoading, setInsightsLoading] = useState(false);

    const [progress, setProgress] = useState(0);
    const [nextSteps, setNextSteps] = useState('');
    const [adminNotes, setAdminNotes] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);
    const [packageName, setPackageName] = useState('');
    const [offerLink, setOfferLink] = useState('');
    const [savingPackageControl, setSavingPackageControl] = useState(false);

    const [previewUrl, setPreviewUrl] = useState('');
    const [iframeKey, setIframeKey] = useState(0);

    const fetchMessages = useCallback(async () => {
        if (!client) return;
        setMsgLoading(true);
        const data = await fetchAdminClientSheetSnapshot(client.id);
        setMessages((data.messages as Message[]) || []);
        setMsgLoading(false);
        setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, [client]);

    const fetchProfile = useCallback(async () => {
        if (!client) return;
        const data = await fetchAdminClientSheetSnapshot(client.id);
        const p = (data.profile as ProfileData | null) || null;
        if (p) setProfile(p);
    }, [client]);

    const fetchClientInsights = useCallback(async () => {
        if (!client) return;
        setInsightsLoading(true);
        try {
            const data = await fetchAdminClientSheetSnapshot(client.id);
            setPricingRequests((data.pricingRequests as PricingRequest[]) || []);
            setClientUpdates((data.updates as ClientUpdateRow[]) || []);
            setClientAssets((data.assets as ClientAssetRow[]) || []);
            setClientOrders((data.orders as ClientOrderRow[]) || []);
        } catch (error) {
            console.error('Failed to load client insights:', error);
        } finally {
            setInsightsLoading(false);
        }
    }, [client]);

    useEffect(() => {
        if (!open || !client) return;
        setProgress(client.progress ?? 0);
        setNextSteps(client.next_steps || '');
        setAdminNotes(client.admin_notes || '');
        setPackageName(client.package_name || '');
        setOfferLink(client.active_offer_link || '');

        const latest = designs.filter((design) => design.client_id === client.id)[0];
        if (latest) {
            setPreviewUrl(`${window.location.origin}/demo?id=${latest.id}`);
        } else {
            setPreviewUrl(`${window.location.origin}/demo`);
        }

        void fetchClientInsights();
    }, [open, client, designs, fetchClientInsights]);

    useEffect(() => {
        if (!open || !client) return;
        if (tab === 'messages') {
            void fetchMessages();
            void adminMarkClientMessagesRead(client.id);
        }
        if (tab === 'brand') {
            void fetchProfile();
        }
    }, [tab, open, client, fetchMessages, fetchProfile]);

    const sendMessage = async () => {
        if (!newMsg.trim() || !client) return;
        setSending(true);
        try {
            await adminSendMessage({
                client_id: client.id,
                sender: 'admin',
                message: newMsg.trim(),
                is_read: false,
            });
            setNewMsg('');
            void fetchMessages();
        } catch {
            toast.error('Send failed');
        }
        setSending(false);
    };

    const saveNotes = async () => {
        if (!client) return;
        setSavingNotes(true);
        let hasError = false;
        try {
            await adminUpdateClient(client.id, { progress, next_steps: nextSteps, admin_notes: adminNotes });
        } catch {
            hasError = true;
        }
        setSavingNotes(false);
        if (hasError) {
            toast.error('Save failed');
        } else {
            toast.success('Saved!');
        }
        onRefresh();
    };

    const savePackageControl = async () => {
        if (!client) return;
        setSavingPackageControl(true);
        const detailsPayload = {
            ...(typeof client.package_details === 'object' && client.package_details ? client.package_details : {}),
            package_name: packageName || null,
            active_offer: client.active_offer || null,
            active_offer_link: offerLink || null,
            last_admin_update: new Date().toISOString(),
            pricing_requests_count: pricingRequests.length,
            latest_pricing_status: pricingRequests[0]?.status || null,
            latest_pricing_total: pricingRequests[0]?.estimated_total || null,
        };

        let hasError = false;
        try {
            await adminUpdateClient(client.id, {
                package_name: packageName || null,
                active_offer_link: offerLink || null,
                package_details: detailsPayload,
            });
        } catch {
            hasError = true;
        }

        setSavingPackageControl(false);
        if (hasError) {
            toast.error('Package control save failed');
            return;
        }

        toast.success('Package control updated');
        onRefresh();
    };

    const copyPreviewLink = () => {
        navigator.clipboard.writeText(previewUrl);
        toast.success('Preview link copied!');
    };

    const reloadIframe = () => setIframeKey((key) => key + 1);

    return {
        messages,
        msgLoading,
        newMsg,
        setNewMsg,
        sending,
        msgEndRef,
        profile,
        pricingRequests,
        clientUpdates,
        clientAssets,
        clientOrders,
        insightsLoading,
        progress,
        setProgress,
        nextSteps,
        setNextSteps,
        adminNotes,
        setAdminNotes,
        savingNotes,
        packageName,
        setPackageName,
        offerLink,
        setOfferLink,
        savingPackageControl,
        previewUrl,
        iframeKey,
        sendMessage,
        saveNotes,
        savePackageControl,
        copyPreviewLink,
        reloadIframe,
        fetchMessages,
    };
}
