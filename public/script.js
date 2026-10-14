// ===== Ambil elemen-elemen dari halaman =====
const chat = document.getElementById("chat");
const form = document.getElementById("form");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");

// Riwayat percakapan yang dikirim ke server.
// Bentuknya: [{ role: "user" | "model", text: "..." }]
const history = [];

// Menambah satu pesan ke layar chat.
// cls: "user" (pesan kita), "bot" (balasan bot), atau "error" (pesan kesalahan)
function addMessage(text, cls) {
  const div = document.createElement("div");
  div.className = "msg " + cls;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight; // otomatis scroll ke pesan terbaru
  return div;
}

// Mengubah kode status dari server menjadi pesan yang mudah dipahami pengguna
function pesanDariStatus(status, pesanServer) {
  if (status === 429) return "Terlalu banyak permintaan. Tunggu beberapa detik, lalu coba lagi.";
  if (status === 503) return "Server AI sedang sibuk. Coba lagi sebentar lagi.";
  return pesanServer || "Terjadi kesalahan pada server.";
}

// Pesan sambutan pertama
addMessage("Halo! Ada yang bisa saya bantu?", "bot");

// ===== Saat tombol Kirim ditekan =====
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return; // abaikan pesan kosong

  // Tampilkan pesan pengguna dan simpan ke riwayat
  addMessage(text, "user");
  history.push({ role: "user", text });
  input.value = "";
  sendBtn.disabled = true; // cegah kirim ganda saat menunggu balasan
  const loading = addMessage("Mengetik...", "bot");

  try {
    // Kirim seluruh riwayat ke server
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history }),
    });
    const data = await res.json();
    loading.remove();

    if (!res.ok) throw new Error(pesanDariStatus(res.status, data.error));

    // Tampilkan balasan bot dan simpan ke riwayat
    addMessage(data.reply, "bot");
    history.push({ role: "model", text: data.reply });
  } catch (err) {
    loading.remove();

    // TypeError berarti browser gagal menghubungi server sama sekali
    const pesan =
      err instanceof TypeError
        ? "Tidak bisa terhubung ke server. Pastikan server sedang berjalan (npm start)."
        : err.message;
    addMessage(pesan, "error");

    history.pop(); // buang pesan user yang gagal agar riwayat tetap valid
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
});


