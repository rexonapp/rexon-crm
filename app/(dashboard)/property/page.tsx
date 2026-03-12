'use client'

import { useEffect, useState } from 'react';
import { Building2, MapPin, IndianRupee, Calendar, AlertCircle, RefreshCw, Filter, X, Search, SlidersHorizontal, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSubContent,
  DropdownMenuSub,
  DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu"

import { MoreVertical } from "lucide-react"
import { toast } from "sonner"
interface Property {
  id: number;
  property_name: string;
  title: string;
  description: string;
  property_type: string;
  space_available: number;
  space_unit: string;
  warehouse_size: number;
  available_from: string;
  price_type: string;
  price_per_sqft: number;
  address: string;
  city: string;
  state: string;
  pincode: string;
  road_connectivity: string;
  contact_person_name: string;
  contact_person_phone: string;
  contact_person_email: string;
  contact_person_designation: string;
  latitude: number;
  longitude: number;
  amenities: string[];
  is_verified: boolean;
  is_featured: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

interface FilterState {
  search: string;
  propertyType: string;
  priceType: string;
  status: string;
  city: string;
  state: string;
  minPrice: string;
  maxPrice: string;
  minArea: string;
  maxArea: string;
  isVerified: string;
  isFeatured: string;
}

const ITEMS_PER_PAGE = 10;

/* ── Stat Card ── */
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.FC<{ className?: string }>;
}) {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardContent className="pt-5 pb-5 px-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">{label}</p>
            <p className="text-3xl font-bold text-foreground leading-none">{value}</p>
            <p className="text-[12px] text-muted-foreground">{sub}</p>
          </div>
          <div className="w-9 h-9 rounded-md bg-accent flex items-center justify-center shrink-0">
            <Icon className="w-[18px] h-[18px] text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Status Badge ── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    Active: { label: 'Active', className: 'bg-foreground text-background' },
    Approved: { label: 'Approved', className: 'bg-foreground text-background' },
    Pending: { label: 'Pending', className: 'bg-muted text-muted-foreground border border-border' },
    Rejected: { label: 'Rejected', className: 'bg-destructive/10 text-destructive border border-destructive/20' },
  };
  const info = map[status] ?? { label: status, className: 'bg-muted text-muted-foreground border border-border' };
  return (
    <span className={cn('inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold leading-none', info.className)}>
      {info.label}
    </span>
  );
}

/* ── Price Type Badge ── */
function PriceTypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold leading-none bg-muted text-muted-foreground border border-border">
      {type}
    </span>
  );
}

/* ── Filter Label ── */
function FilterSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 mb-2">{children}</p>
  );
}

