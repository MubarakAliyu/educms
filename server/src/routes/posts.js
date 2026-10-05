const router=require("express").Router();const {body}=require("express-validator");const validate=require("../middleware/validation");const c=require("../controllers/postController");const {authenticate,authorize}=require("../middleware/auth");
router.get("/",c.list);router.get("/mine",authenticate,authorize("admin","editor","author"),c.mine);router.get("/edit/:id",authenticate,authorize("admin","editor","author"),c.getForEdit);router.get("/:slug",c.getBySlug);
const editorRoles=["admin","editor","author"];
const rules=[body("title").trim().isLength({min:3}),body("content").notEmpty()];
router.post("/",authenticate,authorize(...editorRoles),rules,validate,c.create);
router.put("/:id",authenticate,authorize(...editorRoles),rules,validate,c.update);
router.delete("/:id",authenticate,authorize("admin","editor"),c.remove);
router.get("/:id/versions",authenticate,authorize(...editorRoles),c.versions);router.post("/:id/restore/:versionId",authenticate,authorize(...editorRoles),c.restore);
module.exports=router;
