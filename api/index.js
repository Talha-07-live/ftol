export const config = { 
  runtime: 'edge' 
};

// গ্লোবাল CORS হেডারস
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Range",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Content-Disposition",
  "Access-Control-Max-Age": "86400"
};

export default async function handler(request) {
  // ১. প্রি-ফ্লাইট OPTIONS রিকোয়েস্ট দ্রুত হ্যান্ডেল করা
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const fileId = url.searchParams.get("file_id");
  const customFileName = url.searchParams.get("name"); 

  if (!fileId) {
    return new Response("Error: Missing file_id parameter", { status: 400, headers: CORS_HEADERS });
  }

  // 🔒 আপনার দেওয়া লাইভ বট টোকেন
  const BOT_TOKEN = "5941791142:AAFFeBSWyzt5AlnM0yQH6u3bVmyzldyYDRk";

  try {
    // ২. রিয়েল-টাইমে টেলিগ্রাম থেকে ফাইল পাথ তুলে আনা
    const getFileUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`;
    const fileRes = await fetch(getFileUrl);
    const fileData = await fileRes.json();

    if (!fileData.ok) {
      return new Response("Error: File not found or expired on Telegram", { status: 404, headers: CORS_HEADERS });
    }

    const filePath = fileData.result.file_path;
    const telegramDirectLink = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

    // ৩. ক্লায়েন্টের কাছ থেকে আসা ভিডিও সিকিং/ডাউনলোড রেঞ্জ হেডার প্রিপারেশন
    const forwardHeaders = new Headers();
    const rangeHeader = request.headers.get("range");
    if (rangeHeader) {
      forwardHeaders.set("range", rangeHeader);
    }
    forwardHeaders.set("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

    // ৪. টেলিগ্রাম থেকে ফাইলটি ব্যাকগ্রাউন্ডে স্ট্রিম করা
    const fileResponse = await fetch(telegramDirectLink, {
      headers: forwardHeaders
    });

    if (!fileResponse.ok && fileResponse.status !== 206) {
      return new Response("Error: Unable to fetch stream from Telegram source", { status: fileResponse.status, headers: CORS_HEADERS });
    }

    // Vercel Edge 50MB লিমিট প্রোটেকশন গার্ড
    const contentLength = fileResponse.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024 && !rangeHeader) {
      return new Response("Error: File exceeds Vercel 50MB Edge Limit. Use a download manager that requests chunks.", { status: 413, headers: CORS_HEADERS });
    }

    // ৫. রেসপন্স হেডার্স সেটআপ
    const responseHeaders = new Headers(CORS_HEADERS);
    
    responseHeaders.set("Content-Type", fileResponse.headers.get("content-type") || "application/octet-stream");
    
    if (fileResponse.headers.get("content-range")) {
      responseHeaders.set("Content-Range", fileResponse.headers.get("content-range"));
    }
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    // ফাইলের অরিজিনাল বা কাস্টম নাম সেট করা
    const finalFileName = customFileName ? encodeURIComponent(customFileName) : filePath.split('/').pop();
    responseHeaders.set("Content-Disposition", `attachment; filename="${finalFileName}"`);
    
    // রাশ আওয়ার প্রুফ ক্যাশ কন্ট্রোল
    responseHeaders.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=600");

    // ৬. জিরো-মেমোরি ডেটা পাইপিং
    return new Response(fileResponse.body, {
      status: fileResponse.status,
      headers: responseHeaders
    });

  } catch (error) {
    return new Response("Super Bypass Engine Error: " + error.message, { status: 500, headers: CORS_HEADERS });
  }
}