export default function MyListingsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>({
    search: '', propertyType: 'all', priceType: 'all', status: 'all',
    city: 'all', state: 'all', minPrice: '', maxPrice: '',
    minArea: '', maxArea: '', isVerified: 'all', isFeatured: 'all',
  });

  const fetchListings = async () => {
    try {
      const response = await fetch('/api/listings', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401) { setError('Please sign in to view your listings'); return; }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success) { setProperties(data.properties || []); setError(null); }
      else setError(data.error || 'Failed to load properties');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load listings. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchListings(); }, []);
  const handleRefresh = () => { setIsRefreshing(true); fetchListings(); };

  const uniquePropertyTypes = Array.from(new Set(properties.map(p => p.property_type).filter(Boolean)));
  const uniquePriceTypes = Array.from(new Set(properties.map(p => p.price_type).filter(Boolean)));
  const uniqueStatuses = Array.from(new Set(properties.map(p => p.status).filter(Boolean)));
  const uniqueCities = Array.from(new Set(properties.map(p => p.city).filter(Boolean)));
  const uniqueStates = Array.from(new Set(properties.map(p => p.state).filter(Boolean)));

  useEffect(() => {
    let f = [...properties];
    if (filters.search.trim()) {
      const s = filters.search.toLowerCase();
      f = f.filter(p =>
        p.title?.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s) ||
        p.property_name?.toLowerCase().includes(s) || p.address?.toLowerCase().includes(s)
      );
    }
    if (filters.propertyType !== 'all') f = f.filter(p => p.property_type === filters.propertyType);
    if (filters.priceType !== 'all') f = f.filter(p => p.price_type === filters.priceType);
    if (filters.status !== 'all') f = f.filter(p => p.status === filters.status);
    if (filters.city !== 'all') f = f.filter(p => p.city === filters.city);
    if (filters.state !== 'all') f = f.filter(p => p.state === filters.state);
    if (filters.minPrice) f = f.filter(p => p.price_per_sqft >= parseFloat(filters.minPrice));
    if (filters.maxPrice) f = f.filter(p => p.price_per_sqft <= parseFloat(filters.maxPrice));
    if (filters.minArea) f = f.filter(p => p.space_available >= parseFloat(filters.minArea));
    if (filters.maxArea) f = f.filter(p => p.space_available <= parseFloat(filters.maxArea));
    if (filters.isVerified !== 'all') f = f.filter(p => p.is_verified === (filters.isVerified === 'true'));
    if (filters.isFeatured !== 'all') f = f.filter(p => p.is_featured === (filters.isFeatured === 'true'));
    setFilteredProperties(f);
    setCurrentPage(1);
  }, [filters, properties]);

  const handleFilterChange = (key: keyof FilterState, value: string) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  const clearFilters = () => setFilters({
    search: '', propertyType: 'all', priceType: 'all', status: 'all',
    city: 'all', state: 'all', minPrice: '', maxPrice: '',
    minArea: '', maxArea: '', isVerified: 'all', isFeatured: 'all',
  });

  const hasActiveFilters = () =>
    filters.search !== '' || Object.entries(filters).some(([k, v]) => k !== 'search' && v !== '' && v !== 'all');

  const totalPages = Math.ceil(filteredProperties.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentProperties = filteredProperties.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

  const handleExpiry = async (id: number, type: string) => {
    try {
      const res = await fetch("/api/properties/update-expiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, type }),
      })
  
      const data = await res.json()
        if (data.success) {
        toast.success("Expiry updated successfully")
        fetchListings()
      } else {
        toast.error(data.message || "Failed to update expiry")
      }
  
    } catch (error) {
      toast.error("Something went wrong")
      console.error(error)
    }
  }

  /* ── Loading ── */
  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-[14px] text-muted-foreground">Loading your listings…</p>
      </div>
    </div>
  );

  /* ── Hard error ── */
  if (error && properties.length === 0) return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} size="sm" variant="outline" disabled={isRefreshing}>
            <RefreshCw className={cn('h-3.5 w-3.5 mr-2', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Retrying…' : 'Try Again'}
          </Button>
          <Link href="/"><Button size="sm" variant="ghost">Go to Home</Button></Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background py-8 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <span className="text-foreground font-medium">My Listings</span>
        </div>

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold text-foreground tracking-tight">My Listings</h1>
            <p className="text-[13.5px] text-muted-foreground mt-0.5">Manage and track all your property listings</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="h-9 px-4 text-[13.5px]"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-2', isRefreshing && 'animate-spin')} />
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
            <Link href="/property/addProperty">
              <Button size="sm" className="h-9 px-4 text-[13.5px]">
                <Building2 className="h-3.5 w-3.5 mr-2" />
                Add Property
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Soft error banner ── */}
        {error && properties.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error} — Showing cached data</AlertDescription>
          </Alert>
        )}

        {/* <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total"   value={properties.length}                               sub="All properties"  icon={Building2}  />
          <StatCard label="Active"  value={properties.filter(p => p.status === 'Active').length}  sub="Currently listed" icon={TrendingUp}  />
          <StatCard label="Pending" value={properties.filter(p => p.status === 'Pending').length} sub="Awaiting review"  icon={Clock}       />
          <StatCard label="Filtered" value={filteredProperties.length}                      sub="Current view"    icon={Filter}      />
        </div> */}

        {/* ── Search + Filter Bar ── */}
        <Card className="border-border bg-card shadow-none">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-muted-foreground" />
                <Input
                  placeholder="Search by title, description, address…"
                  value={filters.search}
                  onChange={e => handleFilterChange('search', e.target.value)}
                  className="pl-9 h-9 text-[13.5px] bg-background border-border"
                />
              </div>

              {/* Inline quick filters */}
              <div className="hidden lg:flex gap-2">
                {[
                  { key: 'status' as keyof FilterState, placeholder: 'Status', options: uniqueStatuses, allLabel: 'All Status' },
                  { key: 'priceType' as keyof FilterState, placeholder: 'Listing Type', options: uniquePriceTypes, allLabel: 'All Types' },
                  { key: 'propertyType' as keyof FilterState, placeholder: 'Property Type', options: uniquePropertyTypes, allLabel: 'All Properties' },
                ].map(({ key, placeholder, options, allLabel }) => (
                  <Select key={key} value={filters[key]} onValueChange={v => handleFilterChange(key, v)}>
                    <SelectTrigger className="w-[148px] h-9 text-[13px] bg-background border-border">
                      <SelectValue placeholder={placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{allLabel}</SelectItem>
                      {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ))}
              </div>

              {/* Advanced Filters Sheet */}
              <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 px-4 text-[13px] border-border relative">
                    <SlidersHorizontal className="h-3.5 w-3.5 mr-2" />
                    Filters
                    {hasActiveFilters() && (
                      <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-foreground rounded-full text-background text-[9px] flex items-center justify-center font-bold">
                        {Object.values(filters).filter(v => v !== '' && v !== 'all').length}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-sm overflow-y-auto p-0">
                  <SheetHeader className="px-5 py-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <SheetTitle className="text-[15px] font-semibold">Advanced Filters</SheetTitle>
                      {hasActiveFilters() && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-[12px] text-muted-foreground hover:text-foreground">
                          <X className="h-3 w-3 mr-1" />Clear all
                        </Button>
                      )}
                    </div>
                    <SheetDescription className="text-[12.5px] mt-0.5">Refine your property search</SheetDescription>
                  </SheetHeader>

                  <div className="px-5 py-5 space-y-6">
                    {/* Property Details */}
                    <div>
                      <FilterSectionLabel>Property Details</FilterSectionLabel>
                      <div className="space-y-3">
                        {[
                          { id: 'propertyType', label: 'Property Type', key: 'propertyType' as keyof FilterState, options: uniquePropertyTypes, allLabel: 'All Properties' },
                          { id: 'priceType', label: 'Listing Type', key: 'priceType' as keyof FilterState, options: uniquePriceTypes, allLabel: 'All Types' },
                          { id: 'status', label: 'Status', key: 'status' as keyof FilterState, options: uniqueStatuses, allLabel: 'All Status' },
                        ].map(({ id, label, key, options, allLabel }) => (
                          <div key={id} className="space-y-1.5">
                            <Label htmlFor={id} className="text-[12.5px] font-medium text-muted-foreground">{label}</Label>
                            <Select value={filters[key]} onValueChange={v => handleFilterChange(key, v)}>
                              <SelectTrigger id={id} className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">{allLabel}</SelectItem>
                                {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Location */}
                    <div>
                      <FilterSectionLabel>Location</FilterSectionLabel>
                      <div className="space-y-3">
                        {[
                          { id: 'state', label: 'State', key: 'state' as keyof FilterState, options: uniqueStates, allLabel: 'All States' },
                          { id: 'city', label: 'City', key: 'city' as keyof FilterState, options: uniqueCities, allLabel: 'All Cities' },
                        ].map(({ id, label, key, options, allLabel }) => (
                          <div key={id} className="space-y-1.5">
                            <Label htmlFor={id} className="text-[12.5px] font-medium text-muted-foreground">{label}</Label>
                            <Select value={filters[key]} onValueChange={v => handleFilterChange(key, v)}>
                              <SelectTrigger id={id} className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">{allLabel}</SelectItem>
                                {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Price Range */}
                    <div>
                      <FilterSectionLabel>Price Range (₹/sqft)</FilterSectionLabel>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="minPrice" className="text-[12px] text-muted-foreground">Min</Label>
                          <Input id="minPrice" type="number" placeholder="0" value={filters.minPrice}
                            onChange={e => handleFilterChange('minPrice', e.target.value)} className="h-9 text-[13px]" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="maxPrice" className="text-[12px] text-muted-foreground">Max</Label>
                          <Input id="maxPrice" type="number" placeholder="∞" value={filters.maxPrice}
                            onChange={e => handleFilterChange('maxPrice', e.target.value)} className="h-9 text-[13px]" />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Area Range */}
                    <div>
                      <FilterSectionLabel>Area Range (sqft)</FilterSectionLabel>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="minArea" className="text-[12px] text-muted-foreground">Min</Label>
                          <Input id="minArea" type="number" placeholder="0" value={filters.minArea}
                            onChange={e => handleFilterChange('minArea', e.target.value)} className="h-9 text-[13px]" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="maxArea" className="text-[12px] text-muted-foreground">Max</Label>
                          <Input id="maxArea" type="number" placeholder="∞" value={filters.maxArea}
                            onChange={e => handleFilterChange('maxArea', e.target.value)} className="h-9 text-[13px]" />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Features */}
                    <div>
                      <FilterSectionLabel>Property Features</FilterSectionLabel>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="isVerified" className="text-[12.5px] font-medium text-muted-foreground">Verification</Label>
                          <Select value={filters.isVerified} onValueChange={v => handleFilterChange('isVerified', v)}>
                            <SelectTrigger id="isVerified" className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Properties</SelectItem>
                              <SelectItem value="true">Verified Only</SelectItem>
                              <SelectItem value="false">Unverified Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="isFeatured" className="text-[12.5px] font-medium text-muted-foreground">Featured</Label>
                          <Select value={filters.isFeatured} onValueChange={v => handleFilterChange('isFeatured', v)}>
                            <SelectTrigger id="isFeatured" className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Properties</SelectItem>
                              <SelectItem value="true">Featured Only</SelectItem>
                              <SelectItem value="false">Non-Featured Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="sticky bottom-0 bg-card border-t border-border px-5 py-4">
                    <div className="flex gap-2">
                      <Button onClick={clearFilters} variant="outline" size="sm" className="flex-1 h-9 text-[13px]">Reset</Button>
                      <Button onClick={() => setIsFilterOpen(false)} size="sm" className="flex-1 h-9 text-[13px]">Apply</Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              {hasActiveFilters() && (
                <Button onClick={clearFilters} variant="ghost" size="sm" className="h-9 px-3 text-[13px] text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5 mr-1.5" />Clear
                </Button>
              )}
            </div>

            {/* Active filter chips */}
            {hasActiveFilters() && (
              <div className="mt-3 flex flex-wrap gap-1.5 pt-3 border-t border-border">
                {filters.search && (
                  <Badge variant="secondary" className="gap-1.5 text-[11.5px] font-normal pl-2.5 pr-1.5 py-1">
                    "{filters.search}"
                    <button onClick={() => handleFilterChange('search', '')} className="hover:text-foreground rounded-full">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {([
                  ['propertyType', filters.propertyType, 'Type'],
                  ['priceType', filters.priceType, 'Listing'],
                  ['status', filters.status, 'Status'],
                  ['city', filters.city, 'City'],
                  ['state', filters.state, 'State'],
                ] as [keyof FilterState, string, string][]).filter(([, v]) => v !== 'all').map(([key, val, label]) => (
                  <Badge key={key} variant="secondary" className="gap-1.5 text-[11.5px] font-normal pl-2.5 pr-1.5 py-1">
                    {label}: {val}
                    <button onClick={() => handleFilterChange(key, 'all')} className="hover:text-foreground rounded-full">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {(filters.minPrice || filters.maxPrice) && (
                  <Badge variant="secondary" className="gap-1.5 text-[11.5px] font-normal pl-2.5 pr-1.5 py-1">
                    ₹{filters.minPrice || '0'}–{filters.maxPrice || '∞'}
                    <button onClick={() => { handleFilterChange('minPrice', ''); handleFilterChange('maxPrice', ''); }} className="hover:text-foreground rounded-full">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {(filters.minArea || filters.maxArea) && (
                  <Badge variant="secondary" className="gap-1.5 text-[11.5px] font-normal pl-2.5 pr-1.5 py-1">
                    {filters.minArea || '0'}–{filters.maxArea || '∞'} sqft
                    <button onClick={() => { handleFilterChange('minArea', ''); handleFilterChange('maxArea', ''); }} className="hover:text-foreground rounded-full">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Table Card ── */}
        <Card className="border-border bg-card shadow-none">
          <CardHeader className="pb-4 border-b border-border px-5 pt-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[15px] font-semibold text-foreground">Property Listings</CardTitle>
                <CardDescription className="text-[12.5px] mt-0.5">
                  {filteredProperties.length === properties.length
                    ? `${properties.length} ${properties.length === 1 ? 'listing' : 'listings'}`
                    : `${filteredProperties.length} of ${properties.length} listings`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredProperties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mb-4">
                  <Filter className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-[14.5px] font-semibold text-foreground mb-1">
                  {properties.length === 0 ? 'No listings yet' : 'No results'}
                </p>
                <p className="text-[13px] text-muted-foreground mb-5 max-w-xs">
                  {properties.length === 0
                    ? 'Start by adding your first property listing.'
                    : 'Try adjusting your filters to see more results.'}
                </p>
                {properties.length === 0 ? (
                  <Link href="/property">
                    <Button size="sm"><Building2 className="h-3.5 w-3.5 mr-2" />Add Property</Button>
                  </Link>
                ) : (
                  <Button onClick={clearFilters} variant="outline" size="sm">
                    <X className="h-3.5 w-3.5 mr-2" />Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border hover:bg-transparent">
                      {['Property', 'Type', 'Area', 'Price/Sqft', 'Listing', 'Location', 'Available', 'Status', 'Added', 'Actions'].map(h => (
                        <TableHead key={h} className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/70 h-9 px-4">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentProperties.map((p) => (
                      <TableRow key={p.id} className="border-b border-border hover:bg-accent/40 transition-colors">

                        {/* Title */}
                        <TableCell className="px-4 py-3.5 max-w-[240px]">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[13.5px] font-semibold text-foreground leading-tight">{p.title}</span>
                              {p.is_verified && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
                                  <CheckCircle className="h-3 w-3" />Verified
                                </span>
                              )}
                            </div>
                            {p.description && (
                              <p className="text-[12px] text-muted-foreground line-clamp-1">
                                {p.description.substring(0, 70)}{p.description.length > 70 ? '…' : ''}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* Type */}
                        <TableCell className="px-4 py-3.5">
                          <span className="text-[13px] text-muted-foreground">{p.property_type || '—'}</span>
                        </TableCell>

                        {/* Area */}
                        <TableCell className="px-4 py-3.5">
                          <span className="text-[13.5px] font-medium text-foreground">
                            {p.space_available?.toLocaleString('en-IN') ?? '—'}
                          </span>
                          {p.space_unit && <span className="text-[12px] text-muted-foreground ml-1">{p.space_unit}</span>}
                        </TableCell>

                        {/* Price */}
                        <TableCell className="px-4 py-3.5">
                          <div className="flex items-center text-[13.5px] font-medium text-foreground">
                            <IndianRupee className="h-3.5 w-3.5 mr-0.5 text-muted-foreground" />
                            {p.price_per_sqft?.toLocaleString('en-IN') ?? '—'}
                          </div>
                        </TableCell>

                        {/* Listing type */}
                        <TableCell className="px-4 py-3.5">
                          {p.price_type ? <PriceTypeBadge type={p.price_type} /> : <span className="text-[13px] text-muted-foreground">—</span>}
                        </TableCell>

                        {/* Location */}
                        <TableCell className="px-4 py-3.5">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <div className="text-[13px] font-medium text-foreground leading-tight">{p.city || '—'}</div>
                              <div className="text-[11.5px] text-muted-foreground">{p.state || ''}</div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Available from */}
                        <TableCell className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            {p.available_from ? formatDate(p.available_from) : '—'}
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="px-4 py-3.5">
                          {p.status ? <StatusBadge status={p.status} /> : <span className="text-[13px] text-muted-foreground">—</span>}
                        </TableCell>

                        {/* Created */}
                        <TableCell className="px-4 py-3.5">
                          <span className="text-[12.5px] text-muted-foreground">
                            {p.created_at ? formatDate(p.created_at) : '—'}
                          </span>
                        </TableCell>

                        {/* Edit */}
                        <TableCell className="px-4 py-3.5 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">

                              <DropdownMenuItem
                                onClick={() => router.push(`property/editProperty/${p.id}`)}
                              >
                                Edit
                              </DropdownMenuItem>

                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  Expiry
                                </DropdownMenuSubTrigger>

                                <DropdownMenuSubContent className="w-40">

                                  <DropdownMenuItem
                                    onClick={() => handleExpiry(p.id, "1_month")}
                                  >
                                    1 Month
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => handleExpiry(p.id, "3_months")}
                                  >
                                    3 Months
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => handleExpiry(p.id, "6_months")}
                                  >
                                    6 Months
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => handleExpiry(p.id, "never")}
                                  >
                                    Never
                                  </DropdownMenuItem>

                                </DropdownMenuSubContent>
                              </DropdownMenuSub>

                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Pagination ── */}
        {filteredProperties.length > ITEMS_PER_PAGE && (
          <div className="flex flex-col items-center gap-3">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                    className={cn('text-[13px]', currentPage === 1 ? 'pointer-events-none opacity-40' : 'cursor-pointer')}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={currentPage === page}
                          className="text-[13px] cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <PaginationItem key={page}><PaginationEllipsis /></PaginationItem>;
                  }
                  return null;
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                    className={cn('text-[13px]', currentPage === totalPages ? 'pointer-events-none opacity-40' : 'cursor-pointer')}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <p className="text-[12.5px] text-muted-foreground">
              {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredProperties.length)} of {filteredProperties.length} listings
              {filteredProperties.length !== properties.length && ` (filtered from ${properties.length})`}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}