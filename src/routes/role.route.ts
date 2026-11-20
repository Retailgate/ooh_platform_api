import express from "express";
import { Auth } from "../controllers/middleware.controller";
import { RoleController } from "../controllers/roles.controller";
const router = express.Router();

router.get("/test", RoleController.test);

router.get("/", Auth.verifyToken, RoleController.getRoles);

router.get("/permission_groups", Auth.verifyToken, RoleController.getPermissionGroups);

router.get("/permission_groups/:id", Auth.verifyToken, RoleController.getPermissionGroups);

router.get("/:id", Auth.verifyToken, RoleController.getRole);

router.post("/", Auth.verifyToken, RoleController.addRole);

router.post("/permission_groups", Auth.verifyToken, RoleController.addPermissionGroup);

router.put("/permission_groups/:id", Auth.verifyToken, RoleController.editPermissionGroupName);

router.put("/role_permissions/:id", Auth.verifyToken, RoleController.updateRolePermissions);

router.put("/:id", Auth.verifyToken, RoleController.updateRoleDetails);

router.post("/permissions/:id", Auth.verifyToken, RoleController.addPermission);

router.delete("/permissions/:id", Auth.verifyToken, RoleController.deletePermission);

router.delete("/permission_groups/:id", Auth.verifyToken, RoleController.deletePermissionGroup);

router.delete("/:id", Auth.verifyToken, RoleController.deleteRole);
export const RoleRoute = router;
