export const config = { runtime: 'edge' };

export default async function handler(request) {
  // টেলিগ্রামের রিকোয়েস্ট চেক করা
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const BOT_TOKEN = "5941791142:AAFFeBSWyzt5AlnM0yQH6u3bVmyzldyYDRk";
  const url = new URL(request.url);
  const currentDomain = `https://${url.host}`; 

  try {
    const payload = await request.json();
    
    // সেফটি চেক: আপডেট বা মেসেজ ঠিকঠাক আছে কিনা
    const message = payload.message || payload.edited_message;
    if (!message || !message.chat) {
      return new Response("No valid message found", { status: 200 }); 
    }

    const chatId = message.chat.id;
    const userText = message.text ? message.text.trim() : "";

    // ১. ইউজার যদি /start দেয়
    if (userText === "/start") {
      const startText = "👋 হ্যালো! আমি আপনার ফাইল টু লিংক বাইপাস বট।\n\nআমাকে যেকোনো ফাইল বা ভিডিও পাঠান, আমি আপনাকে আনলিমিটেড স্পিডের ডাউনলোড লিংক তৈরি করে দেব!";
      await sendTelegramMessage(BOT_TOKEN, chatId, startText);
    } 
    // ২. ইউজার যদি কোনো ফাইল/ডকুমেন্ট বা ভিডিও পাঠায়
    else if (message.document || message.video) {
      const media = message.document || message.video;
      const fileId = media.file_id;
      const fileName = media.file_name || (message.video ? "video.mp4" : "file");

      const finalDownloadLink = `${currentDomain}/api/download?file_id=${fileId}&name=${encodeURIComponent(fileName)}`;
      const replyText = `🚀 আপনার ফাইলের হাই-স্পিড ডাউনলোড লিংক রেডি!\n\n📂 ফাইল: ${fileName}\n\n🔗 লিংক:\n${finalDownloadLink}`;
      
      await sendTelegramMessage(BOT_TOKEN, chatId, replyText);
    } 
    // ৩. অন্য কোনো টেক্সট পাঠালে বটের সাধারণ রিপ্লাই (টেস্টিং এর জন্য)
    else {
      const fallbackText = "আমাকে যেকোনো ফাইল বা ভিডিও পাঠান, আমি ডাউনলোড লিংক বানিয়ে দেব।";
      await sendTelegramMessage(BOT_TOKEN, chatId, fallbackText);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    // যেকোনো ইন্টারনাল এরর ক্যাচ করা
    return new Response("Internal Error: " + error.message, { status: 200 }); // টেলিগ্রামকে ২০০ দেওয়া ভালো যাতে সে বারবার পুশ না করে
  }
}

async function sendTelegramMessage(token, chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text })
    });
  } catch (e) {
    console.error("Failed to send message:", e);
  }
}
