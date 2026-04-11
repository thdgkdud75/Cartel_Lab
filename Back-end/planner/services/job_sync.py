import html
import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Iterable, Optional
from urllib.parse import urljoin

import requests
from django.utils import timezone

from jobs.models import JobPosting, JobSyncLog


USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
)

PROFILE_INCLUDE_KEYWORDS = (
    "개발",
    "developer",
    "engineer",
    "엔지니어",
    "백엔드",
    "backend",
    "프론트",
    "frontend",
    "fullstack",
    "풀스택",
    "웹",
    "web",
    "앱",
    "app",
    "서버",
    "server",
    "소프트웨어",
    "software",
    "시스템",
    "system",
    "데이터",
    "data",
    "ai",
    "머신러닝",
    "ml",
    "infra",
    "인프라",
    "클라우드",
    "cloud",
    "devops",
    "qa",
    "테스트",
    "보안",
    "security",
    "임베디드",
    "embedded",
    "퍼블리셔",
    "publisher",
)

PROFILE_EXCLUDE_KEYWORDS = (
    "디자이너",
    "디자인직",
    "그래픽",
    "브랜드",
    "마케팅",
    "영업",
    "세일즈",
    "md",
    "인사",
    "총무",
    "회계",
    "재무",
    "cs",
    "고객상담",
    "운영지원",
    "플랫폼기획",
    "서비스기획",
    "사업기획",
)

ALLOWED_EDUCATION_KEYWORDS = (
    "학력무관",
    "고졸",
    "초대졸",
    "전문학사",
    "2년제",
    "3년제",
    "2,3년제",
    "2·3년제",
    "대졸(2,3년제)",
    "대졸(4년)",
    "대학교졸업(4년)",
    "학사",
    "대졸이상",
    "학사이상",
)

REJECT_EDUCATION_KEYWORDS = (
    "석사",
    "박사",
    "대학원",
)


@dataclass
class ScrapedJob:
    source: str
    external_id: str
    external_url: str
    title: str
    company_name: str
    location: str = ""
    job_role: str = ""
    employment_type: str = ""
    experience_label: str = ""
    experience_min: int = 0
    experience_max: int = 0
    education_level: str = ""
    is_junior_friendly: bool = False
    required_skills: str = ""
    preferred_skills: str = ""
    summary_text: str = ""
    posted_at: Optional[datetime] = None
    deadline_at: Optional[datetime] = None


def normalize_filter_text(value: str) -> str:
    return re.sub(r"\s+", "", (value or "")).lower()


def is_supported_education(education_level: str) -> bool:
    normalized = normalize_filter_text(education_level)
    if not normalized:
        return True
    if any(keyword in normalized for keyword in REJECT_EDUCATION_KEYWORDS):
        return False
    if any(keyword in normalized for keyword in ALLOWED_EDUCATION_KEYWORDS):
        return True
    return "학력" not in normalized


def is_target_department_role(*texts: str) -> bool:
    combined = normalize_filter_text(" ".join(filter(None, texts)))
    if not combined:
        return False

    has_include = any(keyword in combined for keyword in PROFILE_INCLUDE_KEYWORDS)
    has_exclude = any(keyword in combined for keyword in PROFILE_EXCLUDE_KEYWORDS)

    if has_exclude and not has_include:
        return False
    return has_include


def is_target_profile_job(job: ScrapedJob) -> bool:
    return is_supported_education(job.education_level) and is_target_department_role(
        job.title,
        job.job_role,
        job.required_skills,
        job.summary_text,
    )


