type StorageData = Content[]

type Content = {
  site: string,
  content_origin: string,
  creator?: string,
  creator_id: string,
  posts: Post[]
}