"""RGPD : supprime les ContactMessage plus anciens que la durée de rétention."""

from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from content.models import ContactMessage


class Command(BaseCommand):
    help = "Supprime les messages de contact plus vieux que --days (défaut : CONTACT_RETENTION_DAYS, 365)."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=None)
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **opts):
        days = opts["days"] if opts["days"] is not None else settings.CONTACT_RETENTION_DAYS
        if days < 1:
            raise CommandError("La rétention doit être d'au moins 1 jour.")
        qs = ContactMessage.objects.filter(created_at__lt=timezone.now() - timedelta(days=days))
        if opts["dry_run"]:
            self.stdout.write(f"{qs.count()} message(s) de contact à purger (> {days} j).")
            return
        deleted, _ = qs.delete()
        self.stdout.write(f"{deleted} message(s) de contact purgé(s) (> {days} j).")
