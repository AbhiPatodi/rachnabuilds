// GET /api/prototype/[projectId]/[...path]
// Serves prototype files from Vercel Blob, same-origin so no X-Frame-Options issues.
// Injects protection scripts into HTML if ?protect=1&client=Name is passed.
import { NextRequest, NextResponse } from 'next/server';

interface RouteContext { params: Promise<{ projectId: string; path: string[] }> }

// Inject anti-theft CSS + JS + watermark into HTML (same as portal viewer)
function injectProtection(html: string, clientName: string): string {
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const css = `<style id="__rb_p__">
*{-webkit-user-select:none!important;-moz-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;}
img,svg,video{pointer-events:none!important;-webkit-user-drag:none!important;}
@media print{html,body{display:none!important;}}
#__rb_wm__{position:fixed;bottom:0;left:0;right:0;z-index:2147483647;background:rgba(11,15,26,0.93);backdrop-filter:blur(10px);border-top:1px solid rgba(6,214,160,0.25);padding:7px 16px;display:flex;align-items:center;justify-content:space-between;font-family:-apple-system,sans-serif;font-size:11px;color:rgba(255,255,255,0.45);pointer-events:none;user-select:none!important;}
#__rb_wm__ strong{color:#06D6A0;}
</style>`;

  const js = `<script id="__rb_g__">
(function(){
  document.addEventListener('contextmenu',function(e){e.preventDefault();e.stopPropagation();return false;},true);
  document.addEventListener('keydown',function(e){
    var k=e.key||'';var c=e.ctrlKey||e.metaKey;
    if(e.keyCode===123)return s(e);
    if(c&&'uUsSaApP'.indexOf(k)>-1)return s(e);
    if(c&&e.shiftKey&&'iIjJcC'.indexOf(k)>-1)return s(e);
  },true);
  function s(e){e.preventDefault();e.stopPropagation();return false;}
  document.addEventListener('selectstart',function(e){e.preventDefault();return false;},true);
  document.addEventListener('dragstart',function(e){e.preventDefault();return false;},true);
  document.addEventListener('copy',function(e){e.preventDefault();return false;},true);
})();
</script>`;

  const watermark = `<div id="__rb_wm__"><span>🔒 Confidential · Shared exclusively with <strong>${clientName}</strong></span><span>© Rachna Builds · ${dateStr} · Do not distribute</span></div>`;

  let result = html;
  if (result.includes('<head>')) result = result.replace('<head>', '<head>' + css);
  else result = css + result;

  if (result.includes('</body>')) result = result.replace('</body>', js + watermark + '</body>');
  else if (result.includes('</html>')) result = result.replace('</html>', js + watermark + '</html>');
  else result = result + js + watermark;

  return result;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { projectId, path: pathSegments } = await params;
  const relativePath = pathSegments.join('/');

  const protect = req.nextUrl.searchParams.get('protect') === '1';
  const clientName = req.nextUrl.searchParams.get('client') ?? 'Client';

  // Construct Vercel Blob URL — files stored as prototypes/{projectId}/{relativePath}
  // The blob store URL is derived from the BLOB_READ_WRITE_TOKEN env var
  // We use the public URL pattern: https://{store}.public.blob.vercel-storage.com/...
  const blobBaseUrl = process.env.BLOB_BASE_URL;
  if (!blobBaseUrl) {
    return new NextResponse('BLOB_BASE_URL not configured', { status: 500 });
  }

  const fileUrl = `${blobBaseUrl}/prototypes/${projectId}/${relativePath}`;

  try {
    const upstream = await fetch(fileUrl);
    if (!upstream.ok) {
      return new NextResponse(`File not found: ${relativePath}`, { status: 404 });
    }

    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
    const isHtml = contentType.includes('text/html') || relativePath.endsWith('.html');

    if (isHtml && protect) {
      const html = await upstream.text();
      const protected_html = injectProtection(html, decodeURIComponent(clientName));
      return new NextResponse(protected_html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          // Explicitly NO X-Frame-Options — served from same origin so safe
        },
      });
    }

    // For non-HTML or non-protected: stream through as-is
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': isHtml ? 'no-store' : 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[prototype serve]', err);
    return new NextResponse('Failed to fetch file', { status: 502 });
  }
}
