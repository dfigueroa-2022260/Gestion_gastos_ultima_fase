import { AfterViewInit, Directive, ElementRef, HostListener, OnDestroy, inject } from '@angular/core';

@Directive({ selector: '[appFocusPanel]', standalone: true })
export class FocusPanelDirective implements AfterViewInit, OnDestroy {
  private readonly element: ElementRef<HTMLElement> = inject(ElementRef);
  private anterior = document.activeElement as HTMLElement | null;
  private controles(): HTMLElement[] {
    return Array.from(this.element.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]'));
  }
  ngAfterViewInit(): void { this.controles()[0]?.focus(); }
  @HostListener('keydown', ['$event'])
  teclado(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const controles = this.controles();
    const primero = controles[0], ultimo = controles[controles.length - 1];
    if (!primero) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === primero) { event.preventDefault(); ultimo.focus(); }
    else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primero.focus(); }
  }
  ngOnDestroy(): void { this.anterior?.focus(); }
}
