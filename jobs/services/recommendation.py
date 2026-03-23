import re


ROLE_KEYWORDS = {
    "backend": ("backend", "백엔드", "api", "server", "django", "spring", "fastapi"),
    "frontend": ("frontend", "프론트", "react", "vue", "javascript", "typescript", "html", "css"),
    "data": ("data", "데이터", "sql", "etl", "pipeline", "분석"),
    "ai": ("ai", "ml", "머신러닝", "딥러닝", "llm", "vision"),
    "app": ("android", "ios", "mobile", "앱", "flutter", "kotlin", "swift"),
}

SKILL_SYNONYMS = {
    "javascript": {"javascript", "js"},
    "typescript": {"typescript", "ts"},
    "python": {"python"},
    "django": {"django"},
    "fastapi": {"fastapi"},
    "flask": {"flask"},
    "java": {"java"},
    "spring": {"spring"},
    "react": {"react"},
    "vue": {"vue", "vue.js"},
    "sql": {"sql", "mysql", "postgresql"},
    "aws": {"aws"},
    "docker": {"docker"},
    "git": {"git", "github"},
    "kotlin": {"kotlin"},
    "html": {"html"},
    "css": {"css", "scss"},
}


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip()).lower()


def tokenize_text(value: str) -> list[str]:
    chunks = re.split(r"[,/\n|()\-:]", value or "")
    result = []
    for chunk in chunks:
        cleaned = normalize_text(chunk)
        if len(cleaned) < 2:
            continue
        result.append(cleaned)
    return result


def canonicalize_skill(token: str) -> str:
    normalized = normalize_text(token)
    for canonical, aliases in SKILL_SYNONYMS.items():
        if normalized in aliases:
            return canonical
    return normalized


def extract_profile_skills(user) -> set[str]:
    if getattr(user, "ai_profile_payload", None):
        tokens = user.ai_profile_payload.get("core_skills", [])
        return {canonicalize_skill(token) for token in tokens if canonicalize_skill(token)}

    tokens = []
    tokens.extend(tokenize_text(user.github_top_languages))
    tokens.extend(tokenize_text(user.resume_extracted_text))
    tokens.extend(tokenize_text(user.resume_analysis_summary))
    return {canonicalize_skill(token) for token in tokens if canonicalize_skill(token)}


def detect_profile_roles(user) -> set[str]:
    if getattr(user, "ai_profile_payload", None):
        roles = user.ai_profile_payload.get("target_roles", [])
        selected_direction = normalize_text(getattr(user, "get_selected_job_direction", lambda: "")())
        detected = {normalize_text(role) for role in roles if normalize_text(role)}
        if selected_direction:
            detected.add(selected_direction)
        return detected

    combined = " ".join(
        filter(
            None,
            [
                getattr(user, "desired_job_direction", ""),
                getattr(user, "desired_job_direction_other", ""),
                user.github_profile_summary,
                user.resume_extracted_text,
                user.resume_analysis_summary,
            ],
        )
    ).lower()
    roles = set()
    for role, keywords in ROLE_KEYWORDS.items():
        if any(keyword in combined for keyword in keywords):
            roles.add(role)
    return roles


def extract_job_skills(job) -> set[str]:
    source = "\n".join(
        filter(
            None,
            [
                job.detail_required_skills,
                job.required_skills,
                job.detail_requirements,
                job.detail_preferred_points,
            ],
        )
    )
    return {canonicalize_skill(token) for token in tokenize_text(source) if canonicalize_skill(token)}


def detect_job_roles(job) -> set[str]:
    combined = " ".join(filter(None, [job.title, job.job_role, job.detail_main_tasks])).lower()
    roles = set()
    for role, keywords in ROLE_KEYWORDS.items():
        if any(keyword in combined for keyword in keywords):
            roles.add(role)
    return roles


def can_score_user(user) -> bool:
    return bool(
        user.is_authenticated
        and user.github_url
        and user.resume_file
        and (user.resume_extracted_text or user.resume_analysis_summary)
    )


def score_job_for_user(user, job, *, profile_skills=None, profile_roles=None, selected_direction=None) -> dict:
    if not can_score_user(user):
        return {"score": None, "matched_skills": [], "matched_roles": [], "reasons": []}

    if profile_skills is None:
        profile_skills = extract_profile_skills(user)
    if profile_roles is None:
        profile_roles = detect_profile_roles(user)
    if selected_direction is None:
        selected_direction = normalize_text(getattr(user, "get_selected_job_direction", lambda: "")())
    job_skills = extract_job_skills(job)
    job_roles = detect_job_roles(job)

    matched_skills = sorted(profile_skills & job_skills)
    matched_roles = sorted(profile_roles & job_roles)
    direction_matches = selected_direction and any(selected_direction in role or role in selected_direction for role in matched_roles)

    skill_score = min(60, len(matched_skills) * 12)
    role_score = 20 if matched_roles else 0
    direction_score = 10 if direction_matches else 0
    evidence_score = 20 if user.github_profile_summary and user.resume_analysis_summary else 10
    score = min(99, skill_score + role_score + direction_score + evidence_score)

    reasons = []
    if matched_skills:
        reasons.append("겹치는 기술: " + ", ".join(matched_skills[:4]))
    if matched_roles:
        reasons.append("맞는 직무 방향: " + ", ".join(matched_roles))
    if direction_matches:
        reasons.append("선택한 희망 방향과 직접 연결되는 공고입니다.")
    if not reasons:
        reasons.append("직접 겹치는 기술 근거는 적지만 신입 기준으로 탐색 가능한 공고입니다.")

    return {
        "score": score,
        "matched_skills": matched_skills,
        "matched_roles": matched_roles,
        "reasons": reasons,
    }
