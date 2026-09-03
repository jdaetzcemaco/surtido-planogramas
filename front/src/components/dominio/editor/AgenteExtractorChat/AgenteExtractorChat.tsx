import { useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Button } from '../../../ui/Button/Button';
import type { AccionBorrador, MensajeChat } from '../../../../types/agenteExtractor';
import './AgenteExtractorChat.css';

interface AgenteExtractorChatProps {
  mensajes: MensajeChat[];
  borrador: AccionBorrador[];
  listoParaConfirmar: boolean;
  enviando: boolean;
  onEnviar: (texto: string) => void;
  onExtraerImagen: () => void;
  onRevisar: () => void;
  /** Colapsa el panel sobre la burbuja — no borra la conversación ni el borrador, esos viven en
   * el componente padre (ver useAgenteExtractor). */
  onColapsar: () => void;
  /** Arranca el arrastre del widget flotante desde el header del panel. */
  onArrastreHeader: (e: ReactPointerEvent) => void;
}

export function AgenteExtractorChat({
  mensajes,
  borrador,
  listoParaConfirmar,
  enviando,
  onEnviar,
  onExtraerImagen,
  onRevisar,
  onColapsar,
  onArrastreHeader,
}: AgenteExtractorChatProps) {
  const [texto, setTexto] = useState('');

  function enviarTexto() {
    const valor = texto.trim();
    if (!valor || enviando) return;
    setTexto('');
    onEnviar(valor);
  }

  return (
    <div className="agente-extractor-panel" role="dialog" aria-label="Agente extractor del planograma">
      <div className="agente-extractor-panel__header" onPointerDown={onArrastreHeader}>
        <span className="agente-extractor-panel__titulo">Agente extractor del planograma</span>
        <button
          type="button"
          className="agente-extractor-panel__colapsar"
          onClick={onColapsar}
          aria-label="Colapsar chat"
          title="Colapsar"
        >
          &minus;
        </button>
      </div>

      <div className="agente-extractor-chat">
        <div className="agente-extractor-chat__mensajes">
          {mensajes.map((m, i) => (
            <div
              key={i}
              className={`agente-extractor-chat__mensaje agente-extractor-chat__mensaje--${m.rol}`}
            >
              {m.contenido}
            </div>
          ))}
          {enviando && (
            <div className="agente-extractor-chat__mensaje agente-extractor-chat__mensaje--assistant agente-extractor-chat__mensaje--pensando">
              Pensando…
            </div>
          )}
          {listoParaConfirmar && borrador.length > 0 && (
            <p className="agente-extractor-chat__aviso">
              El agente considera que la lista está lista. Revisa y confirma cuando quieras.
            </p>
          )}
        </div>

        <div className="agente-extractor-chat__input">
          <div className="agente-extractor-chat__input-fila">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  enviarTexto();
                }
              }}
              placeholder="Ej: añade el SKU 10012345 con 3 facings en el nivel 2"
              disabled={enviando}
              rows={2}
            />
            <Button
              variante="primary"
              className="agente-extractor-chat__enviar"
              onClick={enviarTexto}
              disabled={enviando || !texto.trim()}
              aria-label="Enviar"
              title="Enviar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </Button>
          </div>
          <Button variante="outline" onClick={onExtraerImagen} disabled={enviando}>
            Extraer de otra fuente
          </Button>
        </div>
      </div>

      <div className="agente-extractor-panel__footer">
        <Button
          variante="primary"
          className={borrador.length > 0 ? 'agente-extractor-chat__revisar--pendiente' : undefined}
          onClick={onRevisar}
          disabled={borrador.length === 0}
        >
          Revisar y confirmar ({borrador.length})
        </Button>
      </div>
    </div>
  );
}
