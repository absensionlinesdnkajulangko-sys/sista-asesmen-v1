import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Middleware for Gemini key check
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// API Routes
app.post("/api/generate", async (req, res) => {
  try {
    const data = req.body;
    const ai = getGeminiClient();
    
    const configs = data.questionConfigs.map((c: any) => 
      `${c.count} soal ${c.type} ${c.type === 'Pilihan Ganda' ? `dengan ${c.optionCount} pilihan jawaban` : ''} (Skor/soal: ${c.scorePerItem})`
    ).join(", ");

    const prompt = `
      Bertindaklah sebagai Pakar Asesmen Kurikulum Merdeka dan Ahli Evaluasi Pendidikan Indonesia. 
      Buatlah instrumen asesmen yang modern dengan standar literasi dan numerasi (AKM).
      
      DATA INPUT:
      - Satuan Pendidikan: ${data.schoolName}
      - Mapel: ${data.subject}
      - Materi Utama (Input): ${data.material || "AI Tentukan Otomatis"}
      - Capaian Pembelajaran (CP): ${data.cp}
      - Daftar Tujuan Pembelajaran (TP):
        ${data.tp.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n      ")}
      - Kelas/Semester: ${data.grade} / ${data.semester}
      - Tahun Ajaran: ${data.academicYear}
      - Konfigurasi Soal: ${configs}
      - Level Kognitif: ${data.cognitiveLevel.join(", ")}
      - Gunakan Stimulus Gambar: ${data.withImages ? 'YA (Hasilkan deskripsi visual)' : 'TIDAK'}
      
      TUGAS ANDA:
      1. Materi Utama: Jika input Materi Utama kosong, buatlah ringkasan materi pokok (2-4 kata) yang paling mewakili daftar TP di atas. Masukkan ke dalam property "header.material" (ini akan digunakan sebagai judul materi pokok di lembar asesmen).
      2. Distribusi Soal: Sebarkan jumlah soal secara merata atau proporsional ke semua Tujuan Pembelajaran (TP) yang diberikan.
      3. Stimulus & Soal: 
         - Pilihan Ganda: WAJIB menyertakan property "options" sebagai array of strings. Jumlah pilihan harus ${data.questionConfigs.find((c: any) => c.type === 'Pilihan Ganda')?.optionCount || 4}.
         - Pilihan Ganda Kompleks: WAJIB memiliki minimal 2 jawaban yang benar di "multiOptions". Berikan instruksi agar siswa memberi centang.
         - Isian Singkat: Jawaban eksak, singkat, padat.
         - Uraian: Jawaban terbuka berbobot dengan rubrik penilaian yang jelas di bagian eksplanasi.
         - Benar Salah: Pernyataan kritis terkait materi.
      4. Gambar: JIKA stimulus (Pilihan Ganda/Kompleks/Jodohkan/Uraian) membutuhkan gambar (misal: "Perhatikan gambar berikut"), sertakan property "imageUrl" dengan format "IMAGE_STIMULUS: [deskripsi detail gambar untuk diconvert ke AI Image]".
      5. Kisi-kisi: Samakan No soal dengan data questions. Gunakan deskripsi TP yang sesuai untuk setiap nomor soal.

      STRUKTUR JSON OUTPUT:
      {
        "header": {
          "schoolName": "${data.schoolName}",
          "subject": "${data.subject}",
          "classSemester": "${data.grade} / ${data.semester}",
          "material": "(Hasil ringkasan materi pokok)",
          "timeLimit": "60 Menit"
        },
        "questions": [ ... ],
        "kisiKisi": [ ... ]
      }

      PENTING: Respond HANYA dengan JSON valid. JANGAN ada teks pembuka/penutup.
    `;

    const response = await ai.models.generateContent({ 
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        temperature: 0.7,
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    
    const cleanText = text.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
    
    res.json(JSON.parse(cleanText));
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Handle Vite middleware for dev or static files for production
async function setupApp() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

setupApp();

// Export the app for Vercel
export default app;

// Only listen if running directly (not in Vercel)
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
