"""
Peuple la base avec le contenu de la maquette HTML.

Usage :  python manage.py seed_content
Relançable : vide d'abord le contenu existant puis le recrée.
"""
from datetime import date

from django.core.management.base import BaseCommand

from content.models import (
    Block,
    News,
    Page,
    Partner,
    Project,
    SiteSettings,
    Testimonial,
)


class Command(BaseCommand):
    help = "Peuple la base avec le contenu initial du site foxugly."

    def handle(self, *args, **options):
        self.stdout.write("Réinitialisation du contenu…")
        Block.objects.all().delete()
        Page.objects.all().delete()
        News.objects.all().delete()
        Project.objects.all().delete()
        Partner.objects.all().delete()
        Testimonial.objects.all().delete()

        self._seed_settings()
        self._seed_collections()
        self._seed_pages()

        self.stdout.write(self.style.SUCCESS("Contenu initial créé avec succès."))

    # -- Réglages -----------------------------------------------------------
    def _seed_settings(self):
        SiteSettings.objects.update_or_create(
            pk=1,
            defaults=dict(
                brand_name="foxugly",
                tagline="Coaching agile indépendant",
                contact_email="contact@foxugly.com",
                phone="+32 4XX XX XX XX",
                address="Rue de l'Exemple 1\n1000 Bruxelles\nBelgique",
                vat_number="BE 0123.456.789",
                bank_account="BE00 0000 0000 0000",
                footer_text="Coaching agile indépendant. J'aide vos équipes à "
                            "livrer de la valeur, plus vite et plus sereinement.",
            ),
        )

    # -- Collections --------------------------------------------------------
    def _seed_collections(self):
        News.objects.bulk_create([
            News(title="foxugly au Agile Tour Lyon 2026", slug="agile-tour-lyon-2026",
                 category="Événement", date=date(2026, 5, 28), read_time="4 min de lecture",
                 excerpt="Retour sur ma conférence « Sortir du faux-agile » devant 300 personnes.",
                 order=1),
            News(title="5 signes que votre Scrum est devenu du théâtre", slug="scrum-theatre",
                 category="Article", date=date(2026, 5, 14), read_time="6 min de lecture",
                 excerpt="Daily qui s'éternise, rétro sans action… les symptômes du "
                         "faux-agile et comment en sortir.", order=2),
            News(title="Nouveau format : « Scrum sans théâtre »", slug="scrum-sans-theatre",
                 category="Atelier", date=date(2026, 5, 2), read_time="2 min de lecture",
                 excerpt="Un atelier d'une journée pour remettre du sens dans vos "
                         "cérémonies. Premières sessions ouvertes.", order=3),
        ])

        Project.objects.bulk_create([
            Project(title="Mise à l'échelle de 14 squads", sector="Banque",
                    description="Déploiement SAFe pour une grande banque de détail : "
                                "cadence trimestrielle, PI Planning, dépendances maîtrisées.",
                    result="Prévisibilité +35 %", order=1),
            Project(title="D'une logique projet à une logique produit", sector="Retail",
                    description="Mise en place de la discovery continue et de roadmaps "
                                "orientées valeur pour un acteur du e-commerce.",
                    result="Cycle de release ÷ 3", order=2),
            Project(title="Coaching delivery logiciel", sector="Santé",
                    description="Accompagnement des équipes de développement d'un éditeur "
                                "santé : Kanban, limitation du WIP, flux fluidifié.",
                    result="Lead-time −60 %", order=3),
            Project(title="Transformation d'une DSI publique", sector="Public",
                    description="Introduction de l'agilité dans une administration : "
                                "formation des managers, premiers produits livrés en itératif.",
                    result="8 équipes lancées", order=4),
            Project(title="Culture OKR pour une scale-up", sector="Tech / SaaS",
                    description="Alignement stratégique via les OKR, pilotage de l'impact "
                                "et autonomie des équipes produit.",
                    result="Focus produit retrouvé", order=5),
            Project(title="Académie agile interne", sector="Banque",
                    description="Conception d'un parcours de formation interne pour rendre "
                                "un assureur autonome sur le coaching.",
                    result="200 collaborateurs formés", order=6),
        ])

        Partner.objects.bulk_create([
            Partner(name="Client A", kind=Partner.Kind.CLIENT, sector_or_cause="Banque", order=1),
            Partner(name="Client B", kind=Partner.Kind.CLIENT, sector_or_cause="Retail", order=2),
            Partner(name="Client C", kind=Partner.Kind.CLIENT, sector_or_cause="Santé", order=3),
            Partner(name="Client D", kind=Partner.Kind.CLIENT, sector_or_cause="Public", order=4),
            Partner(name="Association 1", kind=Partner.Kind.ASSOCIATION,
                    sector_or_cause="Numérique & inclusion", support_type="Mécénat de compétences",
                    description="J'accompagne bénévolement leurs équipes sur l'organisation "
                                "et la gestion de projet.", order=10),
            Partner(name="Association 2", kind=Partner.Kind.ASSOCIATION,
                    sector_or_cause="Éducation & jeunesse", support_type="Sponsoring",
                    description="Sponsor annuel d'un programme qui initie les jeunes au "
                                "numérique et à l'esprit d'équipe.", order=11),
            Partner(name="Association 3", kind=Partner.Kind.ASSOCIATION,
                    sector_or_cause="Solidarité", support_type="Don",
                    description="Don d'une partie du chiffre d'affaires chaque année pour "
                                "soutenir leurs actions de terrain.", order=12),
        ])

        Testimonial.objects.bulk_create([
            Testimonial(quote="foxugly a transformé notre rapport au delivery. On livre "
                              "toutes les deux semaines, et surtout on sait pourquoi.",
                        author="Claire Lambert", role="CTO · scale-up fintech",
                        initials="CL", order=1),
            Testimonial(quote="Pas de blabla agile. Quelqu'un qui met les mains dedans et "
                              "qui nous laisse autonomes. Exactement ce qu'on cherchait.",
                        author="Marc Diallo", role="Directeur SI · grand compte",
                        initials="MD", order=2),
        ])

    # -- Pages & blocs ------------------------------------------------------
    def _seed_pages(self):
        # Accueil
        accueil = Page.objects.create(slug="accueil", title="Accueil", nav_label="Accueil", order=1)
        Block.objects.create(page=accueil, block_type=Block.Type.HERO, order=1, content={
            "badge": "Coaching agile indépendant",
            "title": "On rend vos équipes agiles pour de vrai, pas juste sur le papier.",
            "highlight": "agiles pour de vrai",
            "text": "foxugly accompagne vos transformations agiles : coaching d'équipes, "
                    "mise en place de Scrum & SAFe, ateliers et culture produit. Concret, "
                    "mesurable, durable.",
            "primary_cta": {"label": "Découvrir mon approche", "href": "/agilite"},
            "secondary_cta": {"label": "Voir mes projets", "href": "/projets"},
        })
        Block.objects.create(page=accueil, block_type=Block.Type.STATS, order=2, content={
            "items": [
                {"num": "120+", "label": "Équipes accompagnées"},
                {"num": "15 ans", "label": "D'expertise agile"},
                {"num": "98 %", "label": "Clients qui renouvellent"},
                {"num": "PSM · SAFe", "label": "Certifications"},
            ],
        })
        Block.objects.create(page=accueil, block_type=Block.Type.CARDS, order=3, content={
            "eyebrow": "Ce que je fais",
            "title": "Un accompagnement de bout en bout",
            "lead": "De l'équipe au système : j'adapte chaque mission à votre maturité agile.",
            "items": [
                {"icon": "🎯", "title": "Coaching d'équipe",
                 "text": "Scrum Master, Product Owner, dynamique d'équipe : je monte vos squads en autonomie."},
                {"icon": "🏗️", "title": "Agilité à l'échelle",
                 "text": "Déploiement SAFe, LeSS ou Spotify selon votre contexte, sans dogme."},
                {"icon": "🎓", "title": "Ateliers",
                 "text": "Ateliers sur-mesure pour monter vos équipes en compétence : Scrum, Kanban, Product Management."},
            ],
        })
        Block.objects.create(page=accueil, block_type=Block.Type.NEWS_LIST, order=4, anchor="news",
                             content={"eyebrow": "Actualités", "title": "Les dernières news",
                                      "lead": "Articles, événements et coulisses — gérés depuis l'admin.",
                                      "limit": 3})
        Block.objects.create(page=accueil, block_type=Block.Type.PROJECT_LIST, order=5, content={
            "eyebrow": "Réalisations", "title": "Des transformations qui tiennent", "limit": 3})
        Block.objects.create(page=accueil, block_type=Block.Type.CTA, order=6, anchor="contact",
                             content={"title": "Prêt à rendre votre organisation vraiment agile ?",
                                      "text": "Parlons de votre contexte. Un premier échange de "
                                              "30 minutes, sans engagement.",
                                      "cta": {"label": "Me contacter", "href": "/contact"}})

        # Qui suis-je
        qsj = Page.objects.create(slug="qui-suis-je", title="Qui suis-je", nav_label="Qui suis-je", order=2)
        Block.objects.create(page=qsj, block_type=Block.Type.PAGE_HERO, order=1, content={
            "badge": "L'humain derrière foxugly", "title": "Qui suis-je",
            "text": "Coach agile indépendant. J'accompagne les équipes et les organisations qui "
                    "veulent passer du « faire de l'agile » au « être agile »."})
        Block.objects.create(page=qsj, block_type=Block.Type.RICHTEXT, order=2, content={
            "eyebrow": "Enchanté", "title": "Renaud Vilain",
            "paragraphs": [
                "Après 15 ans passés au cœur d'équipes de développement et de transformation, "
                "j'ai créé foxugly pour accompagner les organisations sans dogme ni jargon.",
                "J'interviens en coaching d'équipe, en accompagnement à l'échelle et en ateliers "
                "sur-mesure. Toujours sur le terrain, avec un objectif clair : vous rendre autonomes.",
            ],
            "certs": ["PSM — Professional Scrum Master", "PSPO — Product Owner",
                      "SAFe Program Consultant", "Management 3.0"]})
        Block.objects.create(page=qsj, block_type=Block.Type.CARDS, order=3, content={
            "eyebrow": "Mes convictions", "title": "Ce en quoi je crois",
            "items": [
                {"icon": "🎯", "title": "La valeur avant la méthode",
                 "text": "Scrum, Kanban, SAFe ne sont que des outils. Ce qui compte, c'est ce que vos utilisateurs reçoivent."},
                {"icon": "🤝", "title": "Rendre autonome, pas dépendant",
                 "text": "Mon succès, c'est le jour où vous n'avez plus besoin de moi."},
                {"icon": "🪞", "title": "L'honnêteté plutôt que la posture",
                 "text": "Je vous dis ce qui coince, même quand ça dérange."},
                {"icon": "🌱", "title": "Le concret avant la théorie",
                 "text": "On apprend en faisant. Mes interventions sont ancrées dans votre quotidien."},
            ]})

        # Agilité
        agi = Page.objects.create(slug="agilite", title="Agilité", nav_label="Agilité", order=3)
        Block.objects.create(page=agi, block_type=Block.Type.PAGE_HERO, order=1, content={
            "badge": "Mon métier", "title": "L'agilité, sans le folklore",
            "text": "Trop d'organisations « font de l'agile » sans en récolter les bénéfices. "
                    "Mon job : remettre la valeur, l'autonomie et l'amélioration continue au centre."})
        Block.objects.create(page=agi, block_type=Block.Type.CARDS, order=2, content={
            "eyebrow": "Mes offres", "title": "Quatre façons de travailler ensemble",
            "items": [
                {"icon": "🎯", "title": "Coaching d'équipe",
                 "text": "Accompagnement sur le terrain de vos Scrum Masters, Product Owners et équipes."},
                {"icon": "🏗️", "title": "Agilité à l'échelle",
                 "text": "SAFe, LeSS, Spotify : le cadre qui colle à votre réalité, adapté."},
                {"icon": "🎓", "title": "Ateliers & formations",
                 "text": "Scrum, Kanban, Product Management, Leadership agile. Sessions sur-mesure en intra-entreprise."},
                {"icon": "🚀", "title": "Culture produit",
                 "text": "Passage de la logique projet à la logique produit : discovery, OKR, pilotage de l'impact."},
            ]})
        Block.objects.create(page=agi, block_type=Block.Type.TIMELINE, order=3, content={
            "eyebrow": "Mon approche", "title": "Comment se déroule une mission",
            "items": [
                {"step": "1", "title": "Diagnostic", "text": "J'observe vos équipes en situation réelle. Restitution honnête de votre maturité agile."},
                {"step": "2", "title": "Cadrage", "text": "Objectifs mesurables, périmètre, indicateurs de succès."},
                {"step": "3", "title": "Coaching terrain", "text": "Présence aux côtés des équipes, ateliers, mentoring. Je fais avec, pas à la place."},
                {"step": "4", "title": "Autonomisation", "text": "Transfert de compétences, montée en charge des équipes."},
                {"step": "5", "title": "Mesure d'impact", "text": "Bilan chiffré vs objectifs de départ."},
            ]})
        Block.objects.create(page=agi, block_type=Block.Type.ACCORDION, order=4, content={
            "eyebrow": "Les cadres que je maîtrise", "title": "Frameworks & pratiques",
            "items": [
                {"title": "Scrum", "text": "Le cadre le plus répandu pour les équipes produit. Idéal pour structurer une équipe qui démarre."},
                {"title": "Kanban", "text": "Visualisation du flux, limitation du travail en cours. Parfait pour les équipes run ou à flux tendu."},
                {"title": "SAFe", "text": "Pour coordonner plusieurs équipes : PI Planning, ARTs, gestion des dépendances à l'échelle."},
                {"title": "Management 3.0 & Leadership agile", "text": "Faire évoluer le management vers plus de délégation et de confiance."},
            ]})
        Block.objects.create(page=agi, block_type=Block.Type.TESTIMONIALS, order=5, content={"limit": 2})

        # Projets
        proj = Page.objects.create(slug="projets", title="Nos projets", nav_label="Nos projets", order=4)
        Block.objects.create(page=proj, block_type=Block.Type.PAGE_HERO, order=1, content={
            "badge": "Réalisations", "title": "Nos projets",
            "text": "Des transformations agiles menées sur le terrain, dans des contextes très différents."})
        Block.objects.create(page=proj, block_type=Block.Type.PROJECT_LIST, order=2, content={
            "filterable": True, "title": "", "limit": 0})
        Block.objects.create(page=proj, block_type=Block.Type.CTA, order=3, content={
            "title": "Votre projet pourrait être le prochain",
            "text": "Racontez-moi votre contexte, je vous dis comment je m'y prendrais.",
            "cta": {"label": "Démarrer un projet", "href": "/contact"}})

        # Partenaires
        part = Page.objects.create(slug="partenaires", title="Partenaires", nav_label="Partenaires", order=5)
        Block.objects.create(page=part, block_type=Block.Type.PAGE_HERO, order=1, content={
            "badge": "Confiance & engagement", "title": "Partenaires",
            "text": "Les organisations qui m'ont fait confiance, et les associations que je choisis de soutenir."})
        Block.objects.create(page=part, block_type=Block.Type.PARTNER_LIST, order=2, content={
            "eyebrow": "Références", "title": "Ils m'ont fait confiance", "kind": "client"})
        Block.objects.create(page=part, block_type=Block.Type.TESTIMONIALS, order=3, content={"limit": 2})
        Block.objects.create(page=part, block_type=Block.Type.PARTNER_LIST, order=4, content={
            "eyebrow": "Mes engagements", "title": "Les associations que je soutiens",
            "lead": "Une partie de mon activité va à des causes qui me tiennent à cœur.",
            "kind": "association"})
        Block.objects.create(page=part, block_type=Block.Type.CTA, order=5, content={
            "title": "Une association, un projet à soutenir ?",
            "text": "Si votre cause touche au numérique, à l'agilité ou à la jeunesse, parlons-en.",
            "cta": {"label": "Me contacter", "href": "/contact"}})

        # Contact (page dédiée)
        contact = Page.objects.create(slug="contact", title="Me contacter",
                                      nav_label="Me contacter", order=6, show_in_nav=False)
        Block.objects.create(page=contact, block_type=Block.Type.PAGE_HERO, order=1, content={
            "badge": "Contact", "title": "Me contacter",
            "text": "Parlons de votre contexte. Un premier échange de 30 minutes, sans engagement."})
        Block.objects.create(page=contact, block_type=Block.Type.CONTACT_FORM, order=2, content={
            "eyebrow": "Écrivez-moi", "title": "Votre message",
            "lead": "Décrivez votre besoin, je vous réponds rapidement."})
        Block.objects.create(page=contact, block_type=Block.Type.CONTACT_INFO, order=3, content={
            "eyebrow": "Coordonnées", "title": "Informations"})
