// Re-export schema from @boardsesh/db with aliases for backward compatibility
export {
  boardSessions as sessions,
  boardSessions,
  boardSessionClients as sessionClients,
  boardSessionQueues as sessionQueues,
  boardSessionQueues,
  sessionBoards,
  type BoardSession as Session,
  type NewBoardSession as NewSession,
  type BoardSessionClient as SessionClient,
  type NewBoardSessionClient as NewSessionClient,
  type BoardSessionQueue as SessionQueue,
  type NewBoardSessionQueue as NewSessionQueue,
  type SessionBoard,
  type NewSessionBoard,
} from '@boardsesh/db/schema/app';
