/**
 * useStudioState — Centralised studio state management (P0 architecture).
 *
 * Implements the full StudioState as a useReducer so all state transitions
 * are typed, testable, and auditable. Ready to be wired into LivePreviewTool
 * as a drop-in replacement for the scattered useState calls.
 *
 * Usage (when migration is ready):
 *   const { state, dispatch, actions } = useStudioState();
 */
import { useReducer, useCallback } from "react";
import type { MenuItem } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────

type PageType = "home" | "menu" | "cart" | "profile";
type DeviceType = "mobile" | "tablet" | "desktop";
type ViewMode = "grid" | "list";
type TextureType = "none" | "noise" | "grid" | "dots";
type TemplateType =
  | "aether"
  | "brutal";
type StudioTab = "brand" | "style" | "layout" | "content" | "export";
type SortBy = "name" | "price" | "rating";
type ImageQuality = "standard" | "hd";

export interface StudioState {
  // ── Brand ──
  businessName: string;
  serviceType: string;

  // ── Style ──
  selectedTheme: string;
  customTheme: { primary: string; accent: string; gradient: string };
  glassEffect: boolean;
  fontSize: number;
  activeTexture: TextureType;
  isDarkMode: boolean;

  // ── Layout ──
  deviceView: DeviceType;
  viewMode: ViewMode;
  selectedTemplate: TemplateType;
  enable3D: boolean;
  rotationX: number;
  rotationY: number;
  activeStudioTab: StudioTab;

  // ── Content ──
  showRatings: boolean;
  showTime: boolean;
  showFeatured: boolean;
  imageQuality: ImageQuality;
  sortBy: SortBy;
  customItems: MenuItem[];
  itemHistory: MenuItem[][];
  historyIndex: number;

  // ── Preview interactions ──
  currentPage: PageType;
  selectedCategory: string;
  searchQuery: string;
  cartItems: Record<number, number>;
  favorites: number[];
}

// ── Actions ───────────────────────────────────────────────────────────────

export type StudioAction =
  // Brand
  | { type: "SET_BUSINESS_NAME"; payload: string }
  | { type: "SET_SERVICE_TYPE"; payload: string }
  // Style
  | { type: "SET_SELECTED_THEME"; payload: string }
  | {
    type: "UPDATE_CUSTOM_THEME";
    payload: { key: "primary" | "accent"; value: string };
  }
  | { type: "SET_GLASS_EFFECT"; payload: boolean }
  | { type: "SET_FONT_SIZE"; payload: number }
  | { type: "SET_ACTIVE_TEXTURE"; payload: TextureType }
  | { type: "SET_DARK_MODE"; payload: boolean }
  | { type: "APPLY_PERFORMANCE_MODE" }
  // Layout
  | { type: "SET_DEVICE_VIEW"; payload: DeviceType }
  | { type: "SET_VIEW_MODE"; payload: ViewMode }
  | { type: "SET_SELECTED_TEMPLATE"; payload: TemplateType }
  | { type: "SET_ENABLE_3D"; payload: boolean }
  | { type: "SET_ROTATION_X"; payload: number }
  | { type: "SET_ROTATION_Y"; payload: number }
  | { type: "SET_ACTIVE_STUDIO_TAB"; payload: StudioTab }
  // Content
  | { type: "SET_SHOW_RATINGS"; payload: boolean }
  | { type: "SET_SHOW_TIME"; payload: boolean }
  | { type: "SET_SHOW_FEATURED"; payload: boolean }
  | { type: "SET_IMAGE_QUALITY"; payload: ImageQuality }
  | { type: "SET_SORT_BY"; payload: SortBy }
  | { type: "ADD_CUSTOM_ITEM"; payload: MenuItem }
  | { type: "UPDATE_CUSTOM_ITEM"; payload: MenuItem }
  | { type: "DELETE_CUSTOM_ITEM"; payload: number }
  | { type: "UNDO_ITEMS" }
  | { type: "REDO_ITEMS" }
  // Preview interactions
  | { type: "SET_CURRENT_PAGE"; payload: PageType }
  | { type: "SET_SELECTED_CATEGORY"; payload: string }
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | { type: "ADD_TO_CART"; payload: number }
  | { type: "REMOVE_FROM_CART"; payload: number }
  | { type: "CLEAR_CART" }
  | { type: "TOGGLE_FAVORITE"; payload: number }
  // System
  | { type: "RESET_ALL" }
  | { type: "APPLY_AI_PRESET" };

// ── Initial state ─────────────────────────────────────────────────────────

export const initialStudioState: StudioState = {
  businessName: "",
  serviceType: "restaurant",
  selectedTheme: "default",
  customTheme: {
    primary: "#00bcd4",
    accent: "#00bcd4",
    gradient: "linear-gradient(135deg, #00bcd4, #00acc1)",
  },
  glassEffect: false,
  fontSize: 1,
  activeTexture: "none",
  isDarkMode: false,
  deviceView: "mobile",
  viewMode: "list",
  selectedTemplate: "aether",
  enable3D: true,
  rotationX: 0,
  rotationY: 0,
  activeStudioTab: "brand",
  showRatings: true,
  showTime: true,
  showFeatured: true,
  imageQuality: "standard",
  sortBy: "name",
  customItems: [],
  itemHistory: [[]],
  historyIndex: 0,
  currentPage: "menu",
  selectedCategory: "all",
  searchQuery: "",
  cartItems: {},
  favorites: [],
};

