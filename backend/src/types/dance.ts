export type DanceRequest = {
  topic: string;
  mood?: string;
  genre?: string;
};

export type LyricResult = {
  title: string;
  lyrics: string;
};

export type SunoTrackResult = {
  trackId: string;
  status: "submitted" | "queued" | "streaming" | "complete" | "error";
  audioUrl?: string;
  bpm?: number;
};

export type DanceMove = {
  timestamp: number;
  move: string;
  description: string;
};

export type DanceWorkflowResult = {
  lyrics: LyricResult;
  track: SunoTrackResult;
  stepChart?: DanceMove[];
};
