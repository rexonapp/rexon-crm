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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import MapSelector from './MapSelector';

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
  state: string;
  pincode: string;
  roadConnectivity: string;
  contactPersonName: string;
  contactPersonPhone: string;
  contactPersonEmail: string;
  contactPersonDesignation: string;
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
  'Warehouse',
  'Cold Storage',
  'Industrial Shed',
  'Manufacturing Unit',
  'Godown',
  'Factory Space',
  'Logistics Hub',
  'Distribution Center'
];

const AMENITIES = [
  'Parking',
  'Security',
  'CCTV'
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Puducherry'
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
    state: '',
    pincode: '',
    roadConnectivity: '',
    contactPersonName: '',
    contactPersonPhone: '',
    contactPersonEmail: '',
    contactPersonDesignation: '',
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

  const validateField = (name: string, value: any): string | undefined => {
    switch (name) {
      case 'title':
        if (!value || value.trim() === '') return 'Property title is requiblack';
        if (value.length < 5) return 'Title must be at least 5 characters';
        break;

      case 'propertyType':
        if (!value) return 'Property type is requiblack';
        break;

      case 'totalArea':
        if (!value || value === '') return 'Total area is requiblack';
        if (parseFloat(value) <= 0) return 'Total area must be greater than 0';
        break;

      case 'availableFrom':
        if (!value) return 'Available from date is requiblack';
        break;

      case 'pricePerSqFt':
        if (!value || value === '') return 'Price per sq.ft is requiblack';
        if (parseFloat(value) <= 0) return 'Price must be greater than 0';
        break;

      case 'city':
        if (!value || value.trim() === '') return 'City is requiblack';
        break;

      case 'state':
        if (!value) return 'State is requiblack';
        break;

      case 'pincode':
        if (value) {
          if (!/^\d+$/.test(value)) {
            return 'Pincode must contain only numbers';
          }
          if (value.length !== 6) {
            return 'Pincode must be exactly 6 digits';
          }
        }
        break;

      case 'contactPersonPhone':
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
          return 'At least one property image is requiblack';
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

  // ─── Address change: also trigger map open hint ───────────────────────────────
  const handleAddressChange = (value: string) => {
    handleFieldChange('address', value);
    // Auto-open map when user starts typing an address (only open, never close)
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
      const error = `Maximum ${MAX_IMAGES} images allowed. You can add ${MAX_IMAGES - formData.images.length} more.`;
      setFieldErrors(prev => ({ ...prev, images: error }));
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const imageFiles = files.filter(file => allowedTypes.includes(file.type.toLowerCase()));

    if (imageFiles.length !== files.length) {
      setFieldErrors(prev => ({
        ...prev,
        images: 'Only image files are allowed (JPG, JPEG, PNG, WEBP, GIF)'
      }));
      return;
    }

    const oversized = imageFiles.filter(file => file.size > MAX_IMAGE_SIZE);
    if (oversized.length > 0) {
      setFieldErrors(prev => ({ ...prev, images: 'Some images exceed 5MB limit' }));
      return;
    }

    const previews = imageFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...previews]);
    setFormData(prev => ({ ...prev, images: [...prev.images, ...imageFiles] }));

    if ([...formData.images, ...imageFiles].length > 0) {
      setFieldErrors(prev => ({ ...prev, images: undefined }));
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setFieldErrors(prev => ({ ...prev, videos: undefined }));
    setTouchedFields(prev => new Set(prev).add('videos'));

    if (formData.videos.length + files.length > MAX_VIDEOS) {
      const error = `Maximum ${MAX_VIDEOS} videos allowed. You can add ${MAX_VIDEOS - formData.videos.length} more.`;
      setFieldErrors(prev => ({ ...prev, videos: error }));
      return;
    }

    const videoFiles = files.filter(file => file.type.startsWith('video/'));

    if (videoFiles.length !== files.length) {
      setFieldErrors(prev => ({ ...prev, videos: 'Only video files are allowed' }));
      return;
    }

    const oversized = videoFiles.filter(file => file.size > MAX_VIDEO_SIZE);
    if (oversized.length > 0) {
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
    if (updatedImages.length === 0) {
      setFieldErrors(prev => ({ ...prev, images: 'At least one property image is requiblack' }));
    } else {
      setFieldErrors(prev => ({ ...prev, images: undefined }));
    }
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

  const goToNextImage = () => setSelectedImageIndex((prev) => (prev + 1) % imagePreviews.length);
  const goToPreviousImage = () => setSelectedImageIndex((prev) => (prev - 1 + imagePreviews.length) % imagePreviews.length);

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    const requiblackFields = [
      'title', 'propertyType', 'totalArea', 'availableFrom',
      'pricePerSqFt', 'address', 'city', 'state'
    ];

    requiblackFields.forEach(field => {
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
    const allFields = new Set([...requiblackFields, 'pincode', 'contactPersonPhone', 'contactPersonEmail', 'images']);
    setTouchedFields(allFields);

    return Object.keys(errors).length === 0;
  };

  const handleLocationSelect = (lat: string, lng: string) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all requiblack fields correctly');
      const firstErrorField = document.querySelector('.border-black-500');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadFormData = new FormData();
      
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'images') {
          formData.images.forEach(file => uploadFormData.append('images', file));
        } else if (key === 'videos') {
          formData.videos.forEach(file => uploadFormData.append('videos', file));
        } else if (key === 'amenities') {
          uploadFormData.append('amenities', JSON.stringify(value));
        } else {
          uploadFormData.append(key, value.toString());
        }
      });

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 300);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Upload failed');

      toast.success('Property listed successfully!', {
        description: 'Your property has been submitted for review.',
      });

      setTimeout(() => {
        window.location.href = '/property';
      }, 2000);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center text-sm text-gray-500 mb-4">
            <span>Home</span>
            <span className="mx-2">/</span>
            <span>My Listings</span>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium">Add New Property</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Add New Property</h1>
          <p className="text-gray-600">Fill in the mandatory details below to list your property on Rexon. Adding high-quality photos and videos increases visibility.</p>
        </div>

        {uploading && (
          <Card className="mb-6 border-black-200 bg-black-50">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-black-900">Uploading property...</span>
                  <span className="text-black-700">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Basic Information */}
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-black-600 rounded-lg flex items-center justify-center mr-3">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle>Basic Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-semibold">
                    Property Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    onBlur={() => handleFieldBlur('title')}
                    placeholder="e.g., Green Valley Warehousing Complex"
                    className={`border-gray-300 focus:border-black-500 focus:ring-black-500 ${
                      touchedFields.has('title') && fieldErrors.title ? 'border-black-500' : ''
                    }`}
                  />
                  {touchedFields.has('title') && fieldErrors.title && (
                    <p className="text-sm text-black-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-4 w-4" />
                      {fieldErrors.title}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 w-full">
                    <Label htmlFor="propertyType" className="text-sm font-semibold">
                      Property Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.propertyType}
                      onValueChange={(value) => handleFieldChange('propertyType', value)}
                    >
                      <SelectTrigger
                        id="propertyType"
                        className={`w-full h-11 border-gray-300 focus:border-black-500 focus:ring-black-500 ${
                          touchedFields.has('propertyType') && fieldErrors.propertyType ? 'border-black-500' : ''
                        }`}
                      >
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent className="max-w-[calc(100vw-2rem)]">
                        {PROPERTY_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {touchedFields.has('propertyType') && fieldErrors.propertyType && (
                      <p className="text-sm text-black-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-4 w-4" />
                        {fieldErrors.propertyType}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="totalArea" className="text-sm font-semibold">
                      Total Area <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="totalArea"
                        type="number"
                        min='0'
                        value={formData.totalArea}
                        onChange={(e) => handleFieldChange('totalArea', e.target.value)}
                        onBlur={() => handleFieldBlur('totalArea')}
                        placeholder="0"
                        className={`flex-1 border-gray-300 focus:border-black-500 focus:ring-black-500 ${
                          touchedFields.has('totalArea') && fieldErrors.totalArea ? 'border-black-500' : ''
                        }`}
                      />
                      <Select
                        value={formData.sizeUnit}
                        onValueChange={(value: 'sqft' | 'sqm') => setFormData({ ...formData, sizeUnit: value })}
                      >
                        <SelectTrigger className="w-28 h-11 border-gray-300 focus:border-black-500 focus:ring-black-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sqft">Sq.ft</SelectItem>
                          <SelectItem value="sqm">Sq.m</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {touchedFields.has('totalArea') && fieldErrors.totalArea && (
                      <p className="text-sm text-black-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-4 w-4" />
                        {fieldErrors.totalArea}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="Provide a detailed description of your property..."
                    className="border-gray-300 focus:border-black-500 focus:ring-black-500 resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Availability & Pricing */}
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-black-600 rounded-lg flex items-center justify-center mr-3">
                    <IndianRupee className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle>Availability & Pricing</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="availableFrom" className="text-sm font-semibold">
                      Available From <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="availableFrom"
                      type="date"
                      min={today}
                      value={formData.availableFrom}
                      onChange={(e) => handleFieldChange('availableFrom', e.target.value)}
                      onBlur={() => handleFieldBlur('availableFrom')}
                      className={`h-11 border-gray-300 focus:border-black-500 focus:ring-black-500 ${
                        touchedFields.has('availableFrom') && fieldErrors.availableFrom ? 'border-black-500' : ''
                      }`}
                    />
                    {touchedFields.has('availableFrom') && fieldErrors.availableFrom && (
                      <p className="text-sm text-black-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-4 w-4" />
                        {fieldErrors.availableFrom}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 w-full">
                    <Label htmlFor="listingType" className="text-sm font-semibold">
                      Listing Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.listingType}
                      onValueChange={(value: 'sale' | 'rent') => setFormData({ ...formData, listingType: value })}
                    >
                      <SelectTrigger id="listingType" className="h-11 w-full border-gray-300 focus:border-black-500 focus:ring-black-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className='max-w-[calc(100vw-2rem)]'>
                        <SelectItem value="rent">For Rent</SelectItem>
                        <SelectItem value="sale">For Sale</SelectItem>
                        <SelectItem value="lease">For Lease</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricePerSqFt" className="text-sm font-semibold">
                    Price per Sq.ft <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₹</span>
                    <Input
                      id="pricePerSqFt"
                      type="number"
                      min={'0'}
                      value={formData.pricePerSqFt}
                      onChange={(e) => handleFieldChange('pricePerSqFt', e.target.value)}
                      onBlur={() => handleFieldBlur('pricePerSqFt')}
                      className={`pl-8 h-11 border-gray-300 focus:border-black-500 focus:ring-black-500 ${
                        touchedFields.has('pricePerSqFt') && fieldErrors.pricePerSqFt ? 'border-black-500' : ''
                      }`}
                      placeholder="0.00"
                    />
                  </div>
                  {touchedFields.has('pricePerSqFt') && fieldErrors.pricePerSqFt && (
                    <p className="text-sm text-black-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-4 w-4" />
                      {fieldErrors.pricePerSqFt}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalPrice" className="text-sm font-semibold">Total Price (Optional)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₹</span>
                    <Input
                      id="totalPrice"
                      type="number"
                      min={0}
                      value={formData.totalPrice}
                      onChange={(e) => setFormData({ ...formData, totalPrice: e.target.value })}
                      className="pl-8 h-11 border-gray-300 focus:border-black-500 focus:ring-black-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location Details */}
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-black-600 rounded-lg flex items-center justify-center mr-3">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle>Location Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {/* Address field — triggers auto-geocoding in MapSelector */}
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-semibold">
                    Address <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    onBlur={() => handleFieldBlur('address')}
                    placeholder="Enter full street address"
                    className={`border-gray-300 focus:border-black-500 focus:ring-black-500 resize-none ${
                      touchedFields.has('address') && fieldErrors.address ? 'border-black-500' : ''
                    }`}
                    rows={2}
                  />
                  {touchedFields.has('address') && fieldErrors.address && (
                    <p className="text-sm text-black-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-4 w-4" />
                      {fieldErrors.address}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-semibold">
                      City <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      onBlur={() => handleFieldBlur('city')}
                      placeholder="e.g., Mumbai"
                      className={`h-11 border-gray-300 focus:border-black-500 focus:ring-black-500 ${
                        touchedFields.has('city') && fieldErrors.city ? 'border-black-500' : ''
                      }`}
                    />
                    {touchedFields.has('city') && fieldErrors.city && (
                      <p className="text-sm text-black-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-4 w-4" />
                        {fieldErrors.city}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 w-full">
                    <Label htmlFor="state" className="text-sm font-semibold">
                      State <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) => handleFieldChange('state', value)}
                    >
                      <SelectTrigger
                        id="state"
                        className={`h-11 w-full border-gray-300 focus:border-black-500 focus:ring-black-500 ${
                          touchedFields.has('state') && fieldErrors.state ? 'border-black-500' : ''
                        }`}
                      >
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent className='max-w-[calc(100vw-2rem)]'>
                        {INDIAN_STATES.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {touchedFields.has('state') && fieldErrors.state && (
                      <p className="text-sm text-black-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-4 w-4" />
                        {fieldErrors.state}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pincode" className="text-sm font-semibold">Pincode</Label>
                    <Input
                      id="pincode"
                      value={formData.pincode}
                      onChange={(e) => handleFieldChange('pincode', e.target.value)}
                      onBlur={() => handleFieldBlur('pincode')}
                      placeholder="400001"
                      maxLength={6}
                      className={`h-11 border-gray-300 focus:border-black-500 focus:ring-black-500 ${
                        touchedFields.has('pincode') && fieldErrors.pincode ? 'border-black-500' : ''
                      }`}
                    />
                    {touchedFields.has('pincode') && fieldErrors.pincode && (
                      <p className="text-sm text-black-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-4 w-4" />
                        {fieldErrors.pincode}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 w-full">
                    <Label htmlFor="roadConnectivity" className="text-sm font-semibold">Road Connectivity</Label>
                    <Select
                      value={formData.roadConnectivity}
                      onValueChange={(value) => setFormData({ ...formData, roadConnectivity: value })}
                    >
                      <SelectTrigger id="roadConnectivity" className="h-11 w-full border-gray-300 focus:border-black-500 focus:ring-black-500">
                        <SelectValue placeholder="Select road type..." />
                      </SelectTrigger>
                      <SelectContent className='max-w-[calc(100vw-2rem)]'>
                        {ROAD_CONNECTIVITY.map(road => (
                          <SelectItem key={road} value={road}>{road}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Lat/Lng fields — auto-populated by geocoding, editable manually */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude" className="text-sm font-semibold">Latitude</Label>
                    <Input
                      id="latitude"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="19.0760"
                      className="h-11 border-gray-300 focus:border-black-500 focus:ring-black-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="longitude" className="text-sm font-semibold">Longitude</Label>
                    <Input
                      id="longitude"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="72.8777"
                      className="h-11 border-gray-300 focus:border-black-500 focus:ring-black-500"
                    />
                  </div>
                </div>

                {/* Map toggle button */}
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={() => setShowMap(!showMap)}
                    className="bg-black hover:bg-black-700 h-11"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    {showMap ? 'Hide Map' : 'Select Location on Map'}
                  </Button>

                  {showMap && (
                    <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                      {/* 
                        MapSelector now receives address, city, state so it can
                        auto-geocode whenever these change (debounced 800 ms).
                        It still supports click-to-pin and drag-to-adjust.
                      */}
                      <MapSelector
                        latitude={formData.latitude}
                        longitude={formData.longitude}
                        address={formData.address}
                        city={formData.city}
                        state={formData.state}
                        onLocationSelect={handleLocationSelect}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Features & Amenities */}
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-black-600 rounded-lg flex items-center justify-center mr-3">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle>Features & Amenities</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-gray-200">Optional</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Select Amenities</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                    {AMENITIES.map((amenity) => (
                      <div key={amenity} className="flex items-center space-x-2 p-3 rounded-lg border border-gray-200 hover:border-black hover:bg-gray-50 transition-colors">
                        <Checkbox
                          id={amenity}
                          checked={formData.amenities.includes(amenity)}
                          onCheckedChange={() => toggleAmenity(amenity)}
                          className="data-[state=checked]:bg-black data-[state=checked]:border-black"
                        />
                        <Label
                          htmlFor={amenity}
                          className="text-sm font-medium leading-none cursor-pointer flex-1"
                        >
                          {amenity}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Details */}
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-black-600 rounded-lg flex items-center justify-center mr-3">
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
                      onChange={(e) => setFormData({ ...formData, contactPersonName: e.target.value })}
                      placeholder="Contact person name"
                      className="h-11 border-gray-300 focus:border-black-500 focus:ring-black-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactEmail" className="text-sm font-semibold">Email Address</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={formData.contactPersonEmail}
                      onChange={(e) => handleFieldChange('contactPersonEmail', e.target.value)}
                      onBlur={() => handleFieldBlur('contactPersonEmail')}
                      placeholder="email@example.com"
                      className={`h-11 border-gray-300 focus:border-black-500 focus:ring-black-500 ${
                        touchedFields.has('contactPersonEmail') && fieldErrors.contactPersonEmail ? 'border-black-500' : ''
                      }`}
                    />
                    {touchedFields.has('contactPersonEmail') && fieldErrors.contactPersonEmail && (
                      <p className="text-sm text-black-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-4 w-4" />
                        {fieldErrors.contactPersonEmail}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone" className="text-sm font-semibold">Mobile Number</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    pattern='[0-9]{10}'
                    maxLength={10}
                    minLength={10}
                    value={formData.contactPersonPhone}
                    onChange={(e) => handleFieldChange('contactPersonPhone', e.target.value)}
                    onBlur={() => handleFieldBlur('contactPersonPhone')}
                    placeholder="+91 98765 43210"
                    className={`h-11 border-gray-300 focus:border-black-500 focus:ring-black-500 ${
                      touchedFields.has('contactPersonPhone') && fieldErrors.contactPersonPhone ? 'border-black-500' : ''
                    }`}
                  />
                  {touchedFields.has('contactPersonPhone') && fieldErrors.contactPersonPhone && (
                    <p className="text-sm text-black-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-4 w-4" />
                      {fieldErrors.contactPersonPhone}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Media & Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Property Images */}
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ImageIcon className="h-5 w-5 text-black-600 mr-2" />
                      <CardTitle className="text-lg">Property Images</CardTitle>
                      <span className='text-red-600 mx-3'>*</span>
                    </div>
                  </div>
                  <CardDescription className="text-xs">
                    Upload up to {MAX_IMAGES} images (Max 5MB each)
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {imagePreviews.length === 0 ? (
                    <div>
                      <Label htmlFor="images" className="block w-full cursor-pointer">
                        <div className={`border-2 border-dashed rounded-lg p-8 text-center hover:border-black-500 hover:bg-black-50 transition-all ${
                          touchedFields.has('images') && fieldErrors.images
                            ? 'border-black-500 bg-black-50'
                            : 'border-gray-300'
                        }`}>
                          <input
                            id="images"
                            type="file"
                            multiple
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                          <div className="w-16 h-16 bg-gradient-to-br from-black-100 to-black-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Upload className="h-8 w-8 text-black-600" />
                          </div>
                          <p className="text-sm font-semibold text-gray-900 mb-1">Click to upload images</p>
                          <p className="text-xs text-gray-500">JPG, JPEG, PNG, WEBP, GIF up to 5MB</p>
                        </div>
                      </Label>
                      {touchedFields.has('images') && fieldErrors.images && (
                        <p className="text-sm text-black-500 flex items-center gap-1 mt-2">
                          <AlertCircle className="h-4 w-4" />
                          {fieldErrors.images}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        {imagePreviews.slice(0, visibleImageCount).map((preview, index) => (
                          <div key={index} className="relative group aspect-square">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg border-2 border-gray-200 group-hover:border-black-500 transition-all cursor-pointer"
                              onClick={() => openGallery(index)}
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDeleteImage(index);
                              }}
                              className="absolute -top-2 -right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-black-500 hover:bg-black-600 shadow-lg"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <div
                              className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all flex items-center justify-center cursor-pointer"
                              onClick={() => openGallery(index)}
                            >
                              <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}
                        
                        {remainingImages > 0 && (
                          <div 
                            className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-2 border-gray-300 flex items-center justify-center cursor-pointer hover:border-black-500 hover:from-black-50 hover:to-black-50 transition-all group"
                            onClick={() => setShowImageGallery(true)}
                          >
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-700 group-hover:text-black-600">+{remainingImages}</p>
                              <p className="text-xs text-gray-500 group-hover:text-black-600">more</p>
                            </div>
                          </div>
                        )}
                        
                        {formData.images.length < MAX_IMAGES && (
                          <Label htmlFor="images-add" className="block cursor-pointer">
                            <div className="aspect-square bg-gradient-to-br from-black-50 to-black-50 rounded-lg border-2 border-dashed border-black-300 flex items-center justify-center hover:border-black-500 hover:bg-black-100 transition-all group">
                              <input
                                id="images-add"
                                type="file"
                                multiple
                                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                                onChange={handleImageChange}
                                className="hidden"
                              />
                              <Plus className="h-8 w-8 text-black-500 group-hover:text-black-600 group-hover:scale-110 transition-transform" />
                            </div>
                          </Label>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                        <span className="font-medium">{formData.images.length} / {MAX_IMAGES} images</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowImageGallery(true)}
                          className="text-black-600 hover:text-black-700 hover:bg-black-50 h-7"
                        >
                          View All
                        </Button>
                      </div>
                      {touchedFields.has('images') && fieldErrors.images && (
                        <p className="text-sm text-black-500 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {fieldErrors.images}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Property Videos */}
              <Card className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Video className="h-5 w-5 text-black-600 mr-2" />
                      <CardTitle className="text-lg">Property Videos</CardTitle>
                    </div>
                    <Badge variant="secondary" className="bg-gray-200">Optional</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Upload up to {MAX_VIDEOS} videos (Max 100MB each)
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {formData.videos.length < MAX_VIDEOS && (
                    <div className="mb-4">
                      <Label htmlFor="videos" className="block w-full cursor-pointer">
                        <div className={`border-2 border-dashed rounded-lg p-6 text-center hover:border-black-500 hover:bg-black-50 transition-all ${
                          touchedFields.has('videos') && fieldErrors.videos
                            ? 'border-black-500 bg-black-50'
                            : 'border-gray-300'
                        }`}>
                          <input
                            id="videos"
                            type="file"
                            multiple
                            accept="video/*"
                            onChange={handleVideoChange}
                            className="hidden"
                          />
                          <div className="w-12 h-12 bg-gradient-to-br from-black-100 to-black-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Video className="h-6 w-6 text-black-600" />
                          </div>
                          <p className="text-sm font-medium text-gray-900 mb-1">Click to upload</p>
                          <p className="text-xs text-gray-500">
                            {formData.videos.length}/{MAX_VIDEOS} videos
                          </p>
                        </div>
                      </Label>
                      {touchedFields.has('videos') && fieldErrors.videos && (
                        <p className="text-sm text-black-500 flex items-center gap-1 mt-2">
                          <AlertCircle className="h-4 w-4" />
                          {fieldErrors.videos}
                        </p>
                      )}
                    </div>
                  )}

                  {videoPreviews.length > 0 && (
                    <div className="space-y-3">
                      {videoPreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <video
                            src={preview}
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 group-hover:border-black-500 transition-all"
                            controls
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            onClick={() => removeVideo(index)}
                            className="absolute -top-2 -right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-black-500 hover:bg-black-600 shadow-lg"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                            {(formData.videos[index].size / (1024 * 1024)).toFixed(1)} MB
                          </div>
                        </div>
                      ))}
                      {touchedFields.has('videos') && fieldErrors.videos && (
                        <p className="text-sm text-black-500 flex items-center gap-1 mt-2">
                          <AlertCircle className="h-4 w-4" />
                          {fieldErrors.videos}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Summary */}
              <Card className="shadow-md hover:shadow-lg transition-shadow border-black-100">
                <CardHeader className="">
                  <CardTitle className="text-lg">Quick Summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Property Type</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formData.propertyType || 'Not selected'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Total Area</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formData.totalArea ? `${formData.totalArea} ${formData.sizeUnit}` : 'Not set'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Media Files</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formData.images.length} images, {formData.videos.length} videos
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Location</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formData.latitude && formData.longitude 
                          ? '✓ Set' 
                          : 'Not set'}
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
                  className="w-full bg-black hover:from-black-700 hover:to-black-800 text-white py-6 text-base font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
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
                  disabled={uploading}
                  className="w-full py-6 text-base font-medium border-2 hover:bg-gray-50"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Gallery Modal - View Only */}
      <Dialog open={showImageGallery} onOpenChange={setShowImageGallery}>
        <DialogContent className="max-w-[95vw] sm:max-w-[85vw] md:max-w-3xl lg:max-w-5xl xl:max-w-6xl max-h-[95vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-3 sm:px-4 md:px-6 pt-4 sm:pt-5 md:pt-6 pb-3 sm:pb-4 border-b">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold truncate">
                  Property Images
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {selectedImageIndex + 1} of {imagePreviews.length}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="relative p-3 sm:p-4 md:p-6 overflow-y-auto">
            <div className="group relative w-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg sm:rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
              <div 
                className="w-full h-[50vh] sm:h-[55vh] md:h-[60vh] lg:h-[65vh] flex items-center justify-center"
                style={{ minHeight: '300px', maxHeight: '800px' }}
              >
                <img
                  src={imagePreviews[selectedImageIndex]}
                  alt={`Property ${selectedImageIndex + 1}`}
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                />
              </div>

              {imagePreviews.length > 1 && (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    onClick={goToPreviousImage}
                    className="absolute left-2 sm:left-3 md:left-4 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-full bg-white/95 hover:bg-white shadow-2xl border-2 border-gray-200 hover:scale-110 transition-all md:opacity-0 md:group-hover:opacity-100"
                  >
                    <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-gray-700" />
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    onClick={goToNextImage}
                    className="absolute right-2 sm:right-3 md:right-4 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-full bg-white/95 hover:bg-white shadow-2xl border-2 border-gray-200 hover:scale-110 transition-all md:opacity-0 md:group-hover:opacity-100"
                  >
                    <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-gray-700" />
                  </Button>

                  <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 bg-black/75 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    {selectedImageIndex + 1} / {imagePreviews.length}
                  </div>
                </>
              )}
            </div>

            {imagePreviews.length > 1 && (
              <div className="mt-3 sm:mt-4 md:mt-6">
                <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 px-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {imagePreviews.map((preview, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-md sm:rounded-lg overflow-hidden transition-all ${
                        index === selectedImageIndex
                          ? 'ring-2 sm:ring-4 ring-black-500 scale-105 shadow-lg'
                          : 'ring-1 sm:ring-2 ring-gray-200 hover:ring-black-300 hover:scale-105'
                      }`}
                    >
                      <img
                        src={preview}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {index === selectedImageIndex && (
                        <div className="absolute inset-0 bg-black-500/20" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
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
              onClick={() => {
                if (imageToDelete !== null) removeImage(imageToDelete);
              }}
              className="bg-black-600 hover:bg-black-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}