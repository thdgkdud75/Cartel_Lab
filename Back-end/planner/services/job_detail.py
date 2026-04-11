import html
import json
import re
from urllib.parse import parse_qs, urlparse

import requests

from jobs.models import JobPosting
from planner.services.job_sync import USER_AGENT


def split_bullets(text: str) -> list[str]:
    if not text:
        return []

    normalized = text.replace("\r", "\n").replace("•", "\n• ").replace("·", "\n· ")
    parts = []
    for line in normalized.split("\n"):
        cleaned = re.sub(r"\s+", " ", line).strip(" -\t")
        cleaned = cleaned.lstrip("•").lstrip("·").strip()
        if cleaned:
            parts.append(cleaned)
    return parts


def strip_tags(value: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", " ", value or "")).strip()


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value or "")).strip()


def clean_list_item(value: str) -> str:
    return normalize_text(re.sub(r"^[•·\-\s]+", "", value or ""))


def unique_items(items: list[str]) -> list[str]:
    result = []
    seen = set()
    for item in items:
        normalized = clean_list_item(item)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        result.append(normalized)
    return result


def parse_html_list_items(section_html: str) -> list[str]:
    items = [
        strip_tags(item)
        for item in re.findall(r"<p[^>]*>(.*?)</p>|<li[^>]*>(.*?)</li>", section_html, re.S)
        for item in item
        if item and strip_tags(item)
    ]
    if items:
        return unique_items(items)
    return unique_items(split_bullets(strip_tags(section_html)))


def parse_saramin_info_blocks(detail_html: str) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {}
    for title_html, list_html in re.findall(
        r'<div class="info-block">.*?<p class="info-block__title">(.*?)</p>\s*'
        r'<div class="info-block__list"[^>]*>(.*?)</div>',
        detail_html,
        re.S,
    ):
        title = normalize_text(strip_tags(title_html))
        if not title:
            continue
        sections[title] = parse_html_list_items(list_html)
    return sections


def section_title_matches(title: str, keywords: tuple[str, ...]) -> bool:
    normalized = re.sub(r"\s+", "", title)
    return any(keyword in normalized for keyword in keywords)


def extract_skill_tokens(items: list[str]) -> list[str]:
    skills = []
    for item in items:
        cleaned = normalize_text(item)
        if ":" in cleaned:
            _, cleaned = cleaned.split(":", 1)
        for token in re.split(r"[,/|]|및", cleaned):
            token = normalize_text(token)
            if token:
                skills.append(token)
    return unique_items(skills)


def extract_saramin_rec_idx(external_url: str) -> str:
    parsed = urlparse(external_url)
    query = parse_qs(parsed.query)
    return query.get("rec_idx", [""])[0]


def parse_saramin_summary_pairs(summary_html: str) -> dict[str, str]:
    pairs: dict[str, str] = {}
    for dt, dd in re.findall(r"<dt>(.*?)</dt>\s*<dd.*?>(.*?)</dd>", summary_html, re.S):
        key = strip_tags(dt)
        value = strip_tags(dd)
        if key and value:
            pairs[key] = re.sub(r"\s+", " ", value)
    return pairs


def parse_saramin_howto_pairs(howto_html: str) -> dict[str, str]:
    pairs: dict[str, str] = {}
    for dt, dd in re.findall(r"<dt>(.*?)</dt>\s*<dd.*?>(.*?)</dd>", howto_html, re.S):
        key = strip_tags(dt)
        value = strip_tags(dd)
        if key and value:
            pairs[key] = re.sub(r"\s+", " ", value)
    return pairs


