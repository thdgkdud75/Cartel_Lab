"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { API_BASE_URL } from "@/lib/api-client";
import { Routes, ApiPaths, Methods } from "@/constants/enums";

const CLASS_GROUPS = ["A", "B"];
const GRADES = [1, 2, 3];

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    student_id: "",
    name: "",
    class_group: "A",
    grade: "1",
    password: "",
    password_confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.password_confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}${Routes.AUTH}${ApiPaths.SIGNUP}`, {
        method: Methods.POST,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: form.student_id,
          name: form.name,
          class_group: form.class_group,
          grade: Number(form.grade),
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "회원가입에 실패했습니다.");
        return;
      }

      // 회원가입 성공 후 자동 로그인
      const result = await signIn("credentials", {
        redirect: false,
        student_id: form.student_id,
        password: form.password,
      });

      if (result?.error) {
        router.push("/login");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
      <div className="bg-white rounded-2xl shadow-sm border border-[#eaebee] p-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Image
            src="/images/teamlab-logo.png"
            alt="Jvision Lab"
            width={120}
            height={44}
            className="object-contain"
            style={{ width: 120, height: "auto" }}
          />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="student_id" className="text-sm text-[#555] font-medium">학번</label>
            <input
              id="student_id"
              name="student_id"
              type="text"
              value={form.student_id}
              onChange={handleChange}
              placeholder="학번을 입력하세요"
              required
              className="border border-[#eaebee] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#ff6f0f] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm text-[#555] font-medium">이름</label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="이름을 입력하세요"
              required
              className="border border-[#eaebee] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#ff6f0f] transition-colors"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label htmlFor="grade" className="text-sm text-[#555] font-medium">학년</label>
              <select
                id="grade"
                name="grade"
                value={form.grade}
                onChange={handleChange}
                className="border border-[#eaebee] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#ff6f0f] transition-colors bg-white"
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>{g}학년</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label htmlFor="class_group" className="text-sm text-[#555] font-medium">반</label>
              <select
                id="class_group"
                name="class_group"
                value={form.class_group}
                onChange={handleChange}
                className="border border-[#eaebee] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#ff6f0f] transition-colors bg-white"
              >
                {CLASS_GROUPS.map((c) => (
                  <option key={c} value={c}>{c}반</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm text-[#555] font-medium">비밀번호</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="비밀번호를 입력하세요"
              required
              className="border border-[#eaebee] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#ff6f0f] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password_confirm" className="text-sm text-[#555] font-medium">비밀번호 확인</label>
            <input
              id="password_confirm"
              name="password_confirm"
              type="password"
              value={form.password_confirm}
              onChange={handleChange}
              placeholder="비밀번호를 다시 입력하세요"
              required
              className="border border-[#eaebee] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#ff6f0f] transition-colors"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-[#ff6f0f] text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-[#e5640d] transition-colors disabled:opacity-60"
          >
            {loading ? "가입 중..." : "회원가입"}
          </button>

          <p className="text-center text-sm text-[#888]">
            이미 계정이 있으신가요?{" "}
            <a href="/login" className="text-[#ff6f0f] font-medium hover:underline">로그인</a>
          </p>
        </form>
      </div>
    </div>
  );
}
