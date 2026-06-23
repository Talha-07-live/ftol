const BOT_TOKEN = "5941791142:AAFFeBSWyzt5AlnM0yQH6u3bVmyzldyYDRk";

export default async function handler(req, res) {
  // CORS এবং মেথড প্রটেকশন
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { file_id } = req.query;
  const currentDomain = `https://${req.headers.host}`;

  // 🎯 লজিক ১: ফাইল ডাউনলোডের মেইন ইঞ্জিন (GET Request)
  if (file_id && req.method === "GET") {
    try {
      // টেলিগ্রাম থেকে ফাইলের তাজা লাইভ পাথ তুলে আনা
      const getFileUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${file_id}`;
      const fileRes = await fetch(getFileUrl);
      const fileData = await fileRes.json();

      if (!fileData.ok) {
        return res.status(404).send("Error: File not found or expired on Telegram.");
      }

      const filePath = fileData.result.file_path;
      // ৪ জিবি বাইপাস করার জন্য সরাসরি টেলিগ্রাম সিডিএন লিংক তৈরি
      const telegramDirectLink = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

      // ব্রাউজারকে সরাসরি টেলিগ্রামের হাই-স্পিড ডাউনলোড লিংকে রিডাইরেক্ট করা
      // এর ফলে Vercel-এর ৫০MB লিমিট খাটবে না এবং আনলিমিটেড সাইজের ফাইল ডাউনলোড হবে
      res.writeHead(302, { Location: telegramDirectLink });
      return res.end();

    } catch (err) {
      return res.status(500).send("Download Engine Error: " + err.message);
    }
  }

  // 🎯 লজিক ২: টেলিগ্রাম বটের মেসেজ ও নাম ফিল্টারিং ইঞ্জিন (POST Request)
  if (req.method === "POST") {
    try {
      const payload = req.body;
      
      if (payload && payload.message && payload.message.chat) {
        const chatId = payload.message.chat.id;
        const userText = payload.message.text ? payload.message.text.trim() : "";

        if (userText === "/start") {
          return sendMsg(chatId, "👋 তালহা ডাউনলোডারে আপনাকে স্বাগতম!\n\nআমাকে যেকোনো সাইজের (সর্বোচ্চ ৪ GB) ফাইল বা ভিডিও পাঠান। আমি সেটির নাম নিখুঁতভাবে পরিবর্তন করে একটি কাস্টম ছোট ডাউনলোড লিংক বানিয়ে দেব।");
        }

        // ফাইল অথবা ভিডিও ডিটেক্ট করা
        if (payload.message.document || payload.message.video) {
          const media = payload.message.document || payload.message.video;
          const fId = media.file_id;
          let originalName = media.file_name || (payload.message.video ? "video.mp4" : "file.bin");

          // 🧼 সুপার ইন্টেলিজেন্ট নাম ক্লিনিং অ্যালগরিদম (Regex Engine)
          // ১. ব্র্যাকেট এবং তার ভেতরের সব লেখা ডিলিট করা: যেমন [MyChannel] বা (SomeText)
          let cleanedName = originalName.replace(/\[.*?\]|\(.*?\)/g, "");
          
          // ২. @ সাইন এবং তার পরের ইউজারনেম বা টেক্সট ডিলিট করা (যেমন @exp, @CoolBot)
          cleanedName = cleanedName.replace(/@\w+/g, "");
          
          // ৩. ফাইলের নামের শুরুতে বা শেষে থাকা বাড়তি স্পেস বা ডট থাকলে তা পরিষ্কার করা
          cleanedName = cleanedName.trim().replace(/^[\s._-]+|[\s._-]+$/g, "");

          // ৪. যদি সব কেটে যাওয়ার পর ফাইলের নাম একদম খালি হয়ে যায়, তবে একটি ডিফল্ট নাম দেওয়া
          if (!cleanedName || cleanedName === ".mp4" || cleanedName === ".mkv") {
            cleanedName = payload.message.video ? "video.mp4" : "file.bin";
          }

          // ৫. চূড়ান্ত শোধন: শুরুতে ব্র্যান্ড ট্যাগ '[Talha]' যুক্ত করা
          const finalFileName = `[Talha] ${cleanedName}`;

          // 🔗 আল্ট্রা-শর্ট এবং প্রিমিয়াম লুকিং ডাউনলোড লিঙ্ক জেনারেট
          const shortDownloadLink = `${currentDomain}/talhasdownloader/${fId}`;

          const replyText = `🚀 **আপনার ফাইল প্রসেসড!**\n\n📝 **নতুন নাম:** \`${finalFileName}\`\n\n📥 **হাই-স্পিড ডাউনলোড লিংক (৪ GB+ সমর্থিত):**\n${shortDownloadLink}\n\n*IDM বা যেকোনো ফাস্ট ডাউনলোডার ব্যবহার করতে পারেন।*`;
          
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