class SaraminScraper:
    BASE_URL = "https://www.saramin.co.kr"
    CATEGORY_IDS = (84, 86, 87, 92)
    LIST_URL = (
        "https://www.saramin.co.kr/zf_user/jobs/list/job-category"
        "?cat_kewd={category_id}&page_count=50&sort=RD&page={page}"
    )

    ITEM_PATTERN = re.compile(
        r'<div id="rec-(?P<rec_idx>\d+)" class="list_item[^"]*">(?P<body>.*?)'
        r'(?=<div id="rec-\d+" class="list_item[^"]*">|</section>|$)',
        re.S,
    )

    def __init__(self, session: Optional[requests.Session] = None):
        self.session = session or requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT})

    def fetch(self, pages: int = 2) -> list[ScrapedJob]:
        jobs: list[ScrapedJob] = []
        seen_ids = set()
        for category_id in self.CATEGORY_IDS:
            for page in range(1, pages + 1):
                response = self.session.get(
                    self.LIST_URL.format(category_id=category_id, page=page),
                    timeout=20,
                )
                response.raise_for_status()
                for job in self.parse_listing_html(response.text):
                    if not self._is_newbie_label(job.experience_label):
                        continue
                    if not is_target_profile_job(job):
                        continue
                    if job.external_id in seen_ids:
                        continue
                    seen_ids.add(job.external_id)
                    jobs.append(job)
        return jobs

    @classmethod
    def parse_listing_html(cls, html_text: str) -> list[ScrapedJob]:
        jobs: list[ScrapedJob] = []
        for match in cls.ITEM_PATTERN.finditer(html_text):
            body = match.group("body")
            rec_idx = match.group("rec_idx")
            title = cls._extract_text(body, r'<div class="job_tit">.*?title="([^"]+)"')
            href = cls._extract_text(body, r'<div class="job_tit">.*?href="([^"]+)"')
            company_name = cls._extract_text(
                body,
                r'<div class="col company_nm">.*?<a[^>]*class="str_tit"[^>]*>\s*(.*?)\s*</a>',
            )
            location = cls._extract_text(body, r'<p class="work_place">(.*?)</p>')
            experience_label = cls._extract_text(body, r'<p class="career">(.*?)</p>')
            education_level = cls._extract_text(body, r'<p class="education">(.*?)</p>')
            sectors = cls._extract_all_text(body, r'<span class="job_sector">\s*(.*?)\s*</span>')
            deadline_label = cls._extract_text(body, r'<span class="date">(.*?)</span>')
            posted_label = cls._extract_text(body, r'<span class="deadlines">(.*?)</span>')
            employment_type = cls._extract_employment_type(experience_label)
            experience_min, experience_max = cls._extract_experience_range(experience_label)

            jobs.append(
                ScrapedJob(
                    source="saramin",
                    external_id=rec_idx,
                    external_url=urljoin(cls.BASE_URL, html.unescape(href)),
                    title=title,
                    company_name=company_name,
                    location=location,
                    job_role=", ".join(sectors[:5]),
                    employment_type=employment_type,
                    experience_label=experience_label,
                    experience_min=experience_min,
                    experience_max=experience_max,
                    education_level=education_level,
                    is_junior_friendly=cls._is_junior_friendly(experience_label, education_level),
                    summary_text=posted_label,
                    posted_at=cls._parse_posted_at(posted_label),
                    deadline_at=cls._parse_deadline(deadline_label),
                )
            )
        return jobs

    @staticmethod
    def _extract_text(text: str, pattern: str) -> str:
        match = re.search(pattern, text, re.S)
        if not match:
            return ""
        return html.unescape(re.sub(r"<[^>]+>", "", match.group(1))).strip()

    @staticmethod
    def _extract_all_text(text: str, pattern: str) -> list[str]:
        match = re.search(pattern, text, re.S)
        if not match:
            return []
        return [
            html.unescape(re.sub(r"<[^>]+>", "", part)).strip()
            for part in re.findall(r"<span>(.*?)</span>", match.group(1), re.S)
            if html.unescape(re.sub(r"<[^>]+>", "", part)).strip()
        ]

    @staticmethod
    def _extract_employment_type(experience_label: str) -> str:
        labels = ["정규직", "계약직", "인턴", "프리랜서", "아르바이트", "파견직"]
        return next((label for label in labels if label in experience_label), "")

    @staticmethod
    def _extract_experience_range(experience_label: str) -> tuple[int, int]:
        if "신입" in experience_label:
            return 0, 0
        years = [int(value) for value in re.findall(r"(\d+)년", experience_label)]
        if not years:
            return 0, 0
        return min(years), max(years)

    @staticmethod
    def _is_junior_friendly(experience_label: str, education_level: str) -> bool:
        junior_tokens = ["신입", "경력무관", "인턴"]
        return any(token in experience_label for token in junior_tokens) or "학력무관" in education_level

    @staticmethod
    def _is_newbie_label(experience_label: str) -> bool:
        normalized = experience_label.replace(" ", "")
        return "신입" in normalized

    @staticmethod
    def _parse_posted_at(posted_label: str) -> Optional[datetime]:
        now = timezone.now()
        if "오늘 등록" in posted_label:
            return now
        days_ago_match = re.search(r"(\d+)일 전 등록", posted_label)
        if days_ago_match:
            return now - timedelta(days=int(days_ago_match.group(1)))
        hours_ago_match = re.search(r"(\d+)시간 전 등록", posted_label)
        if hours_ago_match:
            return now - timedelta(hours=int(hours_ago_match.group(1)))
        return None

    @staticmethod
    def _parse_deadline(deadline_label: str) -> Optional[datetime]:
        match = re.search(r"~(\d{2})\.(\d{2})", deadline_label)
        if not match:
            return None
        now = timezone.localtime()
        month = int(match.group(1))
        day = int(match.group(2))
        year = now.year
        if month < now.month - 6:
            year += 1
        return timezone.make_aware(datetime(year, month, day, 23, 59, 59))


