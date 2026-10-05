const {query}=require("../config/database");
async function overview(_req,res,next){try{const [posts,users,comments,views,latest]=await Promise.all([
query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER(WHERE status='published')::int AS published, COUNT(*) FILTER(WHERE status='draft')::int AS drafts FROM posts"),
query("SELECT COUNT(*)::int AS total FROM users WHERE is_active=TRUE"),
query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER(WHERE status='pending')::int AS pending FROM comments"),
query("SELECT COALESCE(SUM(view_count),0)::int AS total FROM posts"),
query("SELECT post_id,title,view_count,status FROM posts ORDER BY view_count DESC LIMIT 5")]);
res.json({stats:{posts:posts.rows[0],users:users.rows[0],comments:comments.rows[0],views:views.rows[0].total},topPosts:latest.rows});}catch(e){next(e);}}
module.exports={overview};
