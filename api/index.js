// ⚠️ মনে রাখবেন: এখানে ওপরে কোনো 'runtime: edge' থাকবে না! এটি ডিফল্ট Serverless হিসেবে চলবে।

const BOT_TOKEN = "5941791142:AAFFeBSWyzt5AlnM0yQH6u3bVmyzldyYDRk";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS, POST",
  "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Range",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Content-Disposition",
  "Access-Control-Max-Age": "86400"
};

export default async function handler(request) {
  // OPTIONS রিকোয়েস্ট হ্যান্ডেল করা
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const fileId = url.searchParams.get("file_id");
  const currentDomain = `https://${url.host}`;

  // 🎯 ১. ফাইল ডাউনলোডের লজিক (GET Request)
  if (fileId && request.method === "GET") {
    try {
      const customFileName = url.searchParams.get("name");
      const getFileUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`;
      const fileRes = await fetch(getFileUrl);
      const fileData = await fileRes.json();

      if (!fileData.ok) {
        return new Response("File not found on Telegram", { status: 404, headers: CORS_HEADERS });
      }

      const filePath = fileData.result.file_path;
      const telegramDirectLink = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

      const forwardHeaders = new Headers();
      const rangeHeader = request.headers.get("range");
      if (rangeHeader) forwardHeaders.set("range", rangeHeader);
      forwardHeaders.set("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

      const fileResponse = await fetch(telegramDirectLink, { headers: forwardHeaders });
      const responseHeaders = new Headers(CORS_HEADERS);
      
      responseHeaders.set("Content-Type", fileResponse.headers.get("content-type") || "application/octet-stream");
      if (fileResponse.headers.get("content-range")) {
        responseHeaders.set("Content-Range", fileResponse.headers.get("content-range"));
      }
      
      const finalFileName = customFileName ? encodeURIComponent(customFileName) : filePath.split('/').pop();
      responseHeaders.set("Content-Disposition", `attachment; filename="${finalFileName}"`);
      responseHeaders.set("Cache-Control", "public, max-age=3600");

      return new Response(fileResponse.body, { status: fileResponse.status, headers: responseHeaders });
    } catch (err) {
      return new Response("Download Error: " + err.message, { status: 500, headers: CORS_HEADERS });
    }
  }

  // 🎯 ২. টেলিগ্রাম বটের লজিক (POST Request)
  if (request.method === "POST") {
    try {
      const payload = await request.json();
      const message = payload.message || payload.edited_message;
      
      if (message && message.chat) {
        const chatId = message.chat.id;
        const userText = message.text ? message.text.trim() : "";

        if (userText === "/start") {
          await sendMsg(chatId, "👋 হ্যালো! আমি এখন সম্পূর্ণ সচল আছি।\n\nআমাকে যেকোনো ফাইল বা ভিডিও পাঠান, আমি ডাউনলোড লিঙ্ক বানিয়ে দেব!");
        } 
        else if (message.document || message.video) {
          const media = message.document || message.video;
          const fId = media.file_id;
          const fName = media.file_name || (message.video ? "video.mp4" : "file");

          const finalDownloadLink = `${currentDomain}/api?file_id=${fId}&name=${encodeURIComponent(fName)}`;
          await sendMsg(chatId, `🚀 ডাউনলোড লিংক রেডি!\n\n📂 ফাইল: ${fName}\n\n🔗 লিংক:\n${finalDownloadLink}`);
        } 
        else {
          await sendMsg(chatId, "আমাকে একটি ফাইল বা ভিডিও পাঠান, আমি ডাউনলোড লিংক জেনারেট করে দেব।");
        }
      }
    } catch (e) {
      // ব্যাকএন্ড এরর লগ করা, কিন্তু টেলিগ্রামকে ২০২ দিয়ে পাস করা যাতে লুপ না হয়
      console.error("Payload error:", e);
    }
    return new Response("OK", { status: 200 });
  }

  return new Response("Serveris Running On Serverless Mode...", { status: 200, headers: CORS_HEADERS });
}

async function sendMsg(chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text })
    });
  } catch (err) {
    console.error("Message send failed:", err);
  }
}
