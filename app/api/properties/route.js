import { NextResponse } from 'next/server';
import { getProperties, bulkUploadProperties, validatePropertyRow } from '@/lib/canvass-data';

/**
 * GET /api/properties
 * Returns all properties.
 *
 * TODO: Supabase migration →
 *   const { data, error } = await supabase.from('properties').select('*');
 *   return NextResponse.json(data);
 */
export async function GET() {
  try {
    const properties = await getProperties();
    return NextResponse.json({ properties }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/properties
 * Bulk upload properties.
 * Body: { rows: Array<{ address, lat, lng, year_built?, property_type?, notes? }> }
 *
 * TODO: Supabase migration →
 *   const { data, error } = await supabase.from('properties').insert(validRows).select();
 *   return NextResponse.json({ imported: data.length });
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { rows } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
    }

    // Validate each row
    const validRows = [];
    const errors = [];

    rows.forEach((row, i) => {
      const result = validatePropertyRow(row);
      if (result.valid) {
        validRows.push(row);
      } else {
        errors.push({ row: i + 1, messages: result.errors });
      }
    });

    if (validRows.length === 0) {
      return NextResponse.json({ error: 'No valid rows', validationErrors: errors }, { status: 400 });
    }

    const count = await bulkUploadProperties(validRows);

    return NextResponse.json({
      imported: count,
      skipped: errors.length,
      validationErrors: errors,
    }, { status: 201 });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
