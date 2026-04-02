import Link from "next/link";
import type { BlogPostCard } from "@/types/blog";
import { blogCardClassName, blogContainerClassName } from "./_styles";

type Props = {
  posts: BlogPostCard[];
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function AuthorBadge({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff2e8] text-sm font-black text-[#d95f02]">
        {name.slice(0, 1)}
      </div>
      <div>
        <p className="text-sm font-semibold text-[#202124]">{name}</p>
        <p className="text-xs text-[#70757d]">Cartel Lab</p>
      </div>
    </div>
  );
}

export function PostListSection({ posts }: Props) {
  return (
    <section className={`${blogContainerClassName} py-10 pb-20`}>
      {posts.length ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className={`${blogCardClassName} group flex h-full flex-col transition-transform duration-200 hover:-translate-y-1.5`}
            >
              <div className="relative aspect-[1.2/1] overflow-hidden bg-[linear-gradient(135deg,#fff1e8_0%,#f7d7c4_100%)]">
                {post.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.thumbnail_url}
                    alt={post.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full items-end p-6">
                    <div className="max-w-[15rem] rounded-[22px] bg-white/75 px-4 py-3 backdrop-blur">
                      <span className="text-xs font-semibold tracking-[0.18em] text-[#b25a1b]">BLOG POST</span>
                      <p className="mt-2 text-lg font-black leading-tight tracking-[-0.03em] text-[#1f1f1f]">
                        {post.title}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d95f02]">
                  {formatDate(post.created_at)}
                </p>
                <h2 className="mt-3 text-[1.35rem] font-black leading-[1.2] tracking-[-0.03em] text-[#202124]">
                  {post.title}
                </h2>
                <p className="mt-4 line-clamp-3 text-sm leading-7 text-[#5f6368]">
                  {post.summary || "요약이 아직 등록되지 않았습니다."}
                </p>

                <div className="mt-8 flex items-center justify-between gap-4 border-t border-black/10 pt-5">
                  <AuthorBadge name={post.author.name} />
                  <span className="text-sm font-semibold text-[#202124]">읽기</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={`${blogCardClassName} px-8 py-20 text-center`}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#d95f02]">EMPTY</p>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-[#202124]">등록된 글이 없습니다</h2>
          <p className="mt-3 text-sm text-[#5f6368]">백엔드에 공개된 블로그 글이 생기면 이 영역에 자동으로 표시됩니다.</p>
        </div>
      )}
    </section>
  );
}
