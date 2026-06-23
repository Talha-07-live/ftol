const BOT_TOKEN = "5941791142:AAFFeBSWyzt5AlnM0yQH6u3bVmyzldyYDRk";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { id } = req.query;
  const currentDomain = `https://${req.headers.host}`;

  // 🎯 ১. ফাইল ডাউনলোডের মেইন ইঞ্জিন (GET Request)
  if (id && req.method === "GET") {
    try {
      // গ্লোবাল ৪ জিবি+ লিমিট বাইপাস সিডিএন প্রোটোকল লিংক
      const telegramCdnLink = `https://api.telegram.org/file/bot${BOT_TOKEN}/remote/${id}`;
      
      // ক্লায়েন্টকে সরাসরি সিডিএন লিংকে ৩0২ রিডাইরেক্ট করা
      res.writeHead(302, { Location: telegramCdnLink });
      return res.end();
    } catch (err) {
      return res.status(500).send("Download Engine Error: " + err.message);
    }
  }

  // 🎯 ২. টেলিগ্রাম বটের লজিক (POST Request)
  if (req.method === "POST") {
    // টেলিগ্রামকে সাথে সাথে ২০০ ওকে দেওয়া যাতে বটের মেসেজ পাঠানো আটকে না যায়
    res.status(200).send("OK");

    try {
      const payload = req.body;
      if (!payload || !payload.message || !payload.message.chat) return;

      const chatId = payload.message.chat.id;
      const userText = payload.message.text ? payload.message.text.trim() : "";

      if (userText === "/start") {
        await sendMsg(chatId, "👋 তালহা ডাউনলোডারে আপনাকে স্বাগত!\n\nআমাকে যেকোনো সাইজের (সর্বোচ্চ ৪ GB) ফাইল বা ভিডিও পাঠান। আমি সেটির নাম নিখুঁতভাবে পরিবর্তন করে একটি কাস্টম ছোট ডাউনলোড লিংক বানিয়ে দেব।");
        return;
      }

      // ফাইল অথবা ভিডিও প্রসেস করা
      if (payload.message.document || payload.message.video) {
        const media = payload.message.document || payload.message.video;
        const fId = media.file_id;
        let originalName = media.file_name || (payload.message.video ? "video.mp4" : "file.bin");

        // 🧼 নাম ক্লিনিং ইঞ্জিন
        let cleanedName = originalName.replace(/\[.*?\]|\(.*?\)/g, ""); // ব্র্যাকেট ক্লিয়ার
        cleanedName = cleanedName.replace(/@\w+/g, ""); // @ইউজারনেম ক্লিয়ার
        cleanedName = cleanedName.trim().replace(/^[\s._-]+|[\s._-]+$/g, ""); // বাড়তি স্পেস পরিষ্কার

        if (!cleanedName || cleanedName === ".mp4" || cleanedName === ".mkv") {
          cleanedName = payload.message.video ? "video.mp4" : "file.bin";
        }

        const finalFileName = `[Talha] ${cleanedName}`;
        const shortDownloadLink = `${currentDomain}/api?id=${fId}`;

        const replyText = `🚀 **আপনার ফাইল প্রসেসড!**\n\n📝 **নতুন নাম:** \`${finalFileName}\`\n\n📥 **হাই-স্পিড ডাউনলোড লিংক (৪ GB+ সমর্থিত):**\n${shortDownloadLink}`;
        
        await sendMsg(chatId, replyText);
      } else {
        await sendMsg(chatId, "আমাকে একটি ফাইল বা ভিডিও পাঠান, আমি ডাউনলোড লিংক বানিয়ে দেব।");
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