class WantedScraper:
    API_URL = "https://www.wanted.co.kr/api/chaos/navigation/v1/results"
    JOB_GROUP_ID = 518

    def __init__(self, session: Optional[requests.Session] = None):
        self.session = session or requests.Session()
        self.session.headers.update(
            {
                "User-Agent": USER_AGENT,
                "X-Requested-With": "XMLHttpRequest",
                "Referer": "https://www.wanted.co.kr/wdlist/518",
            }
        )

    def fetch(self, limit: int = 60) -> list[ScrapedJob]:
        jobs: list[ScrapedJob] = []
        offset = 0

        while len(jobs) < limit:
            response = self.session.get(
                self.API_URL,
                params={
                    "country": "kr",
                    "job_sort": "job.latest_order",
                    "job_group_id": self.JOB_GROUP_ID,
                    "years": 0,
                    "limit": min(20, limit - len(jobs)),
                    "offset": offset,
                },
                timeout=20,
            )
            response.raise_for_status()
            payload = response.json()
            chunk = [
                self.map_item(item)
                for item in payload.get("data", [])
                if self._is_newbie_item(item)
            ]
            chunk = [job for job in chunk if is_target_profile_job(job)]
            if not chunk:
                break
            jobs.extend(chunk)

            next_link = payload.get("links", {}).get("next")
            if not next_link:
                break
            offset += len(chunk)

        return jobs

    @staticmethod
    def map_item(item: dict) -> ScrapedJob:
        skill_names = [
            skill["title"]
            for skill in item.get("skill_tags", [])
            if isinstance(skill, dict) and skill.get("title")
        ]
        annual_from = item.get("annual_from") or 0
        annual_to = item.get("annual_to") or annual_from
        experience_label = "신입" if item.get("is_newbie") else (
            f"{annual_from}~{annual_to}년" if annual_to else f"{annual_from}년 이상"
        )
        location = " ".join(
            filter(
                None,
                [
                    item.get("address", {}).get("location"),
                    item.get("address", {}).get("district"),
                ],
            )
        )
        summary_parts = [
            item.get("reward_total", ""),
            item.get("employment_type", ""),
        ]
        return ScrapedJob(
            source="wanted",
            external_id=str(item["id"]),
            external_url=f"https://www.wanted.co.kr/wd/{item['id']}",
            title=item.get("position", ""),
            company_name=item.get("company", {}).get("name", ""),
            location=location,
            job_role=item.get("position", ""),
            employment_type=item.get("employment_type", ""),
            experience_label=experience_label,
            experience_min=annual_from,
            experience_max=annual_to,
            education_level="학력무관",
            is_junior_friendly=bool(item.get("is_newbie")) or annual_from <= 2,
            required_skills=", ".join(skill_names),
            summary_text=" / ".join(part for part in summary_parts if part),
        )

    @staticmethod
    def _is_newbie_item(item: dict) -> bool:
        return bool(item.get("is_newbie"))


