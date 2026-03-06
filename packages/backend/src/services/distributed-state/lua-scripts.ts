/**
 * Lua script for atomic leader election.
 * Atomically sets both the leader key (with TTL) AND the isLeader flag on the connection hash.
 * This prevents race conditions where process crashes between operations.
 * Returns: 1 if leader was set, 0 if leader already exists
 */
export const LEADER_ELECTION_SCRIPT = `
  local leaderKey = KEYS[1]
  local connKey = KEYS[2]
  local connectionId = ARGV[1]
  local leaderTTL = tonumber(ARGV[2])

  -- Check if leader already exists
  local currentLeader = redis.call('GET', leaderKey)
  if currentLeader then
    return 0
  end

  -- Atomically set this connection as leader with TTL AND update isLeader flag
  redis.call('SET', leaderKey, connectionId, 'EX', leaderTTL)
  redis.call('HSET', connKey, 'isLeader', 'true')
  return 1
`;

/**
 * Lua script to elect new leader from session members.
 * Picks the member with the earliest connectedAt timestamp.
 * Also clears the old leader's isLeader flag and refreshes TTL.
 * Returns: connectionId of new leader, or nil if no members
 *
 * Note: This script clears isLeader for the old leader regardless of whether
 * they are the leaving connection. This ensures no stale isLeader flags remain
 * even if the calling code order changes (e.g., if script runs before connection deletion).
 */
export const ELECT_NEW_LEADER_SCRIPT = `
  local sessionMembersKey = KEYS[1]
  local leaderKey = KEYS[2]
  local leavingConnectionId = ARGV[1]
  local membersTTL = tonumber(ARGV[2])
  local leaderTTL = tonumber(ARGV[3])

  -- Get and clear old leader's isLeader flag first (including leaving connection for robustness)
  local oldLeader = redis.call('GET', leaderKey)
  if oldLeader then
    local oldLeaderConnKey = 'boardsesh:conn:' .. oldLeader
    if redis.call('EXISTS', oldLeaderConnKey) == 1 then
      redis.call('HSET', oldLeaderConnKey, 'isLeader', 'false')
    end
  end

  -- Get all members except the leaving one
  local members = redis.call('SMEMBERS', sessionMembersKey)
  local candidates = {}

  for _, memberId in ipairs(members) do
    if memberId ~= leavingConnectionId then
      local connKey = 'boardsesh:conn:' .. memberId
      local connectedAt = redis.call('HGET', connKey, 'connectedAt')
      if connectedAt then
        table.insert(candidates, {memberId, tonumber(connectedAt)})
      end
    end
  end

  -- No candidates left
  if #candidates == 0 then
    redis.call('DEL', leaderKey)
    return nil
  end

  -- Sort by connectedAt (earliest first)
  table.sort(candidates, function(a, b) return a[2] < b[2] end)

  local newLeaderId = candidates[1][1]

  -- Set new leader with TTL
  redis.call('SET', leaderKey, newLeaderId, 'EX', leaderTTL)

  -- Update isLeader flag on the new leader connection
  local connKey = 'boardsesh:conn:' .. newLeaderId
  redis.call('HSET', connKey, 'isLeader', 'true')

  -- Refresh TTL on session members set to prevent expiry during long sessions
  if membersTTL and membersTTL > 0 then
    redis.call('EXPIRE', sessionMembersKey, membersTTL)
  end

  return newLeaderId
`;

/**
 * Lua script for atomic leave session operation.
 * Atomically checks leader status, updates connection, removes from session, and elects new leader.
 * This prevents race conditions where leader status could change between read and update.
 * Returns: newLeaderId if was leader and new leader elected, empty string if was leader but no candidates, nil if not leader
 */
export const LEAVE_SESSION_SCRIPT = `
  local connKey = KEYS[1]
  local sessionMembersKey = KEYS[2]
  local leaderKey = KEYS[3]
  local connectionId = ARGV[1]
  local membersTTL = tonumber(ARGV[2])
  local leaderTTL = tonumber(ARGV[3])

  -- Get current leader to check if this connection is leader (atomically)
  local currentLeader = redis.call('GET', leaderKey)
  local wasLeader = (currentLeader == connectionId)

  -- Update connection state
  redis.call('HMSET', connKey, 'sessionId', '', 'isLeader', 'false')

  -- Remove from session members
  redis.call('SREM', sessionMembersKey, connectionId)

  -- If not leader, return nil (no leader election needed)
  if not wasLeader then
    return nil
  end

  -- Was leader, need to elect new one
  local members = redis.call('SMEMBERS', sessionMembersKey)
  local candidates = {}

  for _, memberId in ipairs(members) do
    if memberId ~= connectionId then
      local memberConnKey = 'boardsesh:conn:' .. memberId
      local connectedAt = redis.call('HGET', memberConnKey, 'connectedAt')
      if connectedAt then
        table.insert(candidates, {memberId, tonumber(connectedAt)})
      end
    end
  end

  -- No candidates left
  if #candidates == 0 then
    redis.call('DEL', leaderKey)
    return ''  -- Empty string means was leader but no new leader
  end

  -- Sort by connectedAt (earliest first)
  table.sort(candidates, function(a, b) return a[2] < b[2] end)

  local newLeaderId = candidates[1][1]

  -- Set new leader with TTL
  redis.call('SET', leaderKey, newLeaderId, 'EX', leaderTTL)

  -- Update isLeader flag on new leader
  local newLeaderConnKey = 'boardsesh:conn:' .. newLeaderId
  redis.call('HSET', newLeaderConnKey, 'isLeader', 'true')

  -- Refresh session members TTL
  if membersTTL and membersTTL > 0 then
    redis.call('EXPIRE', sessionMembersKey, membersTTL)
  end

  return newLeaderId
`;

