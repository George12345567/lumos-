/**
 * AddItemModal — Magic Add/Edit Item Modal
 * ──────────────────────────────────────────
 * A full glassmorphism modal for adding or editing menu items.
 * Supports: image upload (Base64), name, description, price, category,
 * featured toggle, and a drag-drop zone for the image.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Upload, Image as ImageIcon, Check, Sparkles,
    Plus, Star,
} from "lucide-react";
import type { MenuItem } from "@/types";

interface AddItemModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (item: MenuItem) => void;
    categories: { id: string; name: string; icon: string }[];
    editingItem?: MenuItem | null;
    effectiveAccent: string;
}

const defaultForm = {
    name: "",
    description: "",
    price: "",
    image: "",
    category: "",
    featured: false,
};

const AddItemModal = ({
    open,
    onClose,
    onSave,
    categories,
    editingItem,
    effectiveAccent,
}: AddItemModalProps) => {
    const [form, setForm] = useState({ ...defaultForm });
    const [isDragging, setIsDragging] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const firstInputRef = useRef<HTMLInputElement>(null);

    // Populate form when editing
    useEffect(() => {
        if (editingItem) {
            setForm({
                name: editingItem.name,
                description: editingItem.description || "",
                price: editingItem.price,
                image: editingItem.image || "",
                category: editingItem.category,
                featured: editingItem.featured ?? false,
            });
            setImagePreview(editingItem.image || null);
        } else {
            setForm({ ...defaultForm, category: categories.find(c => c.id !== "all")?.id || "" });
            setImagePreview(null);
        }
        setErrors({});
    }, [editingItem, categories, open]);

    // Auto-focus first input
    useEffect(() => {
        if (open) {
            setTimeout(() => firstInputRef.current?.focus(), 150);
        }
    }, [open]);

    // Close on Escape key
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

    const processImageFile = useCallback((file: File) => {
        if (!file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            setImagePreview(result);
            setForm(p => ({ ...p, image: result }));
        };
        reader.readAsDataURL(file);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processImageFile(file);
    }, [processImageFile]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!form.name.trim()) newErrors.name = "Item name is required";
        if (!form.price || isNaN(Number(form.price))) newErrors.price = "Valid price is required";
        if (!form.category) newErrors.category = "Please select a category";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        const item: MenuItem = {
            id: editingItem?.id ?? Date.now(),
            name: form.name.trim(),
            description: form.description.trim(),
            price: form.price,
            image: form.image || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400",
            category: form.category,
            featured: form.featured,
            rating: editingItem?.rating ?? 4.5,
        };
        onSave(item);
        onClose();
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        key="modal"
                        initial={{ opacity: 0, scale: 0.92, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 40 }}
                        transition={{ type: "spring", stiffness: 320, damping: 28 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div
                            className="w-full max-w-md pointer-events-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Card */}
                            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.6)]"
                                style={{ background: "hsla(220,10%,10%,0.92)", backdropFilter: "blur(24px)" }}
                            >
                                {/* Ambient top glow */}
                                <div
                                    className="absolute top-0 left-0 right-0 h-[1px] opacity-60"
                                    style={{ background: `linear-gradient(90deg, transparent, ${effectiveAccent}, transparent)` }}
                                />
                                <div
                                    className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-48 rounded-full blur-[80px] opacity-20 pointer-events-none"
                                    style={{ background: effectiveAccent }}
                                />

                                {/* Header */}
                                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                            style={{ background: `${effectiveAccent}20`, border: `1px solid ${effectiveAccent}30` }}
                                        >
                                            {editingItem
                                                ? <Star className="w-4 h-4" style={{ color: effectiveAccent }} />
                                                : <Plus className="w-4 h-4" style={{ color: effectiveAccent }} />
                                            }
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white">
                                                {editingItem ? "Edit Item" : "Add New Item"}
                                            </h3>
                                            <p className="text-[10px] text-white/40">
                                                {editingItem ? "Update item details" : "Add a new item to your menu"}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Form Body */}
                                <div className="px-5 pb-5 space-y-3 max-h-[70vh] overflow-y-auto"
                                    style={{ scrollbarWidth: "thin", scrollbarColor: `${effectiveAccent}20 transparent` }}
                                >
                                    {/* Image Upload Zone */}
                                    <div
                                        className={`relative rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden cursor-pointer ${isDragging ? "border-opacity-100 scale-[1.02]" : "border-opacity-30"}`}
                                        style={{ borderColor: isDragging ? effectiveAccent : `${effectiveAccent}40` }}
                                        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {imagePreview
                                            ? (
                                                <div className="relative h-36">
                                                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                                                        <span className="text-[10px] text-white/70 flex items-center gap-1">
                                                            <Upload className="w-3 h-3" /> Click or drop to replace
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-28 flex flex-col items-center justify-center gap-2">
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                                        style={{ background: `${effectiveAccent}15` }}>
                                                        <ImageIcon className="w-5 h-5" style={{ color: effectiveAccent }} />
                                                    </div>
                                                    <p className="text-xs text-white/40">
                                                        {isDragging ? "Drop image here" : "Drag & drop or click to upload"}
                                                    </p>
                                                </div>
                                            )
                                        }
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={e => { const f = e.target.files?.[0]; if (f) processImageFile(f); }}
                                        />
                                    </div>

                                    {/* Name */}
                                    <div>
                                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
                                            Item Name <span style={{ color: effectiveAccent }}>*</span>
                                        </label>
                                        <input
                                            ref={firstInputRef}
                                            value={form.name}
                                            onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: "" })); }}
                                            placeholder="e.g. Signature Burger"
                                            className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none transition-all"
                                            style={{
                                                background: "rgba(255,255,255,0.05)",
                                                border: errors.name ? "1px solid #f87171" : `1px solid ${errors.name ? "#f87171" : "rgba(255,255,255,0.1)"}`,
                                            }}
                                            onFocus={e => e.currentTarget.style.borderColor = effectiveAccent}
                                            onBlur={e => e.currentTarget.style.borderColor = errors.name ? "#f87171" : "rgba(255,255,255,0.1)"}
                                        />
                                        {errors.name && <p className="text-red-400 text-[10px] mt-1">{errors.name}</p>}
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
                                            Description
                                        </label>
                                        <textarea
                                            value={form.description}
                                            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                            placeholder="Brief description of the item..."
                                            rows={2}
                                            className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none transition-all resize-none"
                                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                                            onFocus={e => e.currentTarget.style.borderColor = effectiveAccent}
                                            onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
                                        />
                                    </div>

                                    {/* Price & Category row */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
                                                Price (EGP) <span style={{ color: effectiveAccent }}>*</span>
                                            </label>
                                            <input
                                                value={form.price}
                                                onChange={e => { setForm(p => ({ ...p, price: e.target.value })); setErrors(p => ({ ...p, price: "" })); }}
                                                placeholder="0.00"
                                                type="number"
                                                className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none transition-all"
                                                style={{
                                                    background: "rgba(255,255,255,0.05)",
                                                    border: errors.price ? "1px solid #f87171" : "1px solid rgba(255,255,255,0.1)",
                                                }}
                                                onFocus={e => e.currentTarget.style.borderColor = effectiveAccent}
                                                onBlur={e => e.currentTarget.style.borderColor = errors.price ? "#f87171" : "rgba(255,255,255,0.1)"}
                                            />
                                            {errors.price && <p className="text-red-400 text-[10px] mt-1">{errors.price}</p>}
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
                                                Category <span style={{ color: effectiveAccent }}>*</span>
                                            </label>
                                            <select
                                                value={form.category}
                                                onChange={e => { setForm(p => ({ ...p, category: e.target.value })); setErrors(p => ({ ...p, category: "" })); }}
                                                className="w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition-all appearance-none"
                                                style={{
                                                    background: "rgba(30,40,30,0.95)",
                                                    border: errors.category ? "1px solid #f87171" : "1px solid rgba(255,255,255,0.1)",
                                                }}
                                            >
                                                <option value="">Select...</option>
                                                {categories.filter(c => c.id !== "all").map(c => (
                                                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                                ))}
                                            </select>
                                            {errors.category && <p className="text-red-400 text-[10px] mt-1">{errors.category}</p>}
                                        </div>
                                    </div>

                                    {/* Featured Toggle */}
                                    <div
                                        className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all"
                                        style={{
                                            background: form.featured ? `${effectiveAccent}12` : "rgba(255,255,255,0.03)",
                                            border: form.featured ? `1px solid ${effectiveAccent}30` : "1px solid rgba(255,255,255,0.07)",
                                        }}
                                        onClick={() => setForm(p => ({ ...p, featured: !p.featured }))}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4" style={{ color: form.featured ? effectiveAccent : "rgba(255,255,255,0.3)" }} />
                                            <div>
                                                <span className="text-xs font-bold text-white/80">Featured Item</span>
                                                <p className="text-[10px] text-white/30">Shown in highlights section</p>
                                            </div>
                                        </div>
                                        {/* Toggle circle */}
                                        <div
                                            className="w-10 h-5 rounded-full relative transition-all duration-300"
                                            style={{ background: form.featured ? effectiveAccent : "rgba(255,255,255,0.1)" }}
                                        >
                                            <div
                                                className="w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-300 shadow-md"
                                                style={{ transform: form.featured ? "translateX(21px)" : "translateX(2px)" }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="px-5 pb-5 pt-1 flex gap-3 border-t border-white/5">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:text-white/80 transition-all"
                                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
                                        style={{
                                            background: `linear-gradient(135deg, ${effectiveAccent}, ${effectiveAccent}cc)`,
                                            boxShadow: `0 4px 20px ${effectiveAccent}40`,
                                        }}
                                    >
                                        <Check className="w-4 h-4" />
                                        {editingItem ? "Save Changes" : "Add Item"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AddItemModal;
