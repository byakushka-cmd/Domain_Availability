import type { Page } from '@playwright/test';

// Web tests stay on www.wix.com and never reach a purchase step: a top-level navigation
// to another host, or to a checkout or cart path, is aborted. Server redirects are not
// intercepted by page.route, so tests also never click "Make It Yours" or "Get It".
export async function blockLeavingWix(page: Page): Promise<void> {
  await page.route('**/*', route => {
    const request = route.request();
    if (!request.isNavigationRequest() || request.frame() !== page.mainFrame()) return route.continue();
    const url = new URL(request.url());
    if (url.hostname !== 'www.wix.com' || /checkout|cart/i.test(url.pathname)) return route.abort();
    return route.continue();
  });
}
