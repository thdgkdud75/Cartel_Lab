"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { login } from "@/server/auth-action";

export default function LoginPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(studentId, password);

    setLoading(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    router.push("/");
    router.refresh();
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
            <label htmlFor="student_id" className="text-sm text-[#555] font-medium">
              학번
            </label>
            <input
              id="student_id"
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="학번을 입력하세요"
              required
              className="border border-[#eaebee] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#ff6f0f] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm text-[#555] font-medium">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
              className="border border-[#eaebee] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#ff6f0f] transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-[#ff6f0f] text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-[#e5640d] transition-colors disabled:opacity-60"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
