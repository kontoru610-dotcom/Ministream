const video = document.getElementById("video");
const youtubeArea = document.getElementById("youtubeArea");
const emptyState = document.getElementById("emptyState");
let hlsInstance = null;

function youtubeId(value) {
  try {
    const u = new URL(value);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const parts = u.pathname.split("/");
      if (["embed", "live", "shorts"].includes(parts[1])) return parts[2];
    }
  } catch {}
  return null;
}

async function loadSite() {
  try {
    const response = await fetch("/api/public", { cache: "no-store" });
    if (!response.ok) throw new Error("Gagal mengambil pengaturan.");
    const settings = await response.json();

    document.title = settings.title || "MiniStream";
    document.getElementById("pageTitle").textContent = settings.title || "MiniStream";
    document.getElementById("pageDescription").textContent = settings.description || "";
    document.getElementById("year").textContent = new Date().getFullYear();

    const src = (settings.video_url || "").trim();
    if (!src) {
      video.classList.add("hidden");
      youtubeArea.classList.add("hidden");
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");

    if (settings.video_type === "youtube") {
      const id = youtubeId(src);
      if (!id) throw new Error("URL YouTube tidak dikenali. Gunakan link video atau live YouTube.");
      video.pause();
      video.classList.add("hidden");
      youtubeArea.classList.remove("hidden");
      youtubeArea.innerHTML = "";
      const frame = document.createElement("iframe");
      frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
      frame.title = "YouTube video player";
      frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      frame.allowFullscreen = true;
      youtubeArea.appendChild(frame);
      return;
    }

    youtubeArea.classList.add("hidden");
    youtubeArea.innerHTML = "";
    video.classList.remove("hidden");
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
    video.removeAttribute("src");
    video.load();

    if (settings.video_type === "hls") {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      } else if (window.Hls && Hls.isSupported()) {
        hlsInstance = new Hls();
        hlsInstance.loadSource(src);
        hlsInstance.attachMedia(video);
      } else {
        throw new Error("Browser ini belum mendukung HLS.");
      }
    } else {
      video.src = src;
    }
  } catch (error) {
    emptyState.classList.remove("hidden");
    emptyState.querySelector("strong").textContent = "Video tidak dapat dimuat";
    emptyState.querySelector("span").textContent = error.message;
  }
}
loadSite();
