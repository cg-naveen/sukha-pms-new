import { mysqlTable, text, int, boolean, timestamp, unique, date, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const roleEnum = mysqlEnum('role', ['superadmin', 'admin', 'staff', 'user']);
export const roomTypeEnum = mysqlEnum('room_type', ['studio', 'studio_deluxe', '1_bedroom', '2_bedroom', '3_bedroom']);
export const roomStatusEnum = mysqlEnum('room_status', ['vacant', 'occupied', 'maintenance', 'reserved']);
export const billingStatusEnum = mysqlEnum('billing_status', ['paid', 'pending', 'overdue', 'new_invoice']);
export const visitorStatusEnum = mysqlEnum('visitor_status', ['pending', 'approved', 'rejected']);
export const salesReferralEnum = mysqlEnum('sales_referral', ['caGrand', 'Sales Team', 'Offline Event', 'Other']);
export const countryCodeEnum = mysqlEnum('country_code', ['+60', '+65', '+86', '+91', '+1', '+44', '+61', '+81']);

// Users table
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: roleEnum.default('user'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Residents table
export const residents = mysqlTable("residents", {
  id: int("id").primaryKey().autoincrement(),
  fullName: text("full_name").notNull(),
  icNumber: text("id_number").notNull().unique(),
  email: text("email"),
  phone: text("phone"),
  dateOfBirth: date("date_of_birth"),
  emergencyContact: text("emergency_contact"),
  roomId: int("room_id"),
  salesReferral: salesReferralEnum.default('caGrand'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Next of kin table
export const nextOfKin = mysqlTable("next_of_kin", {
  id: int("id").primaryKey().autoincrement(),
  residentId: int("resident_id").references(() => residents.id).notNull(),
  fullName: text("full_name").notNull(),
  relationship: text("relationship").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Rooms table
export const rooms = mysqlTable("rooms", {
  id: int("id").primaryKey().autoincrement(),
  unitNumber: text("unit_number").notNull().unique(),
  floorNumber: int("floor").notNull(),
  roomType: roomTypeEnum.notNull(),
  status: mysqlEnum("status", ['vacant', 'occupied', 'maintenance', 'reserved']).default('vacant'),
  monthlyRent: int("monthly_rate").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Occupancy table
export const occupancy = mysqlTable("occupancy", {
  id: int("id").primaryKey().autoincrement(),
  roomId: int("room_id").references(() => rooms.id).notNull(),
  residentId: int("resident_id").references(() => residents.id).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.roomId, t.residentId, t.active),
}));

// Billings table
export const billings = mysqlTable("billings", {
  id: int("id").primaryKey().autoincrement(),
  residentId: int("resident_id").references(() => residents.id).notNull(),
  occupancyId: int("occupancy_id").references(() => occupancy.id),
  amount: int("amount").notNull(),
  dueDate: date("due_date").notNull(),
  status: billingStatusEnum.default('pending'),
  description: text("description"),
  invoiceFile: text("invoice_file"), // PDF file path/URL
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Visitors table
export const visitors = mysqlTable("visitors", {
  id: int("id").primaryKey().autoincrement(),
  residentId: int("resident_id").references(() => residents.id),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  countryCode: countryCodeEnum.default('+60'),
  purpose: text("purpose"),
  visitDate: date("visit_date").notNull(),
  visitTime: text("visit_time"),
  status: visitorStatusEnum.default('pending'),
  approvedById: int("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  qrCode: text("qr_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Additional fields for public registration
  residentName: text("resident_name"),
  roomNumber: text("room_number"),
  vehicleNumber: text("vehicle_number"),
  numberOfVisitors: int("number_of_visitors"),
  details: text("details"),
});

// Notifications table
export const notifications = mysqlTable("notifications", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'visitor', 'billing', 'resident', 'room'
  entityId: int("entity_id"), // ID of related entity
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  approvedVisitors: many(visitors),
}));

export const residentsRelations = relations(residents, ({ one, many }) => ({
  nextOfKin: many(nextOfKin),
  occupancy: many(occupancy),
  visitors: many(visitors),
  billings: many(billings),
  room: one(rooms, { fields: [residents.roomId], references: [rooms.id] }),
}));

export const nextOfKinRelations = relations(nextOfKin, ({ one }) => ({
  resident: one(residents, { fields: [nextOfKin.residentId], references: [residents.id] }),
}));

export const roomsRelations = relations(rooms, ({ many, one }) => ({
  occupancy: many(occupancy),
  residents: many(residents),
}));

export const occupancyRelations = relations(occupancy, ({ one, many }) => ({
  room: one(rooms, { fields: [occupancy.roomId], references: [rooms.id] }),
  resident: one(residents, { fields: [occupancy.residentId], references: [residents.id] }),
  billings: many(billings),
}));

export const billingsRelations = relations(billings, ({ one }) => ({
  resident: one(residents, { fields: [billings.residentId], references: [residents.id] }),
  occupancy: one(occupancy, { fields: [billings.occupancyId], references: [occupancy.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
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
  // Make purpose optional for both paths (purpose or details can be used)
  purpose: (schema) => schema.optional(),
  details: (schema) => schema.optional(),
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

// Public visitor registration schema
export const publicVisitorRegistrationSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Must provide a valid email"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  residentName: z.string().optional().nullable(),
  roomNumber: z.string().optional().nullable(),
  visitDate: z.string(),
  visitTime: z.string(),
  vehicleNumber: z.string().optional().nullable(),
  numberOfVisitors: z.number().min(1, "Number of visitors must be at least 1"),
  purpose: z.enum(["General Visit of Father/Mother/Relative", "Site Visit", "Celebration", "Other"]),
  otherPurpose: z.string().optional(),
}).refine(
  (data) => {
    // If purpose is 'Other', otherPurpose must be provided and not empty
    if (data.purpose === "Other") {
      return data.otherPurpose !== undefined && data.otherPurpose.trim() !== "";
    }
    return true;
  },
  {
    message: "Please specify the purpose of your visit",
    path: ["otherPurpose"]
  }
);
