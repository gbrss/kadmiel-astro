/**
 * Datos de los testimonios.
 *
 * IMPORTANTE: los 9 testimonios de abajo son TEXTOS DE EJEMPLO con nombres y
 * empresas ficticios. Antes de publicar, reemplázalos por testimonios reales
 * (con permiso del cliente) y cambia SAMPLE_DATA a false para ocultar la
 * etiqueta "Testimonios de ejemplo".
 */
export const SAMPLE_DATA = true;

export type Hue = 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'indigo';

export interface Testimonial {
  name: string;
  role: string;
  company: string;
  project: string;
  quote: string;
  result?: string;
  rating: number;
  hue: Hue;
}

export const testimonials: Testimonial[] = [
  {
    name: 'Camila Rojas',
    role: 'Gerenta comercial',
    company: 'Andes Norte Minería',
    project: 'Sitio corporativo',
    quote:
      'Necesitábamos una web seria para presentar nuestros servicios a empresas mineras. Quedó rápida, ordenada y con una imagen muy profesional. En la primera semana ya recibimos consultas desde el formulario.',
    result: '+40% de consultas',
    rating: 5,
    hue: 'violet',
  },
  {
    name: 'Rodrigo Valdés',
    role: 'Jefe de operaciones',
    company: 'Constructora Pehuén',
    project: 'Sitio corporativo',
    quote:
      'Teníamos un WordPress lleno de plugins que nos daba problemas cada mes. Migrar a algo estático nos quitó el mantenimiento y los sustos. Cero caídas desde que lo lanzamos.',
    result: '0 caídas en 6 meses',
    rating: 5,
    hue: 'amber',
  },
  {
    name: 'Javiera Muñoz',
    role: 'Gerenta general',
    company: 'Logística Sur Express',
    project: 'Sitio corporativo',
    quote:
      'Pedimos algo sencillo y entregaron más de lo esperado: diseño limpio, buen SEO base y una cotización transparente desde el comienzo, sin letra chica.',
    rating: 5,
    hue: 'cyan',
  },
  {
    name: 'Matías Fuentes',
    role: 'Dueño',
    company: 'Ruta Austral Tours',
    project: 'Sitio de turismo',
    quote:
      'Nuestra página anterior se caía en celular y perdíamos reservas. Ahora carga al instante, se ve increíble y los turistas nos escriben directo por WhatsApp.',
    result: 'Carga en menos de 1 s',
    rating: 5,
    hue: 'cyan',
  },
  {
    name: 'Daniela Soto',
    role: 'Fundadora',
    company: 'Lino & Hebra',
    project: 'Tienda / catálogo',
    quote:
      'Quería vender mis accesorios sin pagar una plataforma carísima. Me armaron un catálogo bonito, fácil de actualizar y con pedidos por WhatsApp. Mis clientas me dicen que es muy cómodo comprar.',
    rating: 5,
    hue: 'rose',
  },
  {
    name: 'Valentina Araya',
    role: 'Directora de marketing',
    company: 'Pulso Digital',
    project: 'Landing de campaña',
    quote:
      'La landing para nuestra campaña estuvo lista en pocos días. La velocidad se nota en el costo por clic y en la conversión. Comunicación clara en todo el proceso.',
    result: '+28% de conversión',
    rating: 5,
    hue: 'indigo',
  },
  {
    name: 'Ignacio Paredes',
    role: 'Fundador',
    company: 'Datalab Chile',
    project: 'Sitio + chatbot',
    quote:
      'Integraron un chatbot de WhatsApp que responde las preguntas frecuentes mientras dormimos. Nos ahorra horas a la semana y los clientes reciben respuesta en el acto.',
    result: 'Atención 24/7',
    rating: 5,
    hue: 'violet',
  },
  {
    name: 'Felipe Contreras',
    role: 'Socio',
    company: 'Taller Mecánico Contreras',
    project: 'Landing + Google Business',
    quote:
      'No soy bueno con la tecnología y me lo explicaron todo simple. Ahora aparezco en Google con mi ubicación y la gente llega por la web. Muy buena atención.',
    rating: 5,
    hue: 'emerald',
  },
  {
    name: 'Francisca Leiva',
    role: 'Dueña',
    company: 'Café Raíz',
    project: 'Landing page',
    quote:
      'Cumplieron el plazo, respondieron todas mis dudas y el resultado se ve mucho más caro de lo que pagué. Ya se la he recomendado a otros emprendedores.',
    rating: 4,
    hue: 'amber',
  },
];