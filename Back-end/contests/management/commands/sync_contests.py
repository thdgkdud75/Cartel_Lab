from django.core.management.base import BaseCommand
from contests.services.contest_sync import sync_contests

class Command(BaseCommand):
    help = "Sync contest information from external sources (Wevity, etc.)"

    def handle(self, *args, **options):
        self.stdout.write("Starting contest synchronization...")
        results = sync_contests()
        self.stdout.write(
            self.style.SUCCESS(
                f"Sync complete. Created: {results['created']}, Updated: {results['updated']}"
            )
        )
