import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import {
  ACTIVITY_TYPES,
  APPOINTMENT_KINDS,
  APPOINTMENT_STATUSES,
  ATTACHMENT_KINDS,
  ATTENDANCES,
  CLIENT_STATUSES,
  DEFAULT_REMINDER_MINUTES,
  INTERESTS,
  SOURCES,
} from "../lib/domain";

export const leaders = sqliteTable("leaders", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const clients = sqliteTable(
  "clients",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    interest: text("interest", { enum: INTERESTS }).notNull(),
    interestNotes: text("interest_notes"),
    status: text("status", { enum: CLIENT_STATUSES }).notNull().default("novo"),
    source: text("source", { enum: SOURCES }),
    leaderId: text("leader_id").references(() => leaders.id, { onDelete: "set null" }),
    /** Presencial (vem à loja) ou online (cliente de longe). */
    attendance: text("attendance", { enum: ATTENDANCES }).notNull().default("presencial"),
    /** Valor da carta/crédito pretendido, em centavos. */
    creditCents: integer("credit_cents"),
    /** Valor da adesão paga, em centavos (preenchido na aprovação/fechamento). */
    adesaoCents: integer("adesao_cents"),
    /** Primeiro atendimento pelo líder (visita ou reunião online). */
    firstVisitAt: text("first_visit_at"),
    analysisStartedAt: text("analysis_started_at"),
    approvedAt: text("approved_at"),
    closedAt: text("closed_at"),
    lostAt: text("lost_at"),
    lostReason: text("lost_reason"),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("clients_status_idx").on(t.status),
    index("clients_leader_idx").on(t.leaderId),
    index("clients_name_idx").on(t.name),
    index("clients_approved_idx").on(t.approvedAt),
  ],
);

export const appointments = sqliteTable(
  "appointments",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    scheduledAt: text("scheduled_at").notNull(),
    kind: text("kind", { enum: APPOINTMENT_KINDS }).notNull().default("visita"),
    status: text("status", { enum: APPOINTMENT_STATUSES }).notNull().default("agendado"),
    notes: text("notes"),
    reminderMinutes: integer("reminder_minutes").notNull().default(DEFAULT_REMINDER_MINUTES),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("appointments_scheduled_idx").on(t.scheduledAt), index("appointments_client_idx").on(t.clientId)],
);

export const activities = sqliteTable(
  "activities",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    type: text("type", { enum: ACTIVITY_TYPES }).notNull(),
    content: text("content").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("activities_client_idx").on(t.clientId)],
);

/** Propostas, documentos e comprovantes anexados ao cliente (arquivo em data/uploads). */
export const attachments = sqliteTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ATTACHMENT_KINDS }).notNull().default("proposta"),
    title: text("title").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    /** Caminho relativo à pasta de uploads. */
    storageKey: text("storage_key").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("attachments_client_idx").on(t.clientId)],
);

export const leadersRelations = relations(leaders, ({ many }) => ({
  clients: many(clients),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  leader: one(leaders, { fields: [clients.leaderId], references: [leaders.id] }),
  appointments: many(appointments),
  activities: many(activities),
  attachments: many(attachments),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  client: one(clients, { fields: [appointments.clientId], references: [clients.id] }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  client: one(clients, { fields: [activities.clientId], references: [clients.id] }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  client: one(clients, { fields: [attachments.clientId], references: [clients.id] }),
}));

export type Leader = typeof leaders.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
