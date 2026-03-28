from django.db import models
from django.conf import settings
from django.urls import reverse

class Post(models.Model):
    title = models.CharField("제목", max_length=200)
    slug = models.SlugField("슬러그", max_length=200, unique=True, help_text="URL에 사용될 고유 주소입니다.")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="blog_posts",
        verbose_name="작성자"
    )
    summary = models.TextField("요약", help_text="목록에 표시될 짧은 설명입니다.", blank=True)
    content = models.TextField("내용", help_text="마크다운 형식을 지원합니다.")
    
    thumbnail = models.ImageField("대표 이미지", upload_to="blog/thumbnails/", blank=True, null=True)
    
    created_at = models.DateTimeField("작성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)
    is_published = models.BooleanField("공개 여부", default=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "블로그 포스트"
        verbose_name_plural = "블로그 포스트 목록"

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return reverse("blog:post-detail", kwargs={"slug": self.slug})
