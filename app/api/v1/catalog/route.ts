import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/client';

/**
 * GET /api/v1/catalog
 * Returns the list of available gift objects
 */
export async function GET() {
  try {
    const supabase = getServerClient();

    const { data: objects, error } = await supabase
      .from('catalog_objects')
      .select('id, name, description, category, price_cents, currency, image_url')
      .eq('available', true)
      .order('name');

    if (error) {
      console.error('Failed to fetch catalog:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch catalog',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      objects: objects || [],
    });
  } catch (error) {
    console.error('Catalog fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
