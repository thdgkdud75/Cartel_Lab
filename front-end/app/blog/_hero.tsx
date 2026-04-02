import { blogContainerClassName } from "./_styles";

type Props = {
  postCount: number;
};

export function BlogHero({ postCount }: Props) {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(135deg,#171717_0%,#2f241f_55%,#db6a2a_100%)] py-20 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-12 top-8 h-40 w-40 rounded-full bg-white/8 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-56 w-56 translate-x-10 translate-y-10 rounded-full bg-[#ffd3b6]/25 blur-3xl" />
      </div>

      <div className={`${blogContainerClassName} relative`}>
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-[0.24em] text-white/80">
            TECH BLOG
          </span>
          <h1 className="mt-6 text-[clamp(2.8rem,7vw,5.8rem)] font-black leading-[0.92] tracking-[-0.06em]">
            팀의 실험과 구현을
            <br />
            읽는 공간
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
            Cartel Lab에서 다루는 문제 해결 과정, 구현 기록, 실험 노트를 모아둔 기술 블로그입니다.
          </p>
          <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#1f1f1f]">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#db6a2a]" />
            공개된 글 {postCount}개
          </div>
        </div>
      </div>
    </section>
  );
}
