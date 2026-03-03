// app/api/properties/[warehouseId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ warehouseId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.agentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { warehouseId } = await params;
console.log(warehouseId, "warehouseId")
    const result = await query(
      `SELECT id, property_name, title, description, property_type,
              space_available, space_unit, warehouse_size, available_from,
              price_type, price_per_sqft,
              address, city, state, pincode, road_connectivity,
              contact_person_name, contact_person_phone, contact_person_email, contact_person_designation,
              latitude, longitude, amenities,
              is_verified, is_featured, status, created_at, updated_at
       FROM warehouses
       WHERE id = $1 AND user_id = $2`,
      [warehouseId, session.agentId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Property not found or access denied' },
        { status: 404 }
      );
    }

    const warehouse = result.rows[0];

console.log(result, "result")
    const result1 = await query(
      `SELECT id, title, description, property_type,
              space_available, warehouse_size,
              price_type, price_per_sqft,
              city, state, address,
              latitude, longitude,
              is_verified, is_featured,
              created_at
       FROM warehouses
       WHERE id = $1`,
      [warehouseId]
    );
    console.log(result1, "result1111")

    if (result1.rows.length === 0) {
      return NextResponse.json(
        { error: "PropertyDetails not found" },
        { status: 404 }
      );
    }

    const propertyDetails = result1.rows[0];
    // Fetch associated media
    const mediaResult = await query(
      `SELECT id, file_name, file_type, file_size, s3_url, is_primary, image_order, created_at
       FROM uploads
       WHERE warehouse_id = $1 AND status = 'Active'
       ORDER BY file_type ASC, image_order ASC, created_at ASC`,
      [warehouseId]
    );

    const images = mediaResult.rows.filter(m => m.file_type?.startsWith('image/'));
    const videos = mediaResult.rows.filter(m => m.file_type?.startsWith('video/'));

    // Parse amenities
    let amenities = [];
    if (warehouse.amenities) {
      try {
        amenities = typeof warehouse.amenities === 'string'
          ? JSON.parse(warehouse.amenities)
          : warehouse.amenities;
      } catch { amenities = []; }
    }

    return NextResponse.json({
      success: true,
      property: {
        propertyDetails,
        ...warehouse,
        amenities,
        images,
        videos,
      },
    });

  } catch (error) {
    console.error('Get property error:', error);
    return NextResponse.json({ error: 'Failed to fetch property' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ warehouseId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.agentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { warehouseId } = await params;
    const formData = await request.formData();

    // Verify ownership
    const ownerCheck = await query(
      'SELECT id FROM warehouses WHERE id = $1 AND user_id = $2',
      [warehouseId, session.agentId]
    );
    if (ownerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Property not found or access denied' }, { status: 404 });
    }

    // Extract fields
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || '';
    const propertyType = formData.get('propertyType') as string;
    const totalArea = formData.get('totalArea') as string;
    const sizeUnit = formData.get('sizeUnit') as string || 'sqft';
    const availableFrom = formData.get('availableFrom') as string;
    const listingType = formData.get('listingType') as string;
    const pricePerSqFt = formData.get('pricePerSqFt') as string;
    const totalPrice = formData.get('totalPrice') as string || null;
    const address = formData.get('address') as string;
    const city = formData.get('city') as string;
    const state = formData.get('state') as string;
    const pincode = formData.get('pincode') as string || null;
    const roadConnectivity = formData.get('roadConnectivity') as string || null;
    const latitude = formData.get('latitude') as string || null;
    const longitude = formData.get('longitude') as string || null;
    const contactPersonName = formData.get('contactPersonName') as string || '';
    const contactPersonPhone = formData.get('contactPersonPhone') as string || '';
    const contactPersonEmail = formData.get('contactPersonEmail') as string || '';
    const contactPersonDesignation = formData.get('contactPersonDesignation') as string || '';
    const amenitiesStr = formData.get('amenities') as string;
    const amenities = amenitiesStr ? JSON.parse(amenitiesStr) : [];
    const deletedImageIds = formData.get('deletedImageIds') as string;
    const newImages = formData.getAll('newImages') as File[];
    const newVideos = formData.getAll('newVideos') as File[];

    if (!title || !propertyType || !totalArea || !availableFrom || !listingType || !pricePerSqFt || !address || !city || !state) {
      return NextResponse.json(
        { error: 'Please fill in all required fields' },
        { status: 400 }
      );
    }

    // Map property type
    const propertyTypeMap: Record<string, string> = {
      'Warehouse': 'Warehouse', 'Cold Storage': 'Warehouse', 'Godown': 'Warehouse',
      'Industrial Shed': 'Industrial', 'Manufacturing Unit': 'Industrial', 'Factory Space': 'Industrial',
      'Logistics Hub': 'Commercial', 'Distribution Center': 'Commercial',
    };
    const normalizedPropertyType = propertyTypeMap[propertyType] || 'Warehouse';

    const roadConnectivityMap: Record<string, string> = {
      'National Highway': 'National Highway', 'State Highway': 'State Highway',
      'Main Road': 'City Road', 'Interior Road': 'Other', 'Service Road': 'Other',
      'City Road': 'City Road', 'Other': 'Other',
    };
    const normalizedRoadConnectivity = roadConnectivity
      ? roadConnectivityMap[roadConnectivity] || 'Other'
      : null;

    const priceType = listingType === 'rent' ? 'Rent' : listingType === 'sale' ? 'Sale' : 'Lease';

    // Update warehouse record
    await query(
      `UPDATE warehouses SET
        property_name = $1, title = $2, description = $3, property_type = $4,
        space_available = $5, space_unit = $6, warehouse_size = $7, available_from = $8,
        price_type = $9, price_per_sqft = $10,
        address = $11, city = $12, state = $13, pincode = $14, road_connectivity = $15,
        contact_person_name = $16, contact_person_phone = $17, contact_person_email = $18,
        contact_person_designation = $19, latitude = $20, longitude = $21,
        amenities = $22, status = 'Pending', updated_at = NOW()
       WHERE id = $23 AND user_id = $24`,
      [
        title, title, description, normalizedPropertyType,
        parseFloat(totalArea), sizeUnit, parseFloat(totalArea), availableFrom,
        priceType, parseFloat(pricePerSqFt),
        address, city, state, pincode, normalizedRoadConnectivity,
        contactPersonName, contactPersonPhone, contactPersonEmail, contactPersonDesignation,
        latitude ? parseFloat(latitude) : null, longitude ? parseFloat(longitude) : null,
        JSON.stringify(amenities), warehouseId, session.agentId
      ]
    );

    // Delete removed images
    if (deletedImageIds) {
      const ids = JSON.parse(deletedImageIds) as number[];
      if (ids.length > 0) {
        await query(
          `UPDATE uploads SET status = 'Deleted' WHERE id = ANY($1) AND warehouse_id = $2`,
          [ids, warehouseId]
        );
      }
    }

    // Upload new images
    if (newImages.length > 0) {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const { randomBytes } = await import('crypto');

      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'ap-south-2',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
      const BUCKET_NAME = 'rexon-web';

      // Get current max image_order
      const orderResult = await query(
        'SELECT COALESCE(MAX(image_order), -1) as max_order FROM uploads WHERE warehouse_id = $1 AND status = $2 AND file_type LIKE $3',
        [warehouseId, 'Active', 'image/%']
      );
      let startOrder = (orderResult.rows[0]?.max_order ?? -1) + 1;

      const uploadPromises = newImages.map(async (file, idx) => {
        const ext = file.name.split('.').pop();
        const rand = randomBytes(16).toString('hex');
        const s3Key = `${session.agentId}/warehouses/${warehouseId}/images/${Date.now()}-${rand}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        await s3Client.send(new PutObjectCommand({
          Bucket: BUCKET_NAME, Key: s3Key, Body: buffer, ContentType: file.type,
        }));
        const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-2'}.amazonaws.com/${s3Key}`;
        await query(
          `INSERT INTO uploads (user_id, warehouse_id, image_order, is_primary, file_name, file_type, file_size, s3_key, s3_url, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Active')`,
          [session.agentId, warehouseId, startOrder + idx, false, file.name, file.type, file.size, s3Key, s3Url]
        );
      });

      await Promise.all(uploadPromises);
    }

    // Upload new videos
    if (newVideos.length > 0) {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const { randomBytes } = await import('crypto');

      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'ap-south-2',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
      const BUCKET_NAME = 'rexon-web';

      const orderResult = await query(
        'SELECT COALESCE(MAX(image_order), -1) as max_order FROM uploads WHERE warehouse_id = $1 AND status = $2 AND file_type LIKE $3',
        [warehouseId, 'Active', 'video/%']
      );
      let startOrder = (orderResult.rows[0]?.max_order ?? -1) + 1;

      const uploadPromises = newVideos.map(async (file, idx) => {
        const ext = file.name.split('.').pop();
        const rand = randomBytes(16).toString('hex');
        const s3Key = `${session.agentId}/warehouses/${warehouseId}/videos/${Date.now()}-${rand}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        await s3Client.send(new PutObjectCommand({
          Bucket: BUCKET_NAME, Key: s3Key, Body: buffer, ContentType: file.type,
        }));
        const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-2'}.amazonaws.com/${s3Key}`;
        await query(
          `INSERT INTO uploads (user_id, warehouse_id, image_order, is_primary, file_name, file_type, file_size, s3_key, s3_url, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Active')`,
          [session.agentId, warehouseId, startOrder + idx, false, file.name, file.type, file.size, s3Key, s3Url]
        );
      });

      await Promise.all(uploadPromises);
    }

    return NextResponse.json({
      success: true,
      message: 'Property updated successfully',
    });

  } catch (error) {
    console.error('Update property error:', error);
    return NextResponse.json({ error: 'Failed to update property' }, { status: 500 });
  }
}