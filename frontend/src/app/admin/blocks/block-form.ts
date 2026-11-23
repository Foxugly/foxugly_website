import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Block } from '../../core/models';
import { BLOCK_SCHEMAS, Field, emptyContent } from './block-schema';
import { RichEditorComponent } from '../../shared/rich-editor/rich-editor.component';

let nextFormId = 0;

/** Payload renvoyé à l'enregistrement d'un bloc. */
export interface BlockEdit {
  anchor: string;
  is_visible: boolean;
  content: any;
}

/**
 * Formulaire d'édition d'un bloc, piloté par le schéma de son `block_type`.
 * Gère les champs scalaires, les objets imbriqués (boutons) et les listes
 * (objets ou chaînes).
 */
@Component({
  selector: 'app-block-form',
  imports: [FormsModule, RichEditorComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="form-grid">
      @for (f of schema; track f.key) {
        @switch (f.kind) {
          @case ('text') {
            <div class="field">
              <label [for]="uid + f.key">{{ f.label }}</label>
              <input
                [id]="uid + f.key"
                [ngModel]="content[f.key]"
                (ngModelChange)="content[f.key] = $event"
                [ngModelOptions]="{ standalone: true }"
              />
            </div>
          }

          @case ('textarea') {
            <div class="field">
              <label [for]="uid + f.key">{{ f.label }}</label>
              <textarea
                [id]="uid + f.key"
                rows="3"
                [ngModel]="content[f.key]"
                (ngModelChange)="content[f.key] = $event"
                [ngModelOptions]="{ standalone: true }"
              ></textarea>
            </div>
          }

          @case ('richtext') {
            <div class="field">
              <span class="field-label">{{ f.label }}</span>
              <app-rich-editor
                [label]="f.label"
                [ngModel]="content[f.key]"
                (ngModelChange)="content[f.key] = $event"
                [ngModelOptions]="{ standalone: true }"
              />
            </div>
          }

          @case ('number') {
            <div class="field">
              <label [for]="uid + f.key">{{ f.label }}</label>
              <input
                [id]="uid + f.key"
                type="number"
                [ngModel]="content[f.key]"
                (ngModelChange)="content[f.key] = +$event"
                [ngModelOptions]="{ standalone: true }"
              />
            </div>
          }

          @case ('bool') {
            <div class="switch-row">
              <input
                type="checkbox"
                [ngModel]="content[f.key]"
                (ngModelChange)="content[f.key] = $event"
                [ngModelOptions]="{ standalone: true }"
                [id]="uid + f.key"
              />
              <label [for]="uid + f.key">{{ f.label }}</label>
            </div>
          }

          @case ('select') {
            <div class="field">
              <label [for]="uid + f.key">{{ f.label }}</label>
              <select
                [id]="uid + f.key"
                [ngModel]="content[f.key]"
                (ngModelChange)="content[f.key] = $event"
                [ngModelOptions]="{ standalone: true }"
              >
                @for (o of f.options; track o.value) {
                  <option [value]="o.value">{{ o.label }}</option>
                }
              </select>
            </div>
          }

          @case ('object') {
            <div class="array-item">
              <strong style="display:block; margin-bottom:.7rem;">{{ f.label }}</strong>
              <div class="form-grid cols-2">
                @for (sub of f.fields; track sub.key) {
                  <div class="field">
                    <label [for]="uid + f.key + '_' + sub.key">{{ sub.label }}</label>
                    <input
                      [id]="uid + f.key + '_' + sub.key"
                      [ngModel]="content[f.key][sub.key]"
                      (ngModelChange)="content[f.key][sub.key] = $event"
                      [ngModelOptions]="{ standalone: true }"
                    />
                  </div>
                }
              </div>
            </div>
          }

          @case ('list-obj') {
            <div class="field">
              <span class="field-label">{{ f.label }}</span>
              @for (item of content[f.key]; track $index; let i = $index) {
                <div class="array-item">
                  <button
                    type="button"
                    class="btn btn-danger btn-sm remove"
                    (click)="removeAt(f.key, $index)"
                  >
                    ✕
                  </button>
                  <div class="form-grid">
                    @for (sub of f.fields; track sub.key) {
                      <div class="field">
                        @if (sub.kind === 'richtext') {
                          <span class="field-label">{{ sub.label }}</span>
                          <app-rich-editor
                            [label]="sub.label"
                            [ngModel]="item[sub.key]"
                            (ngModelChange)="item[sub.key] = $event"
                            [ngModelOptions]="{ standalone: true }"
                          />
                        } @else if (sub.kind === 'textarea') {
                          <label [for]="uid + f.key + '_' + i + '_' + sub.key">{{
                            sub.label
                          }}</label>
                          <textarea
                            [id]="uid + f.key + '_' + i + '_' + sub.key"
                            rows="2"
                            [ngModel]="item[sub.key]"
                            (ngModelChange)="item[sub.key] = $event"
                            [ngModelOptions]="{ standalone: true }"
                          ></textarea>
                        } @else {
                          <label [for]="uid + f.key + '_' + i + '_' + sub.key">{{
                            sub.label
                          }}</label>
                          <input
                            [id]="uid + f.key + '_' + i + '_' + sub.key"
                            [ngModel]="item[sub.key]"
                            (ngModelChange)="item[sub.key] = $event"
                            [ngModelOptions]="{ standalone: true }"
                          />
                        }
                      </div>
                    }
                  </div>
                </div>
              }
              <button type="button" class="btn btn-outline btn-sm" (click)="addObj(f)">
                {{ f.addLabel || 'Ajouter' }}
              </button>
            </div>
          }

          @case ('list-str') {
            <div class="field">
              <span class="field-label">{{ f.label }}</span>
              @for (s of content[f.key]; track $index) {
                <div class="toolbar" style="margin-bottom:.5rem;">
                  <input
                    style="flex:1;"
                    [attr.aria-label]="f.label + ' ' + ($index + 1)"
                    [ngModel]="content[f.key][$index]"
                    (ngModelChange)="content[f.key][$index] = $event"
                    [ngModelOptions]="{ standalone: true }"
                  />
                  <button
                    type="button"
                    class="btn btn-danger btn-sm"
                    (click)="removeAt(f.key, $index)"
                  >
                    ✕
                  </button>
                </div>
              }
              <button
                type="button"
                class="btn btn-outline btn-sm"
                (click)="content[f.key].push('')"
              >
                {{ f.addLabel || 'Ajouter' }}
              </button>
            </div>
          }
        }
      }

      <hr style="border:0; border-top:1px solid var(--line); margin:.4rem 0;" />

      <div class="form-grid cols-2">
        <div class="field">
          <label [for]="uid + 'anchor'">Ancre HTML (#) — optionnel</label>
          <input
            [id]="uid + 'anchor'"
            [(ngModel)]="anchor"
            [ngModelOptions]="{ standalone: true }"
            placeholder="contact"
          />
        </div>
        <div class="switch-row" style="align-self:end; padding-bottom:.6rem;">
          <input
            type="checkbox"
            [id]="uid + 'visible'"
            [(ngModel)]="isVisible"
            [ngModelOptions]="{ standalone: true }"
          />
          <label [for]="uid + 'visible'">Bloc visible sur le site</label>
        </div>
      </div>
    </div>

    <div class="modal-actions">
      <button type="button" class="btn btn-outline btn-sm" (click)="cancelled.emit()">
        Annuler
      </button>
      <button type="button" class="btn btn-primary btn-sm" (click)="emitSave()">Enregistrer</button>
    </div>
  `,
})
export class BlockForm implements OnInit {
  @Input({ required: true }) block!: Block;
  @Output() save = new EventEmitter<BlockEdit>();
  @Output() cancelled = new EventEmitter<void>();

  /** Préfixe d'id propre à l'instance (plusieurs formulaires peuvent coexister). */
  protected readonly uid = `bf${nextFormId++}_`;

  protected schema: Field[] = [];
  protected content: any = {};
  protected anchor = '';
  protected isVisible = true;

  ngOnInit() {
    this.schema = BLOCK_SCHEMAS[this.block.block_type] ?? [];
    // Fusionne le contenu existant sur une base complète (clés manquantes → défauts).
    this.content = this.merge(emptyContent(this.block.block_type), this.block.content ?? {});
    this.anchor = this.block.anchor ?? '';
    this.isVisible = this.block.is_visible ?? true;
  }

  private merge(base: any, override: any): any {
    const out = Array.isArray(base) ? [...(override ?? base)] : { ...base };
    if (!Array.isArray(base)) {
      for (const k of Object.keys(override ?? {})) {
        if (
          base[k] &&
          typeof base[k] === 'object' &&
          !Array.isArray(base[k]) &&
          override[k] &&
          typeof override[k] === 'object'
        ) {
          out[k] = this.merge(base[k], override[k]);
        } else {
          out[k] = override[k];
        }
      }
    }
    return out;
  }

  addObj(f: Field) {
    const item: any = {};
    for (const sub of f.fields ?? []) item[sub.key] = '';
    this.content[f.key].push(item);
  }
  removeAt(key: string, i: number) {
    this.content[key].splice(i, 1);
  }

  emitSave() {
    this.save.emit({ anchor: this.anchor, is_visible: this.isVisible, content: this.content });
  }
}
