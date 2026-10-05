const slugify = require("slugify");
const crypto = require("crypto");

const generateSlug = (text) => slugify(text, { lower: true, strict: true });
const generateToken = (length = 32) => crypto.randomBytes(length).toString("hex");
const calculateReadingTime = (content = "") => Math.max(1, Math.ceil(content.replace(/<[^>]+>/g, "").trim().split(/\s+/).filter(Boolean).length / 200));
const extractExcerpt = (content = "", length = 180) => {
  const text = content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return text.length <= length ? text : `${text.slice(0, length).trim()}...`;
};

function pagination(page = 1, limit = 10) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  return { page: safePage, limit: safeLimit, offset: (safePage - 1) * safeLimit };
}

module.exports = { generateSlug, generateToken, calculateReadingTime, extractExcerpt, pagination };
