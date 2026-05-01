import { motion, AnimatePresence } from "framer-motion";
import { Plus, RotateCcw, Wand2, Trash2, ChevronUp, ChevronDown, Star } from "lucide-react";
import type { MenuItem } from "@/types";

interface ContentTabProps {
  showRatings: boolean;
  setShowRatings: (v: boolean) => void;
  showTime: boolean;
  setShowTime: (v: boolean) => void;
  showFeatured: boolean;
  setShowFeatured: (v: boolean) => void;
  showPrices: boolean;
  setShowPrices: (v: boolean) => void;
  featuredOnly: boolean;
  setFeaturedOnly: (v: boolean) => void;
  imageQuality: "standard" | "hd";
  setImageQuality: (v: "standard" | "hd") => void;
  sortBy: "name" | "price" | "rating";
  setSortBy: (v: "name" | "price" | "rating") => void;
  customItems: MenuItem[];
  allMenuItems: MenuItem[];
  effectiveAccent: string;
  historyIndex: number;
  itemHistoryLength: number;
  onUndo: () => void;
  onRedo: () => void;
  onAddItem: () => void;
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (id: number, name: string) => void;
  onReorderItem: (id: number, direction: "up" | "down") => void;
  onClearAllItems: () => void;
}

const Toggle = ({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-black/20">
    <span className="text-xs text-muted-foreground font-medium">{label}</span>
    <button
      onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full transition-all relative ${checked ? "bg-primary" : "bg-muted"}`}
      aria-pressed={checked}
      aria-label={`${label}: ${checked ? "on" : "off"}`}
    >
      <div
        className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  </div>
);

const ContentTab = ({
  showRatings, setShowRatings,
  showTime, setShowTime,
  showFeatured, setShowFeatured,
  showPrices, setShowPrices,
  featuredOnly, setFeaturedOnly,
  imageQuality, setImageQuality,
  sortBy, setSortBy,
  customItems, allMenuItems, effectiveAccent,
  historyIndex, itemHistoryLength,
  onUndo, onRedo,
  onAddItem, onEditItem, onDeleteItem,
  onReorderItem, onClearAllItems,
}: ContentTabProps) => {
  // Category stats derived from allMenuItems
  const categoryStats = allMenuItems.reduce<Record<string, { count: number; icon: string; name: string }>>(
    (acc, item) => {
      if (item.category === "all") return acc;
      if (!acc[item.category]) acc[item.category] = { count: 0, icon: "", name: item.category };
      acc[item.category].count++;
      return acc;
    },
    {}
  );
  const catEntries = Object.entries(categoryStats).sort((a, b) => b[1].count - a[1].count);
  const maxCatCount = catEntries[0]?.[1].count || 1;

  return (
    <motion.div
      key="content"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-4"
    >
      {/* ── DISPLAY OPTIONS ── */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Display Options
        </label>
        <Toggle label="Show Prices" checked={showPrices} onChange={setShowPrices} />
        <Toggle label="Show Ratings" checked={showRatings} onChange={setShowRatings} />
        <Toggle label="Show Time / Duration" checked={showTime} onChange={setShowTime} />
        <Toggle label="Show Featured Badge" checked={showFeatured} onChange={setShowFeatured} />
      </div>

      {/* ── QUICK FILTERS ── */}
      <div className="space-y-2 pt-3 border-t border-border/40">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Quick Filters
        </label>
        <button
          onClick={() => setFeaturedOnly(!featuredOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all ${
            featuredOnly
              ? "border-yellow-400/60 text-yellow-300"
              : "border-border text-muted-foreground hover:border-yellow-400/40 hover:text-yellow-400/70"
          }`}
          style={featuredOnly ? { background: "rgba(250,204,21,0.12)" } : {}}
          aria-pressed={featuredOnly}
        >
          <Star size={10} className={featuredOnly ? "fill-yellow-400 text-yellow-400" : ""} aria-hidden="true" />
          Featured Only
        </button>
      </div>

      {/* ── CATEGORY STATS ── */}
      {catEntries.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-border/40">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Catalog Breakdown
          </label>
          <div className="space-y-1.5">
            {catEntries.map(([catId, { count, name }]) => (
              <div key={catId} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground capitalize w-20 truncate">{name}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: effectiveAccent }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / maxCatCount) * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: effectiveAccent }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── IMAGE QUALITY ── */}
      <div className="space-y-2 pt-3 border-t border-border/40">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Image Quality
        </label>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Image quality">
          {(["standard", "hd"] as const).map((q) => (
            <button
              key={q}
              onClick={() => setImageQuality(q)}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                imageQuality === q
                  ? "border-primary/30 bg-primary text-white"
                  : "border-border bg-black/20 text-muted-foreground"
              }`}
              aria-pressed={imageQuality === q}
              aria-label={`${q === "standard" ? "Standard" : "High definition"} image quality`}
            >
              {q === "standard" ? "Standard" : "HD"}
            </button>
          ))}
        </div>
      </div>

      {/* ── SORT ── */}
      <div className="space-y-2 pt-3 border-t border-border/40">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Sort Items By
        </label>
        <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Sort items">
          {(["name", "price", "rating"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`p-2 rounded-lg border text-[10px] font-bold capitalize transition-all ${
                sortBy === s
                  ? "border-primary/30 bg-primary text-white"
                  : "border-border bg-black/20 text-muted-foreground"
              }`}
              aria-pressed={sortBy === s}
              aria-label={`Sort by ${s}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── CUSTOM ITEMS ── */}
      <div className="space-y-2 pt-3 border-t border-border/40">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            My Items{" "}
            {customItems.length > 0 && (
              <span
                className="ml-1 px-1.5 py-0.5 rounded-full text-[9px]"
                style={{ background: `${effectiveAccent}20`, color: effectiveAccent }}
              >
                {customItems.length}
              </span>
            )}
          </label>
          <div className="flex items-center gap-1" role="group" aria-label="Undo redo history">
            <button
              onClick={onUndo}
              disabled={historyIndex <= 0}
              title="Undo"
              aria-label="Undo last item change"
              className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground disabled:opacity-25 hover:text-foreground hover:bg-white/10 transition-all"
            >
              <RotateCcw size={10} aria-hidden="true" />
            </button>
            <button
              onClick={onRedo}
              disabled={historyIndex >= itemHistoryLength - 1}
              title="Redo"
              aria-label="Redo last item change"
              className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground disabled:opacity-25 hover:text-foreground hover:bg-white/10 transition-all"
              style={{ transform: "scaleX(-1)" }}
            >
              <RotateCcw size={10} aria-hidden="true" />
            </button>
            {customItems.length > 0 && (
              <button
                onClick={onClearAllItems}
                title="Clear all custom items"
                aria-label="Clear all custom items"
                className="w-6 h-6 rounded-lg flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-all"
              >
                <Trash2 size={10} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Add button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onAddItem}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed text-xs font-bold transition-all"
          style={{ borderColor: `${effectiveAccent}40`, color: `${effectiveAccent}99` }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.borderColor = effectiveAccent;
            el.style.color = effectiveAccent;
            el.style.background = `${effectiveAccent}08`;
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.borderColor = `${effectiveAccent}40`;
            el.style.color = `${effectiveAccent}99`;
            el.style.background = "transparent";
          }}
          aria-label="Add custom menu item"
        >
          <Plus size={14} aria-hidden="true" />
          Add Custom Item
        </motion.button>

        {/* Items list */}
        <AnimatePresence>
          {customItems.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-[10px] text-muted-foreground py-4"
            >
              No custom items yet. Add one above!
            </motion.p>
          )}
          {customItems.map((item, index) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 p-2 rounded-xl border border-border bg-black/20 group hover:border-primary/20 transition-all">
                {/* Reorder arrows */}
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => onReorderItem(item.id, "up")}
                    disabled={index === 0}
                    aria-label={`Move ${item.name} up`}
                    className="w-4 h-4 flex items-center justify-center text-muted-foreground/40 disabled:opacity-20 hover:text-foreground transition-colors"
                  >
                    <ChevronUp size={10} aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => onReorderItem(item.id, "down")}
                    disabled={index === customItems.length - 1}
                    aria-label={`Move ${item.name} down`}
                    className="w-4 h-4 flex items-center justify-center text-muted-foreground/40 disabled:opacity-20 hover:text-foreground transition-colors"
                  >
                    <ChevronDown size={10} aria-hidden="true" />
                  </button>
                </div>
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                  <p className="text-[10px] font-medium" style={{ color: effectiveAccent }}>
                    {item.price} EGP
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEditItem(item)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                    aria-label={`Edit ${item.name}`}
                    title="Edit item"
                  >
                    <Wand2 size={10} aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => onDeleteItem(item.id, item.name)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all"
                    aria-label={`Delete ${item.name}`}
                    title="Delete item"
                  >
                    <Trash2 size={10} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ContentTab;
