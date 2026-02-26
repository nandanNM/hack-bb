import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";
/**
 * make sure to use `as const` so typescript can infer the type correctly
 */
const statement = {
  ...defaultStatements,
  student: ["create", "read", "update", "delete"],
  school: ["create", "read", "update", "delete"],
} as const;

export const ac = createAccessControl(statement);

export const student = ac.newRole({
  student: ["read", "update"], // Can read/update their own profile (conceptually)
  school: ["read"], // Can view their school
});

export const schoolAdmin = ac.newRole({
  student: ["create", "read", "update", "delete"], // Manage students
  school: ["read", "update"], // Manage their school
});

export const superAdmin = ac.newRole({
  student: ["create", "read", "update", "delete"],
  school: ["create", "read", "update", "delete"],
  ...adminAc.statements, // Full admin access
});
