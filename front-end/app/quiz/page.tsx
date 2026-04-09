"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { dbFetch } from "@/lib/api-client";
import { useAuthFetch } from "@/lib/use-auth-fetch";
import { MentorSection } from "./_mentor-section";
import { StudentSection } from "./_student-section";
import type { MentorQuizData } from "./_mentor-section";
import type { StudentQuizData } from "./_student-section";
import { pageShellStyle, shellInnerStyle } from "./_styles";

type QuizPageData =
  | ({ grade: "1" } & StudentQuizData)
  | ({ grade: "2" } & MentorQuizData);

export default function QuizPage() {
  const { status } = useSession();
  const authFetch = useAuthFetch();
  const [data, setData] = useState<QuizPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const fetchQuizData = useCallback(async () => {
    if (status === "loading") return;

    setLoading(true);
    setError(null);

    try {
      const query = weekOffset > 0 ? `?w=${weekOffset}` : "";
      const result = status === "authenticated"
        ? await authFetch(`/quiz/${query}`)
        : await dbFetch(`/quiz/${query}`);
      setData(result as QuizPageData);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "퀴즈 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, status, weekOffset]);

  useEffect(() => {
    fetchQuizData();
  }, [fetchQuizData]);

  if (status === "loading") {
    return null;
  }

  return (
    <div style={pageShellStyle}>
      <div style={shellInnerStyle}>
        {data?.grade === "2" ? (
          <MentorSection
            data={data}
            loading={loading}
            error={error}
            weekOffset={weekOffset}
            onWeekOffsetChange={setWeekOffset}
            authFetch={authFetch}
            onRefresh={fetchQuizData}
          />
        ) : (
          <StudentSection
            data={data?.grade === "1" ? data : null}
            loading={loading}
            error={error}
            authFetch={authFetch}
            onRefresh={fetchQuizData}
          />
        )}
      </div>
    </div>
  );
}
