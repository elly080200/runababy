const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

admin.initializeApp();
const db = admin.firestore();

// ── 爬蟲 User-Agent 判斷 ──────────────────────────────────────────────
function isBot(userAgent) {
  if (!userAgent) return false;
  const bots = [
    "googlebot", "bingbot", "yandexbot", "duckduckbot",
    "slurp", "baiduspider", "facebookexternalhit",
    "twitterbot", "linkedinbot", "whatsapp", "telegrambot",
    "line-poker", "line/", "kakaotalk", "discordbot",
    "applebot", "pinterestbot", "slackbot",
  ];
  const ua = userAgent.toLowerCase();
  return bots.some((bot) => ua.includes(bot));
}

// ── 商品 OG HTML 產生 ─────────────────────────────────────────────────
function injectMeta(html, { title, description, image, url }) {
  // 清理 description（去掉換行、截短）
  const safeDesc = (description || "")
    .replace(/\n/g, " ")
    .replace(/"/g, "&quot;")
    .trim()
    .slice(0, 100);

  const safeTitle = (title || "").replace(/"/g, "&quot;");
  const safeUrl = url || "https://runababy-ee77d.web.app";
  const safeImage = image || "";

  return html
    .replace(
      /<meta property="og:title"[^>]*>/,
      `<meta property="og:title" content="${safeTitle}" />`
    )
    .replace(
      /<meta property="og:description"[^>]*>/,
      `<meta property="og:description" content="${safeDesc}" />`
    )
    .replace(
      /<meta property="og:image"[^>]*>/,
      `<meta property="og:image" content="${safeImage}" />`
    )
    .replace(
      /<meta property="og:url"[^>]*>/,
      `<meta property="og:url" content="${safeUrl}" />`
    )
    .replace(
      /<meta name="twitter:title"[^>]*>/,
      `<meta name="twitter:title" content="${safeTitle}" />`
    )
    .replace(
      /<meta name="twitter:description"[^>]*>/,
      `<meta name="twitter:description" content="${safeDesc}" />`
    )
    .replace(
      /<meta name="twitter:image"[^>]*>/,
      `<meta name="twitter:image" content="${safeImage}" />`
    )
    .replace(/<title>[^<]*<\/title>/, `<title>${safeTitle}</title>`);
}

// ── 主 Function ───────────────────────────────────────────────────────
exports.ssrHandler = functions
  .https.onRequest(async (req, res) => {

    // 讀取原始 index.html
    const htmlPath = path.join(__dirname, "index.html");
    let baseHtml;
    try {
      baseHtml = fs.readFileSync(htmlPath, "utf8");
    } catch (e) {
      console.error("無法讀取 index.html:", e);
      res.status(500).send("Server Error");
      return;
    }

    const reqPath = req.path;
    const ua = req.headers["user-agent"] || "";

    // ── 商品頁：/products/xxx 或 /product/xxx ────────────────────────
    const productMatch = reqPath.match(/^\/products?\/(.+)/);
    if (productMatch) {
      const slug = decodeURIComponent(productMatch[1]);

      try {
        // Firestore 路徑：runababy/store/products/{slug}
        const docRef = db
          .collection("runababy")
          .doc("store")
          .collection("products")
          .doc(slug);

        const snap = await docRef.get();

        if (!snap.exists) {
          // 找不到商品 → 回傳原本 HTML，讓前端 JS 處理
          res.set("Cache-Control", "no-cache");
          res.send(baseHtml);
          return;
        }

        const p = snap.data();
        const productUrl = `https://runababy-ee77d.web.app/products/${slug}`;
        const image = p.images && p.images[0] ? p.images[0] : "";
        const title = `${p.title || "商品"} | Runababy 韓國童裝代購`;
        const description = p.description
          ? p.description
          : `${p.type === "stock" ? "現貨" : "預購"}商品，NT$${Number(p.price).toLocaleString()}`;

        const finalHtml = injectMeta(baseHtml, {
          title,
          description,
          image,
          url: productUrl,
        });

        // 爬蟲快取 10 分鐘，一般使用者不快取
        if (isBot(ua)) {
          res.set("Cache-Control", "public, max-age=600");
        } else {
          res.set("Cache-Control", "no-cache");
        }

        res.send(finalHtml);
        return;

      } catch (e) {
        console.error("Firestore 讀取失敗:", e);
        // 出錯就回傳原始 HTML，網站正常運作
        res.set("Cache-Control", "no-cache");
        res.send(baseHtml);
        return;
      }
    }

    // ── 其他頁面：直接回傳原始 HTML ──────────────────────────────────
    res.set("Cache-Control", "no-cache");
    res.send(baseHtml);
  });
