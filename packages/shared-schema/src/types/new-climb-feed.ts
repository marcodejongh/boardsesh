// New Climb Feed & Subscriptions

export type NewClimbSubscription = {
  id: string;
  boardType: string;
  layoutId: number;
  createdAt: string;
};

export type NewClimbSubscriptionInput = {
  boardType: string;
  layoutId: number;
};

export type NewClimbFeedItem = {
  uuid: string;
  name?: string | null;
  boardType: string;
  layoutId: number;
  setterDisplayName?: string | null;
  setterAvatarUrl?: string | null;
  angle?: number | null;
  frames?: string | null;
  difficultyName?: string | null;
  createdAt: string;
};

export type NewClimbFeedResult = {
  items: NewClimbFeedItem[];
  totalCount: number;
  hasMore: boolean;
};

export type NewClimbFeedInput = {
  boardType: string;
  layoutId: number;
  limit?: number;
  offset?: number;
};

export type NewClimbCreatedEvent = {
  climb: NewClimbFeedItem;
};
