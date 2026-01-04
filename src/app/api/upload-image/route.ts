import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, validateApiToken } from '@/lib/supabase';
import { corsHeaders, handleCors } from '../middleware';

const MAX_IMAGE_SIZE = 1024 * 1024; // 1MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];

export async function POST(request: NextRequest) {
  // Handle CORS
  const corsResponse = await handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(request.url);
    let token = url.searchParams.get('token');

    if (!token) {
      const authHeader = request.headers.get('authorization');
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

    const { valid } = await validateApiToken(token);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid API Token' },
        { status: 403, headers: corsHeaders() }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: 'No image file provided' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(imageFile.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPEG and PNG images are allowed.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Validate file size
    if (imageFile.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is ${MAX_IMAGE_SIZE / 1024 / 1024}MB.` },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Convert image to base64
    const buffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:${imageFile.type};base64,${base64}`;

    // Store in Supabase Storage or return as data URL for embedding
    // Since images are now stored as base64 data URLs in the questions table,
    // we can either:
    // 1. Upload to Supabase Storage and return the URL
    // 2. Return the base64 data URL directly for embedding in the question

    // Option 1: Upload to Supabase Storage
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${imageFile.name}`;
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('question-images')
      .upload(`images/${fileName}`, new Blob([buffer], { type: imageFile.type }));

    if (uploadError) {
      console.error('Error uploading image to storage:', uploadError);
      // Fallback to returning data URL
      return NextResponse.json(
        {
          success: true,
          message: 'Image ready for embedding',
          data_url: dataUrl,
          size: imageFile.size,
          type: imageFile.type,
        },
        { headers: corsHeaders() }
      );
    }

    // Get the public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('question-images')
      .getPublicUrl(`images/${fileName}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Image uploaded successfully',
        url: publicUrlData.publicUrl,
        data_url: dataUrl,
        size: imageFile.size,
        type: imageFile.type,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Error in POST /api/upload-image:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(),
  });
}
