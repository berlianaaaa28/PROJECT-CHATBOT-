require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemma-4-26b-a4b-it";
const PORT = process.env.PORT || 3000;

// Instruksi karakter chatbot (silakan ubah sesuai tema tugas)
const SYSTEM_PROMPT =
  "Kamu adalah asisten chatbot yang ramah dan membantu. Jawab dalam bahasa Indonesia dengan singkat dan jelas.";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

app.post("/api/chat", async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({ error: "API key belum diisi di file .env" });
    }

    // history: [{ role: "user" | "model", text: "..." }]
    const { history } = req.body;
    if (!Array.isArray(history) || history.length === 0) {
      return res.status(400).json({ error: "Pesan kosong" });
    }

    // Instruksi sistem disisipkan ke pesan pertama agar didukung semua model (termasuk Gemma)
    const contents = history.map((m, i) => ({
      role: m.role,
      parts: [
        {
          text:
            i === 0 && m.role === "user"
              ? `${SYSTEM_PROMPT}\n\nPesan pengguna: ${m.text}`
              : m.text,
        },
      ],
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    let response, data;
    // Coba maksimal 3 kali kalau server Google sedang error/sibuk
    for (let attempt = 1; attempt <= 3; attempt++) {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": API_KEY,
        },
        body: JSON.stringify({ contents }),
      });
      data = await response.json();

      const sementara = [429, 500, 503].includes(response.status);
      if (response.ok || !sementara) break;
      console.log(`Percobaan ${attempt} gagal (${response.status}), mencoba lagi...`);
      await sleep(1500 * attempt);
    }

    if (!response.ok) {
      console.error("Error dari API:", JSON.stringify(data));
      return res
        .status(response.status)
        .json({ error: data.error?.message || "Terjadi kesalahan pada API" });
    }

    const reply =
      data.candidates?.[0]?.content?.parts
        ?.filter((p) => p.text && !p.thought)
        .map((p) => p.text)
        .join("") || "(tidak ada jawaban)";
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Chatbot berjalan di http://localhost:${PORT} (model: ${MODEL})`);
});