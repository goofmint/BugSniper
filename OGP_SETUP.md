# OGP Image Setup Instructions

## 1. Run Database Migration

Add the `ogp_image_url` column to the scores table:

```bash
npx wrangler d1 execute bug-sniper --remote --file=migrations/0002_add_ogp_image_url.sql
```

## 2. Enable R2 Public Access

To make OGP images publicly accessible, you need to enable public access for your R2 bucket:

### Option A: Enable via Cloudflare Dashboard (Recommended)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** > **bug-sniper-img** bucket
3. Go to **Settings** tab
4. Under **Public access**, click **Allow Access**
5. Copy the **Public R2.dev Bucket URL** (e.g., `https://pub-8b1392d3f4654878bb57484ca498074f.r2.dev`)
6. Update `wrangler.jsonc` with the copied URL:
   ```jsonc
   "vars": {
     "R2_PUBLIC_URL": "https://pub-YOUR_HASH_HERE.r2.dev"
   }
   ```

### Option B: Enable via CLI

```bash
# Enable public access
npx wrangler r2 bucket public-access allow bug-sniper-img

# Get the public URL
npx wrangler r2 bucket info bug-sniper-img
```

Then update `wrangler.jsonc` with the public URL.

## 3. Deploy

After updating the R2_PUBLIC_URL in `wrangler.jsonc`:

```bash
npm run deploy
```

## How It Works

1. When a player finishes a game and views the result page, the browser generates an OGP image using Canvas
2. The image is automatically uploaded to R2 storage via `/api/upload-ogp`
3. The R2 public URL is saved to the database in the `ogp_image_url` column
4. When someone shares the result page, social media platforms will fetch the OGP image from the R2 public URL

## Testing

1. Play the game and complete it
2. Check the result page's OGP meta tag - it should show the R2 URL:
   ```html
   <meta property="og:image" content="https://pub-xxx.r2.dev/ogp/score-id.png" />
   ```
3. Test with social media preview tools:
   - [Twitter Card Validator](https://cards-dev.twitter.com/validator)
   - [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
   - [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
