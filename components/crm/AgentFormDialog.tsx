"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Agent, AgentFormData } from "@/types";

/* ─────────────────────────────────────────────
   FIELD COMPONENT
   ───────────────────────────────────────────── */
function Field({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  required,
  span,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  span?: 2;
}) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <Label htmlFor={name} className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <Input
        id={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5"
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   SELECT FIELD
   ───────────────────────────────────────────── */
function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1.5">
          <SelectValue placeholder={placeholder ?? "Select…"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SECTION HEADER
   ───────────────────────────────────────────── */
function SectionHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-4 pb-3 border-b">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   EMPTY FORM STATE
   ───────────────────────────────────────────── */
const EMPTY_FORM: AgentFormData = {
  full_name: "",
  email: "",
  mobile_number: "",
  city: "",
  address: "",
  date_of_birth: "",
  gender: "",
  agency_name: "",
  license_number: "",
  experience_years: "",
  properties_managed: "",
  specialization: "",
  terms_accepted: false,
};

/* ─────────────────────────────────────────────
   AGENT FORM DIALOG
   ───────────────────────────────────────────── */
export default function AgentFormDialog({
  open,
  onOpenChange,
  agentId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agentId?: any;
  onSuccess?: (agent: Agent) => void;
}) {
  const [form, setForm] = useState<AgentFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isEdit = !!agentId;

  /* Fetch agent details when agentId provided */
  useEffect(() => {
    if (!open) return;

    if (agentId) {
      setFetchLoading(true);
      setError(null);
      fetch(`/api/agents/${agentId}`)
        .then((r) => r.json())
        .then((json) => {
          if (!json.success) throw new Error(json.error);
          const a: Agent = json.data;
          setForm({
            full_name:         a.full_name ?? "",
            email:             a.email ?? "",
            mobile_number:     a.mobile_number ?? "",
            city:              a.city ?? "",
            address:           a.address ?? "",
            date_of_birth:     a.date_of_birth ? a.date_of_birth.slice(0, 10) : "",
            gender:            a.gender ?? "",
            agency_name:       a.agency_name ?? "",
            license_number:    a.license_number ?? "",
            experience_years:  String(a.experience_years ?? ""),
            properties_managed:String(a.properties_managed ?? ""),
            specialization:    a.specialization ?? "",
            terms_accepted:    a.terms_accepted ?? false,
          });
        })
        .catch((e) => setError(e.message))
        .finally(() => setFetchLoading(false));
    } else {
      setForm(EMPTY_FORM);
      setError(null);
      setSuccess(false);
    }
  }, [agentId, open]);

  const set = (key: keyof AgentFormData) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const handleSubmit = async () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      setError("Full name and email are required.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const url    = isEdit ? `/api/agents/${agentId}` : "/api/agents";
      const method = isEdit ? "PATCH" : "POST";

      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          experience_years:   parseInt(form.experience_years) || 0,
          properties_managed: parseInt(form.properties_managed) || 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");

      setSuccess(true);
      onSuccess?.(json.data);
      setTimeout(() => onOpenChange(false), 1200);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Render ─────────────────────────────── */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-7 pt-6 pb-4 border-b sticky top-0 bg-background z-10">
          <DialogTitle className="font-display text-2xl font-normal">
            {isEdit ? "Edit Agent" : "Add New Agent"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isEdit ? `Updating agent ID #${agentId}` : "Fill in the agent details below"}
          </DialogDescription>
        </DialogHeader>

        <div className="px-7 py-6">
          {fetchLoading ? (
            <div className="text-center py-10">
              <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading agent data…</p>
            </div>
          ) : (
            <>
              {/* ── Personal Info ────────── */}
              <div className="mb-6">
                <SectionHeader title="Personal Information" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Full Name" name="full_name" value={form.full_name} onChange={set("full_name")} required placeholder="John Doe" />
                  <Field label="Email Address" name="email" type="email" value={form.email} onChange={set("email")} required placeholder="john@agency.com" />
                  <Field label="Mobile Number" name="mobile_number" type="tel" value={form.mobile_number} onChange={set("mobile_number")} placeholder="+91 9876543210" />
                  <Field label="Date of Birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={set("date_of_birth")} />
                  <SelectField
                    label="Gender"
                    value={form.gender}
                    onChange={set("gender")}
                    placeholder="Select gender"
                    options={[
                      { label: "Male",   value: "male" },
                      { label: "Female", value: "female" },
                      { label: "Other",  value: "other" },
                      { label: "Prefer not to say", value: "not_specified" },
                    ]}
                  />
                  <Field label="City" name="city" value={form.city} onChange={set("city")} placeholder="Mumbai" />
                  <Field label="Address" name="address" value={form.address} onChange={set("address")} placeholder="Full address" span={2} />
                </div>
              </div>

              {/* ── Professional Info ────── */}
              <div className="mb-6">
                <SectionHeader title="Professional Details" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Agency Name" name="agency_name" value={form.agency_name} onChange={set("agency_name")} placeholder="Best Realty Ltd." />
                  <Field label="License Number" name="license_number" value={form.license_number} onChange={set("license_number")} placeholder="LIC-2024-XXXX" />
                  <Field label="Years of Experience" name="experience_years" type="number" value={form.experience_years} onChange={set("experience_years")} placeholder="0" />
                  <Field label="Properties Managed" name="properties_managed" type="number" value={form.properties_managed} onChange={set("properties_managed")} placeholder="0" />
                  <SelectField
                    label="Specialization"
                    value={form.specialization}
                    onChange={set("specialization")}
                    placeholder="Select specialization"
                    options={[
                      { label: "Residential Sales",    value: "residential_sales" },
                      { label: "Commercial Leasing",   value: "commercial_leasing" },
                      { label: "Property Management",  value: "property_management" },
                      { label: "Luxury Properties",    value: "luxury" },
                      { label: "Industrial / Warehouse",value: "industrial" },
                      { label: "Land & Plots",         value: "land_plots" },
                      { label: "NRI Properties",       value: "nri" },
                    ]}
                  />
                </div>
              </div>

              {/* ── Terms ───────────────── */}
              <div className="mb-6">
                <SectionHeader title="Compliance" />
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="terms"
                    checked={form.terms_accepted}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({ ...f, terms_accepted: checked === true }))
                    }
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="terms"
                    className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                  >
                    Agent has accepted the{" "}
                    <span className="text-foreground underline">Terms & Conditions</span>
                    {" "}and{" "}
                    <span className="text-foreground underline">Privacy Policy</span>
                  </Label>
                </div>
              </div>

              {/* Error / Success */}
              {error && (
                <div className="mb-4 p-3.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 p-3.5 bg-success/10 border border-success/20 rounded-lg text-sm text-success">
                  Agent {isEdit ? "updated" : "created"} successfully!
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-2.5 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="min-w-[140px]"
                >
                  {loading && (
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  )}
                  {isEdit ? "Update Agent" : "Create Agent"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}