// ── Reducer ───────────────────────────────────────────────────────────────

function pushHistory(state: StudioState, nextItems: MenuItem[]): StudioState {
  const trimmed = state.itemHistory.slice(0, state.historyIndex + 1);
  return {
    ...state,
    customItems: nextItems,
    itemHistory: [...trimmed, nextItems],
    historyIndex: state.historyIndex + 1,
  };
}

export function studioReducer(
  state: StudioState,
  action: StudioAction
): StudioState {
  switch (action.type) {
    // ── Brand ──
    case "SET_BUSINESS_NAME":
      return { ...state, businessName: action.payload };
    case "SET_SERVICE_TYPE":
      return {
        ...state,
        serviceType: action.payload,
        selectedCategory: "all",
      };

    // ── Style ──
    case "SET_SELECTED_THEME":
      return { ...state, selectedTheme: action.payload };
    case "UPDATE_CUSTOM_THEME": {
      const next = { ...state.customTheme, [action.payload.key]: action.payload.value };
      return {
        ...state,
        customTheme: {
          ...next,
          gradient: `linear-gradient(135deg, ${next.primary}, ${next.accent})`,
        },
      };
    }
    case "SET_GLASS_EFFECT":
      return { ...state, glassEffect: action.payload };
    case "SET_FONT_SIZE":
      return { ...state, fontSize: action.payload };
    case "SET_ACTIVE_TEXTURE":
      return { ...state, activeTexture: action.payload };
    case "SET_DARK_MODE":
      return { ...state, isDarkMode: action.payload };
    case "APPLY_PERFORMANCE_MODE":
      return { ...state, glassEffect: false, activeTexture: "none" };

    // ── Layout ──
    case "SET_DEVICE_VIEW":
      return { ...state, deviceView: action.payload };
    case "SET_VIEW_MODE":
      return { ...state, viewMode: action.payload };
    case "SET_SELECTED_TEMPLATE":
      return { ...state, selectedTemplate: action.payload };
    case "SET_ENABLE_3D":
      return { ...state, enable3D: action.payload };
    case "SET_ROTATION_X":
      return { ...state, rotationX: action.payload };
    case "SET_ROTATION_Y":
      return { ...state, rotationY: action.payload };
    case "SET_ACTIVE_STUDIO_TAB":
      return { ...state, activeStudioTab: action.payload };

    // ── Content ──
    case "SET_SHOW_RATINGS":
      return { ...state, showRatings: action.payload };
    case "SET_SHOW_TIME":
      return { ...state, showTime: action.payload };
    case "SET_SHOW_FEATURED":
      return { ...state, showFeatured: action.payload };
    case "SET_IMAGE_QUALITY":
      return { ...state, imageQuality: action.payload };
    case "SET_SORT_BY":
      return { ...state, sortBy: action.payload };
    case "ADD_CUSTOM_ITEM":
      return pushHistory(state, [...state.customItems, action.payload]);
    case "UPDATE_CUSTOM_ITEM":
      return pushHistory(
        state,
        state.customItems.map((i) => (i.id === action.payload.id ? action.payload : i))
      );
    case "DELETE_CUSTOM_ITEM":
      return pushHistory(
        state,
        state.customItems.filter((i) => i.id !== action.payload)
      );
    case "UNDO_ITEMS": {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        ...state,
        customItems: state.itemHistory[newIndex],
        historyIndex: newIndex,
      };
    }
    case "REDO_ITEMS": {
      if (state.historyIndex >= state.itemHistory.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        ...state,
        customItems: state.itemHistory[newIndex],
        historyIndex: newIndex,
      };
    }

    // ── Preview interactions ──
    case "SET_CURRENT_PAGE":
      return { ...state, currentPage: action.payload };
    case "SET_SELECTED_CATEGORY":
      return { ...state, selectedCategory: action.payload };
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.payload };
    case "ADD_TO_CART":
      return {
        ...state,
        cartItems: {
          ...state.cartItems,
          [action.payload]: (state.cartItems[action.payload] || 0) + 1,
        },
      };
    case "REMOVE_FROM_CART": {
      const next = { ...state.cartItems };
      if (next[action.payload] > 1) next[action.payload]--;
      else delete next[action.payload];
      return { ...state, cartItems: next };
    }
    case "CLEAR_CART":
      return { ...state, cartItems: {} };
    case "TOGGLE_FAVORITE":
      return {
        ...state,
        favorites: state.favorites.includes(action.payload)
          ? state.favorites.filter((id) => id !== action.payload)
          : [...state.favorites, action.payload],
      };

    // ── System ──
    case "RESET_ALL":
      return { ...initialStudioState };
    case "APPLY_AI_PRESET":
      return {
        ...state,
        businessName: "Luminary Cafe",
        serviceType: "cafe",
        selectedTheme: "elegant",
        glassEffect: true,
        selectedTemplate: "brutal",
      };

    default:
      return state;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────

