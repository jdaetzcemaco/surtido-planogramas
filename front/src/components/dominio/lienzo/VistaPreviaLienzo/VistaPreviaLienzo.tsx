import './VistaPreviaLienzo.css';

interface VistaPreviaLienzoProps {
  url: string;
}

export function VistaPreviaLienzo({ url }: VistaPreviaLienzoProps) {
  return (
    <div className="vista-previa-lienzo">
      <img src={url} alt="Imagen corregida" className="vista-previa-lienzo__imagen" />
    </div>
  );
}
