require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const bcrypt = require("bcryptjs");
const migrate = require("../database/migrate");
const { query, close } = require("../config/database");

async function seed() {
  await migrate();
  const passwordHash = await bcrypt.hash("Admin123!", 10);

  const admin = await query(
    `INSERT INTO users (username,email,password_hash,first_name,last_name,role,is_active,email_verified)
     VALUES ('admin','admin@educms.local',$1,'Edu','Admin','admin',TRUE,TRUE)
     ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, role='admin', is_active=TRUE
     RETURNING user_id`,
    [passwordHash]
  );
  const adminId = admin.rows[0].user_id;

  const categories = [
    ["Computer Science", "computer-science", "Computer science and computing concepts."],
    ["Programming", "programming", "Programming tutorials and practical guides."],
    ["Web Development", "web-development", "Modern web development resources."],
    ["Data Science", "data-science", "Data science and analytics topics."],
  ];
  const categoryIds = {};
  for (const [name, slug, description] of categories) {
    const result = await query(`INSERT INTO categories(name,slug,description) VALUES($1,$2,$3) ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name RETURNING category_id`, [name, slug, description]);
    categoryIds[slug] = result.rows[0].category_id;
  }

  const tags = ["JavaScript", "React", "Node.js", "Python", "Tutorial", "Advanced", "Beginner"];
  const tagIds = {};
  for (const name of tags) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const result = await query(`INSERT INTO tags(name,slug) VALUES($1,$2) ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name RETURNING tag_id`, [name, slug]);
    tagIds[slug] = result.rows[0].tag_id;
  }

  const posts = [
    {
      title:"Getting Started with React.js",
      slug:"getting-started-with-react",
      content:"<h2>React fundamentals</h2><p>React helps developers build reusable interfaces from components. This guide covers components, props, state, and the mental model behind modern React applications.</p><h3>Start small</h3><p>Build one component, compose it with others, and keep state close to where it is used.</p>",
      excerpt:"A practical introduction to React components, state, and reusable interfaces.",
      category:categoryIds["web-development"],
      featured:true,
      tags:[tagIds.react,tagIds.javascript,tagIds.tutorial],
      reading:5,
    },
    {
      title:"Python for Data Science",
      slug:"python-for-data-science",
      content:"<h2>Why Python?</h2><p>Python is widely used for data analysis, automation, and machine learning because its syntax is approachable and its ecosystem is rich.</p><p>Start with data structures, functions, NumPy, and pandas before moving into visualization and modeling.</p>",
      excerpt:"Discover why Python remains a practical choice for data science work.",
      category:categoryIds["data-science"],
      featured:false,
      tags:[tagIds.python,tagIds.advanced,tagIds.tutorial],
      reading:6,
    },
    {
      title:"Designing Clean Node.js APIs",
      slug:"designing-clean-nodejs-apis",
      content:"<h2>Small routes, focused services</h2><p>A maintainable API separates routing, validation, authorization, data access, and response formatting.</p><p>Use consistent status codes, clear errors, and tests for important behaviors.</p>",
      excerpt:"Structure Express APIs around small responsibilities and predictable contracts.",
      category:categoryIds.programming,
      featured:true,
      tags:[tagIds["node-js"],tagIds.advanced,tagIds.tutorial],
      reading:5,
    },
  ];

  for (const post of posts) {
    const result = await query(
      `INSERT INTO posts(title,slug,content,excerpt,author_id,category_id,status,language,published_at,meta_title,meta_description,is_featured,allow_comments,reading_time)
       VALUES($1,$2,$3,$4,$5,$6,'published','en',CURRENT_TIMESTAMP,$1,$4,$7,TRUE,$8)
       ON CONFLICT(slug) DO UPDATE SET title=EXCLUDED.title,content=EXCLUDED.content,excerpt=EXCLUDED.excerpt,category_id=EXCLUDED.category_id,is_featured=EXCLUDED.is_featured,reading_time=EXCLUDED.reading_time
       RETURNING post_id`,
      [post.title,post.slug,post.content,post.excerpt,adminId,post.category,post.featured,post.reading]
    );
    const postId = result.rows[0].post_id;
    await query("DELETE FROM post_tags WHERE post_id=$1", [postId]);
    for (const tagId of post.tags) await query("INSERT INTO post_tags(post_id,tag_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [postId,tagId]);
  }

  console.log("Seed complete. Admin: admin@educms.local / Admin123!");
}

if (require.main === module) seed().then(() => close()).catch(async (error) => { console.error(error); await close(); process.exit(1); });
module.exports = seed;
