/** Response shape from GET /api/v1/{service}/user/{id}/profile */
export type ArtistProfileDTO = {
  id: string;
  name: string;
  service: string;
  indexed: string;
  updated: string;
  public_id: string;
  relation_id: number | null;
  has_chats: boolean;
  post_count: number;
  dm_count: number;
  share_count: number;
  chat_count: number;
};