def parse_wanted_detail_html(html_text: str) -> dict:
    match = re.search(
        r'<script id="__NEXT_DATA__" type="application/json" crossorigin="anonymous">(.*?)</script>',
        html_text,
        re.S,
    )
    if not match:
        raise ValueError("Wanted detail payload not found")

    initial_data = json.loads(match.group(1))["props"]["pageProps"]["initialData"]
    company = initial_data.get("company", {})
    address = initial_data.get("address", {})

    return {
        "company_name": company.get("company_name", ""),
        "title": initial_data.get("position", ""),
        "location": " ".join(
            filter(None, [address.get("location"), address.get("district")])
        ),
        "experience_label": "신입" if initial_data.get("career") == "newbie" else "",
        "education_level": "학력무관",
        "logo_url": company.get("logo_image", ""),
        "overview": initial_data.get("intro") or company.get("company_description", ""),
        "main_tasks": split_bullets(initial_data.get("main_tasks", "")),
        "requirements": split_bullets(initial_data.get("requirements", "")),
        "preferred_points": split_bullets(initial_data.get("preferred_points", "")),
        "benefits": split_bullets(initial_data.get("benefits", "")),
        "detail_images": company.get("title_images", [])[:3],
        "detail_links": [],
    }


def parse_saramin_detail_payload(summary_html: str, detail_html: str) -> dict:
    summary_match = re.search(
        r'<div class="jv_cont jv_summary">(.*?)(?:<div class="job_divider|\Z)',
        summary_html,
        re.S,
    )
    howto_match = re.search(
        r'<div class="jv_cont jv_howto">(.*?)(?:<div class="job_divider|\Z)',
        summary_html,
        re.S,
    )
    title_match = re.search(
        r'<div class="jv_header".*?<h1 class="tit_job".*?>(.*?)</h1>',
        summary_html,
        re.S,
    )
    company_match = re.search(
        r'<a [^>]*class="company"[^>]*>\s*(.*?)\s*</a>',
        summary_html,
        re.S,
    )
    address_match = re.search(
        r'<span class="spr_jview txt_adr".*?>(.*?)</span>',
        summary_html,
        re.S,
    )
    start_match = re.search(r"<dt>시작일</dt>\s*<dd>(.*?)</dd>", summary_html, re.S)
    end_match = re.search(r'<dt class="end">마감일</dt>\s*<dd>(.*?)</dd>', summary_html, re.S)
    method_match = re.search(
        r'<dt>지원방법</dt>\s*<dd class="method">(.*?)</dd>',
        summary_html,
        re.S,
    )
    user_content_match = re.search(
        r'<div class="user_content">(.*?)</div>\s*</body>',
        detail_html,
        re.S,
    )
    og_image_match = re.search(
        r'<img [^>]*src="([^"]+)"[^>]*alt="([^"]*)"',
        user_content_match.group(1) if user_content_match else detail_html,
        re.S,
    )
    area_links = [
        {
            "label": strip_tags(label),
            "url": html.unescape(url.strip()),
        }
        for url, label in re.findall(
            r'<area [^>]*href="([^"]+)"[^>]*alt="([^"]*)"',
            user_content_match.group(1) if user_content_match else detail_html,
            re.S,
        )
        if strip_tags(label) and html.unescape(url.strip())
    ]
    image_urls = re.findall(
        r'<img [^>]*src="([^"]+)"',
        user_content_match.group(1) if user_content_match else detail_html,
        re.S,
    )
    content_text = strip_tags(user_content_match.group(1) if user_content_match else "")
    summary_pairs = parse_saramin_summary_pairs(summary_match.group(1) if summary_match else "")
    howto_pairs = parse_saramin_howto_pairs(howto_match.group(1) if howto_match else "")
    info_blocks = parse_saramin_info_blocks(user_content_match.group(1) if user_content_match else detail_html)

    overview_parts = []
    main_tasks = []
    requirements = []
    preferred_points = []
    benefits = []
    required_skills = []

    for title, items in info_blocks.items():
        if section_title_matches(title, ("회사소개", "공고소개", "포지션소개", "모집분야")):
            overview_parts.extend(items)
        elif section_title_matches(title, ("주요업무", "담당업무", "업무내용", "담당할업무")):
            main_tasks.extend(items)
        elif section_title_matches(title, ("자격요건", "지원자격", "이런분을찾고있어요", "찾고있어요")):
            requirements.extend(items)
            required_skills.extend(
                extract_skill_tokens([item for item in items if "기술스택" in item or "사용기술" in item])
            )
        elif section_title_matches(title, ("우대사항", "우대조건", "이런분이면더좋아요")):
            preferred_points.extend(items)
        elif section_title_matches(title, ("복리후생", "복지", "혜택")):
            benefits.extend(items)
        elif section_title_matches(title, ("근무조건",)):
            benefits.extend(items)
        elif section_title_matches(title, ("기술스택", "사용기술")):
            required_skills.extend(extract_skill_tokens(items))

    overview = content_text
    if overview_parts:
        overview = "\n".join(unique_items(overview_parts))
    if len(overview) < 40 and og_image_match:
        overview = strip_tags(og_image_match.group(2))

    if "학력" in summary_pairs:
        requirements.append(f"학력: {summary_pairs['학력']}")
    if "경력" in summary_pairs:
        requirements.append(f"경력: {summary_pairs['경력']}")
    if "근무형태" in summary_pairs:
        requirements.append(f"근무형태: {summary_pairs['근무형태']}")

    if "지원방법" in howto_pairs:
        preferred_points.append(f"지원방법: {howto_pairs['지원방법']}")
    if start_match and end_match:
        preferred_points.append(f"접수기간: {strip_tags(start_match.group(1))} ~ {strip_tags(end_match.group(1))}")
    if method_match:
        method_text = strip_tags(method_match.group(1))
        if method_text and f"지원방법: {method_text}" not in preferred_points:
            preferred_points.append(f"지원방법: {method_text}")

    return {
        "company_name": strip_tags(company_match.group(1)) if company_match else "",
        "title": strip_tags(title_match.group(1)) if title_match else "",
        "location": strip_tags(address_match.group(1)) if address_match else "",
        "experience_label": summary_pairs.get("경력", ""),
        "education_level": summary_pairs.get("학력", ""),
        "logo_url": image_urls[0] if image_urls else "",
        "overview": overview,
        "main_tasks": unique_items(main_tasks),
        "requirements": unique_items(requirements),
        "preferred_points": unique_items(preferred_points),
        "benefits": unique_items(benefits),
        "required_skills": unique_items(required_skills),
        "detail_images": image_urls[:3],
        "detail_links": area_links[:8],
    }


