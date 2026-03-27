"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Loader2, AlertCircle, Save, Upload, Trash2,
  Image as ImageIcon, Type, Link as LinkIcon,
  Plus, X, User, Check, Palette, Eye, ZoomIn, ZoomOut, Move
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface AgentProfile {
  id: string;
  full_name: string;
  email: string;
  mobile_number?: string;
  agency_name?: string;
  city?: string;
  profile_photo_s3_url?: string;
}

interface FooterLink {
  label: string;
  url: string;
}

interface DashboardSettings {
  hero_background_url: string;
  hero_background_color: string;
  hero_title: string;
  hero_subtitle: string;
  footer_text: string;
  footer_links: FooterLink[];
  footer_show_contact: boolean;
}

interface ImageCropState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 mb-4">
      {children}
    </p>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label className="text-[12.5px] font-semibold text-foreground/80">{children}</label>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

function SaveButton({ loading, saved, onClick }: {
  loading: boolean; saved: boolean; onClick: () => void;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={loading}
      size="sm"
      className={cn(
        "h-8 px-4 text-[12.5px] font-semibold gap-2 transition-all duration-300",
        saved && "bg-emerald-600 hover:bg-emerald-600 text-white"
      )}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
       saved ? <Check className="w-3.5 h-3.5" /> :
       <Save className="w-3.5 h-3.5" />}
      {saved ? "Saved!" : "Save Changes"}
    </Button>
  );
}

/* ─── Image Cropper Modal ────────────────────────────────────────────────── */
interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  onConfirm: (croppedImage: string) => void;
  onCancel: () => void;
  onClose: () => void;
}

