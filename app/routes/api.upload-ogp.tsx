import type { ActionFunctionArgs } from 'react-router';

/**
 * Upload OGP image to R2
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const r2 = context.cloudflare.env.R2;

  if (!r2) {
    return Response.json({ error: 'R2 not configured' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const scoreId = formData.get('scoreId') as string;
    const imageData = formData.get('image') as string;

    if (!scoreId || !imageData) {
      return Response.json({ error: 'Missing scoreId or image' }, { status: 400 });
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
    const url = `/r2/ogp/${scoreId}.png`;

    return Response.json({ url });
  } catch (error) {
    console.error('Failed to upload OGP image:', error);
    return Response.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}

/**
 * This route only handles uploads via action
 */
export default function UploadOGP() {
  return null;
}
