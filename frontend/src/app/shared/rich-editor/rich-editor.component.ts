import {
  ChangeDetectionStrategy,
  Component,
  Input,
  forwardRef,
  ViewEncapsulation,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Editor } from 'primeng/editor';
import { SharedModule } from 'primeng/api';

// CSS de Quill (thème « snow ») importée ici, dans un composant chargé
// uniquement par le bundle admin (lazy) → ne fuit pas dans le bundle public.
/**
 * Éditeur de texte enrichi partagé (admin uniquement).
 *
 * Encapsule `p-editor` (PrimeNG / Quill 2) avec une **toolbar minimale**
 * (gras, italique, listes à puces / numérotée, lien). Implémente
 * `ControlValueAccessor` pour fonctionner avec `[(ngModel)]`. La valeur
 * échangée est une chaîne HTML.
 *
 * Le thème `quill.snow.css` est servi en feuille séparée (`admin-quill.css`,
 * `angular.json`) et chargé à l'entrée dans l'admin (`admin/admin-styles.ts`) :
 * un `import` CSS depuis TypeScript était émis par le build mais jamais lié.
 */
@Component({
  selector: 'app-rich-editor',
  imports: [FormsModule, Editor, SharedModule],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-editor
      class="rich-editor"
      [ngModel]="value"
      (onTextChange)="onChange($event.htmlValue ?? '')"
      (onInit)="labelEditor($event.editor)"
      [formats]="formats"
    >
      <p-header>
        <span class="ql-formats">
          <button type="button" class="ql-bold" aria-label="Gras"></button>
          <button type="button" class="ql-italic" aria-label="Italique"></button>
        </span>
        <span class="ql-formats">
          <button type="button" class="ql-list" value="bullet" aria-label="Liste à puces"></button>
          <button type="button" class="ql-list" value="ordered" aria-label="Liste numérotée"></button>
        </span>
        <span class="ql-formats">
          <button type="button" class="ql-link" aria-label="Lien"></button>
        </span>
      </p-header>
    </p-editor>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichEditorComponent),
      multi: true,
    },
  ],
})
export class RichEditorComponent implements ControlValueAccessor {
  /** Formats autorisés : seuls ceux de la toolbar minimale. */
  protected readonly formats = ['bold', 'italic', 'list', 'link'];

  protected value = '';

  /** Nom accessible de la zone d'édition (un `<label for>` ne peut pas viser Quill). */
  @Input() label = '';

  private onChangeFn: (value: string) => void = () => undefined;
  private onTouchedFn: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  /** Donne un nom et un rôle accessibles à la zone contenteditable de Quill. */
  labelEditor(editor: { root: HTMLElement }): void {
    editor.root.setAttribute('role', 'textbox');
    editor.root.setAttribute('aria-multiline', 'true');
    if (this.label) editor.root.setAttribute('aria-label', this.label);
  }

  /** Propage la nouvelle valeur HTML (vide si Quill renvoie null). */
  onChange(html: string): void {
    this.value = html;
    this.onChangeFn(html);
    this.onTouchedFn();
  }
}
