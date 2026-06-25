import express from "express";
import fetch from "node-fetch";
import { pipeline } from "stream/promises";

const app = express();
app.use(express.json());

const BOT_TOKEN = "5941791142:AAFFeBSWyzt5AlnM0yQH6u3bVmyzldyYDRk";

// 🎯 ফাইল স্ট্রিম করার প্রো-লেভেল মেথড (মেমোরি বাঁচাবে)
app.get("/api", async (req, res) => {
  const { file_id, name } = req.query;

  if (!file_id) return res.status(400).send("File ID required");

  try {
    // ১. টেলিগ্রাম থেকে ফাইল পাথ নেওয়া
    const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${file_id}`);
    const fileData = await fileRes.json();

    if (!fileData.ok) return res.status(404).send("Telegram file not found");

    const filePath = fileData.result.file_path;
    // নোট: ২০MB এর বড় ফাইলের জন্য এখানে আপনার নিজের লোকাল টেলিগ্রাম বট সার্ভারের URL দিতে হবে
    const telegramDirectLink = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

    // ২. ক্লায়েন্ট রেঞ্জের হেডার পাস করা (ভিডিও ফরওয়ার্ড/রিউমিং এর জন্য)
    const forwardHeaders = { "user-agent": "Mozilla/5.0" };
    if (req.headers.range) {
      forwardHeaders["range"] = req.headers.range;
    }

    const fileResponse = await fetch(telegramDirectLink, { headers: forwardHeaders });

    // ৩. প্রয়োজনীয় হেডার সেট করা
    res.setHeader("Content-Type", fileResponse.headers.get("content-type") || "application/octet-stream");
    if (fileResponse.headers.get("content-range")) res.setHeader("Content-Range", fileResponse.headers.get("content-range"));
    if (fileResponse.headers.get("content-length")) res.setHeader("Content-Length", fileResponse.headers.get("content-length"));
    
    const finalFileName = name ? encodeURIComponent(name) : filePath.split('/').pop();
    res.setHeader("Content-Disposition", `attachment; filename="${finalFileName}"`);

    // 🚀 ULTRA ADVANCED: পুরো ফাইল র‍্যামে না নিয়ে সরাসরি চঙ্ক আকারে ইউজারের কাছে স্ট্রিম করা
    // এর ফলে ৪GB ফাইলের জন্যও সার্ভারের মাত্র কয়েক মেগাবাইট র‍্যাম খরচ হবে!
    await pipeline(fileResponse.body, res);

  } catch (err) {
    if (!res.headersSent) {
      res.status(500).send("Streaming Error: " + err.message);
    }
  }
});

app.listen(3000, () => console.log("Advanced Server running on port 3000"));