/**
 * Lua script for atomic session join with leader election.
 * Atomically updates connection, adds to session members, and attempts leader election.
 * This prevents race conditions where a crash between these operations could leave
 * a connection in the members set without proper leader election.
 * Returns: 1 if became leader, 0 if not
 */
export const JOIN_SESSION_SCRIPT = `
  local connKey = KEYS[1]
  local sessionMembersKey = KEYS[2]
  local leaderKey = KEYS[3]
  local connectionId = ARGV[1]
  local sessionId = ARGV[2]
  local connTTL = tonumber(ARGV[3])
  local sessionTTL = tonumber(ARGV[4])
  local username = ARGV[5]
  local avatarUrl = ARGV[6]
  local UNSET = '__UNSET__'

  -- Update connection with session info
  redis.call('HSET', connKey, 'sessionId', sessionId)
  if username and username ~= '' and username ~= UNSET then
    redis.call('HSET', connKey, 'username', username)
  end
  -- Only update avatarUrl if explicitly provided (not the sentinel value)
  -- Empty string is valid (means clear avatar), sentinel means don't update
  if avatarUrl ~= UNSET then
    redis.call('HSET', connKey, 'avatarUrl', avatarUrl)
  end
  redis.call('EXPIRE', connKey, connTTL)

  -- Add to session members
  redis.call('SADD', sessionMembersKey, connectionId)
  redis.call('EXPIRE', sessionMembersKey, sessionTTL)

  -- Try to become leader (only if no leader exists)
  local currentLeader = redis.call('GET', leaderKey)
  if currentLeader then
    return 0  -- Already has a leader
  end

  -- Become leader
  redis.call('SET', leaderKey, connectionId, 'EX', sessionTTL)
  redis.call('HSET', connKey, 'isLeader', 'true')
  return 1
`;

/**
 * Lua script for atomic TTL refresh of connection and session membership.
 * Atomically refreshes both TTLs based on the connection's current session.
 * Returns: 1 if successful, 0 if connection doesn't exist
 */
export const REFRESH_TTL_SCRIPT = `
  local connKey = KEYS[1]
  local connTTL = tonumber(ARGV[1])
  local sessionTTL = tonumber(ARGV[2])

  -- Check if connection exists
  if redis.call('EXISTS', connKey) == 0 then
    return 0
  end

  -- Refresh connection TTL
  redis.call('EXPIRE', connKey, connTTL)

  -- Get session ID and refresh session membership TTL if in a session
  local sessionId = redis.call('HGET', connKey, 'sessionId')
  if sessionId and sessionId ~= '' then
    local sessionMembersKey = 'boardsesh:session:' .. sessionId .. ':members'
    redis.call('EXPIRE', sessionMembersKey, sessionTTL)
  end

  return 1
`;

/**
 * Lua script to prune stale members from a session.
 * For each member in the session set, checks if the connection hash still exists.
 * Removes stale entries, re-elects leader if needed, and cleans up empty sessions.
 * KEYS[1] = session members key
 * KEYS[2] = session leader key
 * ARGV[1] = session TTL
 * Returns: number of stale members removed
 */
export const PRUNE_STALE_SESSION_MEMBERS_SCRIPT = `
  local sessionMembersKey = KEYS[1]
  local leaderKey = KEYS[2]
  local sessionTTL = tonumber(ARGV[1])

  local members = redis.call('SMEMBERS', sessionMembersKey)
  local staleCount = 0
  local leaderRemoved = false
  local currentLeader = redis.call('GET', leaderKey)

  for _, memberId in ipairs(members) do
    local connKey = 'boardsesh:conn:' .. memberId
    if redis.call('EXISTS', connKey) == 0 then
      -- Connection hash expired/missing — this member is stale
      redis.call('SREM', sessionMembersKey, memberId)
      staleCount = staleCount + 1
      if currentLeader == memberId then
        leaderRemoved = true
      end
    end
  end

  -- If no stale members removed, nothing else to do
  if staleCount == 0 then
    return 0
  end

  -- Check remaining members
  local remaining = redis.call('SMEMBERS', sessionMembersKey)
  if #remaining == 0 then
    -- Session is empty, clean up
    redis.call('DEL', sessionMembersKey)
    redis.call('DEL', leaderKey)
    return staleCount
  end

  -- Re-elect leader if needed
  if leaderRemoved then
    -- Find the earliest connected remaining member
    local candidates = {}
    for _, memberId in ipairs(remaining) do
      local connKey = 'boardsesh:conn:' .. memberId
      local connectedAt = redis.call('HGET', connKey, 'connectedAt')
      if connectedAt then
        table.insert(candidates, {memberId, tonumber(connectedAt)})
      end
    end

    if #candidates == 0 then
      redis.call('DEL', leaderKey)
    else
      -- Clear old leader flag if their connection still exists
      if currentLeader then
        local oldConnKey = 'boardsesh:conn:' .. currentLeader
        if redis.call('EXISTS', oldConnKey) == 1 then
          redis.call('HSET', oldConnKey, 'isLeader', 'false')
        end
      end

      table.sort(candidates, function(a, b) return a[2] < b[2] end)
      local newLeaderId = candidates[1][1]
      redis.call('SET', leaderKey, newLeaderId, 'EX', sessionTTL)
      local newLeaderConnKey = 'boardsesh:conn:' .. newLeaderId
      redis.call('HSET', newLeaderConnKey, 'isLeader', 'true')
    end
  end

  -- Refresh TTL on session members set
  if sessionTTL and sessionTTL > 0 then
    redis.call('EXPIRE', sessionMembersKey, sessionTTL)
  end

  return staleCount
`;
