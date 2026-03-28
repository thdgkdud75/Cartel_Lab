JOB_CATEGORIES = [
    {
        "key": "frontend",
        "label": "#프론트엔드",
        "keywords": ("frontend", "프론트", "react", "vue", "angular", "javascript", "typescript", "html", "css", "next.js", "nuxt"),
    },
    {
        "key": "backend",
        "label": "#백엔드",
        "keywords": ("backend", "백엔드", "api", "server", "django", "spring", "fastapi", "flask", "node", "express", "laravel", "rails"),
    },
    {
        "key": "ai",
        "label": "#AI / ML",
        "keywords": ("ai", "ml", "머신러닝", "딥러닝", "llm", "vision", "nlp", "gpt", "pytorch", "tensorflow", "machine learning", "deep learning"),
    },
    {
        "key": "data",
        "label": "#데이터",
        "keywords": ("data", "데이터", "sql", "etl", "pipeline", "분석", "analyst", "bigquery", "spark", "hadoop", "warehouse"),
    },
    {
        "key": "app",
        "label": "#모바일 앱",
        "keywords": ("android", "ios", "mobile", "앱", "flutter", "kotlin", "swift", "react native"),
    },
    {
        "key": "devops",
        "label": "#DevOps",
        "keywords": ("devops", "infra", "인프라", "cloud", "docker", "kubernetes", "k8s", "ci/cd", "aws", "gcp", "azure", "sre"),
    },
    {
        "key": "fullstack",
        "label": "#풀스택",
        "keywords": ("full stack", "fullstack", "풀스택"),
    },
    {
        "key": "embedded",
        "label": "#임베디드 / 로봇",
        "keywords": ("embedded", "임베디드", "firmware", "robot", "ros", "c++", "hardware", "fpga"),
    },
]


def classify_job(job) -> list[str]:
    """공고 내용을 분석해서 해당하는 카테고리 key 목록 반환."""
    combined = " ".join(filter(None, [
        job.title,
        job.job_role,
        job.required_skills,
        job.detail_main_tasks,
        job.detail_requirements,
        job.detail_required_skills,
        job.summary_text,
    ])).lower()

    matched = []
    for category in JOB_CATEGORIES:
        if any(keyword in combined for keyword in category["keywords"]):
            matched.append(category["key"])
    return matched
