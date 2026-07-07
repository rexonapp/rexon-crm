'use client'
import { useEffect, useRef, useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle, MapPin, Building2, User, IndianRupee, FileText, Image as ImageIcon, Video, Plus, Eye, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import MapSelector from './MapSelector';
import { useRouter } from 'next/navigation';

interface WarehouseFormData {
  title: string;
  description: string;
  propertyType: string;
  totalArea: string;
  sizeUnit: 'sqft' | 'sqm';
  availableFrom: string;
  listingType: 'sale' | 'rent';
  pricePerSqFt: string;
  totalPrice: string;
  address: string;
  city: string;
  state: {
    name: string;
    code: string;
  };
  pincode: string;
  roadConnectivity: string;
  contactPersonName: string;
  contactPersonPhone: string;
  contactPersonEmail: string;
  contactPersonDesignation: string;
  latitude: string;
  longitude: string;
  contactPersonAlternatePhone: string;
  isPriceNegotiable: boolean;
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
  state?: {
    name?: string;
    code?: string;
  };
  pincode?: string;
  contactPersonPhone?: string;
  contactPersonAlternatePhone?: string;
  contactPersonEmail?: string;
  images?: string;
  videos?: string;
}
const PROPERTY_TYPES = [
  { label: 'Warehouse', value: 'warehouse' },
  // { label: 'Cold Storage', value: 'cold_storage' },
  // { label: 'Industrial Shed', value: 'industrial_shed' },/
  // { label: 'Manufacturing Unit', value: 'manufacturing_unit' },
  // { label: 'Godown', value: 'godown' },
  // { label: 'Factory Space', value: 'factory_space' },
  // { label: 'Logistics Hub', value: 'logistics_hub' },
  // { label: 'Distribution Center', value: 'distribution_center' },
  { label: 'Farm Land', value: 'Farm Land' },
  // { label: 'Commercial Space', value: 'Commercial Space' },
];

const AMENITIES = [
  'Parking',
  'Security',
  'CCTV'
];

// const INDIAN_STATES = [
//   'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
//   'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
//   'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
//   'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
//   'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
//   'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Puducherry'
// ];

const INDIAN_STATES: { name: string; code: string }[] = [
  { name: "Andhra Pradesh", code: "AP" },
  { name: "Arunachal Pradesh", code: "AR" },
  { name: "Assam", code: "AS" },
  { name: "Bihar", code: "BR" },
  { name: "Chhattisgarh", code: "CG" },
  { name: "Goa", code: "GA" },
  { name: "Gujarat", code: "GJ" },
  { name: "Haryana", code: "HR" },
  { name: "Himachal Pradesh", code: "HP" },
  { name: "Jharkhand", code: "JH" },
  { name: "Karnataka", code: "KA" },
  { name: "Kerala", code: "KL" },
  { name: "Madhya Pradesh", code: "MP" },
  { name: "Maharashtra", code: "MH" },
  { name: "Manipur", code: "MN" },
  { name: "Meghalaya", code: "ML" },
  { name: "Mizoram", code: "MZ" },
  { name: "Nagaland", code: "NL" },
  { name: "Odisha", code: "OR" },
  { name: "Punjab", code: "PB" },
  { name: "Rajasthan", code: "RJ" },
  { name: "Sikkim", code: "SK" },
  { name: "Tamil Nadu", code: "TN" },
  { name: "Telangana", code: "TG" },
  { name: "Tripura", code: "TR" },
  { name: "Uttar Pradesh", code: "UP" },
  { name: "Uttarakhand", code: "UK" },
  { name: "West Bengal", code: "WB" },
  { name: "Delhi", code: "DL" },
  { name: "Puducherry", code: "PY" },
];

const ROAD_CONNECTIVITY = [
  'National Highway',
  'State Highway',
  'City Road',
  'Main Road',
  'Interior Road',
  'Service Road',
  'Other'
];

const MAX_IMAGES = 10;
const MAX_VIDEOS = 2;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

export default function WarehouseUploadForm() {
  const [formData, setFormData] = useState<WarehouseFormData>({
    title: '',
    description: '',
    propertyType: '',
    totalArea: '',
    sizeUnit: 'sqft',
    availableFrom: '',
    listingType: 'rent',
    pricePerSqFt: '',
    totalPrice: '',
    address: '',
    city: '',
    state: {
      name: '',
      code: '',
    },
    pincode: '',
    roadConnectivity: '',
    contactPersonName: '',
    contactPersonPhone: '',
    contactPersonEmail: '',
    contactPersonDesignation: '',
    contactPersonAlternatePhone: '',
    isPriceNegotiable: false,
    latitude: '',
    longitude: '',
    amenities: [],
    images: [],
    videos: [],
  });

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageToDelete, setImageToDelete] = useState<number | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const router = useRouter();
  const [stateOpen, setStateOpen] = useState(false);
  const [filteredCities, setFilteredCities] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<any>(null);
  const [isTotalPriceManuallyEdited, setIsTotalPriceManuallyEdited] = useState(false);

  const validateField = (name: string, value: any): string | undefined => {
    switch (name) {
      case 'title':
        if (!value || value.trim() === '') return 'Property title is required';
        if (value.length < 5) return 'Title must be at least 5 characters';
        break;
      case 'propertyType':
        if (!value) return 'Property type is required';
        break;
      case 'totalArea':
        if (!value || value === '') return 'Total area is required';
        if (parseFloat(value) <= 0) return 'Total area must be greater than 0';
        break;
      case 'availableFrom':
        if (!value) return 'Available from date is required';
        break;
      case 'pricePerSqFt':
        if (!value || value === '') return 'Price per sq.ft is required';
        if (parseFloat(value) <= 0) return 'Price must be greater than 0';
        break;
      case 'city':
        if (!value || value.trim() === '') return 'City is required';
        break;
      case 'state':
        if (!value) return 'State is required';
        break;
      case 'pincode':
        if (value) {
          if (!/^\d+$/.test(value)) return 'Pincode must contain only numbers';
          if (value.length !== 6) return 'Pincode must be exactly 6 digits';
        }
        break;
      case 'contactPersonPhone':
        if (value && !/^[6-9]\d{9}$/.test(value.replace(/\s/g, ''))) {
          return 'Enter a valid 10-digit mobile number starting with 6-9';
        }
        break;
      case 'contactPersonAlternatePhone':
          if (value && !/^[6-9]\d{9}$/.test(value.replace(/\s/g, ''))) {
            return 'Enter a valid 10-digit mobile number starting with 6-9';
          }
          break;
      case 'contactPersonEmail':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Enter a valid email address';
        }
        break;
      case 'images':
        if (!formData.images || formData.images.length === 0) {
          return 'At least one property image is required';
        }
        break;
    }
    return undefined;
  };

  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setTouchedFields(prev => new Set(prev).add(name));
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleFieldBlur = (name: string) => {
    setTouchedFields(prev => new Set(prev).add(name));
    const error = validateField(name, formData[name as keyof WarehouseFormData]);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleAddressChange = (value: string) => {
    handleFieldChange('address', value);
    if (value.length >= 5 && !showMap) {
      setShowMap(true);
    }
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
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setFieldErrors(prev => ({ ...prev, images: undefined }));
    setTouchedFields(prev => new Set(prev).add('images'));

    if (formData.images.length + files.length > MAX_IMAGES) {
      setFieldErrors(prev => ({
        ...prev,
        images: `Maximum ${MAX_IMAGES} images allowed. You can add ${MAX_IMAGES - formData.images.length} more.`
      }));
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const imageFiles = files.filter(file => allowedTypes.includes(file.type.toLowerCase()));

    if (imageFiles.length !== files.length) {
      setFieldErrors(prev => ({ ...prev, images: 'Only image files are allowed (JPG, JPEG, PNG, WEBP, GIF)' }));
      return;
    }

    if (imageFiles.some(file => file.size > MAX_IMAGE_SIZE)) {
      setFieldErrors(prev => ({ ...prev, images: 'Some images exceed 5MB limit' }));
      return;
    }

    const previews = imageFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...previews]);
    setFormData(prev => ({ ...prev, images: [...prev.images, ...imageFiles] }));
    setFieldErrors(prev => ({ ...prev, images: undefined }));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setFieldErrors(prev => ({ ...prev, videos: undefined }));
    setTouchedFields(prev => new Set(prev).add('videos'));

    if (formData.videos.length + files.length > MAX_VIDEOS) {
      setFieldErrors(prev => ({
        ...prev,
        videos: `Maximum ${MAX_VIDEOS} videos allowed. You can add ${MAX_VIDEOS - formData.videos.length} more.`
      }));
      return;
    }

    const videoFiles = files.filter(file => file.type.startsWith('video/'));

    if (videoFiles.length !== files.length) {
      setFieldErrors(prev => ({ ...prev, videos: 'Only video files are allowed' }));
      return;
    }

    if (videoFiles.some(file => file.size > MAX_VIDEO_SIZE)) {
      setFieldErrors(prev => ({ ...prev, videos: 'Some videos exceed 100MB limit' }));
      return;
    }

    const previews = videoFiles.map(file => URL.createObjectURL(file));
    setVideoPreviews(prev => [...prev, ...previews]);
    setFormData(prev => ({ ...prev, videos: [...prev.videos, ...videoFiles] }));
    setFieldErrors(prev => ({ ...prev, videos: undefined }));
  };

  const confirmDeleteImage = (index: number) => setImageToDelete(index);

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    const updatedImages = formData.images.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, images: updatedImages }));
    setImageToDelete(null);
    setTouchedFields(prev => new Set(prev).add('images'));
    setFieldErrors(prev => ({
      ...prev,
      images: updatedImages.length === 0 ? 'At least one property image is required' : undefined
    }));
  };

  const removeVideo = (index: number) => {
    URL.revokeObjectURL(videoPreviews[index]);
    setVideoPreviews(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({ ...prev, videos: prev.videos.filter((_, i) => i !== index) }));
  };

  const openGallery = (index: number) => {
    setSelectedImageIndex(index);
    setShowImageGallery(true);
  };

  const goToNextImage = () => setSelectedImageIndex(prev => (prev + 1) % imagePreviews.length);
  const goToPreviousImage = () => setSelectedImageIndex(prev => (prev - 1 + imagePreviews.length) % imagePreviews.length);

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    const requiredFields = ['title', 'propertyType', 'totalArea', 'availableFrom', 'pricePerSqFt', 'address', 'city', 'state'];

    requiredFields.forEach(field => {
      const error = validateField(field, formData[field as keyof WarehouseFormData]);
      if (error) errors[field as keyof FieldErrors] = error;
    });

    if (formData.pincode) {
      const error = validateField('pincode', formData.pincode);
      if (error) errors.pincode = error;
    }
    if (formData.contactPersonPhone) {
      const error = validateField('contactPersonPhone', formData.contactPersonPhone);
      if (error) errors.contactPersonPhone = error;
    }
    if (formData.contactPersonEmail) {
      const error = validateField('contactPersonEmail', formData.contactPersonEmail);
      if (error) errors.contactPersonEmail = error;
    }

    const imageError = validateField('images', formData.images);
    if (imageError) errors.images = imageError;

    setFieldErrors(errors);
    setTouchedFields(new Set([...requiredFields, 'pincode', 'contactPersonPhone', 'contactPersonEmail', 'images']));

    return Object.keys(errors).length === 0;
  };

  const handleLocationSelect = (lat: string, lng: string) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly');
      document.querySelector('.border-red-500')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
  
    setUploading(true);
    setUploadProgress(0);
  
    try {
      // Step 1: Get presigned URLs from Vercel (tiny JSON request — no file bytes)
      const filesMeta = [
        ...formData.images.map(f => ({ filename: f.name, mimetype: f.type, fieldname: 'images' })),
        ...formData.videos.map(f => ({ filename: f.name, mimetype: f.type, fieldname: 'videos' })),
      ];
  
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filesMeta }),
      });
      if (!presignRes.ok) {
        const err = await presignRes.json();
        throw new Error(err.error || 'Failed to get upload URLs');
      }
      const { presignedUrls } = await presignRes.json();
      setUploadProgress(10);
  
      // Step 2: Upload each file DIRECTLY to S3 (bypasses Vercel entirely)
      const allFiles = [...formData.images, ...formData.videos];
      const uploadedFiles: any[] = [];
  
      for (let i = 0; i < presignedUrls.length; i++) {
        const { presignedUrl, s3Key, s3Url, fieldname, filename, mimetype } = presignedUrls[i];
        const file = allFiles[i];
  
        const uploadRes = await fetch(presignedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
  
        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          throw new Error(`Failed to upload ${file.name}: ${uploadRes.status} ${errText}`);
        }  
        uploadedFiles.push({ s3Key, s3Url, fieldname, filename, mimetype, size: file.size });
  
        // Progress: 10% to 85% during uploads
        setUploadProgress(10 + Math.round(((i + 1) / presignedUrls.length) * 75));
      }
  
      setUploadProgress(90);
  
      // Step 3: Send metadata + s3Keys to Vercel (tiny JSON — no file bytes)
      const metaRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          propertyType: formData.propertyType,
          totalArea: formData.totalArea,
          sizeUnit: formData.sizeUnit,
          availableFrom: formData.availableFrom,
          listingType: formData.listingType,
          pricePerSqFt: formData.pricePerSqFt,
          totalPrice: formData.totalPrice,
          address: formData.address,
          city: formData.city,
          state: formData.state.name,
          state_code: formData.state.code,
          pincode: formData.pincode,
          roadConnectivity: formData.roadConnectivity,
          latitude: formData.latitude,
          longitude: formData.longitude,
          contactPersonName: formData.contactPersonName,
          contactPersonPhone: formData.contactPersonPhone,
          contactPersonAlternatePhone: formData.contactPersonAlternatePhone,
          isPriceNegotiable: formData.isPriceNegotiable,
          contactPersonEmail: formData.contactPersonEmail,
          contactPersonDesignation: formData.contactPersonDesignation,
          amenities: formData.amenities,
          uploadedFiles,
        }),
      });
  
      setUploadProgress(100);
      const data = await metaRes.json();
      if (!metaRes.ok) throw new Error(data.error || 'Failed to save listing');
  
      toast.success('Property listed successfully!', {
        description: 'Your property has been submitted for review.',
      });
      setTimeout(() => { window.location.href = '/property'; }, 2000);
  
    } catch (error) {
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const visibleImageCount = 3;
  const remainingImages = imagePreviews.length - visibleImageCount;

  // Helper: error border class
  const errBorder = (field: keyof FieldErrors) =>
    touchedFields.has(field) && fieldErrors[field]
      ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-1 focus-visible:ring-red-500'
      : 'border-input focus-visible:border-brand-secondary focus-visible:ring-1 focus-visible:ring-brand-secondary';

  // Helper: inline error message
  const ErrMsg = ({ field }: { field: keyof FieldErrors }) => {
    const err = fieldErrors[field];

    if (!touchedFields.has(field)) return null;
    if (!err || typeof err !== "string") return null;

    return (
      <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {err}
      </p>
    );
  };
  useEffect(() => {
    if (isTotalPriceManuallyEdited) return;
    const area = parseFloat(formData.totalArea);
    const price = parseFloat(formData.pricePerSqFt);
    if (!isNaN(area) && !isNaN(price) && area > 0 && price > 0) {
      setFormData(prev => ({ ...prev, totalPrice: (area * price).toFixed(2) }));
    } else {
      setFormData(prev => ({ ...prev, totalPrice: '' }));
    }
  }, [formData.totalArea, formData.pricePerSqFt, isTotalPriceManuallyEdited]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-secondary/[0.06] via-background to-muted/30 sm:py-10 py-2 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center text-sm text-muted-foreground mb-4">
            <span>Home</span><span className="mx-2">/</span>
            <span>My Listings</span><span className="mx-2">/</span>
            <span className="text-foreground font-medium">Add New Property</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Add New Property</h1>
          <p className="text-muted-foreground">Fill in the mandatory details below to list your property on Rexon. Adding high-quality photos and videos increases visibility.</p>
        </div>

        {uploading && (
          <Card className="mb-6 border-brand-secondary/35 bg-brand-secondary/10">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-brand-blue-deep">Uploading property...</span>
                  <span className="text-brand-icon-primary font-semibold">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left Column ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Basic Information */}
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-brand-secondary rounded-lg flex items-center justify-center mr-3">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle>Basic Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-semibold">
                    Property Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={e => handleFieldChange('title', e.target.value)}
                    onBlur={() => handleFieldBlur('title')}
                    placeholder="e.g., Green Valley Warehousing Complex"
                    className={errBorder('title')}
                  />
                  <ErrMsg field="title" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Property Type */}
                  <div className="space-y-2 w-full">
                    <Label htmlFor="propertyType" className="text-sm font-semibold">
                      Property Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.propertyType}
                      onValueChange={v => handleFieldChange('propertyType', v)}
                    >
                      <SelectTrigger id="propertyType" className={`w-full h-11 ${errBorder('propertyType')}`}>
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent className="max-w-[calc(100vw-2rem)]">
                        {PROPERTY_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <ErrMsg field="propertyType" />
                  </div>

                  {/* Total Area */}
                  <div className="space-y-2">
                    <Label htmlFor="totalArea" className="text-sm font-semibold">
                      Total Area <span className="text-red-500">*</span>
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
                        className={`flex-1 ${errBorder('totalArea')}`}
                      />
                      <Select value={formData.sizeUnit} onValueChange={(v: 'sqft' | 'sqm') => setFormData({ ...formData, sizeUnit: v })}>
                        <SelectTrigger className="w-28 h-11 border-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sqft">Sq.ft</SelectItem>
                          <SelectItem value="sqm">Sq.m</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <ErrMsg field="totalArea" />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="Provide a detailed description of your property..."
                    className="border-input focus-visible:border-brand-secondary focus-visible:ring-1 focus-visible:ring-brand-secondary resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Availability & Pricing */}
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-brand-secondary rounded-lg flex items-center justify-center mr-3">
                    <IndianRupee className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle>Availability & Pricing</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Available From */}
                  <div className="space-y-2">
                    <Label htmlFor="availableFrom" className="text-sm font-semibold">
                      Available From <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="availableFrom"
                      type="date"
                      min={today}
                      value={formData.availableFrom}
                      onChange={e => handleFieldChange('availableFrom', e.target.value)}
                      onBlur={() => handleFieldBlur('availableFrom')}
                      className={`h-11 w-full ${errBorder('availableFrom')}`}
                    />
                    <ErrMsg field="availableFrom" />
                  </div>

                  {/* Listing Type */}
                  <div className="space-y-2 w-full">
                    <Label htmlFor="listingType" className="text-sm font-semibold">
                      Listing Type <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.listingType} onValueChange={(v: 'sale' | 'rent') => setFormData({ ...formData, listingType: v })}>
                      <SelectTrigger id="listingType" className="h-11 w-full border-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-w-[calc(100vw-2rem)]">
                        <SelectItem value="rent">For Rent</SelectItem>
                        <SelectItem value="sale">For Sale</SelectItem>
                        <SelectItem value="lease">For Lease</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Price per Sq.ft */}
                <div className="space-y-2">
                  <Label htmlFor="pricePerSqFt" className="text-sm font-semibold">
                    Price per Sq.ft <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                    <Input
                      id="pricePerSqFt"
                      type="number"
                      min="0"
                      value={formData.pricePerSqFt}
                      onChange={e => handleFieldChange('pricePerSqFt', e.target.value)}
                      onBlur={() => handleFieldBlur('pricePerSqFt')}
                      className={`pl-8 h-11 ${errBorder('pricePerSqFt')}`}
                      placeholder="0.00"
                    />
                  </div>
                  <ErrMsg field="pricePerSqFt" />
                </div>

                {/* Total Price */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="totalPrice" className="text-sm font-semibold">
                    Total Price
                    <span className="ml-2 text-xs font-normal text-muted-foreground">(Optional)</span>
                  </Label>
                  {isTotalPriceManuallyEdited && formData.totalArea && formData.pricePerSqFt && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsTotalPriceManuallyEdited(false);
                      }}
                      className="text-xs text-brand-icon-primary hover:text-brand-orange-text-hover underline underline-offset-2"
                    >
                      Reset to calculated
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                  <Input
                    id="totalPrice"
                    type="number"
                    min={0}
                    value={formData.totalPrice}
                    onChange={e => {
                      setIsTotalPriceManuallyEdited(true);
                      setFormData({ ...formData, totalPrice: e.target.value });
                    }}
                    className="pl-8 h-11 border-input focus-visible:border-brand-secondary focus-visible:ring-1 focus-visible:ring-brand-secondary"
                    placeholder="Auto-calculated from area × price/sqft"
                  />
                </div>
                {!isTotalPriceManuallyEdited && formData.totalPrice && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-brand-icon-primary" />
                    Auto-calculated: {parseFloat(formData.totalArea).toLocaleString('en-IN')} sqft × ₹{parseFloat(formData.pricePerSqFt).toLocaleString('en-IN')} = ₹{parseFloat(formData.totalPrice).toLocaleString('en-IN')}
                  </p>
                )}
              </div>
                {/* Negotiable Price */}
              <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:border-brand-secondary/40 hover:bg-brand-secondary/5 transition-colors">
                <Checkbox
                  id="isPriceNegotiable"
                  checked={formData.isPriceNegotiable}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isPriceNegotiable: checked as boolean })
                  }
                  className="data-[state=checked]:bg-brand-secondary data-[state=checked]:border-brand-secondary"
                />
                <div>
                  <Label htmlFor="isPriceNegotiable" className="text-sm font-semibold cursor-pointer">
                    Price is Negotiable
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Check this if you're open to price discussions</p>
                </div>
              </div>
              </CardContent>
            </Card>

            {/* Location Details */}
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-brand-secondary rounded-lg flex items-center justify-center mr-3">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle>Location Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-semibold">
                    Address <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={e => handleAddressChange(e.target.value)}
                    onBlur={() => handleFieldBlur('address')}
                    placeholder="Enter full street address"
                    rows={2}
                    className={`resize-none ${errBorder('address')}`}
                  />
                  <ErrMsg field="address" />
                </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* City */}
                    {/* <div className="space-y-2">
                      <Label htmlFor="city" className="text-sm font-semibold">
                        City <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={e => handleFieldChange('city', e.target.value)}
                        onBlur={() => handleFieldBlur('city')}
                        placeholder="e.g., Mumbai"
                        className={`h-11 ${errBorder('city')}`}
                      />
                      <ErrMsg field="city" />
                    </div> */}

                  {/* City */}
               
                   { <div className="space-y-2 relative">
                      <Label htmlFor="city" className="text-sm font-semibold">
                      City <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.city}
                      placeholder="Search city..."
                      onChange={(e) => {
                        const inputValue = e.target.value;

                        handleFieldChange('city', inputValue);

                        if (debounceRef.current) {
                          clearTimeout(debounceRef.current);
                        }

                        if (inputValue.length < 2) {
                          setFilteredCities([]);
                          setShowDropdown(false);
                          return;
                        }

                        debounceRef.current = setTimeout(async () => {
                          try {
                            const res = await fetch(`/api/cities?search=${inputValue}`);
                            const data = await res.json();

                            setFilteredCities(data);
                            setShowDropdown(true);
                          } catch (err) {
                            console.error(err);
                          }
                        }, 300);
                      }}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    />

                    {/* Dropdown */}
                    {showDropdown && filteredCities.length > 0 && (
                      <div className="absolute z-[9999] w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredCities.map((c) => (
                          <div
                            key={c.id}
                            className="px-3 py-2 cursor-pointer hover:bg-brand-secondary/10"
                            onMouseDown={() => {
                              handleFieldChange('city', c.city);
                              handleFieldChange('latitude', c.latitude);
                              handleFieldChange('longitude', c.longitude);
                              setShowDropdown(false);
                            }}
                          >
                            {c.city}
                          </div>
                        ))}
                      </div>
                    )}

                    <ErrMsg field="city" />
                  </div>
                  }

                  <div className="space-y-2 w-full">
                    <Label htmlFor="state" className="text-sm font-semibold">
                      State <span className="text-red-500">*</span>
                    </Label>

                    <Popover open={stateOpen} onOpenChange={setStateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="state"
                          variant="outline"
                          role="combobox"
                          className={cn(
                            'h-11 w-full justify-between font-normal',
                            !formData.state.name && 'text-muted-foreground',
                            touchedFields.has('state') && fieldErrors.state?.name
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                              : 'border-input focus-visible:border-brand-secondary focus-visible:ring-1 focus-visible:ring-brand-secondary'
                          )}
                        >
                          {formData.state.name || 'Select state'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>

                      <PopoverContent
                        className="p-0"
                        align="start"
                        style={{ width: 'var(--radix-popover-trigger-width)' }}
                      >
                        <Command>
                          <CommandInput placeholder="Search state..." />
                          <CommandList>
                            <CommandEmpty>No state found.</CommandEmpty>
                            <CommandGroup className="max-h-60 overflow-y-auto">
                              {INDIAN_STATES.map(state => (
                                <CommandItem
                                  key={state.code}
                                  value={`${state.name}|${state.code}`}
                                  onSelect={val => {
                                    const [name, code] = val.split("|")
                                    handleFieldChange('state', { name, code });
                                    setStateOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      formData.state.name === state.name ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  {state.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    <ErrMsg field="state" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pincode */}
                  <div className="space-y-2">
                    <Label htmlFor="pincode" className="text-sm font-semibold">Pincode</Label>
                    <Input
                      id="pincode"
                      value={formData.pincode}
                      onChange={e => handleFieldChange('pincode', e.target.value)}
                      onBlur={() => handleFieldBlur('pincode')}
                      placeholder="400001"
                      maxLength={6}
                      className={`h-11 ${errBorder('pincode')}`}
                    />
                    <ErrMsg field="pincode" />
                  </div>

                  {/* Road Connectivity */}
                  <div className="space-y-2 w-full">
                    <Label htmlFor="roadConnectivity" className="text-sm font-semibold">Road Connectivity</Label>
                    <Select value={formData.roadConnectivity} onValueChange={v => setFormData({ ...formData, roadConnectivity: v })}>
                      <SelectTrigger id="roadConnectivity" className="h-11 w-full border-input">
                        <SelectValue placeholder="Select road type..." />
                      </SelectTrigger>
                      <SelectContent side="bottom" align="start" className="max-w-[calc(100vw-2rem)]">
                        {ROAD_CONNECTIVITY.map(road => (
                          <SelectItem key={road} value={road}>{road}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Lat / Lng */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude" className="text-sm font-semibold">Latitude</Label>
                    <Input
                      id="latitude"
                      value={formData.latitude}
                      onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="19.0760"
                      className="h-11 border-input focus-visible:border-brand-secondary focus-visible:ring-1 focus-visible:ring-brand-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude" className="text-sm font-semibold">Longitude</Label>
                    <Input
                      id="longitude"
                      value={formData.longitude}
                      onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="72.8777"
                      className="h-11 border-input focus-visible:border-brand-secondary focus-visible:ring-1 focus-visible:ring-brand-secondary"
                    />
                  </div>
                </div>

                {/* Map toggle */}
                <div className="pt-2">
                  <Button type="button" onClick={() => setShowMap(!showMap)} className="bg-brand-secondary hover:bg-brand-secondary-hover h-11 text-white">
                    <MapPin className="h-4 w-4 mr-2" />
                    {showMap ? 'Hide Map' : 'Select Location on Map'}
                  </Button>
                  {showMap && (
                    <div className="mt-4 p-4 border border-border rounded-lg bg-muted/40">
                      <MapSelector
                        latitude={formData.latitude}
                        longitude={formData.longitude}
                        address={formData.address}
                        city={formData.city}
                        state={formData.state.name}
                        onLocationSelect={handleLocationSelect}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Features & Amenities */}
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-brand-secondary rounded-lg flex items-center justify-center mr-3">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle>Features & Amenities</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-brand-secondary/15 text-brand-blue-deep border-0">Optional</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Select Amenities</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                    {AMENITIES.map(amenity => (
                      <div key={amenity} className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:border-brand-secondary/40 hover:bg-brand-secondary/5 transition-colors">
                        <Checkbox
                          id={amenity}
                          checked={formData.amenities.includes(amenity)}
                          onCheckedChange={() => toggleAmenity(amenity)}
                          className="data-[state=checked]:bg-brand-secondary data-[state=checked]:border-brand-secondary"
                        />
                        <Label htmlFor={amenity} className="text-sm font-medium leading-none cursor-pointer flex-1">
                          {amenity}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-brand-secondary rounded-lg flex items-center justify-center mr-3">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle>Contact Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactName" className="text-sm font-semibold">Full Name</Label>
                    <Input
                      id="contactName"
                      value={formData.contactPersonName}
                      onChange={e => setFormData({ ...formData, contactPersonName: e.target.value })}
                      placeholder="Contact person name"
                      className="h-11 border-input focus-visible:border-brand-secondary focus-visible:ring-1 focus-visible:ring-brand-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail" className="text-sm font-semibold">Email Address</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={formData.contactPersonEmail}
                      onChange={e => handleFieldChange('contactPersonEmail', e.target.value)}
                      onBlur={() => handleFieldBlur('contactPersonEmail')}
                      placeholder="email@example.com"
                      className={`h-11 ${errBorder('contactPersonEmail')}`}
                    />
                    <ErrMsg field="contactPersonEmail" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mobile Number */}
              <div className="space-y-2">
                <Label htmlFor="contactPhone" className="text-sm font-semibold">Mobile Number</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  value={formData.contactPersonPhone}
                  onChange={e => handleFieldChange('contactPersonPhone', e.target.value)}
                  onBlur={() => handleFieldBlur('contactPersonPhone')}
                  placeholder="Mobile Number "
                  className={`h-11 ${errBorder('contactPersonPhone')}`}
                />
                <ErrMsg field="contactPersonPhone" />
              </div>

              {/* Alternate Mobile Number */}
              <div className="space-y-2">
                <Label htmlFor="contactAlternatePhone" className="text-sm font-semibold">
                  Alternate Mobile Number
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                  id="contactAlternatePhone"
                  type="tel"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  value={formData.contactPersonAlternatePhone}
                  onChange={e => handleFieldChange('contactPersonAlternatePhone', e.target.value)}
                  onBlur={() => handleFieldBlur('contactPersonAlternatePhone')}
                  placeholder="Alternate Mobile number"
                  className={`h-11 ${errBorder('contactPersonAlternatePhone')}`}
                />
                <ErrMsg field="contactPersonAlternatePhone" />
              </div>
            </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Right Column ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">

              {/* Property Images */}
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ImageIcon className="h-5 w-5 text-brand-icon-primary mr-2" />
                      <CardTitle className="text-lg">Property Images</CardTitle>
                      <span className="text-red-600 mx-3">*</span>
                    </div>
                  </div>
                  <CardDescription className="text-xs">Upload up to {MAX_IMAGES} images (Max 5MB each)</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {imagePreviews.length === 0 ? (
                    <div>
                      <Label htmlFor="images" className="block w-full cursor-pointer">
                        <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${touchedFields.has('images') && fieldErrors.images
                            ? 'border-red-500 bg-red-50'
                            : 'border-dashed border-input hover:border-brand-secondary/60 hover:bg-brand-secondary/5'
                          }`}>
                          <input id="images" type="file" multiple accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" onChange={handleImageChange} className="hidden" />
                          <div className="w-16 h-16 bg-brand-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Upload className="h-8 w-8 text-brand-icon-primary" />
                          </div>
                          <p className="text-sm font-semibold text-foreground mb-1">Click to upload images</p>
                          <p className="text-xs text-muted-foreground">JPG, JPEG, PNG, WEBP, GIF up to 5MB</p>
                        </div>
                      </Label>
                      <ErrMsg field="images" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        {imagePreviews.slice(0, visibleImageCount).map((preview, index) => (
                          <div key={index} className="relative group aspect-square">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg border-2 border-border group-hover:border-brand-secondary/50 transition-all cursor-pointer"
                              onClick={() => openGallery(index)}
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              onClick={e => { e.stopPropagation(); confirmDeleteImage(index); }}
                              className="absolute -top-2 -right-2 z-20 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-white shadow-lg"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <div
                              className="absolute inset-0 z-10 bg-transparent group-hover:bg-brand-blue-deep/15 rounded-lg transition-all flex items-center justify-center cursor-pointer"
                              onClick={() => openGallery(index)}
                            >
                              <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}

                        {remainingImages > 0 && (
                          <div
                            className="relative aspect-square bg-muted/50 rounded-lg border-2 border-dashed border-input flex items-center justify-center cursor-pointer hover:border-brand-secondary/60 transition-all group"
                            onClick={() => setShowImageGallery(true)}
                          >
                            <div className="text-center">
                              <p className="text-2xl font-bold text-muted-foreground group-hover:text-brand-blue-deep">+{remainingImages}</p>
                              <p className="text-xs text-muted-foreground">more</p>
                            </div>
                          </div>
                        )}

                        {formData.images.length < MAX_IMAGES && (
                          <Label htmlFor="images-add" className="block cursor-pointer">
                            <div className="aspect-square bg-muted/30 rounded-lg border-2 border-dashed border-input flex items-center justify-center hover:border-brand-secondary/60 hover:bg-brand-secondary/5 transition-all group">
                              <input id="images-add" type="file" multiple accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" onChange={handleImageChange} className="hidden" />
                              <Plus className="h-8 w-8 text-muted-foreground group-hover:text-brand-icon-primary group-hover:scale-110 transition-transform" />
                            </div>
                          </Label>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/60">
                        <span className="font-medium">{formData.images.length} / {MAX_IMAGES} images</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowImageGallery(true)} className="text-brand-icon-primary hover:text-brand-orange-text-hover h-7">
                          View All
                        </Button>
                      </div>
                      <ErrMsg field="images" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Property Videos */}
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Video className="h-5 w-5 text-brand-icon-primary mr-2" />
                      <CardTitle className="text-lg">Property Videos</CardTitle>
                    </div>
                    <Badge variant="secondary" className="bg-brand-secondary/15 text-brand-blue-deep border-0">Optional</Badge>
                  </div>
                  <CardDescription className="text-xs">Upload up to {MAX_VIDEOS} videos (Max 100MB each)</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {formData.videos.length < MAX_VIDEOS && (
                    <div className="mb-4">
                      <Label htmlFor="videos" className="block w-full cursor-pointer">
                        <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${touchedFields.has('videos') && fieldErrors.videos
                            ? 'border-red-500 bg-red-50'
                            : 'border-dashed border-input hover:border-brand-secondary/60 hover:bg-brand-secondary/5'
                          }`}>
                          <input id="videos" type="file" multiple accept="video/*" onChange={handleVideoChange} className="hidden" />
                          <div className="w-12 h-12 bg-brand-secondary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Video className="h-6 w-6 text-brand-icon-primary" />
                          </div>
                          <p className="text-sm font-medium text-foreground mb-1">Click to upload</p>
                          <p className="text-xs text-muted-foreground">{formData.videos.length}/{MAX_VIDEOS} videos</p>
                        </div>
                      </Label>
                      <ErrMsg field="videos" />
                    </div>
                  )}

                  {videoPreviews.length > 0 && (
                    <div className="space-y-3">
                      {videoPreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <video
                            src={preview}
                            className="w-full h-32 object-cover rounded-lg border-2 border-border group-hover:border-brand-secondary/50 transition-all"
                            controls
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            onClick={() => removeVideo(index)}
                            className="absolute -top-2 -right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 shadow-lg"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <div className="absolute bottom-2 left-2 bg-brand-blue-deep/85 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                            {(formData.videos[index].size / (1024 * 1024)).toFixed(1)} MB
                          </div>
                        </div>
                      ))}
                      <ErrMsg field="videos" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Summary */}
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {[
                      { label: 'Property Type', value: formData.propertyType || 'Not selected' },
                      { label: 'Total Area', value: formData.totalArea ? `${formData.totalArea} ${formData.sizeUnit}` : 'Not set' },
                      { label: 'Media Files', value: `${formData.images.length} images, ${formData.videos.length} videos` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">{label}</span>
                        <span className="text-sm font-semibold text-foreground">{value}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">Location</span>
                      <span className="text-sm font-semibold text-foreground">
                        {formData.latitude && formData.longitude ? '✓ Set' : 'Not set'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleSubmit}
                  disabled={uploading}
                  className="w-full bg-[#0f8a94] hover:bg-[#0f8a94] text-white py-6 text-base font-bold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      <span>Submit Listing</span>
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={uploading}
                  className="w-full py-6 bg-[#da7948] hover:bg-[#da7948] text-white"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Gallery Modal */}
      <Dialog open={showImageGallery} onOpenChange={setShowImageGallery}>
        <DialogContent className="max-w-[95vw] sm:max-w-[85vw] md:max-w-3xl lg:max-w-5xl xl:max-w-6xl max-h-[95vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 md:px-6 pt-5 md:pt-6 pb-4 border-b">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold truncate">Property Images</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {selectedImageIndex + 1} of {imagePreviews.length}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="relative p-3 sm:p-4 md:p-6 overflow-y-auto">
            <div className="group relative w-full bg-gradient-to-br from-brand-blue-deep to-brand-secondary-hover rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
              <div className="w-full h-[50vh] sm:h-[55vh] md:h-[60vh] lg:h-[65vh] flex items-center justify-center" style={{ minHeight: '300px', maxHeight: '800px' }}>
                <img
                  src={imagePreviews[selectedImageIndex]}
                  alt={`Property ${selectedImageIndex + 1}`}
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                />
              </div>

              {imagePreviews.length > 1 && (
                <>
                  <Button type="button" size="icon" variant="secondary" onClick={goToPreviousImage}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/95 hover:bg-white shadow-2xl border-2 border-border hover:border-brand-secondary/40 hover:scale-110 transition-all md:opacity-0 md:group-hover:opacity-100">
                    <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 text-brand-blue-deep" />
                  </Button>
                  <Button type="button" size="icon" variant="secondary" onClick={goToNextImage}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/95 hover:bg-white shadow-2xl border-2 border-border hover:border-brand-secondary/40 hover:scale-110 transition-all md:opacity-0 md:group-hover:opacity-100">
                    <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-brand-blue-deep" />
                  </Button>
                  <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 bg-brand-blue-deep/90 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm md:opacity-0 md:group-hover:opacity-100">
                    {selectedImageIndex + 1} / {imagePreviews.length}
                  </div>
                </>
              )}
            </div>

            {imagePreviews.length > 1 && (
              <div className="mt-3 sm:mt-4 md:mt-6">
                <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 px-1">
                  {imagePreviews.map((preview, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg overflow-hidden transition-all ${index === selectedImageIndex
                          ? 'ring-4 ring-brand-secondary scale-105 shadow-lg'
                          : 'ring-2 ring-border hover:ring-brand-secondary/50 hover:scale-105'
                        }`}
                    >
                      <img src={preview} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                      {index === selectedImageIndex && <div className="absolute inset-0 bg-brand-blue-deep/25" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={imageToDelete !== null} onOpenChange={() => setImageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this image? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (imageToDelete !== null) removeImage(imageToDelete); }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}