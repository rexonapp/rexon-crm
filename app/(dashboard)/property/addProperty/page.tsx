'use client'
import { useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle, MapPin, Building2, User, IndianRupee, FileText, Image as ImageIcon, Video, Plus, Eye, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import MapSelector from './MapSelector';
import Link from 'next/link';

interface WarehouseFormData {
  title: string;
  description: string;
  propertyType: string;
  totalArea: string;
  sizeUnit: 'sqft' | 'sqm';
  availableFrom: string;
  listingType: 'sale' | 'rent' | 'lease';
  pricePerSqFt: string;
  totalPrice: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  roadConnectivity: string;
  contactPersonName: string;
  contactPersonPhone: string;
  contactPersonEmail: string;
  latitude: string;
  longitude: string;
  amenities: string[];
  images: File[];
  videos: File[];
}

interface FieldErrors {
  title?: string;
  propertyType?: string;
  totalArea?: string;
  availableFrom?: string;
  pricePerSqFt?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  contactPersonPhone?: string;
  contactPersonEmail?: string;
  images?: string;
  videos?: string;
}

const PROPERTY_TYPES = [
  'Warehouse', 'Cold Storage', 'Industrial Shed', 'Manufacturing Unit',
  'Godown', 'Factory Space', 'Logistics Hub', 'Distribution Center', 'Farm land'
];

const AMENITIES = ['Parking', 'Security', 'CCTV'];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Puducherry'
];

const ROAD_CONNECTIVITY = [
  'National Highway', 'State Highway', 'City Road',
  'Main Road', 'Interior Road', 'Service Road', 'Other'
];

const MAX_IMAGES = 10;
const MAX_VIDEOS = 2;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

/* ── Section Header (matches sidebar section labels) ── */
function SectionHeader({
  icon: Icon,
  title,
  optional,
}: {
  icon: React.FC<{ className?: string }>;
  title: string;
  optional?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center shrink-0">
        <Icon className="w-[15px] h-[15px] text-muted-foreground" />
      </div>
      <span className="text-[14.5px] font-semibold text-foreground tracking-tight">{title}</span>
      {optional && (
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/60 ml-1">Optional</span>
      )}
    </div>
  );
}

/* ── Field Error ── */
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-[12px] text-destructive flex items-center gap-1 mt-1">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />{message}
    </p>
  );
}

/* ── Required mark ── */
function Req() {
  return <span className="text-muted-foreground ml-0.5">*</span>;
}

