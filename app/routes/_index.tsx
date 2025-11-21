import { redirect } from 'react-router';
import type { Route } from './+types/_index';

/**
 * Root index route - detects browser language and redirects to appropriate language route
 */
export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);

  // Check if there's a lang cookie
  const cookieHeader = request.headers.get('Cookie');
  let langFromCookie: string | null = null;

  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const langCookie = cookies.find(c => c.startsWith('lang='));
    if (langCookie) {
      langFromCookie = langCookie.split('=')[1];
    }
  }

  // Determine language: cookie > Accept-Language header
  let lang = 'en';

  if (langFromCookie === 'ja' || langFromCookie === 'en') {
    lang = langFromCookie;
  } else {
    // Check Accept-Language header
    const acceptLanguage = request.headers.get('Accept-Language');
    if (acceptLanguage && acceptLanguage.toLowerCase().includes('ja')) {
      lang = 'ja';
    }
  }

  // Redirect to language-specific route
  return redirect(`/${lang}`);
}
