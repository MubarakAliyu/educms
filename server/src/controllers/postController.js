const { query, transaction } = require("../config/database");
const sanitizeHtml = require("sanitize-html");
const { get, set, delByPrefix } = require("../config/redis");
const { generateSlug, calculateReadingTime, extractExcerpt, pagination } = require("../utils/helpers");

function canEdit(post, user) {
  return ["admin", "editor"].includes(user.role) ||
    (user.role === "author" && post.author_id === user.user_id);
}

async function list(req, res, next) {
  try {
    const {
      q = "",
      category = "",
      tag = "",
      status = "published",
      language = "",
      featured = "",
      page = 1,
      limit = 12
    } = req.query;

    const cacheKey = `posts:${q}|${category}|${tag}|${status}|${language}|${featured}|${page}|${limit}`;

    if (status === "published") {
      const cached = await get(cacheKey);
      if (cached) return res.json(cached);
    }

    const p = pagination(page, limit);
    const conditions = [];
    const values = [];

    const add = (sql, val) => {
      values.push(val);
      conditions.push(sql.replace("?", `$${values.length}`));
    };

    if (status && status !== "all") add("p.status = ?", status);
    if (language) add("p.language = ?", language);
    if (category) add("c.slug = ?", category);
    if (tag) add("t.slug = ?", tag);
    if (featured === "true") conditions.push("p.is_featured = TRUE");

    if (q) {
      values.push(`%${q}%`);
      const n = values.length;
      conditions.push(
        `(p.title ILIKE $${n} OR p.excerpt ILIKE $${n} OR p.content ILIKE $${n})`
      );
    }

    const where = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const base = `
      FROM posts p
      LEFT JOIN categories c ON c.category_id = p.category_id
      LEFT JOIN post_tags pt ON pt.post_id = p.post_id
      LEFT JOIN tags t ON t.tag_id = pt.tag_id
      ${where}
    `;

    const count = await query(
      `SELECT COUNT(DISTINCT p.post_id) AS total ${base}`,
      values
    );

    const rows = await query(
      `SELECT
        p.post_id,
        p.title,
        p.slug,
        p.excerpt,
        p.status,
        p.language,
        p.featured_image,
        p.view_count,
        p.like_count,
        p.created_at,
        p.updated_at,
        p.published_at,
        p.meta_title,
        p.meta_description,
        p.is_featured,
        p.allow_comments,
        p.reading_time,
        c.name AS category_name,
        c.slug AS category_slug,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', t.tag_id,
              'name', t.name,
              'slug', t.slug
            )
          ) FILTER (WHERE t.tag_id IS NOT NULL),
          '[]'
        ) AS tags,
        CONCAT(
          COALESCE(u.first_name, ''),
          ' ',
          COALESCE(u.last_name, '')
        ) AS author_name
        ${base}
        LEFT JOIN users u ON u.user_id = p.author_id
        GROUP BY
          p.post_id,
          c.name,
          c.slug,
          u.first_name,
          u.last_name
        ORDER BY COALESCE(p.published_at, p.created_at) DESC
        LIMIT $${values.length + 1}
        OFFSET $${values.length + 2}`,
      [...values, p.limit, p.offset]
    );

    const payload = {
      posts: rows.rows.map(row => ({
        ...row,
        tags: row.tags.filter(t => t.id !== null)
      })),
      pagination: {
        page: p.page,
        limit: p.limit,
        total: Number(count.rows[0].total),
        totalPages: Math.ceil(Number(count.rows[0].total) / p.limit)
      }
    };

    const cats = await query(
      "SELECT name,slug FROM categories WHERE is_active=TRUE ORDER BY display_order,name"
    );

    const tags = await query(
      "SELECT name,slug FROM tags ORDER BY name"
    );

    payload.categories = cats.rows;
    payload.tags = tags.rows;

    if (status === "published") {
      await set(cacheKey, payload, 90);
    }

    res.json(payload);
  } catch (error) {
    next(error);
  }
}

async function getForEdit(req, res, next) {
  try {
    const result = await query(
      `SELECT
        p.*,
        c.name AS category_name,
        c.slug AS category_slug,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', t.tag_id,
              'name', t.name,
              'slug', t.slug
            )
          ) FILTER (WHERE t.tag_id IS NOT NULL),
          '[]'
        ) AS tags
      FROM posts p
      LEFT JOIN categories c ON c.category_id = p.category_id
      LEFT JOIN post_tags pt ON pt.post_id = p.post_id
      LEFT JOIN tags t ON t.tag_id = pt.tag_id
      WHERE p.post_id = $1
      GROUP BY p.post_id, c.name, c.slug`,
      [req.params.id]
    );

    const post = result.rows[0];

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    if (!canEdit(post, req.user)) {
      return res.status(403).json({
        message: "You cannot edit this post."
      });
    }

    post.tags = post.tags.filter(t => t.id !== null);

    res.json({ post });
  } catch (error) {
    next(error);
  }
}

