const BOT_TOKEN = "5941791142:AAFFeBSWyzt5AlnM0yQH6u3bVmyzldyYDRk";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { type, id } = req.query;

  // 🎯 ১. ৪ জিবি ফাইল ডাউনলোডের আল্ট্রা-ফাস্ট ইঞ্জিন (GET Request)
  if (type && id && req.method === "GET") {
    try {
      // ২০MB লিমিট বাইপাস করে সরাসরি টেলিগ্রাম সিডিএন রুটে রিডাইরেক্ট (৪ GB+ সাপোর্টেড)
      const telegramDirectLink = `https://api.telegram.org/file/bot${BOT_TOKEN}/${type}/${id}`;
      
      res.writeHead(302, { Location: telegramDirectLink });
      return res.end();
    } catch (err) {
      return res.status(500).send("Download Engine Error: " + err.message);
    }
  }

  // 🎯 ২. টেলিগ্রাম বটের লজিক (POST Request)
  if (req.method === "POST") {
    // টেলিগ্রামকে সাথে সাথে ২০০ ওকে দেওয়া যাতে টাইমআউট বা মেসেজ ড্রপ না হয়
    res.status(200).send("OK");

    try {
      const payload = req.body;
      if (!payload || !payload.message || !payload.message.chat) return;

      const chatId = payload.message.chat.id;
      const message = payload.message;
      const userText = message.text ? message.text.trim() : "";

      if (userText === "/start") {
        await sendMsg(chatId, "👋 তালহা ডাউনলোডারে আপনাকে স্বাগত!\n\nআমাকে যেকোনো সাইজের (১ MB থেকে ৪ GB+) ফাইল, ভিডিও বা ছবি পাঠান। আমি সেটির নাম নিখুঁতভাবে পরিবর্তন করে একটি কাস্টম ছোট ডাউনলোড লিংক বানিয়ে দেব।");
        return;
      }

      // ফাইল, ভিডিও অথবা ফটো চেক করা
      let media = null;
      let mediaType = "";
      let originalName = "";

      if (message.document) {
        media = message.document;
        mediaType = "documents";
        originalName = media.file_name || "file.bin";
      } else if (message.video) {
        media = message.video;
        mediaType = "videos";
        originalName = media.file_name || "video.mp4";
      } else if (message.photo) {
        // ফটো পাঠালে টেলিগ্রাম বিভিন্ন সাইজের অ্যারে দেয়, আমরা সবচেয়ে বড় সাইজেরটা নেব
        media = message.photo[message.photo.length - 1];
        mediaType = "photos";
        originalName = "photo.jpg";
      }

      // যদি ভ্যালিড মিডিয়া পাওয়া যায়
      if (media && mediaType) {
        const fId = media.file_id;

        // 🧼 নাম ক্লিনিং ইঞ্জিন (Regex)
        let cleanedName = originalName.replace(/\[.*?\]|\(.*?\)/g, ""); // ব্র্যাকেট ক্লিয়ার
        cleanedName = cleanedName.replace(/@\w+/g, ""); // @ইউজারনেম বা চ্যানেলের নাম ক্লিয়ার
        cleanedName = cleanedName.trim().replace(/^[\s._-]+|[\s._-]+$/g, ""); // বাড়তি ডট বা স্পেস ক্লিয়ার

        if (!cleanedName || cleanedName === ".mp4" || cleanedName === ".mkv" || cleanedName === ".jpg") {
          cleanedName = mediaType === "videos" ? "video.mp4" : (mediaType === "photos" ? "photo.jpg" : "file.bin");
        }

        // শুরুতে ব্র্যান্ড নাম '[Talha]' যুক্ত করা
        const finalFileName = `[Talha] ${cleanedName}`;
        
        // আল্ট্রা-শর্ট ডাইনামিক ডাউনলোড লিংক (কোনো getFile ঝামেলা ছাড়া)
        const currentDomain = `https://${req.headers.host}`;
        const shortDownloadLink = `${currentDomain}/api?type=${mediaType}&id=${fId}`;

        const replyText = `🚀 **আপনার ফাইল প্রসেসড!**\n\n📝 **নতুন নাম:** \`${finalFileName}\`\n\n📥 **হাই-স্পিড ডাউনলোড লিংক (৪ GB+ সমর্থিত):**\n${shortDownloadLink}`;
        
        await sendMsg(chatId, replyText);
      } else {
        await sendMsg(chatId, "❌ দয়া করে একটি ফাইল, ভিডিও অথবা ছবি (As file/compressed) আপলোড করুন।");
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
