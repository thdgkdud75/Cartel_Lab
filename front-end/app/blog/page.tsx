import { serverFetch } from "@/lib/api-client";
import type { BlogListResponse } from "@/types/blog";
import { BlogHero } from "./_hero";
import { PostListSection } from "./_post-list-section";
import { blogShellClassName } from "./_styles";

async function getBlogPosts() {
  try {
    return await serverFetch("/blog/", { cache: "no-store" }) as BlogListResponse;
  } catch {
    return { posts: [], count: 0, current_tab: "all" } satisfies BlogListResponse;
  }
}

export default async function BlogPage() {
  const data = await getBlogPosts();

  return (
    <div className={blogShellClassName}>
      <BlogHero postCount={data.count} />
      <PostListSection posts={data.posts} />
    </div>
  );
}
