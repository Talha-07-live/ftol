const BOT_TOKEN = "5941791142:AAFFeBSWyzt5AlnM0yQH6u3bVmyzldyYDRk";

export default async function handler(req, res) {
  // CORS হেডারস সেটআপ
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // URL থেকে কুয়েরি প্যারামিটার নেওয়া
  const { id } = req.query;
  const currentDomain = `https://${req.headers.host}`;

  // 🎯 ১. ফাইল ডাউনলোডের মেইন ইঞ্জিন (GET Request)
  if (id && req.method === "GET") {
    try {
      // টেলিগ্রাম থেকে ফাইলের লাইভ পাথ তুলে আনা
      const getFileUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${id}`;
      const fileRes = await fetch(getFileUrl);
      const fileData = await fileRes.json();

      if (!fileData.ok) {
        return res.status(404).send("Error: File not found or expired on Telegram.");
      }

      const filePath = fileData.result.file_path;
      const telegramDirectLink = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

      // ৪ জিবি বাইপাস ট্রিক: সরাসরি টেলিগ্রামের সিডিএন সার্ভারে রিডাইরেক্ট
      res.writeHead(302, { Location: telegramDirectLink });
      return res.end();

    } catch (err) {
      return res.status(500).send("Download Engine Error: " + err.message);
    }
  }

  // 🎯 ২. টেলিগ্রাম বটের মেসেজ ও নাম ফিল্টারিং ইঞ্জিন (POST Request)
  if (req.method === "POST") {
    try {
      const payload = req.body;
      
      if (payload && payload.message && payload.message.chat) {
        const chatId = payload.message.chat.id;
        const userText = payload.message.text ? payload.message.text.trim() : "";

        if (userText === "/start") {
          return await sendMsg(chatId, "👋 তালহা ডাউনলোডারে আপনাকে স্বাগত!\n\nআমাকে যেকোনো সাইজের (সর্বোচ্চ ৪ GB) ফাইল বা ভিডিও পাঠান। আমি সেটির নাম নিখুঁতভাবে পরিবর্তন করে একটি কাস্টম ছোট ডাউনলোড লিংক বানিয়ে দেব।");
        }

        // ফাইল অথবা ভিডিও ডিটেক্ট করা
        if (payload.message.document || payload.message.video) {
          const media = payload.message.document || payload.message.video;
          const fId = media.file_id;
          let originalName = media.file_name || (payload.message.video ? "video.mp4" : "file.bin");

          // 🧼 সুপার ইন্টেলিজেন্ট নাম ক্লিনিং অ্যালগরিদম (Regex)
          let cleanedName = originalName.replace(/\[.*?\]|\(.*?\)/g, ""); // ব্র্যাকেট ডিলিট
          cleanedName = cleanedName.replace(/@\w+/g, ""); // @exp ডিলিট
          cleanedName = cleanedName.trim().replace(/^[\s._-]+|[\s._-]+$/g, ""); // বাড়তি স্পেস পরিষ্কার

          if (!cleanedName || cleanedName === ".mp4" || cleanedName === ".mkv") {
            cleanedName = payload.message.video ? "video.mp4" : "file.bin";
          }

          // শুরুতে ব্র্যান্ড ট্যাগ '[Talha]' যুক্ত করা
          const finalFileName = `[Talha] ${cleanedName}`;

          // 🔗 আল্ট্রা-শর্ট এবং প্রিমিয়াম লুকিং ডাউনলোড লিঙ্ক (শুধুমাত্র /api?id=...)
          const shortDownloadLink = `${currentDomain}/api?id=${fId}`;

          const replyText = `🚀 **আপনার ফাইল প্রসেসড!**\n\n📝 **নতুন নাম:** \`${finalFileName}\`\n\n📥 **হাই-স্পিড ডাউনলোড লিংক (৪ GB+ समर्थित):**\n${shortDownloadLink}`;
          
          await sendMsg(chatId, replyText);
        } else {
          await sendMsg(chatId, "দয়া করে একটি ফাইল অথবা ভিডিও আপলোড করুন।");
        }
      }
    } catch (e) {
      console.error("Bot Error:", e.message);
    }
    return res.status(200).send("OK");
  }

  return res.status(200).send("Talha's Premium Downloader Core is running fine...");
}

async function sendMsg(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown" })
  });
}
