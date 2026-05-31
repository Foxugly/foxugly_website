import { Component, Input } from '@angular/core';

import { Block } from '../../core/models';
import { Hero } from '../blocks/hero/hero';
import { PageHero } from '../blocks/page-hero/page-hero';
import { Stats } from '../blocks/stats/stats';
import { Cards } from '../blocks/cards/cards';
import { Richtext } from '../blocks/richtext/richtext';
import { Timeline } from '../blocks/timeline/timeline';
import { Accordion } from '../blocks/accordion/accordion';
import { Testimonials } from '../blocks/testimonials/testimonials';
import { LogoWall } from '../blocks/logo-wall/logo-wall';
import { NewsList } from '../blocks/news-list/news-list';
import { ProjectList } from '../blocks/project-list/project-list';
import { PartnerList } from '../blocks/partner-list/partner-list';
import { Cta } from '../blocks/cta/cta';
import { ContactForm } from '../blocks/contact-form/contact-form';

/**
 * Aiguille chaque bloc vers le composant dédié à son `block_type`.
 * `soft` porte l'alternance de fond claire/grise décidée par le PageRenderer.
 */
@Component({
  selector: 'app-block-renderer',
  imports: [
    Hero, PageHero, Stats, Cards, Richtext, Timeline, Accordion,
    Testimonials, LogoWall, NewsList, ProjectList, PartnerList, Cta, ContactForm,
  ],
  template: `
    @switch (block.block_type) {
      @case ('hero') { <app-hero [block]="block" /> }
      @case ('page_hero') { <app-page-hero [block]="block" /> }
      @case ('stats') { <app-stats [block]="block" /> }
      @case ('cards') { <app-cards [block]="block" [soft]="soft" /> }
      @case ('richtext') { <app-richtext [block]="block" [soft]="soft" /> }
      @case ('timeline') { <app-timeline [block]="block" [soft]="soft" /> }
      @case ('accordion') { <app-accordion [block]="block" [soft]="soft" /> }
      @case ('testimonials') { <app-testimonials [block]="block" [soft]="soft" /> }
      @case ('logo_wall') { <app-logo-wall [block]="block" [soft]="soft" /> }
      @case ('news_list') { <app-news-list [block]="block" [soft]="soft" /> }
      @case ('project_list') { <app-project-list [block]="block" [soft]="soft" /> }
      @case ('partner_list') { <app-partner-list [block]="block" [soft]="soft" /> }
      @case ('cta') { <app-cta [block]="block" /> }
      @case ('contact_form') { <app-contact-form [block]="block" [soft]="soft" /> }
    }
  `,
})
export class BlockRenderer {
  @Input({ required: true }) block!: Block;
  @Input() soft = false;
}
