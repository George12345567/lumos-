import React from "react";
import { motion } from "framer-motion";
import { FileDown, FileUp, Share2, QrCode, CheckCircle2 } from "lucide-react";

interface ExportTabProps {
  onExportJson: () => void;
  onExportCsv: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCopyLink: () => void;
  onShowQR: () => void;
  copied: boolean;
}

const ExportTab = ({
  onExportJson,
  onExportCsv,
  onImport,
  onCopyLink,
  onShowQR,
  copied,
}: ExportTabProps) => {
  return (
    <motion.div
      key="export"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-3"
    >
      {/* Export buttons */}
      {[
        {
          onClick: onExportJson,
          icon: FileDown,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
          label: "Export JSON",
          desc: "Full project data",
        },
        {
          onClick: onExportCsv,
          icon: FileDown,
          color: "text-green-500",
          bg: "bg-green-500/10",
          label: "Export CSV",
          desc: "Spreadsheet format",
        },
      ].map(({ onClick, icon: Icon, color, bg, label, desc }) => (
        <button
          key={label}
          onClick={onClick}
          className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-black/20 hover:bg-white/70 transition-all text-left"
          aria-label={label}
        >
          <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon size={14} className={color} aria-hidden="true" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted-foreground block">{label}</span>
            <span className="text-[9px] text-slate-300">{desc}</span>
          </div>
        </button>
      ))}

      {/* Import */}
      <label
        className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-black/20 hover:bg-white/70 transition-all text-left cursor-pointer"
        aria-label="Import JSON project file"
      >
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <FileUp size={14} className="text-purple-500" aria-hidden="true" />
        </div>
        <div>
          <span className="text-xs font-bold text-muted-foreground block">Import JSON</span>
          <span className="text-[9px] text-slate-300">Load project data</span>
        </div>
        <input
          type="file"
          accept=".json"
          onChange={onImport}
          className="hidden"
          aria-hidden="true"
        />
      </label>

      {/* Share link */}
      <button
        onClick={onCopyLink}
        className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-black/20 hover:bg-white/70 transition-all text-left"
        aria-label={copied ? "Link copied to clipboard" : "Copy share link to clipboard"}
      >
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
          {copied ? (
            <CheckCircle2 size={14} className="text-primary" aria-hidden="true" />
          ) : (
            <Share2 size={14} className="text-cyan-500" aria-hidden="true" />
          )}
        </div>
        <div>
          <span className="text-xs font-bold text-muted-foreground block">
            {copied ? "Copied!" : "Share Link"}
          </span>
          <span className="text-[9px] text-slate-300">Copy preview URL</span>
        </div>
      </button>

      {/* QR code */}
      <button
        onClick={onShowQR}
        className="w-full flex items-center gap-3 p-3 rounded-xl border border-primary/15 bg-primary/[0.05] hover:bg-primary/[0.1] transition-all text-left"
        aria-label="Generate QR code for mobile preview"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <QrCode size={14} className="text-primary" aria-hidden="true" />
        </div>
        <div>
          <span className="text-xs font-bold text-primary/80 block">Generate QR Code</span>
          <span className="text-[9px] text-slate-300">Scan &amp; preview on phone</span>
        </div>
      </button>
    </motion.div>
  );
};

export default ExportTab;
