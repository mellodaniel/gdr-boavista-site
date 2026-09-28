import { useEffect, useRef, useState } from 'react';
import { ChevronRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import './TeamsSpotlight.css';

export function TeamsSpotlight() {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.35 });
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="teams-spotlight" aria-labelledby="teams-spotlight-title">
      <div className="teams-spotlight-layout">
        <div>
          <p className="teams-spotlight-label"><span aria-hidden="true" />Época 2026/27 · As nossas equipas</p>
          <h2 id="teams-spotlight-title" className="teams-spotlight-title">
            Várias equipas.<br /><span>O mesmo orgulho</span><br />em ser Boavista.
          </h2>
          <p className="teams-spotlight-description">
            Da formação aos seniores, cada equipa representa as nossas cores e a nossa terra.
            Conhece os atletas e as equipas técnicas que dão vida ao Boavista nesta época.
          </p>
          <Link to="/equipas" className="teams-spotlight-button">
            Conhecer as equipas <ChevronRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <Link to="/equipas" ref={cardRef} className={`teams-spotlight-card${isVisible ? ' is-visible' : ''}`} aria-label="Conhecer todas as equipas do GDR Boavista">
          <img src="/hero-boavista-premium.webp" alt="" width="800" height="600" loading="lazy" className="teams-spotlight-image" />
          <div className="teams-spotlight-shade" aria-hidden="true" />
          <div className="teams-spotlight-shine" aria-hidden="true" />
          <div className="teams-spotlight-card-top" aria-hidden="true">
            <span>Raça · Garra · Tradição</span><ArrowUpRight size={22} />
          </div>
          <div className="teams-spotlight-caption">
            <span className="teams-spotlight-caption-label">Da formação aos seniores</span>
            <p>Diferentes gerações.<br /><strong>A mesma camisola.</strong></p>
            <span className="teams-spotlight-checks" aria-hidden="true" />
          </div>
        </Link>
      </div>
    </section>
  );
}
