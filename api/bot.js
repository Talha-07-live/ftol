export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const BOT_TOKEN = "5941791142:AAFFeBSWyzt5AlnM0yQH6u3bVmyzldyYDRk";
  const url = new URL(request.url);
  // আপনার Vercel ডোমেইন অটোমেটিক ডিটেক্ট করবে
  const currentDomain = `https://${url.host}`; 

  try {
    const payload = await request.json();
    
    if (payload.message && payload.message.chat) {
      const chatId = payload.message.chat.id;

      // ১. ইউজার যদি /start দেয়
      if (payload.message.text === "/start") {
        const startText = "👋 হ্যালো! আমি আপনার ফাইল টু লিংক বাইপাস বট।\n\nআমাকে যেকোনো ফাইল বা ভিডিও পাঠান, আমি আপনাকে আনলিমিটেড স্পিডের ডাউনলোড লিংক তৈরি করে দেব!";
        await sendTelegramMessage(BOT_TOKEN, chatId, startText);
      } 
      // ২. ইউজার যদি কোনো ফাইল/ডকুমেন্ট পাঠায়
      else if (payload.message.document || payload.message.video) {
        const media = payload.message.document || payload.message.video;
        const fileId = media.file_id;
        const fileName = media.file_name || "video.mp4";

        // আমাদের তৈরি করা সুপার অ্যাডভান্সড ডাউনলোড লিংক
        const finalDownloadLink = `${currentDomain}/api/download?file_id=${fileId}&name=${encodeURIComponent(fileName)}`;

        const replyText = `🚀 আপনার ফাইলের হাই-স্পিড ডাউনলোড লিংক রেডি!\n\n📂 ফাইল: ${fileName}\n\n🔗 লিংক:\n${finalDownloadLink}`;
        await sendTelegramMessage(BOT_TOKEN, chatId, replyText);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    return new Response("Bot Error: " + error.message, { status: 500 });
  }
}

// টেলিগ্রামে মেসেজ পাঠানোর হেল্পার ফাংশন
async function sendTelegramMessage(token, chatId, text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text })
  });
}
