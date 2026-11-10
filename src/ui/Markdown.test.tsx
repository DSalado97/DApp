import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  it('renderiza encabezados, párrafos, listas, citas y formato en línea', () => {
    render(<Markdown source={['### Título', '', 'Un **negrita**, *cursiva* y `código`.', '', '- uno', '- dos', '', '1. primero', '2. segundo', '', '> **Corrección:** nota'].join('\n')} />);
    expect(screen.getByRole('heading', { name: 'Título', level: 4 })).toBeInTheDocument();
    expect(screen.getByText('negrita').tagName).toBe('STRONG');
    expect(screen.getByText('cursiva').tagName).toBe('EM');
    expect(screen.getByText('código').tagName).toBe('CODE');
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText('Corrección:').closest('blockquote')).not.toBeNull();
  });

  it('convierte las tablas en tablas responsive con la etiqueta de cada columna', () => {
    render(<Markdown source={['| Dificultad | NO |', '|---|---:|', '| Rutina | 7 |', '| Fácil | 9 |'].join('\n')} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Dificultad', 'NO']);
    expect(screen.getByText('7').getAttribute('data-label')).toBe('NO');
  });

  it('no interpreta HTML: se muestra como texto', () => {
    const { container } = render(<Markdown source={'Hola <script>alert(1)</script> <b>x</b>'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toContain('<script>');
  });

  it('une las líneas de un párrafo y respeta los párrafos separados', () => {
    render(<Markdown source={'Primera línea\nsegunda línea.\n\nOtro párrafo.'} />);
    expect(screen.getByText('Primera línea segunda línea.')).toBeInTheDocument();
    expect(screen.getByText('Otro párrafo.')).toBeInTheDocument();
  });
});
