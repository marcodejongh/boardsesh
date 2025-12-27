import { relations } from 'drizzle-orm/relations';
import { boardSessions, boardSessionClients, boardSessionQueues } from '../schema/app/sessions.js';
import { users } from '../schema/auth/users.js';

export const boardSessionsRelations = relations(boardSessions, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [boardSessions.createdByUserId],
    references: [users.id],
  }),
  clients: many(boardSessionClients),
  queue: one(boardSessionQueues, {
    fields: [boardSessions.id],
    references: [boardSessionQueues.sessionId],
  }),
}));

export const boardSessionClientsRelations = relations(boardSessionClients, ({ one }) => ({
  session: one(boardSessions, {
    fields: [boardSessionClients.sessionId],
    references: [boardSessions.id],
  }),
}));

export const boardSessionQueuesRelations = relations(boardSessionQueues, ({ one }) => ({
  session: one(boardSessions, {
    fields: [boardSessionQueues.sessionId],
    references: [boardSessions.id],
  }),
}));