async function getBySlug(req, res, next) {
  try {
    const result = await query(
      `SELECT
        p.*,
        c.name AS category_name,
        c.slug AS category_slug,
        CONCAT(
          COALESCE(u.first_name, ''),
          ' ',
          COALESCE(u.last_name, '')
        ) AS author_name,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', t.tag_id,
              'name', t.name,
              'slug', t.slug
            )
          ) FILTER (WHERE t.tag_id IS NOT NULL),
          '[]'
        ) AS tags
      FROM posts p
      LEFT JOIN categories c ON c.category_id = p.category_id
      LEFT JOIN users u ON u.user_id = p.author_id
      LEFT JOIN post_tags pt ON pt.post_id = p.post_id
      LEFT JOIN tags t ON t.tag_id = pt.tag_id
      WHERE p.slug = $1
        AND p.status = 'published'
      GROUP BY
        p.post_id,
        c.name,
        c.slug,
        u.first_name,
        u.last_name`,
      [req.params.slug]
    );

    const post = result.rows[0];

    if (!post) {
      return res.status(404).json({
        message: "Post not found."
      });
    }

    await query(
      "UPDATE posts SET view_count=view_count+1 WHERE post_id=$1",
      [post.post_id]
    );

    post.view_count += 1;

    res.json({ post });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const {
      title,
      slug,
      content,
      excerpt,
      categoryId,
      status = "draft",
      language = "en",
      featuredImage,
      metaTitle,
      metaDescription,
      metaKeywords,
      isFeatured = false,
      allowComments = true,
      tags = []
    } = req.body;

    const safeContent = sanitizeHtml(String(content), {
      allowedTags: [
        "h2",
        "h3",
        "h4",
        "p",
        "strong",
        "em",
        "ul",
        "ol",
        "li",
        "a",
        "blockquote",
        "code",
        "pre",
        "br"
      ],
      allowedAttributes: {
        a: ["href", "target", "rel"]
      },
      allowedSchemes: ["http", "https"]
    });

    const post = await transaction(async db => {
      const created = await db.query(
        `INSERT INTO posts(
          title,
          slug,
          content,
          excerpt,
          author_id,
          category_id,
          status,
          language,
          featured_image,
          published_at,
          meta_title,
          meta_description,
          meta_keywords,
          is_featured,
          allow_comments,
          reading_time
        )
        VALUES(
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $1,
          $4,
          $11,
          $12,
          $13,
          $14
        )
        RETURNING *`,
        [
          title,
          slug || generateSlug(title),
          safeContent,
          excerpt || extractExcerpt(safeContent),
          req.user.user_id,
          categoryId || null,
          status,
          language,
          featuredImage || null,
          status === "published" ? new Date() : null,
          metaKeywords || null,
          Boolean(isFeatured),
          Boolean(allowComments),
          calculateReadingTime(content)
        ]
      );

      const post = created.rows[0];

      for (const tagId of Array.isArray(tags) ? tags : []) {
        await db.query(
          "INSERT INTO post_tags(post_id,tag_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [post.post_id, tagId]
        );
      }

      await db.query(
        `INSERT INTO post_versions(
          post_id,
          version_number,
          title,
          content,
          excerpt,
          status,
          meta_title,
          meta_description,
          created_by
        )
        VALUES($1,1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          post.post_id,
          post.title,
          post.content,
          post.excerpt,
          post.status,
          post.meta_title,
          post.meta_description,
          req.user.user_id
        ]
      );

      return post;
    });

    await delByPrefix("posts:");

    res.status(201).json({ post });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "A post with that slug already exists."
      });
    }

    next(error);
  }
}

async function update(req, res, next) {
  try {
    const existing = (
      await query(
        "SELECT * FROM posts WHERE post_id=$1",
        [req.params.id]
      )
    ).rows[0];

    if (!existing) {
      return res.status(404).json({
        message: "Post not found."
      });
    }

    if (!canEdit(existing, req.user)) {
      return res.status(403).json({
        message: "You cannot edit this post."
      });
    }

    const {
      title,
      slug,
      content,
      excerpt,
      categoryId,
      status = existing.status,
      language = existing.language,
      featuredImage,
      metaTitle,
      metaDescription,
      metaKeywords,
      isFeatured = false,
      allowComments = true,
      tags = []
    } = req.body;

    const safeContent = sanitizeHtml(String(content), {
      allowedTags: [
        "h2",
        "h3",
        "h4",
        "p",
        "strong",
        "em",
        "ul",
        "ol",
        "li",
        "a",
        "blockquote",
        "code",
        "pre",
        "br"
      ],
      allowedAttributes: {
        a: ["href", "target", "rel"]
      },
      allowedSchemes: ["http", "https"]
    });

    const versionCount = (
      await query(
        "SELECT COALESCE(MAX(version_number),0) AS max FROM post_versions WHERE post_id=$1",
        [existing.post_id]
      )
    ).rows[0].max;

    const post = await transaction(async db => {
      const updated = (
        await db.query(
          `UPDATE posts SET
            title=$1,
            slug=$2,
            content=$3,
            excerpt=$4,
            category_id=$5,
            status=$6,
            language=$7,
            featured_image=$8,
            published_at=$9,
            meta_title=$10,
            meta_description=$11,
            meta_keywords=$12,
            is_featured=$13,
            allow_comments=$14,
            reading_time=$15,
            updated_at=CURRENT_TIMESTAMP
          WHERE post_id=$16
          RETURNING *`,
          [
            title,
            slug || generateSlug(title),
            safeContent,
            excerpt || extractExcerpt(safeContent),
            categoryId === undefined
              ? existing.category_id
              : (categoryId || null),
            status,
            language || existing.language,
            featuredImage === undefined
              ? existing.featured_image
              : (featuredImage || null),
            status === "published"
              ? (existing.published_at || new Date())
              : null,
            metaTitle || null,
            metaDescription || null,
            metaKeywords || null,
            Boolean(isFeatured),
            Boolean(allowComments),
            calculateReadingTime(safeContent),
            existing.post_id
          ]
        )
      ).rows[0];

      await db.query(
        "DELETE FROM post_tags WHERE post_id=$1",
        [existing.post_id]
      );

      for (const tagId of Array.isArray(tags) ? tags : []) {
        await db.query(
          "INSERT INTO post_tags(post_id,tag_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [existing.post_id, tagId]
        );
      }

      await db.query(
        `INSERT INTO post_versions(
          post_id,
          version_number,
          title,
          content,
          excerpt,
          status,
          meta_title,
          meta_description,
          created_by
        )
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          existing.post_id,
          Number(versionCount) + 1,
          updated.title,
          updated.content,
          updated.excerpt,
          updated.status,
          updated.meta_title,
          updated.meta_description,
          req.user.user_id
        ]
      );

      return updated;
    });

    await delByPrefix("posts:");

    res.json({ post });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "A post with that slug already exists."
      });
    }

    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const existing = (
      await query(
        "SELECT * FROM posts WHERE post_id=$1",
        [req.params.id]
      )
    ).rows[0];

    if (!existing) {
      return res.status(404).json({
        message: "Post not found."
      });
    }

    if (!canEdit(existing, req.user)) {
      return res.status(403).json({
        message: "You cannot delete this post."
      });
    }

    await query(
      "DELETE FROM posts WHERE post_id=$1",
      [req.params.id]
    );

    await delByPrefix("posts:");

    res.json({
      message: "Post deleted."
    });
  } catch (error) {
    next(error);
  }
}

