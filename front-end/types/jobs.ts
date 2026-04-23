export type JobCategory = {
  key: string;
  label: string;
};

export type JobPosting = {
  id: number;
  title: string;
  company_name: string;
  location: string;
  job_role: string;
  employment_type: string;
  experience_label: string;
  education_level: string;
  is_junior_friendly: boolean;
  required_skills: string;
  summary_text: string;
  posted_at: string;
  deadline_at: string | null;
  external_url: string;
  source: string;
  ui_company_mark: string | null;
  ui_deadline_label: string | null;
  ui_tags: string[];
  ui_main_tasks: string[];
  ui_categories: string[];
  ui_recommendation_score: number | null;
  ui_recommendation_reasons: string[];
};

export type JobAiRecommendation = {
  fit_score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  study_plan: string[];
};

export type JobDetailLink = {
  label: string;
  url: string;
};

export type JobDetail = {
  id: number;
  source: string;
  source_display: string;
  title: string;
  company_name: string;
  location: string;
  experience_label: string;
  education_level: string;
  job_role: string;
  overview: string;
  main_tasks: string[];
  requirements: string[];
  preferred_points: string[];
  benefits: string[];
  required_skills: string[];
  logo_url: string;
  detail_images: string[];
  detail_links: JobDetailLink[];
  external_url: string;
  recommendation_score: number | null;
  recommendation_reasons: string[];
  ai_recommendation?: JobAiRecommendation;
  ai_recommendation_error?: string;
};
