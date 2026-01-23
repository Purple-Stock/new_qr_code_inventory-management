import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// Users table - without Devise, using bcrypt for password hashing
export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    resetPasswordToken: text("reset_password_token"),
    resetPasswordSentAt: integer("reset_password_sent_at", { mode: "timestamp" }),
    rememberCreatedAt: integer("remember_created_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    emailIdx: uniqueIndex("index_users_on_email").on(table.email),
    resetPasswordTokenIdx: uniqueIndex("index_users_on_reset_password_token").on(
      table.resetPasswordToken
    ),
  })
);

// Teams table
export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  notes: text("notes"),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Locations table
export const locations = sqliteTable(
  "locations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description"),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    teamIdIdx: index("index_locations_on_team_id").on(table.teamId),
    teamIdNameIdx: uniqueIndex("index_locations_on_team_id_and_name").on(
      table.teamId,
      table.name
    ),
  })
);

// Items table
export const items = sqliteTable(
  "items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name"),
    sku: text("sku"),
    barcode: text("barcode"),
    cost: real("cost"), // decimal(10, 2) -> real in SQLite
    price: real("price"), // decimal(10, 2) -> real in SQLite
    itemType: text("item_type"),
    brand: text("brand"),
    initialQuantity: integer("initial_quantity").default(0),
    currentStock: real("current_stock").default(0.0), // decimal(10, 2) -> real
    minimumStock: real("minimum_stock").default(0.0), // decimal(10, 2) -> real
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    locationId: integer("location_id").references(() => locations.id),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    skuIdx: index("index_items_on_sku").on(table.sku),
    barcodeIdx: index("index_items_on_barcode").on(table.barcode),
    teamIdIdx: index("index_items_on_team_id").on(table.teamId),
    locationIdIdx: index("index_items_on_location_id").on(table.locationId),
  })
);

// Stock Transaction Type enum (as text in SQLite)
export type StockTransactionType =
  | "stock_in"
  | "stock_out"
  | "adjust"
  | "move"
  | "count";

// Stock Transactions table
export const stockTransactions = sqliteTable(
  "stock_transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    transactionType: text("transaction_type").$type<StockTransactionType>().notNull(),
    quantity: real("quantity").notNull(), // decimal(10, 2) -> real
    notes: text("notes"),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    sourceLocationId: integer("source_location_id").references(
      () => locations.id
    ),
    destinationLocationId: integer("destination_location_id").references(
      () => locations.id
    ),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    itemIdIdx: index("index_stock_transactions_on_item_id").on(table.itemId),
    itemIdCreatedAtIdx: index("index_stock_transactions_on_item_id_and_created_at").on(
      table.itemId,
      table.createdAt
    ),
    teamIdIdx: index("index_stock_transactions_on_team_id").on(table.teamId),
    userIdIdx: index("index_stock_transactions_on_user_id").on(table.userId),
    transactionTypeIdx: index("index_stock_transactions_on_transaction_type").on(
      table.transactionType
    ),
    sourceLocationIdIdx: index("index_stock_transactions_on_source_location_id").on(
      table.sourceLocationId
    ),
    destinationLocationIdIdx: index(
      "index_stock_transactions_on_destination_location_id"
    ).on(table.destinationLocationId),
  })
);

// API Keys table
export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    tokenIdx: uniqueIndex("index_api_keys_on_token").on(table.token),
    userIdIdx: index("index_api_keys_on_user_id").on(table.userId),
  })
);

// Webhooks table
export const webhooks = sqliteTable(
  "webhooks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    url: text("url"),
    event: text("event"),
    secret: text("secret"),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    teamIdIdx: index("index_webhooks_on_team_id").on(table.teamId),
  })
);

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;

export type StockTransaction = typeof stockTransactions.$inferSelect;
export type NewStockTransaction = typeof stockTransactions.$inferInsert;

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;

// Relations (optional, for easier querying)
export const usersRelations = relations(users, ({ many }) => ({
  teams: many(teams),
  stockTransactions: many(stockTransactions),
  apiKeys: many(apiKeys),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  user: one(users, {
    fields: [teams.userId],
    references: [users.id],
  }),
  items: many(items),
  locations: many(locations),
  stockTransactions: many(stockTransactions),
  webhooks: many(webhooks),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  team: one(teams, {
    fields: [locations.teamId],
    references: [teams.id],
  }),
  items: many(items),
  sourceStockTransactions: many(stockTransactions, {
    relationName: "sourceLocation",
  }),
  destinationStockTransactions: many(stockTransactions, {
    relationName: "destinationLocation",
  }),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  team: one(teams, {
    fields: [items.teamId],
    references: [teams.id],
  }),
  location: one(locations, {
    fields: [items.locationId],
    references: [locations.id],
  }),
  stockTransactions: many(stockTransactions),
}));

export const stockTransactionsRelations = relations(
  stockTransactions,
  ({ one }) => ({
    item: one(items, {
      fields: [stockTransactions.itemId],
      references: [items.id],
    }),
    team: one(teams, {
      fields: [stockTransactions.teamId],
      references: [teams.id],
    }),
    user: one(users, {
      fields: [stockTransactions.userId],
      references: [users.id],
    }),
    sourceLocation: one(locations, {
      fields: [stockTransactions.sourceLocationId],
      references: [locations.id],
      relationName: "sourceLocation",
    }),
    destinationLocation: one(locations, {
      fields: [stockTransactions.destinationLocationId],
      references: [locations.id],
      relationName: "destinationLocation",
    }),
  })
);

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const webhooksRelations = relations(webhooks, ({ one }) => ({
  team: one(teams, {
    fields: [webhooks.teamId],
    references: [teams.id],
  }),
}));