/**
 * useStudioState — drop-in replacement for LivePreviewTool's useState cluster.
 *
 * Returns `state`, `dispatch`, and convenience `actions` wrappers so callers
 * don't need to construct action objects manually.
 */
export function useStudioState() {
  const [state, dispatch] = useReducer(studioReducer, initialStudioState);

  const actions = {
    setBusinessName: useCallback((v: string) => dispatch({ type: "SET_BUSINESS_NAME", payload: v }), []),
    setServiceType: useCallback((v: string) => dispatch({ type: "SET_SERVICE_TYPE", payload: v }), []),
    setSelectedTheme: useCallback((v: string) => dispatch({ type: "SET_SELECTED_THEME", payload: v }), []),
    updateCustomTheme: useCallback((key: "primary" | "accent", value: string) => dispatch({ type: "UPDATE_CUSTOM_THEME", payload: { key, value } }), []),
    setGlassEffect: useCallback((v: boolean) => dispatch({ type: "SET_GLASS_EFFECT", payload: v }), []),
    setFontSize: useCallback((v: number) => dispatch({ type: "SET_FONT_SIZE", payload: v }), []),
    setActiveTexture: useCallback((v: TextureType) => dispatch({ type: "SET_ACTIVE_TEXTURE", payload: v }), []),
    setIsDarkMode: useCallback((v: boolean) => dispatch({ type: "SET_DARK_MODE", payload: v }), []),
    applyPerformanceMode: useCallback(() => dispatch({ type: "APPLY_PERFORMANCE_MODE" }), []),
    setDeviceView: useCallback((v: DeviceType) => dispatch({ type: "SET_DEVICE_VIEW", payload: v }), []),
    setViewMode: useCallback((v: ViewMode) => dispatch({ type: "SET_VIEW_MODE", payload: v }), []),
    setSelectedTemplate: useCallback((v: TemplateType) => dispatch({ type: "SET_SELECTED_TEMPLATE", payload: v }), []),
    setEnable3D: useCallback((v: boolean) => dispatch({ type: "SET_ENABLE_3D", payload: v }), []),
    setRotationX: useCallback((v: number) => dispatch({ type: "SET_ROTATION_X", payload: v }), []),
    setRotationY: useCallback((v: number) => dispatch({ type: "SET_ROTATION_Y", payload: v }), []),
    setActiveStudioTab: useCallback((v: StudioTab) => dispatch({ type: "SET_ACTIVE_STUDIO_TAB", payload: v }), []),
    setShowRatings: useCallback((v: boolean) => dispatch({ type: "SET_SHOW_RATINGS", payload: v }), []),
    setShowTime: useCallback((v: boolean) => dispatch({ type: "SET_SHOW_TIME", payload: v }), []),
    setShowFeatured: useCallback((v: boolean) => dispatch({ type: "SET_SHOW_FEATURED", payload: v }), []),
    setImageQuality: useCallback((v: ImageQuality) => dispatch({ type: "SET_IMAGE_QUALITY", payload: v }), []),
    setSortBy: useCallback((v: SortBy) => dispatch({ type: "SET_SORT_BY", payload: v }), []),
    addCustomItem: useCallback((item: MenuItem) => dispatch({ type: "ADD_CUSTOM_ITEM", payload: item }), []),
    updateCustomItem: useCallback((item: MenuItem) => dispatch({ type: "UPDATE_CUSTOM_ITEM", payload: item }), []),
    deleteCustomItem: useCallback((id: number) => dispatch({ type: "DELETE_CUSTOM_ITEM", payload: id }), []),
    undo: useCallback(() => dispatch({ type: "UNDO_ITEMS" }), []),
    redo: useCallback(() => dispatch({ type: "REDO_ITEMS" }), []),
    setCurrentPage: useCallback((v: PageType) => dispatch({ type: "SET_CURRENT_PAGE", payload: v }), []),
    setSelectedCategory: useCallback((v: string) => dispatch({ type: "SET_SELECTED_CATEGORY", payload: v }), []),
    setSearchQuery: useCallback((v: string) => dispatch({ type: "SET_SEARCH_QUERY", payload: v }), []),
    addToCart: useCallback((id: number) => dispatch({ type: "ADD_TO_CART", payload: id }), []),
    removeFromCart: useCallback((id: number) => dispatch({ type: "REMOVE_FROM_CART", payload: id }), []),
    clearCart: useCallback(() => dispatch({ type: "CLEAR_CART" }), []),
    toggleFavorite: useCallback((id: number) => dispatch({ type: "TOGGLE_FAVORITE", payload: id }), []),
    resetAll: useCallback(() => dispatch({ type: "RESET_ALL" }), []),
    applyAiPreset: useCallback(() => dispatch({ type: "APPLY_AI_PRESET" }), []),
  };

  return { state, dispatch, actions };
}
