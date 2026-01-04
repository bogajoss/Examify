import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, validateApiToken } from '@/lib/supabase';
import { corsHeaders, handleCors } from '../middleware';

export async function GET(req: NextRequest) {
  // Handle CORS
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    let token = url.searchParams.get('token');

    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing API Token' },
        { status: 401, headers: corsHeaders() }
      );
    }

    const { valid, isAdmin } = await validateApiToken(token);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid API Token' },
        { status: 403, headers: corsHeaders() }
      );
    }

    // Only admins can view all tokens
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403, headers: corsHeaders() }
      );
    }

    const { data: tokens, error } = await supabaseAdmin
      .from('api_tokens')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tokens:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders() }
      );
    }

    return NextResponse.json(
      { success: true, data: tokens },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error in GET /api/tokens:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function POST(req: NextRequest) {
  // Handle CORS
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    let token = url.searchParams.get('token');

    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing API Token' },
        { status: 401, headers: corsHeaders() }
      );
    }

    const { valid, isAdmin } = await validateApiToken(token);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid API Token' },
        { status: 403, headers: corsHeaders() }
      );
    }

    // Only admins can create tokens
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403, headers: corsHeaders() }
      );
    }

    const body = await req.json();
    const { name, is_admin = false } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Missing token name' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Generate random token string (not UUID format)
    const new_token = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);

    // For user_id, generate a simple UUID format string
    const userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

    // Database generates UUID for id via uuid_generate_v4() default value
    const { data: newToken, error } = await supabaseAdmin
      .from('api_tokens')
      .insert({
        user_id: userId,
        token: new_token,
        name,
        is_active: true,
        is_admin: is_admin,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating token:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders() }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Token created successfully',
        data: newToken,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error in POST /api/tokens:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function DELETE(req: NextRequest) {
  // Handle CORS
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    let token = url.searchParams.get('token');

    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing API Token' },
        { status: 401, headers: corsHeaders() }
      );
    }

    const { valid, isAdmin } = await validateApiToken(token);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid API Token' },
        { status: 403, headers: corsHeaders() }
      );
    }

    // Only admins can delete tokens
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403, headers: corsHeaders() }
      );
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing token ID' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const { error } = await supabaseAdmin
      .from('api_tokens')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting token:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: corsHeaders() }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Token deleted successfully' },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error in DELETE /api/tokens:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(),
  });
}
