import axios from "axios";
import cheerio from "cheerio";

export default async function handler(req, res) {
  // CORS (opsional tapi aman)
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { page } = req.query;
    const currentPage = parseInt(page) || 1;
    const limit = 12;

    // ===============================
    // 1. Tentukan URL sesuai page
    // ===============================
    const baseUrl = "https://komikcast05.com/daftar-komik";
    const query = "?status=&type=&orderby=popular";

    const targetUrl =
      currentPage === 1
        ? `${baseUrl}/${query}`
        : `${baseUrl}/page/${currentPage}/${query}`;

    // ===============================
    // 2. Fetch halaman
    // ===============================
    const { data } = await axios.get(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const $ = cheerio.load(data);

    let articles = [];

    // ===============================
    // 3. Mapping TYPE → FLAG
    // ===============================
    const FLAG_MAP = {
      manhwa: "/manhwa-flag.png",
      manhua: "/manhua-flag.png",
      manga: "/manga-flag.png"
    };

    const getFlagImage = (type) =>
      type ? FLAG_MAP[type.toLowerCase()] || null : null;

    // ===============================
    // 4. Scrape data halaman
    // ===============================
    $("div#content div.list-update_item").each((_, el) => {
      const title = $(el).find("h3").text().trim();
      const type = $(el).find("span.type").text().trim();
      const rating = $(el).find(".rate .numscore").text().trim();

      const image =
        $(el).find("img").attr("data-src") ||
        $(el).find("img").attr("src") ||
        "https://via.placeholder.com/300";

      const link = $(el).find("a").attr("href");

      if (title && link) {
        articles.push({
          title,
          type,
          flag: getFlagImage(type),
          rating,
          image,
          link
        });
      }
    });

    // ===============================
    // 5. Deteksi total page
    // ===============================
    let totalPage = 1;
    const lastPageLink = $(".pagination a.last").attr("href");

    if (lastPageLink) {
      const match = lastPageLink.match(/page\/(\d+)/);
      if (match) totalPage = parseInt(match[1]);
    }

    // ===============================
    // 6. Response
    // ===============================
    return res.status(200).json({
      page: currentPage,
      limit,
      totalPage,
      totalData: articles.length,
      data: articles
    });

  } catch (error) {
    return res.status(500).json({
      error: "Gagal scraping komik populer",
      detail: error.message
    });
  }
}
