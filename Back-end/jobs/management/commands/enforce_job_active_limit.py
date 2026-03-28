from django.conf import settings
from django.core.management.base import BaseCommand
from django.db.models import F

from jobs.models import JobPosting


class Command(BaseCommand):
    help = "Keep only latest active jobs per source and deactivate older rows."

    def handle(self, *args, **options):
        limit = settings.JOB_ACTIVE_LIMIT_PER_SOURCE
        sources = [s.strip() for s in settings.JOB_ACTIVE_SOURCES if s.strip()]

        total_deactivated = 0
        for source in sources:
            qs = (
                JobPosting.objects.filter(source=source, is_active=True)
                .order_by(
                    F("posted_at").desc(nulls_last=True),
                    F("updated_at").desc(nulls_last=True),
                    F("id").desc(),
                )
            )

            keep_ids = list(qs.values_list("id", flat=True)[:limit])
            if not keep_ids:
                self.stdout.write(f"[{source}] active 0 rows")
                continue

            deactivated = (
                JobPosting.objects.filter(source=source, is_active=True)
                .exclude(id__in=keep_ids)
                .update(is_active=False)
            )
            total_deactivated += deactivated

            self.stdout.write(
                f"[{source}] keep={len(keep_ids)} deactivated={deactivated} limit={limit}"
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Total deactivated rows: {total_deactivated} (sources={','.join(sources)})"
            )
        )
