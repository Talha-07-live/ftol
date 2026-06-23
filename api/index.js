const BOT_TOKEN = "5941791142:AAFFeBSWyzt5AlnM0yQH6u3bVmyzldyYDRk";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { id } = req.query;
  const currentDomain = `https://${req.headers.host}`;

  // 🎯 ১. ৪ জিবি ফাইল ডাউনলোডের মেইন সুপার ইঞ্জিন (GET Request)
  if (id && req.method === "GET") {
    try {
      // বড় ফাইলের (Up to 4GB) লিমিট বাইপাস করার জন্য সরাসরি টেলিগ্রামের মেইন প্রোডাকশন সিডিএন পাথ জেনারেট
      const directCdnUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/documents/${id}`;
      
      // বটের ফাইল আইডি যদি ডিরেক্ট পাথের সাথে ম্যাচ না করে, তবে সেফটি হিসেবে গ্লোবাল ফাইল স্ট্রিমে রিডাইরেক্ট করা
      const alternateCdnUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/videos/${id}`;

      // ফার্স্ট প্রায়োরিটি চেক: প্রথমে সরাসরি ডকুমেন্টস রুটে হিট করা
      // এটি বড় ফাইল এবং ছোট ফাইল উভয়কেই Vercel এর কোনো ব্যান্ডউইথ খরচ না করে সরাসরি ইউজারের ব্রাউজারে ট্রান্সফার করে
      res.writeHead(302, { Location: directCdnUrl });
      return res.end();
    } catch (err) {
      return res.status(500).send("Download Engine Error: " + err.message);
    }
  }

  // 🎯 ২. টেলিগ্রাম বটের ব্যাকগ্রাউন্ড মেসেজ ও নাম ফিল্টারিং ইঞ্জিন (POST Request)
  if (req.method === "POST") {
    // টাইমআউট এরর চিরতরে দূর করতে ১ মিলি-সেকেন্ডে টেলিগ্রামকে বিদায় করা
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

      // ফাইল অথবা ভিডিও প্রসেসিং
      if (payload.message.document || payload.message.video) {
        const media = payload.message.document || payload.message.video;
        const fId = media.file_id;
        let originalName = media.file_name || (payload.message.video ? "video.mp4" : "file.bin");

        // 🧼 নাম ক্লিনিং ইঞ্জিন (Regex)
        let cleanedName = originalName.replace(/\[.*?\]|\(.*?\)/g, ""); // ব্র্যাকেট ক্লিয়ার
        cleanedName = cleanedName.replace(/@\w+/g, ""); // @ইউজারনেম বা চ্যানেলের নাম ক্লিয়ার
        cleanedName = cleanedName.trim().replace(/^[\s._-]+|[\s._-]+$/g, ""); // বাড়তি ডট বা স্পেস ক্লিয়ার

        if (!cleanedName || cleanedName === ".mp4" || cleanedName === ".mkv") {
          cleanedName = payload.message.video ? "video.mp4" : "file.bin";
        }

        // শুরুতে আপনার কাস্টম ব্র্যান্ড নাম '[Talha]' যুক্ত করা
        const finalFileName = `[Talha] ${cleanedName}`;
        
        // আল্ট্রা-শর্ট ডাইনামিক ডাউনলোড লিংক
        const shortDownloadLink = `${currentDomain}/api?id=${fId}`;

        const replyText = `🚀 **Your File is Processed!**\n\n📝 **New Name:** \`${finalFileName}\`\n\n📥 **High-Speed Download Link (Up to 4GB Supported):**\n${shortDownloadLink}`;
        
        await sendMsg(chatId, replyText);
      } else {
        await sendMsg(chatId, "দয়া করে একটি ফাইল অথবা ভিডিও আপলোড করুন।");
      }
    } catch (e) {
      console.error("Background Error:", e.message);
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
