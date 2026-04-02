"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useAuthFetch } from "@/lib/use-auth-fetch";
import { Routes, ApiPaths, Methods, Responses } from "@/constants/enums";
import type { Profile } from "@/types/user";

type Props = {
  profile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
};

export function ResumeSection({ profile, setProfile }: Props) {
  const authFetch = useAuthFetch();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [responseType, setResponseType] = useState<Responses | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(file: File | null) {
    if (!file) {
      setResponseType(Responses.ERROR);
      setResponseMessage("파일이 없습니다.");
      return;
    }
    const allowed = ["application/pdf", "text/plain"];
    if (!allowed.includes(file.type)) {
      setResponseType(Responses.ERROR);
      setResponseMessage("PDF 또는 TXT 파일만 업로드 가능합니다.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setResponseType(Responses.ERROR);
      setResponseMessage("파일 크기는 10MB를 넘을 수 없습니다.");
      return;
    }
    setSelectedFile(file);
    setResponseType(null);
    setResponseMessage("");
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setResponseType(null);
    setResponseMessage("");
    try {
      const formData = new FormData();
      formData.append("resume_file", selectedFile);
      const updated = await authFetch(`${Routes.AUTH}${ApiPaths.PROFILE_RESUME}`, {
        method: Methods.POST,
        body: formData,
      });
      setProfile((prev) => prev ? { ...prev, resume_file: updated.resume_file ?? prev.resume_file } : prev);
      setSelectedFile(null);
    } catch (error) {
      setResponseType(Responses.ERROR);
      setResponseMessage(error instanceof Error ? error.message : "업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    await authFetch(`${Routes.AUTH}${ApiPaths.PROFILE_RESUME}`, {
      method: Methods.DELETE,
    }).catch(() => null);
    setProfile((prev) => prev ? { ...prev, resume_file: null } : prev);
    setSelectedFile(null);
    setResponseType(null);
    setResponseMessage("");
  }

  return (
    <section style={{ padding: 24, border: "1px solid #ebecef", borderRadius: 22, background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, background: "#fff7f2", flexShrink: 0 }}>
          <Image src="/icons/resume-file.svg" alt="" aria-hidden="true" width={18} height={18} />
        </span>
        <h2 style={{ margin: 0, fontSize: 20, letterSpacing: "-0.03em" }}>이력서 등록</h2>
      </div>
      <p style={{ margin: "0 0 18px", color: "#6b7280", lineHeight: 1.7 }}>
        PDF 또는 텍스트 파일을 업로드하면 AI가 분석해드립니다.
      </p>

      {profile?.resume_file && !selectedFile ? (
        <div style={{ border: "1px solid #e2e5e9", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "#f9f9fb" }}>
            <Image src="/icons/resume-file.svg" alt="" aria-hidden="true" width={18} height={18} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#39404a", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {profile.resume_file}
            </span>
          </div>
          <div style={{ display: "flex", borderTop: "1px solid #e2e5e9" }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ flex: 1, padding: "10px 0", background: "none", border: "none", fontSize: 13, fontWeight: 600, color: "#5f6672", cursor: "pointer" }}
            >
              수정
            </button>
            <div style={{ width: 1, background: "#e2e5e9" }} />
            <button
              onClick={handleDelete}
              style={{ flex: 1, padding: "10px 0", background: "none", border: "none", fontSize: 13, fontWeight: 600, color: "#c2410c", cursor: "pointer" }}
            >
              삭제
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileChange(e.dataTransfer.files[0] ?? null); }}
            style={{
              border: `2px dashed ${dragOver ? "#ff6f0f" : "#dfe3ea"}`,
              borderRadius: 14, padding: "24px 16px",
              textAlign: "center", cursor: "pointer",
              background: dragOver ? "#fff7f2" : "#fafafa",
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            {selectedFile ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <Image src="/icons/resume-file.svg" alt="" aria-hidden="true" width={18} height={18} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#39404a" }}>{selectedFile.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                  style={{ marginLeft: 4, fontSize: 13, color: "#c2410c", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                >
                  제거
                </button>
              </div>
            ) : (
              <>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 8px" }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#39404a" }}>
                  파일을 여기에 드래그하거나 클릭해서 선택
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>PDF 또는 TXT · 최대 10MB</p>
              </>
            )}
          </div>
          {selectedFile && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              style={{
                marginTop: 12, width: "100%", padding: "11px 16px",
                border: "none", borderRadius: 12,
                background: uploading ? "#e5e7eb" : "#ff6f0f",
                color: uploading ? "#9ca3af" : "#fff",
                fontSize: 14, fontWeight: 700,
                cursor: uploading ? "not-allowed" : "pointer",
              }}
            >
              {uploading ? "업로드 중..." : "업로드"}
            </button>
          )}
        </>
      )}
      {responseType === Responses.ERROR && responseMessage && (
        <p style={{ margin: "10px 2px 0", color: "#dc2626", fontSize: 13, lineHeight: 1.5 }}>
          {responseMessage}
        </p>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt"
        style={{ display: "none" }}
        onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
      />
    </section>
  );
}
