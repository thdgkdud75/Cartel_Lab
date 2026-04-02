export type BlogAuthor = {
  name: string;
  student_id: string;
};

export type BlogPostCard = {
  id: number;
  title: string;
  slug: string;
  summary: string;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  author: BlogAuthor;
};

export type BlogPostDetail = BlogPostCard & {
  content: string;
};

export type BlogListResponse = {
  posts: BlogPostCard[];
  count: number;
  current_tab: string;
};
