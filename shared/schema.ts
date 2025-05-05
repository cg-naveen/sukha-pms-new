import { pgTable, text, serial, integer, boolean, timestamp, unique, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const roleEnum = pgEnum('role', ['superadmin', 'admin', 'staff', 'user']);
export const roomTypeEnum = pgEnum('room_type', ['studio', 'studio_deluxe', '1_bedroom', '2_bedroom', '3_bedroom']);
export const roomStatusEnum = pgEnum('room_status', ['vacant', 'occupied', 'maintenance', 'reserved']);
export const billingStatusEnum = pgEnum('billing_status', ['paid', 'pending', 'overdue']);
export const visitorStatusEnum = pgEnum('visitor_status', ['pending', 'approved', 'rejected']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: roleEnum("role").notNull().default('user'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Residents table
export const residents = pgTable("residents", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  dateOfBirth: date("date_of_birth"),
  idNumber: text("id_number").unique(),
  address: text("address"),
  photo: text("photo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Next of kin table
export const nextOfKin = pgTable("next_of_kin", {
  id: serial("id").primaryKey(),
  residentId: integer("resident_id").references(() => residents.id).notNull(),
  fullName: text("full_name").notNull(),
  relationship: text("relationship").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Rooms table
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  unitNumber: text("unit_number").notNull().unique(),
  roomType: roomTypeEnum("room_type").notNull(),
  size: integer("size").notNull(), // Size in square feet
  floor: integer("floor").notNull(),
  status: roomStatusEnum("status").notNull().default('vacant'),
  monthlyRate: integer("monthly_rate").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Occupancy table
export const occupancy = pgTable("occupancy", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => rooms.id).notNull(),
  residentId: integer("resident_id").references(() => residents.id).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.roomId, t.residentId, t.active),
}));

// Billings table
export const billings = pgTable("billings", {
  id: serial("id").primaryKey(),
  occupancyId: integer("occupancy_id").references(() => occupancy.id).notNull(),
  amount: integer("amount").notNull(),
  dueDate: date("due_date").notNull(),
  status: billingStatusEnum("status").notNull().default('pending'),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Visitors table
export const visitors = pgTable("visitors", {
  id: serial("id").primaryKey(),
  residentId: integer("resident_id").references(() => residents.id).notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  purpose: text("purpose").notNull(),
  visitDate: date("visit_date").notNull(),
  status: visitorStatusEnum("status").notNull().default('pending'),
  approvedById: integer("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  qrCode: text("qr_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  approvedVisitors: many(visitors),
}));

export const residentsRelations = relations(residents, ({ one, many }) => ({
  nextOfKin: many(nextOfKin),
  occupancy: many(occupancy),
  visitors: many(visitors),
}));

export const nextOfKinRelations = relations(nextOfKin, ({ one }) => ({
  resident: one(residents, { fields: [nextOfKin.residentId], references: [residents.id] }),
}));

export const roomsRelations = relations(rooms, ({ many }) => ({
  occupancy: many(occupancy),
}));

export const occupancyRelations = relations(occupancy, ({ one, many }) => ({
  room: one(rooms, { fields: [occupancy.roomId], references: [rooms.id] }),
  resident: one(residents, { fields: [occupancy.residentId], references: [residents.id] }),
  billings: many(billings),
}));

export const billingsRelations = relations(billings, ({ one }) => ({
  occupancy: one(occupancy, { fields: [billings.occupancyId], references: [occupancy.id] }),
}));

export const visitorsRelations = relations(visitors, ({ one }) => ({
  resident: one(residents, { fields: [visitors.residentId], references: [residents.id] }),
  approvedBy: one(users, { fields: [visitors.approvedById], references: [users.id] }),
}));

// Validation schemas
export const insertUserSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "Username must be at least 3 characters"),
  password: (schema) => schema.min(6, "Password must be at least 6 characters"),
  email: (schema) => schema.email("Must provide a valid email"),
  fullName: (schema) => schema.min(2, "Full name must be at least 2 characters"),
  role: (schema) => schema,
}).omit({ createdAt: true, updatedAt: true });

export const insertResidentSchema = createInsertSchema(residents, {
  fullName: (schema) => schema.min(2, "Full name must be at least 2 characters"),
  email: (schema) => schema.email("Must provide a valid email"),
  phone: (schema) => schema.min(10, "Phone number must be at least 10 characters"),
}).omit({ createdAt: true, updatedAt: true });

export const insertNextOfKinSchema = createInsertSchema(nextOfKin, {
  fullName: (schema) => schema.min(2, "Full name must be at least 2 characters"),
  phone: (schema) => schema.min(10, "Phone number must be at least 10 characters"),
}).omit({ createdAt: true, updatedAt: true });

export const insertRoomSchema = createInsertSchema(rooms, {
  unitNumber: (schema) => schema.min(2, "Unit number must be at least 2 characters"),
}).omit({ createdAt: true, updatedAt: true });

export const insertOccupancySchema = createInsertSchema(occupancy).omit({ createdAt: true, updatedAt: true });

export const insertBillingSchema = createInsertSchema(billings).omit({ createdAt: true, updatedAt: true });

export const insertVisitorSchema = createInsertSchema(visitors, {
  fullName: (schema) => schema.min(2, "Full name must be at least 2 characters"),
  email: (schema) => schema.email("Must provide a valid email"),
  phone: (schema) => schema.min(10, "Phone number must be at least 10 characters"),
  purpose: (schema) => schema.min(5, "Purpose must be at least 5 characters"),
}).omit({ 
  createdAt: true, 
  updatedAt: true, 
  status: true, 
  approvedById: true, 
  approvedAt: true, 
  qrCode: true 
});

export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertResident = z.infer<typeof insertResidentSchema>;
export type Resident = typeof residents.$inferSelect;

export type InsertNextOfKin = z.infer<typeof insertNextOfKinSchema>;
export type NextOfKin = typeof nextOfKin.$inferSelect;

export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;

export type InsertOccupancy = z.infer<typeof insertOccupancySchema>;
export type Occupancy = typeof occupancy.$inferSelect;

export type InsertBilling = z.infer<typeof insertBillingSchema>;
export type Billing = typeof billings.$inferSelect;

export type InsertVisitor = z.infer<typeof insertVisitorSchema>;
export type Visitor = typeof visitors.$inferSelect;

export type Login = z.infer<typeof loginSchema>;
