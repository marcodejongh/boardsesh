// Re-export schema from @boardsesh/db with aliases for backward compatibility
export {
  boardSessions as sessions,
  boardSessionClients as sessionClients,
  boardSessionQueues as sessionQueues,
  type BoardSession as Session,
  type NewBoardSession as NewSession,
  type BoardSessionClient as SessionClient,
  type NewBoardSessionClient as NewSessionClient,
  type BoardSessionQueue as SessionQueue,
  type NewBoardSessionQueue as NewSessionQueue,
} from '@boardsesh/db/schema/app';