export default function WarehouseUploadForm() {
  const [formData, setFormData] = useState<WarehouseFormData>({
    title: '', description: '', propertyType: '', totalArea: '',
    sizeUnit: 'sqft', availableFrom: '', listingType: 'rent',
    pricePerSqFt: '', totalPrice: '', address: '', city: '', state: '',
    pincode: '', roadConnectivity: '', contactPersonName: '',
    contactPersonPhone: '', contactPersonEmail: '',
    latitude: '', longitude: '', amenities: [], images: [], videos: [],
  });

  const [uploading, setUploading]           = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreviews, setImagePreviews]   = useState<string[]>([]);
  const [videoPreviews, setVideoPreviews]   = useState<string[]>([]);
  const [showMap, setShowMap]               = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageToDelete, setImageToDelete]   = useState<number | null>(null);
  const [fieldErrors, setFieldErrors]       = useState<FieldErrors>({});
  const [touchedFields, setTouchedFields]   = useState<Set<string>>(new Set());

  const validateField = (name: string, value: any): string | undefined => {
    switch (name) {
      case 'title':
        if (!value?.trim()) return 'Property title is required';
        if (value.length < 5) return 'Title must be at least 5 characters';
        break;
      case 'propertyType':
        if (!value) return 'Property type is required';
        break;
      case 'totalArea':
        if (!value) return 'Total area is required';
        if (parseFloat(value) <= 0) return 'Must be greater than 0';
        break;
      case 'availableFrom':
        if (!value) return 'Available from date is required';
        break;
      case 'pricePerSqFt':
        if (!value) return 'Price per sq.ft is required';
        if (parseFloat(value) <= 0) return 'Must be greater than 0';
        break;
      case 'address':
        if (!value?.trim()) return 'Address is required';
        break;
      case 'city':
        if (!value?.trim()) return 'City is required';
        break;
      case 'state':
        if (!value) return 'State is required';
        break;
      case 'pincode':
        if (value && (!/^\d+$/.test(value) || value.length !== 6))
          return 'Must be exactly 6 digits';
        break;
      case 'contactPersonPhone':
        if (value && !/^[6-9]\d{9}$/.test(value.replace(/\s/g, '')))
          return 'Enter a valid 10-digit mobile number';
        break;
      case 'contactPersonEmail':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return 'Enter a valid email address';
        break;
      case 'images':
        if (!formData.images?.length) return 'At least one image is required';
        break;
    }
  };

  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setTouchedFields(prev => new Set(prev).add(name));
    setFieldErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleFieldBlur = (name: string) => {
    setTouchedFields(prev => new Set(prev).add(name));
    setFieldErrors(prev => ({ ...prev, [name]: validateField(name, formData[name as keyof WarehouseFormData]) }));
  };

  const handleAddressChange = (value: string) => {
    handleFieldChange('address', value);
    if (value.length >= 5 && !showMap) setShowMap(true);
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setTouchedFields(prev => new Set(prev).add('images'));
    if (formData.images.length + files.length > MAX_IMAGES) {
      setFieldErrors(prev => ({ ...prev, images: `Max ${MAX_IMAGES} images. You can add ${MAX_IMAGES - formData.images.length} more.` }));
      return;
    }
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (files.some(f => !allowed.includes(f.type.toLowerCase()))) {
      setFieldErrors(prev => ({ ...prev, images: 'Only JPG, PNG, WEBP, GIF allowed' }));
      return;
    }
    if (files.some(f => f.size > MAX_IMAGE_SIZE)) {
      setFieldErrors(prev => ({ ...prev, images: 'Some images exceed 5MB limit' }));
      return;
    }
    setImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    setFormData(prev => ({ ...prev, images: [...prev.images, ...files] }));
    setFieldErrors(prev => ({ ...prev, images: undefined }));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setTouchedFields(prev => new Set(prev).add('videos'));
    if (formData.videos.length + files.length > MAX_VIDEOS) {
      setFieldErrors(prev => ({ ...prev, videos: `Max ${MAX_VIDEOS} videos allowed.` }));
      return;
    }
    if (files.some(f => !f.type.startsWith('video/'))) {
      setFieldErrors(prev => ({ ...prev, videos: 'Only video files allowed' }));
      return;
    }
    if (files.some(f => f.size > MAX_VIDEO_SIZE)) {
      setFieldErrors(prev => ({ ...prev, videos: 'Some videos exceed 100MB limit' }));
      return;
    }
    setVideoPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    setFormData(prev => ({ ...prev, videos: [...prev.videos, ...files] }));
    setFieldErrors(prev => ({ ...prev, videos: undefined }));
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    const updated = formData.images.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, images: updated }));
    setImageToDelete(null);
    setTouchedFields(prev => new Set(prev).add('images'));
    setFieldErrors(prev => ({ ...prev, images: updated.length === 0 ? 'At least one image is required' : undefined }));
  };

  const removeVideo = (index: number) => {
    URL.revokeObjectURL(videoPreviews[index]);
    setVideoPreviews(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({ ...prev, videos: prev.videos.filter((_, i) => i !== index) }));
  };

  const openGallery  = (i: number) => { setSelectedImageIndex(i); setShowImageGallery(true); };
  const goToNext     = () => setSelectedImageIndex(p => (p + 1) % imagePreviews.length);
  const goToPrev     = () => setSelectedImageIndex(p => (p - 1 + imagePreviews.length) % imagePreviews.length);

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    ['title','propertyType','totalArea','availableFrom','pricePerSqFt','address','city','state'].forEach(f => {
      const e = validateField(f, formData[f as keyof WarehouseFormData]);
      if (e) errors[f as keyof FieldErrors] = e;
    });
    ['pincode','contactPersonPhone','contactPersonEmail'].forEach(f => {
      const v = formData[f as keyof WarehouseFormData];
      if (v) { const e = validateField(f, v); if (e) errors[f as keyof FieldErrors] = e; }
    });
    const ie = validateField('images', formData.images);
    if (ie) errors.images = ie;
    setFieldErrors(errors);
    setTouchedFields(new Set(['title','propertyType','totalArea','availableFrom','pricePerSqFt','address','city','state','pincode','contactPersonPhone','contactPersonEmail','images']));
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      document.querySelector('[data-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (k === 'images') formData.images.forEach(f => fd.append('images', f));
        else if (k === 'videos') formData.videos.forEach(f => fd.append('videos', f));
        else if (k === 'amenities') fd.append('amenities', JSON.stringify(v));
        else fd.append(k, v.toString());
      });
      const interval = setInterval(() => setUploadProgress(p => p >= 90 ? p : p + 10), 300);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      clearInterval(interval);
      setUploadProgress(100);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      toast.success('Property listed successfully!', { description: 'Submitted for review.' });
      setTimeout(() => { window.location.href = '/property'; }, 2000);
    } catch (err) {
      toast.error('Upload failed', { description: err instanceof Error ? err.message : 'Please try again.' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const visibleCount    = 3;
  const remainingImages = imagePreviews.length - visibleCount;

  return (
    <div className="min-h-screen bg-background py-8 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link href="/mylistings" className="hover:text-foreground transition-colors">My Listings</Link>
          <span>/</span>
          <span className="text-foreground font-medium">Add Property</span>
        </div>

        {/* ── Page Header ── */}
        <div>
          <h1 className="text-[22px] font-semibold text-foreground tracking-tight">Add New Property</h1>
          <p className="text-[13.5px] text-muted-foreground mt-0.5">
            Fill in the details below to list your property. High-quality photos increase visibility.
          </p>
        </div>

        {/* ── Upload Progress ── */}
        {uploading && (
          <Card className="border-border shadow-none">
            <CardContent className="pt-4 pb-4 px-5">
              <div className="flex items-center justify-between text-[13px] mb-2">
                <span className="font-medium text-foreground">Uploading property…</span>
                <span className="text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1.5" />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left Column ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Basic Information */}
            <Card className="border-border bg-card shadow-none">
              <CardHeader className="pb-4 border-b border-border px-5 pt-5">
                <SectionHeader icon={FileText} title="Basic Information" />
              </CardHeader>
              <CardContent className="px-5 pt-5 pb-5 space-y-4">

                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-[12.5px] font-medium text-muted-foreground">
                    Property Title<Req />
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={e => handleFieldChange('title', e.target.value)}
                    onBlur={() => handleFieldBlur('title')}
                    placeholder="e.g., Green Valley Warehousing Complex"
                    className={cn('h-9 text-[13.5px]', touchedFields.has('title') && fieldErrors.title && 'border-destructive')}
                  />
                  {touchedFields.has('title') && <FieldError message={fieldErrors.title} />}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="propertyType" className="text-[12.5px] font-medium text-muted-foreground">
                      Property Type<Req />
                    </Label>
                    <Select value={formData.propertyType} onValueChange={v => handleFieldChange('propertyType', v)}>
                      <SelectTrigger id="propertyType" className={cn('h-9 text-[13px]', touchedFields.has('propertyType') && fieldErrors.propertyType && 'border-destructive')}>
                        <SelectValue placeholder="Select type…" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {touchedFields.has('propertyType') && <FieldError message={fieldErrors.propertyType} />}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="totalArea" className="text-[12.5px] font-medium text-muted-foreground">
                      Total Area<Req />
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="totalArea"
                        type="number"
                        min="0"
                        value={formData.totalArea}
                        onChange={e => handleFieldChange('totalArea', e.target.value)}
                        onBlur={() => handleFieldBlur('totalArea')}
                        placeholder="0"
                        className={cn('h-9 text-[13.5px] flex-1', touchedFields.has('totalArea') && fieldErrors.totalArea && 'border-destructive')}
                      />
                      <Select value={formData.sizeUnit} onValueChange={(v: 'sqft' | 'sqm') => setFormData(p => ({ ...p, sizeUnit: v }))}>
                        <SelectTrigger className="w-24 h-9 text-[13px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sqft">Sq.ft</SelectItem>
                          <SelectItem value="sqm">Sq.m</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {touchedFields.has('totalArea') && <FieldError message={fieldErrors.totalArea} />}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-[12.5px] font-medium text-muted-foreground">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    rows={3}
                    placeholder="Describe the property in detail…"
                    className="text-[13.5px] resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Availability & Pricing */}
            <Card className="border-border bg-card shadow-none">
              <CardHeader className="pb-4 border-b border-border px-5 pt-5">
                <SectionHeader icon={IndianRupee} title="Availability & Pricing" />
              </CardHeader>
              <CardContent className="px-5 pt-5 pb-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="availableFrom" className="text-[12.5px] font-medium text-muted-foreground">
                      Available From<Req />
                    </Label>
                    <Input
                      id="availableFrom"
                      type="date"
                      min={today}
                      value={formData.availableFrom}
                      onChange={e => handleFieldChange('availableFrom', e.target.value)}
                      onBlur={() => handleFieldBlur('availableFrom')}
                      className={cn('h-9 text-[13.5px]', touchedFields.has('availableFrom') && fieldErrors.availableFrom && 'border-destructive')}
                    />
                    {touchedFields.has('availableFrom') && <FieldError message={fieldErrors.availableFrom} />}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="listingType" className="text-[12.5px] font-medium text-muted-foreground">
                      Listing Type<Req />
                    </Label>
                    <Select value={formData.listingType} onValueChange={(v: 'sale' | 'rent' | 'lease') => setFormData(p => ({ ...p, listingType: v }))}>
                      <SelectTrigger id="listingType" className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rent">For Rent</SelectItem>
                        <SelectItem value="sale">For Sale</SelectItem>
                        <SelectItem value="lease">For Lease</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pricePerSqFt" className="text-[12.5px] font-medium text-muted-foreground">
                      Price per Sq.ft<Req />
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground font-medium">₹</span>
                      <Input
                        id="pricePerSqFt"
                        type="number"
                        min="0"
                        value={formData.pricePerSqFt}
                        onChange={e => handleFieldChange('pricePerSqFt', e.target.value)}
                        onBlur={() => handleFieldBlur('pricePerSqFt')}
                        className={cn('h-9 pl-7 text-[13.5px]', touchedFields.has('pricePerSqFt') && fieldErrors.pricePerSqFt && 'border-destructive')}
                        placeholder="0.00"
                      />
                    </div>
                    {touchedFields.has('pricePerSqFt') && <FieldError message={fieldErrors.pricePerSqFt} />}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="totalPrice" className="text-[12.5px] font-medium text-muted-foreground">Total Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground font-medium">₹</span>
                      <Input
                        id="totalPrice"
                        type="number"
                        min="0"
                        value={formData.totalPrice}
                        onChange={e => setFormData(p => ({ ...p, totalPrice: e.target.value }))}
                        className="h-9 pl-7 text-[13.5px]"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location Details */}
            <Card className="border-border bg-card shadow-none">
              <CardHeader className="pb-4 border-b border-border px-5 pt-5">
                <SectionHeader icon={MapPin} title="Location Details" />
              </CardHeader>
              <CardContent className="px-5 pt-5 pb-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-[12.5px] font-medium text-muted-foreground">
                    Address<Req />
                  </Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={e => handleAddressChange(e.target.value)}
                    onBlur={() => handleFieldBlur('address')}
                    placeholder="Enter full street address"
                    rows={2}
                    className={cn('text-[13.5px] resize-none', touchedFields.has('address') && fieldErrors.address && 'border-destructive')}
                  />
                  {touchedFields.has('address') && <FieldError message={fieldErrors.address} />}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-[12.5px] font-medium text-muted-foreground">
                      City<Req />
                    </Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={e => handleFieldChange('city', e.target.value)}
                      onBlur={() => handleFieldBlur('city')}
                      placeholder="e.g., Mumbai"
                      className={cn('h-9 text-[13.5px]', touchedFields.has('city') && fieldErrors.city && 'border-destructive')}
                    />
                    {touchedFields.has('city') && <FieldError message={fieldErrors.city} />}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="state" className="text-[12.5px] font-medium text-muted-foreground">
                      State<Req />
                    </Label>
                    <Select value={formData.state} onValueChange={v => handleFieldChange('state', v)}>
                      <SelectTrigger id="state" className={cn('h-9 text-[13px]', touchedFields.has('state') && fieldErrors.state && 'border-destructive')}>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {touchedFields.has('state') && <FieldError message={fieldErrors.state} />}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pincode" className="text-[12.5px] font-medium text-muted-foreground">Pincode</Label>
                    <Input
                      id="pincode"
                      value={formData.pincode}
                      onChange={e => handleFieldChange('pincode', e.target.value)}
                      onBlur={() => handleFieldBlur('pincode')}
                      placeholder="400001"
                      maxLength={6}
                      className={cn('h-9 text-[13.5px]', touchedFields.has('pincode') && fieldErrors.pincode && 'border-destructive')}
                    />
                    {touchedFields.has('pincode') && <FieldError message={fieldErrors.pincode} />}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="roadConnectivity" className="text-[12.5px] font-medium text-muted-foreground">Road Connectivity</Label>
                    <Select value={formData.roadConnectivity} onValueChange={v => setFormData(p => ({ ...p, roadConnectivity: v }))}>
                      <SelectTrigger id="roadConnectivity" className="h-9 text-[13px]">
                        <SelectValue placeholder="Select road type…" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROAD_CONNECTIVITY.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="latitude" className="text-[12.5px] font-medium text-muted-foreground">Latitude</Label>
                    <Input id="latitude" value={formData.latitude}
                      onChange={e => setFormData(p => ({ ...p, latitude: e.target.value }))}
                      placeholder="19.0760" className="h-9 text-[13.5px]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="longitude" className="text-[12.5px] font-medium text-muted-foreground">Longitude</Label>
                    <Input id="longitude" value={formData.longitude}
                      onChange={e => setFormData(p => ({ ...p, longitude: e.target.value }))}
                      placeholder="72.8777" className="h-9 text-[13.5px]" />
                  </div>
                </div>

                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMap(!showMap)}
                    className="h-9 px-4 text-[13px]"
                  >
                    <MapPin className="h-3.5 w-3.5 mr-2" />
                    {showMap ? 'Hide Map' : 'Select on Map'}
                  </Button>

                  {showMap && (
                    <div className="mt-4 p-4 border border-border rounded-lg bg-accent/30">
                      <MapSelector
                        latitude={formData.latitude}
                        longitude={formData.longitude}
                        address={formData.address}
                        city={formData.city}
                        state={formData.state}
                        onLocationSelect={(lat, lng) => setFormData(p => ({ ...p, latitude: lat, longitude: lng }))}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Amenities */}
            <Card className="border-border bg-card shadow-none">
              <CardHeader className="pb-4 border-b border-border px-5 pt-5">
                <SectionHeader icon={Building2} title="Features & Amenities" optional />
              </CardHeader>
              <CardContent className="px-5 pt-5 pb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 mb-3">Select Amenities</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {AMENITIES.map(amenity => (
                    <label
                      key={amenity}
                      htmlFor={amenity}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-md border cursor-pointer transition-colors text-[13px] font-medium select-none',
                        formData.amenities.includes(amenity)
                          ? 'border-foreground/30 bg-accent text-foreground'
                          : 'border-border text-muted-foreground hover:border-foreground/20 hover:bg-accent/50'
                      )}
                    >
                      <Checkbox
                        id={amenity}
                        checked={formData.amenities.includes(amenity)}
                        onCheckedChange={() => toggleAmenity(amenity)}
                        className="shrink-0"
                      />
                      {amenity}
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card className="border-border bg-card shadow-none">
              <CardHeader className="pb-4 border-b border-border px-5 pt-5">
                <SectionHeader icon={User} title="Contact Information" />
              </CardHeader>
              <CardContent className="px-5 pt-5 pb-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="contactName" className="text-[12.5px] font-medium text-muted-foreground">Full Name</Label>
                    <Input
                      id="contactName"
                      value={formData.contactPersonName}
                      onChange={e => setFormData(p => ({ ...p, contactPersonName: e.target.value }))}
                      placeholder="Contact person name"
                      className="h-9 text-[13.5px]"
                    />
                  </div>

            

                  
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="contactPhone" className="text-[12.5px] font-medium text-muted-foreground">Mobile Number</Label>
                    <Input
                      id="contactPhone"
                      type="tel"
                      maxLength={10}
                      value={formData.contactPersonPhone}
                      onChange={e => handleFieldChange('contactPersonPhone', e.target.value)}
                      onBlur={() => handleFieldBlur('contactPersonPhone')}
                      placeholder="9876543210"
                      className={cn('h-9 text-[13.5px]', touchedFields.has('contactPersonPhone') && fieldErrors.contactPersonPhone && 'border-destructive')}
                    />
                    {touchedFields.has('contactPersonPhone') && <FieldError message={fieldErrors.contactPersonPhone} />}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contactEmail" className="text-[12.5px] font-medium text-muted-foreground">Email Address</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={formData.contactPersonEmail}
                      onChange={e => handleFieldChange('contactPersonEmail', e.target.value)}
                      onBlur={() => handleFieldBlur('contactPersonEmail')}
                      placeholder="email@example.com"
                      className={cn('h-9 text-[13.5px]', touchedFields.has('contactPersonEmail') && fieldErrors.contactPersonEmail && 'border-destructive')}
                    />
                    {touchedFields.has('contactPersonEmail') && <FieldError message={fieldErrors.contactPersonEmail} />}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Right Column ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-5">

              {/* Images */}
              <Card className="border-border bg-card shadow-none">
                <CardHeader className="pb-4 border-b border-border px-5 pt-5">
                  <div className="flex items-center justify-between">
                    <SectionHeader icon={ImageIcon} title="Property Images" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/60">Required</span>
                  </div>
                  <CardDescription className="text-[12px] mt-0.5">Up to {MAX_IMAGES} images · max 5MB each</CardDescription>
                </CardHeader>
                <CardContent className="px-5 pt-5 pb-5">
                  {imagePreviews.length === 0 ? (
                    <div>
                      <Label htmlFor="images" className="block cursor-pointer">
                        <div className={cn(
                          'border-2 border-dashed rounded-lg p-8 text-center transition-colors hover:bg-accent/50',
                          touchedFields.has('images') && fieldErrors.images
                            ? 'border-destructive'
                            : 'border-border hover:border-foreground/30'
                        )}>
                          <input id="images" type="file" multiple
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                            onChange={handleImageChange} className="hidden" />
                          <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mx-auto mb-3">
                            <Upload className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <p className="text-[13px] font-semibold text-foreground mb-0.5">Click to upload images</p>
                          <p className="text-[12px] text-muted-foreground">JPG, PNG, WEBP, GIF up to 5MB</p>
                        </div>
                      </Label>
                      {touchedFields.has('images') && <FieldError message={fieldErrors.images} />}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        {imagePreviews.slice(0, visibleCount).map((src, i) => (
                          <div key={i} className="relative group aspect-square">
                            <img src={src} alt={`Preview ${i + 1}`}
                              className="w-full h-full object-cover rounded-md border border-border group-hover:border-foreground/30 transition-colors cursor-pointer"
                              onClick={() => openGallery(i)} />
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); setImageToDelete(i); }}
                              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <div
                              className="absolute inset-0 bg-black/0 group-hover:bg-black/15 rounded-md transition-colors flex items-center justify-center cursor-pointer"
                              onClick={() => openGallery(i)}
                            >
                              <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}

                        {remainingImages > 0 && (
                          <div
                            className="aspect-square bg-accent rounded-md border border-border flex items-center justify-center cursor-pointer hover:border-foreground/30 transition-colors"
                            onClick={() => setShowImageGallery(true)}
                          >
                            <div className="text-center">
                              <p className="text-[16px] font-bold text-foreground">+{remainingImages}</p>
                              <p className="text-[11px] text-muted-foreground">more</p>
                            </div>
                          </div>
                        )}

                        {formData.images.length < MAX_IMAGES && (
                          <Label htmlFor="images-add" className="block cursor-pointer">
                            <div className="aspect-square bg-accent/50 rounded-md border-2 border-dashed border-border flex items-center justify-center hover:border-foreground/30 hover:bg-accent transition-colors">
                              <input id="images-add" type="file" multiple
                                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                                onChange={handleImageChange} className="hidden" />
                              <Plus className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </Label>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-muted-foreground">{formData.images.length}/{MAX_IMAGES} images</span>
                        <Button type="button" variant="ghost" size="sm"
                          onClick={() => setShowImageGallery(true)}
                          className="h-7 px-2 text-[12px] text-muted-foreground hover:text-foreground">
                          View all
                        </Button>
                      </div>
                      {touchedFields.has('images') && <FieldError message={fieldErrors.images} />}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Videos */}
              <Card className="border-border bg-card shadow-none">
                <CardHeader className="pb-4 border-b border-border px-5 pt-5">
                  <SectionHeader icon={Video} title="Property Videos" optional />
                  <CardDescription className="text-[12px] mt-0.5">Up to {MAX_VIDEOS} videos · max 100MB each</CardDescription>
                </CardHeader>
                <CardContent className="px-5 pt-5 pb-5">
                  {formData.videos.length < MAX_VIDEOS && (
                    <Label htmlFor="videos" className="block cursor-pointer mb-3">
                      <div className={cn(
                        'border-2 border-dashed rounded-lg p-6 text-center transition-colors hover:bg-accent/50',
                        touchedFields.has('videos') && fieldErrors.videos ? 'border-destructive' : 'border-border hover:border-foreground/30'
                      )}>
                        <input id="videos" type="file" multiple accept="video/*"
                          onChange={handleVideoChange} className="hidden" />
                        <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mx-auto mb-2">
                          <Video className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-[13px] font-semibold text-foreground mb-0.5">Click to upload</p>
                        <p className="text-[12px] text-muted-foreground">{formData.videos.length}/{MAX_VIDEOS} videos</p>
                      </div>
                    </Label>
                  )}
                  {touchedFields.has('videos') && <FieldError message={fieldErrors.videos} />}

                  {videoPreviews.length > 0 && (
                    <div className="space-y-2 mt-1">
                      {videoPreviews.map((src, i) => (
                        <div key={i} className="relative group">
                          <video src={src} className="w-full h-28 object-cover rounded-md border border-border" controls />
                          <button type="button" onClick={() => removeVideo(i)}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
                            <X className="h-3 w-3" />
                          </button>
                          <span className="absolute bottom-2 left-2 bg-background/80 text-foreground text-[11px] px-1.5 py-0.5 rounded border border-border backdrop-blur-sm">
                            {(formData.videos[i].size / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className="border-border bg-card shadow-none">
                <CardHeader className="pb-4 border-b border-border px-5 pt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">Quick Summary</p>
                </CardHeader>
                <CardContent className="px-5 pt-4 pb-5">
                  <div className="space-y-0">
                    {[
                      ['Property Type', formData.propertyType || '—'],
                      ['Total Area',    formData.totalArea ? `${formData.totalArea} ${formData.sizeUnit}` : '—'],
                      ['Listing Type',  formData.listingType ? formData.listingType.charAt(0).toUpperCase() + formData.listingType.slice(1) : '—'],
                      ['Media',         `${formData.images.length} images, ${formData.videos.length} videos`],
                      ['Location',      formData.latitude && formData.longitude ? 'Set ✓' : '—'],
                    ].map(([label, value], i, arr) => (
                      <div key={label} className={cn('flex items-center justify-between py-2.5', i < arr.length - 1 && 'border-b border-border')}>
                        <span className="text-[12.5px] text-muted-foreground">{label}</span>
                        <span className="text-[12.5px] font-semibold text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="space-y-2">
                <Button onClick={handleSubmit} disabled={uploading} className="w-full h-10 text-[13.5px] font-semibold">
                  {uploading ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2" />Submitting…</>
                  ) : (
                    <><CheckCircle className="h-4 w-4 mr-2" />Submit Listing</>
                  )}
                </Button>
                <Button type="button" variant="outline" disabled={uploading}
                  className="w-full h-10 text-[13.5px]">
                  Cancel
                </Button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── Image Gallery Modal ── */}
      <Dialog open={showImageGallery} onOpenChange={setShowImageGallery}>
        <DialogContent className="max-w-4xl max-h-[92vh] p-0 gap-0 overflow-hidden border-border bg-card">
          <DialogHeader className="px-5 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-[15px] font-semibold">Property Images</DialogTitle>
              <DialogDescription className="text-[12.5px] text-muted-foreground">
                {selectedImageIndex + 1} of {imagePreviews.length}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="p-5 overflow-y-auto">
            <div className="group relative w-full bg-muted rounded-lg overflow-hidden flex items-center justify-center">
              <div className="w-full flex items-center justify-center" style={{ height: 'clamp(300px, 60vh, 700px)' }}>
                <img
                  src={imagePreviews[selectedImageIndex]}
                  alt={`Property ${selectedImageIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              {imagePreviews.length > 1 && (
                <>
                  <Button type="button" size="icon" variant="secondary"
                    onClick={goToPrev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button type="button" size="icon" variant="secondary"
                    onClick={goToNext}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>

            {imagePreviews.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {imagePreviews.map((src, i) => (
                  <button key={i} onClick={() => setSelectedImageIndex(i)}
                    className={cn(
                      'shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all',
                      i === selectedImageIndex ? 'border-foreground scale-105' : 'border-border hover:border-foreground/40'
                    )}>
                    <img src={src} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={imageToDelete !== null} onOpenChange={() => setImageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold">Remove Image?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              This image will be removed from your listing. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9 text-[13px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (imageToDelete !== null) removeImage(imageToDelete); }}
              className="h-9 text-[13px]"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}