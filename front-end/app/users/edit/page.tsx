"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { useAuthFetch } from "@/lib/use-auth-fetch";

const P = { brand: "#ff6f0f", brandHover: "#e5640d", ink: "#212124", body: "#505762", muted: "#868b94", line: "#eaebee", surface: "#fff", page: "#f5f6f8", soft: "#fff7f2", softBorder: "#ffd3b6" };

export default function EditBasicInfoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const authFetch = useAuthFetch();

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const fieldsRef = useRef<HTMLDivElement[]>([]);
  const blob1Ref = useRef<HTMLDivElement>(null);
  const blob2Ref = useRef<HTMLDivElement>(null);
  const blob3Ref = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({ name: "", student_id: "", class_group: "", grade: "", new_password: "", new_password_confirm: "" });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // 세션에서 초기값
  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    if (session?.user) {
      setForm(prev => ({
        ...prev,
        name: session.user.name ?? "",
        class_group: session.user.class_group ?? "",
      }));
    }
  }, [session, status, router]);

  // /api/auth/me 에서 student_id, grade 로드
  useEffect(() => {
    if (status !== "authenticated") return;
    authFetch("/auth/me/").then((data: { student_id?: string; grade?: string }) => {
      setForm(prev => ({ ...prev, student_id: data.student_id ?? "", grade: data.grade ?? "" }));
    }).catch(() => {});
  }, [status, authFetch]);

  // GSAP 등장 애니메이션
  useEffect(() => {
    if (!cardRef.current) return;
    const ctx = gsap.context(() => {
      // 블롭 플로팅
      gsap.to(blob1Ref.current, { y: -28, x: 14, duration: 5, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(blob2Ref.current, { y: 22, x: -18, duration: 6.5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 1 });
      gsap.to(blob3Ref.current, { y: -16, x: 10, duration: 4.5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 2 });

      // 카드 등장
      gsap.fromTo(cardRef.current,
        { opacity: 0, y: 60, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "expo.out" }
      );

      // 타이틀
      gsap.fromTo(titleRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.25, ease: "power3.out" }
      );

      // 필드 스태거
      gsap.fromTo(fieldsRef.current,
        { opacity: 0, y: 30, filter: "blur(6px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55, stagger: 0.08, delay: 0.4, ease: "power3.out" }
      );
    });
    return () => ctx.revert();
  }, []);

  // 토스트 애니메이션
  useEffect(() => {
    if (!toast || !toastRef.current) return;
    gsap.fromTo(toastRef.current,
      { opacity: 0, y: 30, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(1.7)" }
    );
    const timer = setTimeout(() => {
      if (toastRef.current) {
        gsap.to(toastRef.current, { opacity: 0, y: 20, duration: 0.3, onComplete: () => setToast(null) });
      }
    }, 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleChange = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.new_password && form.new_password !== form.new_password_confirm) {
      setToast({ msg: "비밀번호가 일치하지 않습니다.", ok: false });
      return;
    }
    setLoading(true);

    // 버튼 흔들기
    const btn = (e.target as HTMLFormElement).querySelector("button[type=submit]");
    if (btn) gsap.to(btn, { scale: 0.94, duration: 0.1, yoyo: true, repeat: 1 });

    try {
      const body: Record<string, string> = {
        name: form.name,
        student_id: form.student_id,
        class_group: form.class_group,
        grade: form.grade,
      };
      if (form.new_password) {
        body.new_password = form.new_password;
        body.new_password_confirm = form.new_password_confirm;
      }
      await authFetch("/auth/me/update/", { method: "PATCH", body: JSON.stringify(body) });
      setToast({ msg: "정보가 수정되었습니다 ✓", ok: true });
      setForm(prev => ({ ...prev, new_password: "", new_password_confirm: "" }));

      // 카드 pulse
      gsap.to(cardRef.current, { boxShadow: "0 0 0 4px rgba(255,111,15,0.25)", duration: 0.3, yoyo: true, repeat: 1 });
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : "저장 실패", ok: false });
      gsap.to(cardRef.current, { x: -10, duration: 0.06, repeat: 5, yoyo: true, onComplete: () => { gsap.set(cardRef.current, { x: 0 }); } });
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") return null;

  const addField = (el: HTMLDivElement | null) => { if (el && !fieldsRef.current.includes(el)) fieldsRef.current.push(el); };

  return (
    <div ref={containerRef} style={{ minHeight: "100vh", background: P.page, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", position: "relative", overflow: "hidden" }}>

      {/* 블롭 배경 */}
      <div ref={blob1Ref} aria-hidden style={{ position: "absolute", top: "5%", left: "8%", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,111,15,0.18) 0%, transparent 70%)", filter: "blur(48px)", pointerEvents: "none" }} />
      <div ref={blob2Ref} aria-hidden style={{ position: "absolute", bottom: "10%", right: "6%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)", filter: "blur(48px)", pointerEvents: "none" }} />
      <div ref={blob3Ref} aria-hidden style={{ position: "absolute", top: "40%", right: "20%", width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />

      {/* 카드 */}
      <div ref={cardRef} style={{ width: "100%", maxWidth: 520, background: P.surface, borderRadius: 28, border: `1.5px solid ${P.line}`, boxShadow: "0 24px 80px rgba(0,0,0,0.09)", overflow: "hidden", position: "relative", zIndex: 1 }}>

        {/* 카드 상단 헤더 */}
        <div style={{ padding: "36px 36px 28px", background: `linear-gradient(135deg, #fff7f2 0%, #fff 100%)`, borderBottom: `1px solid ${P.line}` }}>
          <div ref={addField} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: P.soft, border: `1px solid ${P.softBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
              ✏️
            </div>
            <div>
              <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#c2560c", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>
                내 정보 변경
              </span>
              <h1 ref={titleRef} style={{ margin: 0, fontSize: 26, fontWeight: 900, color: P.ink, letterSpacing: "-0.03em", lineHeight: 1.2 }}>
                기본 정보 수정
              </h1>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: P.muted, lineHeight: 1.6 }}>이름, 학번, 반, 학년, 비밀번호를 변경할 수 있습니다.</p>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} style={{ padding: "28px 36px 36px", display: "flex", flexDirection: "column", gap: 0 }}>

          {/* 이름 + 학번 */}
          <div ref={addField} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <Field label="이름" value={form.name} onChange={v => handleChange("name", v)} placeholder="홍길동" />
            <Field label="학번" value={form.student_id} onChange={v => handleChange("student_id", v)} placeholder="20250001" />
          </div>

          {/* 반 + 학년 */}
          <div ref={addField} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <SelectField label="반" value={form.class_group} onChange={v => handleChange("class_group", v)} options={[{ value: "A", label: "A반" }, { value: "B", label: "B반" }]} />
            <SelectField label="학년" value={form.grade} onChange={v => handleChange("grade", v)} options={[{ value: "1", label: "1학년" }, { value: "2", label: "2학년" }, { value: "3", label: "3학년" }]} />
          </div>

          {/* 비밀번호 구분선 */}
          <div ref={addField} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, marginTop: 4 }}>
            <div style={{ flex: 1, height: 1, background: P.line }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: P.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>비밀번호 변경 (선택)</span>
            <div style={{ flex: 1, height: 1, background: P.line }} />
          </div>

          {/* 새 비밀번호 */}
          <div ref={addField} style={{ marginBottom: 14 }}>
            <Field label="새 비밀번호" value={form.new_password} onChange={v => handleChange("new_password", v)} type="password" placeholder="변경하려면 입력" />
          </div>
          <div ref={addField} style={{ marginBottom: 28 }}>
            <Field label="새 비밀번호 확인" value={form.new_password_confirm} onChange={v => handleChange("new_password_confirm", v)} type="password" placeholder="동일하게 입력" match={form.new_password ? form.new_password === form.new_password_confirm : undefined} />
          </div>

          {/* 버튼 그룹 */}
          <div ref={addField} style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={() => router.back()}
              style={{ flex: 1, padding: "14px 0", borderRadius: 14, border: `1.5px solid ${P.line}`, background: P.surface, color: P.body, fontWeight: 700, fontSize: 15, cursor: "pointer", letterSpacing: "-0.01em" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = P.page; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = P.surface; }}
            >
              취소
            </button>
            <button type="submit" disabled={loading}
              style={{ flex: 2, padding: "14px 0", borderRadius: 14, border: "none", background: loading ? "#ffd3b6" : `linear-gradient(135deg, ${P.brand}, ${P.brandHover})`, color: "#fff", fontWeight: 800, fontSize: 15, cursor: loading ? "default" : "pointer", letterSpacing: "-0.01em", boxShadow: loading ? "none" : "0 8px 24px rgba(255,111,15,0.35)", transition: "box-shadow 0.2s" }}
              onMouseEnter={e => { if (!loading) gsap.to(e.currentTarget, { scale: 1.03, duration: 0.2, ease: "power2.out" }); }}
              onMouseLeave={e => { gsap.to(e.currentTarget, { scale: 1, duration: 0.2, ease: "power2.out" }); }}
            >
              {loading ? "저장 중..." : "변경 저장"}
            </button>
          </div>
        </form>
      </div>

      {/* 토스트 */}
      {toast && (
        <div ref={toastRef} style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", background: toast.ok ? "#212124" : "#dc2626", color: "#fff", padding: "14px 28px", borderRadius: 14, fontWeight: 700, fontSize: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.22)", zIndex: 9999, whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ── 공용 인풋 컴포넌트 ── */
function Field({ label, value, onChange, type = "text", placeholder, match }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; match?: boolean }) {
  const [focused, setFocused] = useState(false);
  const borderColor = match === false ? "#dc2626" : match === true ? "#16a34a" : focused ? "#ff6f0f" : "#eaebee";

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#505762", letterSpacing: "0.02em" }}>{label}</span>
      <div style={{ position: "relative" }}>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${borderColor}`, background: focused ? "#fff" : "#fafbfc", fontSize: 14, color: "#212124", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s, background 0.2s", fontWeight: 500 }}
        />
        {match === true && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#16a34a", fontSize: 16 }}>✓</span>}
        {match === false && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#dc2626", fontSize: 16 }}>✗</span>}
      </div>
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const [focused, setFocused] = useState(false);
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#505762", letterSpacing: "0.02em" }}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${focused ? "#ff6f0f" : "#eaebee"}`, background: focused ? "#fff" : "#fafbfc", fontSize: 14, color: value ? "#212124" : "#a7adb7", outline: "none", cursor: "pointer", transition: "border-color 0.2s", fontWeight: 500, appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23868b94' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
      >
        <option value="">선택</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
