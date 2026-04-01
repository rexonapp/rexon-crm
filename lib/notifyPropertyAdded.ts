// lib/notifications/notifyPropertyAdded.ts
import { query } from '@/lib/db';

export async function notifyPropertyAdded({
  agentId,
  agentName,
  propertyTitle,
  warehouseId,
}: {
  agentId: string | number;
  agentName: string;
  propertyTitle: string;
  warehouseId: string | number;
}): Promise<void> {
  // ✅ Correct table for superadmins
  const superAdminResult = await query(`SELECT id FROM superadmin_users`);
  if (superAdminResult.rows.length === 0) return;

  const title   = 'New Property Listed';
  const message = `Agent "${agentName}" has listed a new property: "${propertyTitle}".`;

  const values: unknown[] = [];
  const placeholders = superAdminResult.rows.map((row, i) => {
    const base = i * 5; // ✅ 5 values per row
    values.push(
      row.id,        // $1 superadmin_id  ← who receives the notification
      'property',    // $2 type
      title,         // $3 title
      message,       // $4 message
      warehouseId,   // $5 reference_id
    );
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, 'warehouses', false, NOW())`;
  });

  // ✅ Correct table and columns
  await query(
    `INSERT INTO superadmin_notifications
       (superadmin_id, type, title, message, reference_id, reference_table, is_read, created_at)
     VALUES ${placeholders.join(', ')}`,
    values
  );
}