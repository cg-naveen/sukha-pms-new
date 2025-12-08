import { pgTable, text, serial, integer, boolean, timestamp, unique, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const roleEnum = pgEnum('role', ['superadmin', 'admin', 'staff', 'user']);
export const roomTypeEnum = pgEnum('room_type', ['studio', 'studio_deluxe']);
export const roomStatusEnum = pgEnum('room_status', ['vacant', 'occupied', 'maintenance', 'reserved']);
export const billingStatusEnum = pgEnum('billing_status', ['paid', 'pending', 'overdue', 'new_invoice']);
export const visitorStatusEnum = pgEnum('visitor_status', ['pending', 'approved', 'rejected']);
export const salesReferralEnum = pgEnum('sales_referral', ['caGrand', 'Sales Team', 'Offline Event', 'Other']);
export const countryCodeEnum = pgEnum('country_code', ['+60', '+65', '+86', '+91', '+1', '+44', '+61', '+81']);
export const purposeOfVisitEnum = pgEnum('purpose_of_visit', ['general_visit', 'site_visit', 'celebration', 'delivery', 'maintenance', 'other']);
export const billingAccountEnum = pgEnum('billing_account', ['sukha_golden', 'care_grand']);
export const residentClassificationEnum = pgEnum('resident_classification', ['independent', 'dependent', 'memory_care']);

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
  countryCode: countryCodeEnum("country_code").notNull().default('+60'),
  dateOfBirth: date("date_of_birth"),
  idNumber: text("id_number").unique(),
  address: text("address"),
  photo: text("photo"),
  roomId: integer("room_id").references(() => rooms.id),
  salesReferral: salesReferralEnum("sales_referral").notNull().default('Other'),
  billingDate: integer("billing_date").notNull().default(1), // Day of month for billing (1-31)
  numberOfBeds: integer("number_of_beds").notNull().default(1), // Number of beds required by the resident
  classification: residentClassificationEnum("classification").notNull().default('independent'), // Resident classification: independent, dependent, or memory_care
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
  numberOfBeds: integer("number_of_beds").notNull().default(1), // Number of beds in the room
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
  residentId: integer("resident_id").references(() => residents.id).notNull(),
  occupancyId: integer("occupancy_id").references(() => occupancy.id),
  amount: integer("amount").notNull(),
  dueDate: date("due_date").notNull(),
  status: billingStatusEnum("status").notNull().default('pending'),
  description: text("description"),
  invoiceFile: text("invoice_file"), // PDF file path/URL
  billingAccount: billingAccountEnum("billing_account").notNull().default('sukha_golden'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Visitors table
export const visitors = pgTable("visitors", {
  id: serial("id").primaryKey(),
  residentId: integer("resident_id").references(() => residents.id),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  countryCode: countryCodeEnum("country_code").notNull().default('+60'),
  nricPassport: text("nric_passport").notNull(), // New field for NRIC/Passport number
  purposeOfVisit: purposeOfVisitEnum("purpose_of_visit").notNull().default('general_visit'), // Updated to use enum
  otherPurpose: text("other_purpose"), // For when purpose is 'other'
  visitDate: date("visit_date").notNull(),
  visitTime: text("visit_time"),
  status: visitorStatusEnum("status").notNull().default('pending'),
  approvedById: integer("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  qrCode: text("qr_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Additional fields for public registration
  residentName: text("resident_name"),
  roomNumber: text("room_number"),
  vehicleNumber: text("vehicle_number"),
  numberOfVisitors: integer("number_of_visitors"),
  details: text("details"),
});

// Documents table for resident documents
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  residentId: integer("resident_id").references(() => residents.id).notNull(),
  title: text("title").notNull(), // e.g. "Tenancy Agreement", "ID Copy", etc.
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"), // Size in bytes
  mimeType: text("mime_type").notNull(), // e.g. "application/pdf", "image/jpeg"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'visitor', 'billing', 'resident', 'room'
  entityId: integer("entity_id"), // ID of related entity
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Settings table - single row table for system settings
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  // General settings
  propertyName: text("property_name").notNull().default("Sukha Senior Resort"),
  address: text("address").notNull().default(""),
  contactEmail: text("contact_email").notNull().default(""),
  contactPhone: text("contact_phone").notNull().default(""),
  // Notification settings
  enableEmailNotifications: boolean("enable_email_notifications").notNull().default(true),
  enableSmsNotifications: boolean("enable_sms_notifications").notNull().default(false),
  billingReminderDays: integer("billing_reminder_days").notNull().default(7),
  visitorApprovalNotification: boolean("visitor_approval_notification").notNull().default(true),
  // Job scheduling settings
  billingGenerationEnabled: boolean("billing_generation_enabled").notNull().default(true),
  billingGenerationHour: integer("billing_generation_hour").notNull().default(2), // 0-23 (24-hour format)
  billingGenerationMinute: integer("billing_generation_minute").notNull().default(0), // 0-59
  // Content management
  visitorTermsAndConditions: text("visitor_terms_and_conditions"), // Terms and conditions for visitor registration
  // Wabot integration settings
  wabotApiBaseUrl: text("wabot_api_base_url").default("https://app.wabot.my/api"), // Wabot API base URL
  // Message templates
  visitorApprovalMessageTemplate: text("visitor_approval_message_template"), // WhatsApp message template for visitor approval
  visitorRejectionMessageTemplate: text("visitor_rejection_message_template"), // WhatsApp message template for visitor rejection
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
  billings: many(billings),
  documents: many(documents),
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

export const documentsRelations = relations(documents, ({ one }) => ({
  resident: one(residents, { fields: [documents.residentId], references: [residents.id] }),
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

export const insertDocumentSchema = createInsertSchema(documents, {
  title: (schema) => schema.min(2, "Document title must be at least 2 characters"),
  fileName: (schema) => schema.min(1, "File name is required"),
  filePath: (schema) => schema.min(1, "File path is required"),
}).omit({ createdAt: true, updatedAt: true });

export const insertVisitorSchema = createInsertSchema(visitors, {
  fullName: (schema) => schema.min(2, "Full name must be at least 2 characters"),
  email: (schema) => schema.email("Must provide a valid email"),
  phone: (schema) => schema.min(10, "Phone number must be at least 10 characters"),
  nricPassport: (schema) => schema.min(5, "NRIC/Passport number must be at least 5 characters"),
  // Make purpose optional for both paths (purpose or details can be used)
  otherPurpose: (schema) => schema.optional(),
  details: (schema) => schema.optional(),
}).omit({ 
  createdAt: true, 
  updatedAt: true, 
  status: true, 
  approvedById: true, 
  approvedAt: true, 
  qrCode: true 
});

export const insertSettingsSchema = createInsertSchema(settings, {
  propertyName: (schema) => schema.min(2, "Property name must be at least 2 characters"),
  contactEmail: (schema) => schema.email("Must provide a valid email"),
  contactPhone: (schema) => schema.min(10, "Phone number must be at least 10 characters"),
  billingReminderDays: (schema) => schema.int().min(1).max(30),
  billingGenerationHour: (schema) => schema.int().min(0).max(23),
  billingGenerationMinute: (schema) => schema.int().min(0).max(59),
}).omit({ id: true, createdAt: true, updatedAt: true }).partial();

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

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertVisitor = z.infer<typeof insertVisitorSchema>;
export type Visitor = typeof visitors.$inferSelect;

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

export type Login = z.infer<typeof loginSchema>;

// Public visitor registration schema
export const publicVisitorRegistrationSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Must provide a valid email"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  nricPassport: z.string().min(5, "NRIC/Passport number must be at least 5 characters"),
  residentName: z.string().min(2, "Resident name is required"),
  roomNumber: z.string().optional().nullable(),
  visitDate: z.string(),
  visitTime: z.string(),
  vehicleNumber: z.string().optional().nullable(),
  numberOfVisitors: z.number().min(1, "Number of visitors must be at least 1"),
  purposeOfVisit: z.enum(["general_visit", "site_visit", "celebration", "delivery", "maintenance", "other"]),
  otherPurpose: z.string().optional(),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions to proceed",
  }),
}).refine(
  (data) => {
    // If purpose is 'other', otherPurpose must be provided and not empty
    if (data.purposeOfVisit === "other") {
      return data.otherPurpose !== undefined && data.otherPurpose.trim() !== "";
    }
    return true;
  },
  {
    message: "Please specify the purpose of your visit",
    path: ["otherPurpose"]
  }
);
