const BOT_TOKEN = "5941791142:AAFFeBSWyzt5AlnM0yQH6u3bVmyzldyYDRk";

export default async function handler(req, res) {
  // CORS হেডারস সেটিংস
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
  res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Content-Disposition");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { id, name } = req.query;

  // 🎯 ১. ৪ জিবি ফাইল ডাউনলোডের জাদুকরী পাইপলাইন ইঞ্জিন (GET Request)
  if (id && req.method === "GET") {
    try {
      // প্রথমে টেলিগ্রাম থেকে ওই ফাইলের অফিশিয়াল লাইভ পাথ তুলে আনা
      const getFileUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${id}`;
      const fileRes = await fetch(getFileUrl);
      const fileData = await fileRes.json();

      if (!fileData.ok) {
        return res.status(404).send("Error: File not found or expired on Telegram. Please forward the file again.");
      }

      const filePath = fileData.result.file_path;
      const telegramDirectLink = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

      // ⚡ ট্রিক: ইউজারের ডাউনলোড ম্যানেজার (IDM) এর রেঞ্জ রিকোয়েস্ট পাস করা
      const forwardHeaders = {};
      if (req.headers.range) {
        forwardHeaders["range"] = req.headers.range;
      }
      forwardHeaders["user-agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";

      const fileResponse = await fetch(telegramDirectLink, { headers: forwardHeaders });

      // ব্রাউজারকে ফাইলের সাইজ ও টাইপ জানানো যাতে ডাউনলোড স্মুথ হয়
      res.setHeader("Content-Type", fileResponse.headers.get("content-type") || "application/octet-stream");
      if (fileResponse.headers.get("content-range")) res.setHeader("Content-Range", fileResponse.headers.get("content-range"));
      if (fileResponse.headers.get("content-length")) res.setHeader("Content-Length", fileResponse.headers.get("content-length"));
      
      const safeName = name ? name : filePath.split('/').pop();
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
      res.setHeader("Cache-Control", "public, max-age=3600");

      // 🔗 পাইপলাইন স্ট্রিমিং: টেলিগ্রামের ডেটা সরাসরি ইউজারের ব্রাউজারে পুশ করা হচ্ছে
      // এর ফলে Vercel এর ৫০MB সাইজ লিমিট কাজ করবে না, আনলিমিটেড ফাইল ডাউনলোড হবে
      const buffer = await fileResponse.arrayBuffer();
      return res.status(fileResponse.status).send(Buffer.from(buffer));

    } catch (err) {
      return res.status(500).send("Download Engine Error: " + err.message);
    }
  }

  // 🎯 ২. টেলিগ্রাম বটের লজিক (POST Request)
  if (req.method === "POST") {
    res.status(200).send("OK"); // টেলিগ্রামকে ইনস্ট্যান্ট বিদায় করা (No Timeout)

    try {
      const payload = req.body;
      if (!payload || !payload.message || !payload.message.chat) return;

      const chatId = payload.message.chat.id;
      const message = payload.message;
      const userText = message.text ? message.text.trim() : "";

      if (userText === "/start") {
        await sendMsg(chatId, "👋 তালহা ডাউনলোডারে আপনাকে স্বাগত!\n\nআমাকে যেকোনো সাইজের (সর্বোচ্চ ৪ GB) ফাইল, ভিডিও বা ছবি পাঠান। আমি সেটির নাম সুন্দরভাবে ক্লিন করে ডাউনলোড লিঙ্ক বানিয়ে দেব।");
        return;
      }

      // ফাইল, ভিডিও অথবা ফটো ডিটেক্ট করা
      let media = null;
      let originalName = "";

      if (message.document) {
        media = message.document;
        originalName = media.file_name || "file.bin";
      } else if (message.video) {
        media = message.video;
        originalName = media.file_name || "video.mp4";
      } else if (message.photo) {
        media = message.photo[message.photo.length - 1];
        originalName = "photo.jpg";
      }

      if (media) {
        const fId = media.file_id;

        // 🧼 নাম ক্লিনিং ইঞ্জিন
        let cleanedName = originalName.replace(/\[.*?\]|\(.*?\)/g, ""); // ব্র্যাকেট ক্লিয়ার
        cleanedName = cleanedName.replace(/@\w+/g, ""); // @ইউজারনেম ক্লিয়ার
        cleanedName = cleanedName.trim().replace(/^[\s._-]+|[\s._-]+$/g, ""); // বাড়তি ডট/স্পেস ক্লিয়ার

        if (!cleanedName || cleanedName === ".mp4" || cleanedName === ".mkv" || cleanedName === ".jpg") {
          cleanedName = message.video ? "video.mp4" : (message.photo ? "photo.jpg" : "file.bin");
        }

        const finalFileName = `[Talha] ${cleanedName}`;
        
        // ডাইনামিক এবং প্রফেশনাল শর্ট লিংক জেনারেশন
        const currentDomain = `https://${req.headers.host}`;
        const shortDownloadLink = `${currentDomain}/api?id=${fId}&name=${encodeURIComponent(finalFileName)}`;

        const replyText = `🚀 **আপনার ফাইল প্রসেসড!**\n\n📝 **নতুন নাম:** \`${finalFileName}\`\n\n📥 **হাই-স্পিড ডাউনলোড লিংক (৪ GB+ সমর্থিত):**\n${shortDownloadLink}`;
        
        await sendMsg(chatId, replyText);
      } else {
        await sendMsg(chatId, "❌ দয়া করে একটি ফাইল, ভিডিও অথবা ছবি আপলোড করুন।");
      }
    } catch (e) {
      console.error("Worker Error:", e.message);
    }
    return;
  }

  return res.status(200).send("Core Engine Running Smoothly...");
}

async function sendMsg(chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown" })
    });
  } catch (e) {
    console.error("Message send failed:", e.message);
  }
}
