'use client'
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WarehouseEditForm from './warehouseedit';

export default function EditWarehousePage() {
  const params = useParams();
  const router = useRouter();
  const warehouseId = params?.warehouseId as string;

  const [warehouseData, setWarehouseData] = useState<any>(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  useEffect(() => {
    if (!warehouseId) return;
    const fetchWarehouse = async () => {
      try {
        const res  = await fetch(`/api/properties/${warehouseId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch property');
        setWarehouseData(data.property);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load property');
      } finally {
        setLoading(false);
      }
    };
    fetchWarehouse();
  }, [warehouseId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader className="animate-spin h-6 w-6 text-muted-foreground" />
          <p className="text-[13.5px] text-muted-foreground">Loading property details…</p>
        </div>
      </div>
    );
  }

  if (error || !warehouseData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-[15px] font-semibold text-foreground mb-1">Property Not Found</p>
          <p className="text-[13px] text-muted-foreground mb-5">
            {error || 'This property does not exist or you do not have permission to edit it.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/property')}
            className="h-9 px-5 text-[13px]"
          >
            Back to Listings
          </Button>
        </div>
      </div>
    );
  }

  return <WarehouseEditForm warehouseId={warehouseId} initialData={warehouseData} />;
}