def sync_jobs(*, sources: Iterable[str], saramin_pages: int = 2, wanted_limit: int = 60) -> dict[str, dict]:
    results: dict[str, dict] = {}

    for source in sources:
        fetched: list[ScrapedJob] = []
        created_count = 0
        updated_count = 0
        deactivated_count = 0
        status = "success"
        error_message = ""

        try:
            if source == "saramin":
                fetched = SaraminScraper().fetch(pages=saramin_pages)
            elif source == "wanted":
                fetched = WantedScraper().fetch(limit=wanted_limit)
            else:
                raise ValueError(f"Unsupported source: {source}")

            active_external_ids = [job.external_id for job in fetched]
            for job in fetched:
                defaults = {
                    "title": job.title,
                    "company_name": job.company_name,
                    "location": job.location,
                    "job_role": job.job_role,
                    "employment_type": job.employment_type,
                    "experience_label": job.experience_label,
                    "experience_min": job.experience_min,
                    "experience_max": job.experience_max,
                    "education_level": job.education_level,
                    "is_junior_friendly": job.is_junior_friendly,
                    "required_skills": job.required_skills,
                    "preferred_skills": job.preferred_skills,
                    "summary_text": job.summary_text,
                    "posted_at": job.posted_at,
                    "deadline_at": job.deadline_at,
                    "is_active": True,
                }
                posting, created = JobPosting.objects.update_or_create(
                    source=job.source,
                    external_id=job.external_id,
                    external_url=job.external_url,
                    defaults=defaults,
                )
                try:
                    from planner.services.job_detail import fetch_job_detail

                    detail = fetch_job_detail(posting)
                    posting.detail_overview = detail.get("overview", "") or ""
                    posting.detail_main_tasks = "\n".join(detail.get("main_tasks", []))
                    posting.detail_requirements = "\n".join(detail.get("requirements", []))
                    posting.detail_preferred_points = "\n".join(detail.get("preferred_points", []))
                    posting.detail_benefits = "\n".join(detail.get("benefits", []))
                    posting.detail_required_skills = "\n".join(detail.get("required_skills", []))

                    detail_skills = [skill for skill in detail.get("required_skills", []) if skill]
                    if detail_skills:
                        posting.required_skills = ", ".join(detail_skills)

                    posting.save(
                        update_fields=[
                            "detail_overview",
                            "detail_main_tasks",
                            "detail_requirements",
                            "detail_preferred_points",
                            "detail_benefits",
                            "detail_required_skills",
                            "required_skills",
                            "updated_at",
                            "last_seen_at",
                        ]
                    )
                except Exception:
                    pass
                if created:
                    created_count += 1
                else:
                    updated_count += 1

            deactivate_qs = JobPosting.objects.filter(source=source, is_active=True)
            if active_external_ids:
                deactivate_qs = deactivate_qs.exclude(external_id__in=active_external_ids)
            deactivated_count = deactivate_qs.update(is_active=False)
        except Exception as exc:
            status = "error"
            error_message = str(exc)

        JobSyncLog.objects.create(
            source=source,
            fetched_count=len(fetched),
            created_count=created_count,
            updated_count=updated_count,
            deactivated_count=deactivated_count,
            status=status,
            error_message=error_message,
        )
        results[source] = {
            "fetched_count": len(fetched),
            "created_count": created_count,
            "updated_count": updated_count,
            "deactivated_count": deactivated_count,
            "status": status,
            "error_message": error_message,
        }

    return results
