const BOT_TOKEN = "5941791142:AAFFeBSWyzt5AlnM0yQH6u3bVmyzldyYDRk";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { id } = req.query;
  const currentDomain = `https://${req.headers.host}`;

  // 🎯 ১. ফাইল ডাউনলোডের লজিক (GET Request)
  if (id && req.method === "GET") {
    try {
      const getFileUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${id}`;
      const fileRes = await fetch(getFileUrl);
      const fileData = await fileRes.json();

      if (!fileData.ok) return res.status(404).send("Error: File not found.");

      const filePath = fileData.result.file_path;
      const telegramDirectLink = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

      res.writeHead(302, { Location: telegramDirectLink });
      return res.end();
    } catch (err) {
      return res.status(500).send("Download Engine Error: " + err.message);
    }
  }

  // 🎯 ২. টেলিগ্রাম বটের লজিক (POST Request)
  if (req.method === "POST") {
    // ⚡ ট্রিক: টেলিগ্রামকে ১ মিলি-সেকেন্ডে ২০০ ওকে দিয়ে খালাস করা
    res.status(200).send("OK");

    // ব্যাকগ্রাউন্ডে প্রসেস চলবে, টেলিগ্রামকে আর আটকে থাকতে হবে না (No Timeout)
    try {
      const payload = req.body;
      if (!payload || !payload.message || !payload.message.chat) return;

      const chatId = payload.message.chat.id;
      const userText = payload.message.text ? payload.message.text.trim() : "";

      if (userText === "/start") {
        await sendMsg(chatId, "👋 তালহা ডাউনলোডারে আপনাকে স্বাগত!\n\nআমাকে যেকোনো সাইজের (সর্বোচ্চ ৪ GB) ফাইল বা ভিডিও পাঠান। আমি সেটির নাম নিখুঁতভাবে পরিবর্তন করে একটি কাস্টম ছোট ডাউনলোড লিংক বানিয়ে দেব।");
        return;
      }

      // ফাইল অথবা ভিডিও প্রসেসিং শুরু
      if (payload.message.document || payload.message.video) {
        const media = payload.message.document || payload.message.video;
        const fId = media.file_id;
        let originalName = media.file_name || (payload.message.video ? "video.mp4" : "file.bin");

        // 🧼 নাম ক্লিনিং ইঞ্জিন
        let cleanedName = originalName.replace(/\[.*?\]|\(.*?\)/g, ""); // ব্র্যাকেট ডিলিট
        cleanedName = cleanedName.replace(/@\w+/g, ""); // @ইউজারনেম ডিলিট
        cleanedName = cleanedName.trim().replace(/^[\s._-]+|[\s._-]+$/g, ""); // বাড়তি স্পেস/ডট ডিলিট

        if (!cleanedName || cleanedName === ".mp4" || cleanedName === ".mkv") {
          cleanedName = payload.message.video ? "video.mp4" : "file.bin";
        }

        const finalFileName = `[Talha] ${cleanedName}`;
        const shortDownloadLink = `${currentDomain}/api?id=${fId}`;

        const replyText = `🚀 **Your File is Processed!**\n\n📝 **New Name:** \`${finalFileName}\`\n\n📥 **High-Speed Download Link:**\n${shortDownloadLink}`;
        
        await sendMsg(chatId, replyText);
      } else {
        await sendMsg(chatId, "দয়া করে একটি ফাইল অথবা ভিডিও আপলোড করুন।");
      }
    } catch (e) {
      console.error("Background Worker Error:", e.message);
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
    console.error("Message delivery failed:", e.message);
  }
}
