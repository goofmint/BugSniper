/**
 * Generate OGP share image using Canvas
 */

/**
 * Load image with CORS support
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Convert Blob to Base64 data URL
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Score data for OGP image generation
 */
export type ShareImageData = {
  score: number;
  issuesFound: number;
  totalIssues: number;
  accuracy: number;
  codeLanguage: string;
};

/**
 * Get display name for code language
 */
function getCodeLanguageDisplay(codeLanguage: string): string {
  const languageMap: Record<string, string> = {
    javascript: 'JavaScript',
    python: 'Python',
    php: 'PHP',
    ruby: 'Ruby',
    java: 'Java',
    dart: 'Dart',
  };
  return languageMap[codeLanguage] || codeLanguage;
}

/**
 * Generate OGP share image
 * Size: 1200x630px (X/Twitter OGP standard)
 */
export async function generateShareImage(data: ShareImageData): Promise<Blob> {
  const { score, issuesFound, totalIssues, accuracy, codeLanguage } = data;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Background (black)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 1200, 630);

  // Border (#F1DCEE, 8px)
  ctx.strokeStyle = '#F1DCEE';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 1192, 622);

  // Title "Bug Sniper"
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Bug Sniper', 600, 150);

  // Score (large, blue)
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 96px Arial, sans-serif';
  ctx.fillText(`${score} pt`, 600, 280);

  // Stats row
  ctx.fillStyle = '#ffffff';
  ctx.font = '32px Arial, sans-serif';
  ctx.fillText(`Issues Found: ${issuesFound}/${totalIssues}`, 400, 370);
  ctx.fillText(`Accuracy: ${(accuracy * 100).toFixed(1)}%`, 800, 370);

  // Code Language
  ctx.fillStyle = '#94a3b8';
  ctx.font = '28px Arial, sans-serif';
  ctx.fillText(getCodeLanguageDisplay(codeLanguage), 600, 430);

  // Load and draw CodeRabbit icon (bottom right)
  try {
    const icon = await loadImage('/images/coderabbit-icon.png');
    ctx.drawImage(icon, 1100, 540, 60, 60);
  } catch (error) {
    console.error('Failed to load CodeRabbit icon:', error);
    // Draw fallback circle
    ctx.fillStyle = '#F1DCEE';
    ctx.beginPath();
    ctx.arc(1130, 570, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText('CR', 1130, 580);
  }

  // Convert to Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      'image/png',
      0.95
    );
  });
}

/**
 * Generate and upload OGP image to server
 * Returns the data URL of the generated image
 */
export async function generateAndUploadOGPImage(
  scoreId: string,
  data: ShareImageData
): Promise<string> {
  // Generate image
  const blob = await generateShareImage(data);

  // Convert to base64
  const base64 = await blobToBase64(blob);

  // Upload to server
  const formData = new FormData();
  formData.append('scoreId', scoreId);
  formData.append('image', base64);

  const response = await fetch('/api/upload-ogp', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload OGP image');
  }

  const result = await response.json();
  return result.url;
}
