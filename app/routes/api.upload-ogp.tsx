import type { ActionFunctionArgs } from 'react-router';

/**
 * Upload OGP image to R2
 */
export async function action({ request, context }: ActionFunctionArgs) {
  console.log('[OGP Upload] Action called');
  const r2 = context.cloudflare.env.R2;
  const db = context.cloudflare.env.DB;

  if (!r2 || !db) {
    console.error('[OGP Upload] R2 or DB not configured');
    return new Response(JSON.stringify({ error: 'R2 or DB not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const formData = await request.formData();
    const scoreId = formData.get('scoreId') as string;
    const imageData = formData.get('image') as string;

    console.log('[OGP Upload] ScoreId:', scoreId, 'ImageData length:', imageData?.length);

    if (!scoreId || !imageData) {
      console.error('[OGP Upload] Missing scoreId or image');
      return new Response(JSON.stringify({ error: 'Missing scoreId or image' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
    console.log('[OGP Upload] Base64 data length:', base64Data.length);

    const buffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    console.log('[OGP Upload] Buffer size:', buffer.length, 'bytes');

    // Upload to R2
    const key = `ogp/${scoreId}.png`;
    console.log('[OGP Upload] Uploading to R2 with key:', key);

    const r2Result = await r2.put(key, buffer, {
      httpMetadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });

    console.log('[OGP Upload] R2 put result:', r2Result);

    // Verify upload by attempting to get the object
    const verifyGet = await r2.get(key);
    if (!verifyGet) {
      console.error('[OGP Upload] Verification failed: Object not found in R2 after upload');
      throw new Error('Upload verification failed: Object not found in R2');
    }
    console.log('[OGP Upload] Upload verified, object exists in R2');

    // Get R2 public URL
    // Note: You need to configure R2 public access or custom domain
    // Format: https://pub-<hash>.r2.dev/<key>
    // Or custom domain: https://r2.yourdomain.com/<key>
    const publicUrl = context.cloudflare.env.R2_PUBLIC_URL || 'https://pub-REPLACE_THIS.r2.dev';
    const url = `${publicUrl}/${key}`;

    // Save URL to database
    await db
      .prepare('UPDATE scores SET ogp_image_url = ? WHERE id = ?')
      .bind(url, scoreId)
      .run();

    console.log('[OGP Upload] Upload successful, URL:', url);
    return new Response(JSON.stringify({ url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[OGP Upload] Failed to upload OGP image:', error);
    return new Response(JSON.stringify({ error: 'Failed to upload image' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * This route only handles uploads via action
 */
export default function UploadOGP() {
  return null;
}
