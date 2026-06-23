// 🔒 আপনার টেলিগ্রাম বটের টোকেন
const BOT_TOKEN = "5941791142:AAFFeBSWyzt5AlnM0yQH6u3bVmyzldyYDRk";

export default async function handler(req, res) {
  // CORS হেডারস সেট করা (Node.js style)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS, POST");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Range");
  res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Content-Disposition");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { file_id, name } = req.query;
  const currentDomain = `https://${req.headers.host}`;

  // 🎯 ১. ফাইল ডাউনলোডের লজিক (GET Request)
  if (file_id && req.method === "GET") {
    try {
      const getFileUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${file_id}`;
      const fileRes = await fetch(getFileUrl);
      const fileData = await fileRes.json();

      if (!fileData.ok) {
        return res.status(404).send("File not found on Telegram");
      }

      const filePath = fileData.result.file_path;
      const telegramDirectLink = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

      // ক্লায়েন্টের হেডার ফরওয়ার্ড করা
      const forwardHeaders = {};
      if (req.headers.range) {
        forwardHeaders["range"] = req.headers.range;
      }
      forwardHeaders["user-agent"] = "Mozilla/5.0";

      const fileResponse = await fetch(telegramDirectLink, { headers: forwardHeaders });

      // রেসপন্স হেডার সেট করা
      res.setHeader("Content-Type", fileResponse.headers.get("content-type") || "application/octet-stream");
      if (fileResponse.headers.get("content-range")) {
        res.setHeader("Content-Range", fileResponse.headers.get("content-range"));
      }
      if (fileResponse.headers.get("content-length")) {
        res.setHeader("Content-Length", fileResponse.headers.get("content-length"));
      }

      const finalFileName = name ? encodeURIComponent(name) : filePath.split('/').pop();
      res.setHeader("Content-Disposition", `attachment; filename="${finalFileName}"`);
      res.setHeader("Cache-Control", "public, max-age=3600");

      // ফাইল স্ট্রিম করা (Node.js Response formatting)
      const buffer = await fileResponse.arrayBuffer();
      return res.status(fileResponse.status).send(Buffer.from(buffer));

    } catch (err) {
      return res.status(500).send("Download Error: " + err.message);
    }
  }

  // 🎯 ২. টেলিগ্রাম বটের লজিক (POST Request)
  if (req.method === "POST") {
    try {
      const payload = req.body; // Vercel Node.js রানটাইমে বডি অটোমেটিক পার্স হয়ে যায়
      
      if (payload && payload.message && payload.message.chat) {
        const chatId = payload.message.chat.id;
        const userText = payload.message.text ? payload.message.text.trim() : "";

        if (userText === "/start") {
          await sendMsg(chatId, "👋 হ্যালো! আমি এখন সম্পূর্ণ সচল আছি।\n\nআমাকে যেকোনো ফাইল বা ভিডিও পাঠান, আমি ডাউনলোড লিঙ্ক বানিয়ে দেব!");
        } 
        else if (payload.message.document || payload.message.video) {
          const media = payload.message.document || payload.message.video;
          const fId = media.file_id;
          const fName = media.file_name || (payload.message.video ? "video.mp4" : "file");

          const finalDownloadLink = `${currentDomain}/api?file_id=${fId}&name=${encodeURIComponent(fName)}`;
          await sendMsg(chatId, `🚀 ডাউনলোড লিংক রেডি!\n\n📂 ফাইল: ${fName}\n\n🔗 লিংক:\n${finalDownloadLink}`);
        } 
        else {
          await sendMsg(chatId, "আমাকে একটি ফাইল বা ভিডিও পাঠান, আমি ডাউনলোড লিংক জেনারেট করে দেব।");
        }
      }
    } catch (e) {
      console.error("Payload error:", e.message);
    }

    // টেলিগ্রামকে অবশ্যই ২০০ রেসপন্স দিতে হবে
    return res.status(200).send("OK");
  }

  // নরমাল ব্রাউজার ভিজিট
  return res.status(200).send("Server is Running Perfect on Node.js Serverless mode...");
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
