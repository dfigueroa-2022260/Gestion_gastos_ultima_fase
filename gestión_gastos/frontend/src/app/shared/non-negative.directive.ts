import { Directive, ElementRef, HostListener, forwardRef, inject } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';

/** Applied to numeric controls, including pasted values and template-driven forms. */
@Directive({
  selector: 'input[type=number]',
  standalone: true,
  providers: [{ provide: NG_VALIDATORS, useExisting: forwardRef(() => NonNegativeDirective), multi: true }],
})
export class NonNegativeDirective implements Validator {
  private readonly input = inject(ElementRef<HTMLInputElement>);

  validate(control: AbstractControl): ValidationErrors | null {
    return control.value !== null && control.value !== '' && (!Number.isFinite(Number(control.value)) || Number(control.value) < 0)
      ? { nonNegative: true } : null;
  }

  @HostListener('beforeinput', ['$event'])
  beforeInput(event: InputEvent): void {
    if (event.data?.includes('-')) this.rechazar(event);
  }

  @HostListener('keydown', ['$event'])
  keydown(event: KeyboardEvent): void {
    if (event.key === '-') this.rechazar(event);
  }

  @HostListener('paste', ['$event'])
  paste(event: ClipboardEvent): void {
    const texto = event.clipboardData?.getData('text') ?? '';
    if (texto.includes('-')) this.rechazar(event);
  }

  @HostListener('input')
  limpiarAviso(): void { this.input.nativeElement.setCustomValidity(''); }

  private rechazar(event: Event): void {
    event.preventDefault();
    const input = this.input.nativeElement;
    input.setCustomValidity('No se permiten números negativos.');
    input.reportValidity();
    // The rejected input did not change the current value.
    input.setCustomValidity('');
  }
}
