import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { hashPassword } from '@/lib/secretHash';
import { Order, Contact, Client, ClientUpdate, DashboardStats, SavedDesign, PricingRequest } from '@/types/dashboard';
import type { Project } from '@/services/projectService';
import { toast } from 'sonner';
import { adminUpdateClient as adminUpdateClientRecord } from '@/services/adminClientModalService';
import {
    adminCancelPricingRequest,
    adminConvertPricingRequest,
    adminDeleteContact,
    adminDeleteDesign,
    adminDeleteOrder,
    adminDeletePricingRequest,
    adminUpdateContactStatus,
    adminUpdateDesignStatus,
    adminUpdateOrderStatus,
    adminUpdatePricingRequestStatus,
    fetchAdminDashboardSnapshot,
} from '@/services/adminDashboardService';

const ADMIN_EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-client-update`;

async function getSessionToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? '';
}

export const useAdminDashboard = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [pricingRequests, setPricingRequests] = useState<PricingRequest[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [clientUpdates, setClientUpdates] = useState<ClientUpdate[]>([]);
    const [designs, setDesigns] = useState<SavedDesign[]>([]);
    const [loading, setLoading] = useState(true);
    const refreshTimerRef = useRef<number | null>(null);
    const refreshInFlightRef = useRef(false);
    const lastRefreshAtRef = useRef(0);
    const [stats, setStats] = useState<DashboardStats>({
        totalOrders: 0,
        totalRevenue: 0,
        totalContacts: 0,
        pendingOrders: 0,
        completedOrders: 0,
        newContacts: 0,
        newPricingRequests: 0,
        totalPricingRequests: 0,
        avgOrderValue: 0,
        unreadMessages: 0,
        totalDesigns: 0
    });

    const fetchData = useCallback(async () => {
        if (refreshInFlightRef.current) return;
        refreshInFlightRef.current = true;
        setLoading(true);
        try {
            const snapshot = await fetchAdminDashboardSnapshot();
            const ordersData = (snapshot.orders || []) as Order[];
            const contactsData = (snapshot.contacts || []) as Contact[];
            const pricingRequestsData = (snapshot.pricingRequests || []) as PricingRequest[];
            const projectsData = (snapshot.projects || []) as Project[];
            const clientsData = (snapshot.clients || []) as Client[];
            const designsData = (snapshot.designs || []) as SavedDesign[];
            const updatesData = (snapshot.clientUpdates || []) as ClientUpdate[];
            const unreadMessages = Number(snapshot.unreadMessages || 0);

            setOrders(ordersData);
            setContacts(contactsData);
            setPricingRequests(pricingRequestsData);
            setProjects(projectsData);
            setClients(clientsData);
            setClientUpdates(updatesData);
            setDesigns(designsData);

            // Calculate Stats
            const totalRevenue = ordersData.reduce((sum, order) => sum + (order.total_price || 0), 0);
            const pendingOrders = ordersData.filter(o => o.status === 'pending').length;
            const completedOrders = ordersData.filter(o => o.status === 'completed').length;
            const newContacts = contactsData.filter(c => c.status === 'new').length;
            const newPricingRequests = pricingRequestsData.filter(request => request.status === 'new').length;
            const avgOrderValue = ordersData.length ? totalRevenue / ordersData.length : 0;

            setStats({
                totalOrders: ordersData.length,
                totalRevenue,
                totalContacts: contactsData.length,
                totalPricingRequests: pricingRequestsData.length,
                pendingOrders,
                completedOrders,
                newContacts,
                newPricingRequests,
                avgOrderValue,
                unreadMessages,
                totalDesigns: designsData.length
            });

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            lastRefreshAtRef.current = Date.now();
            refreshInFlightRef.current = false;
            setLoading(false);
        }
    }, []);

    const scheduleRefresh = useCallback((delay = 250) => {
        const elapsed = Date.now() - lastRefreshAtRef.current;
        const minGap = 1000;
        const effectiveDelay = elapsed < minGap ? Math.max(delay, minGap - elapsed) : delay;
        if (refreshTimerRef.current) {
            window.clearTimeout(refreshTimerRef.current);
        }
        refreshTimerRef.current = window.setTimeout(() => {
            void fetchData();
        }, effectiveDelay);
    }, [fetchData]);

    const setupRealtimeSubscription = useCallback(() => {
        const channel = supabase
            .channel('admin-dashboard-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                scheduleRefresh();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, () => {
                scheduleRefresh();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pricing_requests' }, () => {
                scheduleRefresh();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
                scheduleRefresh();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'project_services' }, () => {
                scheduleRefresh();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
                // Client profile fields are persisted in clients table.
                scheduleRefresh();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'client_updates' }, () => {
                scheduleRefresh();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'client_assets' }, () => {
                scheduleRefresh();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'client_identity' }, () => {
                scheduleRefresh();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'client_messages' }, () => {
                scheduleRefresh();
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'client_messages' }, (payload) => {
                if (payload.new.sender === 'client') {
                    toast.info('New client message received');
                    scheduleRefresh(120);
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_designs' }, () => {
                scheduleRefresh();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [scheduleRefresh]);

    useEffect(() => {
        void fetchData();
        const cleanup = setupRealtimeSubscription();
        return () => {
            cleanup();
            if (refreshTimerRef.current) {
                window.clearTimeout(refreshTimerRef.current);
            }
        };
    }, [fetchData, setupRealtimeSubscription]);

    // --- Actions ---

    const updateOrderStatus = useCallback(async (id: string, newStatus: Order['status']) => {
        try {
            await adminUpdateOrderStatus(id, newStatus);
            toast.success(`Order status updated to ${newStatus}`);
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
        } catch {
            toast.error('Failed to update order');
        }
    }, []);

    const deleteOrder = useCallback(async (id: string) => {
        try {
            await adminDeleteOrder(id);
            toast.success('Order deleted');
            setOrders(prev => prev.filter(o => o.id !== id));
        } catch {
            toast.error('Failed to delete order');
        }
    }, []);

    const updateContactStatus = useCallback(async (id: string, newStatus: Contact['status']) => {
        try {
            await adminUpdateContactStatus(id, newStatus);
            toast.success(`Contact marked as ${newStatus}`);
            setContacts(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
        } catch {
            toast.error('Failed to update contact');
        }
    }, []);

    const deleteContact = useCallback(async (id: string) => {
        try {
            await adminDeleteContact(id);
            toast.success('Contact deleted');
            setContacts(prev => prev.filter(c => c.id !== id));
        } catch {
            toast.error('Failed to delete contact');
        }
    }, []);

    const updatePricingRequestStatus = useCallback(async (id: string, newStatus: PricingRequest['status']) => {
        try {
            await adminUpdatePricingRequestStatus(id, newStatus);
            toast.success(`Pricing request updated to ${newStatus}`);
            setPricingRequests(prev => prev.map(request => request.id === id ? { ...request, status: newStatus } : request));
            void fetchData();
        } catch {
            toast.error('Failed to update pricing request');
        }
    }, []);

    const cancelPricingRequest = useCallback(async (id: string): Promise<boolean> => {
        try {
            const result = await adminCancelPricingRequest(id);
            if (!result.success) throw new Error(result.error || 'Cancel failed');
            toast.success('Pricing request cancelled');
            await fetchData();
            return true;
        } catch (error) {
            console.error('Failed to cancel pricing request:', error);
            toast.error('Failed to cancel pricing request');
            return false;
        }
    }, [fetchData]);

    const deletePricingRequest = useCallback(async (id: string): Promise<boolean> => {
        try {
            const result = await adminDeletePricingRequest(id);
            if (!result.success) throw new Error(result.error || 'Delete failed');
            toast.success('Pricing request permanently deleted');
            setPricingRequests(prev => prev.filter(request => request.id !== id));
            await fetchData();
            return true;
        } catch (error) {
            console.error('Failed to permanently delete pricing request:', error);
            toast.error('Failed to permanently delete pricing request');
            return false;
        }
    }, [fetchData]);

    const convertPricingRequest = useCallback(async (request: PricingRequest) => {
        try {
            const conversion = await adminConvertPricingRequest(request);
            if (!conversion.success) throw new Error(conversion.error || 'Project creation failed');
            toast.success('Project created from pricing request');
            setPricingRequests(prev => prev.map(item => item.id === request.id ? {
                ...item,
                status: 'converted',
                converted_project_id: conversion.projectId,
            } : item));
            await fetchData();
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err ?? 'Unknown conversion error');
            console.error('[useAdminDashboard.convertPricingRequest] Failed to convert pricing request', {
                error: err,
                message,
                requestId: request.id,
                pricingRequestId: request.id,
                invoiceNumber: request.invoice_number,
                convertedProjectId: request.converted_project_id,
                status: request.status,
            });
            toast.error(`Failed to convert pricing request: ${message}`);
        }
    }, [fetchData]);

    const updateDesignStatus = useCallback(async (id: string, newStatus: SavedDesign['status']) => {
        try {
            await adminUpdateDesignStatus(id, newStatus);
            toast.success(`Design marked as ${newStatus}`);
            setDesigns(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
        } catch {
            toast.error('Failed to update design');
        }
    }, []);

    const deleteDesign = useCallback(async (id: string) => {
        try {
            await adminDeleteDesign(id);
            toast.success('Design deleted');
            setDesigns(prev => prev.filter(d => d.id !== id));
        } catch {
            toast.error('Failed to delete design');
        }
    }, []);

    // --- Client CRUD ---

    const addClient = useCallback(async (data: {
        username: string;
        email: string;
        company_name?: string;
        status?: string;
        package_name?: string;
        password?: string;
    }) => {
        const sessionToken = await getSessionToken();
        if (!sessionToken) throw new Error('Missing admin session token');
        const response = await fetch(ADMIN_EDGE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                Authorization: `Bearer ${sessionToken}`,
            },
            body: JSON.stringify({
                action: 'create',
                payload: { ...data, password: data.password || 'TempPass123!' },
            }),
        });
        const payload = await response.json().catch(() => ({ success: false, error: 'Failed to add client' }));
        if (!response.ok || !payload.success) throw new Error(payload.error || 'Failed to add client');
        toast.success('Client added successfully!');
        await fetchData();
    }, [fetchData]);

    const deleteClient = useCallback(async (id: string) => {
        try {
            const sessionToken = await getSessionToken();
            if (!sessionToken) throw new Error('Missing admin session token');
            const response = await fetch(ADMIN_EDGE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${sessionToken}`,
                },
                body: JSON.stringify({ action: 'delete', clientId: id }),
            });
            const payload = await response.json().catch(() => ({ success: false, error: 'Failed to delete client' }));
            if (!response.ok || !payload.success) throw new Error(payload.error || 'Failed to delete client');
            toast.success('Client deleted');
            setClients(prev => prev.filter(c => c.id !== id));
        } catch {
            toast.error('Failed to delete client');
        }
    }, []);

    const updateClient = useCallback(async (id: string, data: Partial<Client>) => {
        try {
            const updatedClient = await adminUpdateClientRecord(id, data);
            toast.success('Client updated!');
            if (updatedClient) {
                setClients(prev => prev.map(c => c.id === id ? updatedClient : c));
            }
            await fetchData();
        } catch (error) {
            console.error('[useAdminDashboard.updateClient]', {
                error,
                payload: {
                    clientId: id,
                    fields: Object.keys(data),
                },
            });
            toast.error('Failed to update client');
        }
    }, [fetchData]);

    return {
        orders,
        projects,
        contacts,
        pricingRequests,
        clients,
        clientUpdates,
        designs,
        stats,
        loading,
        refresh: fetchData,
        updateOrderStatus,
        deleteOrder,
        updateContactStatus,
        deleteContact,
        updatePricingRequestStatus,
        cancelPricingRequest,
        deletePricingRequest,
        convertPricingRequest,
        updateDesignStatus,
        deleteDesign,
        addClient,
        deleteClient,
        updateClient,
    };
};
