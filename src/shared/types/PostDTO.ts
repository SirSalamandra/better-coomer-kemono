/** Shape of an attachment in the API response */
export type PostAttachmentDTO = {
  path: string;
  name: string;
};

/** Shape of a post object returned by the kemono/coomer API */
export type PostDTO = {
  id: string;
  title: string;
  published: string;
  file: { path: string; name: string } | null;
  attachments: PostAttachmentDTO[];
};

/** Response shape from GET /api/v1/{service}/user/{id}/post/{postId} */
export type PostResponseDTO = {
  post: PostDTO;
  attachments: PostAttachmentDTO[];
};
