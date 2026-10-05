const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../config/database");

function publicUser(row) {
  return { id: row.user_id, username: row.username, email: row.email, name: [row.first_name,row.last_name].filter(Boolean).join(" "), role: row.role, avatar: row.avatar || null };
}
function issueCookie(res, userId) {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || "7d" });
  res.cookie("educms_token", token, { httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"lax", maxAge:7*24*60*60*1000 });
}

async function register(req,res,next) {
  try {
    const { name, email, password } = req.body;
    const [first_name,last_name] = String(name).trim().split(/\s+/,2);
    const hash = await bcrypt.hash(password,10);
    const username = email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g,"").slice(0,45) || `user${Date.now()}`;
    const result = await query(`INSERT INTO users(username,email,password_hash,first_name,last_name,role,is_active,email_verified) VALUES($1,$2,$3,$4,$5,'subscriber',TRUE,FALSE) RETURNING *`, [username,email.toLowerCase(),hash,first_name||"",last_name||""]);
    issueCookie(res,result.rows[0].user_id);
    res.status(201).json({ user:publicUser(result.rows[0]) });
  } catch (error) { if(error.code === "23505") return res.status(409).json({message:"An account with this email already exists."}); next(error); }
}
async function login(req,res,next) {
  try {
    const result = await query("SELECT * FROM users WHERE email=$1", [String(req.body.email).toLowerCase()]);
    const user = result.rows[0];
    if(!user || !(await bcrypt.compare(req.body.password,user.password_hash))) return res.status(401).json({message:"Invalid email or password."});
    await query("UPDATE users SET last_login=CURRENT_TIMESTAMP WHERE user_id=$1",[user.user_id]);
    issueCookie(res,user.user_id);
    res.json({user:publicUser(user)});
  } catch(error){next(error);}
}
function logout(_req,res){res.clearCookie("educms_token",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax"});res.json({message:"Signed out."});}
async function me(req,res){res.json({user:publicUser(req.user)});}
module.exports = { register,login,logout,me,publicUser };
