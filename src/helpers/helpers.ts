import { Pages } from "../enums/pages";
import { URLDataType } from "../types/URLDataType";

export const ExtractDataFromUrl = (url: URL): URLDataType => {
  const pathname = url.pathname;

  const extractedData: URLDataType = {
    artist_id: null,
    content_origin: null,
    page_type: Pages.Unknown,
    post_id: null
  };

  if (pathname === '/posts') {
    extractedData.page_type = Pages.PostListPage;
  }
  else if (pathname.startsWith('/artists')) {
    extractedData.page_type = Pages.ArtistListPage;
  }
  else if (pathname.match(/^\/[^/]+\/user\/[^/]+$/)) {
    // Matches /original_source/user/user_id
    extractedData.page_type = Pages.ArtistPage;

    const parts = pathname.split('/');
    extractedData.content_origin = parts[1];
    extractedData.artist_id = parts[3];
  }

  else if (pathname.match(/^\/[^/]+\/user\/[^/]+\/post\/[^/]+$/)) {
    // Matches /original_source/user/user_id/post/post_id
    extractedData.page_type = Pages.PostPage;

    const parts = pathname.split('/');
    extractedData.content_origin = parts[1];
    extractedData.artist_id = parts[3];
    extractedData.post_id = parts[5];
  }

  return extractedData;
}

export const GetDate = () => {
  return (new Date()).toJSON();
}