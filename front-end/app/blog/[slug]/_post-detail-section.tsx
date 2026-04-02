import Link from "next/link";
import { renderMarkdown } from "@/lib/markdown";
import type { BlogPostDetail } from "@/types/blog";
import { blogCardClassName, blogContainerClassName } from "../_styles";

type Props = {
  post: BlogPostDetail;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PostDetailSection({ post }: Props) {
  return (
    <section className={`${blogContainerClassName} py-10 pb-20`}>
      <div className={`${blogCardClassName} mx-auto max-w-[940px] px-6 py-8 sm:px-10 sm:py-10`}>
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-[#d95f02]">
          <span aria-hidden="true">←</span>
          블로그 목록으로
        </Link>

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d95f02]">
            {formatDateTime(post.created_at)}
          </p>
          <h1 className="mt-4 text-[clamp(2.4rem,6vw,4.4rem)] font-black leading-[0.98] tracking-[-0.05em] text-[#202124]">
            {post.title}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-[#5f6368]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff2e8] text-base font-black text-[#d95f02]">
                {post.author.name.slice(0, 1)}
              </div>
              <div>
                <p className="font-semibold text-[#202124]">{post.author.name}</p>
                <p>{post.author.student_id || "Cartel Lab Member"}</p>
              </div>
            </div>
            <span className="rounded-full bg-[#f5f1eb] px-3 py-1.5 font-medium">최종 수정 {formatDateTime(post.updated_at)}</span>
          </div>
        </div>

        {post.thumbnail_url && (
          <div className="mt-10 overflow-hidden rounded-[28px] border border-black/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.thumbnail_url} alt={post.title} className="h-full w-full object-cover" />
          </div>
        )}

        <div
          className="mt-10 max-w-none text-[1.02rem] leading-8 text-[#2c2f33] [&_a]:font-semibold [&_a]:text-[#d95f02] [&_blockquote]:rounded-r-2xl [&_blockquote]:border-l-4 [&_blockquote]:border-[#d95f02] [&_blockquote]:bg-[#fff6f0] [&_blockquote]:px-5 [&_blockquote]:py-3 [&_blockquote]:text-[#5f432f] [&_code]:break-words [&_h1]:mt-10 [&_h1]:text-4xl [&_h1]:font-black [&_h1]:tracking-[-0.04em] [&_h2]:mt-10 [&_h2]:text-3xl [&_h2]:font-black [&_h2]:tracking-[-0.04em] [&_h3]:mt-8 [&_h3]:text-2xl [&_h3]:font-black [&_img]:my-8 [&_img]:w-full [&_img]:rounded-[28px] [&_li]:ml-6 [&_li]:list-disc [&_li]:pl-1 [&_ol>li]:list-decimal [&_p]:my-5 [&_pre]:my-8 [&_pre]:overflow-x-auto [&_pre]:rounded-[22px] [&_pre]:bg-[#111827] [&_pre]:p-5 [&_pre]:text-[#f9fafb] [&_strong]:font-bold"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
        />
      </div>
    </section>
  );
}
