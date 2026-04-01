"use client";

import { useCallback, useEffect, useState } from "react";
import { DASHBOARD_PALETTE } from "@/constants/colors";
import { useAuthFetch } from "@/lib/use-auth-fetch";
import type { JobCategory, JobPosting } from "@/types/jobs";
import { JobDetailModal } from "./_detail-modal";
import { JobsListSection } from "./_list-section";

const PALETTE = DASHBOARD_PALETTE;

type JobsPageData = {
  jobs: JobPosting[];
  scoring_enabled: boolean;
  categories: JobCategory[];
};

export default function JobsPage() {
  const authFetch = useAuthFetch();
  const [data, setData] = useState<JobsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await authFetch("/jobs/");
      setData(result as JobsPageData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "채용 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    const handleVisibleRefresh = () => {
      if (document.visibilityState === "visible") {
        fetchJobs();
      }
    };

    window.addEventListener("focus", fetchJobs);
    document.addEventListener("visibilitychange", handleVisibleRefresh);

    return () => {
      window.removeEventListener("focus", fetchJobs);
      document.removeEventListener("visibilitychange", handleVisibleRefresh);
    };
  }, [fetchJobs]);

  return (
    <div style={{ minHeight: "100vh", background: PALETTE.page }}>
      <div className="mx-auto max-w-[1120px] px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-8">
        <JobsListSection
          jobs={data?.jobs ?? []}
          categories={data?.categories ?? []}
          loading={loading}
          error={error}
          scoringEnabled={data?.scoring_enabled ?? false}
          onRetry={fetchJobs}
          onSelect={(job) => setSelectedJobId(job.id)}
        />

        <JobDetailModal jobId={selectedJobId} onClose={() => setSelectedJobId(null)} />
      </div>
    </div>
  );
}
