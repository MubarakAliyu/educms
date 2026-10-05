const router=require("express").Router();const {body}=require("express-validator");const validate=require("../middleware/validation");const c=require("../controllers/authController");const {authenticate}=require("../middleware/auth");
router.post("/register",[body("name").trim().isLength({min:2}),body("email").isEmail(),body("password").isLength({min:6})],validate,c.register);
router.post("/login",[body("email").isEmail(),body("password").notEmpty()],validate,c.login);
router.post("/logout",c.logout);router.get("/me",authenticate,c.me);module.exports=router;