async function versions(req, res, next) {
  try {
    const result = await query(
      `SELECT
        version_id,
        version_number,
        title,
        content,
        excerpt,
        status,
        created_at
      FROM post_versions
      WHERE post_id=$1
      ORDER BY version_number DESC`,
      [req.params.id]
    );

    res.json({
      versions: result.rows
    });
  } catch (error) {
    next(error);
  }
}

async function restore(req, res, next) {
  try {
    const version = (
      await query(
        "SELECT * FROM post_versions WHERE version_id=$1 AND post_id=$2",
        [req.params.versionId, req.params.id]
      )
    ).rows[0];

    const existing = (
      await query(
        "SELECT * FROM posts WHERE post_id=$1",
        [req.params.id]
      )
    ).rows[0];

    if (!version || !existing) {
      return res.status(404).json({
        message: "Version not found."
      });
    }

    if (!canEdit(existing, req.user)) {
      return res.status(403).json({
        message: "You cannot restore this post."
      });
    }

    req.body = {
      title: version.title,
      content: version.content,
      excerpt: version.excerpt,
      status: "draft",
      metaTitle: version.meta_title,
      metaDescription: version.meta_description,
      categoryId: existing.category_id,
      language: existing.language,
      featuredImage: existing.featured_image,
      metaKeywords: existing.meta_keywords,
      isFeatured: existing.is_featured,
      allowComments: existing.allow_comments,
      tags: []
    };

    return update(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function mine(req, res, next) {
  req.query.status = "all";

  try {
    const isAuthorOnly = req.user.role === "author";

    const result = await query(
      `SELECT
        p.post_id,
        p.title,
        p.slug,
        p.status,
        p.updated_at,
        p.created_at,
        p.view_count,
        p.is_featured,
        c.name AS category_name
      FROM posts p
      LEFT JOIN categories c ON c.category_id=p.category_id
      ${isAuthorOnly ? "WHERE p.author_id=$1" : ""}
      ORDER BY p.updated_at DESC`,
      isAuthorOnly ? [req.user.user_id] : []
    );

    res.json({
      posts: result.rows
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  getForEdit,
  getBySlug,
  create,
  update,
  remove,
  versions,
  restore,
  mine
};