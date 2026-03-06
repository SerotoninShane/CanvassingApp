import { NextResponse } from 'next/server';
import { getPropertyById, updateProperty } from '@/lib/canvass-data';

/**
 * GET /api/properties/[id]
 * Returns a single property.
 *
 * TODO: Supabase migration →
 *   const { data, error } = await supabase.from('properties').select('*').eq('id', params.id).single();
 *   return NextResponse.json(data);
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const property = await getPropertyById(id);
    return NextResponse.json({ property }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}

/**
 * PATCH /api/properties/[id]
 * Update a property's status, notes, etc.
 * Body: { canvass_status?, notes?, canvassed_by? }
 *
 * TODO: Supabase migration →
 *   const { data, error } = await supabase
 *     .from('properties')
 *     .update(updates)
 *     .eq('id', params.id)
 *     .select()
 *     .single();
 *   return NextResponse.json(data);
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const updates = await request.json();

    // Whitelist allowed fields
    const allowed = ['canvass_status', 'notes', 'canvassed_by'];
    const sanitized = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) sanitized[key] = updates[key];
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Validate status if provided
    const validStatuses = ['not_visited', 'contacted', 'not_home', 'no_interest', 'interested'];
    if (sanitized.canvass_status && !validStatuses.includes(sanitized.canvass_status)) {
      return NextResponse.json({ error: 'Invalid canvass_status' }, { status: 400 });
    }

    const updated = await updateProperty(id, sanitized);
    return NextResponse.json({ property: updated }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
