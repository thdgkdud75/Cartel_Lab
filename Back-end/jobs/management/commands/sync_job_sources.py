from django.core.management.base import BaseCommand

from jobs.services.job_sync import sync_jobs


class Command(BaseCommand):
    help = "Sync recent jobs from Saramin and Wanted into JobPosting."

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            action="append",
            choices=["saramin", "wanted"],
            dest="sources",
            help="Specific source to sync. Defaults to both.",
        )
        parser.add_argument("--saramin-pages", type=int, default=2)
        parser.add_argument("--wanted-limit", type=int, default=60)

    def handle(self, *args, **options):
        sources = options["sources"] or ["saramin", "wanted"]
        results = sync_jobs(
            sources=sources,
            saramin_pages=options["saramin_pages"],
            wanted_limit=options["wanted_limit"],
        )

        for source, result in results.items():
            if result["status"] == "success":
                self.stdout.write(
                    self.style.SUCCESS(
                        f"[{source}] fetched={result['fetched_count']} "
                        f"created={result['created_count']} "
                        f"updated={result['updated_count']} "
                        f"deactivated={result['deactivated_count']}"
                    )
                )
            else:
                self.stdout.write(
                    self.style.ERROR(f"[{source}] failed: {result['error_message']}")
                )