def fetch_job_detail(job: JobPosting) -> dict:
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    if job.source == "wanted":
        response = session.get(job.external_url, timeout=20)
        response.raise_for_status()
        detail = parse_wanted_detail_html(response.text)
    elif job.source == "saramin":
        rec_idx = extract_saramin_rec_idx(job.external_url) or job.external_id
        summary_response = session.post(
            "https://www.saramin.co.kr/zf_user/jobs/relay/view-ajax",
            data={"rec_idx": rec_idx},
            headers={
                "X-Requested-With": "XMLHttpRequest",
                "Referer": job.external_url,
            },
            timeout=20,
        )
        summary_response.raise_for_status()
        detail_response = session.get(
            "https://www.saramin.co.kr/zf_user/jobs/relay/view-detail",
            params={
                "rec_idx": rec_idx,
                "rec_seq": 0,
                "t_category": "non-logged_relay_view",
                "t_content": "view_detail",
                "t_ref": "non-logged_relay_view",
                "t_ref_content": "category_new_rec",
            },
            headers={"Referer": job.external_url},
            timeout=20,
        )
        detail_response.raise_for_status()
        detail = parse_saramin_detail_payload(summary_response.text, detail_response.text)
    else:
        detail = {}

    return {
        "id": job.id,
        "source": job.source,
        "source_display": job.get_source_display(),
        "company_name": detail.get("company_name") or job.company_name,
        "title": detail.get("title") or job.title,
        "location": detail.get("location") or job.location,
        "experience_label": detail.get("experience_label") or job.experience_label,
        "education_level": detail.get("education_level") or job.education_level,
        "job_role": job.job_role,
        "required_skills": detail.get("required_skills") or split_bullets(job.required_skills),
        "overview": detail.get("overview") or job.summary_text,
        "main_tasks": detail.get("main_tasks", []),
        "requirements": detail.get("requirements", []),
        "preferred_points": detail.get("preferred_points", []),
        "benefits": detail.get("benefits", []),
        "logo_url": detail.get("logo_url", ""),
        "detail_images": detail.get("detail_images", []),
        "detail_links": detail.get("detail_links", []),
        "external_url": job.external_url,
    }
