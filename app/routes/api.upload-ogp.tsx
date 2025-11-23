import type { ActionFunctionArgs } from 'react-router';

/**
 * Upload OGP image to R2
 */
export async function action({ request, context }: ActionFunctionArgs) {
  console.log('[OGP Upload] Action called');
  const r2 = context.cloudflare.env.R2;

  if (!r2) {
    console.error('[OGP Upload] R2 not configured');
    return new Response(JSON.stringify({ error: 'R2 not configured' }), {
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
    const buffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Upload to R2
    const key = `ogp/${scoreId}.png`;
    await r2.put(key, buffer, {
      httpMetadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });

    // Return the R2 URL (you may need to configure a custom domain for R2)
    const url = `/ogp/${scoreId}`;

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
