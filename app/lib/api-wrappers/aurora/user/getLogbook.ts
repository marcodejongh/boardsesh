// GET https://kilterboardapp.com/users/44710/logbook?types=ascent,bid HTTP/2
// host: kilterboardapp.com
// accept: application/json
// user-agent: Kilter%20Board/300 CFNetwork/1568.200.51 Darwin/24.1.0
// accept-language: en-AU,en;q=0.9
// accept-encoding: gzip, deflate, br
// cookie: token=XXXX

// Common fields for all logbook entries
interface BaseLogbookEntry {
  _type: 'bid' | 'ascent'; // Discriminator type, e.g., "bid" or "ascent"
  uuid: string; // Unique identifier for the logbook entry
  user_id: number; // ID of the user who made the entry
  climb_uuid: string; // Unique identifier for the climb
  angle: number; // Angle of the climb
  is_mirror: boolean; // Indicates if the climb was mirrored
  bid_count: number; // Number of bids/attempts
  comment: string; // Comment for the entry (empty string if none)
  climbed_at: string; // ISO 8601 date string for when the climb occurred
}

// Logbook entry type for "bid"
export interface BidLogbookEntry extends BaseLogbookEntry {
  _type: 'bid'; // Specific type for bid entries
}

// Logbook entry type for "ascent"
export interface AscentLogbookEntry extends BaseLogbookEntry {
  _type: 'ascent'; // Specific type for ascent entries
  attempt_id: number; // ID of the attempt (specific to ascents)
  quality: number; // Quality rating of the climb (1-5)
  difficulty: number; // Difficulty rating of the climb
  is_benchmark: boolean; // Indicates if the climb is a benchmark climb
}

// Union type for all logbook entries
export type LogbookEntry = BidLogbookEntry | AscentLogbookEntry;

// Response type for the logbook endpoint
export interface LogbookResponse {
  logbook: LogbookEntry[]; // Array of logbook entries (union type)
}
