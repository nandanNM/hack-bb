// schema has been human tested and perfect as per requirements
import { relations } from "drizzle-orm";
import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { baseSchema, controller, school, student } from "./schema";

export const user = pgTable(
  "user",
  {
    ...baseSchema,
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("emailVerified").default(false).notNull(),
    image: text("image"),
    role: text("role"),
    banned: boolean("banned").default(false),
    banReason: text("banReason"),
    banExpires: timestamp("banExpires"),
    schoolId: uuid("schoolId") //use uuid type for foreign key references
      .references(() => school.id, { onDelete: "cascade" }),
    studentId: uuid("studentId") //use uuid type for foreign key references
      .references(() => student.id, { onDelete: "cascade" }),
    controllerId: uuid("controllerId") //use uuid type for foreign key references
      .references(() => controller.id, { onDelete: "cascade" }),
    isActive: boolean("isActive"),
    disabledAt: timestamp("disabledAt"),
  },
  (table) => [
    // unique email per school
    // two different schools can have same email for different users
    uniqueIndex("uqUserEmailSchool").on(table.email, table.schoolId),
    index("idxUsersSchool").on(table.schoolId),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(), // Keep it text only because drizzle doesn't support uuid for session id
    expiresAt: timestamp("expiresAt").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: uuid("userId") //use uuid type for foreign key references
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonatedBy"),
  },
  (table) => [index("sessionUserIdIdx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    ...baseSchema,
    accountId: uuid("accountId").notNull(), //use uuid type for foreign key references
    providerId: text("providerId").notNull(),
    userId: uuid("userId") //use uuid type for foreign key references
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
  },
  (table) => [index("accountUserIdIdx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    ...baseSchema,
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
  },
  (table) => [index("verificationIdentifierIdx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