function ImageCropperModal({ isOpen, imageSrc, onConfirm, onCancel, onClose }: ImageCropperModalProps) {
  const [cropState, setCropState] = useState<ImageCropState>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const CROP_SIZE = 280; // Square crop area
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3;

  // Handle zoom
  const handleZoom = (direction: "in" | "out") => {
    setCropState((prev) => ({
      ...prev,
      scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale + (direction === "in" ? 0.2 : -0.2))),
    }));
  };

  // Handle pan (drag)
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setCropState((prev) => ({
      ...prev,
      offsetX: prev.offsetX + dx,
      offsetY: prev.offsetY + dy,
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Generate cropped image
  const generateCroppedImage = (): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = CROP_SIZE;
        canvas.height = CROP_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Draw white background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, CROP_SIZE, CROP_SIZE);

        // Calculate drawing position
        const drawWidth = img.width * cropState.scale;
        const drawHeight = img.height * cropState.scale;
        const drawX = (CROP_SIZE - drawWidth) / 2 + cropState.offsetX;
        const drawY = (CROP_SIZE - drawHeight) / 2 + cropState.offsetY;

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        resolve(canvas.toDataURL("image/jpeg", 0.95));
      };
      img.src = imageSrc;
    });
  };

  const handleConfirm = async () => {
    const croppedImage = await generateCroppedImage();
    onConfirm(croppedImage);
  };

  // Reset zoom and position
  const handleReset = () => {
    setCropState({ scale: 1, offsetX: 0, offsetY: 0 });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md border border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-[16px] font-bold text-foreground">Adjust Your Photo</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Preview Container */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="relative bg-muted rounded-2xl overflow-hidden cursor-move select-none border-2 border-dashed border-border/50"
            style={{ width: CROP_SIZE, height: CROP_SIZE, margin: "0 auto" }}
          >
            <img
              src={imageSrc}
              alt="Crop preview"
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                transform: `scale(${cropState.scale}) translate(${cropState.offsetX / cropState.scale}px, ${cropState.offsetY / cropState.scale}px)`,
                transformOrigin: "center",
              }}
              draggable={false}
            />

            {/* Grid overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5" />
              <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
              <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
              <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
            </div>

            {/* Center indicator */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-1 h-1 rounded-full bg-amber-400 shadow-lg" />
            </div>
          </div>

          {/* Info text */}
          <div className="text-center">
            <p className="text-[12px] text-muted-foreground font-medium">
              Drag to move · Use buttons to zoom
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Scale: {(cropState.scale * 100).toFixed(0)}%
            </p>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 flex-1 gap-2"
              onClick={() => handleZoom("out")}
              disabled={cropState.scale <= MIN_SCALE}
            >
              <ZoomOut className="w-4 h-4" />
              Zoom Out
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 flex-1 gap-2"
              onClick={() => handleZoom("in")}
              disabled={cropState.scale >= MAX_SCALE}
            >
              <ZoomIn className="w-4 h-4" />
              Zoom In
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-full text-muted-foreground"
            onClick={handleReset}
          >
            Reset Position
          </Button>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="h-9 flex-1"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              className="h-9 flex-1 gap-2"
              onClick={handleConfirm}
            >
              <Check className="w-4 h-4" />
              Confirm 
            </Button>
          </div>
        </div>
      </Card>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Profile photo */
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [uncropedImage, setUncropedImage] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  /* Hero background */
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  /* Dashboard settings */
  const [settings, setSettings] = useState<DashboardSettings>({
    hero_background_url: "",
    hero_background_color: "#0a0f1e",
    hero_title: "Welcome to Your Portal",
    hero_subtitle: "Manage your listings, track leads, and grow your real estate business.",
    footer_text: "© {year} Rexon Properties. All rights reserved.",
    footer_links: [
      { label: "Support", url: "#" },
      { label: "Privacy Policy", url: "#" },
      { label: "Terms", url: "#" },
    ],
    footer_show_contact: true,
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  /* ── Fetch ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) throw new Error("Session expired");
        const meData = await meRes.json();
        const agentId = meData.agent.id;

        const [agentRes, settingsRes] = await Promise.all([
          fetch(`/api/agents/${agentId}`),
          fetch(`/api/agents/${agentId}/dashboard-settings`),
        ]);

        if (!agentRes.ok) throw new Error("Failed to load agent profile");
        const agentData = await agentRes.json();
        setAgent(agentData.agent);

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData.settings) {
            setSettings((prev) => ({ ...prev, ...settingsData.settings }));
            if (settingsData.settings.hero_background_url) {
              setBgPreview(settingsData.settings.hero_background_url);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  /* ── Profile photo with crop modal ──────────────────────────────────────── */
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoError("Please select a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Image must be under 5MB.");
      return;
    }
    setPhotoError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const imageSrc = ev.target?.result as string;
      setUncropedImage(imageSrc);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = (croppedImage: string) => {
    setPhotoPreview(croppedImage);
    
    // Convert data URL to File
    fetch(croppedImage)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], "profile-photo.jpg", { type: "image/jpeg" });
        setPhotoFile(file);
      });
    
    setCropModalOpen(false);
    setUncropedImage(null);
  };

  const handleCropCancel = () => {
    setCropModalOpen(false);
    setUncropedImage(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const handlePhotoUpload = async () => {
    if (!photoFile || !agent) return;
    setPhotoUploading(true);
    setPhotoError(null);
    try {
      const formData = new FormData();
      formData.append("profilePhoto", photoFile);
      const res = await fetch(`/api/agents/${agent.id}/profile-photo`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Upload failed");
      }
      const data = await res.json();
      const newUrl: string = data.profile_photo_s3_url;

      // ✅ Update local agent state with fresh URL
      setAgent((prev) => prev ? { ...prev, profile_photo_s3_url: newUrl } : prev);
      setPhotoFile(null);
      setPhotoPreview(null);
      setPhotoSaved(true);
      setTimeout(() => setPhotoSaved(false), 3000);

      // ✅ Notify Sidebar and TopNav to re-fetch their agent data
      window.dispatchEvent(
        new CustomEvent("profilePhotoUpdated", { detail: { profile_photo_s3_url: newUrl } })
      );
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPhotoUploading(false);
    }
  };

  /* ── Background image ───────────────────────────────────────────────────── */
  const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setBgPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeBgImage = () => {
    setBgFile(null);
    setBgPreview(null);
    setSettings((prev) => ({ ...prev, hero_background_url: "" }));
    if (bgInputRef.current) bgInputRef.current.value = "";
  };

  /* ── Footer links ───────────────────────────────────────────────────────── */
  const addFooterLink = () =>
    setSettings((prev) => ({ ...prev, footer_links: [...prev.footer_links, { label: "", url: "" }] }));

  const removeFooterLink = (i: number) =>
    setSettings((prev) => ({ ...prev, footer_links: prev.footer_links.filter((_, idx) => idx !== i) }));

  const updateFooterLink = (i: number, field: "label" | "url", val: string) =>
    setSettings((prev) => ({
      ...prev,
      footer_links: prev.footer_links.map((l, idx) => idx === i ? { ...l, [field]: val } : l),
    }));

  /* ── Save settings ──────────────────────────────────────────────────────── */
  const saveSettings = async () => {
    if (!agent) return;
    setSettingsSaving(true);
    setSettingsError(null);
    try {
      let bgUrl = settings.hero_background_url;
      if (bgFile) {
        const formData = new FormData();
        formData.append("backgroundImage", bgFile);
        const uploadRes = await fetch(`/api/agents/${agent.id}/dashboard-settings/background`, {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          const d = await uploadRes.json();
          throw new Error(d.error || "Background upload failed");
        }
        const uploadData = await uploadRes.json();
        bgUrl = uploadData.url;
        setBgFile(null);
      }
      const payload: DashboardSettings = { ...settings, hero_background_url: bgUrl };
      const res = await fetch(`/api/agents/${agent.id}/dashboard-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save");
      }
      setSettings(payload);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSettingsSaving(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
        <p className="text-[14px] text-muted-foreground">Loading settings…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl py-10">
        <Card className="p-6 border-destructive/20 bg-destructive/5">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-[13px] text-destructive/80">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  const displayPhoto = photoPreview || agent?.profile_photo_s3_url;
  const initials = agent ? getInitials(agent.full_name) : "–";

  /* Live hero preview */
  const previewBg = bgPreview || settings.hero_background_url;
  const previewStyle: React.CSSProperties = previewBg
    ? { backgroundImage: `url(${previewBg})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundColor: settings.hero_background_color || "#0a0f1e" };

  return (
    <div className="max-w-3xl lg:py-10 xl:py-10 py-4 space-y-5">

      {/* ── Image Cropper Modal ───────────────────────────────────────────── */}
      <ImageCropperModal
        isOpen={cropModalOpen}
        imageSrc={uncropedImage || ""}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
        onClose={handleCropCancel}
      />

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="mb-7">
        <h1 className="text-[22px] font-black text-foreground tracking-tight">Dashboard Settings</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Personalise your agent portal — changes are reflected immediately after saving.
        </p>
      </div>

      {/* ── 1. Profile Photo ──────────────────────────────────────────────── */}
      <Card className="overflow-hidden border border-border">
        <div className="px-6 pt-5 pb-1 border-b border-border bg-muted/30">
          <SectionLabel>Profile Photo</SectionLabel>
        </div>
        <div className="p-6">
          <div className="flex items-start gap-6 flex-wrap">
            {/* Avatar */}
            <div className="relative shrink-0">
              {displayPhoto ? (
                <img
                  src={displayPhoto}
                  alt="Profile"
                  className="w-[88px] h-[88px] rounded-2xl object-cover border border-border shadow-md"
                />
              ) : (
                <div className="w-[88px] h-[88px] rounded-2xl bg-foreground flex items-center justify-center border border-border shadow-md">
                  <span className="text-[24px] font-black text-background">{initials}</span>
                </div>
              )}
              {photoPreview && (
                <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
                  <Upload className="w-3 h-3 text-white" />
                </span>
              )}
            </div>

            {/* Controls */}
            <div className="flex-1 min-w-[200px]">
              <p className="text-[13px] font-semibold text-foreground mb-0.5">
                {agent?.full_name || "Your Name"}
              </p>
              <p className="text-[12px] text-muted-foreground mb-4">
                JPG, PNG, or WebP · Max 5 MB
              </p>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[12.5px] gap-2 h-8"
                  onClick={() => photoInputRef.current?.click()}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Choose Photo
                </Button>

                {photoFile && (
                  <Button
                    size="sm"
                    className="text-[12.5px] gap-2 h-8"
                    onClick={handlePhotoUpload}
                    disabled={photoUploading}
                  >
                    {photoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                     photoSaved ? <Check className="w-3.5 h-3.5" /> :
                     <Upload className="w-3.5 h-3.5" />}
                    {photoUploading ? "Uploading…" : photoSaved ? "Uploaded!" : "Upload"}
                  </Button>
                )}

                {displayPhoto && !photoFile && (
                  <Button
                    variant="ghost" size="sm"
                    className="text-[12.5px] gap-2 h-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setPhotoPreview(null);
                      setPhotoFile(null);
                      if (photoInputRef.current) photoInputRef.current.value = "";
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </Button>
                )}
              </div>

              {photoFile && (
                <p className="text-[11.5px] text-muted-foreground mt-2">
                  {photoFile.name} · {(photoFile.size / 1024).toFixed(0)} KB
                </p>
              )}
              {photoError && (
                <p className="text-[12px] text-destructive flex items-center gap-1.5 mt-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {photoError}
                </p>
              )}
              {photoSaved && !photoFile && (
                <p className="text-[12px] text-emerald-600 flex items-center gap-1.5 mt-2">
                  <Check className="w-3.5 h-3.5" /> Profile photo updated.
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── 2. Hero Banner ────────────────────────────────────────────────── */}
      <Card className="overflow-hidden border border-border">
        <div className="px-6 pt-5 pb-1 border-b border-border bg-muted/30 flex items-center justify-between">
          <SectionLabel>Dashboard Hero Banner</SectionLabel>
          <div className="mb-4">
            <SaveButton loading={settingsSaving} saved={settingsSaved} onClick={saveSettings} />
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* Live preview */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider">Live Preview</span>
            </div>
            <div
              className="relative w-full rounded-xl overflow-hidden border border-border shadow-sm"
              style={{ ...previewStyle, minHeight: 180 }}
            >
              {previewBg ? (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/40 to-black/15" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                </>
              ) : (
                <>
                  <div className="absolute inset-0 opacity-25"
                    style={{ background: `radial-gradient(ellipse 70% 60% at 20% 40%, rgba(99,102,241,0.5) 0%, transparent 70%)` }} />
                  <div className="absolute inset-0 opacity-[0.04]"
                    style={{ backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
                </>
              )}
              <div className="relative z-10 px-6 py-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45 mb-1">Good morning</p>
                <p className="text-[28px] font-black text-white leading-none mb-2">
                  {agent ? agent.full_name.split(" ")[0] : "Name"}<span className="text-white/25">.</span>
                </p>
                <p className="text-[13px] font-semibold text-white/85 mb-1">{settings.hero_title || "Hero title"}</p>
                <p className="text-[11.5px] text-white/50">{settings.hero_subtitle || "Subtitle"}</p>
              </div>
              {previewBg && (
                <button
                  onClick={removeBgImage}
                  className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              )}
            </div>
          </div>

          <Separator />

          {/* Background controls */}
          <div>
            <p className="text-[12.5px] font-semibold text-foreground/80 flex items-center gap-1.5 mb-4">
              <Palette className="w-3.5 h-3.5" /> Background
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel hint="JPG/PNG/WebP · max 5 MB · overrides color">Background Image</FieldLabel>
                <input ref={bgInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleBgChange} />
                <Button
                  variant="outline" size="sm"
                  className="text-[12.5px] gap-2 h-9 w-full justify-start font-normal"
                  onClick={() => bgInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                  {bgFile ? bgFile.name.slice(0, 22) + (bgFile.name.length > 22 ? "…" : "") : "Choose image…"}
                </Button>
              </div>

              <div>
                <FieldLabel hint="Used when no image is set">Background Color</FieldLabel>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.hero_background_color || "#0a0f1e"}
                    onChange={(e) => setSettings((prev) => ({ ...prev, hero_background_color: e.target.value }))}
                    className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent p-0.5 shrink-0"
                  />
                  <Input
                    value={settings.hero_background_color || "#0a0f1e"}
                    onChange={(e) => setSettings((prev) => ({ ...prev, hero_background_color: e.target.value }))}
                    className="h-9 text-[13px] font-mono"
                    placeholder="#0a0f1e"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Hero text */}
          <div>
            <p className="text-[12.5px] font-semibold text-foreground/80 flex items-center gap-1.5 mb-4">
              <Type className="w-3.5 h-3.5" /> Hero Text
            </p>
            <div className="space-y-4">
              <div>
                <FieldLabel>Title</FieldLabel>
                <Input
                  value={settings.hero_title}
                  onChange={(e) => setSettings((prev) => ({ ...prev, hero_title: e.target.value }))}
                  className="h-9 text-[13.5px]"
                  placeholder="Welcome to Your Portal"
                />
              </div>
              <div>
                <FieldLabel>Subtitle</FieldLabel>
                <Input
                  value={settings.hero_subtitle}
                  onChange={(e) => setSettings((prev) => ({ ...prev, hero_subtitle: e.target.value }))}
                  className="h-9 text-[13.5px]"
                  placeholder="A short tagline or description…"
                />
              </div>
            </div>
          </div>

          {settingsError && (
            <p className="text-[12px] text-destructive flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {settingsError}
            </p>
          )}
        </div>
      </Card>

      {/* ── 3. Footer ─────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden border border-border">
        <div className="px-6 pt-5 pb-1 border-b border-border bg-muted/30 flex items-center justify-between">
          <SectionLabel>Footer</SectionLabel>
          <div className="mb-4">
            <SaveButton loading={settingsSaving} saved={settingsSaved} onClick={saveSettings} />
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Copyright text */}
          <div>
            <FieldLabel hint={`Use {year} for the current year (e.g. © {year} Your Company)`}>
              Copyright / Footer Text
            </FieldLabel>
            <Input
              value={settings.footer_text}
              onChange={(e) => setSettings((prev) => ({ ...prev, footer_text: e.target.value }))}
              className="h-9 text-[13.5px]"
              placeholder="© {year} Your Company. All rights reserved."
            />
          </div>

          <Separator />

          {/* Footer links */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12.5px] font-semibold text-foreground/80 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" /> Footer Links
              </p>
              <Button variant="outline" size="sm" className="h-7 text-[12px] gap-1.5 px-2.5" onClick={addFooterLink}>
                <Plus className="w-3 h-3" /> Add Link
              </Button>
            </div>

            {settings.footer_links.length === 0 && (
              <p className="text-[12px] text-muted-foreground italic">No footer links added yet.</p>
            )}

            <div className="space-y-2">
              {settings.footer_links.map((link, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <Input
                    value={link.label}
                    onChange={(e) => updateFooterLink(i, "label", e.target.value)}
                    placeholder="Label"
                    className="h-8 text-[13px] w-28 shrink-0"
                  />
                  <Input
                    value={link.url}
                    onChange={(e) => updateFooterLink(i, "url", e.target.value)}
                    placeholder="https://…"
                    className="h-8 text-[13px] flex-1"
                  />
                  <button
                    onClick={() => removeFooterLink(i)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Show contact toggle */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-semibold text-foreground">Show Contact Info</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Display your email and phone in the footer.
              </p>
            </div>
            <button
              onClick={() => setSettings((prev) => ({ ...prev, footer_show_contact: !prev.footer_show_contact }))}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                settings.footer_show_contact ? "bg-foreground" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform duration-200",
                  settings.footer_show_contact ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {settingsError && (
            <p className="text-[12px] text-destructive flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {settingsError}
            </p>
          )}
        </div>
      </Card>

      <div className="h-6" />
    </div>
  );
}