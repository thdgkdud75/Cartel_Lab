import { notFound } from "next/navigation";
import { serverFetch } from "@/lib/api-client";
import type { BlogPostDetail } from "@/types/blog";
import { PostDetailSection } from "./_post-detail-section";
import { blogShellClassName } from "../_styles";

type Props = {
  params: Promise<{ slug: string }>;
};

async function getPost(slug: string) {
  try {
    return await serverFetch(`/blog/${slug}/`, { cache: "no-store" }) as BlogPostDetail;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {
      title: "기술 블로그 | Jvision Lab",
    };
  }

  return {
    title: `${post.title} | Jvision Lab`,
    description: post.summary,
  };
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className={blogShellClassName}>
      <PostDetailSection post={post} />
    </div>
  );
}
